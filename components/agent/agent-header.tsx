"use client"

import { NotificationBell } from "../notifications/notification-bell"
import { ThemeToggle } from "../theme-toggle"

export function AgentHeader() {
  return (
    <div className="border-b border-border bg-card mb-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-7xl">
        <div className="flex items-center justify-end gap-2">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}

