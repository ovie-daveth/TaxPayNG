"use client"

import { useEffect, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { reportService } from "@/lib/services"
import { SmallBusinessExemptionInfo } from "@/components/dashboard/small-business-exemption-info"
import { TaxCalculationBreakdown } from "@/components/dashboard/tax-calculation-breakdown"
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Calculator,
  Info,
  CheckCircle2,
} from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { transactionService, taxPaymentService } from "@/lib/services"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar, Filter } from "lucide-react"
import { useBusiness } from "@/lib/contexts/business-context"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type DashboardBusinessType = "freelancer" | "creator" | "small-business"
type TrendDirection = "up" | "down" | "neutral"

interface StatBreakdown {
  label: string
  value: string
  percentage: number
}

interface StatDefinition {
  id: string
  label: string
  value: string
  change: string
  trend: TrendDirection
  icon: LucideIcon
  color: string
  barColor: string
  breakdown?: StatBreakdown[]
  taxCalculation?: any
  isSmallBusinessExempt?: boolean
}

interface TransactionSummary {
  totalIncome: number
  totalExpenses: number
  totalReliefs: number
  netIncome: number
  transactionCount: number
  categories: Record<string, { income: number; expenses: number; count: number }>
}

interface StatsCardsProps {
  businessType?: DashboardBusinessType
  sidebarCollapsed?: boolean
  periodType?: PeriodType
  selectedYear?: number
  selectedQuarter?: number
  onPeriodChange?: (type: PeriodType, year: number, quarter: number) => void
}

const SMALL_BUSINESS_TURNOVER_THRESHOLD = 100_000_000

function formatCurrencyValue(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("NGN", "₦")
}

type PeriodType = "quarter" | "year"

const getQuarterInfo = (date: Date, quarter?: number) => {
  const q = quarter ?? Math.floor(date.getMonth() / 3) + 1
  const start = new Date(date.getFullYear(), (q - 1) * 3, 1)
  const end = new Date(date.getFullYear(), q * 3, 0, 23, 59, 59, 999)
  const label = `Q${q} ${start.getFullYear()}`
  return { quarter: q, start, end, label }
}

const getYearInfo = (date: Date, year?: number) => {
  const y = year ?? date.getFullYear()
  const start = new Date(y, 0, 1)
  const end = new Date(y, 11, 31, 23, 59, 59, 999)
  const label = `${y}`
  return { year: y, start, end, label }
}

const getAllQuartersForYear = (year: number) => {
  return [
    { value: 1, label: `Q1 ${year}`, start: new Date(year, 0, 1), end: new Date(year, 2, 31, 23, 59, 59, 999) },
    { value: 2, label: `Q2 ${year}`, start: new Date(year, 3, 1), end: new Date(year, 5, 30, 23, 59, 59, 999) },
    { value: 3, label: `Q3 ${year}`, start: new Date(year, 6, 1), end: new Date(year, 8, 30, 23, 59, 59, 999) },
    { value: 4, label: `Q4 ${year}`, start: new Date(year, 9, 1), end: new Date(year, 11, 31, 23, 59, 59, 999) },
  ]
}

type PeriodLabels = {
  quarterLabel: string
  monthLabel: string
  monthShortLabel: string
  year: number
}

const formatCategoryLabel = (value: string) =>
  value
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

const getTrend = (value: number): TrendDirection => {
  if (value > 0) return "up"
  if (value < 0) return "down"
  return "neutral"
}

const buildCategoryBreakdown = (
  summary: TransactionSummary,
  field: "income" | "expenses",
  total: number,
  formatCurrency: (amount: number) => string
): StatBreakdown[] | undefined => {
  if (!total || total <= 0) return undefined

  const entries = Object.entries(summary.categories || {})
    .map(([key, data]) => ({
      label: formatCategoryLabel(key),
      amount: field === "income" ? data.income : data.expenses,
    }))
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4)

  if (entries.length === 0) return undefined

  return entries.map((entry) => ({
    label: entry.label,
    value: formatCurrency(entry.amount),
    percentage: Math.round((entry.amount / total) * 100),
  }))
}

// Helper function to extract year from taxDuration
const extractYear = (taxDuration: string): number | null => {
  const yearMatch = taxDuration.match(/\b(20\d{2})\b/)
  return yearMatch ? parseInt(yearMatch[1]) : null
}

