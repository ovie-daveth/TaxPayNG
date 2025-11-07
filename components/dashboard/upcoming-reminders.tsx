import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, Calendar, FileText, DollarSign } from "lucide-react"
import Link from "next/link"

const reminders = [
  {
    id: 1,
    title: "Q1 Tax Payment Due",
    date: "2025-01-31",
    type: "tax_deadline",
    icon: DollarSign,
    color: "text-destructive bg-destructive/10",
  },
  {
    id: 2,
    title: "Submit Monthly Returns",
    date: "2025-02-05",
    type: "document_submission",
    icon: FileText,
    color: "text-chart-3 bg-chart-3/10",
  },
  {
    id: 3,
    title: "Quarterly Review",
    date: "2025-02-15",
    type: "quarterly_payment",
    icon: Calendar,
    color: "text-accent bg-accent/10",
  },
]

export function UpcomingReminders() {
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
        {reminders.map((reminder) => {
          const Icon = reminder.icon
          return (
            <div key={reminder.id} className="flex items-start gap-3 py-2.5 sm:py-3 border-b border-border last:border-0">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${reminder.color}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs sm:text-sm">{reminder.title}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{reminder.date}</p>
              </div>
            </div>
          )
        })}
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
