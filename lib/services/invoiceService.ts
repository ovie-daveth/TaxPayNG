import { BaseService } from './base'
import { Invoice, InvoiceFilters, InvoiceItem, ApiResponse, PaginatedResponse, SavedClient, WHTCreditNote } from '@/lib/types'
import { calculateTaxPeriod } from '@/lib/utils/date'
import { fetchExchangeRate, CurrencyCode } from '@/lib/utils/currency'

export class InvoiceService extends BaseService {
  private sendingInvoices: Set<string> = new Set() // Track invoices being sent to prevent duplicates

  constructor() {
    super('invoices')
  }

  // Generate invoice number (format: INV-YYYY-NNN or BILL-YYYY-NNN)
  private async generateInvoiceNumber(userId: string, invoiceType: 'outgoing' | 'incoming' = 'outgoing'): Promise<string> {
    try {
      const year = new Date().getFullYear()
      const prefix = invoiceType === 'incoming' ? `BILL-${year}-` : `INV-${year}-`
      
      // Get all invoices for this user this year
      const invoices = await this.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])
      
      // Filter invoices from this year with matching type
      const yearInvoices = invoices.filter(inv => {
        const invDate = inv.issueDate ? new Date(inv.issueDate) : new Date(inv.createdAt)
        const invType = inv.invoiceType || 'outgoing'
        return invDate.getFullYear() === year && 
               inv.invoiceNumber?.startsWith(prefix) &&
               invType === invoiceType
      })
      
      // Find the highest number
      let maxNumber = 0
      yearInvoices.forEach(inv => {
        const match = inv.invoiceNumber?.match(/\d+$/)
        if (match) {
          const num = parseInt(match[0], 10)
          if (num > maxNumber) maxNumber = num
        }
      })
      
