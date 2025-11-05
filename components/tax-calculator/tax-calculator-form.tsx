"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Calculator, Info, Plus, X, Trash2, HelpCircle, Loader2 } from "lucide-react"
import { calculateNigerianTax } from "@/lib/tax-calculator"
import {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  convertCurrency,
  formatCurrencyAmount,
  getCurrencySymbol,
} from "@/lib/utils/currency"

interface TaxCalculatorFormProps {
  onCalculate: (result: any) => void
  onInputsSaved?: (inputs: any) => void
}

interface IncomeSource {
  id: string
  type: string
  amount: string
  currency?: CurrencyCode // Currency for this income source
  description?: string
  allowanceType?: "transport" | "housing" | "other" // For allowance type breakdown
}

const INCOME_TYPES = {
  employment: [
    { value: "salary", label: "Salary (PAYE)" },
    { value: "bonus", label: "Bonus" },
    { value: "allowance", label: "Allowances" },
  ],
  freelance: [
    { value: "freelance", label: "Freelance Work" },
    { value: "consulting", label: "Consulting" },
    { value: "contract", label: "Contract Work" },
  ],
  creator: [
    { value: "sponsorship", label: "Brand Sponsorships" },
    { value: "ad_revenue", label: "Ad Revenue (YouTube, Instagram, etc.)" },
    { value: "affiliate", label: "Affiliate Income" },
    { value: "brand_deal", label: "Brand Deals" },
    { value: "content_licensing", label: "Content Licensing" },
    { value: "merchandise", label: "Merchandise Sales" },
    { value: "subscription", label: "Subscription Revenue (Patreon, etc.)" },
    { value: "courses", label: "Online Courses/Coaching" },
    { value: "events", label: "Events & Speaking" },
  ],
  business: [
    { value: "business_income", label: "Business Income" },
    { value: "sales", label: "Product/Service Sales" },
  ],
  other: [
    { value: "rental", label: "Rental Income" },
    { value: "investment", label: "Investment Income" },
    { value: "dividends", label: "Dividends" },
    { value: "other", label: "Other Income" },
  ],
}

const CREATOR_EXPENSES = [
  { value: "equipment", label: "Equipment (Camera, Mic, etc.)" },
  { value: "software", label: "Software & Subscriptions" },
  { value: "studio", label: "Studio Rent/Setup" },
  { value: "coworking", label: "Co-working Space" },
  { value: "editing", label: "Editing Services" },
  { value: "marketing", label: "Marketing & Promotion" },
  { value: "travel", label: "Travel for Content" },
  { value: "props", label: "Props & Supplies" },
  { value: "internet", label: "Internet & Utilities" },
  { value: "staff", label: "Staff/Contractor Payments" },
  { value: "professional_fees", label: "Professional Fees (Accountants, Lawyers)" },
]

// Income type tooltips/help text
const INCOME_TYPE_HELP: Record<string, string> = {
  salary: "Your monthly/annual salary from employment (PAYE income)",
  bonus: "Performance bonuses, annual bonuses, or incentive payments",
  allowance: "Transport, housing, or other allowances from your employer. Transport allowance up to ₦30,000/month (₦360,000/year) is tax-exempt under the Personal Income Tax Act (PITA).",
  freelance: "Payments from freelance projects or gig work",
  consulting: "Consulting fees and professional service charges",
  contract: "Contract work payments and project-based income",
  sponsorship: "Brand partnerships and sponsored content payments. Include all payments from brand collaborations.",
  ad_revenue: "Revenue from YouTube AdSense, Instagram Reels bonus, TikTok Creator Fund, or other platform ad programs",
  affiliate: "Commissions from affiliate marketing programs and referral links",
  brand_deal: "One-time or recurring brand deal payments for promotions and endorsements",
  content_licensing: "Revenue from licensing your content to other platforms or businesses",
  merchandise: "Sales from branded merchandise, products, or physical goods",
  subscription: "Subscription revenue from Patreon, BuyMeACoffee, OnlyFans, or similar platforms. Include tips and donations here.",
  courses: "Revenue from online courses, coaching programs, or educational content sales",
  events: "Income from speaking engagements, workshops, or event appearances",
  business_income: "General business income from your registered business",
  sales: "Product or service sales revenue",
  rental: "Income from rental properties or real estate",
  investment: "Investment income, interest, or returns",
  dividends: "Dividend payments from investments or shares",
  other: "Any other income not covered above",
}

