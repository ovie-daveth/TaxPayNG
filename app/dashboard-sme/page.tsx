"use client"

import { useEffect, useMemo, useState } from "react"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useAuth } from "@/lib/hooks/useAuth"
import { useTransactions } from "@/lib/hooks/useTransactions"
import { useReminders } from "@/lib/hooks/useReminders"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { formatCurrencyAmount } from "@/lib/utils/currency"
import { formatDate, toDate } from "@/lib/utils/date"
import type { Employee, Payroll, Transaction, Reminder } from "@/lib/types"
import { Users, DollarSign, FileText, TrendingUp, Receipt, CreditCard, Loader2, Bell, Calendar, AlertCircle } from "lucide-react"
import Link from "next/link"

type ActivityType = "transaction" | "payroll" | "employee" | "subscription"

type ActivityItem = {
  id: string
  type: ActivityType
  title: string
  description: string
  date: string
  sortTime: number
  href?: string
  amountLabel?: string
}

const reminderIconMap: Record<string, typeof Calendar> = {
  tax_deadline: DollarSign,
  document_submission: FileText,
  payment_due: DollarSign,
  other: Calendar,
}

const reminderColorMap: Record<string, string> = {
  tax_deadline: "text-destructive bg-destructive/10",
  document_submission: "text-chart-3 bg-chart-3/10",
  payment_due: "text-destructive bg-destructive/10",
  other: "text-muted-foreground bg-muted",
}

