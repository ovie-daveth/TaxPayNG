interface TaxInput {
  businessType: string
  income: number
  period: "monthly" | "quarterly" | "yearly"
  rentPaid: number
  pensionContribution: number
  healthInsurance: number
  housingFund: number
  lifeInsurance: number
  charitableDonations: number
  businessExpenses: number
  dependents: number
  transportAllowance?: number // Transport allowance for exemption calculation
}

// Transport allowance exemption: Up to ₦30,000/month (₦360,000/year) is tax-exempt
// This is an existing provision under the Personal Income Tax Act (PITA), not part of the 2026 reform
const TRANSPORT_ALLOWANCE_EXEMPTION_LIMIT = 360000 // Annual limit

interface TaxBracket {
  min: number
  max: number | null
  rate: number
}

// New law: First ₦800,000 is tax-free, then progressive rates apply
const TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 800000, rate: 0 },
  { min: 800000, max: 3000000, rate: 15 },
  { min: 3000000, max: 12000000, rate: 18 },
  { min: 12000000, max: 25000000, rate: 21 },
  { min: 25000000, max: 50000000, rate: 23 },
  { min: 50000000, max: null, rate: 25 },
]

/**
 * Calculate Nigerian Personal Income Tax (PIT) for individuals, freelancers, and self-employed persons
 * 
 * For Freelancers/Self-Employed:
 * Step 1: Add up all income for the year (from all clients, local or overseas)
 * Step 2: Subtract allowable business expenses (wholly, exclusively, and necessarily for business)
 * Step 3: Calculate taxable income (after business expenses)
 * Step 4: Apply reliefs/deductions (pension, NHF, NHIS, etc.)
 * Step 5: Apply progressive PIT rate schedule to final taxable income
 * Step 6: Calculate total tax payable
 */
