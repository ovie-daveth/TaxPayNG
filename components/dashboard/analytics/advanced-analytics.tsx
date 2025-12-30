"use client"

import { Card } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function AdvancedAnalytics() {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Sparkles className="w-16 h-16 text-primary mb-4" />
        <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          This feature is coming soon. Stay tuned for powerful financial insights, trend analysis, forecasting, and comparative analytics.
        </p>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Coming Soon
        </Badge>
      </div>
    </Card>
  )
}
