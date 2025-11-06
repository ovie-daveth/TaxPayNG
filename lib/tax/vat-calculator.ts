/**
 * VAT Calculator for Nigerian Tax System
 * Handles Output VAT, Input VAT, and Net VAT calculations
 */

import { VAT_RATE, VAT_EXEMPT_SUPPLIES, VAT_ZERO_RATED_SUPPLIES, isVATExempt, type VATSupplyStatus } from "./vat-config"

export interface VATSupply {
  id: string
  description: string
  amount: number
  status: VATSupplyStatus
  category?: string
}

export interface VATInputEntry {
  id: string
  description: string
  amount: number
  category: "services" | "capital-assets" | "overheads" | "goods"
  eligibleForCredit: boolean
}

export interface VATCalculationResult {
  // Company status
  isSmallCompany: boolean
  annualTurnover: number
  
  // Output VAT (VAT charged on sales)
  supplies: VATSupply[]
  totalTaxableSupplies: number
  totalExemptSupplies: number
  totalZeroRatedSupplies: number
  totalSupplies: number
  outputVAT: number
  
  // Input VAT (VAT paid on purchases)
  inputVATEntries: VATInputEntry[]
  totalInputVAT: number
  eligibleInputVAT: number
  
  // Net VAT
  netVATPayable: number
  
  // Period info
  period: "monthly" | "quarterly" | "yearly"
  periodOutputVAT: number
  periodNetVAT: number
  
  // Annual projections
  annualOutputVATProjection: number
  annualNetVATProjection: number
}

/**
 * Calculate comprehensive VAT for a business
 */
export function calculateVAT(input: {
  annualTurnover: number
  supplies: VATSupply[]
  inputVATEntries: VATInputEntry[]
  period: "monthly" | "quarterly" | "yearly"
  vatRate?: number
}): VATCalculationResult {
  const { annualTurnover, supplies, inputVATEntries, period, vatRate = VAT_RATE } = input
  
  const isSmallCompany = isVATExempt(annualTurnover)
  
  // Calculate output VAT for each supply
  const suppliesWithVAT = supplies.map(supply => {
    const vatAmount = supply.status === "taxable" && !isSmallCompany
      ? (supply.amount * vatRate) / 100
      : 0
    
    return {
      ...supply,
      vatAmount,
      totalAmount: supply.amount + vatAmount,
    }
  })
  
  // Calculate totals by status (for the period entered)
  const totalTaxableSupplies = supplies
    .filter(s => s.status === "taxable")
    .reduce((sum, s) => sum + s.amount, 0)
  
  const totalExemptSupplies = supplies
    .filter(s => s.status === "exempt")
    .reduce((sum, s) => sum + s.amount, 0)
  
  const totalZeroRatedSupplies = supplies
    .filter(s => s.status === "zero-rated")
    .reduce((sum, s) => sum + s.amount, 0)
  
  // Total supplies (all types)
  const totalSupplies = totalTaxableSupplies + totalExemptSupplies + totalZeroRatedSupplies
  
  // Output VAT (only on taxable supplies, and only if not small company)
  const outputVAT = isSmallCompany 
    ? 0 
    : suppliesWithVAT.reduce((sum, s) => sum + (s.vatAmount || 0), 0)
  
  // Input VAT calculations
  const totalInputVAT = inputVATEntries.reduce((sum, entry) => sum + entry.amount, 0)
  
  // Eligible input VAT (can claim credit on goods, services, capital assets, and overheads used for taxable supplies)
  const eligibleInputVAT = inputVATEntries
    .filter(entry => entry.eligibleForCredit)
    .reduce((sum, entry) => sum + entry.amount, 0)
  
  // Net VAT payable (Output VAT - Eligible Input VAT)
  const netVATPayable = Math.max(outputVAT - eligibleInputVAT, 0)
  
  // Period calculations
  let periodOutputVAT = outputVAT
  let periodNetVAT = netVATPayable
  
  if (period === "monthly") {
    // Values are already for the month, calculate annual projection
  } else if (period === "quarterly") {
    // Values are for the quarter, calculate annual projection
  }
  // If yearly, values are already annual
  
  // Annual projections
  let annualOutputVATProjection = outputVAT
  let annualNetVATProjection = netVATPayable
  
  if (period === "monthly") {
    annualOutputVATProjection = outputVAT * 12
    annualNetVATProjection = netVATPayable * 12
  } else if (period === "quarterly") {
    annualOutputVATProjection = outputVAT * 4
    annualNetVATProjection = netVATPayable * 4
  }
  
  return {
    isSmallCompany,
    annualTurnover,
    supplies: suppliesWithVAT,
    totalTaxableSupplies,
    totalExemptSupplies,
    totalZeroRatedSupplies,
    totalSupplies,
    outputVAT,
    inputVATEntries,
    totalInputVAT,
    eligibleInputVAT,
    netVATPayable,
    period,
    periodOutputVAT,
    periodNetVAT,
    annualOutputVATProjection,
    annualNetVATProjection,
  }
}

