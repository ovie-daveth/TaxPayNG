"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { TrendingUp } from "lucide-react"
import { formatCurrencyInput, handleCurrencyInputChange } from "@/lib/utils/currency"

interface CITInfoSectionProps {
  annualTurnover: string
  totalFixedAssets: string
  onAnnualTurnoverChange: (value: string) => void
  onTotalFixedAssetsChange: (value: string) => void
}

export function CITInfoSection({
  annualTurnover,
  totalFixedAssets,
  onAnnualTurnoverChange,
  onTotalFixedAssetsChange,
}: CITInfoSectionProps) {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Company Information</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="annualTurnover-cit">Annual Turnover (₦) <span className="text-red-500">*</span></Label>
          <Input
            id="annualTurnover-cit"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={formatCurrencyInput(annualTurnover)}
            onChange={(e) => {
              const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
              if (isValid) {
                onAnnualTurnoverChange(rawValue)
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Annual revenue/turnover for the year (required)
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalFixedAssets-cit">Total Fixed Assets (₦) <span className="text-red-500">*</span></Label>
          <Input
            id="totalFixedAssets-cit"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={formatCurrencyInput(totalFixedAssets)}
            onChange={(e) => {
              const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
              if (isValid) {
                onTotalFixedAssetsChange(rawValue)
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Total fixed assets for small company exemption check (required)
          </p>
        </div>
      </div>
    </div>
  )
}

