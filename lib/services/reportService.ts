import { BaseService } from './base'
import { transactionService } from './transactionService'
import { invoiceService } from './invoiceService'
import { taxCalculationService } from './taxCalculationService'
import { userService } from './userService'
import { Transaction, Invoice, TaxCalculation, SavedReport, TaxPeriod } from '@/lib/types'
import { calculateNigerianTax } from '@/lib/tax-calculator'
import { calculateTaxClassificationBenefitsFromTransactions, TaxClassificationSummary } from '@/lib/utils/tax-classification-calculator'

export interface ReportPeriod {
  startDate: string
  endDate: string
  year: number
  quarter?: number
  periodType: 'annual' | 'quarterly' | 'monthly' | 'custom'
}

export interface IncomeData {
  totalIncome: number
  incomeByCategory: { [category: string]: number }
  incomeBySource: { [source: string]: number }
  transactionCount: number
  invoiceCount: number
  transactions: Transaction[]
  invoices: Invoice[]
}

export interface ExpenseData {
  totalExpenses: number
  expensesByCategory: { [category: string]: number }
  taxDeductibleExpenses: number
  transactionCount: number
  invoiceCount: number
  transactions: Transaction[]
  invoices: Invoice[]
}

export interface TaxData {
  grossIncome: number
  totalExpenses: number
  netIncome: number
  reliefs: {
    consolidatedRelief: number
    pensionContribution: number
    nhfContribution: number
    healthInsurance: number
    lifeInsurance: number
    charitableDonations: number
    dependents: number
  }
  taxableIncome: number
  taxPayable: number
  taxBrackets: Array<{
    amount: number
    rate: number
    tax: number
  }>
  totalReliefs: number
  adjustedGrossIncome: number
  capitalAllowances?: number // Gold+ feature: capital allowances from tax classification
  whtCredits?: number // Gold+ feature: WHT credits from tax classification
}

export interface ReportData {
  period: ReportPeriod
  userInfo: {
    name: string
    businessName?: string
    tin?: string
    businessType: string
    address?: string
  }
  income: IncomeData
  expenses: ExpenseData
  tax: TaxData
  taxClassification?: TaxClassificationSummary // Gold+ feature: capital allowances and WHT credits
  generatedAt: string
}

export class ReportService extends BaseService {
  private getCollectionName(type: 'Self-Assessment' | 'Income Statement' | 'Expense Report' | 'Tax Summary'): string {
    switch (type) {
      case 'Self-Assessment':
        return 'selfAssessments'
      case 'Income Statement':
        return 'incomeStatements'
      case 'Expense Report':
        return 'expenseReports'
      case 'Tax Summary':
        return 'taxSummaries'
      default:
        return 'reports' // fallback
    }
  }

  constructor() {
    super('reports') // Default collection, but we'll use type-specific collections
  }

