"use client"

import { useState, useEffect } from "react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { RemindersList } from "@/components/reminders/reminders-list"
import { AddReminderDialog } from "@/components/reminders/add-reminder-dialog"
import { ReminderStats } from "@/components/reminders/reminder-stats"
import { RemindersSkeleton } from "@/components/ui/skeletons"

export default function RemindersPage() {

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 700)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
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
            <ReminderStats />
            <RemindersList />
          </div>
        </main>
    </div>
  )
}
