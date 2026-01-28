import { Transaction } from '@/lib/types'
import { transactionService } from './transactionService'

export interface PlatformAnalytics {
  platformName: string
  platformType: 'social' | 'subscription' | 'marketplace' | 'streaming' | 'other'
  totalIncome: number
  totalExpenses: number
  netProfit: number
  transactionCount: number
  incomeTransactions: Transaction[]
  expenseTransactions: Transaction[]
  averageIncomePerTransaction: number
  platformFees: number
  taxImplications?: {
    estimatedTax: number
    whtCredits: number
    vatOutput: number
  }
}

export interface PlatformAnalyticsSummary {
  platforms: PlatformAnalytics[]
  totalIncome: number
  totalExpenses: number
  totalNetProfit: number
  totalTransactions: number
  mostProfitablePlatform: PlatformAnalytics | null
  leastProfitablePlatform: PlatformAnalytics | null
}

export class PlatformAnalyticsService {
  /**
   * Calculate platform-specific analytics from transactions
   */
  calculatePlatformAnalytics(transactions: Transaction[]): PlatformAnalyticsSummary {
    const platformMap = new Map<string, PlatformAnalytics>()

    // Process all transactions
    transactions.forEach(txn => {
      // Only process transactions with platform data
      if (!txn.platform?.name) return

      const platformName = txn.platform.name
      
      // Initialize platform if not exists
      if (!platformMap.has(platformName)) {
        platformMap.set(platformName, {
          platformName,
          platformType: txn.platform.platformType || 'other',
          totalIncome: 0,
          totalExpenses: 0,
          netProfit: 0,
          transactionCount: 0,
          incomeTransactions: [],
          expenseTransactions: [],
          averageIncomePerTransaction: 0,
          platformFees: 0,
        })
      }

      const platform = platformMap.get(platformName)!

      // Calculate base amount (considering currency conversion and netAmount)
      let baseAmount = 0
      if (txn.currency && txn.currency !== 'NGN' && txn.ngnEquivalent) {
        baseAmount = txn.ngnEquivalent
      } else {
        baseAmount = txn.netAmount !== undefined ? txn.netAmount : (typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0)
      }

      // Apply VAT exclusion for income
      if (txn.type === 'income' && txn.taxClassification?.vatApplicable && txn.taxClassification?.vatRate) {
        const vatRate = txn.taxClassification.vatRate / 100
        baseAmount = baseAmount * (1 - vatRate)
      }

      // Apply business percentage for mixed transactions
      if (txn.transactionNature === 'mixed' && txn.businessPercentage !== undefined) {
        baseAmount = baseAmount * (txn.businessPercentage / 100)
      } else if (txn.transactionNature === 'personal') {
        baseAmount = 0 // Personal transactions don't count
      }

      // Update platform stats
      if (txn.type === 'income') {
        platform.totalIncome += baseAmount
        platform.incomeTransactions.push(txn)
        
        // Track platform fees
        if (txn.platformFees) {
          platform.platformFees += txn.platformFees
        }
      } else if (txn.type === 'expense') {
        platform.totalExpenses += baseAmount
        platform.expenseTransactions.push(txn)
      }

      platform.transactionCount++
    })

    // Calculate derived metrics
    const platforms: PlatformAnalytics[] = Array.from(platformMap.values()).map(platform => {
      platform.netProfit = platform.totalIncome - platform.totalExpenses
      platform.averageIncomePerTransaction = platform.incomeTransactions.length > 0
        ? platform.totalIncome / platform.incomeTransactions.length
        : 0

      // Calculate tax implications (simplified)
      if (platform.totalIncome > 0) {
        // Estimate tax at 7.5% (simplified - actual calculation would use full tax calculator)
        platform.taxImplications = {
          estimatedTax: platform.totalIncome * 0.075, // Simplified estimate
          whtCredits: platform.incomeTransactions.reduce((sum, txn) => {
            if (txn.taxClassification?.whtCreditable && txn.taxClassification?.whtRate) {
              const amount = txn.netAmount !== undefined ? txn.netAmount : txn.amount
              return sum + (amount * (txn.taxClassification.whtRate / 100))
            }
            return sum
          }, 0),
          vatOutput: platform.incomeTransactions.reduce((sum, txn) => {
            if (txn.taxClassification?.vatApplicable && txn.taxClassification?.vatRate) {
              const amount = txn.netAmount !== undefined ? txn.netAmount : txn.amount
              return sum + (amount * (txn.taxClassification.vatRate / 100))
            }
            return sum
          }, 0),
        }
      }

      return platform
    })

    // Sort by net profit (most profitable first)
    platforms.sort((a, b) => b.netProfit - a.netProfit)

    // Calculate summary
    const totalIncome = platforms.reduce((sum, p) => sum + p.totalIncome, 0)
    const totalExpenses = platforms.reduce((sum, p) => sum + p.totalExpenses, 0)
    const totalNetProfit = totalIncome - totalExpenses
    const totalTransactions = platforms.reduce((sum, p) => sum + p.transactionCount, 0)

    return {
      platforms,
      totalIncome,
      totalExpenses,
      totalNetProfit,
      totalTransactions,
      mostProfitablePlatform: platforms.length > 0 ? platforms[0] : null,
      leastProfitablePlatform: platforms.length > 0 ? platforms[platforms.length - 1] : null,
    }
  }

  /**
   * Get platform analytics for a user
   */
  async getPlatformAnalytics(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<PlatformAnalyticsSummary> {
    try {
      // Get all transactions for the user
      const allTransactions = await transactionService.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])

      // Filter by date range if provided
      let filteredTransactions = allTransactions
      if (startDate || endDate) {
        filteredTransactions = allTransactions.filter(txn => {
          // Use valueDate (when money moved) as primary, fallback to transactionDate, then date
          const txnDate = txn.valueDate ? new Date(txn.valueDate) : 
                         (txn.transactionDate ? new Date(txn.transactionDate) : 
                         (txn.date ? new Date(txn.date) : new Date(txn.createdAt)))
          if (startDate && txnDate < new Date(startDate)) return false
          if (endDate && txnDate > new Date(endDate)) return false
          return true
        })
      }

      // Filter to only transactions with platform data
      const platformTransactions = filteredTransactions.filter(txn => txn.platform?.name)

      return this.calculatePlatformAnalytics(platformTransactions)
    } catch (error) {
      console.error('Error getting platform analytics:', error)
      throw error
    }
  }
}

export const platformAnalyticsService = new PlatformAnalyticsService()