export function TaxCalculatorForm({ onCalculate }: TaxCalculatorFormProps) {
  const [userType, setUserType] = useState("freelancer")
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([
    { id: "1", type: "freelance", amount: "", currency: "NGN" },
  ])
  const [converting, setConverting] = useState(false)
  const [period, setPeriod] = useState<"monthly" | "quarterly" | "yearly">("yearly")
  const [rentPaid, setRentPaid] = useState("")
  const [pensionContribution, setPensionContribution] = useState("")
  const [healthInsurance, setHealthInsurance] = useState("")
  const [housingFund, setHousingFund] = useState("")
  const [lifeInsurance, setLifeInsurance] = useState("")
  const [charitableDonations, setCharitableDonations] = useState("")
  const [businessExpenses, setBusinessExpenses] = useState("")
  const [creatorExpenses, setCreatorExpenses] = useState<Record<string, string>>({})
  const [dependents, setDependents] = useState("0")
  const [convertedTotalIncome, setConvertedTotalIncome] = useState<number | null>(null)
  const [convertingTotal, setConvertingTotal] = useState(false)

  // Calculate raw total income (for display before conversion)
  const rawTotalIncome = incomeSources.reduce((sum, source) => {
    return sum + (Number.parseFloat(source.amount) || 0)
  }, 0)

  // Convert total income in real-time
  useEffect(() => {
    const convertTotal = async () => {
      // Calculate raw total
      const rawTotal = incomeSources.reduce((sum, source) => {
        return sum + (Number.parseFloat(source.amount) || 0)
      }, 0)

      const hasForeignCurrency = incomeSources.some(
        (s) => s.currency && s.currency !== "NGN" && s.amount && Number.parseFloat(s.amount) > 0
      )

      if (!hasForeignCurrency) {
        // All amounts are in NGN, just sum them
        setConvertedTotalIncome(rawTotal)
        setConvertingTotal(false)
        return
      }

      try {
        setConvertingTotal(true)
        // Convert each income source to NGN
        const convertedAmounts = await Promise.all(
          incomeSources.map(async (source) => {
            const amount = Number.parseFloat(source.amount) || 0
            const currency = source.currency || "NGN"

            if (currency === "NGN" || amount === 0) {
              return amount
            }

            // Convert to NGN
            return await convertCurrency(amount, currency, "NGN")
          })
        )

        const total = convertedAmounts.reduce((sum, amount) => sum + amount, 0)
        setConvertedTotalIncome(total)
      } catch (error) {
        console.error("Error converting total income:", error)
        // Fallback to raw total if conversion fails
        setConvertedTotalIncome(rawTotal)
      } finally {
        setConvertingTotal(false)
      }
    }

    // Debounce the conversion to avoid too many API calls
    const timeoutId = setTimeout(() => {
      convertTotal()
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [incomeSources])

  // Use converted total if available, otherwise use raw total
  const totalIncome = convertedTotalIncome !== null ? convertedTotalIncome : rawTotalIncome

  // Get available income types based on user type
  const getAvailableIncomeTypes = () => {
    switch (userType) {
      case "creator":
        return [
          ...INCOME_TYPES.creator,
          ...INCOME_TYPES.freelance,
          ...INCOME_TYPES.other,
        ]
      case "freelancer":
        return [
          ...INCOME_TYPES.freelance,
          ...INCOME_TYPES.employment,
          ...INCOME_TYPES.other,
        ]
      case "employee":
        return [
          ...INCOME_TYPES.employment,
          ...INCOME_TYPES.freelance,
          ...INCOME_TYPES.other,
        ]
      case "business":
        return [
          ...INCOME_TYPES.business,
          ...INCOME_TYPES.other,
        ]
      default:
        return Object.values(INCOME_TYPES).flat()
    }
  }

  const addIncomeSource = () => {
    const newId = Date.now().toString()
    const availableTypes = getAvailableIncomeTypes()
    const defaultType = availableTypes[0]?.value || "freelance"
    // Default to USD for creators (they often receive income in foreign currency)
    const defaultCurrency = userType === "creator" ? "USD" : "NGN"
    // Add new income source at the top of the list
    setIncomeSources([
      { id: newId, type: defaultType, amount: "", currency: defaultCurrency },
      ...incomeSources,
    ])
  }

  const removeIncomeSource = (id: string) => {
    if (incomeSources.length > 1) {
      setIncomeSources(incomeSources.filter((source) => source.id !== id))
    }
  }

  const updateIncomeSource = (id: string, field: keyof IncomeSource, value: string) => {
    setIncomeSources(
      incomeSources.map((source) =>
        source.id === id ? { ...source, [field]: value } : source
      )
    )
  }

  const addCreatorExpense = (expenseType: string) => {
    setCreatorExpenses({ ...creatorExpenses, [expenseType]: "" })
  }

  const removeCreatorExpense = (expenseType: string) => {
    const newExpenses = { ...creatorExpenses }
    delete newExpenses[expenseType]
    setCreatorExpenses(newExpenses)
  }

  const updateCreatorExpense = (expenseType: string, value: string) => {
    setCreatorExpenses({ ...creatorExpenses, [expenseType]: value })
  }

  // Calculate total creator expenses
  const totalCreatorExpenses = Object.values(creatorExpenses).reduce((sum, amount) => {
    return sum + (Number.parseFloat(amount) || 0)
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setConverting(true)

    try {
      // Convert all income sources to NGN
      const convertedIncomeSources = await Promise.all(
        incomeSources.map(async (source) => {
          const amount = Number.parseFloat(source.amount) || 0
          const currency = source.currency || "NGN"

          if (currency === "NGN" || amount === 0) {
            return {
              ...source,
              amountInNGN: amount,
              originalAmount: amount,
              originalCurrency: currency,
            }
          }

          // Convert to NGN
          const amountInNGN = await convertCurrency(amount, currency, "NGN")

          return {
            ...source,
            amountInNGN,
            originalAmount: amount,
            originalCurrency: currency,
          }
        })
      )

      // Extract transport allowance separately (for exemption calculation)
      const transportAllowanceSources = convertedIncomeSources.filter(
        (source) => source.type === "allowance" && source.allowanceType === "transport"
      )
      const totalTransportAllowance = transportAllowanceSources.reduce((sum, source) => {
        return sum + (source.amountInNGN || 0)
      }, 0)

      // Combine all income sources in NGN (including allowances - exemptions will be applied as reliefs)
      const totalIncomeAmount = convertedIncomeSources.reduce(
        (sum, source) => sum + (source.amountInNGN || 0),
        0
      )

      // Combine business expenses (including creator expenses)
      const totalBusinessExp = (Number.parseFloat(businessExpenses) || 0) + totalCreatorExpenses

      const result = calculateNigerianTax({
        businessType: userType,
        period: period,
        income: totalIncomeAmount,
        transportAllowance: totalTransportAllowance > 0 ? totalTransportAllowance : undefined,
        rentPaid: Number.parseFloat(rentPaid) || 0,
        pensionContribution: Number.parseFloat(pensionContribution) || 0,
        healthInsurance: Number.parseFloat(healthInsurance) || 0,
        housingFund: Number.parseFloat(housingFund) || 0,
        lifeInsurance: Number.parseFloat(lifeInsurance) || 0,
        charitableDonations: Number.parseFloat(charitableDonations) || 0,
        businessExpenses: totalBusinessExp,
        dependents: Number.parseInt(dependents) || 0,
      })

      // Add income breakdown with currency information
      result.incomeBreakdown = convertedIncomeSources.map((source) => ({
        type: source.type,
        amount: source.amountInNGN || 0,
        originalAmount: source.originalAmount,
        originalCurrency: source.originalCurrency,
        description: source.description,
      }))

      // Add creator expenses breakdown if applicable
      if (userType === "creator" && Object.keys(creatorExpenses).length > 0) {
        result.creatorExpensesBreakdown = Object.entries(creatorExpenses).map(([type, amount]) => ({
          type,
          amount: Number.parseFloat(amount) || 0,
        }))
      }

      // Add period to result for display clarity
      result.period = period

      onCalculate(result)
    } catch (error) {
      console.error("Error converting currency:", error)
      // Fallback: try calculation without conversion (use amounts as-is, assuming NGN)
      const totalIncomeAmount = incomeSources.reduce(
        (sum, source) => sum + (Number.parseFloat(source.amount) || 0),
        0
      )

      const totalBusinessExp = (Number.parseFloat(businessExpenses) || 0) + totalCreatorExpenses

      const result = calculateNigerianTax({
        businessType: userType,
        period: period,
        income: totalIncomeAmount,
        rentPaid: Number.parseFloat(rentPaid) || 0,
        pensionContribution: Number.parseFloat(pensionContribution) || 0,
        healthInsurance: Number.parseFloat(healthInsurance) || 0,
        housingFund: Number.parseFloat(housingFund) || 0,
        lifeInsurance: Number.parseFloat(lifeInsurance) || 0,
        charitableDonations: Number.parseFloat(charitableDonations) || 0,
        businessExpenses: totalBusinessExp,
        dependents: Number.parseInt(dependents) || 0,
      })

      result.incomeBreakdown = incomeSources.map((source) => ({
        type: source.type,
        amount: Number.parseFloat(source.amount) || 0,
        description: source.description,
      }))

      onCalculate(result)
    } finally {
      setConverting(false)
    }
  }

  const getPeriodLabel = () => {
    switch (period) {
      case "monthly":
        return "Monthly"
      case "quarterly":
        return "Quarterly"
      case "yearly":
        return "Annual"
    }
  }

  const getIncomeTypeLabel = (value: string) => {
    const allTypes = Object.values(INCOME_TYPES).flat()
    return allTypes.find((type) => type.value === value)?.label || value
  }

  return (
    <TooltipProvider>
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Calculate Your Tax</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your multiple income streams and expenses - we'll calculate everything automatically
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="userType">I am a...</Label>
            <Select value={userType} onValueChange={setUserType}>
              <SelectTrigger id="userType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="freelancer">Freelancer / Self-Employed</SelectItem>
                <SelectItem value="creator">Content Creator / Influencer</SelectItem>
                <SelectItem value="employee">Employee (PAYE)</SelectItem>
                <SelectItem value="business">Business Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Calculation Period</Label>
            <Select
              value={period}
              onValueChange={(value: "monthly" | "quarterly" | "yearly") => setPeriod(value)}
            >
              <SelectTrigger id="period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Multiple Income Sources */}
        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Income Sources</h3>
              <p className="text-sm text-muted-foreground">
                Add all your income streams - we'll automatically calculate the total
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIncomeSource}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Income
            </Button>
          </div>

          <div className="space-y-4">
            {incomeSources.map((source, index) => {
              const availableTypes = getAvailableIncomeTypes()
              return (
                <div
                  key={source.id}
                  className="flex flex-col sm:flex-row gap-3 p-4 border border-border rounded-lg bg-muted/30"
                >
                  <div className="flex-1 grid sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`income-type-${source.id}`}>
                          Income Type {index + 1}
                        </Label>
                        {INCOME_TYPE_HELP[source.type] && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{INCOME_TYPE_HELP[source.type]}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <Select
                        value={source.type}
                        onValueChange={(value) => {
                          updateIncomeSource(source.id, "type", value)
                          // Reset allowanceType if changing away from allowance
                          if (value !== "allowance") {
                            updateIncomeSource(source.id, "allowanceType", undefined as any)
                          }
                        }}
                      >
                        <SelectTrigger id={`income-type-${source.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`income-amount-${source.id}`}>
                        Amount ({getPeriodLabel()})
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={`income-amount-${source.id}`}
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={source.amount}
                          onChange={(e) => {
                            const value = e.target.value
                            // Allow only numbers and one decimal point
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              updateIncomeSource(source.id, "amount", value)
                            }
                          }}
                          required
                          className="flex-1"
                        />
                        <Select
                          value={source.currency || "NGN"}
                          onValueChange={(value: CurrencyCode) =>
                            updateIncomeSource(source.id, "currency", value)
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_CURRENCIES.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                {currency.code} ({currency.symbol})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {source.currency && source.currency !== "NGN" && source.amount && (
                        <p className="text-xs text-muted-foreground">
                          Will be converted to NGN for tax calculation
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Allowance Type Selector - only show when allowance is selected */}
                  {source.type === "allowance" && (
                    <div className="space-y-2 mt-2">
                      <Label htmlFor={`allowance-type-${source.id}`}>Allowance Type</Label>
                      <Select
                        value={source.allowanceType || "other"}
                        onValueChange={(value: "transport" | "housing" | "other") =>
                          updateIncomeSource(source.id, "allowanceType", value)
                        }
                      >
                        <SelectTrigger id={`allowance-type-${source.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transport">Transport Allowance (Up to ₦30k/month exempt)</SelectItem>
                          <SelectItem value="housing">Housing Allowance</SelectItem>
                          <SelectItem value="other">Other Allowances</SelectItem>
                        </SelectContent>
                      </Select>
                      {source.allowanceType === "transport" && (
                        <p className="text-xs text-muted-foreground">
                          Transport allowance up to ₦30,000/month (₦360,000/year) is tax-exempt under the Personal Income Tax Act (PITA)
                        </p>
                      )}
                    </div>
                  )}

                  {incomeSources.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIncomeSource(source.id)}
                      className="shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Total Income Display */}
          <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total {getPeriodLabel()} Income:</span>
              <div className="flex items-center gap-2">
                {convertingTotal && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                <span className="text-lg font-bold text-primary">
                  ₦{totalIncome.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            {incomeSources.some((s) => s.currency && s.currency !== "NGN" && s.amount) && (
              <p className="text-xs text-muted-foreground mt-2">
                💱 Foreign currency amounts converted to NGN using current exchange rates
                {convertingTotal && " (converting...)"}
              </p>
            )}
          </div>
        </div>

        {/* Tax-Deductible Expenses */}
        <div className="border-t border-border pt-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold">Tax-Deductible Expenses</h3>
            <Info className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              💡 Enter your expenses for the selected period ({getPeriodLabel().toLowerCase()})
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              The calculator will automatically convert them to annual amounts for tax calculation
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rentPaid">{getPeriodLabel()} Rent Paid (₦)</Label>
              <Input
                id="rentPaid"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={rentPaid}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setRentPaid(value)
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                20% of rent paid is deductible (max ₦500,000/year)
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pensionContribution">
                  {getPeriodLabel()} Pension Contributions (₦)
                </Label>
                <Input
                  id="pensionContribution"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={pensionContribution}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setPensionContribution(value)
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">Up to 8% of annual income</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="healthInsurance">
                  {getPeriodLabel()} Health Insurance (₦)
                </Label>
                <Input
                  id="healthInsurance"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={healthInsurance}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setHealthInsurance(value)
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">NHIS or private HMO premiums</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="housingFund">
                  {getPeriodLabel()} National Housing Fund (NHF) (₦)
                </Label>
                <Input
                  id="housingFund"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={housingFund}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setHousingFund(value)
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">NHF contributions (2.5% of basic salary)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lifeInsurance">{getPeriodLabel()} Life Insurance (₦)</Label>
                <Input
                  id="lifeInsurance"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={lifeInsurance}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setLifeInsurance(value)
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">Premium payments for life insurance</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="charitableDonations">
                  {getPeriodLabel()} Charitable Donations (₦)
                </Label>
                <Input
                  id="charitableDonations"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={charitableDonations}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setCharitableDonations(value)
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  To approved NGOs (max 10% of annual income)
                </p>
              </div>
            </div>

            {/* Creator-Specific Expenses */}
            {userType === "creator" && (
              <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">Creator Business Expenses</h4>
                    <p className="text-xs text-muted-foreground">
                      Add expenses specific to your content creation business
                    </p>
                  </div>
                  <Select
                    onValueChange={(value) => {
                      if (!creatorExpenses[value]) {
                        addCreatorExpense(value)
                      }
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Add Expense Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CREATOR_EXPENSES.map((expense) => (
                        <SelectItem
                          key={expense.value}
                          value={expense.value}
                          disabled={!!creatorExpenses[expense.value]}
                        >
                          {expense.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {Object.entries(creatorExpenses).map(([expenseType, amount]) => {
                  const expenseLabel = CREATOR_EXPENSES.find((e) => e.value === expenseType)?.label
                  return (
                    <div key={expenseType} className="flex gap-3 items-end">
                      <div className="flex-1 space-y-2">
                        <Label>{expenseLabel}</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              updateCreatorExpense(expenseType, value)
                            }
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCreatorExpense(expenseType)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}

                {Object.keys(creatorExpenses).length > 0 && (
                  <div className="pt-2 border-t border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Total Creator Expenses:</span>
                      <span className="font-bold">
                        ₦{totalCreatorExpenses.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* General Business Expenses */}
            <div className="space-y-2">
              <Label htmlFor="businessExpenses">
                {getPeriodLabel()} Other Business Expenses (₦)
              </Label>
              <Input
                id="businessExpenses"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={businessExpenses}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setBusinessExpenses(value)
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Costs wholly, exclusively, and necessarily incurred in producing income
                {userType === "creator" && " (e.g., general business costs not categorized above)"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dependents">Number of Dependents</Label>
          <Select value={dependents} onValueChange={setDependents}>
            <SelectTrigger id="dependents">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0</SelectItem>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={converting}>
          <Calculator className="w-4 h-4 mr-2" />
          {converting ? "Converting Currency..." : "Calculate Tax"}
        </Button>
      </form>
      </Card>
    </TooltipProvider>
  )
}
