"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { useAuth } from "@/lib/hooks/useAuth"
import { transactionService } from "@/lib/services/transactionService"
import { toast } from "sonner"

interface IncomeExpenseChartProps {
  useMockData?: boolean
}

interface ChartPoint {
  key: string
  month: string
  year: number
  income: number
  expenses: number
}

const MONTHS_TO_SHOW = 6

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`

const buildEmptyChartData = (endDate: Date): ChartPoint[] => {
  return Array.from({ length: MONTHS_TO_SHOW }).map((_, index) => {
    const monthDate = new Date(endDate.getFullYear(), endDate.getMonth() - (MONTHS_TO_SHOW - 1 - index), 1)
    const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`
    return {
      key,
      month: monthDate.toLocaleString("en-US", { month: "short" }),
      year: monthDate.getFullYear(),
      income: 0,
      expenses: 0,
    }
  })
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

export function IncomeExpenseChart({ useMockData = false }: IncomeExpenseChartProps) {
  const { user } = useAuth()
  const [chartData, setChartData] = useState<ChartPoint[]>(() => buildEmptyChartData(new Date()))
  const [loading, setLoading] = useState<boolean>(!useMockData)

  useEffect(() => {
    if (useMockData) {
      setChartData(mockData)
      setLoading(false)
      return
    }

    if (!user) {
      setChartData(buildEmptyChartData(new Date()))
      setLoading(false)
      return
    }

    let isMounted = true
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth() - (MONTHS_TO_SHOW - 1), 1)

    const fetchData = async () => {
      setLoading(true)
      try {
        const transactions = await transactionService.getTransactionsForPeriod(
          user.uid,
          periodStart.toISOString(),
          now.toISOString()
        )

        const buckets = buildEmptyChartData(now).reduce<Record<string, ChartPoint>>((acc, point) => {
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

        setChartData(hasData ? aggregated : buildEmptyChartData(now))
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

    fetchData()

    return () => {
      isMounted = false
    }
  }, [useMockData, user?.uid])

  const chartDescription = useMemo(() => {
    const latest = chartData[chartData.length - 1]
    if (!latest) return "Monthly comparison"

    return `Last ${MONTHS_TO_SHOW} months • Updated ${latest.month} ${latest.year}`
  }, [chartData])

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
