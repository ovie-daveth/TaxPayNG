"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Calendar, FileText, DollarSign, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/hooks/useAuth"
import { useReminders } from "@/lib/hooks/useReminders"
import type { Reminder } from "@/lib/types"
import { format } from "date-fns"

const reminderIconMap: Record<string, typeof DollarSign> = {
  tax_deadline: DollarSign,
  document_submission: FileText,
  quarterly_payment: Calendar,
  annual_filing: FileText,
  payment_due: DollarSign,
  review: Calendar,
}

const reminderColorMap: Record<string, string> = {
  tax_deadline: "text-destructive bg-destructive/10",
  document_submission: "text-chart-3 bg-chart-3/10",
  quarterly_payment: "text-accent bg-accent/10",
  annual_filing: "text-primary bg-primary/10",
  payment_due: "text-destructive bg-destructive/10",
  review: "text-accent bg-accent/10",
}

export function UpcomingReminders() {
  const { user } = useAuth()
  const { getUpcomingReminders } = useReminders(user?.uid || null)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReminders = async () => {
      if (!user) return
      
      setLoading(true)
      try {
        const upcoming = await getUpcomingReminders(30) // Next 30 days
        // Filter out completed reminders and sort by due date
        const activeReminders = upcoming
          .filter(r => !r.isCompleted)
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 5) // Show top 5
        setReminders(activeReminders)
      } catch (error) {
        console.error("Error fetching upcoming reminders:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReminders()

    // Listen for reminder changes (if we add a reminderChanged event)
    const handleReminderChanged = () => {
      fetchReminders()
    }

    window.addEventListener("reminderChanged", handleReminderChanged)
    return () => {
      window.removeEventListener("reminderChanged", handleReminderChanged)
    }
  }, [user, getUpcomingReminders])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "MMM d, yyyy")
    } catch {
      return dateString
    }
  }

  const getReminderIcon = (type: string) => {
    return reminderIconMap[type] || Calendar
  }

  const getReminderColor = (type: string) => {
    return reminderColorMap[type] || "text-muted-foreground bg-muted"
  }
  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Upcoming Reminders</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Don't miss important dates</p>
        </div>
        <Link href="/dashboard/reminders" className="self-start sm:self-auto">
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
            View All
          </Button>
        </Link>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No upcoming reminders</p>
          </div>
        ) : (
          reminders.map((reminder) => {
            const Icon = getReminderIcon(reminder.type)
            const colorClass = getReminderColor(reminder.type)
            const isOverdue = new Date(reminder.dueDate) < new Date()
            
            return (
              <div key={reminder.id} className={`flex items-start gap-3 py-2.5 sm:py-3 border-b border-border last:border-0 ${isOverdue ? "opacity-75" : ""}`}>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm">{reminder.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className={`text-[10px] sm:text-xs ${isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {formatDate(reminder.dueDate)}
                    </p>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <Link href="/dashboard/reminders" className="block mt-4 sm:mt-5 md:mt-6">
        <Button className="w-full bg-transparent text-xs sm:text-sm" variant="outline" size="sm">
          <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          Manage Reminders
        </Button>
      </Link>
    </Card>
  )
}
