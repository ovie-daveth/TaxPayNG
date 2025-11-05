import { Badge } from "@/components/ui/badge"

interface ReminderItemProps {
  title: string
  date: string
  priority: "high" | "medium" | "low"
  daysLeft: number
}

export function ReminderItem({ title, date, priority, daysLeft }: ReminderItemProps) {
  const priorityColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-orange-100 text-orange-700 border-orange-200",
    low: "bg-blue-100 text-blue-700 border-blue-200",
  }
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${priorityColors[priority]}`}>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs opacity-80">{date}</p>
      </div>
      <Badge variant="secondary" className="bg-white/50">{daysLeft} days</Badge>
    </div>
  )
}

