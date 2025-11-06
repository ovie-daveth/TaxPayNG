"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Calculator, Info, Plus, X, Trash2, HelpCircle, Loader2, Users, Receipt, Building2, FileText, TrendingUp } from "lucide-react"
import { calculateNigerianTax } from "@/lib/tax-calculator"
import { SMEExemptionModal } from "./sme-exemption-modal"
import { VATForm } from "./vat-form"
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
  const [showSMEModal, setShowSMEModal] = useState(false)
  const [calculationType, setCalculationType] = useState<string | null>(null) // "paye", "vat", null
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
  
  // Business-specific fields for CIT calculation
  const [annualTurnover, setAnnualTurnover] = useState("")
  const [totalFixedAssets, setTotalFixedAssets] = useState("")
  const [assessableProfit, setAssessableProfit] = useState("")
  
  // Withholding tax fields
  const [withholdingTaxIncome, setWithholdingTaxIncome] = useState("")
  const [withholdingTaxPayments, setWithholdingTaxPayments] = useState("")
  
  // WHT payment types - for payments made
  interface WHTPaymentEntry {
    id: string
    paymentType: string
    amount: string
    recipientType: "resident" | "non-resident"
    hasTIN: boolean
    recipientIsSmallCompany: boolean
  }
  
  const [whtPaymentsMade, setWhtPaymentsMade] = useState<WHTPaymentEntry[]>([])
  
  // WHT income received
  interface WHTIncomeEntry {
    id: string
    paymentType: string
    amount: string
    payerType: "resident" | "non-resident"
  }
  
  const [whtIncomeReceived, setWhtIncomeReceived] = useState<WHTIncomeEntry[]>([])
  
  // WHT Payment Types Configuration
  const WHT_PAYMENT_TYPES = [
    { value: "dividends", label: "Dividends", residentRate: 10, nonResidentRate: 10, exemptIfSmallCompany: true },
    { value: "interest", label: "Interest", residentRate: 10, nonResidentRate: 10, exemptIfSmallCompany: false },
    { value: "rent", label: "Rent (Land, Property, Equipment)", residentRate: 10, nonResidentRate: 10, exemptIfSmallCompany: false },
    { value: "royalties", label: "Royalties", residentRate: 10, nonResidentRate: 10, exemptIfSmallCompany: false },
    { value: "consultancy", label: "Consultancy/Management/Professional/Technical Services", residentRate: 5, nonResidentRate: 10, exemptIfSmallCompany: false },
    { value: "construction", label: "Construction Contracts (including repairs)", residentRate: 2.5, nonResidentRate: 5, exemptIfSmallCompany: false },
    { value: "goods-supply", label: "Supply of Goods (non-manufacturer)", residentRate: 2, nonResidentRate: 5, exemptIfSmallCompany: true },
    { value: "commissions", label: "Commissions, Agency Fees, Brokerage", residentRate: 10, nonResidentRate: 10, exemptIfSmallCompany: false },
    { value: "directors-fees", label: "Directors' Fees", residentRate: 10, nonResidentRate: 10, exemptIfSmallCompany: false },
    { value: "government-bonds", label: "Interest on Government Bonds/Treasury Bills", residentRate: 0, nonResidentRate: 0, exemptIfSmallCompany: false },
    { value: "agricultural", label: "Agricultural Produce and Inputs", residentRate: 0, nonResidentRate: 0, exemptIfSmallCompany: false },
  ]
  
  // VAT fields
  const [vatTurnover, setVatTurnover] = useState("")
  const [vatTaxableSupplies, setVatTaxableSupplies] = useState("")
  const [vatInputTax, setVatInputTax] = useState("")

  const handleUserTypeChange = (value: string) => {
    if (value === "business") {
      setShowSMEModal(true)
      setCalculationType(null)
    } else {
      setUserType(value)
      setCalculationType(null)
      // Reset income sources based on user type
      if (value === "freelancer") {
        setIncomeSources([{ id: "1", type: "freelance", amount: "", currency: "NGN" }])
      } else if (value === "creator") {
        setIncomeSources([{ id: "1", type: "sponsorship", amount: "", currency: "NGN" }])
      }
    }
  }

  const handleSMEModalContinue = () => {
    setShowSMEModal(false)
    setUserType("business")
  }

  const handleCalculationTypeSelect = (type: string) => {
    setCalculationType(type)
    if (type === "paye") {
      // Set up for PAYE calculation
      setIncomeSources([{ id: "1", type: "salary", amount: "", currency: "NGN" }])
    } else if (type === "vat") {
      // Set up for VAT calculation
      setIncomeSources([{ id: "1", type: "sales", amount: "", currency: "NGN" }])
    } else if (type === "cit") {
      // Set up for CIT calculation
      setIncomeSources([{ id: "1", type: "business_income", amount: "", currency: "NGN" }])
    } else if (type === "development-levy") {
      // Set up for Development Levy calculation
      setIncomeSources([{ id: "1", type: "business_income", amount: "", currency: "NGN" }])
    } else if (type === "withholding-tax") {
      // Set up for Withholding Tax calculation
      setIncomeSources([])
    }
  }

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
    // For business owners, check calculation type
    if (userType === "business" && calculationType === "paye") {
      return [
        ...INCOME_TYPES.employment,
        ...INCOME_TYPES.other,
      ]
    }
    
    if (userType === "business" && calculationType === "vat") {
      return [
        ...INCOME_TYPES.business,
        ...INCOME_TYPES.other,
      ]
    }
    
    if (userType === "business" && (calculationType === "cit" || calculationType === "development-levy")) {
      return [
        ...INCOME_TYPES.business,
        ...INCOME_TYPES.other,
      ]
    }
    
    if (userType === "business" && calculationType === "withholding-tax") {
      return [] // Withholding tax doesn't use income sources
    }
    
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
    
    // Validation
    let validationErrors: string[] = []
    
    // For business tax calculations
    if (userType === "business" && calculationType) {
      if (calculationType === "cit" || calculationType === "development-levy") {
        // Check if annualTurnover or assessableProfit is provided
        const hasTurnover = annualTurnover && Number.parseFloat(annualTurnover) > 0
        const hasProfit = assessableProfit && Number.parseFloat(assessableProfit) > 0
        const hasIncome = incomeSources.some(s => s.amount && Number.parseFloat(s.amount) > 0)
        
        if (!hasTurnover && !hasProfit && !hasIncome) {
          validationErrors.push("Please enter Annual Turnover or Assessable Profit for " + (calculationType === "cit" ? "CIT" : "Development Levy") + " calculation")
        }
      } else if (calculationType === "withholding-tax") {
        // Check if at least one payment is added and has required fields
        const hasValidPayments = whtPaymentsMade.some(p => 
          p.paymentType && p.amount && Number.parseFloat(p.amount) > 0
        )
        
        if (whtPaymentsMade.length === 0) {
          validationErrors.push("Please add at least one payment entry in 'Payments Made' section")
        } else {
          // Check each payment entry
          whtPaymentsMade.forEach((payment, index) => {
            const paymentNumber = whtPaymentsMade.length - index
            if (!payment.paymentType) {
              validationErrors.push(`Payment #${paymentNumber}: Please select a Payment Type`)
            }
            if (!payment.amount || Number.parseFloat(payment.amount) <= 0) {
              validationErrors.push(`Payment #${paymentNumber}: Please enter a valid Amount (greater than 0)`)
            }
          })
        }
        
        // Check if income received entries (if any) are valid
        if (whtIncomeReceived.length > 0) {
          whtIncomeReceived.forEach((income, index) => {
            const incomeNumber = whtIncomeReceived.length - index
            if (!income.paymentType && income.amount) {
              validationErrors.push(`Income #${incomeNumber}: Please select a Payment Type`)
            }
            if (!income.amount && income.paymentType) {
              validationErrors.push(`Income #${incomeNumber}: Please enter an Amount`)
            }
            if (income.amount && Number.parseFloat(income.amount) <= 0) {
              validationErrors.push(`Income #${incomeNumber}: Please enter a valid Amount (greater than 0)`)
            }
          })
        }
      } else if (calculationType === "vat") {
        // VAT calculation is handled by VATForm component with its own "Calculate VAT" button
        // Skip validation here as VATForm handles its own validation and submission
        // Return early to prevent main form submission for VAT
        return
      } else if (calculationType === "paye") {
        // PAYE needs income
        const hasIncome = incomeSources.some(s => s.amount && Number.parseFloat(s.amount) > 0)
        if (!hasIncome) {
          validationErrors.push("Please enter at least one income source for PAYE calculation")
        }
      }
    } else {
      // For non-business users, need at least one income source
      const hasIncome = incomeSources.some(s => s.amount && Number.parseFloat(s.amount) > 0)
      if (!hasIncome) {
        validationErrors.push("Please enter at least one income source")
      }
    }
    
    // Check for invalid income sources (has type but no amount, or has amount but no type)
    incomeSources.forEach((source, index) => {
      if (source.type && !source.amount) {
        validationErrors.push(`Income Source #${index + 1}: Please enter an Amount`)
      }
      if (source.amount && !source.type) {
        validationErrors.push(`Income Source #${index + 1}: Please select an Income Type`)
      }
      if (source.amount && Number.parseFloat(source.amount) <= 0) {
        validationErrors.push(`Income Source #${index + 1}: Please enter a valid Amount (greater than 0)`)
      }
    })
    
    // Show validation errors
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => {
        toast.error(error)
      })
      return
    }
    
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

      // Handle different calculation types for business owners
      if (userType === "business" && calculationType) {
        let result: any = {}

        if (calculationType === "paye") {
          // PAYE calculation - use individual tax calculation
          result = calculateNigerianTax({
            businessType: "freelancer", // Use freelancer for PAYE calculations
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
          result.calculationType = "paye"
          result.taxType = "PAYE (Pay As You Earn)"
        } else if (calculationType === "cit") {
          // CIT calculation - Annual tax based on annual profit
          // Period selection is for display/payment planning purposes only
          // CIT is always calculated on annual basis
          let turnover = Number.parseFloat(annualTurnover) || totalIncomeAmount
          let profit = Number.parseFloat(assessableProfit) || (totalIncomeAmount - totalBusinessExp)
          
          // If period is monthly/quarterly, convert to annual for calculation
          if (period === "monthly") {
            turnover = turnover * 12
            profit = profit * 12
          } else if (period === "quarterly") {
            turnover = turnover * 4
            profit = profit * 4
          }
          // If yearly, use as is
          
          const assets = Number.parseFloat(totalFixedAssets) || 0
          const isSmallCompany = turnover <= 100000000 && assets <= 250000000
          
          let citRate = 0
          let citAmount = 0
          
          if (isSmallCompany) {
            citRate = 0
            citAmount = 0
          } else if (turnover > 100000000 && turnover < 500000000) {
            // Medium companies - reduced rates (simplified calculation)
            citRate = 20 // Approximate effective rate for medium companies
            citAmount = (profit * citRate) / 100
          } else {
            // Large companies
            citRate = 30
            citAmount = (profit * citRate) / 100
          }
          
          // Convert annual tax to selected period for display
          let periodTax = citAmount
          if (period === "monthly") {
            periodTax = citAmount / 12
          } else if (period === "quarterly") {
            periodTax = citAmount / 4
          }
          
          // Calculate original input values for display
          const originalInputTurnover = Number.parseFloat(annualTurnover) || totalIncomeAmount
          const originalInputProfit = Number.parseFloat(assessableProfit) || (totalIncomeAmount - totalBusinessExp)
          
          result = {
            calculationType: "cit",
            taxType: "Company Income Tax (CIT)",
            turnover: turnover, // Store annual turnover (annualized)
            originalInputTurnover: originalInputTurnover, // Original input before annualization
            originalInputProfit: originalInputProfit, // Original input profit before annualization
            totalFixedAssets: assets,
            assessableProfit: profit, // Store annual profit (annualized)
            isSmallCompany: isSmallCompany,
            citRate: citRate,
            totalTax: periodTax, // Tax for selected period
            annualTax: citAmount, // Annual tax amount
            monthlySetAside: citAmount / 12,
            quarterlySetAside: citAmount / 4,
            period: period,
            note: "CIT is calculated annually. Values shown are adjusted for selected period."
          }
        } else if (calculationType === "development-levy") {
          // Development Levy calculation (4% on assessable profits) - Annual tax
          // Period selection is for display/payment planning purposes only
          let turnover = Number.parseFloat(annualTurnover) || totalIncomeAmount
          let profit = Number.parseFloat(assessableProfit) || (totalIncomeAmount - totalBusinessExp)
          
          // If period is monthly/quarterly, convert to annual for calculation
          if (period === "monthly") {
            turnover = turnover * 12
            profit = profit * 12
          } else if (period === "quarterly") {
            turnover = turnover * 4
            profit = profit * 4
          }
          
          const assets = Number.parseFloat(totalFixedAssets) || 0
          const isSmallCompany = turnover <= 100000000 && assets <= 250000000
          
          let levyAmount = 0
          
          if (isSmallCompany) {
            levyAmount = 0 // Exempt
          } else {
            levyAmount = (profit * 4) / 100 // 4% of annual assessable profits
          }
          
          // Convert annual levy to selected period for display
          let periodLevy = levyAmount
          if (period === "monthly") {
            periodLevy = levyAmount / 12
          } else if (period === "quarterly") {
            periodLevy = levyAmount / 4
          }
          
          // Calculate original input values for display
          const originalInputTurnover = Number.parseFloat(annualTurnover) || totalIncomeAmount
          const originalInputProfit = Number.parseFloat(assessableProfit) || (totalIncomeAmount - totalBusinessExp)
          
          result = {
            calculationType: "development-levy",
            taxType: "Development Levy",
            turnover: turnover, // Store annual turnover (annualized)
            originalInputTurnover: originalInputTurnover, // Original input before annualization
            originalInputProfit: originalInputProfit, // Original input profit before annualization
            totalFixedAssets: assets,
            assessableProfit: profit, // Store annual profit (annualized)
            isSmallCompany: isSmallCompany,
            levyRate: isSmallCompany ? 0 : 4,
            totalTax: periodLevy, // Levy for selected period
            annualTax: levyAmount, // Annual levy amount
            monthlySetAside: levyAmount / 12,
            quarterlySetAside: levyAmount / 4,
            period: period,
            note: "Development Levy is calculated annually. Values shown are adjusted for selected period."
          }
        } else if (calculationType === "withholding-tax") {
          // Withholding Tax calculation with comprehensive rates
          let turnover = Number.parseFloat(annualTurnover) || 0
          const assets = Number.parseFloat(totalFixedAssets) || 0
          
          // If period is monthly/quarterly, convert to annual for small company check
          if (period === "monthly") {
            turnover = turnover * 12
          } else if (period === "quarterly") {
            turnover = turnover * 4
          }
          
          const isSmallCompany = turnover <= 100000000 && assets <= 250000000
          
          // Helper function to get WHT rate
          const getWHTRate = (paymentType: string, recipientType: "resident" | "non-resident", hasTIN: boolean, isRecipientSmallCompany: boolean) => {
            if (isRecipientSmallCompany) return 0 // Small companies are exempt
            
            const paymentTypeConfig = WHT_PAYMENT_TYPES.find(t => t.value === paymentType)
            if (!paymentTypeConfig) return 0
            
            let baseRate = recipientType === "resident" ? paymentTypeConfig.residentRate : paymentTypeConfig.nonResidentRate
            
            // Double rate if no TIN
            if (!hasTIN) {
              baseRate = baseRate * 2
            }
            
            return baseRate
          }
          
          // Calculate WHT on payments made
          const whtPaymentsBreakdown = whtPaymentsMade.map(payment => {
            const amount = Number.parseFloat(payment.amount) || 0
            const rate = getWHTRate(payment.paymentType, payment.recipientType, payment.hasTIN, payment.recipientIsSmallCompany)
            const whtAmount = (amount * rate) / 100
            
            const paymentTypeConfig = WHT_PAYMENT_TYPES.find(t => t.value === payment.paymentType)
            
            // Calculate base rate that would apply if not exempt
            let baseRate = 0
            if (paymentTypeConfig) {
              baseRate = payment.recipientType === "resident" ? paymentTypeConfig.residentRate : paymentTypeConfig.nonResidentRate
              // If no TIN and not exempt, show what double rate would be
              if (!payment.hasTIN && !payment.recipientIsSmallCompany) {
                baseRate = baseRate * 2
              }
            }
            
            return {
              paymentType: paymentTypeConfig?.label || payment.paymentType,
              grossAmount: amount,
              rate: rate, // Actual rate applied (0% if exempt)
              baseRate: baseRate, // Base rate that would apply if not exempt
              whtAmount: whtAmount,
              recipientType: payment.recipientType,
              hasTIN: payment.hasTIN,
              isSmallCompany: payment.recipientIsSmallCompany,
              netPayment: amount - whtAmount
            }
          })
          
          // If small company, exempt from all WHT on payments made
          const totalWHTOnPayments = isSmallCompany ? 0 : whtPaymentsBreakdown.reduce((sum, p) => sum + p.whtAmount, 0)
          
          // Calculate WHT on income received (for reporting purposes)
          const whtIncomeBreakdown = whtIncomeReceived.map(income => {
            const amount = Number.parseFloat(income.amount) || 0
            // For income received, we calculate what WHT was likely deducted
            // Assume recipient has TIN unless specified otherwise (for calculation)
            const paymentTypeConfig = WHT_PAYMENT_TYPES.find(t => t.value === income.paymentType)
            if (!paymentTypeConfig) {
              return {
                paymentType: income.paymentType,
                grossAmount: 0,
                rate: 0,
                whtAmount: 0,
                payerType: income.payerType,
                netAmount: 0
              }
            }
            
            // Small companies are exempt from WHT deduction on their income
            let rate = 0
            if (!isSmallCompany) {
              rate = income.payerType === "resident" ? paymentTypeConfig.residentRate : paymentTypeConfig.nonResidentRate
            }
            
            const whtAmount = (amount * rate) / 100
            
            return {
              paymentType: paymentTypeConfig.label,
              grossAmount: amount,
              rate: rate,
              whtAmount: whtAmount,
              payerType: income.payerType,
              netAmount: amount - whtAmount
            }
          })
          
          const totalWHTOnIncome = whtIncomeBreakdown.reduce((sum, i) => sum + i.whtAmount, 0)
          
          // WHT is calculated per payment, but period determines aggregation
          // The amounts entered are for the selected period
          // Monthly: Amounts are for that month
          // Quarterly: Amounts are for that quarter (multiply by 3 for annual projection)
          // Yearly: Amounts are for the full year
          
          // Calculate annual projection based on period
          let annualWHTProjection = totalWHTOnPayments
          if (period === "monthly") {
            annualWHTProjection = totalWHTOnPayments * 12
          } else if (period === "quarterly") {
            annualWHTProjection = totalWHTOnPayments * 4
          }
          
          // IMPORTANT: WHT on income received is NOT deducted from WHT remittance
          // WHT remittance = WHT you deducted from payments you made (must be remitted)
          // WHT on income received = Tax already paid at source (can claim as credit against CIT)
          // You still need to remit WHT on payments made, regardless of WHT received
          const netWHTRemittance = totalWHTOnPayments
          
          // Calculate original input turnover for display
          const originalInputTurnover = Number.parseFloat(annualTurnover) || 0
          
          result = {
            calculationType: "withholding-tax",
            taxType: "Withholding Tax",
            turnover: turnover, // Annualized turnover (for small company check and display)
            originalInputTurnover: originalInputTurnover, // Original input value before annualization
            totalFixedAssets: assets,
            isSmallCompany: isSmallCompany,
            paymentsMadeBreakdown: whtPaymentsBreakdown,
            totalWHTOnPayments: totalWHTOnPayments, // WHT deducted from payments made (to remit)
            annualWHTProjection: annualWHTProjection, // Projected annual WHT
            incomeReceivedBreakdown: whtIncomeBreakdown,
            totalWHTOnIncome: totalWHTOnIncome, // WHT deducted from income received (CIT credit available)
            totalTax: netWHTRemittance, // Total WHT to remit (on payments made)
            period: period,
            note: `WHT is calculated per payment. Amounts shown are for ${period} period. WHT must be remitted monthly by the 21st of the following month. WHT on income received can be claimed as credit against CIT, but does not reduce WHT remittance.`
          }
        } else if (calculationType === "vat") {
          // VAT calculation is now handled by VATForm component
          // This code path is kept for backward compatibility but shouldn't be reached
          // VATForm handles its own calculation via the "Calculate VAT" button
          toast.error("Please use the 'Calculate VAT' button in the VAT section")
          setConverting(false)
          return
        }

        // Add income breakdown with currency information
        result.incomeBreakdown = convertedIncomeSources.map((source) => ({
          type: source.type,
          amount: source.amountInNGN || 0,
          originalAmount: source.originalAmount,
          originalCurrency: source.originalCurrency,
          description: source.description,
        }))

        onCalculate(result)
        return
      }

      // Regular calculation for non-business or when no calculation type selected
      const result = calculateNigerianTax({
        businessType: calculationType === "paye" ? "freelancer" : userType, // Use freelancer for PAYE calculations
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
        {/* SME Exemption Modal */}
        <SMEExemptionModal
          open={showSMEModal}
          onOpenChange={setShowSMEModal}
          onContinue={handleSMEModalContinue}
        />

        {/* Calculation Type Selection for Business Owners */}
        {userType === "business" && !calculationType && (
          <Card className="p-6 border-2 border-primary/20">
            <div className="text-center mb-6">
              <Building2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">What would you like to calculate?</h3>
              <p className="text-sm text-muted-foreground">
                As a business owner, you can calculate different types of taxes
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card
                className="p-6 cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleCalculationTypeSelect("paye")}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Employee (PAYE)</h4>
                    <p className="text-sm text-muted-foreground">
                      Calculate PAYE tax for your employees
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                className="p-6 cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleCalculationTypeSelect("cit")}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Company Income Tax (CIT)</h4>
                    <p className="text-sm text-muted-foreground">
                      Calculate CIT (0% for small companies)
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                className="p-6 cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleCalculationTypeSelect("development-levy")}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Development Levy</h4>
                    <p className="text-sm text-muted-foreground">
                      Calculate 4% levy on assessable profits
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                className="p-6 cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleCalculationTypeSelect("withholding-tax")}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Withholding Tax</h4>
                    <p className="text-sm text-muted-foreground">
                      Calculate WHT on income & payments
                    </p>
                  </div>
                </div>
              </Card>

              <Card
                className="p-6 cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleCalculationTypeSelect("vat")}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">VAT</h4>
                    <p className="text-sm text-muted-foreground">
                      Calculate VAT at 7.5% (if turnover ≥ ₦100M)
                    </p>
                  </div>
                </div>
              </Card>
            </div>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> Small businesses (turnover &lt; ₦100M, assets &lt; ₦250M) are exempt from CIT, Development Levy, and VAT. 
                However, you still need to calculate PAYE for your employees.
              </p>
            </div>
          </Card>
        )}

        {/* Show form only if calculation type is selected for business owners, or if not a business owner */}
        {(userType !== "business" || calculationType) && (
          <>
        <div className={`grid ${userType === "business" && calculationType ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
          <div className="space-y-2">
            <Label htmlFor="userType">I am a...</Label>
            <Select value={userType} onValueChange={handleUserTypeChange}>
              <SelectTrigger id="userType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="freelancer">Freelancer / Self-Employed</SelectItem>
                <SelectItem value="creator">Content Creator / Influencer</SelectItem>
                <SelectItem value="business">Business Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {userType === "business" && calculationType && (
            <div className="space-y-2">
              <Label htmlFor="taxType">Tax Type</Label>
              <Select
                value={calculationType}
                onValueChange={(value) => handleCalculationTypeSelect(value)}
              >
                <SelectTrigger id="taxType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paye">Employee (PAYE)</SelectItem>
                  <SelectItem value="cit">Company Income Tax (CIT)</SelectItem>
                  <SelectItem value="development-levy">Development Levy</SelectItem>
                  <SelectItem value="withholding-tax">Withholding Tax</SelectItem>
                  <SelectItem value="vat">VAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
        {/* Hide for WHT and VAT - they use different input methods */}
        {(calculationType !== "withholding-tax" && calculationType !== "vat") && (
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
        )}

        {/* Business Tax-Specific Fields */}
        {userType === "business" && calculationType && (
          <div className="border-t border-border pt-6">
            {calculationType === "cit" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Company Income Tax (CIT) Information</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="annualTurnover">Annual Turnover (₦)</Label>
                    <Input
                      id="annualTurnover"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={annualTurnover}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setAnnualTurnover(value)
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Annual revenue/turnover for the year
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalFixedAssets">Total Fixed Assets (₦)</Label>
                    <Input
                      id="totalFixedAssets"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={totalFixedAssets}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setTotalFixedAssets(value)
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Total fixed assets value
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assessableProfit">Assessable Profit (₦)</Label>
                  <Input
                    id="assessableProfit"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00 (leave empty to auto-calculate)"
                    value={assessableProfit}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setAssessableProfit(value)
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Profit after all deductions {period === "monthly" ? "(for this month - will be annualized)" : period === "quarterly" ? "(for this quarter - will be annualized)" : "(annual)"} (if empty, will be calculated from income - expenses)
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>Small Company:</strong> Turnover ≤ ₦100M AND Assets ≤ ₦250M → <strong>0% CIT</strong><br />
                    <strong>Medium Company:</strong> Turnover &gt; ₦100M but &lt; ₦500M → Reduced rates<br />
                    <strong>Large Company:</strong> Turnover ≥ ₦500M → <strong>30% CIT</strong>
                  </p>
                </div>
              </div>
            )}

            {calculationType === "development-levy" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Development Levy Information</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="annualTurnover">Annual Turnover (₦)</Label>
                    <Input
                      id="annualTurnover"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={annualTurnover}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setAnnualTurnover(value)
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Annual revenue/turnover for the year
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalFixedAssets">Total Fixed Assets (₦)</Label>
                    <Input
                      id="totalFixedAssets"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={totalFixedAssets}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setTotalFixedAssets(value)
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Total fixed assets value
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assessableProfit">Assessable Profit (₦)</Label>
                  <Input
                    id="assessableProfit"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00 (leave empty to auto-calculate)"
                    value={assessableProfit}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setAssessableProfit(value)
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Profit after all deductions {period === "monthly" ? "(for this month - will be annualized)" : period === "quarterly" ? "(for this quarter - will be annualized)" : "(annual)"} - 4% levy calculated on annual profit
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>Small Company:</strong> Turnover ≤ ₦100M AND Assets ≤ ₦250M → <strong>Exempt</strong><br />
                    <strong>Other Companies:</strong> 4% levy on assessable profits
                  </p>
                </div>
              </div>
            )}

            {calculationType === "withholding-tax" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Withholding Tax Information</h3>
                </div>
                
                {/* Small Company Check */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="annualTurnover">Annual Turnover (₦)</Label>
                    <Input
                      id="annualTurnover"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={annualTurnover}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setAnnualTurnover(value)
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      {period === "monthly" ? "Monthly turnover (will be annualized for calculation)" : period === "quarterly" ? "Quarterly turnover (will be annualized for calculation)" : "Annual turnover"} - Used to determine small company status
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalFixedAssets">Total Fixed Assets (₦)</Label>
                    <Input
                      id="totalFixedAssets"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={totalFixedAssets}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          setTotalFixedAssets(value)
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      To determine if you qualify as small company
                    </p>
                  </div>
                </div>
                
                {/* Payments Made Section */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">Payments Made (Where You Deduct WHT)</h4>
                      <p className="text-sm text-muted-foreground">
                        Add payments you made where you need to deduct and remit WHT for {period === "monthly" ? "this month" : period === "quarterly" ? "this quarter" : "the year"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWhtPaymentsMade([{
                          id: Date.now().toString(),
                          paymentType: "",
                          amount: "",
                          recipientType: "resident",
                          hasTIN: true,
                          recipientIsSmallCompany: false
                        }, ...whtPaymentsMade])
                      }}
                    >
                      + Add Payment
                    </Button>
                  </div>
                  
                  {whtPaymentsMade.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No payments added. Click "Add Payment" to start.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {whtPaymentsMade.map((payment, index) => (
                        <Card key={payment.id} className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h5 className="font-medium">Payment #{whtPaymentsMade.length - index}</h5>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setWhtPaymentsMade(whtPaymentsMade.filter(p => p.id !== payment.id))
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Payment Type</Label>
                              <Select
                                value={payment.paymentType}
                                onValueChange={(value) => {
                                  const updated = [...whtPaymentsMade]
                                  updated[index].paymentType = value
                                  setWhtPaymentsMade(updated)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {WHT_PAYMENT_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Amount (₦)</Label>
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={payment.amount}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                    const updated = [...whtPaymentsMade]
                                    updated[index].amount = value
                                    setWhtPaymentsMade(updated)
                                  }
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Recipient Type</Label>
                              <Select
                                value={payment.recipientType}
                                onValueChange={(value: "resident" | "non-resident") => {
                                  const updated = [...whtPaymentsMade]
                                  updated[index].recipientType = value
                                  setWhtPaymentsMade(updated)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="resident">Resident</SelectItem>
                                  <SelectItem value="non-resident">Non-Resident</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Recipient Has TIN</Label>
                              <Select
                                value={payment.hasTIN ? "yes" : "no"}
                                onValueChange={(value) => {
                                  const updated = [...whtPaymentsMade]
                                  updated[index].hasTIN = value === "yes"
                                  setWhtPaymentsMade(updated)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="yes">Yes</SelectItem>
                                  <SelectItem value="no">No (Double Rate)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`recipient-small-${payment.id}`}
                                  checked={payment.recipientIsSmallCompany}
                                  onCheckedChange={(checked) => {
                                    const updated = [...whtPaymentsMade]
                                    updated[index].recipientIsSmallCompany = checked === true
                                    setWhtPaymentsMade(updated)
                                  }}
                                />
                                <Label htmlFor={`recipient-small-${payment.id}`} className="text-sm cursor-pointer">
                                  Recipient is Small Company (Turnover ≤ ₦100M, Assets ≤ ₦250M)
                                </Label>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Income Received Section */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">Income Received (Where WHT Was Deducted)</h4>
                      <p className="text-sm text-muted-foreground">
                        Add income you received where WHT was deducted from your payment for {period === "monthly" ? "this month" : period === "quarterly" ? "this quarter" : "the year"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWhtIncomeReceived([{
                          id: Date.now().toString(),
                          paymentType: "",
                          amount: "",
                          payerType: "resident"
                        }, ...whtIncomeReceived])
                      }}
                    >
                      + Add Income
                    </Button>
                  </div>
                  
                  {whtIncomeReceived.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No income entries added. Click "Add Income" to start.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {whtIncomeReceived.map((income, index) => (
                        <Card key={income.id} className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h5 className="font-medium">Income #{whtIncomeReceived.length - index}</h5>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setWhtIncomeReceived(whtIncomeReceived.filter(i => i.id !== income.id))
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Payment Type</Label>
                              <Select
                                value={income.paymentType}
                                onValueChange={(value) => {
                                  const updated = [...whtIncomeReceived]
                                  updated[index].paymentType = value
                                  setWhtIncomeReceived(updated)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {WHT_PAYMENT_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Amount Received (₦)</Label>
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={income.amount}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                    const updated = [...whtIncomeReceived]
                                    updated[index].amount = value
                                    setWhtIncomeReceived(updated)
                                  }
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Payer Type</Label>
                              <Select
                                value={income.payerType}
                                onValueChange={(value: "resident" | "non-resident") => {
                                  const updated = [...whtIncomeReceived]
                                  updated[index].payerType = value
                                  setWhtIncomeReceived(updated)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="resident">Resident</SelectItem>
                                  <SelectItem value="non-resident">Non-Resident</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                    <strong>Small Company Exemption:</strong> Turnover ≤ ₦100M AND Assets ≤ ₦250M → <strong>Fully Exempt</strong> from withholding tax on both income received and payments made
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <strong>⚠️ No TIN Penalty:</strong> If recipient does not have a valid TIN, you must apply <strong>double the standard rate</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Filing Deadline:</strong> WHT must be remitted by the <strong>21st day of the month following deduction</strong>
                  </p>
                </div>
              </div>
            )}

            {calculationType === "vat" && (
              <VATForm
                period={period}
                annualTurnover={vatTurnover || annualTurnover}
                onAnnualTurnoverChange={(value) => {
                  setVatTurnover(value)
                  setAnnualTurnover(value)
                }}
                onCalculate={(vatResult) => {
                  // Format result to match expected structure
                  const result = {
                    calculationType: "vat",
                    taxType: "Value Added Tax (VAT)",
                    turnover: vatResult.annualTurnover,
                    isSmallCompany: vatResult.isSmallCompany,
                    taxableSupplies: vatResult.totalTaxableSupplies,
                    exemptSupplies: vatResult.totalExemptSupplies,
                    zeroRatedSupplies: vatResult.totalZeroRatedSupplies,
                    supplies: vatResult.supplies,
                    inputVATEntries: vatResult.inputVATEntries,
                    outputVat: vatResult.outputVAT,
                    inputTax: vatResult.totalInputVAT,
                    eligibleInputVAT: vatResult.eligibleInputVAT,
                    vatRate: vatResult.isSmallCompany ? 0 : 7.5,
                    totalTax: vatResult.netVATPayable,
                    periodOutputVAT: vatResult.periodOutputVAT,
                    periodNetVAT: vatResult.periodNetVAT,
                    annualOutputVATProjection: vatResult.annualOutputVATProjection,
                    annualNetVATProjection: vatResult.annualNetVATProjection,
                    monthlySetAside: period === "yearly" ? vatResult.netVATPayable / 12 : (period === "quarterly" ? vatResult.netVATPayable / 3 : vatResult.netVATPayable),
                    quarterlySetAside: period === "yearly" ? vatResult.netVATPayable / 4 : (period === "monthly" ? vatResult.netVATPayable * 3 : vatResult.netVATPayable),
                    period: period,
                    note: `VAT is calculated for ${period} period. VAT returns must be filed monthly by the 21st of the following month.`
                  }
                  
                  // Trigger the calculation callback
                  onCalculate(result)
                }}
              />
            )}
          </div>
        )}

        {/* Tax-Deductible Expenses */}
        {(calculationType === "paye" || !calculationType) && (
          <>
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
          </>
        )}

        {/* Hide Calculate Tax button for VAT - VATForm has its own Calculate VAT button */}
        {calculationType !== "vat" && (
          <Button type="submit" className="w-full" size="lg" disabled={converting}>
            <Calculator className="w-4 h-4 mr-2" />
            {converting ? "Converting Currency..." : "Calculate Tax"}
          </Button>
        )}
          </>
        )}
        </form>
      </Card>
    </TooltipProvider>
  )
}
