/**
 * Utility functions to calculate tax benefits from transaction taxClassification
 * These are Gold+ features that use the taxClassification data on transactions
 */

import { Transaction, TaxPeriod } from '@/lib/types'
import { transactionService, capitalAssetService } from '@/lib/services'

export interface TaxClassificationSummary {
  capitalAllowances: number
  whtCredits: number
  vatInput: number // VAT on expenses (input VAT - can be claimed)
  vatOutput: number // VAT on income (output VAT - must be paid)
  capitalAllowanceDetails: Array<{
    transactionId: string
    description: string
    originalCost: number
    purchaseYear: number
    allowanceRate: number
    allowanceAmount: number
    bookValueAfter: number
    yearsSincePurchase: number
  }>
  whtCreditDetails: Array<{
    transactionId: string
    description: string
    amount: number
    whtRate: number
    whtAmount: number
  }>
  vatDetails: Array<{
    transactionId: string
    description: string
    amount: number
    vatRate: number
    vatAmount: number
    type: 'input' | 'output' // input = expense VAT (claimable), output = income VAT (payable)
  }>
}

/**
 * Calculate capital allowances and WHT credits from transactions for a given tax period
 * Only processes transactions with taxClassification (Gold+ feature)
 * 
 * @param userId - User ID
 * @param taxPeriod - Tax period (year, quarter, month)
 * @returns Summary of capital allowances and WHT credits
 */
export async function calculateTaxClassificationBenefits(
  userId: string,
  taxPeriod: TaxPeriod
): Promise<TaxClassificationSummary> {
  try {
    // Get capital allowances using multi-year depreciation from capital asset service
    const taxYear = taxPeriod.year
    const { totalAllowances: totalCapitalAllowances, assetDetails } = await capitalAssetService.getCapitalAllowancesForYear(userId, taxYear)
    
    const capitalAllowanceDetails: TaxClassificationSummary['capitalAllowanceDetails'] = assetDetails.map(({ asset, depreciationAmount, bookValueAfter }) => {
      const yearsSincePurchase = taxYear - asset.purchaseYear
      return {
        transactionId: asset.transactionId,
        description: asset.description,
        originalCost: asset.originalCost,
        purchaseYear: asset.purchaseYear,
        allowanceRate: asset.capitalAllowanceRate,
        allowanceAmount: depreciationAmount,
        bookValueAfter,
        yearsSincePurchase
      }
    })

    // Fetch all transactions for the user to calculate WHT and VAT
    const allTransactions = await transactionService.getAll([
      { field: 'userId', operator: '==', value: userId }
    ])

    // Filter transactions by tax period
    const periodTransactions = allTransactions.filter(txn => {
      if (!txn.taxPeriod) return false
      
      // Match year
      if (txn.taxPeriod.year !== taxPeriod.year) return false
      
      // Match quarter if specified
      if (taxPeriod.quarter && txn.taxPeriod.quarter !== taxPeriod.quarter) return false
      
      // Match month if specified
      if (taxPeriod.month && txn.taxPeriod.month !== taxPeriod.month) return false
      
      return true
    })

    let totalWHTCredits = 0
    let totalVATInput = 0 // VAT on expenses (input VAT - can be claimed)
    let totalVATOutput = 0 // VAT on income (output VAT - must be paid)
    const whtCreditDetails: TaxClassificationSummary['whtCreditDetails'] = []
    const vatDetails: TaxClassificationSummary['vatDetails'] = []

    // Process each transaction for WHT and VAT (capital allowances are now handled by asset service)
    for (const txn of periodTransactions) {
      if (!txn.taxClassification) continue

      const taxClass = txn.taxClassification
      const amount = typeof txn.amount === 'number' 
        ? txn.amount 
        : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0

      // Calculate WHT credits
      if (taxClass.whtCreditable) {
        let whtAmount = 0
        
        // Use stored whtAmount if available, otherwise calculate from rate
        if (taxClass.whtAmount !== undefined) {
          whtAmount = taxClass.whtAmount
        } else if (taxClass.whtRate) {
          const whtRate = taxClass.whtRate / 100 // Convert percentage to decimal
          whtAmount = amount * whtRate
        }
        
        if (whtAmount > 0) {
          totalWHTCredits += whtAmount
          
          whtCreditDetails.push({
            transactionId: txn.id || '',
            description: txn.description || 'WHT Credit',
            amount,
            whtRate: taxClass.whtRate || 0,
            whtAmount
          })
        }
      }

      // Calculate VAT
      if (taxClass.vatApplicable && taxClass.vatRate) {
        const vatRate = taxClass.vatRate / 100 // Convert percentage to decimal
        const vatAmount = amount * vatRate
        
        // Determine if it's input VAT (expense) or output VAT (income)
        const isInputVAT = txn.type === 'expense'
        
        if (isInputVAT) {
          totalVATInput += vatAmount
        } else {
          totalVATOutput += vatAmount
        }
        
        vatDetails.push({
          transactionId: txn.id || '',
          description: txn.description || 'VAT Transaction',
          amount,
          vatRate: taxClass.vatRate,
          vatAmount,
          type: isInputVAT ? 'input' : 'output'
        })
      }
    }

    return {
      capitalAllowances: Math.round(totalCapitalAllowances * 100) / 100, // Round to 2 decimal places
      whtCredits: Math.round(totalWHTCredits * 100) / 100,
      vatInput: Math.round(totalVATInput * 100) / 100,
      vatOutput: Math.round(totalVATOutput * 100) / 100,
      capitalAllowanceDetails,
      whtCreditDetails,
      vatDetails
    }
  } catch (error) {
    console.error('Error calculating tax classification benefits:', error)
    // Return empty summary on error
    return {
      capitalAllowances: 0,
      whtCredits: 0,
      vatInput: 0,
      vatOutput: 0,
      capitalAllowanceDetails: [],
      whtCreditDetails: [],
      vatDetails: []
    }
  }
}