      const nextNumber = (maxNumber + 1).toString().padStart(3, '0')
      return `${prefix}${nextNumber}`
    } catch (error) {
      console.error('Error generating invoice number:', error)
      // Fallback to timestamp-based number
      const year = new Date().getFullYear()
      const timestamp = Date.now().toString().slice(-6)
      const prefix = invoiceType === 'incoming' ? 'BILL' : 'INV'
      return `${prefix}-${year}-${timestamp}`
    }
  }

  // Calculate invoice totals with VAT and WHT support
  // VAT is only applied to items marked as vatable
  private calculateTotals(
    items: InvoiceItem[], 
    discount?: number,
    vatRate?: number
  ): {
    subtotal: number
    vatAmount: number
    taxAmount: number // Legacy field, equals vatAmount
    invoiceTotal: number
    total: number
  } {
    let subtotal = 0
    let vatableSubtotal = 0 // Subtotal of vatable items only
    
    // Calculate subtotal and vatable subtotal
    items.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice
      subtotal += itemSubtotal
      
      // Only include in vatable subtotal if item is marked as vatable
      if (item.vatable) {
        vatableSubtotal += itemSubtotal
      }
    })
    
    // Apply discount to subtotal (if any)
    const discountAmount = discount ? subtotal * (discount / 100) : 0
    const subtotalAfterDiscount = subtotal - discountAmount
    
    // Apply discount proportionally to vatable subtotal
    const vatableDiscountAmount = vatableSubtotal > 0 && subtotal > 0 
      ? (vatableSubtotal / subtotal) * discountAmount 
      : 0
    const vatableSubtotalAfterDiscount = vatableSubtotal - vatableDiscountAmount
    
    // Calculate VAT (7.5% default in Nigeria) only on vatable items after discount
    const effectiveVatRate = vatRate !== undefined ? vatRate : 7.5
    const vatAmount = vatableSubtotalAfterDiscount * (effectiveVatRate / 100)
    
    // Invoice Total = Subtotal (after discount) + VAT (on vatable items only)
    const invoiceTotal = subtotalAfterDiscount + vatAmount
    
    // Note: WHT is deducted by the client/buyer, not calculated here
    // Final Total = Invoice Total (WHT will be deducted by client if applicable)
    const total = invoiceTotal
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      taxAmount: Math.round(vatAmount * 100) / 100, // Legacy field
      invoiceTotal: Math.round(invoiceTotal * 100) / 100,
      total: Math.round(total * 100) / 100
    }
  }

  // Get all invoices for a user
  // Returns invoices where user is the sender (userId) OR recipient (recipientUserId)
  async getUserInvoices(
    userId: string,
    filters?: InvoiceFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Invoice>> {
    try {
      // Fetch invoices where user is sender OR recipient
      const [sentInvoices, receivedInvoices] = await Promise.all([
        this.getAll([{ field: 'userId', operator: '==', value: userId }]),
        this.getAll([{ field: 'recipientUserId', operator: '==', value: userId }])
      ])
      
      // Combine and deduplicate by invoice ID
      const invoiceMap = new Map<string, Invoice>()
      sentInvoices.forEach(inv => {
        if (inv.id) invoiceMap.set(inv.id, inv)
      })
      receivedInvoices.forEach(inv => {
        if (inv.id) invoiceMap.set(inv.id, inv)
      })
      
      const allInvoices = Array.from(invoiceMap.values())

      // Apply all filters client-side
      let filtered = allInvoices

      if (filters?.entityId) {
        // Filter by entityId:
        // - For sent invoices: use entityId (sender's entity)
        // - For received invoices: use recipientEntityId (recipient's assigned entity)
        filtered = filtered.filter(inv => {
          const isReceivedInvoice = inv.recipientUserId === userId
          if (isReceivedInvoice) {
            // For received invoices, filter by recipientEntityId if set, otherwise include all
            return !inv.recipientEntityId || inv.recipientEntityId === filters.entityId
          }
          // For sent invoices, filter by entityId
          return inv.entityId === filters.entityId
        })
      }

      if (filters?.status) {
        filtered = filtered.filter(inv => inv.status === filters.status)
      }
      if (filters?.invoiceType) {
        // Determine invoiceType from user's perspective:
        // - If user is the sender (userId === invoice.userId), it's 'outgoing'
        // - If user is the recipient (recipientUserId === userId), it's 'incoming'
        filtered = filtered.filter(inv => {
          const userInvoiceType = inv.userId === userId ? 'outgoing' : 
                                  inv.recipientUserId === userId ? 'incoming' : 
                                  (inv.invoiceType || 'outgoing')
          return userInvoiceType === filters.invoiceType
        })
      }
      if (filters?.clientId) {
        filtered = filtered.filter(inv => inv.client.id === filters.clientId)
      }
      if (filters?.startDate || filters?.endDate) {
        const start = filters.startDate ? new Date(filters.startDate) : null
        const end = filters.endDate ? new Date(filters.endDate) : null
        if (start) start.setHours(0, 0, 0, 0)
        if (end) end.setHours(23, 59, 59, 999)
        filtered = filtered.filter(inv => {
          const invDate = inv.issueDate ? new Date(inv.issueDate) : new Date(inv.createdAt)
          if (start && invDate < start) return false
          if (end && invDate > end) return false
          return true
        })
      }
      if (filters?.dateRange) {
        const start = filters.dateRange.start ? new Date(filters.dateRange.start) : null
        const end = filters.dateRange.end ? new Date(filters.dateRange.end) : null
        if (start) start.setHours(0, 0, 0, 0)
        if (end) end.setHours(23, 59, 59, 999)
        filtered = filtered.filter(inv => {
          const invDate = inv.issueDate ? new Date(inv.issueDate) : new Date(inv.createdAt)
          if (start && invDate < start) return false
          if (end && invDate > end) return false
          return true
        })
      }
      if (filters?.amountRange) {
        filtered = filtered.filter(inv => {
          if (filters.amountRange!.min !== undefined && inv.total < filters.amountRange!.min) return false
          if (filters.amountRange!.max !== undefined && inv.total > filters.amountRange!.max) return false
          return true
        })
      }
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase()
        filtered = filtered.filter(inv =>
          inv.invoiceNumber.toLowerCase().includes(searchTerm) ||
          inv.client.name.toLowerCase().includes(searchTerm) ||
          (inv.client.email && inv.client.email.toLowerCase().includes(searchTerm))
        )
      }

      // Sort by issue date descending (newest first)
      filtered.sort((a, b) => {
        const dateA = a.issueDate ? new Date(a.issueDate).getTime() : new Date(a.createdAt).getTime()
        const dateB = b.issueDate ? new Date(b.issueDate).getTime() : new Date(b.createdAt).getTime()
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
      console.error('Error getting user invoices:', error)
      throw error
    }
  }

  // Create a new invoice
  async createInvoice(userId: string, invoiceData: Omit<Invoice, 'id' | 'userId' | 'invoiceNumber' | 'subtotal' | 'taxAmount' | 'total' | 'createdAt' | 'updatedAt'>) {
    try {
      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(userId, invoiceData.invoiceType || 'outgoing')
      
      console.log('Invoice number:', invoiceNumber)
      console.log('Invoice data:', invoiceData)
      // Calculate totals
     // const totals = this.calculateTotals(invoiceData.items, invoiceData.discount)
      
      // Calculate tax period from issue date
      const taxPeriod = invoiceData.issueDate ? calculateTaxPeriod(invoiceData.issueDate) : undefined
      
      // Lock exchange rate for foreign currency invoices
      let exchangeRate: number | undefined
      let exchangeRateDate: string | undefined
      let ngnEquivalent: number | undefined
      
      if (invoiceData.currency && invoiceData.currency !== 'NGN' && invoiceData.invoiceTotal) {
        try {
          const rate = await fetchExchangeRate(invoiceData.currency as CurrencyCode, 'NGN')
          if (rate) {
            exchangeRate = rate
            exchangeRateDate = invoiceData.issueDate || new Date().toISOString()
            ngnEquivalent = invoiceData.invoiceTotal * rate
          }
        } catch (error) {
          console.error('Error fetching exchange rate for invoice:', error)
          // Continue without exchange rate - user can update later
        }
      }
      
      // Check if invoice is overdue
      let status = invoiceData.status || 'draft'
      if (status === 'sent') {
        const dueDate = new Date(invoiceData.dueDate)
        const today = new Date()
        if (dueDate < today) {
          status = 'overdue'
        }
      }

      const newInvoice = {
        ...invoiceData,
        userId,
        invoiceNumber,
        status,
        taxPeriod,
        exchangeRate,
        exchangeRateDate,
        ngnEquivalent,
        // Set default payment statuses
        clientPaymentStatus: 'pending' as const,
        supplierPaymentStatus: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const invoiceId = await this.create(newInvoice)
      const createdInvoice = await this.getById(invoiceId)

      return {
        success: true,
        data: createdInvoice,
        message: 'Invoice created successfully'
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Update an existing invoice
  async updateInvoice(invoiceId: string, userId: string, updateData: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
    try {
      // Verify ownership
      const existingInvoice = await this.getById(invoiceId)
      
      // Authorization: user must be sender OR recipient
      const isSender = existingInvoice.userId === userId
      const isRecipient = existingInvoice.recipientUserId === userId
      
      if (!isSender && !isRecipient) {
        return {
          success: false,
          error: 'Unauthorized: You can only update invoices you sent or received'
        }
      }
      
      // Recipients can update recipientEntityId and payment-related fields
      if (isRecipient && !isSender) {
        const allowedFields = [
          'recipientEntityId',
          // Payment-related fields that recipients can update when marking payment
          'clientPaymentStatus',
          'clientPaidAt',
          'clientPaymentMethod',
          'clientPaymentReference',
          'clientReceiptUrl',
          'taxDeductible', // Allow recipients to mark if payment is tax deductible
          'linkedTransactionId' // Allow linking transaction when payment is marked
        ]
        const updateKeys = Object.keys(updateData)
        const disallowedFields = updateKeys.filter(key => !allowedFields.includes(key))
        if (disallowedFields.length > 0) {
          return {
            success: false,
            error: `Recipients can only update: ${allowedFields.join(', ')}`
          }
        }
      }

      // Check if invoice should be marked as overdue
      if (updateData.status === 'sent' || (existingInvoice.status === 'sent' && !updateData.status)) {
        const dueDate = updateData.dueDate ? new Date(updateData.dueDate) : new Date(existingInvoice.dueDate)
        const today = new Date()
        if (dueDate < today && existingInvoice.status !== 'paid') {
          updateData.status = 'overdue'
        }
      }

      // Remove undefined values from updateData before sending to Firestore
      const cleanedUpdateData: any = {}
      for (const key in updateData) {
        const value = updateData[key as keyof Invoice]
        if (value !== undefined) {
          cleanedUpdateData[key] = value
        }
      }

      await this.update(invoiceId, {
        ...cleanedUpdateData,
        updatedAt: new Date().toISOString()
      })

      const updatedInvoice = await this.getById(invoiceId)
      return {
        success: true,
        data: updatedInvoice,
        message: 'Invoice updated successfully'
      }
    } catch (error) {
      console.error('Error updating invoice:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Delete an invoice
  async deleteInvoice(invoiceId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      // Verify ownership
      const existingInvoice = await this.getById(invoiceId)
      if (existingInvoice.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only delete your own invoices'
        }
      }

      await this.delete(invoiceId)

      return {
        success: true,
        message: 'Invoice deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting invoice:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Mark invoice as sent
  async markAsSent(invoiceId: string, userId: string): Promise<ApiResponse<Invoice>> {
    try {
      const invoice = await this.getById(invoiceId)
      if (invoice.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized'
        }
      }

      return await this.updateInvoice(invoiceId, userId, {
        status: 'sent',
        sentAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error marking invoice as sent:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Mark invoice as paid and create corresponding transaction
  // async markAsPaid(
  //   invoiceId: string, 
  //   userId: string, 
  //   paymentMethod?: string, 
  //   paymentReference?: string,
  //   receiptUrl?: string
  // ): Promise<ApiResponse<Invoice>> {
  //   try {
  //     const invoice = await this.getById(invoiceId)
  //     if (!invoice) {
  //       return {
  //         success: false,
  //         error: 'Invoice not found'
  //       }
  //     }
      
  //     // Authorization logic:
  //     // - For incoming invoices: The recipient (who received the bill) can mark it as paid
  //     //   When incoming invoice is created, userId is set to recipient.userId, so recipient owns it
  //     // - For outgoing invoices: The sender (who created the invoice) can confirm payment received
  //     //   For outgoing invoices, userId is the sender, so sender owns it
      
  //     // Check if user is the owner of the invoice
  //     // For incoming: userId = recipient.userId (recipient owns it)
  //     // For outgoing: userId = sender.userId (sender owns it)
  //     // Authorization: 
  //     // - For incoming invoices: userId is set to recipient.userId when invoice is created
  //     //   So invoice.userId should match the recipient's userId
  //     // - For outgoing invoices: userId is the sender, so sender owns it
  //     // Also check recipientUserId as fallback for incoming invoices
  //     const isOwner = invoice.userId === userId
  //     console.log("User ID:", userId)
  //     console.log("Invoice Recipient User ID:", invoice.recipientUserId)
  //     const isRecipient = invoice.invoiceType === 'incoming' && (invoice.recipientUserId === userId || invoice.client.id === userId)
      
  //     if (!isOwner && !isRecipient) {
  //       console.error('Authorization failed in markAsPaid:', {
  //         invoiceId: invoice.id,
  //         invoiceUserId: invoice.userId,
  //         requestUserId: userId,
  //         invoiceType: invoice.invoiceType,
  //         recipientUserId: invoice.recipientUserId,
  //         isOwner,
  //         isRecipient
  //       })
  //       return {
  //         success: false,
  //         error: 'Unauthorized: You can only mark your own invoices as paid'
  //       }
  //     }

  //     // Check if invoice is already paid and has a linked transaction
  //     if (invoice.status === 'paid' && invoice.linkedTransactionId) {
  //       // Just update payment details if needed
  //       return await this.updateInvoice(invoiceId, userId, {
  //         paidAt: invoice.paidAt || new Date().toISOString(),
  //         paymentMethod: paymentMethod || invoice.paymentMethod,
  //         paymentReference: paymentReference || invoice.paymentReference,
  //         receiptUrl: receiptUrl || invoice.receiptUrl
  //       })
  //     }

  //     // Update invoice to paid status
  //     const updateData: Partial<Invoice> = {
  //       status: 'paid',
  //       paidAt: new Date().toISOString(),
  //       paymentMethod,
  //       paymentReference,
  //       receiptUrl
  //     }

  //     // Create corresponding transaction
  //     try {
  //       const { transactionService } = await import('./transactionService')
        
  //       // Determine transaction type based on invoice type
  //       // Outgoing invoice (you sent) = income (money coming in)
  //       // Incoming invoice (you received) = expense (money going out)
  //       const transactionType: 'income' | 'expense' = invoice.invoiceType === 'outgoing' ? 'income' : 'expense'
        
  //       // Create transaction description from invoice
  //       const description = `${invoice.invoiceType === 'outgoing' ? 'Invoice payment received' : 'Bill payment made'}: ${invoice.invoiceNumber}`
        
  //       // Create transaction
  //       const transactionData = {
  //         type: transactionType,
  //         category: invoice.invoiceType === 'outgoing' ? 'sales' : 'purchases',
  //         amount: invoice.total,
  //         description,
  //         date: new Date().toISOString().split('T')[0], // Use today's date
  //         paymentMethod: paymentMethod || 'other',
  //         taxDeductible: invoice.invoiceType === 'incoming', // Incoming invoices (bills) are tax deductible
  //         notes: `Invoice: ${invoice.invoiceNumber}\nClient: ${invoice.client.name}\nItems: ${invoice.items.map((item: InvoiceItem) => item.description).join(', ')}`,
  //         receiptUrl: receiptUrl,
  //         attachments: receiptUrl ? [receiptUrl] : undefined
  //       }

  //       const transactionResult = await transactionService.createTransaction(userId, transactionData)
        
  //       if (transactionResult.success && transactionResult.data) {
  //         updateData.linkedTransactionId = transactionResult.data.id
  //       } else {
  //         console.error('Failed to create transaction for invoice:', transactionResult.error)
  //         // Continue with invoice update even if transaction creation fails
  //       }
  //     } catch (error) {
  //       console.error('Error creating transaction for invoice:', error)
  //       // Continue with invoice update even if transaction creation fails
  //     }

  //     const result = await this.updateInvoice(invoiceId, userId, updateData)
  //     return result
  //   } catch (error) {
  //     console.error('Error marking invoice as paid:', error)
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : 'Unknown error occurred'
  //     }
  //   }
  // }

  // Mark invoice as paid (for recipients/clients)
  // Client updates paymentStatus to 'paid' and uploads receipt
  async markAsPaid(
    invoiceId: string,
    userId: string,
    paymentMethod?: string,
    paymentReference?: string,
    receiptUrl?: string,
    taxDeductible?: boolean
  ): Promise<ApiResponse<Invoice>> {
    try {
      const invoice = await this.getById(invoiceId)
      if (!invoice) {
        return {
          success: false,
          error: 'Invoice not found'
        }
      }
      
      // Verify user is the recipient (client) or the client themselves
      const isRecipient = invoice.recipientUserId === userId
      const isClient = invoice.client?.id === userId
      
      if (!isRecipient && !isClient) {
        return {
          success: false,
          error: 'Unauthorized: Only the client can mark this invoice as paid'
        }
      }
      
      // Check if already paid
      if (invoice.clientPaymentStatus === 'paid' && invoice.linkedTransactionId) {
        // Just update payment details if needed
        const updateData: Partial<Invoice> = {
          clientPaidAt: invoice.clientPaidAt || new Date().toISOString()
        }
        
        if (paymentMethod || invoice.clientPaymentMethod) {
          updateData.clientPaymentMethod = paymentMethod || invoice.clientPaymentMethod
        }
        if (paymentReference || invoice.clientPaymentReference) {
          updateData.clientPaymentReference = paymentReference || invoice.clientPaymentReference
        }
        if (receiptUrl || invoice.clientReceiptUrl) {
          updateData.clientReceiptUrl = receiptUrl || invoice.clientReceiptUrl
        }
        
        return await this.updateInvoice(invoiceId, userId, updateData)
      }

      // Update invoice payment status (client marks as paid)
      const updateData: Partial<Invoice> = {
        clientPaymentStatus: 'paid',
        clientPaidAt: new Date().toISOString()
      }
      
      if (paymentMethod) {
        updateData.clientPaymentMethod = paymentMethod
      }
      if (paymentReference) {
        updateData.clientPaymentReference = paymentReference
      }
      if (receiptUrl) {
        updateData.clientReceiptUrl = receiptUrl
      }

      // Create corresponding expense transaction (incoming invoice = bill payment = expense)
      try {
        const { transactionService } = await import('./transactionService')
        
        const description = `Bill payment made: ${invoice.invoiceNumber}`
        
        const transactionData: any = {
          // Only include entityId if invoice has one (for platinum users with business entities)
          ...(invoice.entityId && { entityId: invoice.entityId }),
          type: 'expense' as const,
          category: 'purchases',
          amount: invoice.total,
          description,
          date: new Date().toISOString().split('T')[0],
          transactionDate: invoice.issueDate, // Use invoice issue date as transaction date
          valueDate: new Date().toISOString().split('T')[0], // Payment date
          paymentMethod: paymentMethod || invoice.paymentMethod || 'other',
          taxDeductible: taxDeductible !== undefined ? taxDeductible : true, // Default to true if not specified
          notes: `Invoice: ${invoice.invoiceNumber}\nSupplier: ${invoice.supplier?.name || 'Unknown'}${invoice.items && invoice.items.length > 0 ? `\nItems: ${invoice.items.map((item: InvoiceItem) => item.description).join(', ')}` : ''}`,
          // Bidirectional invoice linking
          linkedInvoiceId: invoiceId,
          isFromInvoice: true,
          invoiceStatus: 'completed', // Payment completed when marked as paid
          // Include new invoice fields in transaction
          platform: invoice.platform,
          transactionNature: invoice.transactionNature,
          businessPercentage: invoice.businessPercentage,
          taxPeriod: invoice.taxPeriod,
          currency: invoice.currency,
          exchangeRate: invoice.exchangeRate,
          exchangeRateDate: invoice.exchangeRateDate,
          ngnEquivalent: invoice.ngnEquivalent,
          tags: invoice.tags,
          attachments: invoice.attachments,
          attachmentFileIds: invoice.attachmentFileIds
        }
        
        // Only include receiptUrl and attachments if they have values
        if (receiptUrl) {
          transactionData.receiptUrl = receiptUrl
          transactionData.attachments = [...(transactionData.attachments || []), receiptUrl]
        }
        
        // For creator income invoices (outgoing), include platform fees breakdown
        // Calculate totals from item-level platform fees
        if (invoice.invoiceType === 'outgoing' && invoice.platform) {
          transactionData.type = 'income' as const
          transactionData.category = invoice.items[0]?.description || 'sales'
          
          // Sum up item-level platform fees
          const totalGross = invoice.items.reduce((sum: number, item: InvoiceItem) => sum + (item.grossAmount || item.amount || 0), 0)
          const totalFees = invoice.items.reduce((sum: number, item: InvoiceItem) => sum + (item.platformFees || 0), 0)
          const totalNet = totalGross - totalFees
          
          transactionData.grossAmount = totalGross || invoice.total
          transactionData.platformFees = totalFees
          transactionData.netAmount = totalNet || invoice.total
          // Use net amount as the transaction amount for income
          transactionData.amount = transactionData.netAmount
        }

        const transactionResult = await transactionService.createTransaction(userId, transactionData)
        
        if (transactionResult.success && transactionResult.data) {
          updateData.linkedTransactionId = transactionResult.data.id
        } else {
          console.error('Failed to create transaction for invoice:', transactionResult.error)
        }
      } catch (error) {
        console.error('Error creating transaction for invoice:', error)
      }

      const result = await this.updateInvoice(invoiceId, userId, updateData)
      return result
    } catch (error) {
      console.error('Error marking invoice as paid:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Confirm payment received (for outgoing invoices only - sender confirms payment was received)
  async confirmPaymentReceived(
    invoiceId: string,
    userId: string,
    paymentMethod?: string,
    paymentReference?: string
  ): Promise<ApiResponse<Invoice>> {
    try {
      const invoice = await this.getById(invoiceId)
      if (!invoice) {
        return {
          success: false,
          error: 'Invoice not found'
        }
      }
      
      // Only allow confirming payment for outgoing invoices
      if (invoice.invoiceType !== 'outgoing') {
        return {
          success: false,
          error: 'This function is only for outgoing invoices. Use markAsPaid for incoming invoices.'
        }
      }
      
      // Authorization: For outgoing invoices, userId is set to sender.userId when created
      // So invoice.userId should match the sender's userId
      if (invoice.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only confirm payment for your own outgoing invoices'
        }
      }

      // Check if already confirmed
      if (invoice.supplierPaymentStatus === 'paid' && invoice.linkedTransactionId) {
        // Just update confirmation details if needed
        const updateData: Partial<Invoice> = {
          supplierPaidAt: invoice.supplierPaidAt || new Date().toISOString()
        }
        
        if (paymentMethod || invoice.supplierPaymentMethod) {
          updateData.supplierPaymentMethod = paymentMethod || invoice.supplierPaymentMethod
        }
        if (paymentReference || invoice.supplierPaymentReference) {
          updateData.supplierPaymentReference = paymentReference || invoice.supplierPaymentReference
        }
        
        return await this.updateInvoice(invoiceId, userId, updateData)
      }

      // Only create transaction if client has marked as paid
      if (invoice.clientPaymentStatus !== 'paid') {
        return {
          success: false,
          error: 'Client must mark the invoice as paid first before you can confirm payment received'
        }
      }

      // Update invoice - supplier confirms payment received
      const updateData: Partial<Invoice> = {
        supplierPaymentStatus: 'paid',
        supplierPaidAt: new Date().toISOString()
      }
      
      if (paymentMethod) {
        updateData.supplierPaymentMethod = paymentMethod
      }
      if (paymentReference) {
        updateData.supplierPaymentReference = paymentReference
      }

      // Create corresponding income transaction (issuer confirms payment = income)
      try {
        const { transactionService } = await import('./transactionService')
        
        const description = `Invoice payment received: ${invoice.invoiceNumber}`
        
        // Use client's receipt URL if available
        const clientReceiptUrl = invoice.clientReceiptUrl
        
        const transactionData: any = {
          // Only include entityId if invoice has one (for platinum users with business entities)
          ...(invoice.entityId && { entityId: invoice.entityId }),
          type: 'income' as const,
          category: invoice.items[0]?.description || 'sales',
          amount: invoice.netAmount || invoice.total, // Use net amount if platform fees exist
          description,
          date: new Date().toISOString().split('T')[0],
          transactionDate: invoice.issueDate, // Use invoice issue date as transaction date
          valueDate: new Date().toISOString().split('T')[0], // Payment date
          paymentMethod: paymentMethod || invoice.paymentMethod || 'other',
          taxDeductible: false, // Sales invoices are not tax deductible
          notes: `Invoice: ${invoice.invoiceNumber}\nClient: ${invoice.client.name}${invoice.items && invoice.items.length > 0 ? `\nItems: ${invoice.items.map((item: InvoiceItem) => item.description).join(', ')}` : ''}`,
          // Bidirectional invoice linking
          linkedInvoiceId: invoiceId,
          isFromInvoice: true,
          invoiceStatus: 'completed', // Payment confirmed when supplier confirms receipt
          // Include new invoice fields in transaction
          platform: invoice.platform,
          transactionNature: invoice.transactionNature,
          businessPercentage: invoice.businessPercentage,
          taxPeriod: invoice.taxPeriod,
          currency: invoice.currency,
          exchangeRate: invoice.exchangeRate,
          exchangeRateDate: invoice.exchangeRateDate,
          ngnEquivalent: invoice.ngnEquivalent,
          tags: invoice.tags,
          attachments: invoice.attachments,
          attachmentFileIds: invoice.attachmentFileIds,
          // Platform fees breakdown for creator income (from item-level fees)
          grossAmount: invoice.items.reduce((sum: number, item: InvoiceItem) => sum + (item.grossAmount || item.amount || 0), 0) || invoice.total,
          platformFees: invoice.items.reduce((sum: number, item: InvoiceItem) => sum + (item.platformFees || 0), 0),
          netAmount: invoice.items.reduce((sum: number, item: InvoiceItem) => sum + (item.netAmount || item.amount || 0), 0) || invoice.total
        }
        
        // Only include receiptUrl and attachments if they have values
        if (clientReceiptUrl) {
          transactionData.receiptUrl = clientReceiptUrl
          transactionData.attachments = [...(transactionData.attachments || []), clientReceiptUrl]
        }

        const transactionResult = await transactionService.createTransaction(userId, transactionData)
        
        if (transactionResult.success && transactionResult.data) {
          updateData.linkedTransactionId = transactionResult.data.id
        } else {
          console.error('Failed to create transaction for invoice:', transactionResult.error)
        }
      } catch (error) {
        console.error('Error creating transaction for invoice:', error)
      }

      const result = await this.updateInvoice(invoiceId, userId, updateData)
      return result
    } catch (error) {
      console.error('Error confirming payment received:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Get invoice statistics
  async getInvoiceStats(userId: string, startDate?: string, endDate?: string): Promise<{
    total: number
    totalAmount: number
    paid: number
    paidAmount: number
    pending: number
    pendingAmount: number
    overdue: number
    overdueAmount: number
  }> {
    try {
      const invoices = await this.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])

      let filtered = invoices
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null
        const end = endDate ? new Date(endDate) : null
        if (start) start.setHours(0, 0, 0, 0)
        if (end) end.setHours(23, 59, 59, 999)
        filtered = invoices.filter(inv => {
          const invDate = inv.issueDate ? new Date(inv.issueDate) : new Date(inv.createdAt)
          if (start && invDate < start) return false
          if (end && invDate > end) return false
          return true
        })
      }

      const stats = {
        total: filtered.length,
        totalAmount: 0,
        paid: 0,
        paidAmount: 0,
        pending: 0,
        pendingAmount: 0,
        overdue: 0,
        overdueAmount: 0
      }

      filtered.forEach(inv => {
        stats.totalAmount += inv.total
        // Check payment status: paid if both paymentStatus is 'paid' and isConfirmed is true
        const isFullyPaid = inv.paymentStatus === 'paid' && inv.isConfirmed === true
        if (isFullyPaid) {
          stats.paid++
          stats.paidAmount += inv.total
        } else if (inv.status === 'sent' || inv.status === 'draft') {
          stats.pending++
          stats.pendingAmount += inv.total
        } else if (inv.status === 'overdue') {
          stats.overdue++
          stats.overdueAmount += inv.total
        }
      })

      return stats
    } catch (error) {
      console.error('Error getting invoice stats:', error)
      throw error
    }
  }

  async sendInvoiceToUser(
    invoiceId: string,
    senderUserId: string,
    recipientEmail: string
  ): Promise<ApiResponse<Invoice>> {
    // Create a unique key for this send operation
    const sendKey = `${invoiceId}-${recipientEmail.toLowerCase()}`
    
    // Check if this invoice is already being sent to this recipient
    if (this.sendingInvoices.has(sendKey)) {
      return {
        success: false,
        error: 'Invoice is already being sent to this user. Please wait...'
      }
    }

    try {
      // Mark as sending
      this.sendingInvoices.add(sendKey)

      // Get the invoice first
      const invoice = await this.getById(invoiceId)
      if (!invoice || invoice.userId !== senderUserId) {
        this.sendingInvoices.delete(sendKey)
        return {
          success: false,
          error: 'Invoice not found or unauthorized'
        }
      }

      // Check if this invoice was already sent
      if (invoice.recipientUserId && invoice.recipientEmail) {
        // Invoice was already sent, check if it's to the same recipient
        if (invoice.recipientEmail.toLowerCase() === recipientEmail.toLowerCase()) {
          this.sendingInvoices.delete(sendKey)
          return {
            success: false,
            error: 'This invoice has already been sent to this user'
          }
        }
      }

      // Find recipient user by email
      const { userService } = await import('./userService')
      const recipient = await userService.findUserByEmail(recipientEmail)
      
      if (!recipient) {
        return {
          success: false,
          error: 'User not found. Please make sure the recipient is registered on OTax.'
        }
      }

      // Check if invoice was already sent to this recipient (single invoice approach)
      if (invoice.recipientUserId === recipient.userId) {
        this.sendingInvoices.delete(sendKey)
        return {
          success: false,
          error: 'This invoice has already been sent to this user'
        }
      }

      // Create notification for recipient via API route (to avoid client-side firebase-admin import)
      try {
        // Get sender info
        const { userService } = await import('./userService')
        const sender = await userService.getProfile(senderUserId)
        const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Someone'
        
        // Call API route to create notification (server-side only)
        const response = await fetch('/api/notifications/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: recipient.userId,
            type: 'invoice',
            title: `New invoice from ${senderName}`,
            message: `You have received invoice ${invoice.invoiceNumber} for ₦${invoice.invoiceTotal.toLocaleString()}`,
            link: `/dashboard/invoices?invoiceId=${invoiceId}`,
            metadata: {
              invoiceId,
              invoiceNumber: invoice.invoiceNumber,
              senderId: senderUserId,
              senderName,
              amount: invoice.invoiceTotal
            }
          })
        })
        
        if (!response.ok) {
          console.error('Failed to create invoice notification')
        }
      } catch (error) {
        console.error('Error creating invoice notification:', error)
        // Don't fail invoice send if notification creation fails
      }

      // Update invoice to add recipient information (single invoice approach)
      // No copy is created - both sender and recipient reference the same invoice
      const updateData: Partial<Invoice> = {
        recipientUserId: recipient.userId,
        recipientEmail: recipientEmail,
        sentAt: new Date().toISOString(),
        status: 'sent' as const,
        updatedAt: new Date().toISOString()
      }
      
      // Update the invoice
      await this.update(invoiceId, updateData)
      
      // Get updated invoice
      const updatedInvoice = await this.getById(invoiceId)
      
      this.sendingInvoices.delete(sendKey)
      
      return {
        success: true,
        data: updatedInvoice!,
        message: `Invoice sent successfully to ${recipientEmail}`
      }
    } catch (error) {
      console.error('Error sending invoice to user:', error)
      // Remove from sending set on error
      this.sendingInvoices.delete(sendKey)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Deduct Withholding Tax (WHT) - called by client/buyer
  async deductWHT(
    invoiceId: string,
    userId: string,
    whtRate: number,
    certificateNumber?: string,
    notes?: string
  ): Promise<ApiResponse<{ invoice: Invoice; creditNote: WHTCreditNote }>> {
    try {
      const invoice = await this.getById(invoiceId)
      if (!invoice) {
        return {
          success: false,
          error: 'Invoice not found'
        }
      }

      // Verify user is the client/buyer (not the issuer)
      const isRecipient = invoice.recipientUserId === userId
      const isClient = invoice.client?.id === userId
      const isIssuer = invoice.userId === userId

      if (isIssuer) {
        return {
          success: false,
          error: 'Only the client/buyer can deduct WHT, not the invoice issuer'
        }
      }

      if (!isClient && !isRecipient) {
        return {
          success: false,
          error: 'Only the client/buyer can deduct WHT. You must be the recipient of this invoice.'
        }
      }

      // Check if WHT already deducted
      if (invoice.whtDeducted) {
        return {
          success: false,
          error: 'WHT has already been deducted for this invoice'
        }
      }

      // Calculate WHT amount
      const invoiceTotal = invoice.invoiceTotal || (invoice.subtotal + invoice.vatAmount)
      const whtAmount = invoiceTotal * (whtRate / 100)
      const netAmountPaid = invoiceTotal - whtAmount

      // Generate credit note number
      const year = new Date().getFullYear()
      const creditNoteNumber = `CN-${year}-${Date.now().toString().slice(-6)}`

      // Create credit note (only include optional fields if they have values)
      const creditNote: WHTCreditNote = {
        id: crypto.randomUUID(),
        invoiceId: invoiceId,
        creditNoteNumber,
        issuedDate: new Date().toISOString(),
        issuedBy: userId,
        invoiceNumber: invoice.invoiceNumber,
        invoiceTotal,
        whtRate,
        whtAmount: Math.round(whtAmount * 100) / 100,
        netAmountPaid: Math.round(netAmountPaid * 100) / 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(certificateNumber && { certificateNumber }),
        ...(notes && { notes })
      }

      // Update invoice with WHT deduction and credit note
      const updateData: Partial<Invoice> = {
        whtDeducted: true,
        whtRate,
        whtAmount: creditNote.whtAmount,
        whtDeductionDate: new Date().toISOString(),
        whtDeductedBy: userId,
        total: creditNote.netAmountPaid, // Update total to reflect WHT deduction
        whtCreditNote: creditNote,
        updatedAt: new Date().toISOString()
      }

      if (certificateNumber) {
        updateData.whtCertificateNumber = certificateNumber
      }

      const updateResult = await this.updateInvoice(invoiceId, userId, updateData)

      if (updateResult.success && updateResult.data) {
        return {
          success: true,
          data: {
            invoice: updateResult.data,
            creditNote
          }
        }
      } else {
        return {
          success: false,
          error: updateResult.error || 'Failed to update invoice with WHT deduction'
        }
      }
    } catch (error: any) {
      console.error('Error deducting WHT:', error)
      return {
        success: false,
        error: error.message || 'Failed to deduct WHT'
      }
    }
  }
}

// Export a singleton instance
export const invoiceService = new InvoiceService()