// Helper function to extract month index (0-11) from taxDuration
const extractMonthIndex = (taxDuration: string): number | null => {
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december']
  const lower = taxDuration.toLowerCase()
  for (let i = 0; i < monthNames.length; i++) {
    if (lower.includes(monthNames[i])) {
      return i
    }
  }
  return null
}

// Helper function to extract quarter number (1-4) from taxDuration
const extractQuarter = (taxDuration: string): number | null => {
  // Try "Q1", "Q2", etc.
  const qMatch = taxDuration.match(/Q(\d+)/i)
  if (qMatch) {
    return parseInt(qMatch[1])
  }
  // Try "Jan-Mar", "Apr-Jun", etc.
  if (taxDuration.includes('Jan-Mar')) return 1
  if (taxDuration.includes('Apr-Jun')) return 2
  if (taxDuration.includes('Jul-Sep')) return 3
  if (taxDuration.includes('Oct-Dec')) return 4
  return null
}

// Helper function to check if a payment matches a tax period
// Yearly payments apply to all quarters and months within that year
const paymentMatchesPeriod = (
  payment: any,
  calculatedTaxDuration: string,
  calculatedPeriod: 'monthly' | 'quarterly' | 'yearly'
): boolean => {
  const paymentDuration = payment.taxDuration || ''
  const calculatedDuration = calculatedTaxDuration || ''
  
  // Extract year from both
  const paymentYear = extractYear(paymentDuration)
  const calculatedYear = extractYear(calculatedDuration)
  
  if (!paymentYear || !calculatedYear || paymentYear !== calculatedYear) {
    return false
  }
  
  // If payment is yearly, it applies to all periods (monthly, quarterly, yearly) in that year
  if (payment.period === 'yearly') {
    return true // Yearly payment covers all periods in that year
  }
  
  // For exact period matches, check the specific period
  if (payment.period === calculatedPeriod) {
    // Try exact match first (case-insensitive, trimmed)
    if (paymentDuration.trim().toLowerCase() === calculatedDuration.trim().toLowerCase()) {
      return true
    }
    
    // For monthly: match by month name and year
    if (calculatedPeriod === 'monthly') {
      const paymentMonth = extractMonthIndex(paymentDuration)
      const calculatedMonth = extractMonthIndex(calculatedDuration)
      return paymentMonth !== null && calculatedMonth !== null && paymentMonth === calculatedMonth
    }
    
    // For quarterly: match by quarter number and year
    if (calculatedPeriod === 'quarterly') {
      const paymentQ = extractQuarter(paymentDuration)
      const calculatedQ = extractQuarter(calculatedDuration)
      return paymentQ !== null && calculatedQ !== null && paymentQ === calculatedQ
    }
  }
  
  return false
}

