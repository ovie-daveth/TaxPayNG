import { transactionService } from './transactionService'
import { Transaction } from '@/lib/types'

export interface MonthlyAggregation {
  month: string // YYYY-MM format
  year: number
  monthNumber: number // 1-12
  income: number
  expenses: number
  netProfit: number
  transactionCount: number
  categories: { [category: string]: { income: number; expenses: number; count: number } }
}

export interface YearlyAggregation {
  year: number
  income: number
  expenses: number
  netProfit: number
  transactionCount: number
  monthlyBreakdown: MonthlyAggregation[]
}

export interface ComparativeMetrics {
  current: number
  previous: number
  change: number // percentage change
  changeAmount: number // absolute change
}

export interface TrendAnalysis {
  period: string
  income: number[]
  expenses: number[]
  netProfit: number[]
  labels: string[] // Month/year labels
}

export interface Forecast {
  period: string // "3M", "6M", "12M"
  projectedIncome: number
  projectedExpenses: number
  projectedNetProfit: number
  confidence: number // 0-100
  methodology: 'linear' | 'moving_average' | 'seasonal'
}

class AdvancedAnalyticsService {
  /**
   * Get monthly aggregations for a given year
   */
  async getMonthlyAggregations(userId: string, year: number): Promise<MonthlyAggregation[]> {
    try {
      const startDate = new Date(year, 0, 1).toISOString().split('T')[0]
      const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString().split('T')[0]
      
      const transactions = await transactionService.getTransactionsForPeriod(userId, startDate, endDate)
      
      // Initialize 12 months
      const monthlyData: { [key: string]: MonthlyAggregation } = {}
      for (let month = 0; month < 12; month++) {
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
        monthlyData[monthKey] = {
          month: monthKey,
          year,
          monthNumber: month + 1,
          income: 0,
          expenses: 0,
          netProfit: 0,
          transactionCount: 0,
          categories: {}
        }
      }
      
      // Aggregate transactions by month
      transactions.forEach(txn => {
        // Use transactionDate (when transaction occurred) first, then valueDate, then date as fallback
        const dateString = txn.transactionDate || txn.valueDate || txn.date
        const txnDate = dateString ? new Date(dateString) : null
        if (!txnDate || isNaN(txnDate.getTime())) return
        
        const txnYear = txnDate.getFullYear()
        const txnMonth = txnDate.getMonth() + 1
        
        if (txnYear !== year) return
        
        const monthKey = `${year}-${String(txnMonth).padStart(2, '0')}`
        const monthData = monthlyData[monthKey]
        
        if (!monthData) return
        
        const amount = typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0
        const category = txn.category || 'Uncategorized'
        
        monthData.transactionCount++
        
        if (txn.type === 'income') {
          monthData.income += amount
          if (!monthData.categories[category]) {
            monthData.categories[category] = { income: 0, expenses: 0, count: 0 }
          }
          monthData.categories[category].income += amount
          monthData.categories[category].count++
        } else if (txn.type === 'expense') {
          monthData.expenses += amount
          if (!monthData.categories[category]) {
            monthData.categories[category] = { income: 0, expenses: 0, count: 0 }
          }
          monthData.categories[category].expenses += amount
          monthData.categories[category].count++
        }
        
        monthData.netProfit = monthData.income - monthData.expenses
      })
      
      return Object.values(monthlyData)
    } catch (error) {
      console.error('Error getting monthly aggregations:', error)
      throw error
    }
  }
  
