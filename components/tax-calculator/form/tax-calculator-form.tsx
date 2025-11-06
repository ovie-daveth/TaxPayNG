"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Calculator } from "lucide-react"
import { calculateNigerianTax } from "@/lib/tax-calculator"
import { calculateDevelopmentLevy } from "@/lib/tax/development-levy-calculator"
import { SMEExemptionModal } from "../sme-exemption-modal"
import { VATForm } from "../vat-form"
import { CITForm } from "../cit-form"
import { PAYEForm } from "../paye-form"
import { BusinessTaxTypeSelector } from "./business-tax-type-selector"
import { UserTypeSelector } from "./user-type-selector"
import { PeriodSelector } from "./period-selector"
import { TaxTypeSelector } from "./tax-type-selector"
import { IncomeSourcesSection } from "./income-sources-section"
import { TaxDeductibleExpensesSection } from "./tax-deductible-expenses-section"
import { WithholdingTaxSection } from "./withholding-tax-section"
import { DevelopmentLevySection } from "./development-levy-section"
import { CITInfoSection } from "./cit-info-section"
import {
  type CurrencyCode,
  convertCurrency,
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
    { value: "freelance", label: "Freelance Work (General)" },
    { value: "consulting", label: "Consulting Fees" },
    { value: "contract", label: "Contract Work" },
    { value: "retainer", label: "Retainer Fees" },
    { value: "platform_income", label: "Platform Income (Upwork, Fiverr, Toptal, etc.)" },
    { value: "remote_work", label: "Remote Work Payments" },
    { value: "project_based", label: "Project-Based Payments" },
    { value: "hourly_work", label: "Hourly Work" },
    { value: "service_fees", label: "Service Fees" },
    { value: "commission", label: "Commission-Based Income" },
    { value: "design_services", label: "Design Services" },
    { value: "development_services", label: "Development/Programming Services" },
    { value: "writing_editing", label: "Writing/Editing Services" },
    { value: "translation", label: "Translation Services" },
    { value: "virtual_assistant", label: "Virtual Assistant Work" },
    { value: "online_tutoring", label: "Online Tutoring/Teaching" },
    { value: "training_workshops", label: "Training/Workshops" },
    { value: "digital_products", label: "Digital Products Sales" },
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
  freelance: "Payments from freelance projects or gig work (general freelance income)",
  consulting: "Consulting fees and professional service charges",
  contract: "Contract work payments and project-based income",
  retainer: "Monthly or recurring retainer fees from clients",
  platform_income: "Income from freelancing platforms like Upwork, Fiverr, Toptal, Freelancer.com, etc.",
  remote_work: "Payments from remote work arrangements with international or local clients",
  project_based: "Fixed-price project payments (one-time or milestone-based)",
  hourly_work: "Hourly rate work payments",
  service_fees: "Service fees charged to clients",
  commission: "Commission-based income (percentage of sales, deals, etc.)",
  design_services: "Graphic design, UI/UX design, web design services",
  development_services: "Software development, programming, coding services",
  writing_editing: "Content writing, copywriting, editing, proofreading services",
  translation: "Translation and localization services",
  virtual_assistant: "Virtual assistant, administrative, or support services",
  online_tutoring: "Online tutoring, teaching, or educational services",
  training_workshops: "Training programs, workshops, or educational content delivery",
  digital_products: "Sales of digital products (templates, ebooks, software, etc.)",
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
      // Set up for PAYE calculation - no income sources needed, PAYEForm handles its own inputs
      setIncomeSources([])
    } else if (type === "vat") {
      // Set up for VAT calculation
      setIncomeSources([{ id: "1", type: "sales", amount: "", currency: "NGN" }])
    } else if (type === "cit") {
      // Set up for CIT calculation
      setIncomeSources([{ id: "1", type: "business_income", amount: "", currency: "NGN" }])
    } else if (type === "development-levy") {
      // Set up for Development Levy calculation - no income sources needed
      setIncomeSources([])
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

  // WHT handlers
  const handleAddWhtPayment = () => {
    setWhtPaymentsMade([{
      id: Date.now().toString(),
      paymentType: "",
      amount: "",
      recipientType: "resident",
      hasTIN: true,
      recipientIsSmallCompany: false
    }, ...whtPaymentsMade])
  }

  const handleRemoveWhtPayment = (id: string) => {
    setWhtPaymentsMade(whtPaymentsMade.filter(p => p.id !== id))
  }

  const handleUpdateWhtPayment = (index: number, field: keyof WHTPaymentEntry, value: any) => {
    const updated = [...whtPaymentsMade]
    updated[index] = { ...updated[index], [field]: value }
    setWhtPaymentsMade(updated)
  }

  const handleAddWhtIncome = () => {
    setWhtIncomeReceived([{
      id: Date.now().toString(),
      paymentType: "",
      amount: "",
      payerType: "resident"
    }, ...whtIncomeReceived])
  }

  const handleRemoveWhtIncome = (id: string) => {
    setWhtIncomeReceived(whtIncomeReceived.filter(i => i.id !== id))
  }

  const handleUpdateWhtIncome = (index: number, field: keyof WHTIncomeEntry, value: any) => {
    const updated = [...whtIncomeReceived]
    updated[index] = { ...updated[index], [field]: value }
    setWhtIncomeReceived(updated)
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
      if (calculationType === "cit") {
        // CIT calculation is handled by CITForm component with its own "Calculate CIT" button
        // Skip validation here as CITForm handles its own validation and submission
        // Return early to prevent main form submission for CIT
        return
      } else if (calculationType === "paye") {
        // PAYE calculation is handled by PAYEForm component with its own "Calculate PAYE" button
        // Skip validation here as PAYEForm handles its own validation and submission
        // Return early to prevent main form submission for PAYE
        return
      } else if (calculationType === "development-levy") {
        // Development Levy requires: Annual Turnover, Total Fixed Assets, and Assessable Profit
        // Income sources are not needed - assessable profit is a direct financial statement figure
        const hasTurnover = annualTurnover && Number.parseFloat(annualTurnover) > 0
        const hasProfit = assessableProfit && Number.parseFloat(assessableProfit) > 0
        
        if (!hasTurnover) {
          validationErrors.push("Please enter Annual Turnover for Development Levy calculation")
        }
        if (!hasProfit) {
          validationErrors.push("Please enter Assessable Profit for Development Levy calculation (profit before tax depreciation and losses)")
        }
        const hasAssets = totalFixedAssets && Number.parseFloat(totalFixedAssets) > 0
        if (!hasAssets) {
          validationErrors.push("Please enter Total Fixed Assets for Development Levy calculation (for small company exemption check)")
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
        // PAYE calculation is handled by PAYEForm component
        // Skip validation here as PAYEForm handles its own validation
      }
    } else {
      // For non-business users, need at least one income source
      const hasIncome = incomeSources.some(s => s.amount && Number.parseFloat(s.amount) > 0)
      if (!hasIncome) {
        validationErrors.push("Please enter at least one income source")
      }
    }
    
    // Check for invalid income sources (has type but no amount, or has amount but no type)
    // Skip this validation for tax types that don't use income sources
    if (calculationType !== "development-levy" && calculationType !== "withholding-tax" && calculationType !== "vat" && calculationType !== "cit" && calculationType !== "paye") {
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
    }
    
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
      // Note: Transport allowance will be annualized in calculateNigerianTax, but we need to pass the period amount
      const transportAllowanceSources = convertedIncomeSources.filter(
        (source) => source.type === "allowance" && source.allowanceType === "transport"
      )
      const totalTransportAllowance = transportAllowanceSources.reduce((sum, source) => {
        return sum + (source.amountInNGN || 0) // This is the period amount, will be annualized in calculateNigerianTax
      }, 0)

      // Calculate annualized amounts for display in breakdown
      // Note: We pass non-annualized total to calculateNigerianTax (it will annualize internally)
      const annualizedIncomeSources = convertedIncomeSources.map((source) => {
        const amountInNGN = source.amountInNGN || 0
        let annualizedAmount = amountInNGN
        if (period === "monthly") {
          annualizedAmount = amountInNGN * 12
        } else if (period === "quarterly") {
          annualizedAmount = amountInNGN * 4
        }
        return {
          ...source,
          annualizedAmount,
          originalAmount: source.originalAmount, // Original input amount (before conversion and annualization)
        }
      })

      // Combine all income sources in NGN (non-annualized - calculateNigerianTax will annualize)
      // This is the period total, not annual total
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
          // PAYE calculation is handled by PAYEForm component
          // This should not be reached as PAYEForm handles its own submission
          return
        } else if (calculationType === "cit") {
          // CIT calculation is handled by CITForm component
          // This should not be reached as CITForm handles its own submission
          return
        } else if (calculationType === "development-levy") {
        // Development Levy calculation based on new tax regime
        // Note: Development Levy only requires direct inputs (turnover, fixed assets, assessable profit)
        // Income sources are not needed as assessable profit is a direct financial statement figure
        let turnover = Number.parseFloat(annualTurnover) || 0
        let profit = Number.parseFloat(assessableProfit) || 0
          
          // Store original inputs before annualization
          const originalInputTurnover = turnover
          const originalInputProfit = profit
          
          // If period is monthly/quarterly, convert to annual for calculation
          if (period === "monthly") {
            turnover = turnover * 12
            profit = profit * 12
          } else if (period === "quarterly") {
            turnover = turnover * 4
            profit = profit * 4
          }
          
          const assets = Number.parseFloat(totalFixedAssets) || 0
          const currentYear = new Date().getFullYear()
          
          // Calculate Development Levy using the new calculator
          const levyResult = calculateDevelopmentLevy({
            assessableProfit: profit,
            annualTurnover: turnover,
            totalFixedAssets: assets,
            year: currentYear,
            period: period
          })
          
          result = {
            calculationType: "development-levy",
            taxType: "Development Levy",
            turnover: levyResult.annualTurnover, // Store annual turnover (annualized)
            originalInputTurnover: originalInputTurnover, // Original input before annualization
            originalInputProfit: originalInputProfit, // Original input profit before annualization
            totalFixedAssets: levyResult.totalFixedAssets,
            assessableProfit: levyResult.assessableProfit, // Store annual profit (annualized)
            isSmallCompany: levyResult.isSmallCompany,
            levyRate: levyResult.levyRate,
            yearOfAssessment: levyResult.yearOfAssessment,
            totalTax: levyResult.periodLevy, // Levy for selected period
            annualTax: levyResult.levyAmount, // Annual levy amount
            monthlySetAside: levyResult.monthlySetAside,
            quarterlySetAside: levyResult.quarterlySetAside,
            period: period,
            note: `Development Levy is calculated annually at ${levyResult.levyRate}% of assessable profits for Year ${levyResult.yearOfAssessment}. Values shown are adjusted for selected period. Note: This levy cannot be used as a deduction against CIT.`
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

        // Annualize each income source based on period before summing
        const annualizedIncomeSourcesForPAYE = convertedIncomeSources.map((source) => {
          const amountInNGN = source.amountInNGN || 0
          let annualizedAmount = amountInNGN
          if (period === "monthly") {
            annualizedAmount = amountInNGN * 12
          } else if (period === "quarterly") {
            annualizedAmount = amountInNGN * 4
          }
          return {
            ...source,
            annualizedAmount,
            originalAmount: source.originalAmount,
          }
        })

        // Add income breakdown with currency information
        result.incomeBreakdown = annualizedIncomeSourcesForPAYE.map((source) => ({
          type: source.type,
          amount: source.annualizedAmount || 0, // Annualized amount in NGN
          originalAmount: source.originalAmount, // Original input amount (before conversion and annualization)
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

      // Add income breakdown with currency information and original input amounts
      result.incomeBreakdown = annualizedIncomeSources.map((source) => ({
        type: source.type,
        amount: source.annualizedAmount || 0, // Annualized amount in NGN
        originalAmount: source.originalAmount, // Original input amount (before conversion and annualization)
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
          <BusinessTaxTypeSelector onSelectTaxType={handleCalculationTypeSelect} />
        )}

        {/* Show form only if calculation type is selected for business owners, or if not a business owner */}
        {(userType !== "business" || calculationType) && (
          <>
        <div className={`grid ${userType === "business" && calculationType ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
          <UserTypeSelector userType={userType} onUserTypeChange={handleUserTypeChange} />
          {userType === "business" && calculationType && (
            <TaxTypeSelector calculationType={calculationType} onCalculationTypeChange={handleCalculationTypeSelect} />
          )}
          <PeriodSelector period={period} onPeriodChange={setPeriod} />
        </div>

        {/* Multiple Income Sources */}
        {/* Hide for WHT, VAT, CIT, PAYE, and Development Levy - they use different input methods */}
        {(calculationType !== "withholding-tax" && calculationType !== "vat" && calculationType !== "cit" && calculationType !== "paye" && calculationType !== "development-levy") && (
          <IncomeSourcesSection
            incomeSources={incomeSources}
            onAddIncomeSource={addIncomeSource}
            onRemoveIncomeSource={removeIncomeSource}
            onUpdateIncomeSource={updateIncomeSource}
            getAvailableIncomeTypes={getAvailableIncomeTypes}
            getPeriodLabel={getPeriodLabel}
            totalIncome={totalIncome}
            convertingTotal={convertingTotal}
            incomeTypeHelp={INCOME_TYPE_HELP}
          />
        )}
        </>
        )}

        {/* Business Tax-Specific Fields */}
        {userType === "business" && calculationType && (
          <div className="border-t border-border pt-6">
            {calculationType === "paye" && (
              <PAYEForm
                period={period}
                onCalculate={(payeResult) => {
                  // Trigger the calculation callback
                  onCalculate(payeResult)
                }}
              />
            )}

            {calculationType === "cit" && (
              <>
                <CITInfoSection
                  annualTurnover={annualTurnover}
                  totalFixedAssets={totalFixedAssets}
                  onAnnualTurnoverChange={setAnnualTurnover}
                  onTotalFixedAssetsChange={setTotalFixedAssets}
                />
                <CITForm
                  period={period}
                  annualTurnover={annualTurnover}
                  totalFixedAssets={totalFixedAssets}
                  onAnnualTurnoverChange={setAnnualTurnover}
                  onTotalFixedAssetsChange={setTotalFixedAssets}
                  onCalculate={(citResult) => {
                    // Trigger the calculation callback
                    onCalculate(citResult)
                  }}
                />
              </>
            )}

            {calculationType === "development-levy" && (
              <DevelopmentLevySection
                annualTurnover={annualTurnover}
                totalFixedAssets={totalFixedAssets}
                assessableProfit={assessableProfit}
                onAnnualTurnoverChange={setAnnualTurnover}
                onTotalFixedAssetsChange={setTotalFixedAssets}
                onAssessableProfitChange={setAssessableProfit}
              />
            )}

            {calculationType === "withholding-tax" && (
              <WithholdingTaxSection
                period={period}
                annualTurnover={annualTurnover}
                totalFixedAssets={totalFixedAssets}
                whtPaymentsMade={whtPaymentsMade}
                whtIncomeReceived={whtIncomeReceived}
                onAnnualTurnoverChange={setAnnualTurnover}
                onTotalFixedAssetsChange={setTotalFixedAssets}
                onAddPayment={handleAddWhtPayment}
                onRemovePayment={handleRemoveWhtPayment}
                onUpdatePayment={handleUpdateWhtPayment}
                onAddIncome={handleAddWhtIncome}
                onRemoveIncome={handleRemoveWhtIncome}
                onUpdateIncome={handleUpdateWhtIncome}
                whtPaymentTypes={WHT_PAYMENT_TYPES}
              />
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
        {!calculationType && (
          <>
            <TaxDeductibleExpensesSection
              userType={userType}
              period={period}
              rentPaid={rentPaid}
              pensionContribution={pensionContribution}
              healthInsurance={healthInsurance}
              housingFund={housingFund}
              lifeInsurance={lifeInsurance}
              charitableDonations={charitableDonations}
              businessExpenses={businessExpenses}
              creatorExpenses={creatorExpenses}
              onRentPaidChange={setRentPaid}
              onPensionContributionChange={setPensionContribution}
              onHealthInsuranceChange={setHealthInsurance}
              onHousingFundChange={setHousingFund}
              onLifeInsuranceChange={setLifeInsurance}
              onCharitableDonationsChange={setCharitableDonations}
              onBusinessExpensesChange={setBusinessExpenses}
              onAddCreatorExpense={addCreatorExpense}
              onRemoveCreatorExpense={removeCreatorExpense}
              onUpdateCreatorExpense={updateCreatorExpense}
              totalCreatorExpenses={totalCreatorExpenses}
              getPeriodLabel={getPeriodLabel}
            />
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

        {/* Hide Calculate Tax button for VAT, CIT, and PAYE - they have their own Calculate buttons */}
        {calculationType !== "vat" && calculationType !== "cit" && calculationType !== "paye" && (
          <Button type="submit" className="w-full" size="lg" disabled={converting}>
            <Calculator className="w-4 h-4 mr-2" />
            {converting ? "Converting Currency..." : "Calculate Tax"}
          </Button>
        )}
        </form>
      </Card>
    </TooltipProvider>
  )
}
