"use client"

import { useState, useEffect } from "react"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { IncomeExpenseChart } from "@/components/dashboard/income-expense-chart"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { TaxSummary } from "@/components/dashboard/tax-summary"
import { UpcomingReminders } from "@/components/dashboard/upcoming-reminders"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import { Card } from "@/components/ui/card"

export default function CreatorDashboardPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
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
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 max-w-7xl space-y-6">
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 border-primary/20">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Creator Performance Overview</h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            Track income from partnered brands, platform payouts, and deductible expenses in one place. 
            Stay ahead of quarterly tax obligations with automated reminders tailored for Nigerian creators.
          </p>
        </div>
      </Card>

      <div className="space-y-4 sm:space-y-5 md:space-y-6">
        <StatsCards />

        <div className="grid md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          <div className="md:col-span-2">
            <IncomeExpenseChart />
          </div>
          <div>
            <TaxSummary />
          </div>
        </div>

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

