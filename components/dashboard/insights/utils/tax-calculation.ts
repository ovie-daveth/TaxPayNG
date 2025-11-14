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

  // Project annual income based on actual year-to-date data
  let projectedAnnualIncome: number
  let projectedAnnualExpenses: number
  let projectedAnnualReliefs: number

  if (periodType === "year") {
    // For year view, use actual data
    projectedAnnualIncome = ytdIncome
    projectedAnnualExpenses = ytdExpenses
    projectedAnnualReliefs = ytdReliefs
  } else {
    // For quarter view, calculate based on year-to-date and remaining time
    const now = new Date()
    const currentMonth = now.getMonth() + 1 // 1-12
    const currentYear = now.getFullYear()

    // Check if we're looking at the current year and current/previous quarters
    const isCurrentYear = effectiveYear === currentYear
    const isCurrentOrPastQuarter = effectiveQuarter <= Math.ceil(currentMonth / 3)

    // Calculate months elapsed in the current quarter
    const quarterStartMonth = (effectiveQuarter - 1) * 3 + 1 // Q1=1, Q2=4, Q3=7, Q4=10
    const monthsInCurrentQuarter = isCurrentYear && isCurrentOrPastQuarter
      ? Math.max(0, currentMonth - quarterStartMonth + 1)
      : 3 // If past quarter or different year, assume full quarter
    const monthsRemainingInQuarter = Math.max(0, 3 - monthsInCurrentQuarter)

    // Calculate completed quarters (full quarters before current one)
    const completedQuarters = Math.max(0, effectiveQuarter - 1)
    const quartersRemaining = 4 - effectiveQuarter

    // Calculate total months elapsed YTD (completed quarters * 3 + months in current quarter)
    const totalMonthsElapsedYTD = completedQuarters * 3 + monthsInCurrentQuarter

    // Calculate average monthly income/expenses for current quarter only (for display)
    const avgMonthlyIncomeInQuarter =
      monthsInCurrentQuarter > 0 ? currentIncomeTotal / monthsInCurrentQuarter : 0
    const avgMonthlyExpensesInQuarter =
      monthsInCurrentQuarter > 0 ? currentExpenseTotal / monthsInCurrentQuarter : 0
    const avgMonthlyReliefsInQuarter =
      monthsInCurrentQuarter > 0 ? reliefTotal / monthsInCurrentQuarter : 0

    // Calculate YTD average per month (for projections - this is what we should use)
    // This gives us a better projection based on actual year-to-date performance
    const avgMonthlyIncomeYTD = totalMonthsElapsedYTD > 0 ? ytdIncome / totalMonthsElapsedYTD : 0
    const avgMonthlyExpensesYTD = totalMonthsElapsedYTD > 0 ? ytdExpenses / totalMonthsElapsedYTD : 0
    const avgMonthlyReliefsYTD = totalMonthsElapsedYTD > 0 ? ytdReliefs / totalMonthsElapsedYTD : 0

    // Calculate average per quarter from completed quarters
    const completedQuartersIncome = completedQuarters > 0 ? ytdIncome - currentIncomeTotal : 0
    const completedQuartersExpenses = completedQuarters > 0 ? ytdExpenses - currentExpenseTotal : 0
    const completedQuartersReliefs = completedQuarters > 0 ? ytdReliefs - reliefTotal : 0

    const avgQuarterlyIncome =
      completedQuarters > 0
        ? completedQuartersIncome / completedQuarters
        : monthsInCurrentQuarter > 0
          ? avgMonthlyIncomeInQuarter * 3
          : 0
    const avgQuarterlyExpenses =
      completedQuarters > 0
        ? completedQuartersExpenses / completedQuarters
        : monthsInCurrentQuarter > 0
          ? avgMonthlyExpensesInQuarter * 3
          : 0
    const avgQuarterlyReliefs =
      completedQuarters > 0
        ? completedQuartersReliefs / completedQuarters
        : monthsInCurrentQuarter > 0
          ? avgMonthlyReliefsInQuarter * 3
          : 0

    // Project remaining months in current quarter using YTD average (better projection)
    const projectedRemainingMonthsIncome = avgMonthlyIncomeYTD * monthsRemainingInQuarter
    const projectedRemainingMonthsExpenses = avgMonthlyExpensesYTD * monthsRemainingInQuarter
    const projectedRemainingMonthsReliefs = avgMonthlyReliefsYTD * monthsRemainingInQuarter

    // Project remaining full quarters using YTD average (consistent with remaining months projection)
    // Convert YTD monthly average to quarterly: monthly average * 3 months per quarter
    const avgQuarterlyIncomeFromYTD = avgMonthlyIncomeYTD * 3
    const avgQuarterlyExpensesFromYTD = avgMonthlyExpensesYTD * 3
    const avgQuarterlyReliefsFromYTD = avgMonthlyReliefsYTD * 3
    
    const projectedRemainingQuartersIncome = avgQuarterlyIncomeFromYTD * quartersRemaining
    const projectedRemainingQuartersExpenses = avgQuarterlyExpensesFromYTD * quartersRemaining
    const projectedRemainingQuartersReliefs = avgQuarterlyReliefsFromYTD * quartersRemaining

    // Total projection = YTD + Remaining months in current quarter + Remaining quarters
    projectedAnnualIncome =
      ytdIncome + projectedRemainingMonthsIncome + projectedRemainingQuartersIncome
    projectedAnnualExpenses =
      ytdExpenses + projectedRemainingMonthsExpenses + projectedRemainingQuartersExpenses
    projectedAnnualReliefs =
      ytdReliefs + projectedRemainingMonthsReliefs + projectedRemainingQuartersReliefs
  }

  // Tax exemption threshold: Gross income ≤ ₦1,200,000 is completely exempt
  const GROSS_INCOME_EXEMPTION_THRESHOLD = 1200000

  // Tax brackets apply to taxable income (after expenses and reliefs)
  const TAX_FREE_THRESHOLD = 800000 // First ₦800k of taxable income is 0%
  const BRACKET_1_MAX = 3000000
  const BRACKET_2_MAX = 12000000

  let taxAdvice: string
  let reserveTarget: number
  let isLowEarner = false

  // Check if gross income is below exemption threshold
  if (projectedAnnualIncome <= GROSS_INCOME_EXEMPTION_THRESHOLD) {
    // Completely tax-free - gross income at or below ₦1,200,000
    isLowEarner = true
    taxAdvice = `Your projected annual gross income (${formatCurrency(projectedAnnualIncome)}) is at or below ₦1,200,000. You are completely exempt from tax.`
    reserveTarget = 0
  } else {
    // Calculate taxable income (income - expenses - reliefs)
    const projectedTaxableIncome = Math.max(
      0,
      projectedAnnualIncome - projectedAnnualExpenses - projectedAnnualReliefs
    )

    if (projectedTaxableIncome <= TAX_FREE_THRESHOLD) {
      // Taxable income below ₦800k (but gross income was above ₦1.2M)
      isLowEarner = true
      taxAdvice = `Your projected annual taxable income (${formatCurrency(projectedTaxableIncome)}) is below ₦800,000 after expenses and reliefs. You may not owe any tax this year.`
      reserveTarget = 0
    } else if (projectedTaxableIncome <= BRACKET_1_MAX) {
      // 15% bracket (₦800k - ₦3M)
      isLowEarner = true
      // Calculate tax: 0% on first 800k, 15% on remainder
      const taxableAboveThreshold = projectedTaxableIncome - TAX_FREE_THRESHOLD
      const estimatedTax = taxableAboveThreshold * 0.15
      reserveTarget = estimatedTax
      const effectiveRate = (estimatedTax / projectedTaxableIncome) * 100
      taxAdvice = `Your projected annual taxable income (${formatCurrency(projectedTaxableIncome)}) falls in the 15% bracket. Estimated tax: ${formatCurrency(estimatedTax)} (effective rate: ${effectiveRate.toFixed(1)}%).`
    } else if (projectedTaxableIncome <= BRACKET_2_MAX) {
      // 18% bracket (₦3M - ₦12M)
      // Calculate tax: 0% on first 800k, 15% on next 2.2M, 18% on remainder
      const taxOnFirstBracket = (BRACKET_1_MAX - TAX_FREE_THRESHOLD) * 0.15
      const taxableInSecondBracket = projectedTaxableIncome - BRACKET_1_MAX
      const estimatedTax = taxOnFirstBracket + taxableInSecondBracket * 0.18
      reserveTarget = estimatedTax
      const effectiveRate = (estimatedTax / projectedTaxableIncome) * 100
      taxAdvice = `Your projected annual taxable income (${formatCurrency(projectedTaxableIncome)}) falls in the 18% bracket. Estimated tax: ${formatCurrency(estimatedTax)} (effective rate: ${effectiveRate.toFixed(1)}%).`
    } else {
      // Higher brackets (18%+ effective rate)
      // Use a conservative estimate of 20-25% effective rate
      const estimatedTax = projectedTaxableIncome * 0.22 // Conservative 22% average
      reserveTarget = estimatedTax
      taxAdvice = `Your projected annual taxable income (${formatCurrency(projectedTaxableIncome)}) is in a higher tax bracket. Estimated tax: ${formatCurrency(estimatedTax)} (approximately 20-25% effective rate).`
    }
  }

  const projectedTaxableIncome = Math.max(
    0,
    projectedAnnualIncome - projectedAnnualExpenses - projectedAnnualReliefs
  )
  const effectiveRate =
    reserveTarget > 0 && projectedTaxableIncome > 0 ? (reserveTarget / projectedTaxableIncome) * 100 : 0

  // Calculate detailed breakdown for display
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
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
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

    const completedQuartersIncome = completedQuarters > 0 ? ytdIncome - currentIncomeTotal : 0
    const completedQuartersExpenses = completedQuarters > 0 ? ytdExpenses - currentExpenseTotal : 0
    const completedQuartersReliefs = completedQuarters > 0 ? ytdReliefs - reliefTotal : 0

    avgQuarterlyIncome =
      completedQuarters > 0
        ? completedQuartersIncome / completedQuarters
        : monthsInCurrentQuarter > 0
          ? avgMonthlyIncomeInQuarter * 3
          : projectedAnnualIncome / 4
    avgQuarterlyExpenses =
      completedQuarters > 0
        ? completedQuartersExpenses / completedQuarters
        : monthsInCurrentQuarter > 0
          ? avgMonthlyExpensesInQuarter * 3
          : projectedAnnualExpenses / 4
    avgQuarterlyReliefs =
      completedQuarters > 0
        ? completedQuartersReliefs / completedQuarters
        : monthsInCurrentQuarter > 0
          ? avgMonthlyReliefsInQuarter * 3
          : projectedAnnualReliefs / 4
  } else {
    completedQuarters = 4
    quartersRemaining = 0
    avgQuarterlyIncome = projectedAnnualIncome / 4
    avgQuarterlyExpenses = projectedAnnualExpenses / 4
    avgQuarterlyReliefs = projectedAnnualReliefs / 4
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

