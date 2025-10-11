"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, DollarSign, FileText, Bell, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const reminders = [
  {
    id: 1,
    title: "Q1 2025 Tax Payment Due",
    description: "Submit quarterly tax payment to FIRS",
    date: "2025-01-31",
    type: "tax_deadline",
    priority: "high",
    isCompleted: false,
    daysUntil: 20,
  },
  {
    id: 2,
    title: "Submit Monthly Returns",
    description: "File monthly tax returns with LIRS",
    date: "2025-02-05",
    type: "document_submission",
    priority: "medium",
    isCompleted: false,
    daysUntil: 25,
  },
  {
    id: 3,
    title: "Quarterly Financial Review",
    description: "Review Q4 2024 financial statements",
    date: "2025-02-15",
    type: "quarterly_payment",
    priority: "medium",
    isCompleted: false,
    daysUntil: 35,
  },
  {
    id: 4,
    title: "Pension Contribution Deadline",
    description: "Submit pension contributions for employees",
    date: "2025-02-28",
    type: "custom",
    priority: "high",
    isCompleted: false,
    daysUntil: 48,
  },
  {
    id: 5,
    title: "Annual Tax Filing",
    description: "Complete and submit annual tax return",
    date: "2025-03-31",
    type: "tax_deadline",
    priority: "high",
    isCompleted: false,
    daysUntil: 79,
  },
  {
    id: 6,
    title: "Q4 2024 Tax Payment",
    description: "Quarterly tax payment submitted",
    date: "2024-12-31",
    type: "tax_deadline",
    priority: "high",
    isCompleted: true,
    daysUntil: -11,
  },
  {
    id: 7,
    title: "December Returns Filed",
    description: "Monthly returns submitted to LIRS",
    date: "2025-01-05",
    type: "document_submission",
    priority: "medium",
    isCompleted: true,
    daysUntil: -6,
  },
]

function getReminderIcon(type: string) {
  switch (type) {
    case "tax_deadline":
      return DollarSign
    case "document_submission":
      return FileText
    case "quarterly_payment":
      return Calendar
    default:
      return Bell
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700"
    case "medium":
      return "bg-orange-100 text-orange-700"
    case "low":
      return "bg-blue-100 text-blue-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

function getDateStatus(daysUntil: number, isCompleted: boolean) {
  if (isCompleted) return { text: "Completed", color: "text-green-600" }
  if (daysUntil < 0) return { text: "Overdue", color: "text-red-600" }
  if (daysUntil <= 7) return { text: `${daysUntil} days left`, color: "text-red-600" }
  if (daysUntil <= 30) return { text: `${daysUntil} days left`, color: "text-orange-600" }
  return { text: `${daysUntil} days left`, color: "text-muted-foreground" }
}

export function RemindersList() {
  const upcomingReminders = reminders.filter((r) => !r.isCompleted && r.daysUntil >= 0)
  const completedReminders = reminders.filter((r) => r.isCompleted)

  return (
    <div className="space-y-6">
      {/* Upcoming Reminders */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Upcoming Reminders</h2>
          <p className="text-sm text-muted-foreground mt-1">Your scheduled reminders and deadlines</p>
        </div>

        <div className="space-y-3">
          {upcomingReminders.map((reminder) => {
            const Icon = getReminderIcon(reminder.type)
            const dateStatus = getDateStatus(reminder.daysUntil, reminder.isCompleted)
            return (
              <div
                key={reminder.id}
                className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <Checkbox id={`reminder-${reminder.id}`} className="mt-1" />
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getPriorityColor(reminder.priority)}`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-medium text-sm">{reminder.title}</h3>
                    <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                      {reminder.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">{reminder.date}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className={dateStatus.color}>{dateStatus.text}</span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Completed Reminders */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Completed Reminders</h2>
          <p className="text-sm text-muted-foreground mt-1">Your completed tasks and deadlines</p>
        </div>

        <div className="space-y-3">
          {completedReminders.map((reminder) => {
            const Icon = getReminderIcon(reminder.type)
            return (
              <div key={reminder.id} className="flex items-start gap-4 p-4 border border-border rounded-lg opacity-60">
                <Checkbox id={`reminder-${reminder.id}`} checked disabled className="mt-1" />
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-100 text-green-600">
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-through">{reminder.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">{reminder.date}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-green-600">Completed</span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
