"use client"

import { PlatformAnalytics } from "@/components/dashboard/platform-analytics"
import { Card } from "@/components/ui/card"

export default function PlatformAnalyticsPage() {
  return (
    <main className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6">
      <div className="space-y-4 sm:space-y-5 md:space-y-6">
        <PlatformAnalytics />
      </div>
    </main>
  )
}

