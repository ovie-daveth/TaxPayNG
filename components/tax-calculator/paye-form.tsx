"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Info, Calculator } from "lucide-react"
import { calculateNigerianTax } from "@/lib/tax-calculator"
import { formatCurrencyInput, handleCurrencyInputChange } from "@/lib/utils/currency"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PAYEFormProps {
  period: "monthly" | "quarterly" | "yearly"
  onCalculate: (result: any) => void
}

export function PAYEForm({ period, onCalculate }: PAYEFormProps) {
  const [salary, setSalary] = useState("")
  const [transportAllowance, setTransportAllowance] = useState("")
  const [housingAllowance, setHousingAllowance] = useState("")
  const [bonuses, setBonuses] = useState("")
  const [rentPaid, setRentPaid] = useState("")
  const [pensionContribution, setPensionContribution] = useState("")
  const [healthInsurance, setHealthInsurance] = useState("")
  const [housingFund, setHousingFund] = useState("")
  const [lifeInsurance, setLifeInsurance] = useState("")
  const [charitableDonations, setCharitableDonations] = useState("")
  const [dependents, setDependents] = useState("")

  // Helper function to get period label
  const getPeriodLabel = () => {
    if (period === "monthly") return "Monthly"
    if (period === "quarterly") return "Quarterly"
    return "Annual"
  }

  // Helper function to get period text
  const getPeriodText = () => {
    if (period === "monthly") return "(for this month - will be annualized)"
    if (period === "quarterly") return "(for this quarter - will be annualized)"
    return "(annual amount)"
  }

  const handleSubmit = () => {
    // Validation - Required fields
    const salaryValue = salary ? salary.replace(/,/g, "").trim() : ""
    const salaryNum = salaryValue ? Number.parseFloat(salaryValue) : 0

    if (!salaryValue || salaryValue === "" || isNaN(salaryNum) || salaryNum <= 0) {
      toast.error("Please enter Salary (required field)")
      return
    }

    // Calculate total income (salary + housing allowance + bonuses)
    const salaryAmount = Number.parseFloat(salary.replace(/,/g, "") || "0")
    const housingAllowanceAmount = Number.parseFloat(housingAllowance.replace(/,/g, "") || "0")
    const bonusesAmount = Number.parseFloat(bonuses.replace(/,/g, "") || "0")
    const totalIncome = salaryAmount + housingAllowanceAmount + bonusesAmount

    if (totalIncome <= 0) {
      toast.error("Please enter at least Salary amount")
      return
    }

    // Calculate PAYE using the tax calculator
    const result = calculateNigerianTax({
      businessType: "freelancer", // PAYE uses individual tax calculation
      period: period,
      income: totalIncome,
      transportAllowance: transportAllowance ? Number.parseFloat(transportAllowance.replace(/,/g, "")) : undefined,
      rentPaid: Number.parseFloat(rentPaid.replace(/,/g, "") || "0"),
      pensionContribution: Number.parseFloat(pensionContribution.replace(/,/g, "") || "0"),
      healthInsurance: Number.parseFloat(healthInsurance.replace(/,/g, "") || "0"),
      housingFund: Number.parseFloat(housingFund.replace(/,/g, "") || "0"),
      lifeInsurance: Number.parseFloat(lifeInsurance.replace(/,/g, "") || "0"),
      charitableDonations: Number.parseFloat(charitableDonations.replace(/,/g, "") || "0"),
      businessExpenses: 0, // Business expenses not applicable for PAYE (employment income)
      dependents: Number.parseInt(dependents || "0"),
    })

    // Format result to match expected structure
    const formattedResult = {
      calculationType: "paye",
      taxType: "PAYE (Pay As You Earn)",
      grossIncome: result.grossIncome,
      businessExpenses: result.businessExpenses,
      adjustedGrossIncome: result.adjustedGrossIncome,
      reliefs: result.reliefs,
      totalReliefs: result.totalReliefs,
      taxableIncome: result.taxableIncome,
      taxBrackets: result.taxBrackets,
      totalTax: result.totalTax,
      annualTax: result.totalTax,
      monthlySetAside: result.monthlySetAside,
      quarterlyPayments: result.quarterlyPayments,
      effectiveRate: result.effectiveRate,
      period: period,
      transportAllowance: result.transportAllowance,
      // Store original inputs for display (annualized if needed)
      salary: period === "monthly" ? salaryAmount * 12 : period === "quarterly" ? salaryAmount * 4 : salaryAmount,
      housingAllowance: period === "monthly" ? housingAllowanceAmount * 12 : period === "quarterly" ? housingAllowanceAmount * 4 : housingAllowanceAmount,
      bonuses: period === "monthly" ? bonusesAmount * 12 : period === "quarterly" ? bonusesAmount * 4 : bonusesAmount,
    }

    onCalculate(formattedResult)
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">PAYE (Pay As You Earn) Calculation</h3>
          <p className="text-sm text-muted-foreground">
            Calculate tax deductions from salary and employment income
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-blue-950/20 dark:via-cyan-950/20 dark:to-teal-950/20 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-sm">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              📋 PAYE Overview
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              PAYE is the system where employers <strong>deduct income tax</strong> from employees' salaries and remit to tax authority. 
              Tax is calculated using <strong>progressive tax brackets</strong> (0%, 15%, 18%, 21%, 23%, 25%) based on taxable income.
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              <strong>Key Points:</strong> Tax is deducted from every payment (salary, wages, bonuses). 
              Employers must remit monthly by 21st of following month and file annual returns by 31 January.
            </p>
          </div>
        </div>
      </div>

      {/* Income Section */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-300">
            1
          </span>
          Employment Income
        </h4>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 shadow-sm">
            <Label htmlFor="salary" className="flex items-center text-gray-700 dark:text-gray-200 font-semibold">
              {getPeriodLabel()} Salary (₦) <span className="text-red-500 ml-1">*</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 ml-1.5 cursor-pointer text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Your basic monthly/quarterly/annual salary. This is the primary component of your employment income.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="salary"
              type="text"
              inputMode="decimal"
              placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} salary`}
              value={formatCurrencyInput(salary)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  setSalary(rawValue)
                }
              }}
              className="bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-700 focus:border-green-500 dark:focus:border-green-400"
            />
            <p className="text-xs text-green-700 dark:text-green-300 font-medium">{getPeriodText()}</p>
          </div>

          <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800 shadow-sm">
            <Label htmlFor="housingAllowance" className="flex items-center text-gray-700 dark:text-gray-200 font-semibold">
              {getPeriodLabel()} Housing Allowance (₦)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 ml-1.5 cursor-pointer text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Housing allowance provided by employer. This is taxable as benefit-in-kind. You can claim rent relief if you pay rent separately.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="housingAllowance"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatCurrencyInput(housingAllowance)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  setHousingAllowance(rawValue)
                }
              }}
              className="bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700 focus:border-purple-500 dark:focus:border-purple-400"
            />
            <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">{getPeriodText()}</p>
          </div>

          <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800 shadow-sm">
            <Label htmlFor="transportAllowance" className="flex items-center text-gray-700 dark:text-gray-200 font-semibold">
              {getPeriodLabel()} Transport Allowance (₦)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 ml-1.5 cursor-pointer text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Transport allowance up to ₦30,000/month (₦360,000/year) is tax-exempt. Any excess is taxable.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="transportAllowance"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatCurrencyInput(transportAllowance)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  setTransportAllowance(rawValue)
                }
              }}
              className="bg-white dark:bg-gray-800 border-2 border-orange-200 dark:border-orange-700 focus:border-orange-500 dark:focus:border-orange-400"
            />
            <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
              {getPeriodText()} (Up to ₦30,000/month exempt)
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 border-2 border-indigo-200 dark:border-indigo-800 shadow-sm">
            <Label htmlFor="bonuses" className="flex items-center text-gray-700 dark:text-gray-200 font-semibold">
              {getPeriodLabel()} Bonuses/Other Income (₦)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 ml-1.5 cursor-pointer text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Any bonuses, commissions, or other employment-related income received during this period.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="bonuses"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formatCurrencyInput(bonuses)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  setBonuses(rawValue)
                }
              }}
              className="bg-white dark:bg-gray-800 border-2 border-indigo-200 dark:border-indigo-700 focus:border-indigo-500 dark:focus:border-indigo-400"
            />
            <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">{getPeriodText()}</p>
          </div>
        </div>
      </div>

      {/* Deductions & Reliefs Section */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
            2
          </span>
          Deductions & Tax Reliefs
        </h4>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rentPaid">{getPeriodLabel()} Rent Paid (₦)</Label>
            <Input
              id="rentPaid"
              type="text"
              inputMode="decimal"
              placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} rent`}
              value={formatCurrencyInput(rentPaid)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  setRentPaid(rawValue)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">20% relief, capped at ₦500,000/year</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pensionContribution">{getPeriodLabel()} Pension Contribution (₦)</Label>
            <Input
              id="pensionContribution"
              type="text"
              inputMode="decimal"
              placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} pension`}
              value={formatCurrencyInput(pensionContribution)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  setPensionContribution(rawValue)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Up to 8% of gross income</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="healthInsurance">{getPeriodLabel()} Health Insurance (₦)</Label>
            <Input
              id="healthInsurance"
              type="text"
              inputMode="decimal"
              placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} health insurance`}
              value={formatCurrencyInput(healthInsurance)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  setHealthInsurance(rawValue)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Full deduction</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="housingFund">{getPeriodLabel()} National Housing Fund (₦)</Label>
            <Input
              id="housingFund"
              type="text"
              inputMode="decimal"
              placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} NHF`}
              value={formatCurrencyInput(housingFund)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  setHousingFund(rawValue)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Full deduction</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lifeInsurance">{getPeriodLabel()} Life Insurance (₦)</Label>
            <Input
              id="lifeInsurance"
              type="text"
              inputMode="decimal"
              placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} life insurance`}
              value={formatCurrencyInput(lifeInsurance)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  setLifeInsurance(rawValue)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Full deduction</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="charitableDonations">{getPeriodLabel()} Charitable Donations (₦)</Label>
            <Input
              id="charitableDonations"
              type="text"
              inputMode="decimal"
              placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} donations`}
              value={formatCurrencyInput(charitableDonations)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  setCharitableDonations(rawValue)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Up to 10% of gross income</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dependents">Number of Dependents</Label>
            <Input
              id="dependents"
              type="number"
              min="0"
              placeholder="0"
              value={dependents}
              onChange={(e) => {
                const value = e.target.value
                if (value === "" || /^\d+$/.test(value)) {
                  setDependents(value)
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Dependents for tax relief</p>
          </div>
        </div>
      </div>

      {/* Tax Brackets Info */}
      <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 rounded-xl border border-gray-200 dark:border-gray-800">
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2">📊 Progressive Tax Brackets:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div>First ₦800,000: <span className="font-semibold text-green-600">0%</span></div>
          <div>₦800K - ₦3M: <span className="font-semibold">15%</span></div>
          <div>₦3M - ₦12M: <span className="font-semibold">18%</span></div>
          <div>₦12M - ₦25M: <span className="font-semibold">21%</span></div>
          <div>₦25M - ₦50M: <span className="font-semibold">23%</span></div>
          <div>Above ₦50M: <span className="font-semibold">25%</span></div>
        </div>
      </div>

      {/* Calculate Button */}
      <Button
        type="button"
        onClick={handleSubmit}
        className="w-full"
        size="lg"
      >
        <Calculator className="w-4 h-4 mr-2" />
        Calculate PAYE
      </Button>
    </Card>
  )
}