  /**
   * Generate platform-specific report data
   */
  async generatePlatformReportData(
    userId: string,
    platformName: string,
    period: ReportPeriod,
    includeInvoices: boolean = true
  ): Promise<ReportData> {
    // Get all transactions for the user
    const allTransactions = await transactionService.getAll([
      { field: 'userId', operator: '==', value: userId }
    ])

    const periodStart = new Date(period.startDate)
    periodStart.setHours(0, 0, 0, 0)
    
    const periodEnd = new Date(period.endDate)
    periodEnd.setHours(23, 59, 59, 999)

    // Filter transactions by platform and period
    const filteredTransactions = allTransactions.filter((txn) => {
      const txnDate = txn.date ? new Date(txn.date) : new Date(txn.createdAt)
      const inPeriod = txnDate >= periodStart && txnDate <= periodEnd
      const matchesPlatform = txn.platform?.name === platformName
      return inPeriod && matchesPlatform
    })

    // Get invoices for the period (filtered by platform if possible)
    let invoices: Invoice[] = []
    if (includeInvoices) {
      const invoicesResponse = await invoiceService.getUserInvoices(userId)
      const allInvoices = invoicesResponse.data || []
      invoices = allInvoices.filter((inv) => {
        const invDate = new Date(inv.issueDate)
        return invDate >= periodStart && invDate <= periodEnd
      })
    }

    // Calculate income and expense data (only for this platform)
    const incomeData = includeInvoices 
      ? this.calculateIncomeData(filteredTransactions, invoices, userId)
      : this.calculateIncomeDataTransactionsOnly(filteredTransactions, userId)

    const expenseData = includeInvoices 
      ? this.calculateExpenseData(filteredTransactions, invoices, userId)
      : this.calculateExpenseDataTransactionsOnly(filteredTransactions, userId)

    // Get user profile
    const profile = await userService.getProfile(userId)
    if (!profile) {
      throw new Error('User profile not found')
    }

    // Calculate tax classification benefits (Gold+ feature)
    let taxClassification: TaxClassificationSummary | undefined
    try {
      const { calculateTaxClassificationBenefitsFromTransactions } = await import('@/lib/utils/tax-classification-calculator')
      // Determine tax year from period
      const taxYear = period.year || new Date().getFullYear()
      taxClassification = await calculateTaxClassificationBenefitsFromTransactions(filteredTransactions, userId, taxYear)
    } catch (error) {
      console.error('Error calculating tax classification benefits:', error)
    }

    // Calculate tax data
    const taxData = await this.calculateTaxData(
      userId,
      incomeData.totalIncome,
      expenseData.totalExpenses,
      expenseData.taxDeductibleExpenses,
      profile,
      taxClassification
    )

    // Initialize personalInfo from user profile
    const personalInfo = {
      dateOfBirth: (profile as any).dateOfBirth || '',
      gender: (profile as any).gender || '',
      maritalStatus: (profile as any).maritalStatus || '',
      state: profile.address?.state || '',
      lga: profile.address?.city || '', // Using city as LGA approximation
      contactPhone: profile.phone || '',
      contactEmail: profile.email || ''
    }

    const result: ReportData & { metadata?: any } = {
      period,
      userInfo: {
        name: `${profile.firstName} ${profile.lastName}`,
        businessName: undefined, // UserProfile doesn't have businessName field
        tin: profile.taxId,
        businessType: profile.businessType,
        address: profile.address ? 
          `${profile.address.street}, ${profile.address.city}, ${profile.address.state}, ${profile.address.country}` : 
          undefined
      },
      income: incomeData,
      expenses: expenseData,
      tax: taxData,
      taxClassification,
      generatedAt: new Date().toISOString()
    }
    
    // Initialize metadata with personalInfo from profile
    result.metadata = {
      personalInfo,
      attachments: {},
      reliefEvidence: {},
      reliefNotes: {},
      reliefAmounts: {},
      manualTaxCredits: [],
      taxCreditEvidence: {},
      declarationInfo: {}
    }
    
    return result
  }

  // Generate comprehensive report data from transactions and invoices
  async generateReportData(
    userId: string,
    period: ReportPeriod,
    includeInvoices: boolean = true
  ): Promise<ReportData> {
    try {
      // Get user profile
      const profile = await userService.getProfile(userId)
      if (!profile) {
        throw new Error('User profile not found')
      }

      // Get transactions for the period
      const allTransactions = await transactionService.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])
      
      console.log('🔍 [ReportService] All transactions fetched:', allTransactions.length)
      console.log('🔍 [ReportService] Expense transactions before period filter:', allTransactions.filter(t => t.type === 'expense').map(t => ({
        id: t.id,
        description: t.description,
        date: t.date,
        createdAt: t.createdAt,
        amount: t.amount,
        isCapitalAsset: t.taxClassification?.isCapitalAsset
      })))

      const periodStart = new Date(period.startDate)
      periodStart.setHours(0, 0, 0, 0) // Start of day
      
      const periodEnd = new Date(period.endDate)
      periodEnd.setHours(23, 59, 59, 999) // End of day

      // Filter transactions by period
      // BUT: Include capital asset transactions from previous years (for depreciation calculation)
      const filteredTransactions = allTransactions.filter((txn) => {
        const txnDate = txn.date ? new Date(txn.date) : new Date(txn.createdAt)
        const isInPeriod = txnDate >= periodStart && txnDate <= periodEnd
        
        // If it's a capital asset, include it even if it's from a previous year
        // (depreciation is calculated for the current tax year regardless of purchase date)
        const isCapitalAsset = txn.taxClassification?.isCapitalAsset && txn.taxClassification?.capitalAllowanceRate
        if (isCapitalAsset) {
          return true // Include all capital assets for depreciation calculation
        }
        
        return isInPeriod
      })
      
