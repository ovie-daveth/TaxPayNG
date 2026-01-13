"use client"

import { NotificationBell } from "../notifications/notification-bell"
import { ThemeToggle } from "../theme-toggle"

export function AgentHeader() {
  return (
    <div className="border-b border-border bg-card mb-4 sm:mb-6">
      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-2 sm:py-3 md:py-4 max-w-7xl">
        <div className="flex items-center justify-end gap-2">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}

