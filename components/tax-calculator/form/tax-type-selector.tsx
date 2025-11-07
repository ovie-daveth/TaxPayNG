"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TaxTypeSelectorProps {
  calculationType: string | null
  onCalculationTypeChange: (value: string) => void
}

export function TaxTypeSelector({ calculationType, onCalculationTypeChange }: TaxTypeSelectorProps) {
  if (!calculationType) return null

  return (
    <div className="space-y-1.5 sm:space-y-2">
      <Label htmlFor="taxType" className="text-sm sm:text-base">Tax Type</Label>
      <Select value={calculationType} onValueChange={onCalculationTypeChange}>
        <SelectTrigger id="taxType" className="h-9 sm:h-10 text-sm sm:text-base">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paye" className="text-sm">Employee (PAYE)</SelectItem>
          <SelectItem value="cit" className="text-sm">Company Income Tax (CIT)</SelectItem>
          <SelectItem value="development-levy" className="text-sm">Development Levy</SelectItem>
          <SelectItem value="withholding-tax" className="text-sm">Withholding Tax</SelectItem>
          <SelectItem value="vat" className="text-sm">VAT</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

