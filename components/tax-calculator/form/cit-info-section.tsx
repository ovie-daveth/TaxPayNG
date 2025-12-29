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
    <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
        <h3 className="text-sm sm:text-lg font-semibold">Company Information</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="annualTurnover-cit" className="text-xs sm:text-sm">Annual Turnover (₦) <span className="text-red-500">*</span></Label>
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
            className="h-9 sm:h-10 text-xs sm:text-sm"
          />
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Annual revenue/turnover for the year (required)
          </p>
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="totalFixedAssets-cit" className="text-xs sm:text-sm">Total Fixed Assets (₦) <span className="text-red-500">*</span></Label>
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
            className="h-9 sm:h-10 text-xs sm:text-sm"
          />
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Total fixed assets for small company exemption check (required)
          </p>
        </div>
      </div>
    </div>
  )
}