export function calculateNigerianTax(input: TaxInput, includeInputs: boolean = false) {
  // ============================================
  // STEP 1: CONVERT ALL INCOME TO ANNUAL AMOUNT
  // ============================================
  // Add up all income for the year (from all clients, local or overseas)
  let annualIncome = input.income
  if (input.period === "monthly") {
    annualIncome = input.income * 12
  } else if (input.period === "quarterly") {
    annualIncome = input.income * 4
  }

  // Convert transport allowance to annual amount if provided
  let annualTransportAllowance = input.transportAllowance || 0
  if (input.period === "monthly" && input.transportAllowance) {
    annualTransportAllowance = input.transportAllowance * 12
  } else if (input.period === "quarterly" && input.transportAllowance) {
    annualTransportAllowance = input.transportAllowance * 4
  }

  // Calculate transport allowance exemption (up to ₦360,000/year is tax-exempt)
  const transportAllowanceExempt = Math.min(annualTransportAllowance, TRANSPORT_ALLOWANCE_EXEMPTION_LIMIT)
  const transportAllowanceTaxable = Math.max(annualTransportAllowance - TRANSPORT_ALLOWANCE_EXEMPTION_LIMIT, 0)

  // Convert all expenses to annual amounts
  let annualRentPaid = input.rentPaid
  let annualBusinessExpenses = input.businessExpenses
  let annualPensionContribution = input.pensionContribution
  let annualHealthInsurance = input.healthInsurance
  let annualHousingFund = input.housingFund
  let annualLifeInsurance = input.lifeInsurance
  let annualCharitableDonations = input.charitableDonations

  if (input.period === "monthly") {
    annualRentPaid = input.rentPaid * 12
    annualBusinessExpenses = input.businessExpenses * 12
    annualPensionContribution = input.pensionContribution * 12
    annualHealthInsurance = input.healthInsurance * 12
    annualHousingFund = input.housingFund * 12
    annualLifeInsurance = input.lifeInsurance * 12
    annualCharitableDonations = input.charitableDonations * 12
  } else if (input.period === "quarterly") {
    annualRentPaid = input.rentPaid * 4
    annualBusinessExpenses = input.businessExpenses * 4
    annualPensionContribution = input.pensionContribution * 4
    annualHealthInsurance = input.healthInsurance * 4
    annualHousingFund = input.housingFund * 4
    annualLifeInsurance = input.lifeInsurance * 4
    annualCharitableDonations = input.charitableDonations * 4
  }

  // Gross income includes all income (from all clients, local or overseas)
  // For freelancers: includes payments from all clients, freelance work, consulting, etc.
  const grossIncome = annualIncome + annualTransportAllowance

  // ============================================
  // STEP 2: SUBTRACT ALLOWABLE BUSINESS EXPENSES
  // ============================================
  // Allowable expenses: things spent "wholly, exclusively, and necessarily" for business
  // Examples: internet/data, software, laptop, co-working rent, transport to client meetings
  // This gives us the "adjusted gross income" (income after business expenses)
  const adjustedGrossIncome = grossIncome - annualBusinessExpenses

  // ============================================
  // STEP 3 & 4: APPLY RELIEFS/DEDUCTIONS
  // ============================================
  // Current Nigerian tax law reliefs (CRA has been abolished)
  // Even as self-employed, you may claim certain reliefs:
  // - Pension contributions (up to 8% of gross income)
  // - National Housing Fund (NHF)
  // - National Health Insurance Scheme (NHIS)
  // - Life Insurance
  // - Charitable Donations (up to 10% of gross income)
  // - Rent Relief (20% of rent paid, capped at ₦500,000/year)
  // - Transport Allowance Exemption (up to ₦360,000/year)
  const rentRelief = Math.min(annualRentPaid * 0.2, 500000)
  const pensionRelief = Math.min(annualPensionContribution, grossIncome * 0.08)
  const healthInsuranceRelief = annualHealthInsurance // NHIS - full deduction
  const housingFundRelief = annualHousingFund // NHF - full deduction
  const lifeInsuranceRelief = annualLifeInsurance // Full deduction
  const charitableRelief = Math.min(annualCharitableDonations, grossIncome * 0.1)
  const transportAllowanceRelief = transportAllowanceExempt // Up to ₦360,000/year exempt

  const totalReliefs =
    rentRelief +
    pensionRelief +
    healthInsuranceRelief +
    housingFundRelief +
    lifeInsuranceRelief +
    charitableRelief +
    transportAllowanceRelief

  // ============================================
  // STEP 5: CALCULATE TAXABLE INCOME
  // ============================================
  // Taxable income = Adjusted Gross Income - Total Reliefs
  // This is the amount that will be subject to progressive tax rates
  const taxableIncome = Math.max(adjustedGrossIncome - totalReliefs, 0)

  // ============================================
  // STEP 6: APPLY PROGRESSIVE PIT RATE SCHEDULE
  // ============================================
  // New Nigerian tax law: Progressive rates apply to taxable income
  // First ₦800,000 is tax-free, then progressive rates:
  // - ₦800K - ₦3M: 15%
  // - ₦3M - ₦12M: 18%
  // - ₦12M - ₦25M: 21%
  // - ₦25M - ₦50M: 23%
  // - Above ₦50M: 25%
  let remainingIncome = taxableIncome
  let totalTax = 0
  const taxBrackets = []

  for (const bracket of TAX_BRACKETS) {
    if (remainingIncome <= 0) break

    const bracketSize = bracket.max ? bracket.max - bracket.min : Number.POSITIVE_INFINITY
    const taxableInBracket = Math.min(remainingIncome, bracketSize)
    const taxForBracket = (taxableInBracket * bracket.rate) / 100

    if (taxableInBracket > 0) {
      taxBrackets.push({
        amount: taxableInBracket,
        rate: bracket.rate,
        tax: taxForBracket,
      })
      totalTax += taxForBracket
      remainingIncome -= taxableInBracket
    }
  }

  const monthlySetAside = totalTax / 12

  const quarterlyAmount = totalTax / 4
  const quarterlyPayments = [
    { quarter: "Q1 (Jan-Mar)", amount: quarterlyAmount },
    { quarter: "Q2 (Apr-Jun)", amount: quarterlyAmount },
    { quarter: "Q3 (Jul-Sep)", amount: quarterlyAmount },
    { quarter: "Q4 (Oct-Dec)", amount: quarterlyAmount },
  ]

  // ============================================
  // RETURN CALCULATION RESULTS
  // ============================================
  const result: any = {
    grossIncome, // Step 1: Total income from all sources
    businessExpenses: annualBusinessExpenses, // Step 2: Allowable business expenses
    adjustedGrossIncome, // Step 2: Income after business expenses
    reliefs: {
      rentRelief, // 20% of rent paid, capped at ₦500,000/year
      pension: pensionRelief, // Up to 8% of gross income
      healthInsurance: healthInsuranceRelief, // NHIS - full deduction
      housingFund: housingFundRelief, // NHF - full deduction
      lifeInsurance: lifeInsuranceRelief, // Full deduction
      charitable: charitableRelief, // Up to 10% of gross income
      transportAllowance: transportAllowanceRelief, // Up to ₦360,000/year exempt
    },
    totalReliefs, // Step 3 & 4: Total reliefs/deductions
    taxableIncome, // Step 5: Final taxable income (after expenses and reliefs)
    taxBrackets, // Step 6: Tax calculation by bracket
    totalTax: Math.round(totalTax), // Step 6: Total tax payable
    monthlySetAside: Math.round(monthlySetAside), // Monthly amount to set aside
    quarterlyPayments: quarterlyPayments.map((q) => ({
      ...q,
      amount: Math.round(q.amount),
    })), // Quarterly payment schedule
    effectiveRate: taxableIncome > 0 ? ((totalTax / taxableIncome) * 100).toFixed(2) : 0, // Effective tax rate
  }

  // Include transport allowance breakdown if applicable
  if (annualTransportAllowance > 0) {
    result.transportAllowance = {
      total: annualTransportAllowance,
      exempt: transportAllowanceExempt,
      taxable: transportAllowanceTaxable,
    }
  }

  // Include original inputs if requested
  if (includeInputs) {
    result.businessType = input.businessType
    result.income = input.income
    result.rentPaid = input.rentPaid
    result.pensionContribution = input.pensionContribution
    result.healthInsurance = input.healthInsurance
    result.housingFund = input.housingFund
    result.lifeInsurance = input.lifeInsurance
    result.charitableDonations = input.charitableDonations
    result.businessExpenses = input.businessExpenses
    result.dependents = input.dependents
    result.period = input.period
  }

  return result
}