const buildStatsFromSummary = (
  periodSummary: TransactionSummary,
  monthSummary: TransactionSummary | null,
  yearSummary: TransactionSummary, // Full year data for tax calculation
  businessType: DashboardBusinessType,
  formatCurrency: (amount: number) => string,
  labels: PeriodLabels,
  periodType: PeriodType,
  taxPaymentsTotal: number = 0, // Total tax payments made in the year
  periodPayments: any[] = [], // Payments for the specific period
  periodTaxInfo: { amount: number; taxDuration: string; period: 'monthly' | 'quarterly' | 'yearly' } | null = null, // Tax info for the specific period
  periodTaxCalculation: any = null, // Tax calculation for the period (from unified engine)
  yearTaxCalculation: any = null // Tax calculation for the full year (from unified engine)
): StatDefinition[] => {
  // Use period summary for display (income/expenses)
  const totalIncome = periodSummary?.totalIncome ?? 0
  const totalExpenses = periodSummary?.totalExpenses ?? 0
  const netIncome = periodSummary?.netIncome ?? totalIncome - totalExpenses

  const monthIncome = monthSummary?.totalIncome ?? 0
  const monthExpenses = monthSummary?.totalExpenses ?? 0
  const monthNet = monthSummary?.netIncome ?? monthIncome - monthExpenses

  const incomeTransactions = Object.values(periodSummary.categories || {}).reduce(
    (acc, cat) => (cat.income > 0 ? acc + cat.count : acc),
    0
  )
  const expenseTransactions = Object.values(periodSummary.categories || {}).reduce(
    (acc, cat) => (cat.expenses > 0 ? acc + cat.count : acc),
    0
  )

  const incomeBreakdown = buildCategoryBreakdown(periodSummary, "income", totalIncome, formatCurrency)
  const expenseBreakdown = buildCategoryBreakdown(periodSummary, "expenses", totalExpenses, formatCurrency)

  // Use tax calculations from unified engine (passed as parameters)
  // Use period tax for display, year tax for yearly view
  const taxCalculationRaw = periodType === "year" ? yearTaxCalculation : periodTaxCalculation

  const taxCalculation = taxCalculationRaw
    ? {
        ...taxCalculationRaw,
        monthlySetAside:
          taxCalculationRaw.monthlySetAside ?? (taxCalculationRaw.totalTax ? taxCalculationRaw.totalTax / 12 : 0),
      }
    : undefined

  const isSmallBusinessExempt = businessType === "small-business" && !taxCalculationRaw
  
  // Use period-specific tax info if available, otherwise fall back to calculated tax
  let periodTaxAmount = 0
  let periodTaxDuration = ''
  let periodTypeForTax: 'monthly' | 'quarterly' | 'yearly' = periodType === 'year' ? 'yearly' : 'quarterly'
  
  if (periodTaxInfo) {
    periodTaxAmount = periodTaxInfo.amount
    periodTaxDuration = periodTaxInfo.taxDuration
    periodTypeForTax = periodTaxInfo.period
  } else if (taxCalculationRaw) {
    periodTaxAmount = taxCalculationRaw.totalTax
    periodTaxDuration = periodType === "year" ? `${labels.year}` : labels.quarterLabel
  }
  
  // Calculate payments for this specific period
  // Include yearly payments when viewing quarterly/monthly (yearly covers all periods)
  let periodPaymentsTotal = 0
  if (periodPayments.length > 0 && periodTaxDuration) {
    periodPaymentsTotal = periodPayments
      .filter(p => paymentMatchesPeriod(p, periodTaxDuration, periodTypeForTax))
      .reduce((sum, p) => sum + (p.amount || 0), 0)
  }
  
  // Show the gross tax payable (don't subtract payments)
  const grossTaxPayable = periodTaxAmount
  
  // Tax payable is the calculated tax amount (not net after payments)
  const taxCardValue = periodTaxAmount > 0
    ? formatCurrency(Math.round(grossTaxPayable))
    : formatCurrency(0)
  
  const monthDisplay = `${labels.monthShortLabel} ${labels.year}`
  const periodDisplay = periodType === "year" ? `${labels.year}` : labels.quarterLabel
  
  // Build tax period display with paid amount and balance if applicable
  let taxPeriodDisplay = periodTaxDuration || (periodType === "year" ? `${labels.year}` : labels.quarterLabel)
  if (periodPaymentsTotal > 0) {
    taxPeriodDisplay = `${taxPeriodDisplay} • Paid: ${formatCurrency(periodPaymentsTotal)}`
    // Show balance if payment doesn't equal tax payable
    if (periodTaxAmount > 0 && periodPaymentsTotal !== periodTaxAmount) {
      const balance = periodTaxAmount - periodPaymentsTotal
      if (balance > 0) {
        taxPeriodDisplay += ` • Balance: ${formatCurrency(balance)}`
      } else if (balance < 0) {
        taxPeriodDisplay += ` • Overpaid: ${formatCurrency(Math.abs(balance))}`
      }
    }
  }

  return [
    {
      id: "total-income",
      label: businessType === "small-business" ? "Total Revenue" : "Total Income",
      value: formatCurrency(totalIncome),
      change: `${periodDisplay} • ${monthDisplay}: ${formatCurrency(monthIncome)}`,
      trend: getTrend(totalIncome),
      icon: ArrowUpRight,
      color: "text-primary",
      barColor: "bg-primary", 
      breakdown: incomeBreakdown,
    },
    {
      id: "total-expenses",
      label: "Total Expenses",
      value: formatCurrency(totalExpenses),
      change: `${periodDisplay} • ${monthDisplay}: ${formatCurrency(monthExpenses)}`,
      trend: getTrend(-totalExpenses),
      icon: ArrowDownRight,
      color: "text-destructive",
      barColor: "bg-destructive",
      breakdown: expenseBreakdown,
    },
    {
      id: "net-profit",
      label: "Net Profit",
      value: formatCurrency(netIncome),
      change: `${periodDisplay} • ${monthDisplay}: ${formatCurrency(monthNet)}`,
      trend: getTrend(netIncome),
      icon: TrendingUp,
      color: "text-chart-3",
      barColor: "bg-green-500",
      breakdown: [{ label: "After Expenses", value: formatCurrency(netIncome), percentage: 100 }],
    },
    {
      id: "tax-payable",
      label: "Tax Payable",
      value: taxCardValue,
      change: isSmallBusinessExempt 
        ? "Small company exempt" 
        : taxPeriodDisplay,
      trend: "neutral",
      icon: isSmallBusinessExempt ? CheckCircle2 : Calculator,
      color: isSmallBusinessExempt ? "text-green-600" : "text-accent",
      barColor: isSmallBusinessExempt ? "bg-green-500" : "bg-accent",
      breakdown: undefined,
      taxCalculation,
      isSmallBusinessExempt,
    },
  ]
}

