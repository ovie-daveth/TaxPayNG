"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, DollarSign, FileText, BarChart3, ArrowUpRight, ArrowDownRight, Info } from "lucide-react"
import { platformAnalyticsService, PlatformAnalyticsSummary, type PlatformAnalytics } from "@/lib/services/platformAnalyticsService"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { formatCurrencyAmount } from "@/lib/utils/currency"
import { formatDate } from "@/lib/utils/date"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { Transaction } from "@/lib/types"
import { Eye } from "lucide-react"
import { ViewTransactionDialog } from "@/components/transactions/view-transaction-dialog"

const formatCurrency = (amount: number): string => {
  return formatCurrencyAmount(amount, 'NGN')
}

interface StatBreakdown {
  label: string
  value: string
  percentage: number
}

interface PlatformStatDefinition {
  id: string
  label: string
  value: string
  change?: string
  trend: "up" | "down" | "neutral"
  icon: LucideIcon
  color: string
  barColor: string
  breakdown?: StatBreakdown[]
}

interface PlatformAnalyticsProps {
  startDate?: string
  endDate?: string
}

export function PlatformAnalytics({ startDate, endDate }: PlatformAnalyticsProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<PlatformAnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'all' | 'year' | 'quarter' | 'month'>('all')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [isHoverEnabled, setIsHoverEnabled] = useState(false)
  const [showTapHint, setShowTapHint] = useState(false)
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const handleGeneratePlatformReport = (platformName: string) => {
    // Navigate to report generation with platform filter
    const params = new URLSearchParams()
    params.set('platform', platformName)
    if (period !== 'all') {
      params.set('period', period)
    }
    // Use creator-specific route
    router.push(`/dashboard-creator/reports/generate/self-assessment?${params.toString()}`)
  }

  useEffect(() => {
    if (!user?.uid || profile?.businessType !== 'creator') {
      setLoading(false)
      return
    }

    loadAnalytics()
  }, [user, profile, period, startDate, endDate])

  useEffect(() => {
    // Enable hover after a delay to prevent accidental hovers
    const timer = setTimeout(() => {
      setIsHoverEnabled(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Show tap hint on mobile after delay
    const timer = setTimeout(() => {
      setShowTapHint(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  const loadAnalytics = async () => {
    if (!user?.uid) return

    setLoading(true)
    try {
      let dateRange: { startDate?: string; endDate?: string } = {}

      if (period !== 'all') {
        const now = new Date()
        switch (period) {
          case 'year':
            dateRange.startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
            dateRange.endDate = new Date().toISOString().split('T')[0]
            break
          case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3)
            dateRange.startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0]
            dateRange.endDate = new Date().toISOString().split('T')[0]
            break
          case 'month':
            dateRange.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
            dateRange.endDate = new Date().toISOString().split('T')[0]
            break
        }
      } else if (startDate || endDate) {
        dateRange.startDate = startDate
        dateRange.endDate = endDate
      }

      const result = await platformAnalyticsService.getPlatformAnalytics(
        user.uid,
        dateRange.startDate,
        dateRange.endDate
      )
      setAnalytics(result)
    } catch (error) {
      console.error('Error loading platform analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (profile?.businessType !== 'creator') {
    return null
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </Card>
    )
  }

  if (!analytics || analytics.platforms.length === 0) {
    return null // Don't show empty state on main dashboard
  }

  // Prepare chart data
  const chartData = analytics.platforms.map(platform => ({
    name: platform.platformName,
    income: platform.totalIncome,
    expenses: platform.totalExpenses,
    profit: platform.netProfit
  }))

  // Color mapping for platforms
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

  // Build breakdown data for stats
  const buildPlatformBreakdown = (type: 'income' | 'expenses' | 'profit'): StatBreakdown[] => {
    if (!analytics || analytics.platforms.length === 0) return []
    
    const total = type === 'income' 
      ? analytics.totalIncome 
      : type === 'expenses' 
      ? analytics.totalExpenses 
      : analytics.totalNetProfit

    if (total === 0) return []

    return analytics.platforms
      .map(platform => {
        const value = type === 'income' 
          ? platform.totalIncome 
          : type === 'expenses' 
          ? platform.totalExpenses 
          : platform.netProfit
        const percentage = total > 0 ? (value / total) * 100 : 0
        return {
          label: platform.platformName,
          value: formatCurrency(value),
          percentage: Math.round(percentage * 10) / 10
        }
      })
      .filter(item => item.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage)
  }

  // Build stats definitions
  const buildStats = (): PlatformStatDefinition[] => {
    if (!analytics) return []

    const incomeBreakdown = buildPlatformBreakdown('income')
    const expenseBreakdown = buildPlatformBreakdown('expenses')
    const profitBreakdown = buildPlatformBreakdown('profit')

    return [
      {
        id: "total-income",
        label: "Total Income",
        value: formatCurrency(analytics.totalIncome),
        change: `${analytics.platforms.length} platform${analytics.platforms.length !== 1 ? 's' : ''}`,
        trend: analytics.totalIncome > 0 ? "up" : "neutral",
        icon: ArrowUpRight,
        color: "text-primary",
        barColor: "bg-primary",
        breakdown: incomeBreakdown,
      },
      {
        id: "total-expenses",
        label: "Total Expenses",
        value: formatCurrency(analytics.totalExpenses),
        change: `${analytics.platforms.filter(p => p.totalExpenses > 0).length} platform${analytics.platforms.filter(p => p.totalExpenses > 0).length !== 1 ? 's' : ''}`,
        trend: "down",
        icon: ArrowDownRight,
        color: "text-destructive",
        barColor: "bg-destructive",
        breakdown: expenseBreakdown,
      },
      {
        id: "net-profit",
        label: "Net Profit",
        value: formatCurrency(analytics.totalNetProfit),
        change: analytics.totalNetProfit >= 0 ? "Profitable" : "Loss",
        trend: analytics.totalNetProfit >= 0 ? "up" : "down",
        icon: TrendingUp,
        color: analytics.totalNetProfit >= 0 ? "text-green-500" : "text-destructive",
        barColor: analytics.totalNetProfit >= 0 ? "bg-green-500" : "bg-destructive",
        breakdown: profitBreakdown,
      },
      {
        id: "total-transactions",
        label: "Total Transactions",
        value: analytics.totalTransactions.toString(),
        change: `${analytics.platforms.length} platform${analytics.platforms.length !== 1 ? 's' : ''}`,
        trend: "neutral",
        icon: FileText,
        color: "text-muted-foreground",
        barColor: "bg-muted-foreground",
        breakdown: analytics.platforms.map(platform => ({
          label: platform.platformName,
          value: platform.transactionCount.toString(),
          percentage: analytics.totalTransactions > 0 
            ? Math.round((platform.transactionCount / analytics.totalTransactions) * 1000) / 10 
            : 0
        })).filter(item => item.percentage > 0).sort((a, b) => b.percentage - a.percentage),
      },
    ]
  }

  const stats = buildStats()

  const handleCardClick = (statId: string) => {
    if (openDropdown === statId) {
      setOpenDropdown(null)
    } else {
      setOpenDropdown(statId)
      setIsHoverEnabled(false)
      setShowTapHint(false)
    }
  }

  const handleCardHover = (statId: string | null) => {
    if (!isHoverEnabled) return
    setHoveredCard(statId)
  }

  const handleViewTransaction = (transaction: Transaction) => {
    setViewingTransaction(transaction)
    setIsViewDialogOpen(true)
  }

  // Get recent transactions per platform (most recent 5)
  const getRecentTransactions = (platform: PlatformAnalytics): Transaction[] => {
    const allTransactions = [
      ...platform.incomeTransactions,
      ...platform.expenseTransactions
    ]
    
    // Sort by date (most recent first)
    return allTransactions
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0)
        const dateB = b.date ? new Date(b.date).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0)
        return dateB - dateA
      })
      .slice(0, 5) // Get top 5 most recent
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Header with Period Selector */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-1">Platform Analytics</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Track income, expenses, and profitability by platform
            </p>
          </div>
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
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
                className={`p-4 sm:p-5 md:p-6 cursor-pointer transition-all relative h-full flex flex-col ${isOpen ? "ring-2 ring-primary" : ""}`}
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
                <div className="flex items-start justify-between flex-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">{stat.label}</p>
                    <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-1 sm:mb-1.5 md:mb-2 truncate">{stat.value}</p>
                    {stat.change && (
                      <p className={`text-[10px] sm:text-xs font-medium ${stat.trend === "up" ? "text-primary" : stat.trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
                        {stat.change}
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ml-2 ${stat.color}`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                  </div>
                </div>
              </Card>

              {showDropdown && stat.breakdown && stat.breakdown.length > 0 && (
                <div
                  className={`absolute z-50 mt-2 bg-popover border border-border rounded-lg shadow-lg p-3 sm:p-4 animate-in fade-in-0 zoom-in-95 w-[260px] sm:w-[300px] md:w-[320px] ${shouldAlignRight ? "right-0" : "left-0"}`}
                  onMouseEnter={() => isHoverEnabled && handleCardHover(stat.id)}
                  onMouseLeave={() => isHoverEnabled && !isOpen && handleCardHover(null)}
                >
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
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Chart */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="mb-4 sm:mb-5 md:mb-6">
          <h3 className="text-base sm:text-lg font-semibold">Platform Performance</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Income, expenses, and profitability by platform
          </p>
        </div>
        <div className="w-full h-[250px] sm:h-[280px] md:h-[300px] -ml-2 sm:ml-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 5, left: 0, bottom: 60 }}
              className="sm:!ml-0"
              barGap={8}
              barCategoryGap="20%"
            >
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#007F5F" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#004D40" stopOpacity={0.95} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFC107" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#FF9800" stopOpacity={0.95} />
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.95} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" strokeOpacity={0.3} vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{
                  className: "fill-muted-foreground",
                  fontSize: 10,
                  fontWeight: 500,
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  className: "fill-muted-foreground",
                  fontSize: 10,
                  fontWeight: 500,
                }}
                tickFormatter={(value) => {
                  if (value >= 1_000_000) return `₦${value / 1_000_000}m`
                  if (value >= 1_000) return `₦${value / 1_000}k`
                  return `₦${value}`
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0]?.payload
                    if (!data) return null

                    return (
                      <div className="bg-card border border-border rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 shadow-2xl z-50">
                        <div className="font-medium text-xs sm:text-sm mb-1.5 sm:mb-2">
                          {data.name}
                        </div>
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center gap-1.5 sm:gap-2 mb-1 last:mb-0">
                            <div
                              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {entry.name}: <span className="font-semibold text-foreground">{formatCurrency(entry.value)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: "15px",
                  fontSize: "12px",
                  fontWeight: "500",
                }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="income"
                fill="url(#incomeGradient)"
                name="Income"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="expenses"
                fill="url(#expenseGradient)"
                name="Expenses"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="profit"
                fill="url(#profitGradient)"
                name="Net Profit"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <div className="h-3 w-3 rounded-full bg-primary animate-ping" />
                Loading chart...
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Transactions per Platform - Table View */}
      <Card className="p-4 sm:p-5 md:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Recent Transactions by Platform</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground">Platform</th>
                <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground">Description</th>
                <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground">Category</th>
                <th className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-right py-1.5 px-2 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-center py-1.5 px-2 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {analytics.platforms.map((platform, platformIndex) => {
                const recentTransactions = getRecentTransactions(platform)
                if (recentTransactions.length === 0) return null

                return recentTransactions.map((transaction) => {
                  const transactionDate = transaction.date || transaction.createdAt
                  const displayAmount = transaction.netAmount !== undefined 
                    ? transaction.netAmount 
                    : (typeof transaction.amount === 'number' 
                      ? transaction.amount 
                      : Number(String(transaction.amount).replace(/[\u20A6,]/g, '').trim()) || 0)
                  
                  // Handle foreign currency
                  let originalAmount: number | null = null
                  if (transaction.currency && transaction.currency !== 'NGN' && transaction.exchangeRate) {
                    if (transaction.ngnEquivalent) {
                      originalAmount = transaction.ngnEquivalent / transaction.exchangeRate
                    } else {
                      originalAmount = displayAmount / transaction.exchangeRate
                    }
                  }

                  return (
                    <tr
                      key={transaction.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleViewTransaction(transaction)}
                    >
                      <td className="py-2 px-2 align-top">
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: colors[platformIndex % colors.length] }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{platform.platformName}</div>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 mt-0.5 capitalize">
                              {platform.platformType}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 align-top text-xs text-muted-foreground whitespace-nowrap">
                        {transactionDate ? formatDate(transactionDate) : 'N/A'}
                      </td>
                      <td className="py-2 px-2 align-top">
                        <div className="text-xs font-medium">
                          {transaction.description || 'Untitled transaction'}
                        </div>
                      </td>
                      <td className="py-2 px-2 align-top">
                        {transaction.category ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {transaction.category}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2 px-2 align-top">
                        <Badge 
                          variant={transaction.type === 'income' ? 'default' : 'destructive'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {transaction.type === 'income' ? 'Income' : 'Expense'}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 align-top text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-xs font-semibold whitespace-nowrap ${
                            transaction.type === 'income' ? 'text-primary' : 'text-destructive'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatCurrency(displayAmount)}
                          </span>
                          {originalAmount !== null && transaction.currency && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {transaction.currency} {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: transaction.currency,
                                minimumFractionDigits: 0,
                              }).format(originalAmount)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 align-top text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewTransaction(transaction)
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Platform Details - Compact View */}
      {analytics.platforms.length > 3 && (
        <Card className="p-4 sm:p-5 md:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4">All Platforms</h3>
          <div className="space-y-3">
            {analytics.platforms.map((platform, index) => (
              <div key={platform.platformName} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold truncate">{platform.platformName}</h4>
                      <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                        {platform.platformType}
                      </Badge>
                      {platform === analytics.mostProfitablePlatform && (
                        <Badge className="bg-green-500 text-xs">Top</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Income: {formatCurrency(platform.totalIncome)}</span>
                      <span>Profit: <span className={platform.netProfit >= 0 ? 'text-primary' : 'text-destructive'}>{formatCurrency(platform.netProfit)}</span></span>
                      <span>{platform.transactionCount} txn</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGeneratePlatformReport(platform.platformName)}
                  className="ml-2 flex-shrink-0"
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* View Transaction Dialog */}
      {viewingTransaction && (
        <ViewTransactionDialog
          transaction={viewingTransaction}
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          onEdit={() => {
            setIsViewDialogOpen(false)
            // Navigate to transactions page with edit mode
            router.push('/dashboard-creator/transactions')
          }}
        />
      )}
    </div>
  )
}

