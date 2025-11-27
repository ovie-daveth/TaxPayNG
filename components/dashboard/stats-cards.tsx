"use client"

import { useEffect, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { calculateNigerianTax } from "@/lib/tax-calculator"
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
import { transactionService } from "@/lib/services/transactionService"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  useMockData?: boolean
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

const buildStatsFromSummary = (
  periodSummary: TransactionSummary,
  monthSummary: TransactionSummary | null,
  yearSummary: TransactionSummary, // Full year data for tax calculation
  businessType: DashboardBusinessType,
  formatCurrency: (amount: number) => string,
  labels: PeriodLabels,
  periodType: PeriodType
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

  // Use FULL YEAR data for tax calculation
  const yearIncome = yearSummary?.totalIncome ?? 0
  const yearExpenses = yearSummary?.totalExpenses ?? 0

  const calculatedBusinessType = businessType === "small-business" ? "sme" : businessType
  const taxCalculationRaw =
    businessType === "small-business" && yearIncome <= SMALL_BUSINESS_TURNOVER_THRESHOLD
      ? null
      : calculateNigerianTax({
          businessType: calculatedBusinessType,
          period: "yearly",
          income: yearIncome, // Use full year income
          rentPaid: 0,
          pensionContribution: 0,
          healthInsurance: 0,
          housingFund: 0,
          lifeInsurance: 0,
          charitableDonations: 0,
          businessExpenses: yearExpenses, // Use full year expenses
          dependents: 0,
        })

  const taxCalculation = taxCalculationRaw
    ? {
        ...taxCalculationRaw,
        monthlySetAside:
          taxCalculationRaw.monthlySetAside ?? (taxCalculationRaw.totalTax ? taxCalculationRaw.totalTax / 12 : 0),
      }
    : undefined

  const isSmallBusinessExempt = businessType === "small-business" && !taxCalculationRaw
  // Tax payable is always calculated for the full year, but we display based on the selected period
  const taxCardValue = taxCalculationRaw 
    ? formatCurrency(Math.round(periodType === "year" ? taxCalculationRaw.totalTax : taxCalculationRaw.totalTax / 4))
    : formatCurrency(0)
  const monthDisplay = `${labels.monthShortLabel} ${labels.year}`
  const periodDisplay = periodType === "year" ? `${labels.year}` : labels.quarterLabel
  const taxPeriodLabel = periodType === "year" ? "Yearly" : "Quarterly"

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
        : `${taxPeriodLabel} • Based on ${labels.year} data`,
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

const getMockStats = (
  businessType: DashboardBusinessType,
  formatCurrency: (amount: number) => string
): StatDefinition[] => {
  const formatValue = (amount: number) => formatCurrency(amount)

  if (businessType === "creator") {
    const mockIncome = 4_200_000
    const mockExpenses = 1_350_000
    const taxCalculation = calculateNigerianTax({
      businessType: "creator",
      period: "yearly",
      income: mockIncome,
      businessExpenses: mockExpenses,
      rentPaid: 450_000,
      pensionContribution: 0,
      healthInsurance: 0,
      housingFund: 0,
      lifeInsurance: 0,
      charitableDonations: 0,
      dependents: 0,
    })

    return [
      {
        id: "total-income",
        label: "Total Income",
        value: "₦4,200,000",
        change: "+28.5%",
        trend: "up",
        icon: ArrowUpRight,
        color: "text-primary",
        barColor: "bg-primary",
        breakdown: [
          { label: "Brand Sponsorships", value: "₦1,700,000", percentage: 40 },
          { label: "YouTube Ad Revenue", value: "₦1,260,000", percentage: 30 },
          { label: "Instagram Brand Deals", value: "₦840,000", percentage: 20 },
          { label: "TikTok Creator Fund", value: "₦400,000", percentage: 10 },
        ],
      },
      {
        id: "total-expenses",
        label: "Total Expenses",
        value: "₦1,350,000",
        change: "+15.2%",
        trend: "up",
        icon: ArrowDownRight,
        color: "text-destructive",
        barColor: "bg-destructive",
        breakdown: [
          { label: "Video Equipment", value: "₦560,000", percentage: 41 },
          { label: "Studio Rent", value: "₦450,000", percentage: 33 },
          { label: "Editing Software", value: "₦135,000", percentage: 10 },
          { label: "Marketing & Promotion", value: "₦205,000", percentage: 16 },
        ],
      },
      {
        id: "net-profit",
        label: "Net Profit",
        value: "₦2,850,000",
        change: "+35.8%",
        trend: "up",
        icon: TrendingUp,
        color: "text-chart-3",
        barColor: "bg-green-500",
        breakdown: [{ label: "After Expenses", value: "₦2,850,000", percentage: 100 }],
      },
      {
        id: "tax-payable",
        label: "Tax Payable",
        value: formatValue(Math.round(taxCalculation.totalTax / 4)),
        change: "Q1 2025",
        trend: "neutral",
        icon: Calculator,
        color: "text-accent",
        barColor: "bg-accent",
        breakdown: undefined,
        taxCalculation,
      },
    ]
  }

  if (businessType === "small-business") {
    return [
      {
        id: "total-revenue",
        label: "Total Revenue",
        value: "₦8,500,000",
        change: "+22.3%",
        trend: "up",
        icon: ArrowUpRight,
        color: "text-primary",
        barColor: "bg-primary",
        breakdown: [
          { label: "Product Sales", value: "₦5,100,000", percentage: 60 },
          { label: "Service Revenue", value: "₦2,550,000", percentage: 30 },
          { label: "Consulting Services", value: "₦850,000", percentage: 10 },
        ],
      },
      {
        id: "total-expenses",
        label: "Total Expenses",
        value: "₦5,200,000",
        change: "+18.5%",
        trend: "up",
        icon: ArrowDownRight,
        color: "text-destructive",
        barColor: "bg-destructive",
        breakdown: [
          { label: "Employee Salaries", value: "₦2,550,000", percentage: 49 },
          { label: "Inventory Purchase", value: "₦1,560,000", percentage: 30 },
          { label: "Office Rent & Utilities", value: "₦780,000", percentage: 15 },
          { label: "Marketing Campaign", value: "₦310,000", percentage: 6 },
        ],
      },
      {
        id: "net-profit",
        label: "Net Profit",
        value: "₦3,300,000",
        change: "+30.1%",
        trend: "up",
        icon: TrendingUp,
        color: "text-chart-3",
        barColor: "bg-green-500",
        breakdown: [{ label: "After Expenses", value: "₦3,300,000", percentage: 100 }],
      },
      {
        id: "tax-payable",
        label: "Tax Payable",
        value: formatValue(0),
        change: "Exempt",
        trend: "neutral",
        icon: CheckCircle2,
        color: "text-green-600",
        barColor: "bg-green-500",
        breakdown: undefined,
        isSmallBusinessExempt: true,
      },
    ]
  }

  // Default freelancer mock
  const mockIncome = 2_450_000
  const mockExpenses = 890_000
  const taxCalculation = calculateNigerianTax({
    businessType: "freelancer",
    period: "yearly",
    income: mockIncome,
    businessExpenses: mockExpenses,
    rentPaid: 480_000,
    pensionContribution: 0,
    healthInsurance: 0,
    housingFund: 0,
    lifeInsurance: 0,
    charitableDonations: 0,
    dependents: 0,
  })

  return [
    {
      id: "total-income",
      label: "Total Income",
      value: "₦2,450,000",
      change: "+12.5%",
      trend: "up",
      icon: ArrowUpRight,
      color: "text-primary",
      barColor: "bg-primary",
      breakdown: [
        { label: "Client Payments", value: "₦1,200,000", percentage: 49 },
        { label: "Consulting Services", value: "₦850,000", percentage: 35 },
        { label: "Freelance Projects", value: "₦400,000", percentage: 16 },
      ],
    },
    {
      id: "total-expenses",
      label: "Total Expenses",
      value: "₦890,000",
      change: "+8.2%",
      trend: "up",
      icon: ArrowDownRight,
      color: "text-destructive",
      barColor: "bg-destructive",
      breakdown: [
        { label: "Office Rent", value: "₦480,000", percentage: 54 },
        { label: "Software Subscriptions", value: "₦140,000", percentage: 16 },
        { label: "Business Expenses", value: "₦270,000", percentage: 30 },
      ],
    },
    {
      id: "net-profit",
      label: "Net Profit",
      value: "₦1,560,000",
      change: "+15.3%",
      trend: "up",
      icon: TrendingUp,
      color: "text-chart-3",
      barColor: "bg-green-500",
      breakdown: [{ label: "After Expenses", value: "₦1,560,000", percentage: 100 }],
    },
    {
      id: "tax-payable",
      label: "Tax Payable",
      value: formatValue(Math.round(taxCalculation.totalTax / 4)),
      change: "Q1 2025",
      trend: "neutral",
      icon: Calculator,
      color: "text-accent",
      barColor: "bg-accent",
      breakdown: undefined,
      taxCalculation,
    },
  ]
}

export function StatsCards({
  businessType = "freelancer",
  sidebarCollapsed = false,
  useMockData = false,
  periodType: propPeriodType,
  selectedYear: propSelectedYear,
  selectedQuarter: propSelectedQuarter,
  onPeriodChange,
}: StatsCardsProps) {
  const { user } = useAuth()
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
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [stats, setStats] = useState<StatDefinition[]>(() =>
    getMockStats(businessType, formatCurrencyValue)
  )
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
    if (useMockData || !user) {
      setStats(getMockStats(businessType, formatCurrencyValue))
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
        transactionService.getTransactionSummary(user.uid, periodStartIso, periodEndIso), // Selected period
        transactionService.getTransactionSummary(user.uid, monthStartIso, nowIso), // Current month
        transactionService.getTransactionSummary(user.uid, yearStartIso, yearEndIso), // Full year for tax
      ])
        .then(([periodSummary, monthSummary, yearSummary]) => {
          if (!isMounted) return
          setStats(buildStatsFromSummary(periodSummary, monthSummary, yearSummary, businessType, formatCurrencyValue, labels, periodType))
        })
        .catch((error) => {
          console.error("Error loading transaction summary:", error)
          if (!isMounted) return
          setStats(getMockStats(businessType, formatCurrencyValue))
          toast.error("Unable to load your latest stats. Showing recent data instead.")
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
  }, [user?.uid, businessType, useMockData, periodType, selectedYear, selectedQuarter])

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

  const cardLoadingClass = !useMockData && loadingSummary ? "pointer-events-none opacity-60 animate-pulse" : ""

  // Generate year options (current year and previous 2 years)
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i)
  
  // Generate quarter options for selected year
  const quarterOptions = getAllQuartersForYear(selectedYear)

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">View:</label>
          <Select value={periodType} onValueChange={(value) => handlePeriodTypeChange(value as PeriodType)}>
            <SelectTrigger className="w-[120px]">
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
              <label className="text-sm font-medium text-muted-foreground">Year:</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => handleYearChange(parseInt(value))}>
                <SelectTrigger className="w-[100px]">
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
              <label className="text-sm font-medium text-muted-foreground">Quarter:</label>
              <Select value={selectedQuarter.toString()} onValueChange={(value) => handleQuarterChange(parseInt(value))}>
                <SelectTrigger className="w-[120px]">
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
            <label className="text-sm font-medium text-muted-foreground">Year:</label>
            <Select value={selectedYear.toString()} onValueChange={(value) => handleYearChange(parseInt(value))}>
              <SelectTrigger className="w-[100px]">
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

      {/* Stats Cards Grid */}
      <div
        ref={containerRef}
        className={`grid grid-cols-1 sm:grid-cols-2 ${sidebarCollapsed ? "lg:grid-cols-4" : "lg:grid-cols-2 xl:grid-cols-4"} gap-3 sm:gap-4`}
      >
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const isOpen = openDropdown === stat.id
        const isHovered = hoveredCard === stat.id && isHoverEnabled
        const showDropdown = isOpen || (isHovered && isHoverEnabled)

        const isLastColumn4 = index % 4 === 3 || index % 4 === 2
        const isLastInRow2 = index % 2 === 1
        const shouldAlignRight = isLastInRow2 || isLastColumn4

        return (
          <div
            key={stat.id}
            className="relative"
            onMouseEnter={() => isHoverEnabled && !isOpen && handleCardHover(stat.id)}
            onMouseLeave={() => isHoverEnabled && !isOpen && handleCardHover(null)}
            ref={(el) => {
              dropdownRefs.current[stat.id] = el
            }}
          >
            <Card
              className={`p-4 sm:p-5 md:p-6 cursor-pointer transition-all relative ${isOpen ? "ring-2 ring-primary" : ""} ${cardLoadingClass}`}
              onClick={() => handleCardClick(stat.id)}
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
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 truncate">{stat.value}</p>
                  <p className={`text-xs font-medium ${stat.trend === "up" ? "text-primary" : "text-muted-foreground"}`}>
                  {stat.change}
                </p>
              </div>
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ml-2 ${stat.color}`}
                >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </Card>

            {showDropdown && (
              <div
                className={`absolute z-50 mt-2 bg-popover border border-border rounded-lg shadow-lg p-3 sm:p-4 animate-in fade-in-0 zoom-in-95 ${
                  stat.id === "tax-payable" ? "w-[280px] sm:w-[380px] md:w-[450px]" : "w-[260px] sm:w-[300px] md:w-[320px]"
                } ${shouldAlignRight ? "right-0" : "left-0"}`}
                onMouseEnter={() => isHoverEnabled && handleCardHover(stat.id)}
                onMouseLeave={() => isHoverEnabled && !isOpen && handleCardHover(null)}
              >
                {stat.id === "tax-payable" && stat.isSmallBusinessExempt ? (
                  <SmallBusinessExemptionInfo />
                ) : stat.id === "tax-payable" && stat.taxCalculation ? (
                  <TaxCalculationBreakdown calculation={stat.taxCalculation} formatCurrency={formatCurrencyValue} />
                ) : stat.breakdown ? (
                  <>
                    <h4 className="font-semibold text-sm mb-3">{stat.label} Breakdown</h4>
                    <div className="space-y-3">
                      {stat.breakdown.map((item, itemIndex) => (
                        <div key={itemIndex} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-medium">{item.value}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className={`h-2 rounded-full ${stat.barColor}`} style={{ width: `${item.percentage}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground">{item.percentage}%</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No breakdown data available yet.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
      </div>
    </div>
  )
}

