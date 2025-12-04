import { transactionService } from "@/lib/services/transactionService"
import { calculateNigerianTax } from "@/lib/tax-calculator"

export interface PeriodTaxCalculation {
  period: string
  taxDuration: string
  amount: number
  income: number
  expenses: number
  hasIncome: boolean
}

/**
 * Calculate tax for each period based on actual income earned in that period
 * Only returns periods where income > 0
 */
export async function calculatePeriodTaxes(
  userId: string,
  period: 'monthly' | 'quarterly' | 'yearly',
  year: number,
  businessType: 'freelancer' | 'creator' | 'small-business' | 'sme' = 'freelancer'
): Promise<PeriodTaxCalculation[]> {
  const calculatedBusinessType = businessType === 'small-business' ? 'sme' : businessType
  const results: PeriodTaxCalculation[] = []
  
  if (period === 'monthly') {
    // For monthly, we need to calculate by quarter first, then distribute
    // This ensures if income came in Q4, the tax is shared across the 3 months
    
    // First, calculate tax for each quarter
    const quarterTaxes: Map<number, { tax: number; monthsWithIncome: number[] }> = new Map()
    
    for (let quarter = 1; quarter <= 4; quarter++) {
      const quarterStartMonth = (quarter - 1) * 3
      const quarterStart = new Date(year, quarterStartMonth, 1)
      const quarterEnd = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999)
      
      try {
        const summary = await transactionService.getTransactionSummary(
          userId,
          quarterStart.toISOString(),
          quarterEnd.toISOString()
        )
        
        const quarterIncome = summary?.totalIncome ?? 0
        const quarterExpenses = summary?.totalExpenses ?? 0
        
        if (quarterIncome > 0) {
          // Calculate tax for the entire quarter
          const taxCalculation = calculateNigerianTax({
            businessType: calculatedBusinessType,
            period: 'yearly',
            income: quarterIncome,
            businessExpenses: quarterExpenses,
            rentPaid: 0,
            pensionContribution: 0,
            healthInsurance: 0,
            housingFund: 0,
            lifeInsurance: 0,
            charitableDonations: 0,
            dependents: 0,
          })
          
          // Find which months in this quarter have income
          const monthsWithIncome: number[] = []
          for (let monthInQuarter = 1; monthInQuarter <= 3; monthInQuarter++) {
            const month = quarterStartMonth + monthInQuarter
            const monthStart = new Date(year, month - 1, 1)
            const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
            
            try {
              const monthSummary = await transactionService.getTransactionSummary(
                userId,
                monthStart.toISOString(),
                monthEnd.toISOString()
              )
              
              if ((monthSummary?.totalIncome ?? 0) > 0) {
                monthsWithIncome.push(month)
              }
            } catch (error) {
              console.error(`Error checking month ${month} income:`, error)
            }
          }
          
          // Store quarter tax and months with income
          quarterTaxes.set(quarter, {
            tax: taxCalculation.totalTax,
            monthsWithIncome
          })
        }
      } catch (error) {
        console.error(`Error calculating tax for quarter ${quarter}:`, error)
      }
    }
    
    // Now distribute quarter taxes across months with income
    for (let month = 1; month <= 12; month++) {
      const quarter = Math.floor((month - 1) / 3) + 1
      const quarterData = quarterTaxes.get(quarter)
      
      if (quarterData && quarterData.monthsWithIncome.includes(month)) {
        // This month has income
        // If multiple months in the quarter have income, distribute tax equally
        // If only one month has income, that month gets the full quarter tax
        const monthsCount = quarterData.monthsWithIncome.length
        const monthTax = monthsCount > 1 
          ? quarterData.tax / monthsCount  // Distribute equally if multiple months
          : quarterData.tax  // Full tax if only one month has income
        
        const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
        
        // Get month's income for display
        const monthStart = new Date(year, month - 1, 1)
        const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
        let monthIncome = 0
        let monthExpenses = 0
        
        try {
          const monthSummary = await transactionService.getTransactionSummary(
            userId,
            monthStart.toISOString(),
            monthEnd.toISOString()
          )
          monthIncome = monthSummary?.totalIncome ?? 0
          monthExpenses = monthSummary?.totalExpenses ?? 0
        } catch (error) {
          console.error(`Error getting month ${month} summary:`, error)
        }
        
        results.push({
          period: monthName,
          taxDuration: monthName,
          amount: monthTax, // Tax from quarter (distributed or full)
          income: monthIncome,
          expenses: monthExpenses,
          hasIncome: true
        })
      }
    }
  } else if (period === 'quarterly') {
    // Calculate for each quarter
    for (let quarter = 1; quarter <= 4; quarter++) {
      const quarterStartMonth = (quarter - 1) * 3
      const quarterStart = new Date(year, quarterStartMonth, 1)
      const quarterEnd = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999)
      
      try {
        const summary = await transactionService.getTransactionSummary(
          userId,
          quarterStart.toISOString(),
          quarterEnd.toISOString()
        )
        
        const income = summary?.totalIncome ?? 0
        const expenses = summary?.totalExpenses ?? 0
        
        // Only include quarters with income
        if (income > 0) {
          const taxCalculation = calculateNigerianTax({
            businessType: calculatedBusinessType,
            period: 'yearly',
            income,
            businessExpenses: expenses,
            rentPaid: 0,
            pensionContribution: 0,
            healthInsurance: 0,
            housingFund: 0,
            lifeInsurance: 0,
            charitableDonations: 0,
            dependents: 0,
          })
          
          const months = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec']
          const quarterName = `Q${quarter} ${year} (${months[quarter - 1]})`
          
          results.push({
            period: `Q${quarter} ${year}`,
            taxDuration: quarterName,
            amount: taxCalculation.totalTax, // Full tax for this quarter's income
            income,
            expenses,
            hasIncome: true
          })
        }
      } catch (error) {
        console.error(`Error calculating tax for quarter ${quarter}:`, error)
      }
    }
  } else {
    // Yearly - calculate for the full year
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)
    
    try {
      const summary = await transactionService.getTransactionSummary(
        userId,
        yearStart.toISOString(),
        yearEnd.toISOString()
      )
      
      const income = summary?.totalIncome ?? 0
      const expenses = summary?.totalExpenses ?? 0
      
      if (income > 0) {
        const taxCalculation = calculateNigerianTax({
          businessType: calculatedBusinessType,
          period: 'yearly',
          income,
          businessExpenses: expenses,
          rentPaid: 0,
          pensionContribution: 0,
          healthInsurance: 0,
          housingFund: 0,
          lifeInsurance: 0,
          charitableDonations: 0,
          dependents: 0,
        })
        
        results.push({
          period: year.toString(),
          taxDuration: year.toString(),
          amount: taxCalculation.totalTax,
          income,
          expenses,
          hasIncome: true
        })
      }
    } catch (error) {
      console.error(`Error calculating tax for year ${year}:`, error)
    }
  }
  
  return results
}

