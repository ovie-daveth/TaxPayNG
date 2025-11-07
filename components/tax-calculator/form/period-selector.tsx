"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PeriodSelectorProps {
  period: "monthly" | "quarterly" | "yearly"
  onPeriodChange: (value: "monthly" | "quarterly" | "yearly") => void
}

export function PeriodSelector({ period, onPeriodChange }: PeriodSelectorProps) {
  return (
    <div className="space-y-1.5 sm:space-y-2">
      <Label htmlFor="period" className="text-sm sm:text-base">Calculation Period</Label>
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger id="period" className="h-9 sm:h-10 text-sm sm:text-base">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly" className="text-sm">Monthly</SelectItem>
          <SelectItem value="quarterly" className="text-sm">Quarterly</SelectItem>
          <SelectItem value="yearly" className="text-sm">Yearly</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

