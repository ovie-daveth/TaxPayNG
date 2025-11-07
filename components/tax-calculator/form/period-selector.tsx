"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PeriodSelectorProps {
  period: "monthly" | "quarterly" | "yearly"
  onPeriodChange: (value: "monthly" | "quarterly" | "yearly") => void
}

export function PeriodSelector({ period, onPeriodChange }: PeriodSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="period">Calculation Period</Label>
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger id="period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="quarterly">Quarterly</SelectItem>
          <SelectItem value="yearly">Yearly</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

