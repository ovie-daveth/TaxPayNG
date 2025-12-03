import type { Transaction } from "@/lib/types"

export type PeriodType = "quarter" | "year"

export type CalculationDetailsType = {
  ytdIncome: number
  ytdExpenses: number
  ytdReliefs: number
  quartersElapsed: number
  quartersRemaining: number
  monthsInCurrentQuarter: number
  monthsRemainingInQuarter: number
  avgMonthlyIncomeInQuarter: number
  avgMonthlyExpensesInQuarter: number
  avgMonthlyReliefsInQuarter: number
  avgQuarterlyIncome: number
  avgQuarterlyExpenses: number
  avgQuarterlyReliefs: number
  projectedAnnualIncome: number
  projectedAnnualExpenses: number
  projectedAnnualReliefs: number
  projectedTaxableIncome: number
  estimatedTax: number
  effectiveRate: number
  periodType: PeriodType
}

export type TaxRecommendationResult = {
  taxAdvice: string
  reserveTarget: number
  isLowEarner: boolean
  calculationDetails: CalculationDetailsType
}

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`

export function calculateTaxRecommendation(params: {
  currentIncomeTotal: number
  currentExpenseTotal: number
  reliefTotal: number
  ytdIncome: number
  ytdExpenses: number
  ytdReliefs: number
  yearToDateTransactions: Transaction[]
  periodType: PeriodType
  effectiveYear: number
  effectiveQuarter: number
}): TaxRecommendationResult {
  const {
    currentIncomeTotal,
    currentExpenseTotal,
    reliefTotal,
    ytdIncome,
    ytdExpenses,
    ytdReliefs,
    periodType,
    effectiveYear,
    effectiveQuarter,
  } = params

  // Get current date to calculate months completed/remaining
  const now = new Date()
  const currentMonth = now.getMonth() + 1 // 1-12 (January = 1, December = 12)
  const currentYear = now.getFullYear()

  // Calculate months completed YTD (not based on quarters)
  // If viewing current year, use actual months elapsed; otherwise assume full year
  const isCurrentYear = effectiveYear === currentYear
  const monthsCompleted = isCurrentYear ? currentMonth : 12
  const monthsRemaining = 12 - monthsCompleted

  // Calculate monthly averages from YTD data (this is the key change)
  const avgMonthlyIncome = monthsCompleted > 0 ? ytdIncome / monthsCompleted : 0
  const avgMonthlyExpenses = monthsCompleted > 0 ? ytdExpenses / monthsCompleted : 0
  const avgMonthlyReliefs = monthsCompleted > 0 ? ytdReliefs / monthsCompleted : 0

  // Project remaining months based on monthly averages
  const projectedRemainingMonthsIncome = avgMonthlyIncome * monthsRemaining
  const projectedRemainingMonthsExpenses = avgMonthlyExpenses * monthsRemaining
  const projectedRemainingMonthsReliefs = avgMonthlyReliefs * monthsRemaining

  // Calculate projected annual totals (actual YTD + projected remaining)
  const projectedAnnualIncome = ytdIncome + projectedRemainingMonthsIncome
  const projectedAnnualExpenses = ytdExpenses + projectedRemainingMonthsExpenses
  const projectedAnnualReliefs = ytdReliefs + projectedRemainingMonthsReliefs

  // Tax exemption threshold: Gross income ≤ ₦1,200,000 is completely exempt
  const GROSS_INCOME_EXEMPTION_THRESHOLD = 1200000

  // Calculate taxable income (income - expenses - reliefs)
  const projectedTaxableIncome = Math.max(
    0,
    projectedAnnualIncome - projectedAnnualExpenses - projectedAnnualReliefs
  )

  // Nigeria PIT brackets (as specified by user)
  // First ₦300,000 → 7%
  // Next ₦300,000 → 11%
  // Next ₦500,000 → 15%
  // Next ₦500,000 → 19%
  // Next ₦1,600,000 → 21%
  // Above ₦3,200,000 → 24%
  const calculateNigerianPIT = (taxableIncome: number): number => {
    if (taxableIncome <= 0) return 0

    let remainingIncome = taxableIncome
    let totalTax = 0

    // First ₦300,000 → 7%
    if (remainingIncome > 0) {
      const amount = Math.min(remainingIncome, 300000)
      totalTax += amount * 0.07
      remainingIncome -= amount
    }

    // Next ₦300,000 → 11%
    if (remainingIncome > 0) {
      const amount = Math.min(remainingIncome, 300000)
      totalTax += amount * 0.11
      remainingIncome -= amount
    }

    // Next ₦500,000 → 15%
    if (remainingIncome > 0) {
      const amount = Math.min(remainingIncome, 500000)
      totalTax += amount * 0.15
      remainingIncome -= amount
    }

    // Next ₦500,000 → 19%
    if (remainingIncome > 0) {
      const amount = Math.min(remainingIncome, 500000)
      totalTax += amount * 0.19
      remainingIncome -= amount
    }

    // Next ₦1,600,000 → 21%
    if (remainingIncome > 0) {
      const amount = Math.min(remainingIncome, 1600000)
      totalTax += amount * 0.21
      remainingIncome -= amount
    }

    // Above ₦3,200,000 → 24%
    if (remainingIncome > 0) {
      totalTax += remainingIncome * 0.24
    }

    return totalTax
  }

  let taxAdvice: string
  let reserveTarget: number
  let isLowEarner = false

  // Check if gross income is below exemption threshold
  if (projectedAnnualIncome <= GROSS_INCOME_EXEMPTION_THRESHOLD) {
    // Completely tax-free - gross income at or below ₦1,200,000
    isLowEarner = true
    taxAdvice = `Your projected annual gross income (${formatCurrency(projectedAnnualIncome)}) is at or below ₦1,200,000. You are completely exempt from tax.`
    reserveTarget = 0
  } else if (projectedTaxableIncome <= 0) {
    // Taxable income is zero or negative after expenses and reliefs
    isLowEarner = true
    taxAdvice = `Your projected annual taxable income is ₦0 or negative after expenses and reliefs. You may not owe any tax this year.`
    reserveTarget = 0
  } else {
    // Calculate tax using progressive PIT brackets
    const estimatedTax = calculateNigerianPIT(projectedTaxableIncome)
    reserveTarget = estimatedTax
    const calculatedEffectiveRate = (estimatedTax / projectedTaxableIncome) * 100

    if (projectedTaxableIncome <= 300000) {
      isLowEarner = true
      taxAdvice = `Your projected annual taxable income (${formatCurrency(projectedTaxableIncome)}) falls in the 7% bracket. Estimated tax: ${formatCurrency(estimatedTax)} (effective rate: ${calculatedEffectiveRate.toFixed(1)}%).`
    } else if (projectedTaxableIncome <= 600000) {
      isLowEarner = true
      taxAdvice = `Your projected annual taxable income (${formatCurrency(projectedTaxableIncome)}) falls in the 11% bracket. Estimated tax: ${formatCurrency(estimatedTax)} (effective rate: ${calculatedEffectiveRate.toFixed(1)}%).`
    } else if (projectedTaxableIncome <= 1100000) {
      isLowEarner = true
      taxAdvice = `Your projected annual taxable income (${formatCurrency(projectedTaxableIncome)}) falls in the 15% bracket. Estimated tax: ${formatCurrency(estimatedTax)} (effective rate: ${calculatedEffectiveRate.toFixed(1)}%).`
    } else if (projectedTaxableIncome <= 1600000) {
      taxAdvice = `Your projected annual taxable income (${formatCurrency(projectedTaxableIncome)}) falls in the 19% bracket. Estimated tax: ${formatCurrency(estimatedTax)} (effective rate: ${calculatedEffectiveRate.toFixed(1)}%).`
    } else if (projectedTaxableIncome <= 3200000) {
      taxAdvice = `Your projected annual taxable income (${formatCurrency(projectedTaxableIncome)}) falls in the 21% bracket. Estimated tax: ${formatCurrency(estimatedTax)} (effective rate: ${calculatedEffectiveRate.toFixed(1)}%).`
    } else {
      taxAdvice = `Your projected annual taxable income (${formatCurrency(projectedTaxableIncome)}) is above ₦3,200,000. Estimated tax: ${formatCurrency(estimatedTax)} (effective rate: ${calculatedEffectiveRate.toFixed(1)}%).`
    }
  }

  const effectiveRate =
    reserveTarget > 0 && projectedTaxableIncome > 0 ? (reserveTarget / projectedTaxableIncome) * 100 : 0

  // Calculate detailed breakdown for display (month-based, not quarter-based)
  // For quarter view, calculate months in current quarter for display purposes
  let monthsInCurrentQuarter = 3
  let monthsRemainingInQuarter = 0
  let avgMonthlyIncomeInQuarter = 0
  let avgMonthlyExpensesInQuarter = 0
  let avgMonthlyReliefsInQuarter = 0
  let completedQuarters = 0
  let quartersRemaining = 0
  let avgQuarterlyIncome = 0
  let avgQuarterlyExpenses = 0
  let avgQuarterlyReliefs = 0

  if (periodType === "quarter") {
    // Calculate quarter info for display purposes only
    const isCurrentYear = effectiveYear === currentYear
    const isCurrentOrPastQuarter = effectiveQuarter <= Math.ceil(currentMonth / 3)

    const quarterStartMonth = (effectiveQuarter - 1) * 3 + 1
    monthsInCurrentQuarter =
      isCurrentYear && isCurrentOrPastQuarter ? Math.max(0, currentMonth - quarterStartMonth + 1) : 3
    monthsRemainingInQuarter = Math.max(0, 3 - monthsInCurrentQuarter)

    completedQuarters = Math.max(0, effectiveQuarter - 1)
    quartersRemaining = 4 - effectiveQuarter

    avgMonthlyIncomeInQuarter = monthsInCurrentQuarter > 0 ? currentIncomeTotal / monthsInCurrentQuarter : 0
    avgMonthlyExpensesInQuarter =
      monthsInCurrentQuarter > 0 ? currentExpenseTotal / monthsInCurrentQuarter : 0
    avgMonthlyReliefsInQuarter = monthsInCurrentQuarter > 0 ? reliefTotal / monthsInCurrentQuarter : 0

    // Calculate quarterly averages from monthly averages (for display)
    avgQuarterlyIncome = avgMonthlyIncome * 3
    avgQuarterlyExpenses = avgMonthlyExpenses * 3
    avgQuarterlyReliefs = avgMonthlyReliefs * 3
  } else {
    // For year view, calculate from monthly averages
    completedQuarters = Math.ceil(monthsCompleted / 3)
    quartersRemaining = 4 - completedQuarters
    avgQuarterlyIncome = avgMonthlyIncome * 3
    avgQuarterlyExpenses = avgMonthlyExpenses * 3
    avgQuarterlyReliefs = avgMonthlyReliefs * 3
  }

  return {
    taxAdvice,
    reserveTarget,
    isLowEarner,
    calculationDetails: {
      ytdIncome,
      ytdExpenses,
      ytdReliefs,
      quartersElapsed: completedQuarters,
      quartersRemaining,
      monthsInCurrentQuarter,
      monthsRemainingInQuarter,
      avgMonthlyIncomeInQuarter,
      avgMonthlyExpensesInQuarter,
      avgMonthlyReliefsInQuarter,
      avgQuarterlyIncome,
      avgQuarterlyExpenses,
      avgQuarterlyReliefs,
      projectedAnnualIncome,
      projectedAnnualExpenses,
      projectedAnnualReliefs,
      projectedTaxableIncome,
      estimatedTax: reserveTarget,
      effectiveRate,
      periodType,
    },
  }
}

