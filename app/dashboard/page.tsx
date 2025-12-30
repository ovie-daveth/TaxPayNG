"use client"

import { useState, useEffect } from "react"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { IncomeExpenseChart } from "@/components/dashboard/income-expense-chart"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { TaxSummary } from "@/components/dashboard/tax-summary"
import { TaxSummaryModal } from "@/components/dashboard/tax-summary-modal"
import { UpcomingReminders } from "@/components/dashboard/upcoming-reminders"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import { AnalyticsInsights } from "@/components/dashboard/insights/analytics-insights"
import { IncompleteInvoices } from "@/components/dashboard/incomplete-invoices"
import { SubscriptionSuccessModal } from "@/components/subscription/subscription-success-modal"
import { useSidebar } from "@/lib/contexts/sidebar-context"
import { Button } from "@/components/ui/button"
import { Receipt } from "lucide-react"

type PeriodType = "quarter" | "year"

export default function DashboardPage() {
  const { sidebarCollapsed } = useSidebar()
  const [isLoading, setIsLoading] = useState(true)
  const [showTaxSummaryModal, setShowTaxSummaryModal] = useState(false)
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
          <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
            <DashboardSkeleton />
          </main>
    )
  }

  return (
    <>
      <main className=" px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6 ">
        <div className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
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
          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            <div className="lg:col-span-2">
              <IncomeExpenseChart 
                periodType={periodType}
                selectedYear={selectedYear}
                selectedQuarter={selectedQuarter}
              />
            </div>
            <div className="hidden lg:block">
              <TaxSummary businessType="freelancer" />
            </div>
            <div className="hidden md:flex lg:hidden md:items-start md:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTaxSummaryModal(true)}
                className="h-8 text-xs"
              >
                <Receipt className="w-3.5 h-3.5 mr-1.5" />
                Tax Summary
              </Button>
            </div>
          </div>

          {/* Tax Summary for mobile - shown below chart */}
          <div className="md:hidden">
            <TaxSummary businessType="freelancer" />
          </div>

          {/* Analytics Insights */}
          <AnalyticsInsights 
            businessType="freelancer"
            periodType={periodType}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
            sidebarCollapsed={false}
          />

          {/* Recent Activity */}
          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            <div className="lg:col-span-2">
              <RecentTransactions />
            </div>
            <div className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
              <UpcomingReminders />
              <IncompleteInvoices />
            </div>
          </div>
        </div>
      </main>
      <TaxSummaryModal 
        open={showTaxSummaryModal}
        onOpenChange={setShowTaxSummaryModal}
        businessType="freelancer"
      />
      <SubscriptionSuccessModal />
    </>
  )
}
