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
  capitalAllowanceRate: number // annual allowance rate (e.g., 25%)
  initialAllowanceRate?: number // initial allowance rate for first year (if applicable)
  capitalAssetType?: 'it_equipment' | 'motor_vehicle' | 'plant_machinery' | 'furniture_fittings' | 'building' | 'intangible_software'
  businessUsePercentage?: number // 0-100 (portion used for income generation)
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
      // Base amount (prefer NGN equivalent if foreign currency, otherwise netAmount if present, else amount)
      let baseAmount = 0
      if (transaction.currency && transaction.currency !== 'NGN' && transaction.ngnEquivalent) {
        baseAmount = transaction.ngnEquivalent
      } else {
        baseAmount =
          transaction.netAmount !== undefined
            ? transaction.netAmount
            : (typeof transaction.amount === 'number'
                ? transaction.amount
                : Number(String(transaction.amount).replace(/[\u20A6,]/g, '').trim()) || 0)
      }

      // Business-use percentage (exclude personal portion for mixed transactions)
      const businessUsePercentage =
        transaction.transactionNature === 'mixed' && transaction.businessPercentage !== undefined
          ? Math.max(0, Math.min(100, transaction.businessPercentage))
          : transaction.transactionNature === 'personal'
            ? 0
            : 100

      const originalCost = baseAmount * (businessUsePercentage / 100)

      const annualRate = transaction.taxClassification.capitalAllowanceRate || 25
      const inferredInitialRate =
        transaction.taxClassification.initialAllowanceRate ??
        50

      const capitalAssetType = (transaction.taxClassification as any).capitalAssetType

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
          capitalAllowanceRate: annualRate,
          initialAllowanceRate: inferredInitialRate,
          businessUsePercentage,
          capitalAssetType,
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
          capitalAllowanceRate: annualRate,
          initialAllowanceRate: inferredInitialRate,
          businessUsePercentage,
          capitalAssetType,
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
   * Calculate Nigerian tax capital allowance for a given year:
   * - Initial allowance (first year only, if configured)
   * - Annual allowance (applied on original cost; capped by remaining pool)
   */
  calculateCapitalAllowanceForYear(
    asset: CapitalAsset,
    taxYear: number
  ): { depreciationAmount: number; bookValueAfter: number } {
    // If asset was purchased in a future year, no allowance
    if (asset.purchaseYear > taxYear) {
      return { depreciationAmount: 0, bookValueAfter: asset.originalCost }
    }

    const annualRate = (asset.capitalAllowanceRate || 0) / 100
    const initialRate =
      (asset.initialAllowanceRate !== undefined ? asset.initialAllowanceRate : Math.min(50, Math.max(0, (asset.capitalAllowanceRate || 0) * 2))) / 100

    // Simulate year-by-year so we can respect:
    // - IA only in purchase year
    // - AA based on original cost each year, but never exceeding remaining pool
    let poolValue = asset.originalCost
    let allowanceForTargetYear = 0

    for (let year = asset.purchaseYear; year <= taxYear; year++) {
      const isFirstYear = year === asset.purchaseYear

      const initialAllowance = isFirstYear ? poolValue * initialRate : 0
      const poolAfterInitial = Math.max(0, poolValue - initialAllowance)

      const annualAllowanceBase = asset.originalCost * annualRate
      const annualAllowance = Math.min(poolAfterInitial, annualAllowanceBase)

      const totalForYear = initialAllowance + annualAllowance
      const poolAfterYear = Math.max(0, poolAfterInitial - annualAllowance)

      if (year === taxYear) {
        allowanceForTargetYear = totalForYear
        poolValue = poolAfterYear
        break
      }

      poolValue = poolAfterYear
      if (poolValue <= 0) {
        // Fully written off before the target year
        return { depreciationAmount: 0, bookValueAfter: 0 }
      }
    }

    return {
      // Keep field name for backward compatibility in downstream code, but this is capital allowance.
      depreciationAmount: Math.round(allowanceForTargetYear * 100) / 100,
      bookValueAfter: Math.round(poolValue * 100) / 100
    }
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
          const { depreciationAmount, bookValueAfter } = this.calculateCapitalAllowanceForYear(asset, taxYear)
          
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

