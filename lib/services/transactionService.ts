import { BaseService } from './base'
import { Transaction, TransactionFilters, ApiResponse, PaginatedResponse } from '@/lib/types'

export class TransactionService extends BaseService {
  constructor() {
    super('transactions')
  }

  // Get all transactions for a user
  async getUserTransactions(
    userId: string, 
    filters?: TransactionFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Transaction>> {
    try {
      const queryFilters = [{ field: 'userId', operator: '==', value: userId }]
      
      // Add additional filters
      if (filters) {
        if (filters.type) {
          queryFilters.push({ field: 'type', operator: '==', value: filters.type })
        }
        if (filters.category) {
          queryFilters.push({ field: 'category', operator: '==', value: filters.category })
        }
        if (filters.dateRange) {
          queryFilters.push({ field: 'date', operator: '>=', value: filters.dateRange.start })
          queryFilters.push({ field: 'date', operator: '<=', value: filters.dateRange.end })
        }
        if (filters.amountRange) {
          queryFilters.push({ field: 'amount', operator: '>=', value: filters.amountRange.min.toString() })
          queryFilters.push({ field: 'amount', operator: '<=', value: filters.amountRange.max.toString() })
        }
      }

      const { data, total } = await this.getPaginated(
        page,
        pageSize,
        queryFilters,
        'date',
        'desc'
      )

      const totalPages = Math.ceil(total / pageSize)

      return {
        data,
        pagination: {
          page,
          limit: pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      console.error('Error getting user transactions:', error)
      throw error
    }
  }

  // Create a new transaction
  async createTransaction(userId: string, transactionData: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Transaction>> {
    try {
      const newTransaction = {
        ...transactionData,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const transactionId = await this.create(newTransaction)
      const createdTransaction = await this.getById(transactionId)

      return {
        success: true,
        data: createdTransaction,
        message: 'Transaction created successfully'
      }
    } catch (error) {
      console.error('Error creating transaction:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Update an existing transaction
  async updateTransaction(transactionId: string, userId: string, updateData: Partial<Transaction>): Promise<ApiResponse<Transaction>> {
    try {
      // Verify ownership
      const existingTransaction = await this.getById(transactionId)
      if (existingTransaction.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only update your own transactions'
        }
      }

      await this.update(transactionId, updateData)
      const updatedTransaction = await this.getById(transactionId)

      return {
        success: true,
        data: updatedTransaction,
        message: 'Transaction updated successfully'
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Delete a transaction
  async deleteTransaction(transactionId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      // Verify ownership
      const existingTransaction = await this.getById(transactionId)
      if (existingTransaction.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only delete your own transactions'
        }
      }

      await this.delete(transactionId)

      return {
        success: true,
        message: 'Transaction deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Get transaction summary for a user
  async getTransactionSummary(userId: string, startDate?: string, endDate?: string): Promise<{
    totalIncome: number
    totalExpenses: number
    netIncome: number
    transactionCount: number
    categories: { [key: string]: { income: number; expenses: number; count: number } }
  }> {
    try {
      const queryFilters = [{ field: 'userId', operator: '==', value: userId }]
      
      if (startDate) {
        queryFilters.push({ field: 'date', operator: '>=', value: startDate })
      }
      if (endDate) {
        queryFilters.push({ field: 'date', operator: '<=', value: endDate })
      }

      const transactions = await this.getAll(queryFilters)

      const summary = {
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        transactionCount: transactions.length,
        categories: {} as { [key: string]: { income: number; expenses: number; count: number } }
      }

      transactions.forEach(transaction => {
        if (transaction.type === 'income') {
          summary.totalIncome += transaction.amount
        } else {
          summary.totalExpenses += transaction.amount
        }

        // Category breakdown
        if (!summary.categories[transaction.category]) {
          summary.categories[transaction.category] = { income: 0, expenses: 0, count: 0 }
        }
        
        summary.categories[transaction.category].count++
        if (transaction.type === 'income') {
          summary.categories[transaction.category].income += transaction.amount
        } else {
          summary.categories[transaction.category].expenses += transaction.amount
        }
      })

      summary.netIncome = summary.totalIncome - summary.totalExpenses

      return summary
    } catch (error) {
      console.error('Error getting transaction summary:', error)
      throw error
    }
  }

  // Get transactions by category
  async getTransactionsByCategory(userId: string, category: string): Promise<Transaction[]> {
    try {
      return await this.getAll([
        { field: 'userId', operator: '==', value: userId },
        { field: 'category', operator: '==', value: category }
      ], 'date', 'desc')
    } catch (error) {
      console.error('Error getting transactions by category:', error)
      throw error
    }
  }

  // Get recent transactions
  async getRecentTransactions(userId: string, limit: number = 10): Promise<Transaction[]> {
    try {
      const { data } = await this.getPaginated(
        1,
        limit,
        [{ field: 'userId', operator: '==', value: userId }],
        'date',
        'desc'
      )
      return data
    } catch (error) {
      console.error('Error getting recent transactions:', error)
      throw error
    }
  }
}

// Export a singleton instance
export const transactionService = new TransactionService()
