"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TrendingUp, HelpCircle } from "lucide-react"
import { formatCurrencyInput, handleCurrencyInputChange } from "@/lib/utils/currency"

interface DevelopmentLevySectionProps {
  annualTurnover: string
  totalFixedAssets: string
  assessableProfit: string
  onAnnualTurnoverChange: (value: string) => void
  onTotalFixedAssetsChange: (value: string) => void
  onAssessableProfitChange: (value: string) => void
}

export function DevelopmentLevySection({
  annualTurnover,
  totalFixedAssets,
  assessableProfit,
  onAnnualTurnoverChange,
  onTotalFixedAssetsChange,
  onAssessableProfitChange,
}: DevelopmentLevySectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-sm sm:text-base font-semibold">Development Levy Information</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="annualTurnover" className="text-xs sm:text-sm">Annual Turnover (₦)</Label>
          <Input
            id="annualTurnover"
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
            Annual revenue/turnover for the year
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalFixedAssets" className="text-xs sm:text-sm">Total Fixed Assets (₦)</Label>
          <Input
            id="totalFixedAssets"
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
            Total fixed assets value
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="assessableProfit" className="text-xs sm:text-sm">
          Assessable Profit (₦)
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-3 h-3 inline-block ml-1 cursor-help text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Assessable Profit is your company's profit BEFORE tax depreciation allowances and tax losses are deducted. This comes from your Profit & Loss statement - typically your "Profit Before Tax" or "Operating Profit". It is NOT calculated from income sources.</p>
            </TooltipContent>
          </Tooltip>
        </Label>
        <Input
          id="assessableProfit"
          type="text"
          inputMode="decimal"
          placeholder="Enter from your financial statement"
          value={formatCurrencyInput(assessableProfit)}
          onChange={(e) => {
            const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
            if (isValid) {
              onAssessableProfitChange(rawValue)
            }
          }}
        />
        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">📊 How to find your Assessable Profit:</p>
          <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
            <strong>Assessable Profit</strong> comes from your company's Profit & Loss (P&L) statement or Income Statement. It is your profit <strong>before</strong> tax depreciation allowances and tax losses are deducted.
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
            <strong>Formula:</strong> Revenue - Cost of Goods Sold - Operating Expenses = <strong>Assessable Profit</strong>
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-200">
            <strong>Where to find it:</strong> Look at your P&L statement for "Profit Before Tax" or "Operating Profit" - this is typically your assessable profit (or very close to it). If you're not sure, use your profit before tax depreciation and losses.
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Development Levy rate varies by year: <strong>4%</strong> for 2025-2026, <strong>3%</strong> for 2027-2029, <strong>2%</strong> from 2030 onwards.
        </p>
      </div>
      <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
        <p className="text-sm text-green-700 dark:text-green-300">
          <strong>Small Company:</strong> Turnover ≤ ₦100M AND Assets ≤ ₦250M → <strong>Exempt</strong><br />
          <strong>Other Companies:</strong> Rate varies by year (4% for 2025-2026)
        </p>
      </div>
      <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-xs text-amber-800 dark:text-amber-200">
          ⚠️ <strong>Important:</strong> Development Levy cannot be used as a deduction against CIT. It is calculated and paid separately.
        </p>
      </div>
    </div>
  )
}

