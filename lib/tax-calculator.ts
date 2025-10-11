interface TaxInput {
  businessType: string
  income: number
  period: "monthly" | "quarterly" | "yearly"
  rentPaid: number
  pensionContribution: number
  healthInsurance: number
  lifeInsurance: number
  charitableDonations: number
  businessExpenses: number
  dependents: number
}

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

export function calculateNigerianTax(input: TaxInput) {
  let annualIncome = input.income
  if (input.period === "monthly") {
    annualIncome = input.income * 12
  } else if (input.period === "quarterly") {
    annualIncome = input.income * 4
  }

  let annualRentPaid = input.rentPaid
  let annualBusinessExpenses = input.businessExpenses
  if (input.period === "monthly") {
    annualRentPaid = input.rentPaid * 12
    annualBusinessExpenses = input.businessExpenses * 12
  } else if (input.period === "quarterly") {
    annualRentPaid = input.rentPaid * 4
    annualBusinessExpenses = input.businessExpenses * 4
  }

  const grossIncome = annualIncome

  const rentRelief = Math.min(annualRentPaid * 0.2, 500000)

  const craOption1 = Math.max(grossIncome * 0.01, 200000) + grossIncome * 0.2
  const consolidatedRelief = craOption1

  const pensionRelief = Math.min(input.pensionContribution, grossIncome * 0.08)
  const healthInsuranceRelief = input.healthInsurance
  const lifeInsuranceRelief = input.lifeInsurance
  const charitableRelief = Math.min(input.charitableDonations, grossIncome * 0.1)

  const adjustedGrossIncome = grossIncome - annualBusinessExpenses

  const totalReliefs =
    consolidatedRelief + rentRelief + pensionRelief + healthInsuranceRelief + lifeInsuranceRelief + charitableRelief

  const taxableIncome = Math.max(adjustedGrossIncome - totalReliefs, 0)

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

  return {
    grossIncome,
    businessExpenses: annualBusinessExpenses,
    adjustedGrossIncome,
    reliefs: {
      consolidatedRelief,
      rentRelief,
      pension: pensionRelief,
      healthInsurance: healthInsuranceRelief,
      lifeInsurance: lifeInsuranceRelief,
      charitable: charitableRelief,
    },
    totalReliefs,
    taxableIncome,
    taxBrackets,
    totalTax: Math.round(totalTax),
    monthlySetAside: Math.round(monthlySetAside),
    quarterlyPayments: quarterlyPayments.map((q) => ({
      ...q,
      amount: Math.round(q.amount),
    })),
    effectiveRate: taxableIncome > 0 ? ((totalTax / taxableIncome) * 100).toFixed(2) : 0,
  }
}