      console.log('🔍 [ReportService] Filtered transactions by period:', {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        totalFiltered: filteredTransactions.length,
        expenseTransactions: filteredTransactions.filter(t => t.type === 'expense').map(t => ({
          id: t.id,
          description: t.description,
          date: t.date,
          createdAt: t.createdAt,
          amount: t.amount,
          isCapitalAsset: t.taxClassification?.isCapitalAsset,
          isInPeriod: (() => {
            const txnDate = t.date ? new Date(t.date) : new Date(t.createdAt)
            return txnDate >= periodStart && txnDate <= periodEnd
          })()
        }))
      })

      // Get invoices for the period
      let invoices: Invoice[] = []
      if (includeInvoices) {
        const invoicesResponse = await invoiceService.getUserInvoices(userId)
        const allInvoices = invoicesResponse.data || []
        invoices = allInvoices.filter((inv) => {
          const invDate = new Date(inv.issueDate)
          return invDate >= periodStart && invDate <= periodEnd
        })
      }

      // Calculate income data
      // If includeInvoices is false, use only transactions (don't filter out invoice-related transactions)
      const incomeData = includeInvoices 
        ? this.calculateIncomeData(filteredTransactions, invoices, userId)
        : this.calculateIncomeDataTransactionsOnly(filteredTransactions, userId)

      // Calculate expense data
      // If includeInvoices is false, use only transactions (don't filter out invoice-related transactions)
      const expenseData = includeInvoices 
        ? this.calculateExpenseData(filteredTransactions, invoices, userId)
        : this.calculateExpenseDataTransactionsOnly(filteredTransactions, userId)

      // Calculate tax classification benefits from transactions (Gold+ feature)
      let taxClassificationSummary: TaxClassificationSummary | undefined = undefined
      try {
        // Convert ReportPeriod to TaxPeriod format
        const taxPeriod: TaxPeriod = {
          year: period.year,
          quarter: period.quarter,
          month: period.periodType === 'monthly' ? new Date(period.startDate).getMonth() + 1 : undefined
        }
        
        // Calculate from filtered transactions for the period
        const taxYear = period.year || new Date().getFullYear()
        taxClassificationSummary = await calculateTaxClassificationBenefitsFromTransactions(filteredTransactions, userId, taxYear)
      } catch (error) {
        console.error('Error calculating tax classification benefits:', error)
        // Continue without tax classification if calculation fails
      }

      // Calculate tax data (now includes capital allowances and WHT credits if available)
      const taxData = await this.calculateTaxData(
        userId,
        incomeData.totalIncome,
        expenseData.totalExpenses,
        expenseData.taxDeductibleExpenses,
        profile,
        taxClassificationSummary
      )

      // Initialize personalInfo from user profile
      const personalInfo = {
        dateOfBirth: (profile as any).dateOfBirth || '',
        gender: (profile as any).gender || '',
        maritalStatus: (profile as any).maritalStatus || '',
        state: profile.address?.state || '',
        lga: profile.address?.city || '', // Using city as LGA approximation
        contactPhone: profile.phone || '',
        contactEmail: profile.email || ''
      }

      const result: ReportData & { metadata?: any } = {
        period,
        userInfo: {
          name: profile.firstName && profile.lastName 
            ? `${profile.firstName} ${profile.lastName}` 
            : profile.firstName || profile.lastName || 'N/A',
          businessName: undefined, // UserProfile doesn't have businessName field
          tin: profile.taxId,
          businessType: profile.businessType || 'freelancer',
          address: profile.address ? `${profile.address.street}, ${profile.address.city}, ${profile.address.state}` : undefined
        },
        income: incomeData,
        expenses: expenseData,
        tax: taxData,
        taxClassification: taxClassificationSummary,
        generatedAt: new Date().toISOString()
      }
      
      // Initialize metadata with personalInfo from profile
      result.metadata = {
        personalInfo,
        attachments: {},
        reliefEvidence: {},
        reliefNotes: {},
        reliefAmounts: {},
        manualTaxCredits: [],
        taxCreditEvidence: {},
        declarationInfo: {}
      }
      
