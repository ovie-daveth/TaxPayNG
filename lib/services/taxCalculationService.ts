import { BaseService } from './base'
import { TaxCalculation, ApiResponse, PaginatedResponse } from '@/lib/types'
import { calculateNigerianTax } from '@/lib/tax-calculator'

export class TaxCalculationService extends BaseService {
  constructor() {
    super('taxCalculations')
  }

  // Get all tax calculations for a user
  async getUserCalculations(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<TaxCalculation>> {
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
      console.error('Error getting user tax calculations:', error)
      throw error
    }
  }

  // Create a new tax calculation
  async createCalculation(userId: string, calculationData: {
    businessType: string
    period: 'monthly' | 'quarterly' | 'yearly'
    income: number
    rentPaid: number
    pensionContribution: number
    healthInsurance: number
    lifeInsurance: number
    charitableDonations: number
    businessExpenses: number
    dependents: number
  }): Promise<ApiResponse<TaxCalculation>> {
    try {
      // Calculate tax using the existing calculator
      const taxResult = calculateNigerianTax(calculationData)

      const newCalculation = {
        userId,
        ...calculationData,
        result: taxResult,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const calculationId = await this.create(newCalculation)
      const createdCalculation = await this.getById(calculationId)

      return {
        success: true,
        data: createdCalculation,
        message: 'Tax calculation created successfully'
      }
    } catch (error) {
      console.error('Error creating tax calculation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Update an existing tax calculation
  async updateCalculation(calculationId: string, userId: string, updateData: Partial<TaxCalculation>): Promise<ApiResponse<TaxCalculation>> {
    try {
      // Verify ownership
      const existingCalculation = await this.getById(calculationId)
      if (existingCalculation.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only update your own calculations'
        }
      }

      // If calculation data is being updated, recalculate the result
      if (updateData.businessType || updateData.period || updateData.income || 
          updateData.rentPaid || updateData.pensionContribution || updateData.healthInsurance ||
          updateData.lifeInsurance || updateData.charitableDonations || updateData.businessExpenses ||
          updateData.dependents) {
        
        const updatedData = {
          ...existingCalculation,
          ...updateData
        }

        // Recalculate tax
        const newTaxResult = calculateNigerianTax({
          businessType: updatedData.businessType,
          period: updatedData.period,
          income: updatedData.income,
          rentPaid: updatedData.rentPaid,
          pensionContribution: updatedData.pensionContribution,
          healthInsurance: updatedData.healthInsurance,
          lifeInsurance: updatedData.lifeInsurance,
          charitableDonations: updatedData.charitableDonations,
          businessExpenses: updatedData.businessExpenses,
          dependents: updatedData.dependents
        })

        updateData.result = {
          ...newTaxResult,
          effectiveRate: newTaxResult.effectiveRate.toString()
        }
      }

      await this.update(calculationId, updateData)
      const updatedCalculation = await this.getById(calculationId)

      return {
        success: true,
        data: updatedCalculation,
        message: 'Tax calculation updated successfully'
      }
    } catch (error) {
      console.error('Error updating tax calculation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Delete a tax calculation
  async deleteCalculation(calculationId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      // Verify ownership
      const existingCalculation = await this.getById(calculationId)
      if (existingCalculation.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only delete your own calculations'
        }
      }

      await this.delete(calculationId)

      return {
        success: true,
        message: 'Tax calculation deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting tax calculation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Get calculations by business type
  async getCalculationsByBusinessType(userId: string, businessType: string): Promise<TaxCalculation[]> {
    try {
      return await this.getAll([
        { field: 'userId', operator: '==', value: userId },
        { field: 'businessType', operator: '==', value: businessType }
      ], 'createdAt', 'desc')
    } catch (error) {
      console.error('Error getting calculations by business type:', error)
      throw error
    }
  }

  // Get calculations by period
  async getCalculationsByPeriod(userId: string, period: 'monthly' | 'quarterly' | 'yearly'): Promise<TaxCalculation[]> {
    try {
      return await this.getAll([
        { field: 'userId', operator: '==', value: userId },
        { field: 'period', operator: '==', value: period }
      ], 'createdAt', 'desc')
    } catch (error) {
      console.error('Error getting calculations by period:', error)
      throw error
    }
  }

  // Get latest calculation for a user
  async getLatestCalculation(userId: string): Promise<TaxCalculation | null> {
    try {
      const { data } = await this.getPaginated(
        1,
        1,
        [{ field: 'userId', operator: '==', value: userId }],
        'createdAt',
        'desc'
      )

      return data.length > 0 ? data[0] : null
    } catch (error) {
      console.error('Error getting latest calculation:', error)
      return null
    }
  }

  // Get calculation statistics for a user
  async getCalculationStats(userId: string): Promise<{
    totalCalculations: number
    averageTax: number
    totalTaxPaid: number
    byBusinessType: { [key: string]: number }
    byPeriod: { [key: string]: number }
    recentCalculations: TaxCalculation[]
  }> {
    try {
      const calculations = await this.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])

      const stats = {
        totalCalculations: calculations.length,
        averageTax: 0,
        totalTaxPaid: 0,
        byBusinessType: {} as { [key: string]: number },
        byPeriod: {} as { [key: string]: number },
        recentCalculations: calculations.slice(0, 5)
      }

      if (calculations.length > 0) {
        let totalTax = 0
        calculations.forEach(calc => {
          totalTax += calc.result.totalTax

          // Count by business type
          if (!stats.byBusinessType[calc.businessType]) {
            stats.byBusinessType[calc.businessType] = 0
          }
          stats.byBusinessType[calc.businessType]++

          // Count by period
          if (!stats.byPeriod[calc.period]) {
            stats.byPeriod[calc.period] = 0
          }
          stats.byPeriod[calc.period]++
        })

        stats.averageTax = totalTax / calculations.length
        stats.totalTaxPaid = totalTax
      }

      return stats
    } catch (error) {
      console.error('Error getting calculation stats:', error)
      throw error
    }
  }

  // Compare two calculations
  async compareCalculations(calculationId1: string, calculationId2: string, userId: string): Promise<{
    calculation1: TaxCalculation
    calculation2: TaxCalculation
    differences: {
      incomeDifference: number
      taxDifference: number
      effectiveRateDifference: number
    }
  }> {
    try {
      const calc1 = await this.getById(calculationId1)
      const calc2 = await this.getById(calculationId2)

      // Verify ownership
      if (calc1.userId !== userId || calc2.userId !== userId) {
        throw new Error('Unauthorized: You can only compare your own calculations')
      }

      const differences = {
        incomeDifference: calc2.income - calc1.income,
        taxDifference: calc2.result.totalTax - calc1.result.totalTax,
        effectiveRateDifference: parseFloat(calc2.result.effectiveRate) - parseFloat(calc1.result.effectiveRate)
      }

      return {
        calculation1: calc1,
        calculation2: calc2,
        differences
      }
    } catch (error) {
      console.error('Error comparing calculations:', error)
      throw error
    }
  }

  // Export calculation as PDF (placeholder - would need a PDF generation library)
  async exportCalculationAsPDF(calculationId: string, userId: string): Promise<ApiResponse<string>> {
    try {
      const calculation = await this.getById(calculationId)

      // Verify ownership
      if (calculation.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only export your own calculations'
        }
      }

      // This would typically generate a PDF and return a download URL
      // For now, we'll return a placeholder
      const pdfData = {
        calculationId: calculation.id,
        userId: calculation.userId,
        calculationDate: calculation.createdAt,
        businessType: calculation.businessType,
        period: calculation.period,
        result: calculation.result
      }

      // In a real implementation, you would:
      // 1. Generate PDF using a library like jsPDF or Puppeteer
      // 2. Upload to Firebase Storage
      // 3. Return the download URL
      
      return {
        success: true,
        data: JSON.stringify(pdfData), // Placeholder
        message: 'Calculation exported successfully (placeholder)'
      }
    } catch (error) {
      console.error('Error exporting calculation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}

// Export a singleton instance
export const taxCalculationService = new TaxCalculationService()
