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
  showExplanations?: boolean
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
  showExplanations = true,
}: TaxDeductibleExpensesSectionProps) {
  return (
    <div className="border-t border-border pt-4 sm:pt-6">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold">Tax-Deductible Expenses</h3>
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
      
      {/* Business Expenses Info Box - Hidden for creators, toggleable on mobile */}
      {userType !== "creator" && (
        <div className={`bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 ${showExplanations ? 'block' : 'hidden md:block'}`}>
          <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-medium mb-1.5 sm:mb-2">
            💡 Allowable Business Expenses for Freelancers/Self-Employed
          </p>
          <p className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 mb-1.5 sm:mb-2 leading-relaxed">
            Enter expenses that are <strong>wholly, exclusively, and necessarily</strong> incurred in producing your income. These will be deducted from your gross income before calculating tax.
          </p>
          <p className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1.5 sm:mt-2 mb-1">Examples of allowable expenses:</p>
          <ul className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 list-disc list-inside space-y-0.5 sm:space-y-1">
            <li>Internet/data costs</li>
            <li>Software subscriptions and licenses</li>
            <li>Laptop, computer equipment, and tools</li>
            <li>Co-working space rent</li>
            <li>Transport to client meetings</li>
            <li>Professional fees (accountants, lawyers)</li>
            <li>Marketing and promotion costs</li>
            <li>Training and professional development</li>
          </ul>
          <p className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 mt-1.5 sm:mt-2">
            💰 Enter expenses for the selected period ({getPeriodLabel().toLowerCase()}) - they will be automatically converted to annual amounts for tax calculation
          </p>
        </div>
      )}

      <div className="space-y-3 sm:space-y-4">
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="rentPaid" className="text-xs sm:text-sm">{getPeriodLabel()} Rent Paid (₦)</Label>
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
            className="h-9 sm:h-10 text-xs sm:text-sm"
          />
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            20% of rent paid is deductible (max ₦500,000/year)
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="pensionContribution" className="text-xs sm:text-sm">
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
              className="h-9 sm:h-10 text-xs sm:text-sm"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Up to 8% of annual income</p>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="healthInsurance" className="text-xs sm:text-sm">
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
              className="h-9 sm:h-10 text-xs sm:text-sm"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">NHIS or private HMO premiums</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="housingFund" className="text-xs sm:text-sm">
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
              className="h-9 sm:h-10 text-xs sm:text-sm"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">NHF contributions (2.5% of basic salary)</p>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="lifeInsurance" className="text-xs sm:text-sm">{getPeriodLabel()} Life Insurance (₦)</Label>
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
              className="h-9 sm:h-10 text-xs sm:text-sm"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Premium payments for life insurance</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="charitableDonations" className="text-xs sm:text-sm">
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
              className="h-9 sm:h-10 text-xs sm:text-sm"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
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
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="businessExpenses" className="text-xs sm:text-sm">
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
              className="h-9 sm:h-10 text-xs sm:text-sm"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Costs wholly, exclusively, and necessarily incurred in producing income
              {userType === "freelancer" && " (e.g., internet, software, equipment, co-working rent, transport to clients)"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

