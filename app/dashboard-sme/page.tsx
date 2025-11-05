"use client"

import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, FileText, Calendar, TrendingUp, UserPlus } from "lucide-react"
import Link from "next/link"

export default function SMEDashboardPage() {
  const { profile, loading } = useUserProfile()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  const quickStats = [
    {
      label: "Total Employees",
      value: "25",
      change: "+2 this month",
      trend: "up",
      icon: Users,
      color: "text-primary",
    },
    {
      label: "Monthly Payroll",
      value: "₦8,500,000",
      change: "Current month",
      trend: "neutral",
      icon: DollarSign,
      color: "text-chart-3",
    },
    {
      label: "PAYE Tax",
      value: "₦1,275,000",
      change: "For January 2025",
      trend: "up",
      icon: FileText,
      color: "text-accent",
    },
    {
      label: "Due Date",
      value: "Jan 31, 2025",
      change: "5 days remaining",
      trend: "up",
      icon: Calendar,
      color: "text-destructive",
    },
  ]

  const recentActivities = [
    { id: 1, type: "payroll", description: "January 2025 Payroll Processed", date: "2025-01-15", status: "completed" },
    { id: 2, type: "employee", description: "New employee added: John Doe", date: "2025-01-14", status: "completed" },
    { id: 3, type: "tax", description: "PAYE Remittance for December 2024", date: "2025-01-10", status: "completed" },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Business Dashboard</h1>
        <p className="text-muted-foreground">Manage your employees, payroll, and business tax obligations</p>
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold mb-2">{stat.value}</p>
                  <p
                    className={`text-xs font-medium ${stat.trend === "up" ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {stat.change}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions */}
        <Card className="p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/dashboard-sme/employees">
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Manage Employees
              </Button>
            </Link>
            <Link href="/dashboard-sme/payroll">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="w-4 h-4 mr-2" />
                Process Payroll
              </Button>
            </Link>
            <Link href="/dashboard-sme/paye">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Remit PAYE Tax
              </Button>
            </Link>
            <Link href="/dashboard-sme/reports">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Reports
              </Button>
            </Link>
          </div>
        </Card>

        {/* Recent Activities */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                </div>
                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Upcoming Tasks</h3>
          <Link href="/dashboard-sme/tasks">
            <Button variant="ghost" size="sm">
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

