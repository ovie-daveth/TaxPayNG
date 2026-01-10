import { BaseService } from './base'
import { Transaction, TransactionFilters, ApiResponse, PaginatedResponse, Document } from '@/lib/types'
import { documentService } from './documentService'
import { userService } from './userService'
import { capitalAssetService } from './capitalAssetService'

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
      
      console.log("allTransactions from getUserTransactions:", allTransactions)
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

      // Scope to active business entity if provided
      if (filters?.entityId) {
        filtered = filtered.filter(t => t.entityId === filters.entityId)
      }
      
      if (filters?.type) {
        filtered = filtered.filter(t => t.type === filters.type)
      }
      if (filters?.category) {
        filtered = filtered.filter(t => t.category === filters.category)
      }
      if (filters?.paymentMethod) {
        filtered = filtered.filter(t => t.paymentMethod === filters.paymentMethod)
      }
      if (filters?.platform) {
        filtered = filtered.filter(t => t.platform?.name === filters.platform)
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
      
      // Apply search filter (searches across description, category, notes, tags, and amount)
      if (filters?.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase().trim()
        filtered = filtered.filter(t => {
          // Search in description
          if (t.description?.toLowerCase().includes(searchTerm)) return true
          
          // Search in category
          if (t.category?.toLowerCase().includes(searchTerm)) return true
          
          // Search in notes
          if (t.notes?.toLowerCase().includes(searchTerm)) return true
          
          // Search in tags
          if (t.tags && t.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm))) return true
          
          // Search in amount (if search term is numeric)
          const numericSearch = parseFloat(searchTerm.replace(/[\u20A6,]/g, ''))
          if (!isNaN(numericSearch)) {
            const amount = typeof t.amount === 'number' ? t.amount : Number(String(t.amount).replace(/[\u20A6,]/g, '').trim()) || 0
            if (amount === numericSearch || amount.toString().includes(searchTerm)) return true
          }
          
          return false
        })
      }
      
      // Sort by createdAt descending (newest first)
      // Helper function to extract timestamp from createdAt (handles Firestore Timestamps, ISO strings, and server timestamps)
      const getCreatedAtTime = (createdAt: any): number => {
        if (!createdAt) return 0
        
        // If it's already an ISO string, parse it
        if (typeof createdAt === 'string') {
          const parsed = new Date(createdAt).getTime()
          return isNaN(parsed) ? 0 : parsed
        }
        
        // Handle Firestore Timestamp object with toDate method
        if (createdAt && typeof createdAt === 'object' && typeof (createdAt as any).toDate === 'function') {
          return (createdAt as any).toDate().getTime()
        }
        
        // Handle Firestore Timestamp object with seconds property
        if (createdAt && typeof createdAt === 'object' && (createdAt as any).seconds !== undefined) {
          return (createdAt as any).seconds * 1000 + ((createdAt as any).nanoseconds || 0) / 1000000
        }
        
        // Handle server timestamp placeholder (_methodName: "serverTimestamp")
        if (createdAt && typeof createdAt === 'object' && (createdAt as any)._methodName === 'serverTimestamp') {
          // Use current time for server timestamps (they're the newest)
          return Date.now()
        }
        
        // Try to parse as date
        try {
          const parsed = new Date(createdAt).getTime()
          return isNaN(parsed) ? 0 : parsed
        } catch {
          return 0
        }
      }
      
      filtered.sort((a, b) => {
        const dateA = getCreatedAtTime(a.createdAt)
        const dateB = getCreatedAtTime(b.createdAt)
        // Descending order: newest first (dateB - dateA)
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
      // Check transaction limit
      const profile = await userService.getProfile(userId)
      if (profile) {
        const transactionLimit = userService.getTransactionLimit(profile.subscriptionType || null)
        
        // Reset count if new month
        await userService.resetTransactionCountIfNeeded(userId, profile)
        const currentProfile = await userService.getProfile(userId)
        
        if (currentProfile && transactionLimit !== Infinity) {
          const currentCount = currentProfile.transactionCount || 0
          if (currentCount >= transactionLimit) {
            return {
              success: false,
              error: `Transaction limit reached. You have used ${currentCount} of ${transactionLimit} transactions this month. Please upgrade your plan to add more transactions.`
            }
          }
          
          // Check if adding this transaction would exceed limit
          if (currentCount + 1 > transactionLimit) {
            return {
              success: false,
              error: `This transaction would exceed your monthly limit of ${transactionLimit} transactions. You have ${currentCount} transactions remaining.`
            }
          }
        }
      }

      const newTransaction = {
        ...transactionData,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const transactionId = await this.create(newTransaction)
      const createdTransaction = await this.getById(transactionId)

      // Increment transaction count
      await userService.incrementTransactionCount(userId)

      // Create capital asset if transaction is a capital asset
      if (createdTransaction.taxClassification?.isCapitalAsset && createdTransaction.type === 'expense') {
        await capitalAssetService.createOrUpdateAssetFromTransaction(createdTransaction)
      }

      // If transaction has attachments but no documentId, create corresponding documents
      // (documentId means document was already created in the dialog with proper storage tracking)
      if (transactionData.attachments && transactionData.attachments.length > 0 && !transactionData.documentId) {
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

      // Update capital asset if transaction is a capital asset
      if (updatedTransaction.taxClassification?.isCapitalAsset && updatedTransaction.type === 'expense') {
        await capitalAssetService.createOrUpdateAssetFromTransaction(updatedTransaction)
      } else {
        // If transaction is no longer a capital asset, delete the asset
        await capitalAssetService.deleteAssetByTransactionId(transactionId)
      }

      // If attachments were updated but documentId is provided, skip creating documents
      // (documentId means document was already created/updated in the dialog with proper storage tracking)
      if (updateData.attachments && updateData.attachments.length > 0 && !updateData.documentId) {
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

      // Delete all attachment files from ImageKit
      if (existingTransaction.attachmentFileIds && existingTransaction.attachmentFileIds.length > 0) {
        try {
          for (const fileId of existingTransaction.attachmentFileIds) {
            if (fileId) {
              try {
                const response = await fetch(`/api/delete-image?fileId=${encodeURIComponent(fileId)}`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                })
                if (!response.ok) {
                  console.warn(`Failed to delete ImageKit file ${fileId} for transaction ${transactionId}`)
                } else {
                  console.log(`Deleted ImageKit file ${fileId} for transaction ${transactionId}`)
                }
              } catch (deleteError) {
                console.error(`Error deleting ImageKit file ${fileId}:`, deleteError)
                // Continue with other files even if one fails
              }
            }
          }
        } catch (error) {
          console.error('Error deleting attachment files from ImageKit:', error)
          // Continue with transaction deletion even if file deletion fails
        }
      }

      // Delete capital asset if transaction is a capital asset
      await capitalAssetService.deleteAssetByTransactionId(transactionId)

      // Delete linked document if documentId exists
      if (existingTransaction.documentId) {
        try {
          const { documentService } = await import('./documentService')
          await documentService.deleteDocument(existingTransaction.documentId, userId)
          console.log(`Deleted document ${existingTransaction.documentId} associated with transaction ${transactionId}`)
        } catch (docError) {
          console.error('Error deleting linked document:', docError)
          // Continue with transaction deletion even if document deletion fails
        }
      }

      await this.delete(transactionId)

      // Decrement transaction count
      try {
        await userService.decrementTransactionCount(userId)
      } catch (countError) {
        console.error('Error decrementing transaction count:', countError)
        // Continue even if count decrement fails
      }

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
  async getTransactionSummary(userId: string, startDate?: string, endDate?: string, entityId?: string): Promise<{
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
          // For income stats, filter by createdAt (when transaction was recorded)
          // This ensures transactions are included in the period they were recorded,
          // regardless of their transaction date (which may be in the future)
          const recordDate = transaction.createdAt ? new Date(transaction.createdAt) : null

          // Preserve original transaction data for calculation (netAmount, transactionNature, taxClassification, etc.)
          return {
            ...transaction,
            category: transaction.category || 'uncategorized',
            recordDate,
          }
        })
        .filter((transaction) => {
          if (entityId && transaction.entityId !== entityId) {
            return false
          }
          if (!transaction.recordDate || Number.isNaN(transaction.recordDate.getTime())) {
            return false
          }

          if (!start && !end) return true
          
          // Normalize dates to start/end of day for comparison
          const recordDateOnly = new Date(transaction.recordDate)
          recordDateOnly.setHours(0, 0, 0, 0)
          
          if (start) {
            const startDateOnly = new Date(start)
            startDateOnly.setHours(0, 0, 0, 0)
            if (recordDateOnly < startDateOnly) return false
          }
          
          if (end) {
            const endDateOnly = new Date(end)
            endDateOnly.setHours(23, 59, 59, 999)
            if (transaction.recordDate > endDateOnly) return false
          }
          
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
          // Use same logic as tax calculation for consistency
          // Determine the base amount to use (netAmount if available for platform fees, otherwise amount)
          let baseAmount = 0
          if (transaction.currency && transaction.currency !== 'NGN' && transaction.ngnEquivalent !== undefined && transaction.ngnEquivalent !== null) {
            // For foreign currency transactions, use ngnEquivalent
            baseAmount = typeof transaction.ngnEquivalent === 'number' 
              ? transaction.ngnEquivalent 
              : Number(String(transaction.ngnEquivalent).replace(/[\u20A6,]/g, '').trim()) || 0
          } else {
            // For NGN transactions, use netAmount if available (after platform fees), otherwise use amount
            const rawAmount = transaction.netAmount !== undefined ? transaction.netAmount : transaction.amount
            baseAmount = typeof rawAmount === 'number'
              ? rawAmount
              : Number(String(rawAmount).replace(/[\u20A6,]/g, '').trim()) || 0
          }
          
          // Apply transaction nature percentage for mixed transactions (creators only)
          let taxableAmount = baseAmount
          if (transaction.transactionNature === 'mixed' && transaction.businessPercentage !== undefined) {
            taxableAmount = baseAmount * (transaction.businessPercentage / 100)
          } else if (transaction.transactionNature === 'personal') {
            // Personal transactions are not taxable income - exclude from gross income for tax purposes
            taxableAmount = 0
          }
          
          // For income transactions with VAT, exclude VAT amount from taxable income
          // VAT must be remitted to government, so it shouldn't be counted as income for tax purposes
          if (transaction.taxClassification?.vatApplicable && transaction.taxClassification?.vatRate) {
            const vatRate = transaction.taxClassification.vatRate / 100
            taxableAmount = taxableAmount * (1 - vatRate)
          }
          
          summary.totalIncome += taxableAmount
          
          // Category breakdown uses taxable amount
          const categoryKey = transaction.category || 'uncategorized'
          if (!summary.categories[categoryKey]) {
            summary.categories[categoryKey] = { income: 0, expenses: 0, count: 0 }
          }
          summary.categories[categoryKey].count++
          summary.categories[categoryKey].income += taxableAmount
        } else if (transaction.type === 'expense') {
          // For expenses, apply same logic as tax calculation
          let baseAmount = 0
          if (transaction.currency && transaction.currency !== 'NGN' && transaction.ngnEquivalent !== undefined && transaction.ngnEquivalent !== null) {
            // For foreign currency transactions, use ngnEquivalent
            baseAmount = typeof transaction.ngnEquivalent === 'number'
              ? transaction.ngnEquivalent
              : Number(String(transaction.ngnEquivalent).replace(/[\u20A6,]/g, '').trim()) || 0
          } else {
            // For NGN transactions, use netAmount if available (after platform fees), otherwise use amount
            const rawAmount = transaction.netAmount !== undefined ? transaction.netAmount : transaction.amount
            baseAmount = typeof rawAmount === 'number'
              ? rawAmount
              : Number(String(rawAmount).replace(/[\u20A6,]/g, '').trim()) || 0
          }
          
          // Apply transaction nature percentage for mixed transactions
          let deductibleAmount = baseAmount
          if (transaction.transactionNature === 'mixed' && transaction.businessPercentage !== undefined) {
            deductibleAmount = baseAmount * (transaction.businessPercentage / 100)
          } else if (transaction.transactionNature === 'personal') {
            // Personal transactions are not tax deductible - exclude from expenses for tax purposes
            deductibleAmount = 0
          }
          
          // Exclude capital assets from expenses (they're claimed as depreciation)
          const isCapitalAsset = transaction.taxClassification?.isCapitalAsset && transaction.taxClassification?.capitalAllowanceRate
          if (!isCapitalAsset) {
            summary.totalExpenses += deductibleAmount
          }
          
          // Category breakdown uses deductible amount (excluding capital assets)
          const categoryKey = transaction.category || 'uncategorized'
          if (!summary.categories[categoryKey]) {
            summary.categories[categoryKey] = { income: 0, expenses: 0, count: 0 }
          }
          summary.categories[categoryKey].count++
          if (!isCapitalAsset) {
            summary.categories[categoryKey].expenses += deductibleAmount
          }
        } else if (transaction.type === 'relief') {
          const reliefAmount = typeof transaction.amount === 'number'
            ? transaction.amount
            : Number(String(transaction.amount).replace(/[\u20A6,]/g, '').trim()) || 0
          summary.totalReliefs += reliefAmount
          return
        }
      })

      summary.netIncome = summary.totalIncome - summary.totalExpenses

      return summary
    } catch (error) {
      console.error('Error getting transaction summary:', error)
      throw error
    }
  }

  async getTransactionsForPeriod(userId: string, startDate?: string, endDate?: string, entityId?: string): Promise<Transaction[]> {
    try {
      const transactions = await this.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])

      if (!startDate && !endDate) {
        return transactions.map((transaction) => {
          // Use ngnEquivalent if available (for foreign currency transactions), otherwise use amount
          const baseAmount = transaction.ngnEquivalent !== undefined && transaction.ngnEquivalent !== null
            ? transaction.ngnEquivalent
            : transaction.amount
          
          return {
            ...transaction,
            amount:
              typeof baseAmount === 'number'
                ? baseAmount
                : Number(String(baseAmount).replace(/[\u20A6,]/g, '').trim()) || 0,
            category: transaction.category || 'uncategorized',
          }
        })
      }

      const start = startDate ? new Date(startDate) : null
      const end = endDate ? new Date(endDate) : null

      return transactions
        .map((transaction) => {
          // Use ngnEquivalent if available (for foreign currency transactions), otherwise use amount
          const baseAmount = transaction.ngnEquivalent !== undefined && transaction.ngnEquivalent !== null
            ? transaction.ngnEquivalent
            : transaction.amount
          
          const coercedAmount =
            typeof baseAmount === 'number'
              ? baseAmount
              : Number(String(baseAmount).replace(/[\u20A6,]/g, '').trim()) || 0
          
          // For period filtering, use createdAt (when transaction was recorded)
          // This ensures transactions are included in the period they were recorded,
          // regardless of their transaction date (which may be in the future)
          const recordDate = transaction.createdAt ? new Date(transaction.createdAt) : null
          
          return {
            ...transaction,
            amount: coercedAmount,
            category: transaction.category || 'uncategorized',
            recordDate,
          }
        })
        .filter((transaction) => {
          if (entityId && transaction.entityId !== entityId) return false
          if (!transaction.recordDate || Number.isNaN(transaction.recordDate.getTime())) {
            return false
          }

          if (start && transaction.recordDate < start) return false
          if (end && transaction.recordDate > end) return false
          return true
        })
        .map(({ recordDate, ...rest }) => rest)
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
  async getRecentTransactions(userId: string, limit: number = 10, entityId?: string): Promise<Transaction[]> {
    try {
      // Fetch all (user-scoped), then filter client-side to avoid composite indexes.
      const all = await this.getAll([{ field: 'userId', operator: '==', value: userId }])
      const filtered = entityId ? all.filter((t: any) => t.entityId === entityId) : all

      // Sort by createdAt (newest first). Fallback to date.
      const sorted = filtered.sort((a: any, b: any) => {
        const aTime = new Date(a.createdAt || a.date || 0).getTime()
        const bTime = new Date(b.createdAt || b.date || 0).getTime()
        return bTime - aTime
      })

      return sorted.slice(0, limit)
    } catch (error) {
      console.error('Error getting recent transactions:', error)
      throw error
    }
  }
}

// Export a singleton instance
export const transactionService = new TransactionService()
