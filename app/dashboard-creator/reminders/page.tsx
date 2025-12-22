"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useReminders } from "@/lib/hooks/useReminders"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { RemindersList } from "@/components/reminders/reminders-list"
import { AddReminderDialog } from "@/components/reminders/add-reminder-dialog"
import { ReminderStats } from "@/components/reminders/reminder-stats"
import { RemindersSkeleton } from "@/components/ui/skeletons"
import { Reminder } from "@/lib/types"

export default function RemindersPage() {
  const { user } = useAuth()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  
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

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder)
    setIsAddDialogOpen(true)
  }

  const handleCloseDialog = (open: boolean) => {
    setIsAddDialogOpen(open)
    if (!open) {
      setEditingReminder(null)
    }
  }

  if (loading && reminders.length === 0) {
    return (
      <main className="px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <RemindersSkeleton />
      </main>
    )
  }

  return (
    <div className="">
        <main className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 sm:p-4">
                <p className="text-destructive text-xs sm:text-sm">{error}</p>
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
              onEdit={handleEdit}
            />
          </div>
        </main>
        
        <AddReminderDialog
          open={isAddDialogOpen}
          onOpenChange={handleCloseDialog}
          onSubmit={createReminder}
          editingReminder={editingReminder}
          onUpdate={updateReminder}
        />
    </div>
  )
}

