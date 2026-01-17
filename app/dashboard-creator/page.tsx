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
import { AdvancedAnalytics } from "@/components/dashboard/analytics/advanced-analytics"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BarChart3, LayoutDashboard, Sparkles } from "lucide-react"

type DashboardView = "dashboard" | "platform" | "advanced"

export default function CreatorDashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeView, setActiveView] = useState<DashboardView>("dashboard")

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
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                {activeView === 'platform' ? 'Platform Analytics' 
                  : activeView === 'advanced' ? 'Advanced Analytics'
                  : 'Performance Overview'}
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl">
                {activeView === 'platform' 
                  ? 'Track income, expenses, and profitability by platform'
                  : activeView === 'advanced'
                  ? 'Unlock powerful financial insights, trend analysis, forecasting, and comparative analytics'
                  : 'Track income from partnered brands, platform payouts, and deductible expenses in one place. Stay ahead of quarterly tax obligations with automated reminders.'
                }
              </p>
            </div>
            <div className="w-full md:w-auto flex-shrink-0">
              <Tabs value={activeView} onValueChange={(value) => setActiveView(value as DashboardView)}>
                <TabsList className="grid grid-cols-3 w-full md:w-auto h-auto">
                  <TabsTrigger value="dashboard" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
                    <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </TabsTrigger>
                  <TabsTrigger value="platform" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
                    <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Platform</span>
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Advanced</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </Card>

        <div className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
          {activeView === 'platform' ? (
            <PlatformAnalytics />
          ) : activeView === 'advanced' ? (
            <AdvancedAnalytics />
          ) : (
            <>
              <StatsCards businessType="creator" />

              <div className="grid lg:grid-cols-3 grid-cols-1 gap-4 sm:gap-5 md:gap-6">
                <div className="lg:col-span-2 col-span-1">
                  <IncomeExpenseChart />
                </div>
                <div>
                  <TaxSummary businessType="creator" />
                </div>
              </div>

              <AnalyticsInsights businessType="creator" />

              <div className="grid lg:grid-cols-3 grid-cols-1 gap-4 sm:gap-5 md:gap-6">
                <div className="lg:col-span-2 col-span-1">
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

