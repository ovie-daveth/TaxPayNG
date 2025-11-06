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
    <div className="space-y-2">
      <Label htmlFor="taxType">Tax Type</Label>
      <Select value={calculationType} onValueChange={onCalculationTypeChange}>
        <SelectTrigger id="taxType">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paye">Employee (PAYE)</SelectItem>
          <SelectItem value="cit">Company Income Tax (CIT)</SelectItem>
          <SelectItem value="development-levy">Development Levy</SelectItem>
          <SelectItem value="withholding-tax">Withholding Tax</SelectItem>
          <SelectItem value="vat">VAT</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

