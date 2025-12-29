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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BarChart3, LayoutDashboard } from "lucide-react"

export default function CreatorDashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics'>('dashboard')

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
      <main className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6 space-y-4 sm:space-y-5 md:space-y-6">
        <Card className="p-4 sm:p-5 md:p-6 lg:p-8 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 border-primary/20">
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
                Creator Dashboard
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl">
                Track income from partnered brands, platform payouts, and deductible expenses in one place. Stay ahead of quarterly tax obligations with automated reminders tailored for Nigerian creators.
              </p>
            </div>
            
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'dashboard' | 'analytics')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dashboard" className="flex items-center gap-2 text-xs sm:text-sm">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2 text-xs sm:text-sm">
                  <BarChart3 className="w-4 h-4" />
                  <span>Platform Analytics</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
                <StatsCards businessType="creator" />

                <div className="grid lg:grid-cols-2 grid-cols-1 gap-4 sm:gap-5 md:gap-6">
                  <div className="md:col-span-2">
                    <IncomeExpenseChart />
                  </div>
                  <div>
                    <TaxSummary businessType="creator" />
                  </div>
                </div>

                <AnalyticsInsights businessType="creator" />

                <div className="grid lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                  <div className="md:col-span-2">
                    <RecentTransactions />
                  </div>
                  <div>
                    <UpcomingReminders />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-4 sm:mt-6">
                <PlatformAnalytics />
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </main>
      <SubscriptionSuccessModal />
    </>
  )
}

