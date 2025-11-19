import { BaseService } from './base'
import { Transaction, TransactionFilters, ApiResponse, PaginatedResponse, Document } from '@/lib/types'
import { documentService } from './documentService'

export class TransactionService extends BaseService {
  constructor() {
    super('transactions')
  }

  // Get all transactions for a user
  // All filtering is done client-side to avoid Firestore composite index requirements
  async getUserTransactions(
    userId: string, 
    filters?: TransactionFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Transaction>> {
    try {
      // Always fetch all transactions for the user (only filter by userId in database)
      const allTransactions = await this.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])
      
      // Convert startDate/endDate to dateRange if needed
      let dateRange = filters?.dateRange
      if (!dateRange && (filters?.startDate || filters?.endDate)) {
        dateRange = {
          start: filters.startDate || new Date(0).toISOString().split('T')[0],
          end: filters.endDate || new Date().toISOString().split('T')[0]
        }
      }
      
      // Apply all filters client-side
      let filtered = allTransactions
      
      if (filters?.type) {
        filtered = filtered.filter(t => t.type === filters.type)
      }
      if (filters?.category) {
        filtered = filtered.filter(t => t.category === filters.category)
      }
      if (filters?.paymentMethod) {
        filtered = filtered.filter(t => t.paymentMethod === filters.paymentMethod)
      }
      if (dateRange) {
        const start = dateRange.start ? new Date(dateRange.start) : null
        const end = dateRange.end ? new Date(dateRange.end) : null
        filtered = filtered.filter(t => {
          const txnDate = t.date ? new Date(t.date) : null
          if (!txnDate || isNaN(txnDate.getTime())) return false
          if (start && txnDate < start) return false
          if (end && txnDate > end) return false
          return true
        })
      }
      if (filters?.amountRange) {
        filtered = filtered.filter(t => {
          const amount = typeof t.amount === 'number' ? t.amount : Number(String(t.amount).replace(/[\u20A6,]/g, '').trim()) || 0
          if (filters.amountRange!.min !== undefined && amount < filters.amountRange!.min) return false
          if (filters.amountRange!.max !== undefined && amount > filters.amountRange!.max) return false
          return true
        })
      }
      
      // Sort by date descending
      filtered.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateB - dateA
      })
      
      // Apply pagination
      const total = filtered.length
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedData = filtered.slice(startIndex, endIndex)
      
      const totalPages = Math.ceil(total / pageSize)
      
      return {
        data: paginatedData,
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

      // If transaction has attachments, create corresponding documents
      if (transactionData.attachments && transactionData.attachments.length > 0) {
        await this.createDocumentsFromAttachments(
          userId,
          transactionId,
          transactionData.attachments,
          transactionData.description,
          transactionData.date,
          transactionData.type
        )
      }

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

  // Helper method to create documents from transaction attachments
  private async createDocumentsFromAttachments(
    userId: string,
    transactionId: string,
    attachmentUrls: string[],
    transactionDescription: string,
    transactionDate: string,
    transactionType: 'income' | 'expense' | 'relief'
  ): Promise<void> {
    try {
      for (let i = 0; i < attachmentUrls.length; i++) {
        const url = attachmentUrls[i]
        
        // Extract filename from URL
        const urlParts = url.split('/')
        const filename = urlParts[urlParts.length - 1] || `attachment-${i + 1}`
        
        // Determine file type from URL
        const fileExtension = filename.split('.').pop()?.toLowerCase() || ''
        let fileType: 'pdf' | 'image' | 'document' = 'document'
        let mimeType = 'application/octet-stream'
        
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
          fileType = 'image'
          mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
        } else if (fileExtension === 'pdf') {
          fileType = 'pdf'
          mimeType = 'application/pdf'
        }
        
        // Determine document type based on transaction type
        const documentType: Document['type'] = transactionType === 'income' ? 'invoice' : 'receipt'
        
        // Create document record
        const documentData = {
          userId,
          name: `${transactionDescription} - Attachment ${i + 1}`,
          originalName: filename,
          type: documentType,
          fileType: fileType,
          mimeType: mimeType,
          size: 0, // We don't have size info from ImageKit URL
          url: url,
          thumbnailUrl: fileType === 'image' ? url : undefined,
          uploadedAt: transactionDate,
          linkedTransaction: transactionId,
          notes: `Auto-created from transaction: ${transactionDescription}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        await documentService.create(documentData)
      }
    } catch (error) {
      console.error('Error creating documents from attachments:', error)
      // Don't throw error - transaction creation should succeed even if document creation fails
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

      // If attachments were updated, create documents for new attachments
      if (updateData.attachments && updateData.attachments.length > 0) {
        const existingAttachments = existingTransaction.attachments || []
        const newAttachments = updateData.attachments.filter(
          (url: string) => !existingAttachments.includes(url)
        )
        
        if (newAttachments.length > 0) {
          await this.createDocumentsFromAttachments(
            userId,
            transactionId,
            newAttachments,
            updateData.description || existingTransaction.description,
            updateData.date || existingTransaction.date,
            updateData.type || existingTransaction.type
          )
        }
      }

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

      // Delete linked documents (optional - documents remain even if transaction is deleted)
      // Uncomment the following lines if you want to delete documents when transaction is deleted:
      // try {
      //   const linkedDocs = await documentService.getDocumentsByTransaction(userId, transactionId)
      //   for (const doc of linkedDocs) {
      //     await documentService.deleteDocument(doc.id, userId)
      //   }
      // } catch (docError) {
      //   console.warn('Error deleting linked documents:', docError)
      // }

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
    totalReliefs: number
    netIncome: number
    transactionCount: number
    categories: { [key: string]: { income: number; expenses: number; count: number } }
  }> {
    try {
      // Fetch all transactions for the user, then filter locally to avoid requiring composite indexes
      const transactions = await this.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])

      const start = startDate ? new Date(startDate) : null
      const end = endDate ? new Date(endDate) : null
      const filteredTransactions = transactions
        .map((transaction) => {
          const coercedAmount =
            typeof transaction.amount === 'number'
              ? transaction.amount
              : Number(String(transaction.amount).replace(/[\u20A6,]/g, '').trim()) || 0

          const dateString = transaction.date || transaction.createdAt
          const txnDate = dateString ? new Date(dateString) : null

          return {
            ...transaction,
            amount: coercedAmount,
            category: transaction.category || 'uncategorized',
            txnDate,
          }
        })
        .filter((transaction) => {
          if (!transaction.txnDate || Number.isNaN(transaction.txnDate.getTime())) {
            return false
          }

          if (!start && !end) return true
          if (start && transaction.txnDate < start) return false
          if (end && transaction.txnDate > end) return false
          return true
        })

      const summary = {
        totalIncome: 0,
        totalExpenses: 0,
        totalReliefs: 0,
        netIncome: 0,
        transactionCount: filteredTransactions.length,
        categories: {} as { [key: string]: { income: number; expenses: number; count: number } }
      }

      filteredTransactions.forEach((transaction) => {
        if (transaction.type === 'income') {
          summary.totalIncome += transaction.amount
        } else if (transaction.type === 'expense') {
          summary.totalExpenses += transaction.amount
        } else if (transaction.type === 'relief') {
          summary.totalReliefs += transaction.amount
          return
        }
        // Category breakdown
        const categoryKey = transaction.category || 'uncategorized'
        if (!summary.categories[categoryKey]) {
          summary.categories[categoryKey] = { income: 0, expenses: 0, count: 0 }
        }

        summary.categories[categoryKey].count++
        if (transaction.type === 'income') {
          summary.categories[categoryKey].income += transaction.amount
        } else if (transaction.type === 'expense') {
          summary.categories[categoryKey].expenses += transaction.amount
        }
      })

      summary.netIncome = summary.totalIncome - summary.totalExpenses

      return summary
    } catch (error) {
      console.error('Error getting transaction summary:', error)
      throw error
    }
  }

  async getTransactionsForPeriod(userId: string, startDate?: string, endDate?: string): Promise<Transaction[]> {
    try {
      const transactions = await this.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])

      if (!startDate && !endDate) {
        return transactions.map((transaction) => ({
          ...transaction,
          amount:
            typeof transaction.amount === 'number'
              ? transaction.amount
              : Number(String(transaction.amount).replace(/[\u20A6,]/g, '').trim()) || 0,
          category: transaction.category || 'uncategorized',
        }))
      }

      const start = startDate ? new Date(startDate) : null
      const end = endDate ? new Date(endDate) : null

      return transactions
        .map((transaction) => {
          const coercedAmount =
            typeof transaction.amount === 'number'
              ? transaction.amount
              : Number(String(transaction.amount).replace(/[\u20A6,]/g, '').trim()) || 0
          const dateString = transaction.date || transaction.createdAt
          const txnDate = dateString ? new Date(dateString) : null
          return {
            ...transaction,
            amount: coercedAmount,
            category: transaction.category || 'uncategorized',
            txnDate,
          }
        })
        .filter((transaction) => {
          if (!transaction.txnDate || Number.isNaN(transaction.txnDate.getTime())) {
            return false
          }

          if (start && transaction.txnDate < start) return false
          if (end && transaction.txnDate > end) return false
          return true
        })
        .map(({ txnDate, ...rest }) => rest)
    } catch (error) {
      console.error('Error getting transactions for period:', error)
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
