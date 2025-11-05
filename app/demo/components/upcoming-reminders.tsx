import { Card } from "@/components/ui/card"
import { ReminderItem } from "./reminder-item"

export function UpcomingReminders() {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Upcoming Reminders</h2>
        <div className="space-y-3">
          <ReminderItem title="Q1 Tax Payment Due" date="March 31, 2025" priority="high" daysLeft={79} />
          <ReminderItem title="Submit Self-Assessment Report" date="March 15, 2025" priority="medium" daysLeft={63} />
          <ReminderItem title="Renew Business Registration" date="April 30, 2025" priority="low" daysLeft={109} />
        </div>
      </div>
    </Card>
  )
}

