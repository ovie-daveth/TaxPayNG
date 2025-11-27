import { BaseService } from './base'
import { transactionService } from './transactionService'
import { invoiceService } from './invoiceService'
import { taxCalculationService } from './taxCalculationService'
import { userService } from './userService'
import { Transaction, Invoice, TaxCalculation, SavedReport } from '@/lib/types'
import { calculateNigerianTax } from '@/lib/tax-calculator'

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

      const periodStart = new Date(period.startDate)
      periodStart.setHours(0, 0, 0, 0) // Start of day
      
      const periodEnd = new Date(period.endDate)
      periodEnd.setHours(23, 59, 59, 999) // End of day

      const filteredTransactions = allTransactions.filter((txn) => {
        const txnDate = txn.date ? new Date(txn.date) : new Date(txn.createdAt)
        // Compare dates: transaction must be >= period start and <= period end
        return txnDate >= periodStart && txnDate <= periodEnd
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

      // Calculate tax data
      const taxData = await this.calculateTaxData(
        userId,
        incomeData.totalIncome,
        expenseData.totalExpenses,
        expenseData.taxDeductibleExpenses,
        profile
      )

      return {
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
        generatedAt: new Date().toISOString()
      }
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
      const amount = typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0
      totalIncome += amount
      
      const category = txn.category || 'uncategorized'
      incomeByCategory[category] = (incomeByCategory[category] || 0) + amount
      
      const source = txn.description || 'Other'
      incomeBySource[source] = (incomeBySource[source] || 0) + amount
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
      const amount = typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0
      totalIncome += amount
      
      const category = txn.category || 'uncategorized'
      incomeByCategory[category] = (incomeByCategory[category] || 0) + amount
      
      const source = txn.description || 'Other'
      incomeBySource[source] = (incomeBySource[source] || 0) + amount
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

    let totalExpenses = 0
    let taxDeductibleExpenses = 0
    const expensesByCategory: { [key: string]: number } = {}

    // Process all expense transactions
    expenseTransactions.forEach(txn => {
      const amount = typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0
      totalExpenses += amount
      
      if (txn.taxDeductible) {
        taxDeductibleExpenses += amount
      }
      
      const category = txn.category || 'uncategorized'
      expensesByCategory[category] = (expensesByCategory[category] || 0) + amount
    })

    return {
      totalExpenses,
      expensesByCategory,
      taxDeductibleExpenses,
      transactionCount: expenseTransactions.length,
      invoiceCount: 0,
      transactions: expenseTransactions,
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
      const amount = typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0
      totalExpenses += amount
      
      if (txn.taxDeductible) {
        taxDeductibleExpenses += amount
      }
      
      const category = txn.category || 'uncategorized'
      expensesByCategory[category] = (expensesByCategory[category] || 0) + amount
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
    profile: any
  ): Promise<TaxData> {
    // Get latest tax calculation or use profile defaults
    let latestCalculation: TaxCalculation | null = null
    try {
      latestCalculation = await taxCalculationService.getLatestCalculation(userId)
    } catch (error) {
      console.log('No existing tax calculation found, using defaults')
    }

    const netIncome = grossIncome - totalExpenses

    // Prepare tax calculation data
    const taxCalcData = {
      businessType: profile.businessType || 'freelancer',
      period: 'yearly' as const,
      income: netIncome,
      rentPaid: latestCalculation?.rentPaid || 0,
      pensionContribution: latestCalculation?.pensionContribution || 0,
      healthInsurance: latestCalculation?.healthInsurance || 0,
      housingFund: 0, // NHF - typically calculated separately, can be added to profile later
      lifeInsurance: latestCalculation?.lifeInsurance || 0,
      charitableDonations: latestCalculation?.charitableDonations || 0,
      businessExpenses: businessExpenses,
      dependents: latestCalculation?.dependents || 0
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
      adjustedGrossIncome: taxResult.adjustedGrossIncome || 0
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

