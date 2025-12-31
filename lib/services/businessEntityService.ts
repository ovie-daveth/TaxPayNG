import { BaseService } from './base'
import type { ApiResponse, BusinessEntity, PaginatedResponse } from '@/lib/types'

export class BusinessEntityService extends BaseService {
  constructor() {
    super('businessEntities')
  }

  async getUserBusinessEntities(
    userId: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedResponse<BusinessEntity>> {
    try {
      const all = await this.getAll([{ field: 'userId', operator: '==', value: userId }])
      const sorted = all.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime()
        const bTime = new Date(b.createdAt || 0).getTime()
        return bTime - aTime
      })

      const total = sorted.length
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const totalPages = Math.ceil(total / pageSize)

      return {
        data: sorted.slice(startIndex, endIndex),
        pagination: {
          page,
          limit: pageSize,
          total,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        },
      }
    } catch (error) {
      console.error('Error fetching business entities:', error)
      return {
        data: [],
        pagination: { page, limit: pageSize, total: 0, totalPages: 0, hasPrev: false, hasNext: false },
      }
    }
  }

  async createBusinessEntity(
    userId: string,
    data: Omit<BusinessEntity, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<BusinessEntity>> {
    try {
      const payload = {
        ...data,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const id = await this.create(payload)
      const created = await this.getById(id)
      return { success: true, data: created }
    } catch (error) {
      console.error('Error creating business entity:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
    }
  }

  async updateBusinessEntity(
    entityId: string,
    userId: string,
    updates: Partial<Omit<BusinessEntity, 'id' | 'userId' | 'createdAt'>>
  ): Promise<ApiResponse<BusinessEntity>> {
    try {
      const existing = await this.getById(entityId)
      if (!existing || existing.userId !== userId) {
        return { success: false, error: 'Business not found' }
      }
      await this.update(entityId, { ...updates, updatedAt: new Date().toISOString() })
      const updated = await this.getById(entityId)
      return { success: true, data: updated }
    } catch (error) {
      console.error('Error updating business entity:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
    }
  }

  async deleteBusinessEntity(entityId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const existing = await this.getById(entityId)
      if (!existing || existing.userId !== userId) {
        return { success: false, error: 'Business not found' }
      }
      await this.delete(entityId)
      return { success: true }
    } catch (error) {
      console.error('Error deleting business entity:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
    }
  }
}

export const businessEntityService = new BusinessEntityService()