  /**
   * Get yearly aggregations for a range of years
   */
  async getYearlyAggregations(userId: string, startYear: number, endYear: number): Promise<YearlyAggregation[]> {
    try {
      const results: YearlyAggregation[] = []
      
      for (let year = startYear; year <= endYear; year++) {
        const monthlyData = await this.getMonthlyAggregations(userId, year)
        
        const yearlyAgg: YearlyAggregation = {
          year,
          income: monthlyData.reduce((sum, month) => sum + month.income, 0),
          expenses: monthlyData.reduce((sum, month) => sum + month.expenses, 0),
          netProfit: monthlyData.reduce((sum, month) => sum + month.netProfit, 0),
          transactionCount: monthlyData.reduce((sum, month) => sum + month.transactionCount, 0),
          monthlyBreakdown: monthlyData
        }
        
        results.push(yearlyAgg)
      }
      
      return results
    } catch (error) {
      console.error('Error getting yearly aggregations:', error)
      throw error
    }
  }
  
  /**
   * Calculate comparative metrics (YoY, MoM, QoQ)
   */
  calculateComparativeMetrics(current: number, previous: number): ComparativeMetrics {
    const changeAmount = current - previous
    const change = previous !== 0 ? ((changeAmount / previous) * 100) : (current > 0 ? 100 : 0)
    
    return {
      current,
      previous,
      change,
      changeAmount
    }
  }
  
  /**
   * Calculate year-over-year comparison
   */
  async getYearOverYearComparison(userId: string, currentYear: number): Promise<{
    current: YearlyAggregation
    previous: YearlyAggregation | null
    metrics: {
      income: ComparativeMetrics
      expenses: ComparativeMetrics
      netProfit: ComparativeMetrics
    }
  }> {
    try {
      const currentYearData = await this.getYearlyAggregations(userId, currentYear, currentYear)
      const previousYearData = await this.getYearlyAggregations(userId, currentYear - 1, currentYear - 1)
      
      const current = currentYearData[0]
      const previous = previousYearData[0] || null
      
      if (!current) {
        throw new Error(`No data found for year ${currentYear}`)
      }
      
      const metrics = {
        income: this.calculateComparativeMetrics(
          current.income,
          previous?.income || 0
        ),
        expenses: this.calculateComparativeMetrics(
          current.expenses,
          previous?.expenses || 0
        ),
        netProfit: this.calculateComparativeMetrics(
          current.netProfit,
          previous?.netProfit || 0
        )
      }
      
      return {
        current,
        previous: previous || null,
        metrics
      }
    } catch (error) {
      console.error('Error getting year-over-year comparison:', error)
      throw error
    }
  }
  
  /**
   * Calculate month-over-month comparison
   */
  async getMonthOverMonthComparison(userId: string, year: number, month: number): Promise<{
    current: MonthlyAggregation
    previous: MonthlyAggregation | null
    metrics: {
      income: ComparativeMetrics
      expenses: ComparativeMetrics
      netProfit: ComparativeMetrics
    }
  }> {
    try {
      const monthlyData = await this.getMonthlyAggregations(userId, year)
      
      const current = monthlyData.find(m => m.monthNumber === month)
      if (!current) {
        throw new Error(`No data found for ${year}-${month}`)
      }
      
      // Get previous month
      let previous: MonthlyAggregation | null = null
      if (month > 1) {
        previous = monthlyData.find(m => m.monthNumber === month - 1) || null
      } else {
        // Get December of previous year
        const prevYearData = await this.getMonthlyAggregations(userId, year - 1)
        previous = prevYearData.find(m => m.monthNumber === 12) || null
      }
      
      const metrics = {
        income: this.calculateComparativeMetrics(
          current.income,
          previous?.income || 0
        ),
        expenses: this.calculateComparativeMetrics(
          current.expenses,
          previous?.expenses || 0
        ),
        netProfit: this.calculateComparativeMetrics(
          current.netProfit,
          previous?.netProfit || 0
        )
      }
      
      return {
        current,
        previous,
        metrics
      }
    } catch (error) {
      console.error('Error getting month-over-month comparison:', error)
      throw error
    }
  }
  