/**
 * Get the current period's tax amount based on actual income
 */
export async function getCurrentPeriodTax(
  userId: string,
  period: 'monthly' | 'quarterly' | 'yearly',
  businessType: 'freelancer' | 'creator' | 'small-business' | 'sme' = 'freelancer'
): Promise<{ amount: number; taxDuration: string; income: number; expenses: number } | null> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentQuarter = Math.floor((currentMonth - 1) / 3) + 1
  
  let periodStart: Date
  let periodEnd: Date
  let taxDuration: string
  
  if (period === 'monthly') {
    periodStart = new Date(currentYear, currentMonth - 1, 1)
    periodEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999)
    taxDuration = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  } else if (period === 'quarterly') {
    const quarterStartMonth = (currentQuarter - 1) * 3
    periodStart = new Date(currentYear, quarterStartMonth, 1)
    periodEnd = new Date(currentYear, quarterStartMonth + 3, 0, 23, 59, 59, 999)
    const months = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec']
    taxDuration = `Q${currentQuarter} ${currentYear} (${months[currentQuarter - 1]})`
  } else {
    periodStart = new Date(currentYear, 0, 1)
    periodEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999)
    taxDuration = currentYear.toString()
  }
  
  try {
    const summary = await transactionService.getTransactionSummary(
      userId,
      periodStart.toISOString(),
      periodEnd.toISOString()
    )
    
    const income = summary?.totalIncome ?? 0
    const expenses = summary?.totalExpenses ?? 0
    
    if (income === 0) {
      return null
    }
    
    const calculatedBusinessType = businessType === 'small-business' ? 'sme' : businessType
    const taxCalculation = calculateNigerianTax({
      businessType: calculatedBusinessType,
      period: 'yearly',
      income,
      businessExpenses: expenses,
      rentPaid: 0,
      pensionContribution: 0,
      healthInsurance: 0,
      housingFund: 0,
      lifeInsurance: 0,
      charitableDonations: 0,
      dependents: 0,
    })
    
    return {
      amount: taxCalculation.totalTax,
      taxDuration,
      income,
      expenses
    }
  } catch (error) {
    console.error('Error calculating current period tax:', error)
    return null
  }
}

