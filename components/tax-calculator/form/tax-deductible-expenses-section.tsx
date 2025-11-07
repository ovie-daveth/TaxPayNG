"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Info } from "lucide-react"
import { formatCurrencyInput, handleCurrencyInputChange } from "@/lib/utils/currency"
import { CreatorExpensesSection } from "./creator-expenses-section"

interface TaxDeductibleExpensesSectionProps {
  userType: string
  period: "monthly" | "quarterly" | "yearly"
  rentPaid: string
  pensionContribution: string
  healthInsurance: string
  housingFund: string
  lifeInsurance: string
  charitableDonations: string
  businessExpenses: string
  creatorExpenses: Record<string, string>
  onRentPaidChange: (value: string) => void
  onPensionContributionChange: (value: string) => void
  onHealthInsuranceChange: (value: string) => void
  onHousingFundChange: (value: string) => void
  onLifeInsuranceChange: (value: string) => void
  onCharitableDonationsChange: (value: string) => void
  onBusinessExpensesChange: (value: string) => void
  onAddCreatorExpense: (expenseType: string) => void
  onRemoveCreatorExpense: (expenseType: string) => void
  onUpdateCreatorExpense: (expenseType: string, value: string) => void
  totalCreatorExpenses: number
  getPeriodLabel: () => string
}

export function TaxDeductibleExpensesSection({
  userType,
  period,
  rentPaid,
  pensionContribution,
  healthInsurance,
  housingFund,
  lifeInsurance,
  charitableDonations,
  businessExpenses,
  creatorExpenses,
  onRentPaidChange,
  onPensionContributionChange,
  onHealthInsuranceChange,
  onHousingFundChange,
  onLifeInsuranceChange,
  onCharitableDonationsChange,
  onBusinessExpensesChange,
  onAddCreatorExpense,
  onRemoveCreatorExpense,
  onUpdateCreatorExpense,
  totalCreatorExpenses,
  getPeriodLabel,
}: TaxDeductibleExpensesSectionProps) {
  return (
    <div className="border-t border-border pt-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold">Tax-Deductible Expenses</h3>
        <Info className="w-4 h-4 text-muted-foreground" />
      </div>
      
      {/* Business Expenses Info Box - Hidden for creators */}
      {userType !== "creator" && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
            💡 Allowable Business Expenses for Freelancers/Self-Employed
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
            Enter expenses that are <strong>wholly, exclusively, and necessarily</strong> incurred in producing your income. These will be deducted from your gross income before calculating tax.
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-2 mb-1">Examples of allowable expenses:</p>
          <ul className="text-xs text-blue-600 dark:text-blue-400 list-disc list-inside space-y-1">
            <li>Internet/data costs</li>
            <li>Software subscriptions and licenses</li>
            <li>Laptop, computer equipment, and tools</li>
            <li>Co-working space rent</li>
            <li>Transport to client meetings</li>
            <li>Professional fees (accountants, lawyers)</li>
            <li>Marketing and promotion costs</li>
            <li>Training and professional development</li>
          </ul>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            💰 Enter expenses for the selected period ({getPeriodLabel().toLowerCase()}) - they will be automatically converted to annual amounts for tax calculation
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rentPaid">{getPeriodLabel()} Rent Paid (₦)</Label>
          <Input
            id="rentPaid"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={formatCurrencyInput(rentPaid)}
            onChange={(e) => {
              const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
              if (isValid) {
                onRentPaidChange(rawValue)
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            20% of rent paid is deductible (max ₦500,000/year)
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pensionContribution">
              {getPeriodLabel()} Pension Contributions (₦)
            </Label>
            <Input
              id="pensionContribution"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatCurrencyInput(pensionContribution)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  onPensionContributionChange(rawValue)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Up to 8% of annual income</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="healthInsurance">
              {getPeriodLabel()} Health Insurance (₦)
            </Label>
            <Input
              id="healthInsurance"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatCurrencyInput(healthInsurance)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  onHealthInsuranceChange(rawValue)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">NHIS or private HMO premiums</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="housingFund">
              {getPeriodLabel()} National Housing Fund (NHF) (₦)
            </Label>
            <Input
              id="housingFund"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatCurrencyInput(housingFund)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  onHousingFundChange(rawValue)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">NHF contributions (2.5% of basic salary)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lifeInsurance">{getPeriodLabel()} Life Insurance (₦)</Label>
            <Input
              id="lifeInsurance"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatCurrencyInput(lifeInsurance)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  onLifeInsuranceChange(rawValue)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Premium payments for life insurance</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="charitableDonations">
              {getPeriodLabel()} Charitable Donations (₦)
            </Label>
            <Input
              id="charitableDonations"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatCurrencyInput(charitableDonations)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  onCharitableDonationsChange(rawValue)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              To approved NGOs (max 10% of annual income)
            </p>
          </div>
        </div>

        {/* Creator-Specific Expenses */}
        {userType === "creator" && (
          <CreatorExpensesSection
            creatorExpenses={creatorExpenses}
            onAddCreatorExpense={onAddCreatorExpense}
            onRemoveCreatorExpense={onRemoveCreatorExpense}
            onUpdateCreatorExpense={onUpdateCreatorExpense}
            totalCreatorExpenses={totalCreatorExpenses}
          />
        )}

        {/* General Business Expenses - Hidden for creators */}
        {userType !== "creator" && (
          <div className="space-y-2">
            <Label htmlFor="businessExpenses">
              {getPeriodLabel()} Other Business Expenses (₦)
            </Label>
            <Input
              id="businessExpenses"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatCurrencyInput(businessExpenses)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  onBusinessExpensesChange(rawValue)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Costs wholly, exclusively, and necessarily incurred in producing income
              {userType === "freelancer" && " (e.g., internet, software, equipment, co-working rent, transport to clients)"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