  /**
   * Get trend analysis for a date range
   */
  async getTrendAnalysis(userId: string, months: number = 12): Promise<TrendAnalysis> {
    try {
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1)
      
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = now.toISOString().split('T')[0]
      
      const transactions = await transactionService.getTransactionsForPeriod(userId, startDateStr, endDateStr)
      
      // Group by month
      const monthlyMap: { [key: string]: { income: number; expenses: number } } = {}
      
      transactions.forEach(txn => {
        // Use transactionDate (when transaction occurred) first, then valueDate, then date as fallback
        const dateString = txn.transactionDate || txn.valueDate || txn.date
        const txnDate = dateString ? new Date(dateString) : null
        if (!txnDate || isNaN(txnDate.getTime())) return
        
        const monthKey = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`
        
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { income: 0, expenses: 0 }
        }
        
        const amount = typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0
        
        if (txn.type === 'income') {
          monthlyMap[monthKey].income += amount
        } else if (txn.type === 'expense') {
          monthlyMap[monthKey].expenses += amount
        }
      })
      
      // Sort by date and build arrays
      const sortedKeys = Object.keys(monthlyMap).sort()
      const income: number[] = []
      const expenses: number[] = []
      const netProfit: number[] = []
      const labels: string[] = []
      
      sortedKeys.forEach(key => {
        const [year, month] = key.split('-')
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        
        labels.push(monthName)
        income.push(monthlyMap[key].income)
        expenses.push(monthlyMap[key].expenses)
        netProfit.push(monthlyMap[key].income - monthlyMap[key].expenses)
      })
      
      return {
        period: `${months} months`,
        income,
        expenses,
        netProfit,
        labels
      }
    } catch (error) {
      console.error('Error getting trend analysis:', error)
      throw error
    }
  }
  
  /**
   * Simple linear forecast (can be enhanced later)
   */
  async getForecast(userId: string, periods: 3 | 6 | 12 = 3, methodology: 'linear' | 'moving_average' = 'linear'): Promise<Forecast> {
    try {
      // Get historical data
      const historicalMonths = periods === 3 ? 6 : periods === 6 ? 12 : 24
      const trend = await this.getTrendAnalysis(userId, historicalMonths)
      
      if (trend.income.length < 3) {
        // Not enough data for forecasting
        return {
          period: `${periods}M`,
          projectedIncome: 0,
          projectedExpenses: 0,
          projectedNetProfit: 0,
          confidence: 0,
          methodology
        }
      }
      
      // Simple linear regression or moving average
      let avgIncome = 0
      let avgExpenses = 0
      
      if (methodology === 'moving_average') {
        // Use average of last 3 months
        const recentMonths = Math.min(3, trend.income.length)
        const recentIncome = trend.income.slice(-recentMonths)
        const recentExpenses = trend.expenses.slice(-recentMonths)
        
        avgIncome = recentIncome.reduce((a, b) => a + b, 0) / recentIncome.length
        avgExpenses = recentExpenses.reduce((a, b) => a + b, 0) / recentExpenses.length
      } else {
        // Linear: average of all data
        avgIncome = trend.income.reduce((a, b) => a + b, 0) / trend.income.length
        avgExpenses = trend.expenses.reduce((a, b) => a + b, 0) / trend.expenses.length
      }
      
      const projectedIncome = avgIncome * periods
      const projectedExpenses = avgExpenses * periods
      const projectedNetProfit = projectedIncome - projectedExpenses
      
      // Confidence based on data points and variance (simplified)
      const incomeVariance = this.calculateVariance(trend.income)
      const confidence = Math.max(0, Math.min(100, 100 - (incomeVariance / (avgIncome || 1)) * 10))
      
      return {
        period: `${periods}M`,
        projectedIncome,
        projectedExpenses,
        projectedNetProfit,
        confidence: Math.round(confidence),
        methodology
      }
    } catch (error) {
      console.error('Error getting forecast:', error)
      throw error
    }
  }
  
  /**
   * Calculate variance of an array
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2))
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService()

