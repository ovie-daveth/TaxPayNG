import { BaseService } from './base'
import { BrandDeal, BrandDealFilters, ApiResponse, PaginatedResponse } from '@/lib/types'

export class BrandDealService extends BaseService {
  constructor() {
    super('brandDeals')
  }

  // Get all brand deals for a user
  async getUserBrandDeals(
    userId: string,
    filters?: BrandDealFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<BrandDeal>> {
    try {
      let deals = await this.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])

      // Sort by created date (newest first)
      deals = deals.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA
      })

      // Apply filters
      if (filters?.entityId) {
        deals = deals.filter(deal => deal.entityId === filters.entityId)
      }
      if (filters?.status) {
        deals = deals.filter(deal => deal.status === filters.status)
      }
      if (filters?.dealType) {
        deals = deals.filter(deal => deal.dealType === filters.dealType)
      }
      if (filters?.brandName) {
        deals = deals.filter(deal => 
          deal.brandName.toLowerCase().includes(filters.brandName!.toLowerCase())
        )
      }
      if (filters?.startDate) {
        const startDate = new Date(filters.startDate)
        deals = deals.filter(deal => new Date(deal.startDate) >= startDate)
      }
      if (filters?.endDate) {
        const endDate = new Date(filters.endDate)
        deals = deals.filter(deal => {
          const dealEndDate = deal.endDate ? new Date(deal.endDate) : new Date(deal.startDate)
          return dealEndDate <= endDate
        })
      }

      // Pagination
      const total = deals.length
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedDeals = deals.slice(startIndex, endIndex)
      const totalPages = Math.ceil(total / pageSize)

      return {
        data: paginatedDeals,
        pagination: {
          page,
          limit: pageSize,
          total,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        }
      }
    } catch (error) {
      console.error('Error fetching brand deals:', error)
      return {
        data: [],
        pagination: {
          page,
          limit: pageSize,
          total: 0,
          totalPages: 0,
          hasPrev: false,
          hasNext: false,
        }
      }
    }
  }

  // Get a single brand deal by ID
  async getBrandDeal(dealId: string): Promise<ApiResponse<BrandDeal>> {
    try {
      const deal = await this.getById(dealId)
      if (!deal) {
        return {
          success: false,
          error: 'Brand deal not found'
        }
      }
      return {
        success: true,
        data: deal as BrandDeal
      }
    } catch (error) {
      console.error('Error fetching brand deal:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch brand deal'
      }
    }
  }

  // Create a new brand deal
  async createBrandDeal(
    userId: string,
    dealData: Omit<BrandDeal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<BrandDeal>> {
    try {
      const now = new Date().toISOString()
      const newDeal = {
        ...dealData,
        userId,
        createdAt: now,
        updatedAt: now
      }

      const dealId = await this.create(newDeal)
      const deal = await this.getById(dealId)

      return {
        success: true,
        data: deal as BrandDeal
      }
    } catch (error) {
      console.error('Error creating brand deal:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create brand deal'
      }
    }
  }

  // Update a brand deal
  async updateBrandDeal(
    dealId: string,
    userId: string,
    updates: Partial<Omit<BrandDeal, 'id' | 'userId' | 'createdAt'>> & { updatedAt?: string }
  ): Promise<ApiResponse<BrandDeal>> {
    try {
      // Verify the deal belongs to the user
      const existingDeal = await this.getById(dealId)
      if (!existingDeal || (existingDeal as BrandDeal).userId !== userId) {
        return {
          success: false,
          error: 'Brand deal not found or access denied'
        }
      }

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      }

      await this.update(dealId, updateData)
      const updatedDeal = await this.getById(dealId)

      return {
        success: true,
        data: updatedDeal as BrandDeal
      }
    } catch (error) {
      console.error('Error updating brand deal:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update brand deal'
      }
    }
  }

  // Delete a brand deal
  async deleteBrandDeal(dealId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      // Verify the deal belongs to the user
      const existingDeal = await this.getById(dealId)
      if (!existingDeal || (existingDeal as BrandDeal).userId !== userId) {
        return {
          success: false,
          error: 'Brand deal not found or access denied'
        }
      }

      await this.delete(dealId)

      return {
        success: true
      }
    } catch (error) {
      console.error('Error deleting brand deal:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete brand deal'
      }
    }
  }

  // Mark a brand deal as completed
  async markAsCompleted(dealId: string, userId: string): Promise<ApiResponse<BrandDeal>> {
    return this.updateBrandDeal(dealId, userId, {
      status: 'completed',
      updatedAt: new Date().toISOString()
    })
  }

  // Mark a milestone as paid
  async markMilestonePaid(
    dealId: string,
    userId: string,
    milestoneIndex: number,
    paidDate?: string
  ): Promise<ApiResponse<BrandDeal>> {
    try {
      const dealResult = await this.getBrandDeal(dealId)
      if (!dealResult.success || !dealResult.data) {
        return {
          success: false,
          error: 'Brand deal not found'
        }
      }

      const deal = dealResult.data
      if (!deal.paymentSchedule?.milestones) {
        return {
          success: false,
          error: 'No milestones found for this deal'
        }
      }

      const updatedMilestones = [...deal.paymentSchedule.milestones]
      if (milestoneIndex >= 0 && milestoneIndex < updatedMilestones.length) {
        updatedMilestones[milestoneIndex] = {
          ...updatedMilestones[milestoneIndex],
          paid: true,
          paidDate: paidDate || new Date().toISOString()
        }
      }

      return this.updateBrandDeal(dealId, userId, {
        paymentSchedule: {
          ...deal.paymentSchedule,
          milestones: updatedMilestones
        }
      })
    } catch (error) {
      console.error('Error marking milestone as paid:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update milestone'
      }
    }
  }
}

export const brandDealService = new BrandDealService()

