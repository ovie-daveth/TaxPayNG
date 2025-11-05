"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Receipt, BookOpen, UserCheck } from "lucide-react"

interface StatCardProps {
  title: string
  value: number | string
  change?: number
  icon: React.ElementType
  gradient: string
  iconColor: string
}

function StatCard({ title, value, change, icon: Icon, gradient, iconColor }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold mb-2">{value.toLocaleString()}</p>
          {change !== undefined && (
            <p className={`text-xs font-medium ${change >= 0 ? "text-primary" : "text-muted-foreground"}`}>
              {change >= 0 ? "+" : ""}{change}%
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <Icon className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </Card>
  )
}

interface StatsOverviewProps {
  stats: {
    totalUsers: number
    totalTransactions: number
    totalBlogPosts: number
    totalWaitlist: number
  }
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Users"
        value={stats.totalUsers}
        change={12}
        icon={Users}
        gradient=""
        iconColor=""
      />
      <StatCard
        title="Transactions"
        value={stats.totalTransactions}
        change={8}
        icon={Receipt}
        gradient=""
        iconColor=""
      />
      <StatCard
        title="Blog Posts"
        value={stats.totalBlogPosts}
        change={25}
        icon={BookOpen}
        gradient=""
        iconColor=""
      />
      <StatCard
        title="Waitlist"
        value={stats.totalWaitlist}
        change={15}
        icon={UserCheck}
        gradient=""
        iconColor=""
      />
    </div>
  )
}

