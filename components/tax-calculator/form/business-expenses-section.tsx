"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Plus } from "lucide-react"
import { formatCurrencyInput, handleCurrencyInputChange } from "@/lib/utils/currency"

const BUSINESS_EXPENSES = [
  { value: "internet", label: "Internet & Data Costs" },
  { value: "software", label: "Software & Subscriptions" },
  { value: "equipment", label: "Equipment (Laptop, Computer, Tools)" },
  { value: "coworking", label: "Co-working Space Rent" },
  { value: "transport", label: "Transport to Client Meetings" },
  { value: "professional_fees", label: "Professional Fees (Accountants, Lawyers)" },
  { value: "marketing", label: "Marketing & Promotion" },
  { value: "training", label: "Training & Professional Development" },
  { value: "utilities", label: "Utilities (Electricity, Water, etc.)" },
  { value: "phone", label: "Phone & Communication" },
  { value: "office_supplies", label: "Office Supplies & Stationery" },
  { value: "insurance", label: "Business Insurance" },
  { value: "bank_charges", label: "Bank Charges & Transaction Fees" },
  { value: "subscriptions", label: "Business Subscriptions & Memberships" },
]

interface BusinessExpensesSectionProps {
  businessExpenses: Record<string, string>
  onAddBusinessExpense: (expenseType: string) => void
  onRemoveBusinessExpense: (expenseType: string) => void
  onUpdateBusinessExpense: (expenseType: string, value: string) => void
  totalBusinessExpenses: number
  getPeriodLabel: () => string
}

export function BusinessExpensesSection({
  businessExpenses,
  onAddBusinessExpense,
  onRemoveBusinessExpense,
  onUpdateBusinessExpense,
  totalBusinessExpenses,
  getPeriodLabel,
}: BusinessExpensesSectionProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customExpenseName, setCustomExpenseName] = useState("")

  const handleAddCustomExpense = () => {
    if (customExpenseName.trim() && !businessExpenses[customExpenseName.trim()]) {
      onAddBusinessExpense(customExpenseName.trim())
      setCustomExpenseName("")
      setShowCustomInput(false)
    }
  }

  const getExpenseLabel = (expenseType: string): string => {
    const predefined = BUSINESS_EXPENSES.find((e) => e.value === expenseType)
    return predefined ? predefined.label : expenseType
  }

  const isCustomExpense = (expenseType: string): boolean => {
    return !BUSINESS_EXPENSES.find((e) => e.value === expenseType)
  }

  return (
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm sm:text-base font-semibold">Business Expenses Breakdown</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add specific business expenses that are wholly, exclusively, and necessarily for your business
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            onValueChange={(value) => {
              if (value === "other") {
                setShowCustomInput(true)
              } else if (!businessExpenses[value]) {
                onAddBusinessExpense(value)
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px] h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Add Expense Type" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_EXPENSES.map((expense) => (
                <SelectItem
                  key={expense.value}
                  value={expense.value}
                  disabled={!!businessExpenses[expense.value]}
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
        <div className="flex gap-2 items-end p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-300 dark:border-blue-700">
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
            disabled={!customExpenseName.trim() || !!businessExpenses[customExpenseName.trim()]}
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

      {Object.entries(businessExpenses).map(([expenseType, amount]) => {
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
                    onUpdateBusinessExpense(expenseType, rawValue)
                  }
                }}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveBusinessExpense(expenseType)}
              className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )
      })}

      {Object.keys(businessExpenses).length > 0 && (
        <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
            <span className="font-medium">Total Business Expenses ({getPeriodLabel()}):</span>
            <span className="font-bold">
              ₦{totalBusinessExpenses.toLocaleString("en-NG", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}

      {Object.keys(businessExpenses).length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Click "Add Expense Type" above to start adding your business expenses
        </p>
      )}
    </div>
  )
}

