import { BaseService } from './base'
import { TaxPayment, ApiResponse, PaginatedResponse } from '@/lib/types'

export class TaxPaymentService extends BaseService {
  constructor() {
    super('taxPayments')
  }

  // Create a new tax payment
  async createPayment(userId: string, paymentData: {
    transactionId: string
    amount: number
    period: 'monthly' | 'quarterly' | 'yearly'
    taxDuration: string
    paymentMethod: 'remitta' | 'interswitch' | 'paystack' | 'firs'
    status?: 'pending' | 'completed' | 'failed'
    taxCalculation?: TaxPayment['taxCalculation']
    receiptUrl?: string
    notes?: string
  }): Promise<ApiResponse<TaxPayment>> {
    try {
      // Build payment object, omitting undefined fields
      const newPayment: any = {
        userId,
        transactionId: paymentData.transactionId,
        amount: paymentData.amount,
        period: paymentData.period,
        taxDuration: paymentData.taxDuration,
        paymentMethod: paymentData.paymentMethod,
        status: paymentData.status || 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Only add optional fields if they are defined
      if (paymentData.taxCalculation !== undefined) {
        newPayment.taxCalculation = paymentData.taxCalculation
      }
      if (paymentData.receiptUrl !== undefined) {
        newPayment.receiptUrl = paymentData.receiptUrl
      }
      if (paymentData.notes !== undefined) {
        newPayment.notes = paymentData.notes
      }

      const paymentId = await this.create(newPayment)
      const createdPayment = await this.getById(paymentId)

      return {
        success: true,
        data: createdPayment,
        message: 'Tax payment recorded successfully'
      }
    } catch (error) {
      console.error('Error creating tax payment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Get all payments for a user
  async getUserPayments(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<TaxPayment>> {
    try {
      const { data, total } = await this.getPaginated(
        page,
        pageSize,
        [{ field: 'userId', operator: '==', value: userId }],
        'createdAt',
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
      console.error('Error getting user tax payments:', error)
      throw error
    }
  }

  // Get payment by transaction ID
  async getPaymentByTransactionId(transactionId: string): Promise<TaxPayment | null> {
    try {
      const payments = await this.getAll([
        { field: 'transactionId', operator: '==', value: transactionId }
      ])
      return payments.length > 0 ? payments[0] : null
    } catch (error) {
      console.error('Error getting payment by transaction ID:', error)
      return null
    }
  }

  // Get payments by period
  async getPaymentsByPeriod(
    userId: string, 
    period: 'monthly' | 'quarterly' | 'yearly'
  ): Promise<TaxPayment[]> {
    try {
      return await this.getAll([
        { field: 'userId', operator: '==', value: userId },
        { field: 'period', operator: '==', value: period }
      ], 'createdAt', 'desc')
    } catch (error) {
      console.error('Error getting payments by period:', error)
      throw error
    }
  }

  // Get payments by status
  async getPaymentsByStatus(
    userId: string,
    status: 'pending' | 'completed' | 'failed'
  ): Promise<TaxPayment[]> {
    try {
      return await this.getAll([
        { field: 'userId', operator: '==', value: userId },
        { field: 'status', operator: '==', value: status }
      ], 'createdAt', 'desc')
    } catch (error) {
      console.error('Error getting payments by status:', error)
      throw error
    }
  }

  // Update payment status
  async updatePaymentStatus(
    paymentId: string,
    status: 'pending' | 'completed' | 'failed'
  ): Promise<ApiResponse<TaxPayment>> {
    try {
      await this.update(paymentId, {
        status,
        updatedAt: new Date().toISOString()
      })
      
      const updatedPayment = await this.getById(paymentId)

      return {
        success: true,
        data: updatedPayment,
        message: 'Payment status updated successfully'
      }
    } catch (error) {
      console.error('Error updating payment status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Get payment statistics for a user
  async getPaymentStats(userId: string): Promise<{
    totalPayments: number
    totalAmount: number
    byPeriod: { [key: string]: { count: number; amount: number } }
    byMethod: { [key: string]: { count: number; amount: number } }
    byStatus: { [key: string]: { count: number; amount: number } }
    recentPayments: TaxPayment[]
  }> {
    try {
      const payments = await this.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])

      const stats = {
        totalPayments: payments.length,
        totalAmount: 0,
        byPeriod: {} as { [key: string]: { count: number; amount: number } },
        byMethod: {} as { [key: string]: { count: number; amount: number } },
        byStatus: {} as { [key: string]: { count: number; amount: number } },
        recentPayments: payments.slice(0, 5)
      }

      payments.forEach(payment => {
        // Calculate total amount
        stats.totalAmount += payment.amount

        // Count by period
        if (!stats.byPeriod[payment.period]) {
          stats.byPeriod[payment.period] = { count: 0, amount: 0 }
        }
        stats.byPeriod[payment.period].count++
        stats.byPeriod[payment.period].amount += payment.amount

        // Count by method
        if (!stats.byMethod[payment.paymentMethod]) {
          stats.byMethod[payment.paymentMethod] = { count: 0, amount: 0 }
        }
        stats.byMethod[payment.paymentMethod].count++
        stats.byMethod[payment.paymentMethod].amount += payment.amount

        // Count by status
        if (!stats.byStatus[payment.status]) {
          stats.byStatus[payment.status] = { count: 0, amount: 0 }
        }
        stats.byStatus[payment.status].count++
        stats.byStatus[payment.status].amount += payment.amount
      })

      return stats
    } catch (error) {
      console.error('Error getting payment stats:', error)
      throw error
    }
  }

  // Delete a payment
  async deletePayment(paymentId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      // Verify ownership
      const existingPayment = await this.getById(paymentId)
      if (existingPayment.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only delete your own payments'
        }
      }

      await this.delete(paymentId)

      return {
        success: true,
        message: 'Payment deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting payment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}

// Export a singleton instance
export const taxPaymentService = new TaxPaymentService()

