"use client"

import { useState, useEffect } from "react"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { IncomeExpenseChart } from "@/components/dashboard/income-expense-chart"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { TaxSummary } from "@/components/dashboard/tax-summary"
import { UpcomingReminders } from "@/components/dashboard/upcoming-reminders"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import { AnalyticsInsights } from "@/components/dashboard/insights/analytics-insights"

type PeriodType = "quarter" | "year"

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1

  const [periodType, setPeriodType] = useState<PeriodType>("quarter")
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedQuarter, setSelectedQuarter] = useState<number>(currentQuarter)

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 md:py-6 max-w-7xl">
            <DashboardSkeleton />
          </main>
    )
  }

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 md:py-6 max-w-7xl">
      <div className="space-y-4 sm:space-y-5 md:space-y-6">
        {/* Stats Overview */}
        <StatsCards 
          businessType="freelancer" 
          periodType={periodType}
          selectedYear={selectedYear}
          selectedQuarter={selectedQuarter}
          onPeriodChange={(type, year, quarter) => {
            setPeriodType(type)
            setSelectedYear(year)
            setSelectedQuarter(quarter)
          }}
        />

        {/* Charts and Summary */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          <div className="md:col-span-2">
            <IncomeExpenseChart 
              periodType={periodType}
              selectedYear={selectedYear}
              selectedQuarter={selectedQuarter}
            />
          </div>
          <div>
            <TaxSummary businessType="freelancer" />
          </div>
        </div>

        <AnalyticsInsights 
          businessType="freelancer"
          periodType={periodType}
          selectedYear={selectedYear}
          selectedQuarter={selectedQuarter}
        />

        {/* Recent Activity */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          <div className="md:col-span-2">
            <RecentTransactions />
          </div>
          <div>
            <UpcomingReminders />
          </div>
        </div>
      </div>
    </main>
  )
}
