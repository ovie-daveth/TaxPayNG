"use client"

import { useState, useEffect } from "react"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { IncomeExpenseChart } from "@/components/dashboard/income-expense-chart"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { TaxSummary } from "@/components/dashboard/tax-summary"
import { UpcomingReminders } from "@/components/dashboard/upcoming-reminders"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import { Card } from "@/components/ui/card"
import { AnalyticsInsights } from "@/components/dashboard/insights/analytics-insights"
import { SubscriptionSuccessModal } from "@/components/subscription/subscription-success-modal"
import { PlatformAnalytics } from "@/components/dashboard/platform-analytics"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { BarChart3, LayoutDashboard } from "lucide-react"

export default function CreatorDashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [showPlatformAnalytics, setShowPlatformAnalytics] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
        <DashboardSkeleton />
      </main>
    )
  }

  return (
    <>
      <main className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6 space-y-4 sm:space-y-5 md:space-y-6 overflow-x-hidden max-w-full">
        <Card className="p-4 sm:p-5 md:p-6 lg:p-8 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 border-primary/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                {showPlatformAnalytics ? 'Platform Analytics' : 'Creator Performance Overview'}
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl">
                {showPlatformAnalytics 
                  ? 'Track income, expenses, and profitability by platform'
                  : 'Track income from partnered brands, platform payouts, and deductible expenses in one place. Stay ahead of quarterly tax obligations with automated reminders tailored for Nigerian creators.'
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="platform-toggle" className="text-sm font-medium cursor-pointer">
                  Dashboard
                </Label>
              </div>
              <Switch
                id="platform-toggle"
                checked={showPlatformAnalytics}
                onCheckedChange={setShowPlatformAnalytics}
              />
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="platform-toggle" className="text-sm font-medium cursor-pointer">
                  Platform Analytics
                </Label>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
          {showPlatformAnalytics ? (
            <PlatformAnalytics />
          ) : (
            <>
              <StatsCards businessType="creator" />

              <div className="grid md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                <div className="md:col-span-2">
                  <IncomeExpenseChart />
                </div>
                <div>
                  <TaxSummary businessType="creator" />
                </div>
              </div>

              <AnalyticsInsights businessType="creator" />

              <div className="grid md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                <div className="md:col-span-2">
                  <RecentTransactions />
                </div>
                <div>
                  <UpcomingReminders />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <SubscriptionSuccessModal />
    </>
  )
}

