import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { IncomeExpenseChart } from "@/components/dashboard/income-expense-chart"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { TaxSummary } from "@/components/dashboard/tax-summary"
import { UpcomingReminders } from "@/components/dashboard/upcoming-reminders"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="flex-1">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="space-y-6">
            {/* Stats Overview */}
            <StatsCards />

            {/* Charts and Summary */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <IncomeExpenseChart />
              </div>
              <div>
                <TaxSummary />
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RecentTransactions />
              </div>
              <div>
                <UpcomingReminders />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