export function StatsCards({
  businessType = "freelancer",
  sidebarCollapsed = false,
  periodType: propPeriodType,
  selectedYear: propSelectedYear,
  selectedQuarter: propSelectedQuarter,
  onPeriodChange,
}: StatsCardsProps) {
  const { user } = useAuth()
  const { hasAccess } = useSubscription()
  const { activeEntityId } = useBusiness()
  const hasGoldAccess = hasAccess('GOLD')
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1
  
  // Use props if provided, otherwise use local state
  const [localPeriodType, setLocalPeriodType] = useState<PeriodType>("quarter")
  const [localSelectedYear, setLocalSelectedYear] = useState<number>(currentYear)
  const [localSelectedQuarter, setLocalSelectedQuarter] = useState<number>(currentQuarter)

  const periodType = propPeriodType ?? localPeriodType
  const selectedYear = propSelectedYear ?? localSelectedYear
  const selectedQuarter = propSelectedQuarter ?? localSelectedQuarter

  const handlePeriodTypeChange = (type: PeriodType) => {
    if (onPeriodChange) {
      onPeriodChange(type, selectedYear, selectedQuarter)
    } else {
      setLocalPeriodType(type)
    }
  }

  const handleYearChange = (year: number) => {
    if (onPeriodChange) {
      onPeriodChange(periodType, year, selectedQuarter)
    } else {
      setLocalSelectedYear(year)
    }
  }

  const handleQuarterChange = (quarter: number) => {
    if (onPeriodChange) {
      onPeriodChange(periodType, selectedYear, quarter)
    } else {
      setLocalSelectedQuarter(quarter)
    }
  }
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [isHoverEnabled, setIsHoverEnabled] = useState(false)
  const [showTapHint, setShowTapHint] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [stats, setStats] = useState<StatDefinition[]>([])
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hasShownHintRef = useRef(false)

  useEffect(() => {
    const checkHoverSupport = () => {
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        setIsHoverEnabled(window.innerWidth >= 1024)
      } else {
        setIsHoverEnabled(false)
      }
    }

    checkHoverSupport()
    window.addEventListener("resize", checkHoverSupport)

    return () => {
      window.removeEventListener("resize", checkHoverSupport)
    }
  }, [])

  useEffect(() => {
    if (isHoverEnabled || hasShownHintRef.current || !containerRef.current) {
      setShowTapHint(false)
      return
    }

    let showTimer: ReturnType<typeof setTimeout> | null = null
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasShownHintRef.current && !isHoverEnabled) {
            hasShownHintRef.current = true
            observer.disconnect()
            showTimer = setTimeout(() => {
              setShowTapHint(true)
              hintTimeoutRef.current = setTimeout(() => setShowTapHint(false), 3000)
            }, 500)
          }
        })
      },
      { threshold: 0.1 }
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      if (showTimer) clearTimeout(showTimer)
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
    }
  }, [isHoverEnabled])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(dropdownRefs.current).forEach((key) => {
        const ref = dropdownRefs.current[key]
        if (ref && !ref.contains(event.target as Node) && openDropdown === key) {
          setOpenDropdown(null)
        }
      })
    }

    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [openDropdown])

  useEffect(() => {
    // Set loading to true when component mounts or dependencies change
    setLoadingSummary(true)
    
    if (!user) {
      setStats([])
      setLoadingSummary(false)
      return
    }

    let isMounted = true

    const fetchSummaryData = () => {
      setLoadingSummary(true)

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const nowIso = now.toISOString()
      const monthStartIso = monthStart.toISOString()

      // Get period info based on selection
      let periodInfo: { start: Date; end: Date; label: string }
      if (periodType === "year") {
        periodInfo = getYearInfo(now, selectedYear)
      } else {
        // Create a date in the selected year and quarter
        const quarterDate = new Date(selectedYear, (selectedQuarter - 1) * 3, 1)
        periodInfo = getQuarterInfo(quarterDate, selectedQuarter)
      }

      // Get full year info for tax calculation
      const yearInfo = getYearInfo(now, selectedYear)
      
      const periodStartIso = periodInfo.start.toISOString()
      // For period end, if it's in the future, use end of today to include all transactions today
      let periodEndDate = periodInfo.end
      if (periodInfo.end > now) {
        periodEndDate = new Date(now)
        periodEndDate.setHours(23, 59, 59, 999)
      }
      const periodEndIso = periodEndDate.toISOString()
      
      const yearStartIso = yearInfo.start.toISOString()
      // For year end, if it's in the future, use end of today to include all transactions today
      let yearEndDate = yearInfo.end
      if (yearInfo.end > now) {
        yearEndDate = new Date(now)
        yearEndDate.setHours(23, 59, 59, 999)
      }
      const yearEndIso = yearEndDate.toISOString()

      const labels: PeriodLabels = {
        quarterLabel: periodInfo.label,
        monthLabel: now.toLocaleString("en-US", { month: "long" }),
        monthShortLabel: now.toLocaleString("en-US", { month: "short" }),
        year: selectedYear,
      }

      Promise.all([
        transactionService.getTransactionSummary(user.uid, periodStartIso, periodEndIso, activeEntityId || undefined), // Selected period
        transactionService.getTransactionSummary(user.uid, monthStartIso, nowIso, activeEntityId || undefined), // Current month
        transactionService.getTransactionSummary(user.uid, yearStartIso, yearEndIso, activeEntityId || undefined), // Full year for tax
        taxPaymentService.getUserPaymentsSimple(user.uid), // Tax payments
      ])
        .then(async ([periodSummary, monthSummary, yearSummary, taxPayments]) => {
          if (!isMounted) return
          
          // Filter completed payments for the selected year
          const yearPayments = taxPayments.filter(payment => {
            if (payment.status !== 'completed') return false
            const paymentDate = new Date(payment.createdAt || payment.paymentDate || '')
            return paymentDate >= yearInfo.start && paymentDate <= yearInfo.end
          })
          const totalPayments = yearPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
          
          // Use unified tax calculation engine (same as self-assessment)
          let periodTaxInfo: { amount: number; taxDuration: string; period: 'monthly' | 'quarterly' | 'yearly' } | null = null
          const calculatedBusinessType = businessType === 'small-business' ? 'sme' : businessType
          
          // Calculate tax for period and year using unified engine
          let periodTaxData: any = null
          let yearTaxData: any = null
          let periodTaxCalculationRaw: any = null
          let yearTaxCalculationRaw: any = null
          
          try {
            if (periodType === 'year') {
              // For yearly view, use full year
              yearTaxData = await reportService.calculateTaxForPeriod(
                user.uid,
                yearInfo.start,
                yearEndDate,
                calculatedBusinessType,
                activeEntityId || undefined
              )
              periodTaxData = yearTaxData
              
              if (yearTaxData && yearTaxData.taxPayable > 0) {
                periodTaxInfo = {
                  amount: yearTaxData.taxPayable,
                  taxDuration: `${selectedYear}`,
                  period: 'yearly'
                }
              }
            } else {
              // For quarter view, calculate tax for the selected quarter
              const quarterStartMonth = (selectedQuarter - 1) * 3
              const qStart = new Date(selectedYear, quarterStartMonth, 1)
              const qEnd = new Date(selectedYear, quarterStartMonth + 3, 0, 23, 59, 59, 999)
              
              periodTaxData = await reportService.calculateTaxForPeriod(
                user.uid,
                qStart,
                qEnd,
                calculatedBusinessType,
                activeEntityId || undefined
              )
              
              // Also calculate full year for context
              yearTaxData = await reportService.calculateTaxForPeriod(
                user.uid,
                yearInfo.start,
                yearEndDate,
                calculatedBusinessType,
                activeEntityId || undefined
              )
              
              if (periodTaxData && periodTaxData.taxPayable > 0) {
                const months = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec']
                const quarterTaxDuration = `Q${selectedQuarter} ${selectedYear} (${months[selectedQuarter - 1]})`
                
                periodTaxInfo = {
                  amount: periodTaxData.taxPayable,
                  taxDuration: quarterTaxDuration,
                  period: 'quarterly'
                }
              }
            }
          } catch (error) {
            console.error('Error calculating tax using unified engine:', error)
          }
          
          // Convert to format expected by buildStatsFromSummary
          periodTaxCalculationRaw = periodTaxData ? {
            grossIncome: periodTaxData.grossIncome,
            businessExpenses: periodTaxData.totalExpenses,
            adjustedGrossIncome: periodTaxData.adjustedGrossIncome,
            taxableIncome: periodTaxData.taxableIncome,
            totalTax: periodTaxData.taxPayable,
            taxBrackets: periodTaxData.taxBrackets,
            totalReliefs: periodTaxData.totalReliefs,
            monthlySetAside: periodTaxData.taxPayable / 12,
            capitalAllowances: periodTaxData.capitalAllowances,
            whtCredits: periodTaxData.whtCredits,
            vatOutput: periodTaxData.taxClassification?.vatOutput || 0,
            reliefs: periodTaxData.reliefs,
            effectiveRate: periodTaxData.taxableIncome > 0 ? ((periodTaxData.taxPayable / periodTaxData.taxableIncome) * 100).toFixed(2) : '0'
          } : null
          
          yearTaxCalculationRaw = yearTaxData ? {
            grossIncome: yearTaxData.grossIncome,
            businessExpenses: yearTaxData.totalExpenses,
            adjustedGrossIncome: yearTaxData.adjustedGrossIncome,
            taxableIncome: yearTaxData.taxableIncome,
            totalTax: yearTaxData.taxPayable,
            taxBrackets: yearTaxData.taxBrackets,
            totalReliefs: yearTaxData.totalReliefs,
            monthlySetAside: yearTaxData.taxPayable / 12,
            capitalAllowances: yearTaxData.capitalAllowances,
            whtCredits: yearTaxData.whtCredits,
            vatOutput: yearTaxData.taxClassification?.vatOutput || 0,
            reliefs: yearTaxData.reliefs,
            effectiveRate: yearTaxData.taxableIncome > 0 ? ((yearTaxData.taxPayable / yearTaxData.taxableIncome) * 100).toFixed(2) : '0'
          } : null
          
          setStats(buildStatsFromSummary(
            periodSummary, 
            monthSummary, 
            yearSummary, 
            businessType, 
            formatCurrencyValue, 
            labels, 
            periodType, 
            totalPayments,
            yearPayments, // Pass all year payments for matching
            periodTaxInfo, // Pass period-specific tax info
            periodTaxCalculationRaw, // Pass period tax calculation from unified engine
            yearTaxCalculationRaw // Pass year tax calculation from unified engine
          ))
        })
        .catch((error) => {
          console.error("Error loading transaction summary:", error)
          if (!isMounted) return
          setStats([])
          toast.error("Unable to load your latest stats.")
        })
        .finally(() => {
          if (isMounted) setLoadingSummary(false)
        })
    }

    const handleTransactionChanged = () => {
      if (!isMounted) return
      fetchSummaryData()
    }

    window.addEventListener("transactionChanged", handleTransactionChanged)
    fetchSummaryData()

    return () => {
      isMounted = false
      window.removeEventListener("transactionChanged", handleTransactionChanged)
    }
  }, [user?.uid, businessType, periodType, selectedYear, selectedQuarter])

  const handleCardClick = (statId: string) => {
    setOpenDropdown(openDropdown === statId ? null : statId)
    if (showTapHint) {
      setShowTapHint(false)
      hasShownHintRef.current = true
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
        hintTimeoutRef.current = null
      }
    }
  }

  const handleCardHover = (statId: string | null) => {
    setHoveredCard(statId)
  }

  const cardLoadingClass = loadingSummary ? "pointer-events-none opacity-60 animate-pulse" : ""

  // Generate year options (current year and previous 2 years)
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i)
  
  // Generate quarter options for selected year
  const quarterOptions = getAllQuartersForYear(selectedYear)

  // Get display text for current filter selection
  const getFilterDisplayText = () => {
    if (periodType === "quarter") {
      const selectedQuarterLabel = quarterOptions.find(q => q.value === selectedQuarter)?.label || `Q${selectedQuarter}`
      return `${selectedQuarterLabel} ${selectedYear}`
    } else {
      return selectedYear.toString()
    }
  }

  // Period selector component (reusable)
  const PeriodSelector = () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <label className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">View:</label>
        <Select value={periodType} onValueChange={(value) => handlePeriodTypeChange(value as PeriodType)}>
          <SelectTrigger className="w-full h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quarter">Quarter</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {periodType === "quarter" ? (
        <>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Year:</label>
            <Select value={selectedYear.toString()} onValueChange={(value) => handleYearChange(parseInt(value))}>
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Quarter:</label>
            <Select value={selectedQuarter.toString()} onValueChange={(value) => handleQuarterChange(parseInt(value))}>
              <SelectTrigger className="w-full h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quarterOptions.map((q) => (
                  <SelectItem key={q.value} value={q.value.toString()}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Year:</label>
          <Select value={selectedYear.toString()} onValueChange={(value) => handleYearChange(parseInt(value))}>
            <SelectTrigger className="w-full h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Period Selector - Mobile: Button with Modal, Desktop: Inline */}
      <div className="flex items-center justify-between sm:justify-start">
        {/* Mobile: Filter Button */}
        <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="sm:hidden h-9 w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium">{getFilterDisplayText()}</span>
              </div>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:hidden">
            <DialogHeader>
              <DialogTitle>Filter Period</DialogTitle>
            </DialogHeader>
            <PeriodSelector />
          </DialogContent>
        </Dialog>

        {/* Desktop: Inline Period Selector */}
        <div className="hidden sm:flex flex-row flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">View:</label>
            <Select value={periodType} onValueChange={(value) => handlePeriodTypeChange(value as PeriodType)}>
              <SelectTrigger className="w-[120px] h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodType === "quarter" ? (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Year:</label>
                <Select value={selectedYear.toString()} onValueChange={(value) => handleYearChange(parseInt(value))}>
                  <SelectTrigger className="w-[100px] h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Quarter:</label>
                <Select value={selectedQuarter.toString()} onValueChange={(value) => handleQuarterChange(parseInt(value))}>
                  <SelectTrigger className="w-[120px] h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {quarterOptions.map((q) => (
                      <SelectItem key={q.value} value={q.value.toString()}>
                        {q.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">Year:</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => handleYearChange(parseInt(value))}>
                <SelectTrigger className="w-[100px] h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div
        ref={containerRef}
        className={`grid grid-cols-2 sm:grid-cols-2 ${sidebarCollapsed ? "lg:grid-cols-4" : "lg:grid-cols-2 xl:grid-cols-4"} gap-2 sm:gap-3 md:gap-4`}
      >
      {loadingSummary ? (
        // Skeleton loading state
        Array.from({ length: 4 }).map((_, index) => (
          <Card key={`skeleton-${index}`} className="p-4 sm:p-5 md:p-6 h-full flex flex-col animate-pulse">
            <div className="flex items-start justify-between flex-1">
              <div className="flex-1 min-w-0">
                <div className="h-3 sm:h-4 bg-muted rounded w-20 sm:w-24 mb-2 sm:mb-3"></div>
                <div className="h-6 sm:h-7 md:h-8 lg:h-9 bg-muted rounded w-32 sm:w-40 mb-2 sm:mb-3"></div>
                <div className="h-3 sm:h-4 bg-muted rounded w-16 sm:w-20"></div>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg bg-muted flex-shrink-0 ml-2"></div>
            </div>
          </Card>
        ))
      ) : (
        stats.map((stat, index) => {
        const Icon = stat.icon
        const isOpen = openDropdown === stat.id
        const isHovered = hoveredCard === stat.id && isHoverEnabled
        const showDropdown = isOpen || (isHovered && isHoverEnabled)

        const isLastColumn4 = index % 4 === 3 || index % 4 === 2
        const isLastInRow2 = index % 2 === 1
        const shouldAlignRight = isLastInRow2 || isLastColumn4

        return (
          <Popover
            open={showDropdown}
            onOpenChange={(open) => {
              // Click-to-pin behavior + close on outside click
              if (open) {
                setOpenDropdown(stat.id)
                setIsHoverEnabled(false)
                setShowTapHint(false)
              } else {
                if (openDropdown === stat.id) setOpenDropdown(null)
                if (hoveredCard === stat.id) setHoveredCard(null)
              }
            }}
          >
            <div
              key={stat.id}
              className="relative"
              onMouseEnter={() => isHoverEnabled && !isOpen && handleCardHover(stat.id)}
              onMouseLeave={() => isHoverEnabled && !isOpen && handleCardHover(null)}
              ref={(el) => {
                dropdownRefs.current[stat.id] = el
              }}
            >
              <PopoverTrigger asChild>
                <Card
                  className={`p-4 sm:p-5 md:p-6 cursor-pointer transition-all relative h-full flex flex-col ${isOpen ? "ring-2 ring-primary" : ""} ${cardLoadingClass}`}
                >
              {isHovered && !isOpen && isHoverEnabled && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-primary/10 dark:bg-primary/20 text-primary text-xs px-2 py-1 rounded-md border border-primary/20">
                  <Info className="w-3 h-3" />
                  <span className="hidden sm:inline">Click to pin</span>
                  <span className="sm:hidden">Pin</span>
                </div>
              )}
              {!isOpen && !isHoverEnabled && showTapHint && index === 0 && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-primary/10 dark:bg-primary/20 text-primary text-xs px-2 py-1 rounded-md border border-primary/20 animate-in fade-in-0 zoom-in-95 duration-300 z-10">
                  <Info className="w-3 h-3" />
                  <span>Tap for details</span>
                </div>
              )}
              <div className="flex items-start justify-between flex-1">
              <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">{stat.label}</p>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-1 sm:mb-1.5 md:mb-2 truncate">{stat.value}</p>
                  <p className={`text-[10px] sm:text-xs font-medium ${stat.trend === "up" ? "text-primary" : "text-muted-foreground"}`}>
                  {stat.change}
                </p>
              </div>
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ml-2 ${stat.color}`}
                >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              </div>
            </div>
                </Card>
              </PopoverTrigger>

              <PopoverContent
                side="bottom"
                align="center"
                sideOffset={8}
                collisionPadding={12}
                className={`p-3 sm:p-4 ${
                  stat.id === "tax-payable"
                    ? "w-[calc(100vw-24px)] max-w-[450px] sm:w-[380px] md:w-[450px]"
                    : "w-[calc(100vw-24px)] max-w-[360px] sm:w-[300px] md:w-[320px]"
                }`}
                onMouseEnter={() => isHoverEnabled && handleCardHover(stat.id)}
                onMouseLeave={() => isHoverEnabled && !isOpen && handleCardHover(null)}
              >
                {stat.id === "tax-payable" && stat.isSmallBusinessExempt ? (
                  <SmallBusinessExemptionInfo />
                ) : stat.id === "tax-payable" && stat.taxCalculation ? (
                  <TaxCalculationBreakdown calculation={stat.taxCalculation} formatCurrency={formatCurrencyValue} />
                ) : stat.breakdown ? (
                  <>
                    <h4 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3">{stat.label} Breakdown</h4>
                    <div className="space-y-2 sm:space-y-3">
                      {stat.breakdown.map((item, itemIndex) => (
                        <div key={itemIndex} className="space-y-1 sm:space-y-1.5">
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-medium">{item.value}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className={`h-2 rounded-full ${stat.barColor}`} style={{ width: `${item.percentage}%` }} />
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{item.percentage}%</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] sm:text-xs text-muted-foreground">No breakdown data available yet.</p>
                )}
              </PopoverContent>
            </div>
          </Popover>
        )
      })
      )}
      </div>
    </div>
  )
}

