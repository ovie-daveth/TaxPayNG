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
  netIncome: number
  transactionCount: number
  categories: Record<string, { income: number; expenses: number; count: number }>
}

interface StatsCardsProps {
  businessType?: DashboardBusinessType
  sidebarCollapsed?: boolean
  useMockData?: boolean
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

const getQuarterInfo = (date: Date) => {
  const quarter = Math.floor(date.getMonth() / 3) + 1
  const start = new Date(date.getFullYear(), (quarter - 1) * 3, 1)
  const label = `Q${quarter} ${start.getFullYear()}`
  return { quarter, start, label }
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
  quarterSummary: TransactionSummary,
  monthSummary: TransactionSummary | null,
  businessType: DashboardBusinessType,
  formatCurrency: (amount: number) => string,
  labels: PeriodLabels
): StatDefinition[] => {
  const totalIncome = quarterSummary?.totalIncome ?? 0
  const totalExpenses = quarterSummary?.totalExpenses ?? 0
  const netIncome = quarterSummary?.netIncome ?? totalIncome - totalExpenses

  const monthIncome = monthSummary?.totalIncome ?? 0
  const monthExpenses = monthSummary?.totalExpenses ?? 0
  const monthNet = monthSummary?.netIncome ?? monthIncome - monthExpenses

  const incomeTransactions = Object.values(quarterSummary.categories || {}).reduce(
    (acc, cat) => (cat.income > 0 ? acc + cat.count : acc),
    0
  )
  const expenseTransactions = Object.values(quarterSummary.categories || {}).reduce(
    (acc, cat) => (cat.expenses > 0 ? acc + cat.count : acc),
    0
  )

  const incomeBreakdown = buildCategoryBreakdown(quarterSummary, "income", totalIncome, formatCurrency)
  const expenseBreakdown = buildCategoryBreakdown(quarterSummary, "expenses", totalExpenses, formatCurrency)

  const calculatedBusinessType = businessType === "small-business" ? "sme" : businessType
  const taxCalculationRaw =
    businessType === "small-business" && totalIncome <= SMALL_BUSINESS_TURNOVER_THRESHOLD
      ? null
      : calculateNigerianTax({
          businessType: calculatedBusinessType,
          period: "yearly",
          income: totalIncome,
          rentPaid: 0,
          pensionContribution: 0,
          healthInsurance: 0,
          housingFund: 0,
          lifeInsurance: 0,
          charitableDonations: 0,
          businessExpenses: totalExpenses,
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
  const taxCardValue = taxCalculationRaw ? formatCurrency(Math.round(taxCalculationRaw.totalTax / 4)) : formatCurrency(0)
  const monthDisplay = `${labels.monthShortLabel} ${labels.year}`

  return [
    {
      id: "total-income",
      label: businessType === "small-business" ? "Total Revenue" : "Total Income",
      value: formatCurrency(totalIncome),
      change: `${labels.quarterLabel} • ${monthDisplay}: ${formatCurrency(monthIncome)}`,
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
      change: `${labels.quarterLabel} • ${monthDisplay}: ${formatCurrency(monthExpenses)}`,
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
      change: `${labels.quarterLabel} • ${monthDisplay}: ${formatCurrency(monthNet)}`,
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
      change: isSmallBusinessExempt ? "Small company exempt" : labels.quarterLabel,
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
}: StatsCardsProps) {
  const { user } = useAuth()
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
    setLoadingSummary(true)

    const now = new Date()
    const quarterInfo = getQuarterInfo(now)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nowIso = now.toISOString()
    const quarterStartIso = quarterInfo.start.toISOString()
    const monthStartIso = monthStart.toISOString()
    const labels: PeriodLabels = {
      quarterLabel: quarterInfo.label,
      monthLabel: now.toLocaleString("en-US", { month: "long" }),
      monthShortLabel: now.toLocaleString("en-US", { month: "short" }),
      year: now.getFullYear(),
    }

    Promise.all([
      transactionService.getTransactionSummary(user.uid, quarterStartIso, nowIso),
      transactionService.getTransactionSummary(user.uid, monthStartIso, nowIso),
    ])
      .then(([quarterSummary, monthSummary]) => {
        if (!isMounted) return
        setStats(buildStatsFromSummary(quarterSummary, monthSummary, businessType, formatCurrencyValue, labels))
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

    return () => {
      isMounted = false
    }
  }, [user?.uid, businessType, useMockData])

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

  return (
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
  )
}

