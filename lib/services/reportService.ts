import { BaseService } from './base'
import { transactionService } from './transactionService'
import { invoiceService } from './invoiceService'
import { taxCalculationService } from './taxCalculationService'
import { userService } from './userService'
import { Transaction, Invoice, TaxCalculation, SavedReport, TaxPeriod } from '@/lib/types'
import { calculateNigerianTax } from '@/lib/tax-calculator'
import { calculateCIT } from '@/lib/tax/cit-calculator'
import { calculateTaxClassificationBenefitsFromTransactions, TaxClassificationSummary } from '@/lib/utils/tax-classification-calculator'

export interface ReportPeriod {
  startDate: string
  endDate: string
  year: number
  quarter?: number
  periodType: 'annual' | 'quarterly' | 'monthly' | 'custom'
}

export interface IncomeData {
  totalIncome: number // Net income after VAT exclusion (taxable income)
  grossIncome: number // Gross income before VAT/WHT deductions
  vatCollected: number // Total VAT collected (amount that must be remitted to government)
  whtDeducted: number // Total WHT deducted at source (tax credit)
  platformFees: number // Total platform fees deducted
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
  // CIT-specific fields
  citRate?: number
  isSmallCompany?: boolean
  isLargeMultinational?: boolean
  effectiveTaxRate?: number
  originalETR?: number
  topUpTax?: number
  profitBeforeTax?: number
  totalDeductions?: number
  capitalAllowancesTotal?: number
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
  private getCollectionName(type: 'Self-Assessment' | 'Income Statement' | 'Expense Report' | 'Tax Summary' | 'Tax Assessment'): string {
    switch (type) {
      case 'Self-Assessment':
        return 'selfAssessments'
      case 'Income Statement':
        return 'incomeStatements'
      case 'Expense Report':
        return 'expenseReports'
      case 'Tax Summary':
        return 'taxSummaries'
      case 'Tax Assessment':
        return 'taxAssessments'
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
    includeInvoices: boolean = true,
    entityId?: string,
    defaultEntityId?: string
  ): Promise<ReportData> {
    // Get all transactions for the user
    const allTransactions = await transactionService.getAll([
      { field: 'userId', operator: '==', value: userId }
    ])

    const periodStart = new Date(period.startDate)
    periodStart.setHours(0, 0, 0, 0)
    
    const periodEnd = new Date(period.endDate)
    periodEnd.setHours(23, 59, 59, 999)

    // Filter transactions by platform, entity and period
    // Include transactions if their transaction date is in the period OR if their createdAt date is in the period
    // This ensures future-dated transactions (like brand deals) created in the current period are included
    const filteredTransactions = allTransactions.filter((txn) => {
      if (entityId) {
        const isLegacyDefault = !txn.entityId && defaultEntityId && entityId === defaultEntityId
        if (txn.entityId !== entityId && !isLegacyDefault) return false
      }
      
      const matchesPlatform = txn.platform?.name === platformName
      if (!matchesPlatform) return false
      
      // Get transaction date and created date
      const txnDateStr = txn.date || txn.transactionDate || txn.valueDate
      const txnDate = txnDateStr ? new Date(txnDateStr) : null
      const createdDate = txn.createdAt ? new Date(txn.createdAt) : null
      
      // Include if transaction date is in period (normal case)
      if (txnDate && !isNaN(txnDate.getTime())) {
        if (txnDate >= periodStart && txnDate <= periodEnd) {
          return true
        }
      }
      
      // Include if created date is in period (for future-dated transactions created in current period)
      // This ensures brand deals and future transactions created now are included in current period reports
      if (createdDate && !isNaN(createdDate.getTime())) {
        if (createdDate >= periodStart && createdDate <= periodEnd) {
          return true
        }
      }
      
      return false
    })

    // Get invoices for the period (filtered by platform if possible)
    let invoices: Invoice[] = []
    if (includeInvoices) {
      const invoicesResponse = await invoiceService.getUserInvoices(userId)
      const allInvoices = invoicesResponse.data || []
      invoices = allInvoices
        .filter((inv) => {
          if (entityId) {
            const isLegacyDefault = !inv.entityId && defaultEntityId && entityId === defaultEntityId
            if (inv.entityId !== entityId && !isLegacyDefault) return false
          }
          return true
        })
        .filter((inv) => {
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

    // Extract relief transactions and calculate relief amounts by category
    const reliefTransactions = filteredTransactions.filter(txn => txn.type === 'relief')
    const reliefAmounts = this.calculateReliefAmounts(reliefTransactions, incomeData.totalIncome)

    // For SMEs (CIT), use revenue (gross income) as turnover base for threshold checks.
    // For PIT (freelancer/creator), use taxable income after VAT exclusion (totalIncome).
    const bt = profile.businessType as unknown as string | undefined
    const isSMEProfile = bt === 'sme' || bt === 'small-business'
    const taxBaseIncome = isSMEProfile ? (incomeData.grossIncome || incomeData.totalIncome) : incomeData.totalIncome

    // Calculate tax data
    // Relief amounts are automatically included from transactions
    const taxData = await this.calculateTaxData(
      userId,
      taxBaseIncome,
      expenseData.totalExpenses,
      expenseData.taxDeductibleExpenses,
      profile,
      taxClassification,
      reliefAmounts
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
    
    // Initialize metadata with personalInfo from profile and relief amounts from transactions
    result.metadata = {
      personalInfo,
      attachments: {},
      reliefEvidence: {},
      reliefNotes: {},
      reliefAmounts: reliefAmounts, // Auto-populated from relief transactions
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
    includeInvoices: boolean = true,
    entityId?: string,
    defaultEntityId?: string
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
      // Include transactions if their transaction date is in the period OR if their createdAt date is in the period
      // This ensures future-dated transactions (like brand deals) created in the current period are included
      // BUT: Include capital asset transactions from previous years (for depreciation calculation)
      const filteredTransactions = allTransactions.filter((txn) => {
        if (entityId) {
          const isLegacyDefault = !txn.entityId && defaultEntityId && entityId === defaultEntityId
          if (txn.entityId !== entityId && !isLegacyDefault) return false
        }
        
        // If it's a capital asset, include it even if it's from a previous year
        // (depreciation is calculated for the current tax year regardless of purchase date)
        const isCapitalAsset = txn.taxClassification?.isCapitalAsset && txn.taxClassification?.capitalAllowanceRate
        if (isCapitalAsset) {
          return true // Include all capital assets for depreciation calculation
        }
        
        // Get transaction date and created date
        const txnDateStr = txn.date || txn.transactionDate || txn.valueDate
        const txnDate = txnDateStr ? new Date(txnDateStr) : null
        const createdDate = txn.createdAt ? new Date(txn.createdAt) : null
        
        // Include if transaction date is in period (normal case)
        if (txnDate && !isNaN(txnDate.getTime())) {
          if (txnDate >= periodStart && txnDate <= periodEnd) {
            return true
          }
        }
        
        // Include if created date is in period (for future-dated transactions created in current period)
        // This ensures brand deals and future transactions created now are included in current period reports
        if (createdDate && !isNaN(createdDate.getTime())) {
          if (createdDate >= periodStart && createdDate <= periodEnd) {
            return true
          }
        }
        
        return false
      })
      
      console.log('🔍 [ReportService] Filtered transactions by period:', {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        totalFiltered: filteredTransactions.length,
        expenseTransactions: filteredTransactions.filter(t => t.type === 'expense').map(t => {
          const txnDateStr = t.date || t.transactionDate || t.valueDate
          const txnDate = txnDateStr ? new Date(txnDateStr) : null
          const createdDate = t.createdAt ? new Date(t.createdAt) : null
          const txnDateInPeriod = txnDate && !isNaN(txnDate.getTime()) && txnDate >= periodStart && txnDate <= periodEnd
          const createdDateInPeriod = createdDate && !isNaN(createdDate.getTime()) && createdDate >= periodStart && createdDate <= periodEnd
          
          return {
            id: t.id,
            description: t.description,
            date: t.date,
            createdAt: t.createdAt,
            amount: t.amount,
            isCapitalAsset: t.taxClassification?.isCapitalAsset,
            txnDateInPeriod,
            createdDateInPeriod,
            included: txnDateInPeriod || createdDateInPeriod
          }
        })
      })

      // Get invoices for the period
      let invoices: Invoice[] = []
      if (includeInvoices) {
        const invoicesResponse = await invoiceService.getUserInvoices(userId)
        const allInvoices = invoicesResponse.data || []
        invoices = allInvoices
          .filter((inv) => {
            if (entityId) {
              const isLegacyDefault = !inv.entityId && defaultEntityId && entityId === defaultEntityId
              if (inv.entityId !== entityId && !isLegacyDefault) return false
            }
            return true
          })
          .filter((inv) => {
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

      // Extract relief transactions and calculate relief amounts by category
      const reliefTransactions = filteredTransactions.filter(txn => txn.type === 'relief')
      const reliefAmounts = this.calculateReliefAmounts(reliefTransactions, incomeData.totalIncome)

      // For SMEs (CIT), use revenue (gross income) as turnover base for threshold checks.
      // For PIT (freelancer/creator), use taxable income after VAT exclusion (totalIncome).
      const bt = profile.businessType as unknown as string | undefined
      const isSMEProfile = bt === 'sme' || bt === 'small-business'
      const taxBaseIncome = isSMEProfile ? (incomeData.grossIncome || incomeData.totalIncome) : incomeData.totalIncome

      // Calculate tax data (now includes capital allowances and WHT credits if available)
      // Relief amounts are automatically included from transactions
      const taxData = await this.calculateTaxData(
        userId,
        taxBaseIncome,
        expenseData.totalExpenses,
        expenseData.taxDeductibleExpenses,
        profile,
        taxClassificationSummary,
        reliefAmounts
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
      
      // Initialize metadata with personalInfo from profile and relief amounts from transactions
      result.metadata = {
        personalInfo,
        attachments: {},
        reliefEvidence: {},
        reliefNotes: {},
        reliefAmounts: reliefAmounts, // Auto-populated from relief transactions
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

    let totalIncome = 0 // Net taxable income after VAT exclusion
    let grossIncome = 0 // Gross income before VAT/WHT deductions
    let vatCollected = 0 // Total VAT collected (must be remitted)
    let whtDeducted = 0 // Total WHT deducted (tax credit)
    let platformFees = 0 // Total platform fees
    const incomeByCategory: { [key: string]: number } = {}
    const incomeBySource: { [key: string]: number } = {}

    // Process all income transactions
    incomeTransactions.forEach(txn => {
      // Determine the base amount to use (after platform fees if applicable)
      let baseAmount = 0
      let grossAmount = 0
      let platformFee = 0
      
      // For foreign currency transactions, ngnEquivalent is already the converted amount
      // It represents the NGN equivalent of the net amount (after platform fees) if netAmount exists
      if (txn.currency && txn.currency !== 'NGN' && txn.ngnEquivalent) {
        // Use ngnEquivalent directly - it's already the NGN equivalent of the correct amount
        baseAmount = txn.ngnEquivalent
        
        // Calculate gross amount and platform fees in NGN
        if (txn.grossAmount && txn.platformFees && txn.exchangeRate) {
          // Convert gross amount and platform fees from original currency to NGN
          grossAmount = txn.grossAmount * txn.exchangeRate
          platformFee = txn.platformFees * txn.exchangeRate
        } else {
          grossAmount = baseAmount
        }
      } else {
        // For NGN transactions, use netAmount if available (after platform fees), otherwise use amount
        baseAmount = txn.netAmount !== undefined ? txn.netAmount : (typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0)
        
        if (txn.grossAmount && txn.platformFees) {
          grossAmount = txn.grossAmount
          platformFee = txn.platformFees
        } else {
          grossAmount = baseAmount
        }
      }
      
      platformFees += platformFee
      
      // Apply transaction nature percentage for mixed transactions (creators only)
      // Only apply if transactionNature is 'mixed' and businessPercentage is set
      let businessGrossAmount = grossAmount
      let businessBaseAmount = baseAmount
      if (txn.transactionNature === 'mixed' && txn.businessPercentage !== undefined) {
        businessGrossAmount = grossAmount * (txn.businessPercentage / 100)
        businessBaseAmount = baseAmount * (txn.businessPercentage / 100)
      } else if (txn.transactionNature === 'personal') {
        // Personal transactions are not taxable income - skip them
        return
      }
      
      grossIncome += businessGrossAmount
      
      // Calculate VAT if applicable
      // For creators, taxable income should be net amount (after platform fees)
      // VAT is calculated on gross amount (what customer pays), but taxable income is net (after platform fees)
      let vatAmount = 0
      // Start with net amount (after platform fees) for taxable income calculation
      // Platform fees are a business expense and should be deducted from taxable income
      let taxableAmount = businessBaseAmount // Use net amount (after platform fees) for taxable income
      if (txn.type === 'income' && txn.taxClassification?.vatApplicable && txn.taxClassification?.vatRate) {
        const vatRate = txn.taxClassification.vatRate / 100
        // VAT is calculated on gross amount (before platform fees) - what the customer pays
        vatAmount = businessGrossAmount * vatRate
        // Taxable amount = net amount (after platform fees) - VAT portion
        // VAT is calculated on gross, but we need to exclude it from net taxable income
        // The VAT portion of the gross is: gross * vatRate
        // Since the creator receives net (gross - platform fees), taxable income = net - VAT portion
        // This ensures VAT (which must be remitted) is excluded from taxable income
        taxableAmount = businessBaseAmount - vatAmount
        vatCollected += vatAmount
      }
      
      // Calculate WHT if applicable (WHT is calculated on net amount after platform fees)
      // WHT is a tax credit, not a deduction from taxable income
      let whtAmount = 0
      if (txn.taxClassification?.whtCreditable && txn.taxClassification?.whtRate) {
        const whtRate = txn.taxClassification.whtRate / 100
        // WHT is calculated on base amount (after platform fees, after VAT exclusion if VAT applies)
        // Base for WHT calculation is the net amount after platform fees
        whtAmount = businessBaseAmount * whtRate
        whtDeducted += whtAmount
        // WHT is a tax credit - it doesn't reduce taxable income, only reduces tax payable
        // taxableAmount remains the same
      }
      
      totalIncome += Math.max(0, taxableAmount)
      
      const category = txn.category || 'uncategorized'
      incomeByCategory[category] = (incomeByCategory[category] || 0) + Math.max(0, taxableAmount)
      
      const source = txn.description || 'Other'
      incomeBySource[source] = (incomeBySource[source] || 0) + Math.max(0, taxableAmount)
    })

    return {
      totalIncome,
      grossIncome,
      vatCollected,
      whtDeducted,
      platformFees,
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

    let totalIncome = 0 // Net taxable income after VAT exclusion
    let grossIncome = 0 // Gross income before VAT/WHT deductions
    let vatCollected = 0 // Total VAT collected (must be remitted)
    let whtDeducted = 0 // Total WHT deducted (tax credit)
    let platformFees = 0 // Total platform fees
    const incomeByCategory: { [key: string]: number } = {}
    const incomeBySource: { [key: string]: number } = {}

    // Process income transactions (excluding invoice-related ones)
    incomeTransactions.forEach(txn => {
      // Determine the base amount to use (after platform fees if applicable)
      let baseAmount = 0
      let grossAmount = 0
      let platformFee = 0
      
      // For foreign currency transactions, ngnEquivalent is already the converted amount
      if (txn.currency && txn.currency !== 'NGN' && txn.ngnEquivalent) {
        baseAmount = txn.ngnEquivalent
        
        // Calculate gross amount and platform fees in NGN
        if (txn.grossAmount && txn.platformFees && txn.exchangeRate) {
          // Convert gross amount and platform fees from original currency to NGN
          grossAmount = txn.grossAmount * txn.exchangeRate
          platformFee = txn.platformFees * txn.exchangeRate
        } else {
          grossAmount = baseAmount
        }
      } else {
        // For NGN transactions, use netAmount if available (after platform fees), otherwise use amount
        baseAmount = txn.netAmount !== undefined ? txn.netAmount : (typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0)
        
        if (txn.grossAmount && txn.platformFees) {
          grossAmount = txn.grossAmount
          platformFee = txn.platformFees
        } else {
          grossAmount = baseAmount
        }
      }
      
      platformFees += platformFee
      
      // Apply transaction nature percentage for mixed transactions (creators only)
      let businessGrossAmount = grossAmount
      let businessBaseAmount = baseAmount
      if (txn.transactionNature === 'mixed' && txn.businessPercentage !== undefined) {
        businessGrossAmount = grossAmount * (txn.businessPercentage / 100)
        businessBaseAmount = baseAmount * (txn.businessPercentage / 100)
      } else if (txn.transactionNature === 'personal') {
        // Personal transactions are not taxable income - skip them
        return
      }
      
      grossIncome += businessGrossAmount
      
      // Calculate VAT if applicable
      let vatAmount = 0
      let taxableAmount = businessGrossAmount
      if (txn.type === 'income' && txn.taxClassification?.vatApplicable && txn.taxClassification?.vatRate) {
        const vatRate = txn.taxClassification.vatRate / 100
        vatAmount = businessGrossAmount * vatRate
        taxableAmount = businessGrossAmount * (1 - vatRate)
        vatCollected += vatAmount
      }
      
      // Calculate WHT if applicable (WHT is a tax credit, not a deduction from taxable income)
      let whtAmount = 0
      if (txn.taxClassification?.whtCreditable && txn.taxClassification?.whtRate) {
        const whtRate = txn.taxClassification.whtRate / 100
        whtAmount = businessBaseAmount * whtRate
        whtDeducted += whtAmount
        // WHT doesn't affect taxable income - it's a tax credit
      }
      
      totalIncome += Math.max(0, taxableAmount)
      
      const category = txn.category || 'uncategorized'
      incomeByCategory[category] = (incomeByCategory[category] || 0) + Math.max(0, taxableAmount)
      
      const source = txn.description || 'Other'
      incomeBySource[source] = (incomeBySource[source] || 0) + Math.max(0, taxableAmount)
    })

    // Process income from paid invoices only
    paidInvoices.forEach(inv => {
      // For invoices, invoiceTotal is the gross amount before deductions
      // total is the net amount after WHT deduction
      const invoiceTotal = inv.invoiceTotal || inv.total || 0
      const invoiceVat = inv.vatAmount || 0
      const invoiceWht = inv.whtAmount || 0
      
      // Gross income is the invoice total (before VAT/WHT)
      const gross = invoiceTotal
      const vat = invoiceVat
      const wht = invoiceWht
      
      grossIncome += gross
      vatCollected += vat
      whtDeducted += wht
      
      // Taxable income = gross - VAT (VAT must be remitted, so it's not taxable)
      // WHT is a tax credit, not a deduction from taxable income
      const taxableAmount = Math.max(0, gross - vat)
      totalIncome += taxableAmount
      
      incomeByCategory['Invoice Income'] = (incomeByCategory['Invoice Income'] || 0) + taxableAmount
      incomeBySource[inv.invoiceNumber || 'Invoice'] = (incomeBySource[inv.invoiceNumber || 'Invoice'] || 0) + taxableAmount
    })

    return {
      totalIncome,
      grossIncome,
      vatCollected,
      whtDeducted,
      platformFees,
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

  /**
   * Public method to calculate tax for dashboard/quick view
   * Uses the same calculation engine as self-assessment reports
   */
  async calculateTaxForPeriod(
    userId: string,
    startDate: Date,
    endDate: Date,
    businessType: string = 'freelancer',
    entityId?: string
  ): Promise<TaxData & { taxClassification?: TaxClassificationSummary }> {
    // Fetch user profile
    const profile = await userService.getProfile(userId)
    
    // Fetch transactions for the period
    const allTransactions = await transactionService.getAll([
      { field: 'userId', operator: '==', value: userId }
    ])
    
    // Filter transactions by period - use transaction date only for tax calculations
    // Tax calculations must use the actual transaction date to maintain correct year attribution
    // Priority: transactionDate > valueDate > date (createdAt only as absolute fallback for legacy transactions)
    const filteredTransactions = allTransactions.filter(txn => {
      if (entityId && txn.entityId !== entityId) return false
      
      // Use transaction date (when transaction actually occurred) for tax period filtering
      // This ensures transactions are attributed to the correct tax year
      // Priority: transactionDate > valueDate > date > createdAt (only if no transaction date exists)
      const txnDateStr = txn.transactionDate || txn.valueDate || txn.date
      let dateToUse: Date | null = null
      
      if (txnDateStr) {
        dateToUse = new Date(txnDateStr)
      } else if (txn.createdAt) {
        // Only use createdAt as fallback for legacy transactions without transaction date
        dateToUse = new Date(txn.createdAt)
      }
      
      // Only include if date is in period
      // For tax purposes, we must use the actual transaction date to maintain year accuracy
      if (dateToUse && !isNaN(dateToUse.getTime())) {
        // Normalize dates to start of day for comparison
        const dateToCheck = new Date(dateToUse)
        dateToCheck.setHours(0, 0, 0, 0)
        
        const periodStart = new Date(startDate)
        periodStart.setHours(0, 0, 0, 0)
        const periodEnd = new Date(endDate)
        periodEnd.setHours(23, 59, 59, 999)
        
        if (dateToCheck >= periodStart && dateToCheck <= periodEnd) {
          return true
        }
      }
      
      return false
    })
    
    // Calculate income data (excluding VAT for income transactions)
    const incomeData = this.calculateIncomeDataTransactionsOnly(filteredTransactions, userId)
    
    // Calculate expense data
    const expenseData = this.calculateExpenseDataTransactionsOnly(filteredTransactions, userId)
    
    // Calculate tax classification benefits (Gold+ feature)
    let taxClassificationSummary: TaxClassificationSummary | undefined = undefined
    try {
      const taxYear = endDate.getFullYear()
      taxClassificationSummary = await calculateTaxClassificationBenefitsFromTransactions(filteredTransactions, userId, taxYear)
    } catch (error) {
      console.error('Error calculating tax classification benefits:', error)
      // Continue without tax classification if calculation fails
    }
    
    // Extract relief transactions and calculate relief amounts by category
    const reliefTransactions = filteredTransactions.filter(txn => txn.type === 'relief')
    const reliefAmounts = this.calculateReliefAmounts(reliefTransactions, incomeData.totalIncome)
    
    // Calculate tax data using the same engine as self-assessment
    // Relief amounts are automatically included from transactions
    // Note:
    // - For SMEs (CIT), we pass revenue (grossIncome) as turnover base for threshold checks
    // - For PIT (freelancer/creator), we pass totalIncome (after VAT exclusion) as the taxable income base
    const bt = (profile?.businessType as unknown as string | undefined) || undefined
    const isSMEProfile = bt === 'sme' || bt === 'small-business'
    const taxBaseIncome = isSMEProfile ? (incomeData.grossIncome || incomeData.totalIncome) : incomeData.totalIncome

    const taxData = await this.calculateTaxData(
      userId,
      taxBaseIncome,
      expenseData.totalExpenses,
      expenseData.taxDeductibleExpenses,
      profile,
      taxClassificationSummary,
      reliefAmounts
    )
    
    // Override grossIncome with actual gross income (before VAT exclusion) for display purposes
    // The taxData.grossIncome is actually taxable income after VAT exclusion (for tax calculation purposes)
    // For creators, platform fees are deducted from gross income for tax purposes
    let displayGrossIncome = incomeData.grossIncome || incomeData.totalIncome
    if (profile?.businessType === 'creator' && incomeData.platformFees) {
      // For creators, show net income (after platform fees) as gross income for tax summary
      displayGrossIncome = incomeData.grossIncome - incomeData.platformFees
    }
    
    return {
      ...taxData,
      grossIncome: displayGrossIncome, // Gross income (after platform fees for creators, before VAT exclusion)
      taxClassification: taxClassificationSummary
    }
  }

  /**
   * Calculate relief amounts from relief transactions, mapping categories to relief types
   */
  private calculateReliefAmounts(
    reliefTransactions: Transaction[],
    grossIncome: number
  ): { [key: string]: number } {
    const amounts: { [key: string]: number } = {
      pensionContribution: 0,
      nhfContribution: 0,
      healthInsurance: 0,
      rentPaid: 0, // This is the actual rent paid, not the relief amount (relief is calculated as 20% capped at ₦500k)
      lifeInsurance: 0,
      charitableDonations: 0,
      otherRelief: 0
    }

    reliefTransactions.forEach(txn => {
      // Use ngnEquivalent for foreign currency transactions, otherwise use amount
      const amount = txn.ngnEquivalent !== undefined && txn.ngnEquivalent !== null
        ? txn.ngnEquivalent
        : (txn.amount || 0)
      
      const category = txn.category || ''
      const normalizedCategory = category.toLowerCase()

      // Map transaction categories to relief types
      if (normalizedCategory.includes('pension')) {
        amounts.pensionContribution += amount
      } else if (normalizedCategory.includes('housing fund') || normalizedCategory.includes('nhf')) {
        amounts.nhfContribution += amount
      } else if (normalizedCategory.includes('health insurance') || normalizedCategory.includes('nhis') || normalizedCategory.includes('national health')) {
        amounts.healthInsurance += amount
      } else if (normalizedCategory === 'rent relief' || normalizedCategory.startsWith('rent relief') || normalizedCategory.includes('rent relief')) {
        // For rent relief, store the actual rent paid (the relief is calculated as 20% of this, capped at ₦500k)
        amounts.rentPaid += amount
      } else if (normalizedCategory.includes('life insurance')) {
        amounts.lifeInsurance += amount
      } else if (normalizedCategory.includes('charitable') || normalizedCategory.includes('donation')) {
        amounts.charitableDonations += amount
      } else if (normalizedCategory.includes('interest on housing loan') || normalizedCategory.includes('housing loan')) {
        // Interest on housing loan can be treated as part of rent relief
        amounts.rentPaid += amount
      } else {
        // For "Other Relief" or unrecognized categories, sum into otherRelief
        amounts.otherRelief += amount
      }
    })

    // Apply caps and limits as per Nigerian tax law
    // Pension: capped at 8% of gross income
    if (amounts.pensionContribution > 0 && grossIncome > 0) {
      const maxPension = grossIncome * 0.08
      if (amounts.pensionContribution > maxPension) {
        amounts.pensionContribution = maxPension
      }
    }

    // Charitable donations: capped at 10% of gross income
    if (amounts.charitableDonations > 0 && grossIncome > 0) {
      const maxCharitable = grossIncome * 0.1
      if (amounts.charitableDonations > maxCharitable) {
        amounts.charitableDonations = maxCharitable
      }
    }

    // Rent relief: 20% of rent paid, capped at ₦500,000
    // Note: We store the actual rent paid, the tax calculator will apply the 20% and cap
    // But we can pre-calculate it here for the reliefAmounts display
    const rentReliefAmount = Math.min(amounts.rentPaid * 0.2, 500000)
    
    return {
      pensionContribution: amounts.pensionContribution,
      nhfContribution: amounts.nhfContribution,
      healthInsurance: amounts.healthInsurance,
      rentPaid: amounts.rentPaid, // Actual rent paid (for user reference)
      rentRelief: rentReliefAmount, // Calculated relief amount (20% capped at ₦500k)
      lifeInsurance: amounts.lifeInsurance,
      charitableDonations: amounts.charitableDonations,
      otherRelief: amounts.otherRelief
    }
  }

  private async calculateTaxData(
    userId: string,
    grossIncome: number, // Actually taxable income after VAT exclusion (parameter name is misleading for backward compatibility)
    totalExpenses: number,
    businessExpenses: number,
    profile: any,
    taxClassification?: TaxClassificationSummary,
    reliefAmounts?: { [key: string]: number }
  ): Promise<TaxData> {
    // Note: grossIncome parameter is actually taxable income after VAT exclusion
    // This is for backward compatibility - the name is misleading
    const netIncome = grossIncome - totalExpenses

    // Extract relief amounts from transactions (if provided)
    // If not provided, defaults to 0 (for backward compatibility)
    const pensionContribution = reliefAmounts?.pensionContribution || 0
    const nhfContribution = reliefAmounts?.nhfContribution || 0
    const healthInsurance = reliefAmounts?.healthInsurance || 0
    const rentPaid = reliefAmounts?.rentPaid || 0 // Actual rent paid (tax calculator will apply 20% and cap at ₦500k)
    const lifeInsurance = reliefAmounts?.lifeInsurance || 0
    const charitableDonations = reliefAmounts?.charitableDonations || 0

    // Check if this is an SME - use CIT instead of PIT
    const isSME = profile.businessType === 'sme' || profile.businessType === 'small-business'
    
    if (isSME) {
      // Use CIT (Corporate Income Tax) for SMEs
      // CIT is 30% for businesses above ₦100M turnover, 0% for small companies (≤₦100M turnover AND ≤₦250M assets)
      const annualTurnover = profile.annualTurnover || grossIncome // Use annual turnover from profile, or grossIncome as fallback
      const totalFixedAssets = profile.totalFixedAssets || 0 // Default to 0 if not provided
      const profitBeforeTax = grossIncome - totalExpenses // Net profit after expenses
      
      // Map capital allowance details to CIT format
      const capitalAllowancesForCIT = taxClassification?.capitalAllowanceDetails?.map(ca => {
        // Map asset category from transaction type to CIT category
        // Note: We don't have the asset category in capitalAllowanceDetails, so default to equipment
        // This could be enhanced in the future to track asset category from transaction taxClassification
        let assetCategory: "building" | "furniture" | "equipment" | "vehicle" | "computer" | "other" = "equipment"
        
        return {
          id: ca.transactionId || '',
          assetDescription: ca.description || '',
          assetCost: ca.originalCost || 0,
          assetCategory: assetCategory,
          allowanceRate: ca.allowanceRate || 25,
          allowanceAmount: ca.allowanceAmount || 0
        }
      }) || undefined
      
      // Calculate CIT using minimal mode (profitBeforeTax)
      const citResult = calculateCIT({
        annualTurnover: annualTurnover,
        totalFixedAssets: totalFixedAssets,
        profitBeforeTax: profitBeforeTax,
        period: 'yearly',
        capitalAllowances: capitalAllowancesForCIT
      })
      
      // Map CIT result to TaxData format
      return {
        grossIncome,
        totalExpenses,
        netIncome,
        reliefs: {
          consolidatedRelief: 0, // Not applicable for CIT
          pensionContribution: 0, // Not applicable for CIT
          nhfContribution: 0, // Not applicable for CIT
          healthInsurance: 0, // Not applicable for CIT
          lifeInsurance: 0, // Not applicable for CIT
          charitableDonations: 0, // Not applicable for CIT
          dependents: 0 // Not applicable for CIT
        },
        taxableIncome: citResult.taxableProfit || 0,
        taxPayable: citResult.totalCITPayable || 0,
        taxBrackets: [], // CIT doesn't use brackets
        totalReliefs: citResult.totalDeductions || 0,
        adjustedGrossIncome: citResult.profitBeforeTax || 0,
        capitalAllowances: citResult.capitalAllowancesTotal || 0,
        whtCredits: taxClassification?.whtCredits || 0,
        // CIT-specific fields for breakdown display
        citRate: citResult.citRate,
        isSmallCompany: citResult.isSmallCompany,
        isLargeMultinational: citResult.isLargeMultinational,
        effectiveTaxRate: citResult.effectiveTaxRate,
        originalETR: citResult.originalETR,
        topUpTax: citResult.topUpTax,
        profitBeforeTax: citResult.profitBeforeTax,
        totalDeductions: citResult.totalDeductions,
        capitalAllowancesTotal: citResult.capitalAllowancesTotal
      }
    }
    
    // Prepare tax calculation data for PIT (Personal Income Tax) - for freelancers and creators
    // Note: calculateNigerianTax expects taxable income (after VAT exclusion, before expenses and reliefs)
    // VAT must be remitted to government, so it's excluded from taxable income at the income calculation level
    // The calculator will subtract businessExpenses and apply reliefs internally
    // Reliefs are automatically extracted from relief transactions with type='relief'
    const taxCalcData = {
      businessType: profile.businessType || 'freelancer',
      period: 'yearly' as const,
      income: grossIncome, // Taxable income after VAT exclusion (grossIncome parameter name is misleading - it's actually taxable income)
      rentPaid: rentPaid, // Actual rent paid (calculator applies 20% relief, capped at ₦500k)
      pensionContribution: pensionContribution, // Auto-extracted from relief transactions
      healthInsurance: healthInsurance, // Auto-extracted from relief transactions
      housingFund: nhfContribution, // Auto-extracted from relief transactions (NHF)
      lifeInsurance: lifeInsurance, // Auto-extracted from relief transactions
      charitableDonations: charitableDonations, // Auto-extracted from relief transactions
      businessExpenses: businessExpenses, // This will be subtracted from gross income in the calculator
      dependents: 0, // Users can add this manually in the report (not typically tracked as transactions)
      // Add tax classification benefits if available (Gold+ feature)
      capitalAllowances: taxClassification?.capitalAllowances || undefined,
      whtCredits: taxClassification?.whtCredits || undefined
    }

    // Calculate tax using PIT (Personal Income Tax)
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
    type: 'Self-Assessment' | 'Income Statement' | 'Expense Report' | 'Tax Summary' | 'Tax Assessment',
    reportData: ReportData,
    status: 'draft' | 'completed' | 'submitted' = 'completed',
    entityId?: string
  ): Promise<string> {
    try {
      const report = {
        entityId,
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
  async getUserReports(userId: string, entityId?: string, defaultEntityId?: string): Promise<SavedReport[]> {
    try {
      const allReports: SavedReport[] = []
      
      // Fetch from all report type collections
      const collections = ['selfAssessments', 'incomeStatements', 'expenseReports', 'taxSummaries', 'taxAssessments']
      
      for (const collectionName of collections) {
        try {
          const baseService = new BaseService(collectionName)
          const reports = await baseService.getAll([{ field: 'userId', operator: '==', value: userId }])
          const filtered = entityId
            ? (reports as any[]).filter((r) => {
                const isLegacyDefault = !r.entityId && defaultEntityId && entityId === defaultEntityId
                return r.entityId === entityId || isLegacyDefault
              })
            : reports
          allReports.push(...(filtered as any))
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
  async getReportById(reportId: string, type?: 'Self-Assessment' | 'Income Statement' | 'Expense Report' | 'Tax Summary' | 'Tax Assessment'): Promise<SavedReport | null> {
    try {
      if (type) {
        // If type is provided, search in specific collection
        const collectionName = this.getCollectionName(type)
        const baseService = new BaseService(collectionName)
        return await baseService.getById(reportId)
      } else {
        // Search in all collections
        const collections = ['selfAssessments', 'incomeStatements', 'expenseReports', 'taxSummaries', 'taxAssessments']
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
    type: 'Self-Assessment' | 'Income Statement' | 'Expense Report' | 'Tax Summary' | 'Tax Assessment',
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
  async deleteReport(reportId: string, type?: 'Self-Assessment' | 'Income Statement' | 'Expense Report' | 'Tax Summary' | 'Tax Assessment'): Promise<void> {
    try {
      if (type) {
        // If type is provided, delete from specific collection
        const collectionName = this.getCollectionName(type)
        const baseService = new BaseService(collectionName)
        await baseService.delete(reportId)
      } else {
        // Search and delete from all collections
        const collections = ['selfAssessments', 'incomeStatements', 'expenseReports', 'taxSummaries', 'taxAssessments']
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

