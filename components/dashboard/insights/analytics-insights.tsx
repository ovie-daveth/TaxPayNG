"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, TrendingUp, Lightbulb, ShieldCheck, AlertTriangle, Info } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { transactionService } from "@/lib/services/transactionService"
import type { Transaction } from "@/lib/types"
import { toast } from "sonner"
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { faqData } from "@/app/faq/components/data"
import { AuditSubscriptionsDialog } from "@/components/dashboard/audit-subscriptions-dialog"
import { calculateTaxRecommendation, type CalculationDetailsType, type PeriodType } from "./utils/tax-calculation"
import { TaxCalculationDialog } from "./components/tax-calculation-dialog"
import { calculateNigerianTax } from "@/lib/tax-calculator"

type DashboardBusinessType = "freelancer" | "creator"

interface AnalyticsInsightsProps {
  businessType?: DashboardBusinessType
  useMockData?: boolean
  periodType?: PeriodType
  selectedYear?: number
  selectedQuarter?: number
}

type InsightTone = "positive" | "warning" | "info"

type InsightActionIntent = "income" | "expense" | "relief" | "relief-info"


interface Insight {
  id: string
  title: string
  metric: string
  description: string | ReactNode
  tone: InsightTone
  action?: string
  actionIntent?: InsightActionIntent
  actionCategory?: string
  actionDescription?: string
  calculationDetails?: CalculationDetailsType
}

const TOOL_KEYWORDS = ["software", "tool", "subscription", "saas", "platform", "app", "license", "hosting"]
const MONTHS_TO_ANALYZE = 6

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

const getYearStart = (date: Date, year?: number) => {
  const y = year ?? date.getFullYear()
  return new Date(y, 0, 1)
}

const getYearEnd = (date: Date, year?: number) => {
  const y = year ?? date.getFullYear()
  return new Date(y, 11, 31, 23, 59, 59, 999)
}

const getQuarterInfo = (date: Date, quarter?: number, year?: number) => {
  const q = quarter ?? Math.floor(date.getMonth() / 3) + 1
  const y = year ?? date.getFullYear()
  const start = new Date(y, (q - 1) * 3, 1)
  const end = new Date(y, q * 3, 0, 23, 59, 59, 999)
  return { quarter: q, start, end }
}

const getPreviousYearStart = (date: Date, year?: number) => {
  const y = year ?? date.getFullYear()
  return new Date(y - 1, 0, 1)
}

const getPreviousYearEnd = (date: Date, year?: number) => {
  const y = year ?? date.getFullYear()
  return new Date(y - 1, 11, 31, 23, 59, 59, 999)
}

const getPreviousQuarterInfo = (date: Date, quarter?: number, year?: number) => {
  const q = quarter ?? Math.floor(date.getMonth() / 3) + 1
  const y = year ?? date.getFullYear()
  let prevQuarter = q - 1
  let prevYear = y
  if (prevQuarter < 1) {
    prevQuarter = 4
    prevYear = y - 1
  }
  const start = new Date(prevYear, (prevQuarter - 1) * 3, 1)
  const end = new Date(prevYear, prevQuarter * 3, 0, 23, 59, 59, 999)
  return { quarter: prevQuarter, start, end }
}

const isToolCategory = (category?: string) => {
  if (!category) return false
  const normalized = category.toLowerCase()
  return TOOL_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

const mockInsights: Insight[] = [
  {
    id: "growth",
    title: "Income momentum",
    metric: "▲ 22.5%",
    description: "Average monthly earnings grew this quarter. Keep up the steady pipeline of retainers and add-ons.",
    tone: "positive",
    action: "Schedule a quarterly pricing review",
    actionIntent: "income",
  },
  {
    id: "tool-spend",
    title: "Tooling costs",
    metric: "18% of income",
    description: "Software and platform subscriptions are eating into margins. Audit licenses you no longer need.",
    tone: "warning",
    action: "Run a tool-by-tool ROI review",
    actionIntent: "expense",
    actionCategory: "Software",
  },
  {
    id: "tax-reserve",
    title: "Tax readiness",
    metric: "₦420k set aside",
    description: "Thanks to disciplined tax reserves, you’re covered for the next quarterly filing.",
    tone: "info",
    action: "Review the reliefs you’ve logged",
    actionIntent: "relief-info",
  },
]

const toneStyles: Record<InsightTone, { badge: string; icon: ReactNode }> = {
  positive: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
  },
  warning: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  },
  info: {
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    icon: <ShieldCheck className="h-4 w-4 text-blue-500" />,
  },
}

