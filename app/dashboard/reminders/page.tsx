"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useReminders } from "@/lib/hooks/useReminders"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { RemindersList } from "@/components/reminders/reminders-list"
import { AddReminderDialog } from "@/components/reminders/add-reminder-dialog"
import { ReminderStats } from "@/components/reminders/reminder-stats"
import { RemindersSkeleton } from "@/components/ui/skeletons"

export default function RemindersPage() {
  const { user } = useAuth()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  
  const {
    reminders,
    loading,
    error,
    createReminder,
    updateReminder,
    deleteReminder,
    markCompleted,
    markIncomplete,
    getReminderStats
  } = useReminders(user?.uid || null)

  if (loading && reminders.length === 0) {
    return (
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <RemindersSkeleton />
      </main>
    )
  }

  return (
    <div className="">
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
            
            <ReminderStats getReminderStats={getReminderStats} />
            <RemindersList 
              reminders={reminders}
              loading={loading}
              onUpdate={updateReminder}
              onDelete={deleteReminder}
              onMarkCompleted={markCompleted}
              onMarkIncomplete={markIncomplete}
            />
          </div>
        </main>
        
        <AddReminderDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSubmit={createReminder}
        />
    </div>
  )
}