/**
 * Calculate capital allowances and WHT credits from a list of transactions
 * Useful when you already have the transactions loaded
 * 
 * @param transactions - Array of transactions to process
 * @param userId - Optional user ID for multi-year depreciation calculation
 * @param taxYear - Optional tax year for multi-year depreciation calculation
 * @returns Summary of capital allowances and WHT credits
 */
export async function calculateTaxClassificationBenefitsFromTransactions(
  transactions: Transaction[],
  userId?: string,
  taxYear?: number
): Promise<TaxClassificationSummary> {
  let totalCapitalAllowances = 0
  let totalWHTCredits = 0
  let totalVATInput = 0
  let totalVATOutput = 0
  const capitalAllowanceDetails: TaxClassificationSummary['capitalAllowanceDetails'] = []
  const whtCreditDetails: TaxClassificationSummary['whtCreditDetails'] = []
  const vatDetails: TaxClassificationSummary['vatDetails'] = []

  // If userId and taxYear are provided, use multi-year depreciation from capital asset service
  if (userId && taxYear) {
    try {
      console.log('🔍 [TaxClassification] Calculating capital allowances for userId:', userId, 'taxYear:', taxYear)
      console.log('🔍 [TaxClassification] Transactions passed in:', transactions.length, transactions.filter(t => t.type === 'expense' && t.taxClassification?.isCapitalAsset).map(t => ({
        id: t.id,
        description: t.description,
        date: t.date,
        isCapitalAsset: t.taxClassification?.isCapitalAsset
      })))
      
      // First, try to backfill any missing capital assets from transactions
      // This handles cases where transactions were created before the capital asset service was implemented
      const capitalAssetTransactions = transactions.filter(txn => 
        txn.type === 'expense' && 
        txn.taxClassification?.isCapitalAsset && 
        txn.taxClassification?.capitalAllowanceRate &&
        txn.id
      )
      
      console.log('🔍 [TaxClassification] Capital asset transactions found:', capitalAssetTransactions.length, capitalAssetTransactions.map(t => ({
        id: t.id,
        description: t.description,
        date: t.date
      })))
      
      for (const txn of capitalAssetTransactions) {
        try {
          // Check if asset already exists
          const existingAssets = await capitalAssetService.getAll([
            { field: 'userId', operator: '==', value: userId },
            { field: 'transactionId', operator: '==', value: txn.id }
          ])
          
          console.log('🔍 [TaxClassification] Checking asset for transaction:', txn.id, 'existing:', existingAssets.length)
          
          // Create asset if it doesn't exist
          if (existingAssets.length === 0) {
            console.log('🔍 [TaxClassification] Creating capital asset for transaction:', txn.id)
            await capitalAssetService.createOrUpdateAssetFromTransaction(txn)
          }
        } catch (error) {
          console.error(`Error backfilling capital asset for transaction ${txn.id}:`, error)
          // Continue with other transactions
        }
      }
      
      const { totalAllowances, assetDetails } = await capitalAssetService.getCapitalAllowancesForYear(userId, taxYear)
      console.log('🔍 [TaxClassification] Capital allowances from service:', {
        totalAllowances,
        assetDetailsCount: assetDetails.length,
        assetDetails: assetDetails.map(a => ({
          transactionId: a.asset.transactionId,
          description: a.asset.description,
          purchaseYear: a.asset.purchaseYear,
          depreciationAmount: a.depreciationAmount
        }))
      })
      
      totalCapitalAllowances = totalAllowances
      
      for (const { asset, depreciationAmount, bookValueAfter } of assetDetails) {
        const yearsSincePurchase = taxYear - asset.purchaseYear
        capitalAllowanceDetails.push({
          transactionId: asset.transactionId,
          description: asset.description,
          originalCost: asset.originalCost,
          purchaseYear: asset.purchaseYear,
          allowanceRate: asset.capitalAllowanceRate,
          allowanceAmount: depreciationAmount,
          bookValueAfter,
          yearsSincePurchase
        })
      }
    } catch (error) {
      console.error('Error calculating capital allowances from asset service:', error)
      // Fall through to transaction-based calculation
    }
  }

  // Process transactions for WHT and VAT (and capital allowances if not using asset service)
  for (const txn of transactions) {
    if (!txn.taxClassification) continue

    const taxClass = txn.taxClassification
    const amount = typeof txn.amount === 'number' 
      ? txn.amount 
      : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0

    // Calculate capital allowances (only if not using asset service)
    if (!userId || !taxYear) {
      if (taxClass.isCapitalAsset && taxClass.capitalAllowanceRate) {
        const allowanceRate = taxClass.capitalAllowanceRate / 100
        const allowanceAmount = amount * allowanceRate
        
        totalCapitalAllowances += allowanceAmount
        
        capitalAllowanceDetails.push({
          transactionId: txn.id || '',
          description: txn.description || 'Capital Asset',
          originalCost: amount,
          purchaseYear: txn.date ? new Date(txn.date).getFullYear() : new Date().getFullYear(),
          allowanceRate: taxClass.capitalAllowanceRate,
          allowanceAmount,
          bookValueAfter: amount - allowanceAmount,
          yearsSincePurchase: 0
        })
      }
    }

    // Calculate WHT credits
    if (taxClass.whtCreditable) {
      let whtAmount = 0
      
      if (taxClass.whtAmount !== undefined) {
        whtAmount = taxClass.whtAmount
      } else if (taxClass.whtRate) {
        const whtRate = taxClass.whtRate / 100
        whtAmount = amount * whtRate
      }
      
      if (whtAmount > 0) {
        totalWHTCredits += whtAmount
        
        whtCreditDetails.push({
          transactionId: txn.id || '',
          description: txn.description || 'WHT Credit',
          amount,
          whtRate: taxClass.whtRate || 0,
          whtAmount
        })
      }
    }

    // Calculate VAT
    if (taxClass.vatApplicable && taxClass.vatRate) {
      const vatRate = taxClass.vatRate / 100
      const vatAmount = amount * vatRate
      
      const isInputVAT = txn.type === 'expense'
      
      if (isInputVAT) {
        totalVATInput += vatAmount
      } else {
        totalVATOutput += vatAmount
      }
      
      vatDetails.push({
        transactionId: txn.id || '',
        description: txn.description || 'VAT Transaction',
        amount,
        vatRate: taxClass.vatRate,
        vatAmount,
        type: isInputVAT ? 'input' : 'output'
      })
    }
  }

  return {
    capitalAllowances: Math.round(totalCapitalAllowances * 100) / 100,
    whtCredits: Math.round(totalWHTCredits * 100) / 100,
    vatInput: Math.round(totalVATInput * 100) / 100,
    vatOutput: Math.round(totalVATOutput * 100) / 100,
    capitalAllowanceDetails,
    whtCreditDetails,
    vatDetails
  }
}

