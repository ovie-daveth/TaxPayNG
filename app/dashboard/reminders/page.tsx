"use client"

import { useState } from "react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { RemindersList } from "@/components/reminders/reminders-list"
import { AddReminderDialog } from "@/components/reminders/add-reminder-dialog"
import { ReminderStats } from "@/components/reminders/reminder-stats"

export default function RemindersPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="flex-1 md:ml-64">
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 max-w-7xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Reminders & Notifications</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Never miss important tax deadlines and payment dates
                </p>
              </div>
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Reminder
              </Button>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="space-y-6">
            <ReminderStats />
            <RemindersList />
          </div>
        </main>
      </div>

      <AddReminderDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </div>
  )
}