export function AnalyticsInsights({ 
  businessType = "freelancer", 
  useMockData = false,
  periodType = "year",
  selectedYear,
  selectedQuarter
}: AnalyticsInsightsProps) {
  const { user } = useAuth()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1

  // Use props if provided, otherwise use defaults
  const effectiveYear = selectedYear ?? currentYear
  const effectiveQuarter = selectedQuarter ?? currentQuarter

  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState<boolean>(!useMockData)
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
  const [transactionPreset, setTransactionPreset] = useState<{ type: Transaction["type"]; category?: string; description?: string } | null>(null)
  const [reliefDialogOpen, setReliefDialogOpen] = useState(false)
  const [auditDialogOpen, setAuditDialogOpen] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditTransactions, setAuditTransactions] = useState<Transaction[]>([])
  const [auditPeriodLabel, setAuditPeriodLabel] = useState("")
  const [auditTotalSpend, setAuditTotalSpend] = useState(0)
  const [auditGrossIncome, setAuditGrossIncome] = useState(0)
  const [calculationDialogOpen, setCalculationDialogOpen] = useState(false)
  const [calculationDetails, setCalculationDetails] = useState<CalculationDetailsType | null>(null)

  const reliefFaq = faqData.individuals.find(
    (item) => item.category === "Tax Reliefs" && item.question === "What tax reliefs are available for individuals?"
  )

  const reliefSections = useMemo(() => {
    if (!reliefFaq) return []
    const sections: { title: string; items: string[] }[] = []
    let currentSection: { title: string; items: string[] } | null = null

    const normalize = (text: string) => text.replace(/\*\*/g, "").trim()

    reliefFaq.answer.split("\n").forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed) return

      if (trimmed.startsWith("**")) {
        const title = normalize(trimmed).replace(/:$/, "")
        currentSection = { title, items: [] }
        sections.push(currentSection)
        return
      }

      if (trimmed.endsWith(":")) {
        const title = normalize(trimmed).replace(/:$/, "")
        currentSection = { title, items: [] }
        sections.push(currentSection)
        return
      }

      if (trimmed.startsWith("•")) {
        if (!currentSection) {
          currentSection = { title: "Key reliefs", items: [] }
          sections.push(currentSection)
        }
        currentSection.items.push(normalize(trimmed.replace(/^•\s*/, "")))
      }
    })

    return sections.filter((section) => section.items.length > 0)
  }, [reliefFaq])

  useEffect(() => {
    if (useMockData) {
      setInsights(mockInsights)
      setLoading(false)
      return
    }

    if (!user) {
      setInsights([])
      setLoading(false)
      return
    }

    let isMounted = true

    const now = new Date()
    
    // Get period info based on selection
    let currentPeriodStart: Date
    let currentPeriodEnd: Date
    let previousPeriodStart: Date
    let previousPeriodEnd: Date
    let monthsInPeriod: number

    if (periodType === "year") {
      currentPeriodStart = getYearStart(now, effectiveYear)
      // If current year, use end of today; otherwise use end of year
      if (effectiveYear === now.getFullYear() && getYearEnd(now, effectiveYear) > now) {
        const endOfToday = new Date(now)
        endOfToday.setHours(23, 59, 59, 999)
        currentPeriodEnd = endOfToday
      } else {
        currentPeriodEnd = getYearEnd(now, effectiveYear)
      }
      previousPeriodStart = getPreviousYearStart(now, effectiveYear)
      previousPeriodEnd = getPreviousYearEnd(now, effectiveYear)
      monthsInPeriod = 12
    } else {
      const quarterDate = new Date(effectiveYear, (effectiveQuarter - 1) * 3, 1)
      const quarterInfo = getQuarterInfo(quarterDate, effectiveQuarter, effectiveYear)
      currentPeriodStart = quarterInfo.start
      // If current quarter, use end of today; otherwise use end of quarter
      if (quarterInfo.end > now) {
        const endOfToday = new Date(now)
        endOfToday.setHours(23, 59, 59, 999)
        currentPeriodEnd = endOfToday
      } else {
        currentPeriodEnd = quarterInfo.end
      }
      const prevQuarterInfo = getPreviousQuarterInfo(quarterDate, effectiveQuarter, effectiveYear)
      previousPeriodStart = prevQuarterInfo.start
      previousPeriodEnd = prevQuarterInfo.end
      monthsInPeriod = 3
    }

    const buildInsights = (
      transactions: Transaction[],
      yearToDateTransactions: Transaction[],
      periodType: PeriodType,
      effectiveYear: number,
      effectiveQuarter: number
    ) => {
      const currentPeriodTransactions = transactions.filter((txn) => {
        const txnDate = new Date(txn.date)
        return txnDate >= currentPeriodStart && txnDate <= currentPeriodEnd
      })

      const previousPeriodTransactions = transactions.filter((txn) => {
        const txnDate = new Date(txn.date)
        return txnDate >= previousPeriodStart && txnDate <= previousPeriodEnd
      })

      const sumAmount = (txns: Transaction[], predicate: (txn: Transaction) => boolean) =>
        txns.reduce((total, txn) => (predicate(txn) ? total + Number(txn.amount || 0) : total), 0)

      const currentIncomeTotal = sumAmount(currentPeriodTransactions, (txn) => txn.type === "income")
      const previousIncomeTotal = sumAmount(previousPeriodTransactions, (txn) => txn.type === "income")

      const currentAvgMonthlyIncome = currentIncomeTotal / monthsInPeriod
      const previousAvgMonthlyIncome = previousIncomeTotal / monthsInPeriod

      const currentExpenseTotal = sumAmount(currentPeriodTransactions, (txn) => txn.type === "expense")
      const toolSpendTotal = sumAmount(
        currentPeriodTransactions,
        (txn) => txn.type === "expense" && isToolCategory(txn.category)
      )

      const reliefTotal = sumAmount(currentPeriodTransactions, (txn) => txn.type === "relief")

      const incomeGrowth =
        previousAvgMonthlyIncome > 0
          ? ((currentAvgMonthlyIncome - previousAvgMonthlyIncome) / previousAvgMonthlyIncome) * 100
          : null

      const toolSpendRatio =
        currentIncomeTotal > 0 ? Math.round(((toolSpendTotal / currentIncomeTotal) * 100 + Number.EPSILON) * 10) / 10 : 0

      const netCash = currentIncomeTotal - currentExpenseTotal
      const expenseRatio =
        currentIncomeTotal > 0 ? Math.round(((currentExpenseTotal / currentIncomeTotal) * 100 + Number.EPSILON) * 10) / 10 : 0

      const insightsDraft: Insight[] = []
      
      // Calculate intelligent tax recommendation based on projected annual income
      const sumAmountHelper = (txns: Transaction[], predicate: (txn: Transaction) => boolean) =>
        txns.reduce((total, txn) => (predicate(txn) ? total + Number(txn.amount || 0) : total), 0)
      
      const ytdIncome = sumAmountHelper(yearToDateTransactions, (txn) => txn.type === "income")
      const ytdExpenses = sumAmountHelper(yearToDateTransactions, (txn) => txn.type === "expense")
      const ytdReliefs = sumAmountHelper(yearToDateTransactions, (txn) => txn.type === "relief")
      
      const { taxAdvice, reserveTarget, isLowEarner, calculationDetails } = calculateTaxRecommendation({
        currentIncomeTotal,
        currentExpenseTotal,
        reliefTotal,
        ytdIncome,
        ytdExpenses,
        ytdReliefs,
        yearToDateTransactions,
        periodType,
        effectiveYear,
        effectiveQuarter,
      })
      const reliefCoversReserve = reliefTotal > reserveTarget
      const periodLabel = periodType === "year" ? "year" : "quarter"

      if (incomeGrowth !== null) {
        const growthPositive = incomeGrowth >= 0
        const comparisonLabel = periodType === "year" ? "last year" : "last quarter"
        insightsDraft.push({
          id: "income-growth",
          title: "Income momentum",
          metric: `${growthPositive ? "▲" : "▼"} ${Math.abs(incomeGrowth).toFixed(1)}% vs ${comparisonLabel}`,
          description: growthPositive
            ? `Average monthly earnings rose to ${formatCurrency(currentAvgMonthlyIncome)} this ${periodLabel}.`
            : `Average monthly earnings slipped to ${formatCurrency(currentAvgMonthlyIncome)}. Revisit pricing or pipeline.`,
          tone: growthPositive ? "positive" : "warning",
          action: growthPositive ? "Lock in the winning retainers" : "Schedule a client acquisition sprint",
          actionIntent: "income",
          actionDescription: "Client project income",
        })
      } else if (currentIncomeTotal > 0) {
        const trendLabel = periodType === "year" ? "two years" : "two quarters"
        insightsDraft.push({
          id: `first-${periodLabel}`,
          title: `First ${periodLabel} on record`,
          metric: `${formatCurrency(currentAvgMonthlyIncome)} avg/month`,
          description: `Solid start! Track at least ${trendLabel} to unlock ${periodLabel}-over-${periodLabel} trends.`,
          tone: "info",
          action: "Keep booking income by tagging client projects",
          actionIntent: "income",
          actionDescription: "First retained income",
        })
      }

      if (currentIncomeTotal > 0) {
        insightsDraft.push({
          id: "tool-spend",
          title: "Tooling costs",
          metric: `${toolSpendRatio.toFixed(1)}% of income`,
          description: toolSpendTotal
            ? `Spent ${formatCurrency(toolSpendTotal)} on platforms, apps, and subscriptions this ${periodLabel}.`
            : `No tool-related expenses recorded this ${periodLabel}. Track them to understand your production costs.`,
          tone: toolSpendRatio >= (businessType === "creator" ? 18 : 15) ? "warning" : "info",
          action: toolSpendTotal ? "Audit recurring subscriptions" : "Log your tools and subscriptions",
          actionIntent: "expense",
          actionCategory: "Software",
          actionDescription: toolSpendTotal ? "Subscription audit" : "New tool expense",
        })
      }

      if (currentIncomeTotal > 0) {
        const runwayLabel = periodType === "year" ? "Annual runway" : "Quarterly runway"
        
        // Build intelligent description based on tax situation
        let description: string | ReactNode
        if (netCash < 0) {
          description = `You spent more than you earned this ${periodLabel}. Cut big costs or nudge invoices so cash stays positive.`
        } else if (isLowEarner && reserveTarget === 0) {
          // Tax-free threshold
          description = `You kept ${formatCurrency(netCash)} after expenses. ${taxAdvice} No tax reserve needed, but keep tracking your income.`
        } else if (isLowEarner) {
          // Low tax bracket
          // Calculate actual period tax instead of dividing annual by 4
          let reserveForPeriod = reserveTarget
          if (periodType === "quarter" && currentIncomeTotal > 0) {
            // Calculate tax for this quarter's actual income
            const quarterTax = calculateNigerianTax({
              businessType: businessType,
              period: "yearly",
              income: currentIncomeTotal,
              businessExpenses: currentExpenseTotal,
              rentPaid: 0,
              pensionContribution: 0,
              healthInsurance: 0,
              housingFund: 0,
              lifeInsurance: 0,
              charitableDonations: 0,
              dependents: 0,
            })
            reserveForPeriod = quarterTax.totalTax
          }
          description = `You kept ${formatCurrency(netCash)} after expenses. ${taxAdvice} Set aside ${formatCurrency(reserveForPeriod)} for tax this ${periodLabel}.`
        } else if (reliefCoversReserve) {
          // Reliefs cover tax
          description = `You kept ${formatCurrency(netCash)} after expenses. Your reliefs (${formatCurrency(reliefTotal)}) may cover most of your tax liability. ${taxAdvice}`
        } else {
          // Standard case
          // Calculate actual period tax instead of dividing annual by 4
          let reserveForPeriod = reserveTarget
          if (periodType === "quarter" && currentIncomeTotal > 0) {
            // Calculate tax for this quarter's actual income
            const quarterTax = calculateNigerianTax({
              businessType: businessType,
              period: "yearly",
              income: currentIncomeTotal,
              businessExpenses: currentExpenseTotal,
              rentPaid: 0,
              pensionContribution: 0,
              healthInsurance: 0,
              housingFund: 0,
              lifeInsurance: 0,
              charitableDonations: 0,
              dependents: 0,
            })
            reserveForPeriod = quarterTax.totalTax
          }
          const reservePercentage = netCash > 0 ? ((reserveForPeriod / netCash) * 100).toFixed(0) : "0"
          description = `You kept ${formatCurrency(netCash)} after expenses. ${taxAdvice} Set aside ${formatCurrency(reserveForPeriod)} for tax this ${periodLabel} (${reservePercentage}% of what you kept).`
        }
        
        insightsDraft.push({
          id: "profitability",
          title: runwayLabel,
          metric: netCash >= 0 ? `${formatCurrency(netCash)} retained` : `${formatCurrency(Math.abs(netCash))} overspent`,
          description,
          tone: netCash >= 0 ? "positive" : "warning",
          action: netCash >= 0 ? undefined : "Flag big-ticket expenses for review",
          actionIntent: netCash >= 0 ? undefined : "expense",
          actionDescription: netCash >= 0 ? undefined : "Expense review",
          calculationDetails: netCash >= 0 ? calculationDetails : undefined,
        })
      } else {
        insightsDraft.push({
          id: "income-needed",
          title: "No income recorded",
          metric: "Add transactions",
          description: "Log income and expenses to unlock personalized growth and tax readiness insights.",
          tone: "info",
          action: "Create your first income transaction",
          actionIntent: "income",
          actionDescription: "First client payment",
        })
      }

      if (reliefTotal > 0) {
        insightsDraft.push({
          id: "tax-relief",
          title: "Tax relief captured",
          metric: formatCurrency(reliefTotal),
          description: "Relief transactions reduce your taxable base. Keep tagging pension, health, and allowable reliefs.",
          tone: "positive",
          action: "Review relief categories before filing",
          actionIntent: "relief-info",
        })
      }

      return insightsDraft.slice(0, 4)
    }

    const fetchInsights = async () => {
      setLoading(true)
      try {
        // Get period info based on selection
        let currentPeriodStart: Date
        let currentPeriodEnd: Date
        let previousPeriodStart: Date
        let previousPeriodEnd: Date
        let yearStart: Date
        let yearEnd: Date

        if (periodType === "year") {
          currentPeriodStart = getYearStart(now, effectiveYear)
          // If current year, use end of today; otherwise use end of year
          if (effectiveYear === now.getFullYear() && getYearEnd(now, effectiveYear) > now) {
            const endOfToday = new Date(now)
            endOfToday.setHours(23, 59, 59, 999)
            currentPeriodEnd = endOfToday
          } else {
            currentPeriodEnd = getYearEnd(now, effectiveYear)
          }
          previousPeriodStart = getPreviousYearStart(now, effectiveYear)
          previousPeriodEnd = getPreviousYearEnd(now, effectiveYear)
          yearStart = currentPeriodStart
          yearEnd = currentPeriodEnd
        } else {
          const quarterDate = new Date(effectiveYear, (effectiveQuarter - 1) * 3, 1)
          const quarterInfo = getQuarterInfo(quarterDate, effectiveQuarter, effectiveYear)
          currentPeriodStart = quarterInfo.start
          // If current quarter, use end of today; otherwise use end of quarter
          if (quarterInfo.end > now) {
            const endOfToday = new Date(now)
            endOfToday.setHours(23, 59, 59, 999)
            currentPeriodEnd = endOfToday
          } else {
            currentPeriodEnd = quarterInfo.end
          }
          const prevQuarterInfo = getPreviousQuarterInfo(quarterDate, effectiveQuarter, effectiveYear)
          previousPeriodStart = prevQuarterInfo.start
          previousPeriodEnd = prevQuarterInfo.end
          yearStart = getYearStart(now, effectiveYear)
          // If current year, use end of today; otherwise use end of year
          if (effectiveYear === now.getFullYear() && getYearEnd(now, effectiveYear) > now) {
            const endOfToday = new Date(now)
            endOfToday.setHours(23, 59, 59, 999)
            yearEnd = endOfToday
          } else {
            yearEnd = getYearEnd(now, effectiveYear)
          }
        }
        
        // Fetch transactions for current period, previous period, and full year (for accurate projections)
        const [currentPeriodTransactions, previousPeriodTransactions, yearToDateTransactions] = await Promise.all([
          transactionService.getTransactionsForPeriod(
            user.uid,
            currentPeriodStart.toISOString(),
            currentPeriodEnd.toISOString()
          ),
          transactionService.getTransactionsForPeriod(
            user.uid,
            previousPeriodStart.toISOString(),
            previousPeriodEnd.toISOString()
          ),
          // Fetch all transactions from the start of the year to now for accurate projections
          transactionService.getTransactionsForPeriod(
            user.uid,
            yearStart.toISOString(),
            yearEnd.toISOString()
          )
        ])
        
        // Combine for analysis
        const transactions = [...currentPeriodTransactions, ...previousPeriodTransactions]

        if (!isMounted) return

        const computedInsights = buildInsights(transactions, yearToDateTransactions, periodType, effectiveYear, effectiveQuarter)
        setInsights(computedInsights)
      } catch (error) {
        console.error("Error loading analytics insights:", error)
        if (isMounted) {
          toast.error("Unable to load analytics insights. Showing recent trends instead.")
          setInsights(mockInsights)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    const handleTransactionChanged = () => {
      if (!isMounted) return
      fetchInsights()
    }

    window.addEventListener("transactionChanged", handleTransactionChanged)
    fetchInsights()

    return () => {
      isMounted = false
      window.removeEventListener("transactionChanged", handleTransactionChanged)
    }
  }, [businessType, useMockData, user?.uid, periodType, effectiveYear, effectiveQuarter])

  const headerText = useMemo(() => {
    if (loading) return "Crunching numbers..."
    if (insights.length === 0) return "Add transactions to unlock tailored insights"
    return "Pro tips powered by your tax data"
  }, [insights.length, loading])

  const handleTransactionSubmit = async (
    data: Omit<Transaction, "id" | "userId" | "createdAt" | "updatedAt">
  ) => {
    if (!user) {
      toast.error("Please sign in to log transactions.")
      return { success: false, error: "Not authenticated" }
    }

    const result = await transactionService.createTransaction(user.uid, data)
    if (result.success) {
      setTransactionDialogOpen(false)
      setTransactionPreset(null)
    }
    return result
  }

  const loadToolAudit = useCallback(async () => {
    if (useMockData) {
      toast.info("Audit workspace is available after you connect your real data.")
      return
    }

    const uid = user?.uid
    if (!uid) {
      toast.info("Sign in to prepare audit evidence.")
      return
    }

    setAuditDialogOpen(true)
    setAuditLoading(true)

    try {
      const now = new Date()
      
      // Get period info based on selection
      let periodStart: Date
      let periodEnd: Date
      
      if (periodType === "year") {
        periodStart = getYearStart(now, effectiveYear)
        periodEnd = getYearEnd(now, effectiveYear) > now ? now : getYearEnd(now, effectiveYear)
      } else {
        const quarterDate = new Date(effectiveYear, (effectiveQuarter - 1) * 3, 1)
        const quarterInfo = getQuarterInfo(quarterDate, effectiveQuarter, effectiveYear)
        periodStart = quarterInfo.start
        periodEnd = quarterInfo.end > now ? now : quarterInfo.end
      }
      
      const transactions = await transactionService.getTransactionsForPeriod(
        uid,
        periodStart.toISOString(),
        periodEnd.toISOString()
      )

      const subscriptionTransactions = transactions.filter(
        (txn) => txn.type === "expense" && isToolCategory(txn.category)
      )

      const incomeTotal = transactions
        .filter((txn) => txn.type === "income")
        .reduce((sum, txn) => sum + (txn.amount || 0), 0)

      setAuditTransactions(subscriptionTransactions)
      setAuditTotalSpend(
        subscriptionTransactions.reduce((sum, txn) => sum + (txn.amount || 0), 0)
      )
      setAuditPeriodLabel(`${formatDateLabel(periodStart)} – ${formatDateLabel(periodEnd)}`)
      setAuditGrossIncome(incomeTotal)

      if (subscriptionTransactions.length === 0) {
        const periodLabel = periodType === "year" ? "year" : "quarter"
        toast.info(`No recurring subscription expenses logged this ${periodLabel} yet. Add them to start an audit.`)
      }
    } catch (error) {
      console.error("Error preparing subscription audit:", error)
      toast.error("Couldn't load your subscription audit data. Please try again.")
      setAuditTransactions([])
      setAuditTotalSpend(0)
      setAuditGrossIncome(0)
    } finally {
      setAuditLoading(false)
    }
  }, [useMockData, user?.uid, periodType, effectiveYear, effectiveQuarter])

  const handleActionClick = (insight: Insight) => {
    if (!insight.actionIntent) return

    if (insight.id === "tool-spend" && insight.action?.toLowerCase().includes("audit")) {
      loadToolAudit()
      return
    }

    if (insight.actionIntent === "relief-info") {
      setReliefDialogOpen(true)
      return
    }

    if (useMockData) {
      toast.info("Insights preview only. Sign in to log transactions.")
      return
    }

    if (!user) {
      toast.info("Sign in to log transactions.")
      return
    }

    setTransactionPreset({
      type: insight.actionIntent,
      category: insight.actionCategory,
      description: insight.actionDescription,
    })
    setTransactionDialogOpen(true)
  }

  return (
    <Card className="p-4 sm:p-5 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-base sm:text-lg font-semibold">Analytics insights</h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{headerText}</p>
        </div>
        <Badge variant="outline" className="text-xs sm:text-sm">
          {periodType === "year" ? "Year view" : `Q${effectiveQuarter} ${effectiveYear}`}
        </Badge>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="border border-border rounded-xl p-4 space-y-3 animate-pulse">
                <div className="w-20 h-4 bg-muted rounded" />
                <div className="h-5 bg-muted rounded" />
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            ))
          : insights.map((insight) => {
              const tone = toneStyles[insight.tone]
              return (
                <div key={insight.id} className="border border-border rounded-xl p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className={`gap-2 ${tone.badge}`}>
                      {tone.icon}
                      <span className="text-[10px] sm:text-xs uppercase tracking-wide">{insight.title}</span>
                    </Badge>
                    <span className="text-sm font-semibold">{insight.metric}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{insight.description}</div>
                  {insight.action && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-xs sm:text-sm font-medium"
                      onClick={() => handleActionClick(insight)}
                    >
                      <Lightbulb className="h-3.5 w-3.5 mr-1 text-primary" />
                      {insight.action}
                    </Button>
                  )}
                  {insight.calculationDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute bottom-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setCalculationDetails(insight.calculationDetails || null)
                        setCalculationDialogOpen(true)
                      }}
                      title="View calculation breakdown"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )
            })}
      </div>

      <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-2 pt-2 border-t border-border">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        Insights combine your logged income, expenses, and tax reliefs to surface growth and compliance opportunities.
      </p>

      <AuditSubscriptionsDialog
        open={auditDialogOpen}
        onOpenChange={(open) => {
          setAuditDialogOpen(open)
          if (!open) {
            setAuditTransactions([])
            setAuditLoading(false)
            setAuditTotalSpend(0)
            setAuditGrossIncome(0)
            setAuditPeriodLabel("")
          }
        }}
        transactions={auditTransactions}
        isLoading={auditLoading}
        totalSpend={auditTotalSpend}
        periodLabel={auditPeriodLabel}
        businessType={businessType}
        grossIncome={auditGrossIncome}
        onRequestNewExpense={() => {
          setTransactionPreset({
            type: "expense",
            category: "Software",
            description: "Software subscription",
          })
          setTransactionDialogOpen(true)
        }}
      />

      <AddTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={(open) => {
          setTransactionDialogOpen(open)
          if (!open) {
            setTransactionPreset(null)
          }
        }}
        onSubmit={handleTransactionSubmit}
        transaction={null}
        defaultType={transactionPreset?.type}
        defaultCategory={transactionPreset?.category}
        defaultDescription={transactionPreset?.description}
      />

      <Dialog open={reliefDialogOpen} onOpenChange={setReliefDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Eligible Tax Reliefs</DialogTitle>
            <DialogDescription>
              Based on our FAQ guidance, these reliefs lower your taxable income when logged consistently.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-4 text-sm text-muted-foreground">
            {reliefSections.length > 0 ? (
              reliefSections.map((section) => (
                <div key={section.title} className="space-y-2">
                  <p className="font-medium text-foreground">{section.title}</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p>We’re updating our relief knowledge. Check back soon.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Tip: Log each relief as a "Tax Relief" transaction so your tax summary stays accurate before filing.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <TaxCalculationDialog
        open={calculationDialogOpen}
        onOpenChange={setCalculationDialogOpen}
        calculationDetails={calculationDetails}
      />
    </Card>
  )
}

