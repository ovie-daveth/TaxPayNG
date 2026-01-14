"use client"

import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { Users, DollarSign, FileText, TrendingUp } from "lucide-react"
import Link from "next/link"

export default function SMEDashboardPage() {
  const { profile, loading } = useUserProfile()

  if (loading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 md:space-y-8 overflow-x-hidden max-w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">Business Dashboard</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Manage your employees, payroll, and business tax obligations</p>
      </div>

      {/* Interactive Stats */}
      <StatsCards businessType="small-business" />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {/* Quick Actions */}
        <Card className="p-4 sm:p-5 md:p-6 lg:col-span-1">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/dashboard-sme/transactions">
              <Button variant="outline" className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Add / Review Transactions
              </Button>
            </Link>
            <Link href="/dashboard-sme/invoices">
              <Button variant="outline" className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Manage Invoices
              </Button>
            </Link>
            <Link href="/dashboard-sme/payment">
              <Button variant="outline" className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Record Tax Payment
              </Button>
            </Link>
            <Link href="/dashboard-sme/reports">
              <Button variant="outline" className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                View Reports
              </Button>
            </Link>
            <Link href="/dashboard-sme/filing-requests">
              <Button variant="outline" className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Agent Filing Tracking
              </Button>
            </Link>
          </div>
        </Card>

        {/* Recent Activities */}
        <Card className="p-4 sm:p-5 md:p-6 lg:col-span-2">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Recent Activities</h3>
          <div className="flex items-center justify-center py-12 sm:py-16">
            <div className="text-center space-y-2">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground opacity-50" />
              <p className="text-sm sm:text-base text-muted-foreground font-medium">Coming Soon</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Recent activities will be displayed here</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Upcoming Tasks</h3>
          <Link href="/dashboard-sme/tasks">
            <Button variant="ghost" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
              View All
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-center py-12 sm:py-16">
          <div className="text-center space-y-2">
            <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm sm:text-base text-muted-foreground font-medium">Coming Soon</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Upcoming tasks will be displayed here</p>
          </div>
        </div>
      </Card>

    </div>
  )
}

