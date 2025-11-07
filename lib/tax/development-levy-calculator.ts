/**
 * Development Levy Calculator for Nigerian Tax System
 * Based on new tax regime
 * 
 * Rate Schedule:
 * - 4% for Years 2025-2026
 * - 3% for Years 2027-2029
 * - 2% from Year 2030 onwards
 */

export interface DevelopmentLevyInput {
  assessableProfit: number // Profit before tax depreciation and losses
  annualTurnover: number // For small company exemption check
  totalFixedAssets: number // For small company exemption check
  year?: number // Year of Assessment (defaults to current year)
  period: "monthly" | "quarterly" | "yearly"
}

export interface DevelopmentLevyResult {
  // Company status
  isSmallCompany: boolean
  annualTurnover: number
  totalFixedAssets: number
  
  // Assessment
  assessableProfit: number
  originalInputProfit: number // Original input before annualization
  originalInputTurnover: number // Original input before annualization
  
  // Levy calculation
  levyRate: number // Effective rate based on year
  levyAmount: number // Annual levy amount
  
  // Period breakdown
  period: "monthly" | "quarterly" | "yearly"
  periodLevy: number
  monthlySetAside: number
  quarterlySetAside: number
  
  // Year info
  yearOfAssessment: number
}

/**
 * Get the Development Levy rate based on year of assessment
 */
export function getDevelopmentLevyRate(year: number = new Date().getFullYear()): number {
  if (year >= 2025 && year <= 2026) {
    return 4 // 4% for 2025-2026
  } else if (year >= 2027 && year <= 2029) {
    return 3 // 3% for 2027-2029
  } else if (year >= 2030) {
    return 2 // 2% from 2030 onwards
  }
  
  // Default to 4% for current year if before 2025
  return 4
}

/**
 * Check if company qualifies as small company (exempt from Development Levy)
 */
export function isSmallCompany(turnover: number, totalFixedAssets: number): boolean {
  return turnover <= 100_000_000 && totalFixedAssets <= 250_000_000
}

/**
 * Calculate Development Levy for a company
 */
export function calculateDevelopmentLevy(input: DevelopmentLevyInput): DevelopmentLevyResult {
  const { 
    assessableProfit, 
    annualTurnover, 
    totalFixedAssets, 
    year = new Date().getFullYear(),
    period 
  } = input
  
  // Check if small company (exempt)
  const isSmall = isSmallCompany(annualTurnover, totalFixedAssets)
  
  // Get levy rate based on year
  const levyRate = isSmall ? 0 : getDevelopmentLevyRate(year)
  
  // Calculate annual levy (4% of assessable profits)
  const levyAmount = isSmall ? 0 : (assessableProfit * levyRate) / 100
  
  // Calculate period-specific amounts
  let periodLevy = levyAmount
  let monthlySetAside = levyAmount / 12
  let quarterlySetAside = levyAmount / 4
  
  if (period === "monthly") {
    periodLevy = levyAmount / 12
  } else if (period === "quarterly") {
    periodLevy = levyAmount / 4
  }
  
  return {
    isSmallCompany: isSmall,
    annualTurnover,
    totalFixedAssets,
    assessableProfit,
    originalInputProfit: input.assessableProfit, // Will be set by caller if annualization occurred
    originalInputTurnover: input.annualTurnover, // Will be set by caller if annualization occurred
    levyRate,
    levyAmount,
    period,
    periodLevy,
    monthlySetAside,
    quarterlySetAside,
    yearOfAssessment: year,
  }
}

