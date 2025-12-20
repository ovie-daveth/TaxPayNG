import { Badge } from "@/components/ui/badge"

interface ReminderItemProps {
  title: string
  date: string
  priority: "high" | "medium" | "low"
  daysLeft: number
}

export function ReminderItem({ title, date, priority, daysLeft }: ReminderItemProps) {
  const priorityColors = {
    high: "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50",
    medium: "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50",
    low: "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50",
  }
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${priorityColors[priority]}`}>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs opacity-80">{date}</p>
      </div>
      <Badge variant="secondary" className="bg-white/90 dark:bg-white/20 text-gray-900 dark:text-gray-100 font-medium">
        {daysLeft} days
      </Badge>
    </div>
  )
}

