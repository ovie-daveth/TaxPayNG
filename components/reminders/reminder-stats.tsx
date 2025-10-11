import { Card } from "@/components/ui/card"
import { Bell, CheckCircle2, Clock, AlertCircle } from "lucide-react"

export function ReminderStats() {
  const stats = [
    {
      label: "Total Reminders",
      value: "12",
      icon: Bell,
      color: "text-blue-600 bg-blue-100",
    },
    {
      label: "Upcoming",
      value: "5",
      icon: Clock,
      color: "text-orange-600 bg-orange-100",
    },
    {
      label: "Completed",
      value: "7",
      icon: CheckCircle2,
      color: "text-green-600 bg-green-100",
    },
    {
      label: "Overdue",
      value: "0",
      icon: AlertCircle,
      color: "text-red-600 bg-red-100",
    },
  ]

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-3xl font-bold">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
