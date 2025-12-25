/**
 * Service for tracking capital assets and calculating multi-year depreciation
 */

import { BaseService } from './base'
import { Transaction } from '../types'

export interface CapitalAsset {
  id: string
  userId: string
  transactionId: string // Link to the original transaction
  description: string
  purchaseDate: string // ISO date string
  purchaseYear: number
  originalCost: number
  capitalAllowanceRate: number // e.g., 25%
  currentBookValue: number // Remaining value after depreciation
  totalDepreciationClaimed: number // Total depreciation claimed so far
  depreciationHistory: Array<{
    year: number
    depreciationAmount: number
    bookValueAfter: number
  }>
  createdAt: string
  updatedAt: string
}

export class CapitalAssetService extends BaseService {
  constructor() {
    super('capitalAssets')
  }

  /**
   * Create or update a capital asset from a transaction
   */
  async createOrUpdateAssetFromTransaction(transaction: Transaction): Promise<CapitalAsset | null> {
    if (!transaction.taxClassification?.isCapitalAsset || !transaction.userId || !transaction.id) {
      return null
    }

    try {
      const purchaseDate = transaction.date ? new Date(transaction.date) : new Date(transaction.createdAt)
      const purchaseYear = purchaseDate.getFullYear()
      const originalCost = typeof transaction.amount === 'number' 
        ? transaction.amount 
        : Number(String(transaction.amount).replace(/[\u20A6,]/g, '').trim()) || 0

      // Check if asset already exists for this transaction
      const existingAssets = await this.getAll([
        { field: 'userId', operator: '==', value: transaction.userId },
        { field: 'transactionId', operator: '==', value: transaction.id }
      ])

      if (existingAssets.length > 0) {
        // Update existing asset
        const existingAsset = existingAssets[0]
        await this.update(existingAsset.id, {
          description: transaction.description || 'Capital Asset',
          originalCost,
          capitalAllowanceRate: transaction.taxClassification.capitalAllowanceRate || 25,
          updatedAt: new Date().toISOString()
        })
        return await this.getById(existingAsset.id)
      } else {
        // Create new asset
        const assetId = await this.create({
          userId: transaction.userId,
          transactionId: transaction.id,
          description: transaction.description || 'Capital Asset',
          purchaseDate: purchaseDate.toISOString(),
          purchaseYear,
          originalCost,
          capitalAllowanceRate: transaction.taxClassification.capitalAllowanceRate || 25,
          currentBookValue: originalCost,
          totalDepreciationClaimed: 0,
          depreciationHistory: []
        })
        return await this.getById(assetId)
      }
    } catch (error) {
      console.error('Error creating/updating capital asset:', error)
      return null
    }
  }

  /**
   * Calculate depreciation for a specific tax year using reducing balance method
   */
  calculateDepreciationForYear(
    asset: CapitalAsset,
    taxYear: number
  ): { depreciationAmount: number; bookValueAfter: number } {
    // If asset was purchased in a future year, no depreciation
    if (asset.purchaseYear > taxYear) {
      return { depreciationAmount: 0, bookValueAfter: asset.originalCost }
    }

    // Calculate years since purchase
    const yearsSincePurchase = taxYear - asset.purchaseYear

    // If first year, use original cost
    if (yearsSincePurchase === 0) {
      const depreciationAmount = asset.originalCost * (asset.capitalAllowanceRate / 100)
      const bookValueAfter = asset.originalCost - depreciationAmount
      return { depreciationAmount, bookValueAfter }
    }

    // For subsequent years, calculate from current book value
    // Get the book value at the start of this year
    let currentBookValue = asset.originalCost
    let totalDepreciation = 0

    // Calculate cumulative depreciation up to the start of this year
    for (let year = asset.purchaseYear; year < taxYear; year++) {
      const yearDepreciation = currentBookValue * (asset.capitalAllowanceRate / 100)
      totalDepreciation += yearDepreciation
      currentBookValue -= yearDepreciation
    }

    // Calculate depreciation for this year
    const depreciationAmount = currentBookValue * (asset.capitalAllowanceRate / 100)
    const bookValueAfter = currentBookValue - depreciationAmount

    return { depreciationAmount, bookValueAfter }
  }

  /**
   * Get all capital assets for a user
   */
  async getUserAssets(userId: string): Promise<CapitalAsset[]> {
    try {
      return await this.getAll([
        { field: 'userId', operator: '==', value: userId }
      ], 'purchaseDate', 'desc')
    } catch (error) {
      console.error('Error fetching user assets:', error)
      return []
    }
  }

  /**
   * Get capital allowances for a specific tax year
   */
  async getCapitalAllowancesForYear(userId: string, taxYear: number): Promise<{
    totalAllowances: number
    assetDetails: Array<{
      asset: CapitalAsset
      depreciationAmount: number
      bookValueAfter: number
    }>
  }> {
    try {
      const assets = await this.getUserAssets(userId)
      let totalAllowances = 0
      const assetDetails: Array<{
        asset: CapitalAsset
        depreciationAmount: number
        bookValueAfter: number
      }> = []

      for (const asset of assets) {
        // Only calculate if asset was purchased in or before this tax year
        if (asset.purchaseYear <= taxYear) {
          const { depreciationAmount, bookValueAfter } = this.calculateDepreciationForYear(asset, taxYear)
          
          // Only include if there's still value to depreciate
          if (depreciationAmount > 0 && bookValueAfter >= 0) {
            totalAllowances += depreciationAmount
            assetDetails.push({
              asset,
              depreciationAmount,
              bookValueAfter
            })
          }
        }
      }

      return {
        totalAllowances: Math.round(totalAllowances * 100) / 100,
        assetDetails
      }
    } catch (error) {
      console.error('Error calculating capital allowances for year:', error)
      return { totalAllowances: 0, assetDetails: [] }
    }
  }

  /**
   * Delete asset when transaction is deleted
   */
  async deleteAssetByTransactionId(transactionId: string): Promise<void> {
    try {
      const assets = await this.getAll([
        { field: 'transactionId', operator: '==', value: transactionId }
      ])
      
      for (const asset of assets) {
        await this.delete(asset.id)
      }
    } catch (error) {
      console.error('Error deleting asset:', error)
    }
  }
}

export const capitalAssetService = new CapitalAssetService()

