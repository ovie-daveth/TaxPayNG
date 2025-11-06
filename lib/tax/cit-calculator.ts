/**
 * Company Income Tax (CIT) Calculator for Nigerian Tax System
 * Based on Nigeria Tax Act 2025
 * 
 * Rules:
 * - Small companies (turnover ≤ ₦100M AND assets ≤ ₦250M) → 0% CIT
 * - Other companies → 30% CIT
 * - Large multinationals (turnover ≥ ₦50B) → minimum 15% ETR rule
 */

export interface CITDeduction {
  id: string
  category: string
  description: string
  amount: number
  notes?: string
}

export interface CapitalAllowance {
  id: string
  assetDescription: string
  assetCost: number
  assetCategory: "building" | "furniture" | "equipment" | "vehicle" | "computer" | "other"
  allowanceRate: number // Percentage
  allowanceAmount: number
}

export interface CITInput {
  // Company status
  annualTurnover: number
  totalFixedAssets: number
  
  // Minimal mode inputs
  profitBeforeTax?: number // Net profit after operating expenses but before CIT
  totalDeductions?: number // Total allowable deductions (if minimal mode)
  
  // Full mode inputs
  revenue?: number // Total revenue/sales
  costOfGoodsSold?: number // COGS
  operatingExpenses?: {
    employeeCosts?: number // Salaries, wages, bonuses
    pensionContributions?: number // Employer pension contributions
    trainingCosts?: number // Staff training expenses
    rent?: number // Office rent
    utilities?: number // Electricity, water, internet
    repairsMaintenance?: number // Repairs and maintenance (not capital improvements)
    professionalFees?: number // Accountants, lawyers, auditors, consultants
    interestOnLoans?: number // Interest on business loans
    badDebts?: number // Bad debts written off
    donations?: number // Donations to approved charities/educational institutions
    insurancePremiums?: number // Business insurance
    staffWelfare?: number // Staff welfare, allowances, meals
    transportation?: number // Approved transport subsidies
    otherExpenses?: number // Other allowable expenses
  }
  
  capitalAllowances?: CapitalAllowance[] // Capital allowances by asset
  
  // Period
  period: "monthly" | "quarterly" | "yearly"
}

export interface CITResult {
  // Company status
  isSmallCompany: boolean
  isLargeMultinational: boolean
  annualTurnover: number
  totalFixedAssets: number
  
  // Revenue and expenses (full mode)
  revenue?: number
  costOfGoodsSold?: number
  totalOperatingExpenses?: number
  operatingExpensesBreakdown?: Record<string, number>
  
  // Profit calculation
  profitBeforeTax: number
  totalDeductions: number
  capitalAllowancesTotal: number
  taxableProfit: number
  
  // CIT calculation
  citRate: number
  citAmount: number
  effectiveTaxRate?: number // For large multinationals
  topUpTax?: number // If ETR < 15% for large multinationals
  totalCITPayable: number
  
  // Period breakdown
  period: "monthly" | "quarterly" | "yearly"
  periodCIT: number
  monthlySetAside: number
  quarterlySetAside: number
  
  // Deductions breakdown
  deductionsBreakdown?: CITDeduction[]
  capitalAllowances?: CapitalAllowance[]
}

/**
 * Check if company qualifies as small company (0% CIT)
 */
export function isSmallCompany(turnover: number, totalFixedAssets: number): boolean {
  return turnover <= 100_000_000 && totalFixedAssets <= 250_000_000
}

/**
 * Check if company is large multinational (subject to 15% ETR rule)
 */
export function isLargeMultinational(turnover: number): boolean {
  return turnover >= 50_000_000_000 // ₦50 billion
}

/**
 * Get capital allowance rate by asset category
 */
export function getCapitalAllowanceRate(category: CapitalAllowance["assetCategory"]): number {
  const rates: Record<CapitalAllowance["assetCategory"], number> = {
    building: 10, // 10% per year
    furniture: 25, // 25% per year
    equipment: 25, // 25% per year
    vehicle: 25, // 25% per year
    computer: 25, // 25% per year
    other: 25, // 25% per year (default)
  }
  return rates[category] || 25
}

/**
 * Calculate comprehensive CIT for a company
 */
