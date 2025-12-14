"use client"

import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { Users, DollarSign, FileText, Calendar, TrendingUp, UserPlus } from "lucide-react"
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

  const recentActivities = [
    { id: 1, type: "payroll", description: "January 2025 Payroll Processed", date: "2025-01-15", status: "completed" },
    { id: 2, type: "employee", description: "New employee added: John Doe", date: "2025-01-14", status: "completed" },
    { id: 3, type: "tax", description: "PAYE Remittance for December 2024", date: "2025-01-10", status: "completed" },
  ]

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 md:space-y-8">
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
            <Link href="/dashboard-sme/employees">
              <Button variant="outline" className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Manage Employees
              </Button>
            </Link>
            <Link href="/dashboard-sme/payroll">
              <Button variant="outline" className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Process Payroll
              </Button>
            </Link>
            <Link href="/dashboard-sme/paye">
              <Button variant="outline" className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Remit PAYE Tax
              </Button>
            </Link>
            <Link href="/dashboard-sme/reports">
              <Button variant="outline" className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                View Reports
              </Button>
            </Link>
          </div>
        </Card>

        {/* Recent Activities */}
        <Card className="p-4 sm:p-5 md:p-6 lg:col-span-2">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Recent Activities</h3>
          <div className="space-y-3 sm:space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 sm:gap-4 py-2.5 sm:py-3 border-b border-border last:border-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">{activity.date}</p>
                </div>
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full whitespace-nowrap">
                  {activity.status}
                </span>
              </div>
            ))}
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
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-destructive" />
              <span className="font-medium text-sm">PAYE Remittance</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Due: January 31, 2025</p>
            <Button size="sm" variant="outline" className="w-full">
              Process Now
            </Button>
          </div>
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Monthly Returns</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Due: February 5, 2025</p>
            <Button size="sm" variant="outline" className="w-full">
              Prepare
            </Button>
          </div>
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-accent" />
              <span className="font-medium text-sm">Employee Review</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Due: February 15, 2025</p>
            <Button size="sm" variant="outline" className="w-full">
              Schedule
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

