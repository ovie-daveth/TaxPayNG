"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
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
  return (
    <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm">Creator Business Expenses</h4>
          <p className="text-xs text-muted-foreground">
            Add expenses specific to your content creation business
          </p>
        </div>
        <Select
          onValueChange={(value) => {
            if (!creatorExpenses[value]) {
              onAddCreatorExpense(value)
            }
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Add Expense Type" />
          </SelectTrigger>
          <SelectContent>
            {CREATOR_EXPENSES.map((expense) => (
              <SelectItem
                key={expense.value}
                value={expense.value}
                disabled={!!creatorExpenses[expense.value]}
              >
                {expense.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {Object.entries(creatorExpenses).map(([expenseType, amount]) => {
        const expenseLabel = CREATOR_EXPENSES.find((e) => e.value === expenseType)?.label
        return (
          <div key={expenseType} className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label>{expenseLabel}</Label>
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
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveCreatorExpense(expenseType)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )
      })}

      {Object.keys(creatorExpenses).length > 0 && (
        <div className="pt-2 border-t border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between text-sm">
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