export function calculateCIT(input: CITInput): CITResult {
  const {
    annualTurnover,
    totalFixedAssets,
    profitBeforeTax,
    totalDeductions,
    revenue,
    costOfGoodsSold,
    operatingExpenses,
    capitalAllowances,
    period
  } = input
  
  // Check company status
  const isSmall = isSmallCompany(annualTurnover, totalFixedAssets)
  const isLargeMulti = isLargeMultinational(annualTurnover)
  
  // Calculate profit and deductions based on mode
  let calculatedProfitBeforeTax = 0
  let calculatedTotalDeductions = 0
  let operatingExpensesBreakdown: Record<string, number> = {}
  let deductionsBreakdown: CITDeduction[] = []
  
  if (profitBeforeTax !== undefined && totalDeductions !== undefined) {
    // Minimal mode - use provided values
    calculatedProfitBeforeTax = profitBeforeTax
    calculatedTotalDeductions = totalDeductions
  } else if (revenue !== undefined) {
    // Full mode - calculate from revenue and expenses
    const cogs = costOfGoodsSold || 0
    const grossProfit = revenue - cogs
    
    // Calculate total operating expenses
    const expenses = operatingExpenses || {}
    const totalExpenses = 
      (expenses.employeeCosts || 0) +
      (expenses.pensionContributions || 0) +
      (expenses.trainingCosts || 0) +
      (expenses.rent || 0) +
      (expenses.utilities || 0) +
      (expenses.repairsMaintenance || 0) +
      (expenses.professionalFees || 0) +
      (expenses.interestOnLoans || 0) +
      (expenses.badDebts || 0) +
      (expenses.donations || 0) +
      (expenses.insurancePremiums || 0) +
      (expenses.staffWelfare || 0) +
      (expenses.transportation || 0) +
      (expenses.otherExpenses || 0)
    
    calculatedProfitBeforeTax = grossProfit - totalExpenses
    operatingExpensesBreakdown = {
      costOfGoodsSold: cogs,
      employeeCosts: expenses.employeeCosts || 0,
      pensionContributions: expenses.pensionContributions || 0,
      trainingCosts: expenses.trainingCosts || 0,
      rent: expenses.rent || 0,
      utilities: expenses.utilities || 0,
      repairsMaintenance: expenses.repairsMaintenance || 0,
      professionalFees: expenses.professionalFees || 0,
      interestOnLoans: expenses.interestOnLoans || 0,
      badDebts: expenses.badDebts || 0,
      donations: expenses.donations || 0,
      insurancePremiums: expenses.insurancePremiums || 0,
      staffWelfare: expenses.staffWelfare || 0,
      transportation: expenses.transportation || 0,
      otherExpenses: expenses.otherExpenses || 0,
    }
    
    // Build deductions breakdown
    const categories = [
      { key: "employeeCosts", label: "Employee Costs" },
      { key: "pensionContributions", label: "Pension Contributions" },
      { key: "trainingCosts", label: "Training Costs" },
      { key: "rent", label: "Rent" },
      { key: "utilities", label: "Utilities" },
      { key: "repairsMaintenance", label: "Repairs & Maintenance" },
      { key: "professionalFees", label: "Professional Fees" },
      { key: "interestOnLoans", label: "Interest on Loans" },
      { key: "badDebts", label: "Bad Debts Written Off" },
      { key: "donations", label: "Donations (Approved)" },
      { key: "insurancePremiums", label: "Insurance Premiums" },
      { key: "staffWelfare", label: "Staff Welfare" },
      { key: "transportation", label: "Transportation" },
      { key: "otherExpenses", label: "Other Expenses" },
    ]
    
    categories.forEach(({ key, label }) => {
      const amount = operatingExpensesBreakdown[key] || 0
      if (amount > 0) {
        deductionsBreakdown.push({
          id: key,
          category: label,
          description: label,
          amount: amount
        })
      }
    })
    
    // Operating expenses are already deducted from profit, so they're the deductions
    calculatedTotalDeductions = totalExpenses
  } else {
    // Fallback - use defaults
    calculatedProfitBeforeTax = profitBeforeTax || 0
    calculatedTotalDeductions = totalDeductions || 0
  }
  
  // Calculate capital allowances
  let capitalAllowancesTotal = 0
  const calculatedCapitalAllowances: CapitalAllowance[] = []
  
  if (capitalAllowances && capitalAllowances.length > 0) {
    capitalAllowances.forEach((asset) => {
      const rate = asset.allowanceRate || getCapitalAllowanceRate(asset.assetCategory)
      const allowanceAmount = (asset.assetCost * rate) / 100
      capitalAllowancesTotal += allowanceAmount
      
      calculatedCapitalAllowances.push({
        ...asset,
        allowanceRate: rate,
        allowanceAmount
      })
    })
  }
  
  // Total deductions = operating expenses deductions + capital allowances
  const totalDeductionsIncludingCapital = calculatedTotalDeductions + capitalAllowancesTotal
  
  // Calculate taxable profit
  const taxableProfit = Math.max(calculatedProfitBeforeTax - totalDeductionsIncludingCapital, 0)
  
  // Calculate CIT
  let citRate = 0
  let citAmount = 0
  let effectiveTaxRate = 0
  let topUpTax = 0
  
  if (isSmall) {
    citRate = 0
    citAmount = 0
  } else {
    citRate = 30 // 30% for other companies
    citAmount = (taxableProfit * citRate) / 100
    
    // Check 15% ETR rule for large multinationals
    if (isLargeMulti && calculatedProfitBeforeTax > 0) {
      effectiveTaxRate = (citAmount / calculatedProfitBeforeTax) * 100
      
      if (effectiveTaxRate < 15) {
        const minimumTax = (calculatedProfitBeforeTax * 15) / 100
        topUpTax = Math.max(minimumTax - citAmount, 0)
        citAmount = minimumTax
      }
    }
  }
  
  const totalCITPayable = citAmount
  
  // Calculate period-specific amounts
  let periodCIT = totalCITPayable
  let monthlySetAside = totalCITPayable / 12
  let quarterlySetAside = totalCITPayable / 4
  
  if (period === "monthly") {
    periodCIT = totalCITPayable / 12
  } else if (period === "quarterly") {
    periodCIT = totalCITPayable / 4
  }
  
  return {
    isSmallCompany: isSmall,
    isLargeMultinational: isLargeMulti,
    annualTurnover,
    totalFixedAssets,
    revenue,
    costOfGoodsSold,
    totalOperatingExpenses: calculatedTotalDeductions,
    operatingExpensesBreakdown,
    profitBeforeTax: calculatedProfitBeforeTax,
    totalDeductions: calculatedTotalDeductions,
    capitalAllowancesTotal,
    taxableProfit,
    citRate,
    citAmount,
    effectiveTaxRate: isLargeMulti ? effectiveTaxRate : undefined,
    topUpTax: topUpTax > 0 ? topUpTax : undefined,
    totalCITPayable,
    period,
    periodCIT,
    monthlySetAside,
    quarterlySetAside,
    deductionsBreakdown: deductionsBreakdown.length > 0 ? deductionsBreakdown : undefined,
    capitalAllowances: calculatedCapitalAllowances.length > 0 ? calculatedCapitalAllowances : undefined,
  }
}

