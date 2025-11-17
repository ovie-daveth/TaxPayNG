"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useAuth } from "@/lib/hooks/useAuth"
import { transactionService } from "@/lib/services/transactionService"
import { toast } from "sonner"

interface IncomeExpenseChartProps {
  useMockData?: boolean
  periodType?: PeriodType
  selectedYear?: number
  selectedQuarter?: number
}

interface ChartPoint {
  key: string
  month: string
  year: number
  income: number
  expenses: number
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

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`

const buildEmptyChartDataForPeriod = (startDate: Date, endDate: Date): ChartPoint[] => {
  const points: ChartPoint[] = []
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  while (current <= end) {
    const key = `${current.getFullYear()}-${current.getMonth()}`
    points.push({
      key,
      month: current.toLocaleString("en-US", { month: "short" }),
      year: current.getFullYear(),
      income: 0,
      expenses: 0,
    })
    current.setMonth(current.getMonth() + 1)
  }

  return points
}

const mockData: ChartPoint[] = [
  { key: "2024-12", month: "Dec", year: 2024, income: 850000, expenses: 420000 },
  { key: "2025-1", month: "Jan", year: 2025, income: 920000, expenses: 450000 },
  { key: "2025-2", month: "Feb", year: 2025, income: 880000, expenses: 390000 },
  { key: "2025-3", month: "Mar", year: 2025, income: 960000, expenses: 520000 },
  { key: "2025-4", month: "Apr", year: 2025, income: 1010000, expenses: 480000 },
  { key: "2025-5", month: "May", year: 2025, income: 1100000, expenses: 540000 },
]

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const datum: ChartPoint | undefined = payload[0]?.payload
    if (!datum) return null

    return (
      <div className="bg-card border border-border rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 shadow-2xl z-50">
        <div className="font-medium text-xs sm:text-sm mb-1.5 sm:mb-2">
          {datum.month} {datum.year}
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
}

export function IncomeExpenseChart({ 
  useMockData = false,
  periodType = "quarter",
  selectedYear,
  selectedQuarter
}: IncomeExpenseChartProps) {
  const { user } = useAuth()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1

  // Use props if provided, otherwise use defaults
  const effectiveYear = selectedYear ?? currentYear
  const effectiveQuarter = selectedQuarter ?? currentQuarter

  const [chartData, setChartData] = useState<ChartPoint[]>(() => {
    const periodInfo = getQuarterInfo(now, effectiveQuarter)
    return buildEmptyChartDataForPeriod(periodInfo.start, periodInfo.end > now ? now : periodInfo.end)
  })
  const [loading, setLoading] = useState<boolean>(!useMockData)

  useEffect(() => {
    if (useMockData) {
      setChartData(mockData)
      setLoading(false)
      return
    }

    if (!user) {
      const periodInfo = periodType === "year" 
        ? getYearInfo(now, effectiveYear)
        : getQuarterInfo(now, effectiveQuarter)
      setChartData(buildEmptyChartDataForPeriod(periodInfo.start, periodInfo.end > now ? now : periodInfo.end))
      setLoading(false)
      return
    }

    let isMounted = true

    const fetchData = async () => {
      setLoading(true)
      const now = new Date()
      
      // Get period info based on selection
      let periodInfo: { start: Date; end: Date; label: string }
      if (periodType === "year") {
        periodInfo = getYearInfo(now, effectiveYear)
      } else {
        const quarterDate = new Date(effectiveYear, (effectiveQuarter - 1) * 3, 1)
        periodInfo = getQuarterInfo(quarterDate, effectiveQuarter)
      }

      const periodStart = periodInfo.start
      const periodEnd = periodInfo.end > now ? now : periodInfo.end

      try {
        const transactions = await transactionService.getTransactionsForPeriod(
          user.uid,
          periodStart.toISOString(),
          periodEnd.toISOString()
        )

        const buckets = buildEmptyChartDataForPeriod(periodStart, periodEnd).reduce<Record<string, ChartPoint>>((acc, point) => {
          acc[point.key] = { ...point }
          return acc
        }, {})

        transactions.forEach((transaction) => {
          const txnDate = new Date(transaction.date)
          const bucketKey = `${txnDate.getFullYear()}-${txnDate.getMonth()}`
          const bucket = buckets[bucketKey]

          if (!bucket) return

          if (transaction.type === "income") {
            bucket.income += Number(transaction.amount) || 0
          } else if (transaction.type === "expense") {
            bucket.expenses += Number(transaction.amount) || 0
          }
        })

        if (!isMounted) return

        const aggregated = Object.values(buckets)
        const hasData = aggregated.some((point) => point.income > 0 || point.expenses > 0)

        setChartData(hasData ? aggregated : buildEmptyChartDataForPeriod(periodStart, periodEnd))
      } catch (error) {
        console.error("Error loading income vs expenses chart:", error)
        if (!isMounted) return
        toast.error("Unable to load income vs expenses chart. Showing recent data instead.")
        setChartData(mockData)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    const handleTransactionChanged = () => {
      if (!isMounted) return
      fetchData()
    }

    window.addEventListener("transactionChanged", handleTransactionChanged)
    fetchData()

    return () => {
      isMounted = false
      window.removeEventListener("transactionChanged", handleTransactionChanged)
    }
  }, [useMockData, user?.uid, periodType, effectiveYear, effectiveQuarter])

  const chartDescription = useMemo(() => {
    if (periodType === "year") {
      return `${effectiveYear} (Full Year)`
    } else {
      const quarterInfo = getQuarterInfo(now, effectiveQuarter)
      return quarterInfo.label
    }
  }, [periodType, effectiveYear, effectiveQuarter, now])

  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="mb-4 sm:mb-5 md:mb-6">
        <h3 className="text-base sm:text-lg font-semibold">Income vs Expenses</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">{chartDescription}</p>
      </div>
      <div className="w-full h-[250px] sm:h-[280px] md:h-[300px] -ml-2 sm:ml-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 5, left: 0, bottom: 5 }}
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
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" strokeOpacity={0.3} vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
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
            <Tooltip content={<CustomTooltip />} />
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
              isAnimationActive={!loading}
            />
            <Bar
              dataKey="expenses"
              fill="url(#expenseGradient)"
              name="Expenses"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={!loading}
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
  )
}
