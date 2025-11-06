"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, X, Calculator, Info } from "lucide-react"
import { calculateCIT, type CapitalAllowance } from "@/lib/tax/cit-calculator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

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
  
  // Minimal mode inputs
  const [profitBeforeTax, setProfitBeforeTax] = useState("")
  const [totalDeductions, setTotalDeductions] = useState("")
  
  // Full mode inputs
  const [revenue, setRevenue] = useState("")
  const [costOfGoodsSold, setCostOfGoodsSold] = useState("")
  const [operatingExpenses, setOperatingExpenses] = useState({
    employeeCosts: "",
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
    // Validation
    if (!annualTurnover || Number.parseFloat(annualTurnover) <= 0) {
      return
    }
    if (!totalFixedAssets) {
      return
    }

    if (isFullMode) {
      if (!revenue || Number.parseFloat(revenue) <= 0) {
        return
      }
    } else {
      if (!profitBeforeTax || Number.parseFloat(profitBeforeTax) <= 0) {
        return
      }
    }

    // Calculate CIT
    const input: any = {
      annualTurnover: Number.parseFloat(annualTurnover),
      totalFixedAssets: Number.parseFloat(totalFixedAssets),
      period,
    }

    if (isFullMode) {
      input.revenue = Number.parseFloat(revenue)
      input.costOfGoodsSold = Number.parseFloat(costOfGoodsSold) || 0
      input.operatingExpenses = {
        employeeCosts: Number.parseFloat(operatingExpenses.employeeCosts) || 0,
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
      topUpTax: result.topUpTax,
      isLargeMultinational: result.isLargeMultinational,
      note: `CIT is calculated annually at ${result.citRate}% of taxable profit. ${result.isSmallCompany ? "Small company exemption applies." : ""} ${result.isLargeMultinational && result.topUpTax ? `Large multinational ETR rule applied - top-up tax of ₦${result.topUpTax.toLocaleString()} required.` : ""}`
    }

    onCalculate(formattedResult)
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <Label htmlFor="full-mode" className="text-base font-semibold cursor-pointer">
            Full Calculation Mode
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            {isFullMode 
              ? "Calculate everything from revenue and expenses" 
              : "Minimal mode - input pre-calculated profit and deductions"}
          </p>
        </div>
        <Switch
          id="full-mode"
          checked={isFullMode}
          onCheckedChange={setIsFullMode}
        />
      </div>

      {/* Minimal Mode */}
      {!isFullMode && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profitBeforeTax">
              Profit Before Tax (₦)
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 inline-block ml-1 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Net profit after operating expenses but before CIT. This is typically your "Profit Before Tax" from your P&L statement.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="profitBeforeTax"
              type="text"
              inputMode="decimal"
              placeholder="Enter profit before tax"
              value={profitBeforeTax}
              onChange={(e) => {
                const value = e.target.value
                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                  setProfitBeforeTax(value)
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalDeductions">
              Total Allowable Deductions (₦)
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 inline-block ml-1 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Total of all allowable deductions including capital allowances. If you have capital allowances, add them below.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="totalDeductions"
              type="text"
              inputMode="decimal"
              placeholder="Enter total deductions (optional)"
              value={totalDeductions}
              onChange={(e) => {
                const value = e.target.value
                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                  setTotalDeductions(value)
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Full Mode */}
      {isFullMode && (
        <div className="space-y-6">
          {/* Revenue and COGS */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="revenue">Total Revenue/Sales (₦)</Label>
              <Input
                id="revenue"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={revenue}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setRevenue(value)
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costOfGoodsSold">Cost of Goods Sold (₦)</Label>
              <Input
                id="costOfGoodsSold"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={costOfGoodsSold}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setCostOfGoodsSold(value)
                  }
                }}
              />
            </div>
          </div>

          {/* Operating Expenses */}
          <div className="space-y-4">
            <h4 className="font-semibold">Operating Expenses (Allowable Deductions)</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "employeeCosts", label: "Employee Costs (Salaries, Wages, Bonuses)" },
                { key: "pensionContributions", label: "Pension Contributions (Employer)" },
                { key: "trainingCosts", label: "Training Costs" },
                { key: "rent", label: "Rent" },
                { key: "utilities", label: "Utilities (Electricity, Water, Internet)" },
                { key: "repairsMaintenance", label: "Repairs & Maintenance" },
                { key: "professionalFees", label: "Professional Fees (Accountants, Lawyers, Auditors)" },
                { key: "interestOnLoans", label: "Interest on Business Loans" },
                { key: "badDebts", label: "Bad Debts Written Off" },
                { key: "donations", label: "Donations (Approved Charities/Education)" },
                { key: "insurancePremiums", label: "Insurance Premiums" },
                { key: "staffWelfare", label: "Staff Welfare & Allowances" },
                { key: "transportation", label: "Transportation Subsidies" },
                { key: "otherExpenses", label: "Other Allowable Expenses" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={operatingExpenses[key as keyof typeof operatingExpenses]}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setOperatingExpenses({ ...operatingExpenses, [key]: value })
                      }
                    }}
                  />
                </div>
              ))}
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
                      value={asset.assetCost || ""}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "" || /^\d*\.?\d*$/.test(value)) {
                          updateCapitalAllowance(asset.id, "assetCost", Number.parseFloat(value) || 0)
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

