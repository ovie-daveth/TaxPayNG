"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, TrendingUp, Lightbulb, ShieldCheck, AlertTriangle } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { transactionService } from "@/lib/services/transactionService"
import type { Transaction } from "@/lib/types"
import { toast } from "sonner"
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { faqData } from "@/app/faq/components/data"

type DashboardBusinessType = "freelancer" | "creator"

interface AnalyticsInsightsProps {
  businessType?: DashboardBusinessType
  useMockData?: boolean
}

type InsightTone = "positive" | "warning" | "info"

type InsightActionIntent = "income" | "expense" | "relief" | "relief-info"

interface Insight {
  id: string
  title: string
  metric: string
  description: string
  tone: InsightTone
  action?: string
  actionIntent?: InsightActionIntent
  actionCategory?: string
  actionDescription?: string
}

const TOOL_KEYWORDS = ["software", "tool", "subscription", "saas", "platform", "app", "license", "hosting"]
const MONTHS_TO_ANALYZE = 6

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`

const getQuarterStart = (date: Date) => {
  const quarter = Math.floor(date.getMonth() / 3)
  return new Date(date.getFullYear(), quarter * 3, 1)
}

const subtractMonths = (date: Date, months: number) => {
  const result = new Date(date)
  result.setMonth(result.getMonth() - months)
  return result
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

export function AnalyticsInsights({ businessType = "freelancer", useMockData = false }: AnalyticsInsightsProps) {
  const { user } = useAuth()
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState<boolean>(!useMockData)
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
  const [transactionPreset, setTransactionPreset] = useState<{ type: Transaction["type"]; category?: string; description?: string } | null>(null)
  const [reliefDialogOpen, setReliefDialogOpen] = useState(false)

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
    const currentQuarterStart = getQuarterStart(now)
    const previousQuarterStart = subtractMonths(currentQuarterStart, 3)
    const lookbackStart = subtractMonths(currentQuarterStart, MONTHS_TO_ANALYZE - 3)

    const buildInsights = (transactions: Transaction[]) => {
      const currentQuarterTransactions = transactions.filter((txn) => {
        const txnDate = new Date(txn.date)
        return txnDate >= currentQuarterStart
      })

      const previousQuarterTransactions = transactions.filter((txn) => {
        const txnDate = new Date(txn.date)
        return txnDate >= previousQuarterStart && txnDate < currentQuarterStart
      })

      const sumAmount = (txns: Transaction[], predicate: (txn: Transaction) => boolean) =>
        txns.reduce((total, txn) => (predicate(txn) ? total + Number(txn.amount || 0) : total), 0)

      const currentIncomeTotal = sumAmount(currentQuarterTransactions, (txn) => txn.type === "income")
      const previousIncomeTotal = sumAmount(previousQuarterTransactions, (txn) => txn.type === "income")

      const currentAvgMonthlyIncome = currentIncomeTotal / 3
      const previousAvgMonthlyIncome = previousIncomeTotal / 3

      const currentExpenseTotal = sumAmount(currentQuarterTransactions, (txn) => txn.type === "expense")
      const toolSpendTotal = sumAmount(
        currentQuarterTransactions,
        (txn) => txn.type === "expense" && isToolCategory(txn.category)
      )

      const reliefTotal = sumAmount(currentQuarterTransactions, (txn) => txn.type === "relief")

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

      if (incomeGrowth !== null) {
        const growthPositive = incomeGrowth >= 0
        insightsDraft.push({
          id: "income-growth",
          title: "Income momentum",
          metric: `${growthPositive ? "▲" : "▼"} ${Math.abs(incomeGrowth).toFixed(1)}% vs last quarter`,
          description: growthPositive
            ? `Average monthly earnings rose to ${formatCurrency(currentAvgMonthlyIncome)} this quarter.`
            : `Average monthly earnings slipped to ${formatCurrency(currentAvgMonthlyIncome)}. Revisit pricing or pipeline.`,
          tone: growthPositive ? "positive" : "warning",
          action: growthPositive ? "Lock in the winning retainers" : "Schedule a client acquisition sprint",
          actionIntent: "income",
          actionDescription: "Client project income",
        })
      } else if (currentIncomeTotal > 0) {
        insightsDraft.push({
          id: "first-quarter",
          title: "First quarter on record",
          metric: formatCurrency(currentAvgMonthlyIncome),
          description: "Solid start! Track at least two quarters to unlock quarter-over-quarter trends.",
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
            ? `Spent ${formatCurrency(toolSpendTotal)} on platforms, apps, and subscriptions this quarter.`
            : "No tool-related expenses recorded this quarter. Track them to understand your production costs.",
          tone: toolSpendRatio >= (businessType === "creator" ? 18 : 15) ? "warning" : "info",
          action: toolSpendTotal ? "Audit recurring subscriptions" : "Log your SaaS and editing tools",
          actionIntent: "expense",
          actionCategory: "Software",
          actionDescription: toolSpendTotal ? "Subscription audit" : "New SaaS subscription",
        })
      }

      if (currentIncomeTotal > 0) {
        insightsDraft.push({
          id: "profitability",
          title: "Quarterly runway",
          metric: netCash >= 0 ? `${formatCurrency(netCash)} retained` : `${formatCurrency(Math.abs(netCash))} overspent`,
          description:
            netCash >= 0
              ? `Expenses consumed ${expenseRatio.toFixed(1)}% of income. Consider transferring ${formatCurrency(
                  Math.max(netCash * 0.3, reliefTotal)
                )} to your tax reserve.`
              : `Expenses exceeded income this quarter. Trim discretionary costs or shift billing schedules to stay cashflow positive.`,
          tone: netCash >= 0 ? "positive" : "warning",
          action: netCash >= 0 ? "Automate your monthly tax transfer" : "Flag big-ticket expenses for review",
          actionIntent: netCash >= 0 ? "relief" : "expense",
          actionDescription: netCash >= 0 ? "Tax reserve transfer" : "Expense review",
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
        const transactions = await transactionService.getTransactionsForPeriod(
          user.uid,
          lookbackStart.toISOString(),
          now.toISOString()
        )

        if (!isMounted) return

        const computedInsights = buildInsights(transactions)
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

    fetchInsights()

    return () => {
      isMounted = false
    }
  }, [businessType, useMockData, user?.uid])

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

  const handleActionClick = (insight: Insight) => {
    if (!insight.actionIntent) return

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
          Quarter view
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
                <div key={insight.id} className="border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className={`gap-2 ${tone.badge}`}>
                      {tone.icon}
                      <span className="text-[10px] sm:text-xs uppercase tracking-wide">{insight.title}</span>
                    </Badge>
                    <span className="text-sm font-semibold">{insight.metric}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{insight.description}</p>
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
                </div>
              )
            })}
      </div>

      <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-2 pt-2 border-t border-border">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        Insights combine your logged income, expenses, and tax reliefs to surface growth and compliance opportunities.
      </p>

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
              Tip: Log each relief as a “Tax Relief” transaction so your tax summary stays accurate before filing.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

