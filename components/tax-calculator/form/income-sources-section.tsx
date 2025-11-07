"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Trash2, HelpCircle, Loader2 } from "lucide-react"
import { formatCurrencyInput, handleCurrencyInputChange, type CurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/utils/currency"

interface IncomeSource {
  id: string
  type: string
  amount: string
  currency?: CurrencyCode
  description?: string
  allowanceType?: "transport" | "housing" | "other"
}

interface IncomeSourcesSectionProps {
  incomeSources: IncomeSource[]
  onAddIncomeSource: () => void
  onRemoveIncomeSource: (id: string) => void
  onUpdateIncomeSource: (id: string, field: keyof IncomeSource, value: string) => void
  getAvailableIncomeTypes: () => Array<{ value: string; label: string }>
  getPeriodLabel: () => string
  totalIncome: number
  convertingTotal: boolean
  incomeTypeHelp: Record<string, string>
}

export function IncomeSourcesSection({
  incomeSources,
  onAddIncomeSource,
  onRemoveIncomeSource,
  onUpdateIncomeSource,
  getAvailableIncomeTypes,
  getPeriodLabel,
  totalIncome,
  convertingTotal,
  incomeTypeHelp,
}: IncomeSourcesSectionProps) {
  return (
    <div className="border-t border-border pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Income Sources</h3>
          <p className="text-sm text-muted-foreground">
            Add all your income streams - we'll automatically calculate the total
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddIncomeSource}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Income
        </Button>
      </div>

      <div className="space-y-4">
        {incomeSources.map((source, index) => {
          const availableTypes = getAvailableIncomeTypes()
          return (
            <div
              key={source.id}
              className="flex flex-col sm:flex-row gap-3 p-4 border border-border rounded-lg bg-muted/30"
            >
              <div className="flex-1 grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`income-type-${source.id}`}>
                      Income Type {index + 1}
                    </Label>
                    {incomeTypeHelp[source.type] && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">{incomeTypeHelp[source.type]}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <Select
                    value={source.type || undefined}
                    onValueChange={(value) => {
                      // Update type, and clear allowanceType if not allowance
                      onUpdateIncomeSource(source.id, "type", value)
                      if (value !== "allowance") {
                        onUpdateIncomeSource(source.id, "allowanceType", "")
                      }
                    }}
                  >
                    <SelectTrigger id={`income-type-${source.id}`}>
                      <SelectValue placeholder="Select income type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`income-amount-${source.id}`}>
                    Amount ({getPeriodLabel()})
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`income-amount-${source.id}`}
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={source.currency === "NGN" ? formatCurrencyInput(source.amount) : source.amount}
                      onChange={(e) => {
                        const value = e.target.value
                        if (source.currency === "NGN") {
                          const { isValid, rawValue } = handleCurrencyInputChange(value)
                          if (isValid) {
                            onUpdateIncomeSource(source.id, "amount", rawValue)
                          }
                        } else {
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            onUpdateIncomeSource(source.id, "amount", value)
                          }
                        }
                      }}
                      required
                      className="flex-1"
                    />
                    <Select
                      value={source.currency || "NGN"}
                      onValueChange={(value: CurrencyCode) =>
                        onUpdateIncomeSource(source.id, "currency", value)
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} ({currency.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {source.currency && source.currency !== "NGN" && source.amount && (
                    <p className="text-xs text-muted-foreground">
                      Will be converted to NGN for tax calculation
                    </p>
                  )}
                </div>
              </div>

              {/* Allowance Type Selector */}
              {source.type === "allowance" && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor={`allowance-type-${source.id}`}>Allowance Type</Label>
                  <Select
                    value={source.allowanceType || "other"}
                    onValueChange={(value: "transport" | "housing" | "other") =>
                      onUpdateIncomeSource(source.id, "allowanceType", value)
                    }
                  >
                    <SelectTrigger id={`allowance-type-${source.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transport">Transport Allowance (Up to ₦30k/month exempt)</SelectItem>
                      <SelectItem value="housing">Housing Allowance</SelectItem>
                      <SelectItem value="other">Other Allowances</SelectItem>
                    </SelectContent>
                  </Select>
                  {source.allowanceType === "transport" && (
                    <p className="text-xs text-muted-foreground">
                      Transport allowance up to ₦30,000/month (₦360,000/year) is tax-exempt under the Personal Income Tax Act (PITA)
                    </p>
                  )}
                </div>
              )}

              {incomeSources.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveIncomeSource(source.id)}
                  className="shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* Total Income Display */}
      <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-medium">Total {getPeriodLabel()} Income:</span>
          <div className="flex items-center gap-2">
            {convertingTotal && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            <span className="text-lg font-bold text-primary">
              ₦{totalIncome.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        {incomeSources.some((s) => s.currency && s.currency !== "NGN" && s.amount) && (
          <p className="text-xs text-muted-foreground mt-2">
            💱 Foreign currency amounts converted to NGN using current exchange rates
            {convertingTotal && " (converting...)"}
          </p>
        )}
      </div>
    </div>
  )
}

