"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, X, Calculator, Info, Users, Receipt } from "lucide-react"
import { calculateCIT, type CapitalAllowance } from "@/lib/tax/cit-calculator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { formatCurrencyInput, handleCurrencyInputChange } from "@/lib/utils/currency"

interface CITFormProps {
  period: "monthly" | "quarterly" | "yearly"
  annualTurnover: string
  totalFixedAssets: string
  onAnnualTurnoverChange: (value: string) => void
  onTotalFixedAssetsChange: (value: string) => void
  onCalculate: (result: any) => void
}

export function CITForm({
  period,
  annualTurnover,
  totalFixedAssets,
  onAnnualTurnoverChange,
  onTotalFixedAssetsChange,
  onCalculate,
}: CITFormProps) {
  const [isFullMode, setIsFullMode] = useState(false)
  
  // Helper function to get period label
  const getPeriodLabel = () => {
    if (period === "monthly") return "Monthly"
    if (period === "quarterly") return "Quarterly"
    return "Annual"
  }
  
  // Helper function to get period indicator text
  const getPeriodText = () => {
    if (period === "monthly") return "(for this month - will be annualized)"
    if (period === "quarterly") return "(for this quarter - will be annualized)"
    return "(annual amount)"
  }

  // FAQ/Explanation data for each input field
  const inputExplanations: Record<string, { title: string; description: string; calculation: string; examples?: string[] }> = {
    profitBeforeTax: {
      title: "Profit Before Tax",
      description: "Profit Before Tax (PBT) is your company's net profit after all operating expenses but before Company Income Tax (CIT) is deducted. This is a key figure from your Profit & Loss (P&L) statement.",
      calculation: "Profit Before Tax = Revenue - Cost of Goods Sold - Operating Expenses",
      examples: [
        "If your revenue is ₦10,000,000, COGS is ₦4,000,000, and operating expenses are ₦3,000,000, then PBT = ₦10M - ₦4M - ₦3M = ₦3,000,000",
        "This figure is used as the starting point for CIT calculation",
        "All allowable deductions and capital allowances are subtracted from PBT to get taxable profit"
      ]
    },
    totalDeductions: {
      title: "Total Allowable Deductions",
      description: "Allowable deductions are expenses that can be legally deducted from your profit before tax to reduce your taxable profit. These must be expenses that are wholly, exclusively, necessarily, and reasonably incurred in producing your income.",
      calculation: "Total Deductions = Operating Expenses + Capital Allowances + Other Allowable Deductions",
      examples: [
        "Common deductions include: employee costs, rent, utilities, professional fees, interest on business loans",
        "Capital allowances (depreciation for tax purposes) are also deductible",
        "Only expenses directly related to business operations are deductible"
      ]
    },
    revenue: {
      title: "Total Revenue/Sales",
      description: "Total Revenue (also called Sales or Turnover) is the total amount of money your company receives from selling goods or services during the period. This is the top line of your income statement.",
      calculation: "Revenue = Sum of all sales (goods + services)",
      examples: [
        "If you sold products worth ₦5,000,000 and services worth ₦3,000,000, your total revenue is ₦8,000,000",
        "Revenue is used to calculate Gross Profit: Gross Profit = Revenue - Cost of Goods Sold",
        "Only revenue from business operations is included (not investment income or capital gains)"
      ]
    },
    costOfGoodsSold: {
      title: "Cost of Goods Sold (COGS)",
      description: "Cost of Goods Sold represents the direct costs incurred in producing the goods or services that your company sells. This includes raw materials, direct labor, and manufacturing overhead.",
      calculation: "COGS = Opening Inventory + Purchases - Closing Inventory (for goods) OR Direct Costs (for services)",
      examples: [
        "For a manufacturing company: COGS includes raw materials, direct labor, and factory overhead",
        "For a service company: COGS includes direct labor and materials used to provide the service",
        "COGS is subtracted from Revenue to get Gross Profit"
      ]
    },
    salaries: {
      title: "Salaries",
      description: "Salaries are fixed monthly or annual payments made to employees. This is a major component of employee costs and is fully deductible for CIT purposes.",
      calculation: "Total Salaries = Sum of all employee salaries for the period",
      examples: [
        "If you have 5 employees earning ₦500,000/month each, monthly salaries = ₦2,500,000",
        "Annual salaries = ₦2,500,000 × 12 = ₦30,000,000",
        "Salaries are deductible expenses that reduce your taxable profit"
      ]
    },
    wages: {
      title: "Wages",
      description: "Wages are payments made to workers, typically on an hourly or daily basis. This is separate from salaries and is also fully deductible.",
      calculation: "Total Wages = Sum of all wage payments for the period",
      examples: [
        "Hourly workers, daily laborers, and contract workers typically receive wages",
        "Wages are combined with salaries and bonuses to get total employee costs",
        "All employee costs are deductible expenses"
      ]
    },
    bonuses: {
      title: "Bonuses",
      description: "Bonuses are additional payments made to employees beyond their regular salary or wages. These can be performance-based, annual bonuses, or incentive payments.",
      calculation: "Total Bonuses = Sum of all bonus payments for the period",
      examples: [
        "Performance bonuses, annual bonuses, and incentive payments",
        "Bonuses are part of employee costs and are fully deductible",
        "Must be documented and paid through proper payroll systems"
      ]
    },
    pensionContributions: {
      title: "Pension Contributions (Employer)",
      description: "Employer pension contributions are payments made by the company to pension funds on behalf of employees. These are mandatory under the Pension Reform Act and are fully deductible.",
      calculation: "Employer Pension = Employee Salary × Pension Rate (typically 10% of basic salary)",
      examples: [
        "If total basic salaries are ₦10,000,000, employer pension (10%) = ₦1,000,000",
        "This is separate from employee pension contributions (8%)",
        "Fully deductible as an operating expense"
      ]
    },
    trainingCosts: {
      title: "Training Costs",
      description: "Training costs include expenses for employee training, professional development, workshops, seminars, and courses that improve employee skills for business purposes.",
      calculation: "Training Costs = Course fees + Training materials + Trainer fees + Related expenses",
      examples: [
        "Professional certification courses, technical training, management workshops",
        "Must be directly related to business operations",
        "Fully deductible if training improves business capabilities"
      ]
    },
    rent: {
      title: "Rent",
      description: "Rent includes payments for office space, warehouse, factory, or any business premises. This is a common operating expense for most businesses.",
      calculation: "Total Rent = Monthly/Quarterly/Annual rent payments",
      examples: [
        "Office rent, warehouse rent, factory rent",
        "Rent is fully deductible as an operating expense",
        "Personal rent (for residential purposes) is not deductible"
      ]
    },
    utilities: {
      title: "Utilities",
      description: "Utilities include electricity, water, internet, telephone, and other utility services used for business operations.",
      calculation: "Total Utilities = Electricity + Water + Internet + Phone + Other utilities",
      examples: [
        "Electricity bills, water bills, internet subscriptions, phone bills",
        "Only business-related utilities are deductible",
        "Personal utilities are not deductible"
      ]
    },
    repairsMaintenance: {
      title: "Repairs & Maintenance",
      description: "Repairs and maintenance costs are expenses for maintaining and fixing business assets. These are different from capital improvements (which are capitalized).",
      calculation: "Repairs & Maintenance = Sum of all repair and maintenance expenses",
      examples: [
        "Equipment repairs, building maintenance, vehicle servicing",
        "Must be repairs (not improvements or upgrades)",
        "Fully deductible as operating expenses"
      ]
    },
    professionalFees: {
      title: "Professional Fees",
      description: "Professional fees include payments to accountants, lawyers, auditors, consultants, and other professional service providers hired for business purposes.",
      calculation: "Professional Fees = Accounting fees + Legal fees + Audit fees + Consulting fees",
      examples: [
        "Accountant fees, lawyer fees, audit fees, tax consultant fees",
        "Must be for business-related professional services",
        "Fully deductible as operating expenses"
      ]
    },
    interestOnLoans: {
      title: "Interest on Business Loans",
      description: "Interest paid on loans taken for business purposes is deductible. This includes interest on bank loans, overdrafts, and other business financing.",
      calculation: "Interest Expense = Sum of all interest payments on business loans",
      examples: [
        "Bank loan interest, overdraft interest, business credit interest",
        "Only interest on loans used for business is deductible",
        "Principal repayments are not deductible (they reduce the loan balance)"
      ]
    },
    badDebts: {
      title: "Bad Debts Written Off",
      description: "Bad debts are amounts owed to your business that have become uncollectible. These can be written off and deducted if they were previously recognized as income.",
      calculation: "Bad Debts = Amounts written off as uncollectible",
      examples: [
        "Customer invoices that cannot be collected after reasonable efforts",
        "Must be proven to be uncollectible",
        "Only debts previously recognized as income can be written off"
      ]
    },
    donations: {
      title: "Donations",
      description: "Donations to approved charitable organizations and educational institutions are deductible, subject to limits (typically 10% of assessable profit).",
      calculation: "Deductible Donations = Donations to approved charities/educational institutions (up to 10% of profit)",
      examples: [
        "Donations to government-approved NGOs, educational institutions",
        "Maximum deduction is usually 10% of assessable profit",
        "Must be to approved organizations to be deductible"
      ]
    },
    insurancePremiums: {
      title: "Insurance Premiums",
      description: "Insurance premiums paid for business assets, liability insurance, and employee insurance are deductible operating expenses.",
      calculation: "Insurance Premiums = Sum of all business insurance premium payments",
      examples: [
        "Property insurance, liability insurance, employee health insurance",
        "Must be for business-related insurance",
        "Fully deductible as operating expenses"
      ]
    },
    staffWelfare: {
      title: "Staff Welfare & Allowances",
      description: "Staff welfare includes expenses for employee benefits, allowances, meals, and other welfare programs provided to employees.",
      calculation: "Staff Welfare = Allowances + Meals + Other welfare expenses",
      examples: [
        "Transport allowances, meal allowances, staff welfare programs",
        "Must be reasonable and documented",
        "Fully deductible as operating expenses"
      ]
    },
    transportation: {
      title: "Transportation Subsidies",
      description: "Transportation subsidies are payments made to employees or expenses incurred for business transportation purposes.",
      calculation: "Transportation = Employee transport subsidies + Business transport expenses",
      examples: [
        "Employee transport allowances, company vehicle expenses",
        "Must be for business-related transportation",
        "Fully deductible as operating expenses"
      ]
    },
    otherExpenses: {
      title: "Other Allowable Expenses",
      description: "Other allowable expenses include any other expenses that are wholly, exclusively, necessarily, and reasonably incurred in producing business income.",
      calculation: "Other Expenses = Sum of all other legitimate business expenses",
      examples: [
        "Office supplies, marketing expenses, bank charges, subscription fees",
        "Must meet the test: wholly, exclusively, necessarily, and reasonably incurred",
        "Personal expenses are not deductible"
      ]
    }
  }

  // Info Icon Component with Tooltip and Modal
  const InfoIconWithModal = ({ fieldKey }: { fieldKey: string }) => {
    const explanation = inputExplanations[fieldKey]
    if (!explanation) return null

    return (
      <Dialog>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center ml-1.5 cursor-pointer text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-all hover:scale-110"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="w-4 h-4" />
                </button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent className="bg-blue-600 text-white border-blue-600">
              <p>Click to learn more</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900 border-2 border-blue-100 dark:border-blue-900 shadow-xl">
          <DialogHeader className="border-b border-blue-100 dark:border-blue-800 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              {explanation.title}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300 mt-2 text-base">
              {explanation.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-6">
            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
              <h4 className="font-semibold text-sm mb-3 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                How it's Calculated:
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-200 font-mono bg-white/60 dark:bg-gray-800/60 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                {explanation.calculation}
              </p>
            </div>
            {explanation.examples && explanation.examples.length > 0 && (
              <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800 shadow-sm">
                <h4 className="font-semibold text-sm mb-3 text-green-900 dark:text-green-100 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Examples:
                </h4>
                <ul className="space-y-3">
                  {explanation.examples.map((example, index) => (
                    <li key={index} className="text-sm text-gray-700 dark:text-gray-200 flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="pt-0.5">{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }
  
  // Minimal mode inputs
  const [profitBeforeTax, setProfitBeforeTax] = useState("")
  const [totalDeductions, setTotalDeductions] = useState("")
  
  // Full mode inputs
  const [revenue, setRevenue] = useState("")
  const [costOfGoodsSold, setCostOfGoodsSold] = useState("")
  const [operatingExpenses, setOperatingExpenses] = useState({
    salaries: "",
    wages: "",
    bonuses: "",
    pensionContributions: "",
    trainingCosts: "",
    rent: "",
    utilities: "",
    repairsMaintenance: "",
    professionalFees: "",
    interestOnLoans: "",
    badDebts: "",
    donations: "",
    insurancePremiums: "",
    staffWelfare: "",
    transportation: "",
    otherExpenses: "",
  })
  
  const [capitalAllowances, setCapitalAllowances] = useState<CapitalAllowance[]>([])

  const addCapitalAllowance = () => {
    const newId = `ca-${Date.now()}`
    setCapitalAllowances([
      {
        id: newId,
        assetDescription: "",
        assetCost: 0,
        assetCategory: "other",
        allowanceRate: 25,
        allowanceAmount: 0,
      },
      ...capitalAllowances,
    ])
  }

  const removeCapitalAllowance = (id: string) => {
    setCapitalAllowances(capitalAllowances.filter(ca => ca.id !== id))
  }

  const updateCapitalAllowance = (id: string, field: keyof CapitalAllowance, value: any) => {
    setCapitalAllowances(capitalAllowances.map(ca => {
      if (ca.id === id) {
        const updated = { ...ca, [field]: value }
        // Recalculate allowance if cost or rate changes
        if (field === "assetCost" || field === "assetCategory" || field === "allowanceRate") {
          const rate = field === "assetCategory" ? getCapitalAllowanceRate(value) : (updated.allowanceRate || 25)
          updated.allowanceAmount = (updated.assetCost * rate) / 100
          updated.allowanceRate = rate
        }
        return updated
      }
      return ca
    }))
  }

  const getCapitalAllowanceRate = (category: CapitalAllowance["assetCategory"]): number => {
    const rates: Record<CapitalAllowance["assetCategory"], number> = {
      building: 10,
      furniture: 25,
      equipment: 25,
      vehicle: 25,
      computer: 25,
      other: 25,
    }
    return rates[category] || 25
  }

  const handleSubmit = () => {
    // Validation - Required fields
    // Remove commas and whitespace, then check if value is valid
    const turnoverValue = annualTurnover ? annualTurnover.replace(/,/g, "").trim() : ""
    const assetsValue = totalFixedAssets ? totalFixedAssets.replace(/,/g, "").trim() : ""
    
    const turnoverNum = turnoverValue ? Number.parseFloat(turnoverValue) : 0
    const assetsNum = assetsValue ? Number.parseFloat(assetsValue) : 0
    console.log("turnoverValue", turnoverValue)
    if (!turnoverValue || turnoverValue === "" || isNaN(turnoverNum) || turnoverNum <= 0) {
      toast.error("Please enter Annual Turnover (required field)")
      return
    }
    if (!assetsValue || assetsValue === "" || isNaN(assetsNum) || assetsNum <= 0) {
      toast.error("Please enter Total Fixed Assets (required field)")
      return
    }

    if (isFullMode) {
      // Full Mode Required Fields
      if (!revenue || Number.parseFloat(revenue) <= 0) {
        toast.error("Please enter Total Revenue/Sales (required field)")
        return
      }
      if (!operatingExpenses.salaries || Number.parseFloat(operatingExpenses.salaries) <= 0) {
        toast.error("Please enter Salaries (required field)")
        return
      }
      // COGS and all other expenses are optional (default to 0)
    } else {
      // Minimal Mode Required Fields
      if (!profitBeforeTax || Number.parseFloat(profitBeforeTax) <= 0) {
        toast.error("Please enter Profit Before Tax (required field)")
        return
      }
      // Total Deductions is optional (default to 0)
    }

    // Calculate CIT
    // Use cleaned values (remove commas) for calculation
    const cleanedTurnover = turnoverValue.replace(/,/g, "")
    const cleanedAssets = assetsValue.replace(/,/g, "")
    
    const input: any = {
      annualTurnover: Number.parseFloat(cleanedTurnover),
      totalFixedAssets: Number.parseFloat(cleanedAssets),
      period,
    }

    if (isFullMode) {
      input.revenue = Number.parseFloat(revenue)
      input.costOfGoodsSold = Number.parseFloat(costOfGoodsSold) || 0
      // Calculate total employee costs from breakdown
      const totalEmployeeCosts = 
        (Number.parseFloat(operatingExpenses.salaries) || 0) +
        (Number.parseFloat(operatingExpenses.wages) || 0) +
        (Number.parseFloat(operatingExpenses.bonuses) || 0)

      input.operatingExpenses = {
        employeeCosts: totalEmployeeCosts,
        pensionContributions: Number.parseFloat(operatingExpenses.pensionContributions) || 0,
        trainingCosts: Number.parseFloat(operatingExpenses.trainingCosts) || 0,
        rent: Number.parseFloat(operatingExpenses.rent) || 0,
        utilities: Number.parseFloat(operatingExpenses.utilities) || 0,
        repairsMaintenance: Number.parseFloat(operatingExpenses.repairsMaintenance) || 0,
        professionalFees: Number.parseFloat(operatingExpenses.professionalFees) || 0,
        interestOnLoans: Number.parseFloat(operatingExpenses.interestOnLoans) || 0,
        badDebts: Number.parseFloat(operatingExpenses.badDebts) || 0,
        donations: Number.parseFloat(operatingExpenses.donations) || 0,
        insurancePremiums: Number.parseFloat(operatingExpenses.insurancePremiums) || 0,
        staffWelfare: Number.parseFloat(operatingExpenses.staffWelfare) || 0,
        transportation: Number.parseFloat(operatingExpenses.transportation) || 0,
        otherExpenses: Number.parseFloat(operatingExpenses.otherExpenses) || 0,
      }
      input.capitalAllowances = capitalAllowances.filter(ca => ca.assetDescription && ca.assetCost > 0)
    } else {
      input.profitBeforeTax = Number.parseFloat(profitBeforeTax)
      input.totalDeductions = Number.parseFloat(totalDeductions) || 0
      input.capitalAllowances = capitalAllowances.filter(ca => ca.assetDescription && ca.assetCost > 0)
    }

    const result = calculateCIT(input)

    // Format result to match expected structure
    const formattedResult = {
      calculationType: "cit",
      taxType: "Company Income Tax (CIT)",
      turnover: result.annualTurnover,
      totalFixedAssets: result.totalFixedAssets,
      assessableProfit: result.profitBeforeTax,
      taxableProfit: result.taxableProfit,
      isSmallCompany: result.isSmallCompany,
      citRate: result.citRate,
      totalTax: result.periodCIT,
      annualTax: result.totalCITPayable,
      monthlySetAside: result.monthlySetAside,
      quarterlySetAside: result.quarterlySetAside,
      period,
      revenue: result.revenue,
      costOfGoodsSold: result.costOfGoodsSold,
      totalOperatingExpenses: result.totalOperatingExpenses,
      operatingExpensesBreakdown: result.operatingExpensesBreakdown,
      totalDeductions: result.totalDeductions,
      capitalAllowancesTotal: result.capitalAllowancesTotal,
      capitalAllowances: result.capitalAllowances,
      deductionsBreakdown: result.deductionsBreakdown,
      effectiveTaxRate: result.effectiveTaxRate,
      originalETR: result.originalETR,
      topUpTax: result.topUpTax,
      isLargeMultinational: result.isLargeMultinational,
      note: `CIT is calculated annually at ${result.citRate}% of taxable profit. ${result.isSmallCompany ? "Small company exemption applies." : ""} ${result.isLargeMultinational && result.topUpTax ? `Large multinational ETR rule applied - top-up tax of ₦${result.topUpTax.toLocaleString()} required.` : ""}`
    }

    onCalculate(formattedResult)
  }

  return (
    <div className="space-y-6">
      {/* Important Note about CIT Period */}
      <div className="p-5 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-teal-950/30 border-2 border-blue-300 dark:border-blue-700 rounded-xl mb-4 shadow-md">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Info className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-2 flex-1">
            <p className="text-base font-bold text-blue-900 dark:text-blue-100">
              CIT is Always Calculated Annually
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
              Company Income Tax (CIT) is calculated on an <strong className="text-blue-900 dark:text-blue-100">annual basis</strong> regardless of company size. 
              The period selection ({period === "monthly" ? "Monthly" : period === "quarterly" ? "Quarterly" : "Annual"}) helps you:
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside mt-2 space-y-1.5 ml-2">
              <li>Estimate your annual CIT liability based on {period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} performance</li>
              <li>Plan your tax payments and set aside funds accordingly</li>
              <li>Understand how much to budget for CIT each {period === "monthly" ? "month" : period === "quarterly" ? "quarter" : "year"}</li>
            </ul>
            <div className="mt-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-xs text-blue-900 dark:text-blue-100 font-semibold">
                💡 <strong>Note:</strong> Your actual CIT return is filed annually with FIRS, but you can use monthly/quarterly estimates for planning.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Required Fields Summary */}
      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl border-2 border-amber-300 dark:border-amber-700 shadow-sm">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
              Required Fields:
            </p>
            <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <p className="font-semibold">Always Required:</p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>Annual Turnover (entered above)</li>
                <li>Total Fixed Assets (entered above)</li>
              </ul>
              {isFullMode ? (
                <>
                  <p className="font-semibold mt-2">Full Mode Required:</p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li>Total Revenue/Sales</li>
                    <li>Salaries (at least one employee cost)</li>
                  </ul>
                  <p className="text-amber-700 dark:text-amber-300 mt-2 italic">
                    All other fields (COGS, expenses, capital allowances) are optional
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold mt-2">Minimal Mode Required:</p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li>Profit Before Tax</li>
                  </ul>
                  <p className="text-amber-700 dark:text-amber-300 mt-2 italic">
                    Total Deductions and Capital Allowances are optional
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center justify-between p-5 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 shadow-sm">
        <div>
          <Label htmlFor="full-mode" className="text-base font-bold text-gray-800 dark:text-gray-100 cursor-pointer flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Full Calculation Mode
          </Label>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 font-medium">
            {isFullMode 
              ? "Calculate everything from revenue and expenses" 
              : "Minimal mode - input pre-calculated profit and deductions"}
          </p>
        </div>
        <Switch
          id="full-mode"
          checked={isFullMode}
          onCheckedChange={setIsFullMode}
          className="data-[state=checked]:bg-indigo-600"
        />
      </div>

      {/* Minimal Mode */}
      {!isFullMode && (
        <div className="space-y-4">
          <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-sm">
            <Label htmlFor="profitBeforeTax" className="flex items-center text-gray-700 dark:text-gray-200 font-semibold">
              {getPeriodLabel()} Profit Before Tax (₦) <span className="text-red-500 ml-1">*</span>
              <InfoIconWithModal fieldKey="profitBeforeTax" />
            </Label>
            <Input
              id="profitBeforeTax"
              type="text"
              inputMode="decimal"
              placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} profit before tax`}
              value={formatCurrencyInput(profitBeforeTax)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  setProfitBeforeTax(rawValue)
                }
              }}
              className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
            />
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">{getPeriodText()}</p>
          </div>

          <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800 shadow-sm">
            <Label htmlFor="totalDeductions" className="flex items-center text-gray-700 dark:text-gray-200 font-semibold">
              {getPeriodLabel()} Total Allowable Deductions (₦)
              <InfoIconWithModal fieldKey="totalDeductions" />
            </Label>
            <Input
              id="totalDeductions"
              type="text"
              inputMode="decimal"
              placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} deductions (optional)`}
              value={formatCurrencyInput(totalDeductions)}
              onChange={(e) => {
                const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                if (isValid) {
                  setTotalDeductions(rawValue)
                }
              }}
              className="bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 transition-all"
            />
            <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">{getPeriodText()}</p>
          </div>
        </div>
      )}

      {/* Full Mode */}
      {isFullMode && (
        <div className="space-y-6">
          {/* Revenue and COGS */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 shadow-sm">
              <Label htmlFor="revenue" className="flex items-center text-gray-700 dark:text-gray-200 font-semibold">
                {getPeriodLabel()} Total Revenue/Sales (₦) <span className="text-red-500 ml-1">*</span>
                <InfoIconWithModal fieldKey="revenue" />
              </Label>
              <Input
                id="revenue"
                type="text"
                inputMode="decimal"
                placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} revenue`}
                value={formatCurrencyInput(revenue)}
                onChange={(e) => {
                  const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                  if (isValid) {
                    setRevenue(rawValue)
                  }
                }}
                className="bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-700 focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 transition-all"
              />
              <p className="text-xs text-green-700 dark:text-green-300 font-medium">{getPeriodText()}</p>
            </div>
            <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 dark:from-blue-950/20 dark:via-cyan-950/20 dark:to-sky-950/20 border-2 border-blue-200 dark:border-blue-800 shadow-sm">
              <Label htmlFor="costOfGoodsSold" className="flex items-center text-gray-700 dark:text-gray-200 font-semibold">
                {getPeriodLabel()} Cost of Goods Sold (₦)
                <InfoIconWithModal fieldKey="costOfGoodsSold" />
              </Label>
              <Input
                id="costOfGoodsSold"
                type="text"
                inputMode="decimal"
                placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} COGS`}
                value={formatCurrencyInput(costOfGoodsSold)}
                onChange={(e) => {
                  const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                  if (isValid) {
                    setCostOfGoodsSold(rawValue)
                  }
                }}
                className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all"
              />
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">{getPeriodText()}</p>
            </div>
          </div>

          {/* Operating Expenses */}
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 rounded-xl border-2 border-teal-200 dark:border-teal-800 shadow-sm">
              <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                Operating Expenses (Allowable Deductions)
              </h4>
              <p className="text-sm text-teal-700 dark:text-teal-300 mt-2 font-medium">{getPeriodText()}</p>
            </div>
            
            {/* Employee Costs Breakdown */}
            <div className="p-5 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 rounded-xl border-2 border-purple-200 dark:border-purple-800 shadow-sm space-y-4">
              <h5 className="font-semibold text-base text-purple-900 dark:text-purple-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                {getPeriodLabel()} Employee Costs
              </h5>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salaries" className="flex items-center text-gray-700 dark:text-gray-200 font-medium">
                    {getPeriodLabel()} Salaries (₦) <span className="text-red-500 ml-1">*</span>
                    <InfoIconWithModal fieldKey="salaries" />
                  </Label>
                  <Input
                    id="salaries"
                    type="text"
                    inputMode="decimal"
                    placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} salaries`}
                    value={formatCurrencyInput(operatingExpenses.salaries)}
                    onChange={(e) => {
                      const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                      if (isValid) {
                        setOperatingExpenses({ ...operatingExpenses, salaries: rawValue })
                      }
                    }}
                    required
                    className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wages" className="flex items-center text-gray-700 dark:text-gray-200 font-medium">
                    {getPeriodLabel()} Wages (₦) <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
                    <InfoIconWithModal fieldKey="wages" />
                  </Label>
                  <Input
                    id="wages"
                    type="text"
                    inputMode="decimal"
                    placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} wages`}
                    value={formatCurrencyInput(operatingExpenses.wages)}
                    onChange={(e) => {
                      const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                      if (isValid) {
                        setOperatingExpenses({ ...operatingExpenses, wages: rawValue })
                      }
                    }}
                    className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonuses" className="flex items-center text-gray-700 dark:text-gray-200 font-medium">
                    {getPeriodLabel()} Bonuses (₦) <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
                    <InfoIconWithModal fieldKey="bonuses" />
                  </Label>
                  <Input
                    id="bonuses"
                    type="text"
                    inputMode="decimal"
                    placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} bonuses`}
                    value={formatCurrencyInput(operatingExpenses.bonuses)}
                    onChange={(e) => {
                      const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                      if (isValid) {
                        setOperatingExpenses({ ...operatingExpenses, bonuses: rawValue })
                      }
                    }}
                    className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 transition-all"
                  />
                </div>
              </div>
              {(Number.parseFloat(operatingExpenses.salaries) > 0 || Number.parseFloat(operatingExpenses.wages) > 0 || Number.parseFloat(operatingExpenses.bonuses) > 0) && (
                <div className="pt-4 mt-4 border-t-2 border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-purple-200 dark:border-purple-700">
                    <span className="text-gray-700 dark:text-gray-200 font-medium">Total Employee Costs:</span>
                    <span className="font-bold text-lg text-purple-700 dark:text-purple-300">
                      ₦{(
                        (Number.parseFloat(operatingExpenses.salaries) || 0) +
                        (Number.parseFloat(operatingExpenses.wages) || 0) +
                        (Number.parseFloat(operatingExpenses.bonuses) || 0)
                      ).toLocaleString("en-NG", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Other Operating Expenses */}
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "pensionContributions", label: "Pension Contributions (Employer)", color: "blue" },
                { key: "trainingCosts", label: "Training Costs", color: "green" },
                { key: "rent", label: "Rent", color: "orange" },
                { key: "utilities", label: "Utilities (Electricity, Water, Internet)", color: "yellow" },
                { key: "repairsMaintenance", label: "Repairs & Maintenance", color: "red" },
                { key: "professionalFees", label: "Professional Fees (Accountants, Lawyers, Auditors)", color: "purple" },
                { key: "interestOnLoans", label: "Interest on Business Loans", color: "indigo" },
                { key: "badDebts", label: "Bad Debts Written Off", color: "pink" },
                { key: "donations", label: "Donations (Approved Charities/Education)", color: "teal" },
                { key: "insurancePremiums", label: "Insurance Premiums", color: "cyan" },
                { key: "staffWelfare", label: "Staff Welfare & Allowances", color: "amber" },
                { key: "transportation", label: "Transportation Subsidies", color: "emerald" },
                { key: "otherExpenses", label: "Other Allowable Expenses", color: "gray" },
              ].map(({ key, label, color }) => {
                const colorClasses = {
                  blue: "border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-200 dark:focus:ring-blue-900",
                  green: "border-green-200 dark:border-green-800 focus:border-green-500 dark:focus:border-green-400 focus:ring-green-200 dark:focus:ring-green-900",
                  orange: "border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-orange-200 dark:focus:ring-orange-900",
                  yellow: "border-yellow-200 dark:border-yellow-800 focus:border-yellow-500 dark:focus:border-yellow-400 focus:ring-yellow-200 dark:focus:ring-yellow-900",
                  red: "border-red-200 dark:border-red-800 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-200 dark:focus:ring-red-900",
                  purple: "border-purple-200 dark:border-purple-800 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-purple-200 dark:focus:ring-purple-900",
                  indigo: "border-indigo-200 dark:border-indigo-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-200 dark:focus:ring-indigo-900",
                  pink: "border-pink-200 dark:border-pink-800 focus:border-pink-500 dark:focus:border-pink-400 focus:ring-pink-200 dark:focus:ring-pink-900",
                  teal: "border-teal-200 dark:border-teal-800 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-teal-200 dark:focus:ring-teal-900",
                  cyan: "border-cyan-200 dark:border-cyan-800 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-200 dark:focus:ring-cyan-900",
                  amber: "border-amber-200 dark:border-amber-800 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-amber-200 dark:focus:ring-amber-900",
                  emerald: "border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-emerald-200 dark:focus:ring-emerald-900",
                  gray: "border-gray-200 dark:border-gray-800 focus:border-gray-500 dark:focus:border-gray-400 focus:ring-gray-200 dark:focus:ring-gray-900",
                }
                return (
                  <div key={key} className="space-y-2 p-3 rounded-lg bg-white/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <Label htmlFor={key} className="flex items-center text-gray-700 dark:text-gray-200 font-medium">
                      {getPeriodLabel()} {label}
                      <InfoIconWithModal fieldKey={key} />
                    </Label>
                    <Input
                      id={key}
                      type="text"
                      inputMode="decimal"
                      placeholder={`Enter ${period === "monthly" ? "monthly" : period === "quarterly" ? "quarterly" : "annual"} amount`}
                      value={formatCurrencyInput(operatingExpenses[key as keyof typeof operatingExpenses])}
                      onChange={(e) => {
                        const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                        if (isValid) {
                          setOperatingExpenses({ ...operatingExpenses, [key]: rawValue })
                        }
                      }}
                      className={`bg-white dark:bg-gray-800 border-2 ${colorClasses[color as keyof typeof colorClasses]} focus:ring-2 transition-all`}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Capital Allowances */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">Capital Allowances</h4>
            <p className="text-xs text-muted-foreground">
              Depreciation for tax purposes (buildings: 10%, other assets: 25% per year)
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addCapitalAllowance}>
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
        </div>

        {capitalAllowances.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No capital allowances added. Click "Add Asset" to add one.
          </p>
        ) : (
          <div className="space-y-3">
            {capitalAllowances.map((asset) => (
              <Card key={asset.id} className="p-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Asset Description</Label>
                    <Input
                      placeholder="e.g., Office Building, Computer Equipment"
                      value={asset.assetDescription}
                      onChange={(e) => updateCapitalAllowance(asset.id, "assetDescription", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Asset Cost (₦)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={asset.assetCost ? formatCurrencyInput(asset.assetCost.toString()) : ""}
                      onChange={(e) => {
                        const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                        if (isValid) {
                          updateCapitalAllowance(asset.id, "assetCost", Number.parseFloat(rawValue) || 0)
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Asset Category</Label>
                    <Select
                      value={asset.assetCategory}
                      onValueChange={(value: CapitalAllowance["assetCategory"]) => updateCapitalAllowance(asset.id, "assetCategory", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="building">Building (10%)</SelectItem>
                        <SelectItem value="furniture">Furniture (25%)</SelectItem>
                        <SelectItem value="equipment">Equipment (25%)</SelectItem>
                        <SelectItem value="vehicle">Vehicle (25%)</SelectItem>
                        <SelectItem value="computer">Computer (25%)</SelectItem>
                        <SelectItem value="other">Other (25%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Capital Allowance (₦)</Label>
                    <Input
                      type="text"
                      value={asset.allowanceAmount.toLocaleString()}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      {asset.allowanceRate}% of ₦{asset.assetCost.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => removeCapitalAllowance(asset.id)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-semibold mb-2">CIT Rules:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Small Companies:</strong> Turnover ≤ ₦100M AND Assets ≤ ₦250M → <strong>0% CIT</strong></li>
              <li><strong>Other Companies:</strong> <strong>30% CIT</strong> on taxable profit</li>
              <li><strong>Large Multinationals:</strong> Turnover ≥ ₦50B → Minimum 15% Effective Tax Rate (ETR)</li>
              <li>Taxable Profit = Profit Before Tax - Allowable Deductions - Capital Allowances</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-blue-300 dark:border-blue-700">
              <p className="font-semibold mb-1 text-xs">What is the 15% ETR Rule?</p>
              <p className="text-xs">
                For companies with turnover ≥ ₦50 billion, there's a <strong>minimum Effective Tax Rate</strong> of 15%. 
                This means your total CIT paid must be at least 15% of your Profit Before Tax, even if deductions reduce your taxable profit significantly.
              </p>
              <p className="text-xs mt-2">
                <strong>Example:</strong> If your Profit Before Tax is ₦100M and deductions reduce taxable profit to ₦10M, 
                normal CIT would be ₦3M (30% × ₦10M = 3% ETR). But the ETR rule requires minimum ₦15M (15% × ₦100M), 
                so you'd pay ₦15M with a ₦12M top-up tax.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <Button type="button" onClick={handleSubmit} className="w-full">
        <Calculator className="w-4 h-4 mr-2" />
        Calculate CIT
      </Button>
    </div>
  )
}