export default function SMEDashboardPage() {
  const { profile, loading } = useUserProfile()
  const { user } = useAuth()
  const { getRecentTransactions } = useTransactions(user?.uid || null)
  const { getUpcomingReminders } = useReminders(user?.uid || null)
  const [activityLoading, setActivityLoading] = useState(true)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [upcomingLoading, setUpcomingLoading] = useState(true)
  const [upcomingTasks, setUpcomingTasks] = useState<Reminder[]>([])

  useEffect(() => {
    if (!user) return

    const fetchActivities = async () => {
      setActivityLoading(true)
      try {
        const token = await user.getIdToken()
        const [transactionsResult, payrollsResult, employeesResult] = await Promise.allSettled([
          getRecentTransactions(6),
          fetch("/api/payroll", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/employees", { headers: { Authorization: `Bearer ${token}` } }),
        ])

        const nextActivities: ActivityItem[] = []

        if (transactionsResult.status === "fulfilled") {
          const recentTransactions = transactionsResult.value as Transaction[]
          recentTransactions.forEach((transaction) => {
            const dateValue = transaction.transactionDate || transaction.valueDate || transaction.date || transaction.createdAt
            const sortTime = toDate(dateValue).getTime()
            const amount = transaction.ngnEquivalent ?? transaction.amount ?? 0
            nextActivities.push({
              id: `transaction-${transaction.id}`,
              type: "transaction",
              title: transaction.description ? `Transaction: ${transaction.description}` : "Transaction recorded",
              description: `${transaction.type === "income" ? "Income" : "Expense"} • ${transaction.category || "Uncategorized"}`,
              date: String(dateValue || new Date().toISOString()),
              sortTime,
              href: "/dashboard-sme/transactions",
              amountLabel: `${transaction.type === "income" ? "+" : "-"}${formatCurrencyAmount(Math.abs(amount), "NGN")}`,
            })
          })
        }

        if (payrollsResult.status === "fulfilled") {
          const payrollsResponse = payrollsResult.value
          if (payrollsResponse.ok) {
            const payrollsData = await payrollsResponse.json()
            const payrolls = (payrollsData?.data || []) as Payroll[]
            payrolls
              .sort((a, b) => toDate(b.generatedAt || b.createdAt).getTime() - toDate(a.generatedAt || a.createdAt).getTime())
              .slice(0, 4)
              .forEach((payroll) => {
                const dateValue = payroll.generatedAt || payroll.createdAt
                nextActivities.push({
                  id: `payroll-${payroll.id}`,
                  type: "payroll",
                  title: `Payroll generated: ${payroll.period}`,
                  description: `${payroll.templateName} • ${payroll.items?.length || 0} employees`,
                  date: String(dateValue),
                  sortTime: toDate(dateValue).getTime(),
                  href: "/dashboard-sme/payroll",
                  amountLabel: formatCurrencyAmount(payroll.totalNetSalary || 0, "NGN"),
                })
              })
          }
        }

        if (employeesResult.status === "fulfilled") {
          const employeesResponse = employeesResult.value
          if (employeesResponse.ok) {
            const employeesData = await employeesResponse.json()
            const employees = (employeesData?.data || []) as Employee[]
            employees
              .sort((a, b) => toDate(b.createdAt || b.employmentDate).getTime() - toDate(a.createdAt || a.employmentDate).getTime())
              .slice(0, 4)
              .forEach((employee) => {
                const name = `${employee.firstName} ${employee.middleName || ""} ${employee.lastName}`.replace(/\s+/g, " ").trim()
                const dateValue = employee.createdAt || employee.employmentDate || new Date().toISOString()
                nextActivities.push({
                  id: `employee-${employee.id}`,
                  type: "employee",
                  title: `Employee added: ${name}`,
                  description: employee.department || employee.jobTitle || employee.position || employee.employmentType || "Employee record created",
                  date: String(dateValue),
                  sortTime: toDate(dateValue).getTime(),
                  href: `/dashboard-sme/employees/${employee.id}`,
                })
              })
          }
        }

        const subscriptionDate = profile?.lastSubscriptionDate || profile?.subscriptionStartDate
        if (subscriptionDate && profile?.subscriptionType) {
          const interval = profile.subscriptionInterval ? ` • ${profile.subscriptionInterval}` : ""
          nextActivities.push({
            id: "subscription-latest",
            type: "subscription",
            title: "Subscription updated",
            description: `${profile.subscriptionType} plan${interval}`,
            date: subscriptionDate,
            sortTime: toDate(subscriptionDate).getTime(),
            href: "/dashboard-sme/settings?tab=subscription",
          })
        }

        nextActivities.sort((a, b) => b.sortTime - a.sortTime)
        setActivities(nextActivities.slice(0, 8))
      } catch (error) {
        console.error("Error fetching recent activity:", error)
        setActivities([])
      } finally {
        setActivityLoading(false)
      }
    }

    fetchActivities()
  }, [
    user,
    getRecentTransactions,
    profile?.lastSubscriptionDate,
    profile?.subscriptionStartDate,
    profile?.subscriptionType,
    profile?.subscriptionInterval,
  ])

  useEffect(() => {
    if (!user) return

    const fetchUpcomingTasks = async () => {
      setUpcomingLoading(true)
      try {
        const upcoming = await getUpcomingReminders(30)
        const activeReminders = upcoming
          .filter((reminder) => !reminder.isCompleted)
          .sort((a, b) => toDate(a.dueDate).getTime() - toDate(b.dueDate).getTime())
          .slice(0, 5)
        setUpcomingTasks(activeReminders)
      } catch (error) {
        console.error("Error fetching upcoming tasks:", error)
        setUpcomingTasks([])
      } finally {
        setUpcomingLoading(false)
      }
    }

    fetchUpcomingTasks()

    const handleReminderChanged = () => {
      fetchUpcomingTasks()
    }

    window.addEventListener("reminderChanged", handleReminderChanged)
    return () => {
      window.removeEventListener("reminderChanged", handleReminderChanged)
    }
  }, [user, getUpcomingReminders])

  const activityIconMap = useMemo(() => {
    return {
      transaction: { Icon: Receipt, color: "bg-primary/10 text-primary" },
      payroll: { Icon: DollarSign, color: "bg-emerald-500/10 text-emerald-600" },
      employee: { Icon: Users, color: "bg-blue-500/10 text-blue-600" },
      subscription: { Icon: CreditCard, color: "bg-purple-500/10 text-purple-600" },
    } satisfies Record<ActivityType, { Icon: typeof Receipt; color: string }>
  }, [])

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
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold">Recent Activities</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Latest transactions, payroll, employees, and subscription updates</p>
            </div>
          </div>
          {activityLoading ? (
            <div className="flex items-center justify-center py-10 sm:py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex items-center justify-center py-10 sm:py-12">
              <div className="text-center space-y-2">
                <FileText className="w-10 h-10 sm:w-14 sm:h-14 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm sm:text-base text-muted-foreground font-medium">No recent activity yet</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Your latest business activity will appear here</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => {
                const { Icon, color } = activityIconMap[activity.type]
                const content = (
                  <div className="flex items-center justify-between gap-3 py-2.5 sm:py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">{activity.title}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{activity.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">{formatDate(activity.date)}</div>
                      {activity.amountLabel ? (
                        <div className="text-xs sm:text-sm font-semibold text-foreground">{activity.amountLabel}</div>
                      ) : null}
                    </div>
                  </div>
                )

                return activity.href ? (
                  <Link key={activity.id} href={activity.href} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={activity.id}>{content}</div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Upcoming Tasks */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold">Upcoming Tasks</h3>
          <Link href="/dashboard-sme/reminders">
            <Button variant="ghost" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
              View All
            </Button>
          </Link>
        </div>
        {upcomingLoading ? (
          <div className="flex items-center justify-center py-10 sm:py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : upcomingTasks.length === 0 ? (
          <div className="flex items-center justify-center py-10 sm:py-12">
            <div className="text-center space-y-2">
              <AlertCircle className="w-10 h-10 sm:w-14 sm:h-14 mx-auto text-muted-foreground opacity-50" />
              <p className="text-sm sm:text-base text-muted-foreground font-medium">No upcoming tasks</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Create reminders to track tax and payroll deadlines</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingTasks.map((reminder) => {
              const Icon = reminderIconMap[reminder.type] || Calendar
              const colorClass = reminderColorMap[reminder.type] || "text-muted-foreground bg-muted"
              const isOverdue = toDate(reminder.dueDate).getTime() < Date.now()
              const content = (
                <div className="flex items-start gap-3 py-2.5 sm:py-3 border-b border-border last:border-0">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{reminder.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`text-[10px] sm:text-xs ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                        {formatDate(reminder.dueDate)}
                      </p>
                      {isOverdue ? (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                          Overdue
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              )

              if (reminder.actionUrl) {
                return (
                  <Link key={reminder.id} href={reminder.actionUrl} className="block">
                    {content}
                  </Link>
                )
              }

              return <div key={reminder.id}>{content}</div>
            })}
          </div>
        )}

        <Link href="/dashboard-sme/reminders" className="block mt-4 sm:mt-5 md:mt-6">
          <Button className="w-full bg-transparent text-xs sm:text-sm" variant="outline" size="sm">
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Manage Reminders
          </Button>
        </Link>
      </Card>

    </div>
  )
}

