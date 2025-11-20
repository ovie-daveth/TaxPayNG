import { BaseService } from './base'
import { Invoice, InvoiceFilters, InvoiceItem, ApiResponse, PaginatedResponse, SavedClient } from '@/lib/types'

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

  // Calculate invoice totals
  private calculateTotals(items: InvoiceItem[], discount?: number): {
    subtotal: number
    taxAmount: number
    total: number
  } {
    let subtotal = 0
    let taxAmount = 0
    
    items.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice
      subtotal += itemSubtotal
      
      if (item.tax) {
        taxAmount += itemSubtotal * (item.tax / 100)
      }
    })
    
    const discountAmount = discount ? subtotal * (discount / 100) : 0
    const total = subtotal + taxAmount - discountAmount
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    }
  }

  // Get all invoices for a user (both created and received)
  async getUserInvoices(
    userId: string,
    filters?: InvoiceFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Invoice>> {
    try {
      // Fetch invoices created by user AND invoices received by user
      const [createdInvoices, receivedInvoices] = await Promise.all([
        this.getAll([{ field: 'userId', operator: '==', value: userId }]),
        this.getAll([{ field: 'recipientUserId', operator: '==', value: userId }])
      ])
      
      // Combine both lists and deduplicate by invoice ID
      // An invoice can appear in both lists if it has both userId and recipientUserId set to the same user
      const invoiceMap = new Map<string, Invoice>()
      
      // Add created invoices
      createdInvoices.forEach(inv => {
        if (inv.id) {
          invoiceMap.set(inv.id, inv)
        }
      })
      
      // Add received invoices (will overwrite duplicates with same ID)
      receivedInvoices.forEach(inv => {
        if (inv.id) {
          invoiceMap.set(inv.id, inv)
        }
      })
      
      // Convert map back to array
      const allInvoices = Array.from(invoiceMap.values())

      // Apply all filters client-side
      let filtered = allInvoices

      if (filters?.status) {
        filtered = filtered.filter(inv => inv.status === filters.status)
      }
      if (filters?.invoiceType) {
        filtered = filtered.filter(inv => (inv.invoiceType || 'outgoing') === filters.invoiceType)
      }
      if (filters?.clientId) {
        filtered = filtered.filter(inv => inv.client.id === filters.clientId)
      }
      if (filters?.startDate || filters?.endDate) {
        const start = filters.startDate ? new Date(filters.startDate) : null
        const end = filters.endDate ? new Date(filters.endDate) : null
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
  async createInvoice(userId: string, invoiceData: Omit<Invoice, 'id' | 'userId' | 'invoiceNumber' | 'subtotal' | 'taxAmount' | 'total' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Invoice>> {
    try {
      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(userId, invoiceData.invoiceType || 'outgoing')
      
      // Calculate totals
      const totals = this.calculateTotals(invoiceData.items, invoiceData.discount)
      
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
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
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
      if (existingInvoice.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only update your own invoices'
        }
      }

      // Recalculate totals if items changed
      if (updateData.items) {
        const totals = this.calculateTotals(updateData.items, updateData.discount ?? existingInvoice.discount)
        updateData.subtotal = totals.subtotal
        updateData.taxAmount = totals.taxAmount
        updateData.total = totals.total
      } else if (updateData.discount !== undefined) {
        const totals = this.calculateTotals(existingInvoice.items, updateData.discount)
        updateData.subtotal = totals.subtotal
        updateData.taxAmount = totals.taxAmount
        updateData.total = totals.total
      }

      // Check if invoice should be marked as overdue
      if (updateData.status === 'sent' || (existingInvoice.status === 'sent' && !updateData.status)) {
        const dueDate = updateData.dueDate ? new Date(updateData.dueDate) : new Date(existingInvoice.dueDate)
        const today = new Date()
        if (dueDate < today && existingInvoice.status !== 'paid') {
          updateData.status = 'overdue'
        }
      }

      await this.update(invoiceId, {
        ...updateData,
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

  // Mark invoice as paid
  async markAsPaid(invoiceId: string, userId: string, paymentMethod?: string, paymentReference?: string): Promise<ApiResponse<Invoice>> {
    try {
      const invoice = await this.getById(invoiceId)
      if (invoice.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized'
        }
      }

      return await this.updateInvoice(invoiceId, userId, {
        status: 'paid',
        paidAt: new Date().toISOString(),
        paymentMethod,
        paymentReference
      })
    } catch (error) {
      console.error('Error marking invoice as paid:', error)
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
        if (inv.status === 'paid') {
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

  // Send invoice to another OTax user
  // async sendInvoiceToUser(
  //   invoiceId: string,
  //   senderUserId: string,
  //   recipientEmail: string
  // ): Promise<ApiResponse<Invoice>> {
  //   try {
  //     // Find recipient user by email
  //     const { userService } = await import('./userService')
  //     const recipient = await userService.findUserByEmail(recipientEmail)
      
  //     if (!recipient) {
  //       return {
  //         success: false,
  //         error: 'User not found. Please make sure the recipient is registered on OTax.'
  //       }
  //     }

  //     // Get the invoice
  //     const invoice = await this.getById(invoiceId)
  //     if (!invoice || invoice.userId !== senderUserId) {
  //       return {
  //         success: false,
  //         error: 'Invoice not found or unauthorized'
  //       }
  //     }

  //     // Check if invoice was already sent to this user
  //     // Get all incoming invoices for this recipient
  //     const allRecipientInvoices = await this.getAll([
  //       { field: 'userId', operator: '==', value: recipient.userId },
  //       { field: 'invoiceType', operator: '==', value: 'incoming' }
  //     ])
      
  //     // Check if any existing invoice matches this one
  //     // Match by: senderUserId matches AND recipientEmail matches
  //     // Also check if the invoice was created recently (within last 5 minutes) to prevent race conditions
  //     const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  //     const duplicate = allRecipientInvoices.find(inv => {
  //       const isFromSameSender = inv.senderUserId === senderUserId
  //       const isSameEmail = inv.recipientEmail?.toLowerCase() === recipientEmail.toLowerCase()
  //       const isRecent = inv.createdAt && inv.createdAt > fiveMinutesAgo
  //       const hasSameInvoiceNumber = inv.invoiceNumber === invoice.invoiceNumber
        
  //       // Match if: same sender AND (same email OR same invoice number OR created recently)
  //       return isFromSameSender && (isSameEmail || hasSameInvoiceNumber || (isRecent && isSameEmail))
  //     })
      
  //     if (duplicate) {
  //       return {
  //         success: false,
  //         error: 'This invoice has already been sent to this user'
  //       }
  //     }

  //     // Generate a new invoice number for the incoming invoice (so it's unique for the recipient)
  //     const recipientInvoiceNumber = await this.generateInvoiceNumber(recipient.userId, 'incoming')

  //     // Create a copy of the invoice for the recipient (incoming invoice)
  //     const incomingInvoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
  //       ...invoice,
  //       userId: recipient.userId, // Recipient owns this copy
  //       invoiceNumber: recipientInvoiceNumber, // Generate new number for recipient
  //       invoiceType: 'incoming' as const,
  //       senderUserId: senderUserId,
  //       recipientUserId: recipient.userId,
  //       recipientEmail: recipientEmail,
  //       status: 'sent' as const,
  //       receivedAt: new Date().toISOString(),
  //       sentAt: new Date().toISOString()
  //     }

  //     // Create the incoming invoice for recipient
  //     const newInvoiceId = await this.create({
  //       ...incomingInvoiceData,
  //       createdAt: new Date().toISOString(),
  //       updatedAt: new Date().toISOString()
  //     })
      
  //     // Update original invoice to mark as sent
  //     await this.update(invoiceId, {
  //       recipientUserId: recipient.userId,
  //       recipientEmail: recipientEmail,
  //       status: 'sent',
  //       sentAt: new Date().toISOString(),
  //       updatedAt: new Date().toISOString()
  //     })

  //     const sentInvoice = await this.getById(invoiceId)
  //     return {
  //       success: true,
  //       data: sentInvoice,
  //       message: `Invoice sent successfully to ${recipientEmail}`
  //     }
  //   } catch (error) {
  //     console.error('Error sending invoice to user:', error)
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : 'Unknown error occurred'
  //     }
  //   }
  // }

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

      // Check if a copy already exists for the recipient
      // Get all incoming invoices for this recipient
      const allRecipientInvoices = await this.getAll([
        { field: 'userId', operator: '==', value: recipient.userId },
        { field: 'invoiceType', operator: '==', value: 'incoming' }
      ])
      
      // Check if any invoice matches this one
      // Match by: senderUserId AND (senderInvoiceNumber OR recipientEmail OR recent creation)
      const now = Date.now()
      const fiveMinutesAgo = now - (5 * 60 * 1000)
      
      const duplicate = allRecipientInvoices.find(inv => {
        const isFromSameSender = inv.senderUserId === senderUserId
        if (!isFromSameSender) return false
        
        // Check multiple criteria for duplicate detection
        const hasSameSenderInvoiceNumber = inv.senderInvoiceNumber === invoice.invoiceNumber
        const hasSameEmail = inv.recipientEmail?.toLowerCase() === recipientEmail.toLowerCase()
        
        // Check if invoice was created recently (within 5 minutes) - catches race conditions
        const isRecent = inv.createdAt && new Date(inv.createdAt).getTime() > fiveMinutesAgo
        
        // Match if: same sender AND (same sender invoice number OR same email OR recent creation with same email)
        return hasSameSenderInvoiceNumber || hasSameEmail || (isRecent && hasSameEmail)
      })
      
      if (duplicate) {
        this.sendingInvoices.delete(sendKey)
        return {
          success: false,
          error: 'This invoice has already been sent to this user'
        }
      }

      // Generate a new invoice number for the incoming invoice
      const recipientInvoiceNumber = await this.generateInvoiceNumber(recipient.userId, 'incoming')

      // Create a copy of the invoice for the recipient (incoming invoice)
      const incomingInvoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
        ...invoice,
        userId: recipient.userId, // Recipient owns this copy
        invoiceNumber: recipientInvoiceNumber, // Generate new number for recipient
        invoiceType: 'incoming' as const,
        senderUserId: senderUserId,
        senderInvoiceNumber: invoice.invoiceNumber, // Store original invoice number for duplicate detection
        recipientUserId: recipient.userId,
        recipientEmail: recipientEmail,
        status: 'sent' as const,
        receivedAt: new Date().toISOString(),
        sentAt: new Date().toISOString()
      }

      // Create the incoming invoice for recipient
      const newInvoiceId = await this.create({
        ...incomingInvoiceData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      // Update original invoice to mark as sent (only if not already sent)
      if (!invoice.sentAt || !invoice.recipientUserId) {
        await this.update(invoiceId, {
          recipientUserId: recipient.userId,
          recipientEmail: recipientEmail,
          status: 'sent',
          sentAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      const sentInvoice = await this.getById(invoiceId)
      
      // Remove from sending set
      this.sendingInvoices.delete(sendKey)
      
      return {
        success: true,
        data: sentInvoice,
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
}

// Export a singleton instance
export const invoiceService = new InvoiceService()

