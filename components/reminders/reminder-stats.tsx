import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Bell, CheckCircle2, Clock, AlertCircle } from "lucide-react"

interface ReminderStatsProps {
  getReminderStats: () => Promise<any>
}

export function ReminderStats({ getReminderStats }: ReminderStatsProps) {
  const [stats, setStats] = useState([
    {
      label: "Total Reminders",
      value: "0",
      icon: Bell,
      color: "text-blue-600 bg-blue-100",
    },
    {
      label: "Upcoming",
      value: "0",
      icon: Clock,
      color: "text-orange-600 bg-orange-100",
    },
    {
      label: "Completed",
      value: "0",
      icon: CheckCircle2,
      color: "text-green-600 bg-green-100",
    },
    {
      label: "Overdue",
      value: "0",
      icon: AlertCircle,
      color: "text-red-600 bg-red-100",
    },
  ])

  useEffect(() => {
    const loadStats = async () => {
      try {
        const reminderStats = await getReminderStats()
        if (reminderStats) {
          setStats([
            {
              label: "Total Reminders",
              value: reminderStats.total?.toString() || "0",
              icon: Bell,
              color: "text-blue-600 bg-blue-100",
            },
            {
              label: "Upcoming",
              value: reminderStats.upcoming?.toString() || "0",
              icon: Clock,
              color: "text-orange-600 bg-orange-100",
            },
            {
              label: "Completed",
              value: reminderStats.completed?.toString() || "0",
              icon: CheckCircle2,
              color: "text-green-600 bg-green-100",
            },
            {
              label: "Overdue",
              value: reminderStats.overdue?.toString() || "0",
              icon: AlertCircle,
              color: "text-red-600 bg-red-100",
            },
          ])
        }
      } catch (error) {
        console.error('Failed to load reminder stats:', error)
      }
    }

    loadStats()
  }, [getReminderStats])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="p-3 sm:p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">{stat.label}</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold">{stat.value}</p>
              </div>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
