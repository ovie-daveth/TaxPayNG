"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Plus } from "lucide-react"
import { formatCurrencyInput, handleCurrencyInputChange } from "@/lib/utils/currency"

const CREATOR_EXPENSES = [
  { value: "equipment", label: "Equipment (Camera, Mic, etc.)" },
  { value: "software", label: "Software & Subscriptions" },
  { value: "studio", label: "Studio Rent/Setup" },
  { value: "coworking", label: "Co-working Space" },
  { value: "editing", label: "Editing Services" },
  { value: "marketing", label: "Marketing & Promotion" },
  { value: "travel", label: "Travel for Content" },
  { value: "props", label: "Props & Supplies" },
  { value: "internet", label: "Internet & Utilities" },
  { value: "staff", label: "Staff/Contractor Payments" },
  { value: "professional_fees", label: "Professional Fees (Accountants, Lawyers)" },
]

interface CreatorExpensesSectionProps {
  creatorExpenses: Record<string, string>
  onAddCreatorExpense: (expenseType: string) => void
  onRemoveCreatorExpense: (expenseType: string) => void
  onUpdateCreatorExpense: (expenseType: string, value: string) => void
  totalCreatorExpenses: number
}

export function CreatorExpensesSection({
  creatorExpenses,
  onAddCreatorExpense,
  onRemoveCreatorExpense,
  onUpdateCreatorExpense,
  totalCreatorExpenses,
}: CreatorExpensesSectionProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customExpenseName, setCustomExpenseName] = useState("")

  const handleAddCustomExpense = () => {
    if (customExpenseName.trim() && !creatorExpenses[customExpenseName.trim()]) {
      onAddCreatorExpense(customExpenseName.trim())
      setCustomExpenseName("")
      setShowCustomInput(false)
    }
  }

  const getExpenseLabel = (expenseType: string): string => {
    const predefined = CREATOR_EXPENSES.find((e) => e.value === expenseType)
    return predefined ? predefined.label : expenseType
  }

  const isCustomExpense = (expenseType: string): boolean => {
    return !CREATOR_EXPENSES.find((e) => e.value === expenseType)
  }

  return (
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm sm:text-base font-semibold">Creator Business Expenses</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add expenses specific to your content creation business
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            onValueChange={(value) => {
              if (value === "other") {
                setShowCustomInput(true)
              } else if (!creatorExpenses[value]) {
                onAddCreatorExpense(value)
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px] h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Add Expense Type" />
            </SelectTrigger>
            <SelectContent>
              {CREATOR_EXPENSES.map((expense) => (
                <SelectItem
                  key={expense.value}
                  value={expense.value}
                  disabled={!!creatorExpenses[expense.value]}
                  className="text-xs sm:text-sm"
                >
                  {expense.label}
                </SelectItem>
              ))}
              <SelectItem value="other" className="text-xs sm:text-sm font-medium">
                + Add Custom Expense
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Expense Input */}
      {showCustomInput && (
        <div className="flex gap-2 items-end p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-300 dark:border-purple-700">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs sm:text-sm">Custom Expense Name</Label>
            <Input
              type="text"
              placeholder="e.g., Domain & Hosting, Cloud Storage, etc."
              value={customExpenseName}
              onChange={(e) => setCustomExpenseName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddCustomExpense()
                } else if (e.key === "Escape") {
                  setShowCustomInput(false)
                  setCustomExpenseName("")
                }
              }}
              className="h-9 sm:h-10 text-xs sm:text-sm"
              autoFocus
            />
          </div>
          <Button
            type="button"
            onClick={handleAddCustomExpense}
            disabled={!customExpenseName.trim() || !!creatorExpenses[customExpenseName.trim()]}
            size="sm"
            className="h-9 sm:h-10"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowCustomInput(false)
              setCustomExpenseName("")
            }}
            className="h-9 w-9 sm:h-10 sm:w-10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {Object.entries(creatorExpenses).map(([expenseType, amount]) => {
        const expenseLabel = getExpenseLabel(expenseType)
        return (
          <div key={expenseType} className="flex gap-2 sm:gap-3 items-end">
            <div className="flex-1 space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">
                {expenseLabel}
                {isCustomExpense(expenseType) && (
                  <span className="ml-1 text-[10px] text-muted-foreground">(Custom)</span>
                )}
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formatCurrencyInput(amount)}
                onChange={(e) => {
                  const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                  if (isValid) {
                    onUpdateCreatorExpense(expenseType, rawValue)
                  }
                }}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveCreatorExpense(expenseType)}
              className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )
      })}

      {Object.keys(creatorExpenses).length > 0 && (
        <div className="pt-2 border-t border-purple-200 dark:border-purple-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
            <span className="font-medium">Total Creator Expenses:</span>
            <span className="font-bold">
              ₦{totalCreatorExpenses.toLocaleString("en-NG", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