      return result
    } catch (error) {
      console.error('Error generating report data:', error)
      throw error
    }
  }

  // Calculate income from transactions only (no invoice filtering)
  private calculateIncomeDataTransactionsOnly(
    transactions: Transaction[],
    userId: string
  ): IncomeData {
    // Include ALL income transactions, including invoice-related ones
    const incomeTransactions = transactions.filter(t => t.type === 'income')

    let totalIncome = 0
    const incomeByCategory: { [key: string]: number } = {}
    const incomeBySource: { [key: string]: number } = {}

    // Process all income transactions
    incomeTransactions.forEach(txn => {
      // Determine the base amount to use
      let baseAmount = 0
      
      // For foreign currency transactions, ngnEquivalent is already the converted amount
      // It represents the NGN equivalent of the net amount (after platform fees) if netAmount exists
      if (txn.currency && txn.currency !== 'NGN' && txn.ngnEquivalent) {
        // Use ngnEquivalent directly - it's already the NGN equivalent of the correct amount
        baseAmount = txn.ngnEquivalent
      } else {
        // For NGN transactions, use netAmount if available (after platform fees), otherwise use amount
        baseAmount = txn.netAmount !== undefined ? txn.netAmount : (typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0)
      }
      
      // Apply transaction nature percentage for mixed transactions (creators only)
      // Only apply if transactionNature is 'mixed' and businessPercentage is set
      let taxableAmount = baseAmount
      if (txn.transactionNature === 'mixed' && txn.businessPercentage !== undefined) {
        taxableAmount = baseAmount * (txn.businessPercentage / 100)
      } else if (txn.transactionNature === 'personal') {
        // Personal transactions are not taxable income
        taxableAmount = 0
      }
      // If transactionNature is 'business' or undefined, use full amount
      
      // For income transactions with VAT, exclude VAT amount from taxable income
      // VAT must be remitted to government, so it shouldn't be taxed again
      if (txn.type === 'income' && txn.taxClassification?.vatApplicable && txn.taxClassification?.vatRate) {
        const vatRate = txn.taxClassification.vatRate / 100
        // Taxable amount = amount - VAT portion = amount * (1 - vatRate)
        taxableAmount = taxableAmount * (1 - vatRate)
      }
      
      totalIncome += taxableAmount
      
      const category = txn.category || 'uncategorized'
      incomeByCategory[category] = (incomeByCategory[category] || 0) + taxableAmount
      
      const source = txn.description || 'Other'
      incomeBySource[source] = (incomeBySource[source] || 0) + taxableAmount
    })

    return {
      totalIncome,
      incomeByCategory,
      incomeBySource,
      transactionCount: incomeTransactions.length,
      invoiceCount: 0,
      transactions: incomeTransactions,
      invoices: []
    }
  }

  private calculateIncomeData(
    transactions: Transaction[],
    invoices: Invoice[],
    userId: string
  ): IncomeData {
    // Only count paid invoices (supplierPaymentStatus === 'paid')
    // This ensures we don't count unpaid invoices as income
    const paidInvoices = invoices.filter(inv => 
      inv.invoiceType === 'outgoing' && 
      inv.userId === userId && 
      inv.status !== 'cancelled' &&
      inv.supplierPaymentStatus === 'paid' // Only paid invoices count as income
    )

    // Get invoice numbers from paid invoices to identify invoice-related transactions
    const paidInvoiceNumbers = new Set(paidInvoices.map(inv => inv.invoiceNumber))

    // Filter out transactions that are from invoice payments to avoid double counting
    // Transactions created from invoice payments have description "Invoice payment received: {invoiceNumber}"
    const incomeTransactions = transactions.filter(t => {
      if (t.type !== 'income') return false
      
      // Exclude transactions that are from invoice payments
      if (t.description && t.description.startsWith('Invoice payment received:')) {
        return false
      }
      
      // Also check if transaction notes mention an invoice number that we've already counted
      if (t.notes) {
        for (const invoiceNumber of paidInvoiceNumbers) {
          if (t.notes.includes(`Invoice: ${invoiceNumber}`)) {
            return false
          }
        }
      }
      
      return true
    })

    let totalIncome = 0
    const incomeByCategory: { [key: string]: number } = {}
    const incomeBySource: { [key: string]: number } = {}

    // Process income transactions (excluding invoice-related ones)
    incomeTransactions.forEach(txn => {
      // Determine the base amount to use
      let baseAmount = 0
      
      // For foreign currency transactions, ngnEquivalent is already the converted amount
      // It represents the NGN equivalent of the net amount (after platform fees) if netAmount exists
      if (txn.currency && txn.currency !== 'NGN' && txn.ngnEquivalent) {
        // Use ngnEquivalent directly - it's already the NGN equivalent of the correct amount
        baseAmount = txn.ngnEquivalent
      } else {
        // For NGN transactions, use netAmount if available (after platform fees), otherwise use amount
        baseAmount = txn.netAmount !== undefined ? txn.netAmount : (typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0)
      }
      
      // Apply transaction nature percentage for mixed transactions (creators only)
      // Only apply if transactionNature is 'mixed' and businessPercentage is set
      let taxableAmount = baseAmount
      if (txn.transactionNature === 'mixed' && txn.businessPercentage !== undefined) {
        taxableAmount = baseAmount * (txn.businessPercentage / 100)
      } else if (txn.transactionNature === 'personal') {
        // Personal transactions are not taxable income
        taxableAmount = 0
      }
      // If transactionNature is 'business' or undefined, use full amount
      
      // For income transactions with VAT, exclude VAT amount from taxable income
      // VAT must be remitted to government, so it shouldn't be taxed again
      if (txn.type === 'income' && txn.taxClassification?.vatApplicable && txn.taxClassification?.vatRate) {
        const vatRate = txn.taxClassification.vatRate / 100
        // Taxable amount = amount - VAT portion = amount * (1 - vatRate)
        taxableAmount = taxableAmount * (1 - vatRate)
      }
      
      totalIncome += taxableAmount
      
      const category = txn.category || 'uncategorized'
      incomeByCategory[category] = (incomeByCategory[category] || 0) + taxableAmount
      
      const source = txn.description || 'Other'
      incomeBySource[source] = (incomeBySource[source] || 0) + taxableAmount
    })

    // Process income from paid invoices only
    paidInvoices.forEach(inv => {
      const amount = inv.total || inv.invoiceTotal || 0
      totalIncome += amount
      
      incomeByCategory['Invoice Income'] = (incomeByCategory['Invoice Income'] || 0) + amount
      incomeBySource[inv.invoiceNumber || 'Invoice'] = (incomeBySource[inv.invoiceNumber || 'Invoice'] || 0) + amount
    })

    return {
      totalIncome,
      incomeByCategory,
      incomeBySource,
      transactionCount: incomeTransactions.length,
      invoiceCount: paidInvoices.length,
      transactions: incomeTransactions,
      invoices: paidInvoices
    }
  }

  // Calculate expenses from transactions only (no invoice filtering)
  private calculateExpenseDataTransactionsOnly(
    transactions: Transaction[],
    userId: string
  ): ExpenseData {
    // Include ALL expense transactions
    const expenseTransactions = transactions.filter(t => t.type === 'expense')
    
    console.log('🔍 [ReportService] All expense transactions:', expenseTransactions.map(t => ({
      id: t.id,
      description: t.description,
      category: t.category,
      amount: t.amount,
      isCapitalAsset: t.taxClassification?.isCapitalAsset,
      capitalAllowanceRate: t.taxClassification?.capitalAllowanceRate,
      expenseType: t.taxClassification?.expenseType,
      transactionNature: t.transactionNature,
      businessPercentage: t.businessPercentage
    })))

    let totalExpenses = 0
    let taxDeductibleExpenses = 0
    const expensesByCategory: { [key: string]: number } = {}

    // Process all expense transactions
    expenseTransactions.forEach(txn => {
      // Determine the base amount to use
      let baseAmount = 0
      
      // For foreign currency transactions, ngnEquivalent is already the converted amount
      if (txn.currency && txn.currency !== 'NGN' && txn.ngnEquivalent) {
        baseAmount = txn.ngnEquivalent
      } else {
        // For NGN transactions, use netAmount if available, otherwise use amount
        baseAmount = txn.netAmount !== undefined ? txn.netAmount : (typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0)
      }
      
      // Apply transaction nature percentage for mixed transactions
      // Only apply if transactionNature is 'mixed' and businessPercentage is set
      let deductibleAmount = baseAmount
      if (txn.transactionNature === 'mixed' && txn.businessPercentage !== undefined) {
        deductibleAmount = baseAmount * (txn.businessPercentage / 100)
      } else if (txn.transactionNature === 'personal') {
        // Personal transactions are not tax deductible
        deductibleAmount = 0
      }
      // If transactionNature is 'business' or undefined, use full amount
      
      // Capital assets are NOT included in totalExpenses or taxDeductibleExpenses - they're claimed as depreciation instead
      const isCapitalAsset = txn.taxClassification?.isCapitalAsset && txn.taxClassification?.capitalAllowanceRate
      
      // Only add to totalExpenses if not a capital asset (capital assets are tracked separately as depreciation)
      if (!isCapitalAsset) {
        totalExpenses += deductibleAmount
      }
      
      // For tax deductible check, use the deductible amount
      // Priority: 1) expenseType from taxClassification, 2) taxDeductible (legacy), 3) transactionNature
      // EXCLUDE capital assets - they're claimed as depreciation, not as expenses
      const isTaxDeductible = !isCapitalAsset && (
        (txn.taxClassification?.expenseType === 'allowable') || // Only allowable expenses (not capital)
        (txn.taxClassification?.expenseType !== 'disallowable' && txn.taxClassification?.expenseType !== 'capital' && (txn.taxDeductible || txn.transactionNature === 'business' || (txn.transactionNature === 'mixed' && txn.businessPercentage !== undefined && txn.businessPercentage > 0))) // Fallback to legacy fields if expenseType not set
      )
      
      if (isTaxDeductible) {
        taxDeductibleExpenses += deductibleAmount
      }
      
      // Only add to category totals if not a capital asset (capital assets are tracked separately)
      if (!isCapitalAsset) {
        const category = txn.category || 'uncategorized'
        expensesByCategory[category] = (expensesByCategory[category] || 0) + deductibleAmount
      }
    })

    console.log('🔍 [ReportService] Expense calculation results:', {
      totalExpenses,
      taxDeductibleExpenses,
      transactionCount: expenseTransactions.length,
      transactionsIncluded: expenseTransactions.map(t => ({
        id: t.id,
        description: t.description,
        isCapitalAsset: t.taxClassification?.isCapitalAsset,
        includedInTotal: !t.taxClassification?.isCapitalAsset
      }))
    })

    return {
      totalExpenses,
      expensesByCategory,
      taxDeductibleExpenses,
      transactionCount: expenseTransactions.length,
      invoiceCount: 0,
      transactions: expenseTransactions, // Return ALL expense transactions, including capital assets
      invoices: []
    }
  }

  private calculateExpenseData(
    transactions: Transaction[],
    invoices: Invoice[],
    userId: string
  ): ExpenseData {
    const expenseTransactions = transactions.filter(t => t.type === 'expense')
    const expenseInvoices = invoices.filter(inv => 
      (inv.invoiceType === 'incoming' && inv.recipientUserId === userId) ||
      (inv.invoiceType === 'outgoing' && inv.userId === userId && inv.status === 'paid')
    )

    let totalExpenses = 0
    let taxDeductibleExpenses = 0
    const expensesByCategory: { [key: string]: number } = {}

    // Process expense transactions
    expenseTransactions.forEach(txn => {
      // Determine the base amount to use
      let baseAmount = 0
      
      // For foreign currency transactions, ngnEquivalent is already the converted amount
      // It represents the NGN equivalent of the net amount (after platform fees) if netAmount exists
      if (txn.currency && txn.currency !== 'NGN' && txn.ngnEquivalent) {
        // Use ngnEquivalent directly - it's already the NGN equivalent of the correct amount
        baseAmount = txn.ngnEquivalent
      } else {
        // For NGN transactions, use netAmount if available (after platform fees), otherwise use amount
        baseAmount = txn.netAmount !== undefined ? txn.netAmount : (typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0)
      }
      
      // Apply transaction nature percentage for mixed transactions (creators only)
      // Only apply if transactionNature is 'mixed' and businessPercentage is set
      let deductibleAmount = baseAmount
      if (txn.transactionNature === 'mixed' && txn.businessPercentage !== undefined) {
        deductibleAmount = baseAmount * (txn.businessPercentage / 100)
      } else if (txn.transactionNature === 'personal') {
        // Personal transactions are not tax deductible
        deductibleAmount = 0
      }
      // If transactionNature is 'business' or undefined, use full amount
      
      // Capital assets are NOT included in totalExpenses or taxDeductibleExpenses - they're claimed as depreciation instead
      const isCapitalAsset = txn.taxClassification?.isCapitalAsset && txn.taxClassification?.capitalAllowanceRate
      
      // Only add to totalExpenses if not a capital asset (capital assets are tracked separately as depreciation)
      if (!isCapitalAsset) {
        totalExpenses += deductibleAmount
      }
      
      // For tax deductible check, use the deductible amount
      // Priority: 1) expenseType from taxClassification, 2) taxDeductible (legacy), 3) transactionNature
      // EXCLUDE capital assets - they're claimed as depreciation, not as expenses
      const isTaxDeductible = !isCapitalAsset && (
        (txn.taxClassification?.expenseType === 'allowable') || // Only allowable expenses (not capital)
        (txn.taxClassification?.expenseType !== 'disallowable' && txn.taxClassification?.expenseType !== 'capital' && (txn.taxDeductible || txn.transactionNature === 'business' || (txn.transactionNature === 'mixed' && txn.businessPercentage !== undefined && txn.businessPercentage > 0))) // Fallback to legacy fields if expenseType not set
      )
      
      if (isTaxDeductible) {
        taxDeductibleExpenses += deductibleAmount
      }
      
      // Only add to category totals if not a capital asset (capital assets are tracked separately)
      if (!isCapitalAsset) {
        const category = txn.category || 'uncategorized'
        expensesByCategory[category] = (expensesByCategory[category] || 0) + deductibleAmount
      }
    })

    // Process expenses from invoices (incoming invoices or paid outgoing invoices)
    expenseInvoices.forEach(inv => {
      const amount = inv.total || inv.invoiceTotal || 0
      totalExpenses += amount
      taxDeductibleExpenses += amount // Invoices are typically tax-deductible business expenses
      
      expensesByCategory['Invoice Expenses'] = (expensesByCategory['Invoice Expenses'] || 0) + amount
    })

    return {
      totalExpenses,
      expensesByCategory,
      taxDeductibleExpenses,
      transactionCount: expenseTransactions.length,
      invoiceCount: expenseInvoices.length,
      transactions: expenseTransactions,
      invoices: expenseInvoices
    }
  }

  private async calculateTaxData(
    userId: string,
    grossIncome: number,
    totalExpenses: number,
    businessExpenses: number,
    profile: any,
    taxClassification?: TaxClassificationSummary
  ): Promise<TaxData> {
    const netIncome = grossIncome - totalExpenses

    // Prepare tax calculation data
    // Note: calculateNigerianTax expects gross income, not net income
    // It will subtract businessExpenses internally
    // Reliefs are NOT automatically added - users must manually add them in the self-assessment report
    const taxCalcData = {
      businessType: profile.businessType || 'freelancer',
      period: 'yearly' as const,
      income: grossIncome, // Pass gross income, not net income
      rentPaid: 0, // Users can add this manually in the report
      pensionContribution: 0, // Users can add this manually in the report
      healthInsurance: 0, // Users can add this manually in the report
      housingFund: 0, // NHF - users can add this manually in the report
      lifeInsurance: 0, // Users can add this manually in the report
      charitableDonations: 0, // Users can add this manually in the report
      businessExpenses: businessExpenses, // This will be subtracted from gross income in the calculator
      dependents: 0, // Users can add this manually in the report
      // Add tax classification benefits if available (Gold+ feature)
      capitalAllowances: taxClassification?.capitalAllowances || undefined,
      whtCredits: taxClassification?.whtCredits || undefined
    }

    // Calculate tax
    const taxResult = calculateNigerianTax(taxCalcData)

    return {
      grossIncome,
      totalExpenses,
      netIncome,
      reliefs: {
        consolidatedRelief: 0, // CRA abolished in new law
        pensionContribution: taxResult.reliefs?.pension || taxCalcData.pensionContribution,
        nhfContribution: taxResult.reliefs?.housingFund || 0,
        healthInsurance: taxResult.reliefs?.healthInsurance || taxCalcData.healthInsurance,
        lifeInsurance: taxResult.reliefs?.lifeInsurance || taxCalcData.lifeInsurance,
        charitableDonations: taxResult.reliefs?.charitable || taxCalcData.charitableDonations,
        dependents: taxCalcData.dependents
      },
      taxableIncome: taxResult.taxableIncome || 0,
      taxPayable: taxResult.totalTax || 0,
      taxBrackets: taxResult.taxBrackets || [],
      totalReliefs: taxResult.totalReliefs || 0,
      adjustedGrossIncome: taxResult.adjustedGrossIncome || 0,
      // Add tax classification data if available
      capitalAllowances: taxResult.capitalAllowances || 0,
      whtCredits: taxResult.whtCredits || 0
    }
  }

  // Save a generated report
  async saveReport(
    userId: string,
    title: string,
    type: 'Self-Assessment' | 'Income Statement' | 'Expense Report' | 'Tax Summary',
    reportData: ReportData,
    status: 'draft' | 'completed' | 'submitted' = 'completed'
  ): Promise<string> {
    try {
      const report = {
        userId,
        title,
        type,
        reportData,
        period: reportData.period,
        status,
        generatedAt: reportData.generatedAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Use type-specific collection
      const collectionName = this.getCollectionName(type)
      const baseService = new BaseService(collectionName)
      const reportId = await baseService.create(report)
      return reportId
    } catch (error) {
      console.error('Error saving report:', error)
      throw error
    }
  }

  // Get all reports for a user from all collections
  async getUserReports(userId: string): Promise<SavedReport[]> {
    try {
      const allReports: SavedReport[] = []
      
      // Fetch from all report type collections
      const collections = ['selfAssessments', 'incomeStatements', 'expenseReports', 'taxSummaries']
      
      for (const collectionName of collections) {
        try {
          const baseService = new BaseService(collectionName)
          const reports = await baseService.getAll([{ field: 'userId', operator: '==', value: userId }])
          allReports.push(...reports)
        } catch (error) {
          // Collection might not exist yet, skip it
          console.log(`Collection ${collectionName} not found or empty, skipping`)
        }
      }
      
      return allReports.sort((a, b) => {
        const dateA = new Date(a.generatedAt || a.createdAt).getTime()
        const dateB = new Date(b.generatedAt || b.createdAt).getTime()
        return dateB - dateA // Most recent first
      })
    } catch (error) {
      console.error('Error fetching user reports:', error)
      throw error
    }
  }

  // Get a single report by ID (searches all collections)
  async getReportById(reportId: string, type?: 'Self-Assessment' | 'Income Statement' | 'Expense Report' | 'Tax Summary'): Promise<SavedReport | null> {
    try {
      if (type) {
        // If type is provided, search in specific collection
        const collectionName = this.getCollectionName(type)
        const baseService = new BaseService(collectionName)
        return await baseService.getById(reportId)
      } else {
        // Search in all collections
        const collections = ['selfAssessments', 'incomeStatements', 'expenseReports', 'taxSummaries']
        for (const collectionName of collections) {
          try {
            const baseService = new BaseService(collectionName)
            const report = await baseService.getById(reportId)
            if (report) return report
          } catch (error) {
            // Continue searching
          }
        }
        return null
      }
    } catch (error) {
      console.error('Error fetching report:', error)
      throw error
    }
  }

  // Update a report
  async updateReport(
    reportId: string,
    type: 'Self-Assessment' | 'Income Statement' | 'Expense Report' | 'Tax Summary',
    updates: Partial<SavedReport>
  ): Promise<void> {
    try {
      const collectionName = this.getCollectionName(type)
      const baseService = new BaseService(collectionName)
      await baseService.update(reportId, {
        ...updates,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating report:', error)
      throw error
    }
  }

  // Delete a report (searches all collections)
  async deleteReport(reportId: string, type?: 'Self-Assessment' | 'Income Statement' | 'Expense Report' | 'Tax Summary'): Promise<void> {
    try {
      if (type) {
        // If type is provided, delete from specific collection
        const collectionName = this.getCollectionName(type)
        const baseService = new BaseService(collectionName)
        await baseService.delete(reportId)
      } else {
        // Search and delete from all collections
        const collections = ['selfAssessments', 'incomeStatements', 'expenseReports', 'taxSummaries']
        for (const collectionName of collections) {
          try {
            const baseService = new BaseService(collectionName)
            await baseService.delete(reportId)
            return // Found and deleted
          } catch (error) {
            // Continue searching
          }
        }
        throw new Error('Report not found')
      }
    } catch (error) {
      console.error('Error deleting report:', error)
      throw error
    }
  }
}

export const reportService = new ReportService()

