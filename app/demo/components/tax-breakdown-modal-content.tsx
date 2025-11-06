import { Button } from "@/components/ui/button"
import { Wallet, Download, FileText } from "lucide-react"

interface TaxBreakdownModalContentProps {
  result: any
}

export function TaxBreakdownModalContent({ result }: TaxBreakdownModalContentProps) {
  // Handle different calculation types
  const isBusinessTax = result.calculationType && ["cit", "development-levy", "withholding-tax", "vat"].includes(result.calculationType)
  
  // Calculate monthly set-aside (may not exist for all tax types)
  const monthlySetAside = result.monthlySetAside || (result.totalTax ? result.totalTax / 12 : 0)
  
  return (
    <>
      {/* Monthly Set-Aside Card */}
      {monthlySetAside > 0 && (
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border-2 border-primary/30 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Monthly Set-Aside</h3>
          </div>
          <p className="text-2xl font-bold text-primary">₦{monthlySetAside.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Save this amount each month for tax payments</p>
        </div>
      )}

      {/* Income Section - Only show for non-business tax types */}
      {!isBusinessTax && result.grossIncome !== undefined && (
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-sm mb-3">Income</h3>
          <div className="space-y-2">
            {/* Income Breakdown by Source */}
            {result.incomeBreakdown && result.incomeBreakdown.length > 0 && (
              <div className="mb-3 pb-3 border-b border-border">
                <p className="text-xs text-muted-foreground mb-2">Income Sources:</p>
                <div className="space-y-1.5">
                  {result.incomeBreakdown.map((source: any, index: number) => {
                    const allTypes = [
                      { value: "salary", label: "Salary (PAYE)" },
                      { value: "bonus", label: "Bonus" },
                      { value: "allowance", label: "Allowances" },
                      { value: "freelance", label: "Freelance Work" },
                      { value: "consulting", label: "Consulting" },
                      { value: "contract", label: "Contract Work" },
                      { value: "sponsorship", label: "Brand Sponsorships" },
                      { value: "ad_revenue", label: "Ad Revenue" },
                      { value: "affiliate", label: "Affiliate Income" },
                      { value: "brand_deal", label: "Brand Deals" },
                      { value: "content_licensing", label: "Content Licensing" },
                      { value: "merchandise", label: "Merchandise Sales" },
                      { value: "subscription", label: "Subscription Revenue" },
                      { value: "courses", label: "Online Courses/Coaching" },
                      { value: "events", label: "Events & Speaking" },
                      { value: "business_income", label: "Business Income" },
                      { value: "sales", label: "Product/Service Sales" },
                      { value: "rental", label: "Rental Income" },
                      { value: "investment", label: "Investment Income" },
                      { value: "dividends", label: "Dividends" },
                      { value: "other", label: "Other Income" },
                    ]
                    const typeLabel = allTypes.find(t => t.value === source.type)?.label || source.type.replace(/_/g, " ")
                    return (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {typeLabel}
                        </span>
                        <span className="font-medium">₦{(source.amount || 0).toLocaleString()}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {result.grossIncome !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gross Income</span>
                <span className="font-medium">₦{(result.grossIncome || 0).toLocaleString()}</span>
              </div>
            )}
            {result.businessExpenses > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Business Expenses</span>
                <span className="font-medium text-red-600">-₦{(result.businessExpenses || 0).toLocaleString()}</span>
              </div>
            )}
            {result.adjustedGrossIncome !== undefined && (
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                <span className="font-medium">Adjusted Gross Income</span>
                <span className="font-semibold">₦{(result.adjustedGrossIncome || 0).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reliefs & Deductions - Only show for non-business tax types */}
      {!isBusinessTax && result.reliefs && (
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-sm mb-3">Tax Reliefs & Deductions</h3>
          <div className="space-y-2">
            {result.reliefs.rentRelief > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rent Relief (20%)</span>
                <span className="font-medium text-green-600">-₦{(result.reliefs.rentRelief || 0).toLocaleString()}</span>
              </div>
            )}
            {result.reliefs.pension > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pension Contribution</span>
                <span className="font-medium text-green-600">-₦{(result.reliefs.pension || 0).toLocaleString()}</span>
              </div>
            )}
            {result.reliefs.healthInsurance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Health Insurance</span>
                <span className="font-medium text-green-600">-₦{(result.reliefs.healthInsurance || 0).toLocaleString()}</span>
              </div>
            )}
            {result.reliefs.housingFund > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">National Housing Fund (NHF)</span>
                <span className="font-medium text-green-600">-₦{(result.reliefs.housingFund || 0).toLocaleString()}</span>
              </div>
            )}
            {result.reliefs.lifeInsurance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Life Insurance</span>
                <span className="font-medium text-green-600">-₦{(result.reliefs.lifeInsurance || 0).toLocaleString()}</span>
              </div>
            )}
            {result.reliefs.charitable > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Charitable Donations</span>
                <span className="font-medium text-green-600">-₦{(result.reliefs.charitable || 0).toLocaleString()}</span>
              </div>
            )}
            {result.totalReliefs !== undefined && (
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                <span className="font-medium">Total Reliefs</span>
                <span className="font-semibold text-green-600">-₦{(result.totalReliefs || 0).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tax Calculation */}
      <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary/20 mb-4">
        <h3 className="font-semibold text-sm mb-3">{result.taxType || "Tax Calculation"}</h3>
        <div className="space-y-2">
          {/* For business taxes, show specific breakdown */}
          {result.calculationType === "cit" && (
            <>
              {result.turnover !== undefined && (
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">
                    Annual Turnover {result.period && result.period !== "yearly" ? `(${result.period} input annualized)` : ""}
                    {result.period && result.period !== "yearly" && result.originalInputTurnover !== undefined && (
                      <span className="text-xs block text-muted-foreground mt-1">
                        Input: ₦{(result.originalInputTurnover || 0).toLocaleString()} × {result.period === "monthly" ? "12" : "4"} = ₦{(result.turnover || 0).toLocaleString()}
                      </span>
                    )}
                  </span>
                  <span className="font-medium">₦{(result.turnover || 0).toLocaleString()}</span>
                </div>
              )}
              {result.totalFixedAssets !== undefined && (
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Total Fixed Assets</span>
                  <span className="font-medium">₦{(result.totalFixedAssets || 0).toLocaleString()}</span>
                </div>
              )}
              {result.isSmallCompany !== undefined && (
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Company Status</span>
                  <span className="font-medium">
                    {result.isSmallCompany 
                      ? "Small Company (Exempt)" 
                      : result.isLargeMultinational 
                        ? "Large Multinational (≥ ₦50B)" 
                        : "Other Company (30% CIT)"}
                  </span>
                </div>
              )}
              
              {/* Revenue and COGS (Full Mode) */}
              {result.revenue !== undefined && (
                <div className="mb-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Total Revenue/Sales:</span>
                    <span className="font-medium">₦{(result.revenue || 0).toLocaleString()}</span>
                  </div>
                  {result.costOfGoodsSold !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Cost of Goods Sold:</span>
                      <span className="font-medium">₦{(result.costOfGoodsSold || 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Operating Expenses Breakdown (Full Mode) */}
              {result.operatingExpensesBreakdown && Object.keys(result.operatingExpensesBreakdown).length > 0 && (
                <div className="mb-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2 font-semibold">Operating Expenses Breakdown:</p>
                  {Object.entries(result.operatingExpensesBreakdown).map(([key, value]: [string, any]) => {
                    if (value === 0) return null
                    const labels: Record<string, string> = {
                      costOfGoodsSold: "Cost of Goods Sold",
                      employeeCosts: "Employee Costs",
                      pensionContributions: "Pension Contributions",
                      trainingCosts: "Training Costs",
                      rent: "Rent",
                      utilities: "Utilities",
                      repairsMaintenance: "Repairs & Maintenance",
                      professionalFees: "Professional Fees",
                      interestOnLoans: "Interest on Loans",
                      badDebts: "Bad Debts Written Off",
                      donations: "Donations (Approved)",
                      insurancePremiums: "Insurance Premiums",
                      staffWelfare: "Staff Welfare",
                      transportation: "Transportation",
                      otherExpenses: "Other Expenses",
                    }
                    return (
                      <div key={key} className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{labels[key] || key}:</span>
                        <span className="font-medium">₦{(value || 0).toLocaleString()}</span>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-border/50">
                    <span className="text-muted-foreground">Total Operating Expenses:</span>
                    <span className="font-medium">₦{(result.totalOperatingExpenses || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
              
              {/* Profit Before Tax */}
              {result.assessableProfit !== undefined && (
                <div className="mb-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      Profit Before Tax {result.period && result.period !== "yearly" ? `(${result.period} input annualized)` : ""}
                      {result.period && result.period !== "yearly" && result.originalInputProfit !== undefined && (
                        <span className="text-xs block text-muted-foreground mt-1">
                          Input: ₦{(result.originalInputProfit || 0).toLocaleString()} × {result.period === "monthly" ? "12" : "4"} = ₦{(result.assessableProfit || 0).toLocaleString()}
                        </span>
                      )}
                    </span>
                    <span className="font-medium">₦{(result.assessableProfit || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
              
              {/* Deductions Breakdown */}
              {result.deductionsBreakdown && result.deductionsBreakdown.length > 0 && (
                <div className="mb-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2 font-semibold">Allowable Deductions:</p>
                  {result.deductionsBreakdown.map((deduction: any) => (
                    <div key={deduction.id} className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{deduction.category}:</span>
                      <span className="font-medium">₦{(deduction.amount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Capital Allowances */}
              {result.capitalAllowances && result.capitalAllowances.length > 0 && (
                <div className="mb-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2 font-semibold">Capital Allowances:</p>
                  {result.capitalAllowances.map((asset: any) => (
                    <div key={asset.id} className="mb-2 p-2 bg-muted/30 rounded border border-border">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{asset.assetDescription}</span>
                        <span className="text-muted-foreground">{asset.allowanceRate}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Asset Cost:</span>
                        <span className="font-medium">₦{(asset.assetCost || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Allowance:</span>
                        <span className="font-medium text-green-600">₦{(asset.allowanceAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-border/50">
                    <span className="text-muted-foreground">Total Capital Allowances:</span>
                    <span className="font-medium">₦{(result.capitalAllowancesTotal || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
              
              {/* Total Deductions */}
              {(result.totalDeductions !== undefined || result.capitalAllowancesTotal !== undefined) && (
                <div className="mb-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Allowable Deductions:</span>
                    <span className="font-medium">₦{((result.totalDeductions || 0) + (result.capitalAllowancesTotal || 0)).toLocaleString()}</span>
                  </div>
                </div>
              )}
              
              {/* Taxable Profit Calculation */}
              {result.taxableProfit !== undefined && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Profit Before Tax:</span>
                      <span className="font-medium">₦{(result.assessableProfit || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Less: Total Deductions:</span>
                      <span className="font-medium text-green-600">-₦{((result.totalDeductions || 0) + (result.capitalAllowancesTotal || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                      <span className="font-semibold">Taxable Profit:</span>
                      <span className="font-bold text-lg text-primary">₦{(result.taxableProfit || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* CIT Rate and Amount */}
              {result.citRate !== undefined && (
                <div className="mb-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">CIT Rate:</span>
                    <span className="font-medium">{result.citRate}%</span>
                  </div>
                  {result.isLargeMultinational && result.effectiveTaxRate !== undefined && (
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Effective Tax Rate (ETR):</span>
                      <span className="font-medium">{result.effectiveTaxRate.toFixed(2)}%</span>
                    </div>
                  )}
                  {result.topUpTax !== undefined && result.topUpTax > 0 && (
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">ETR Top-Up Tax:</span>
                      <span className="font-medium text-amber-600">₦{(result.topUpTax || 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* CIT Calculation Explanation */}
              {result.citRate !== undefined && result.taxableProfit !== undefined && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Taxable Profit:</span>
                      <span className="font-medium">₦{(result.taxableProfit || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">CIT Rate:</span>
                      <span className="font-medium">{result.citRate}%</span>
                    </div>
                    {result.annualTax !== undefined && (
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                        <span className="font-semibold">Annual CIT Payable:</span>
                        <span className="font-bold text-lg text-primary">₦{(result.annualTax || 0).toLocaleString()}</span>
                      </div>
                    )}
                    {result.annualTax !== undefined && result.taxableProfit > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Calculation: ₦{(result.taxableProfit || 0).toLocaleString()} × {result.citRate}% = ₦{(result.annualTax || 0).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Explanation for Zero Tax */}
              {((result.totalTax === 0 || result.annualTax === 0) && !result.isSmallCompany) && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded">
                  <p className="text-xs text-blue-800 dark:text-blue-200 font-medium mb-2">
                    ℹ️ Why is CIT ₦0?
                  </p>
                  {result.taxableProfit === 0 && (
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Your taxable profit is ₦0 because deductions ({((result.totalDeductions || 0) + (result.capitalAllowancesTotal || 0)).toLocaleString()}) equal or exceed your profit before tax ({result.assessableProfit?.toLocaleString() || 0}). No CIT is payable when taxable profit is ₦0.
                    </p>
                  )}
                  {result.taxableProfit !== undefined && result.taxableProfit > 0 && result.totalTax === 0 && (
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Please check your calculation - you have taxable profit of ₦{result.taxableProfit.toLocaleString()} but CIT is showing as ₦0. This may be a calculation error.
                    </p>
                  )}
                </div>
              )}
              
              {result.isSmallCompany && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded">
                  <p className="text-xs text-green-800 dark:text-green-200 font-medium">
                    ✅ Small Company Exemption: You are exempt from CIT (turnover ≤ ₦100M and assets ≤ ₦250M). CIT = ₦0.
                  </p>
                </div>
              )}
              
              {result.isLargeMultinational && result.topUpTax !== undefined && result.topUpTax > 0 && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded">
                  <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                    ⚠️ Large Multinational ETR Rule: Your effective tax rate was below 15%. A top-up tax of ₦{(result.topUpTax || 0).toLocaleString()} is required to meet the minimum 15% ETR.
                  </p>
                </div>
              )}
            </>
          )}
          
          {result.calculationType === "development-levy" && (
            <>
              {result.yearOfAssessment !== undefined && (
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Year of Assessment</span>
                  <span className="font-medium">{result.yearOfAssessment}</span>
                </div>
              )}
              {result.turnover !== undefined && (
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">
                    Annual Turnover {result.period && result.period !== "yearly" ? `(${result.period} input annualized)` : ""}
                    {result.period && result.period !== "yearly" && result.originalInputTurnover !== undefined && (
                      <span className="text-xs block text-muted-foreground mt-1">
                        Input: ₦{(result.originalInputTurnover || 0).toLocaleString()} × {result.period === "monthly" ? "12" : "4"} = ₦{(result.turnover || 0).toLocaleString()}
                      </span>
                    )}
                  </span>
                  <span className="font-medium">₦{(result.turnover || 0).toLocaleString()}</span>
                </div>
              )}
              {result.totalFixedAssets !== undefined && (
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Total Fixed Assets</span>
                  <span className="font-medium">₦{(result.totalFixedAssets || 0).toLocaleString()}</span>
                </div>
              )}
              {result.isSmallCompany !== undefined && (
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Company Status</span>
                  <span className="font-medium">{result.isSmallCompany ? "Small Company (Exempt)" : "Large Company"}</span>
                </div>
              )}
              {result.assessableProfit !== undefined && (
                <div className="mb-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      Assessable Profit {result.period && result.period !== "yearly" ? `(${result.period} input annualized)` : ""}
                      {result.period && result.period !== "yearly" && result.originalInputProfit !== undefined && (
                        <span className="text-xs block text-muted-foreground mt-1">
                          Input: ₦{(result.originalInputProfit || 0).toLocaleString()} × {result.period === "monthly" ? "12" : "4"} = ₦{(result.assessableProfit || 0).toLocaleString()}
                        </span>
                      )}
                    </span>
                    <span className="font-medium">₦{(result.assessableProfit || 0).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    ℹ️ Assessable profit = Profit before tax depreciation and losses
                  </p>
                </div>
              )}
              {result.levyRate !== undefined && (
                <div className="mb-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Development Levy Rate</span>
                    <span className="font-medium">{result.levyRate}%</span>
                  </div>
                  {result.levyRate > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold mb-1">Rate Schedule:</p>
                      <p>• 2025-2026: 4%</p>
                      <p>• 2027-2029: 3%</p>
                      <p>• 2030 onwards: 2%</p>
                    </div>
                  )}
                </div>
              )}
              {result.assessableProfit !== undefined && result.levyRate !== undefined && result.levyRate > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Assessable Profit:</span>
                      <span className="font-medium">₦{(result.assessableProfit || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Development Levy Rate:</span>
                      <span className="font-medium">{result.levyRate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                      <span className="font-semibold">Annual Development Levy:</span>
                      <span className="font-bold text-lg text-primary">₦{(result.annualTax || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
              {result.isSmallCompany && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded">
                  <p className="text-xs text-green-800 dark:text-green-200 font-medium">
                    ✅ Small Company Exemption: You are exempt from Development Levy (turnover ≤ ₦100M and assets ≤ ₦250M)
                  </p>
                </div>
              )}
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                  ⚠️ Important: Development Levy cannot be used as a deduction against CIT. It is calculated and paid separately.
                </p>
              </div>
            </>
          )}
          
          {result.calculationType === "withholding-tax" && (
            <>
              {result.turnover !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Annual Turnover {result.period && result.period !== "yearly" ? `(${result.period} input annualized)` : ""}
                    {result.period && result.period !== "yearly" && result.originalInputTurnover !== undefined && (
                      <span className="text-xs block text-muted-foreground mt-1">
                        Input: ₦{(result.originalInputTurnover || 0).toLocaleString()} × {result.period === "monthly" ? "12" : "4"} = ₦{(result.turnover || 0).toLocaleString()}
                      </span>
                    )}
                  </span>
                  <span className="font-medium">₦{(result.turnover || 0).toLocaleString()}</span>
                </div>
              )}
              {result.isSmallCompany !== undefined && (
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Company Status</span>
                  <span className="font-medium">{result.isSmallCompany ? "Small Company (Exempt)" : "Large Corporation"}</span>
                </div>
              )}
              {result.paymentsMadeBreakdown && result.paymentsMadeBreakdown.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3 font-semibold">Payments Made (WHT Deducted):</p>
                  {result.paymentsMadeBreakdown.map((payment: any, index: number) => (
                    <div key={index} className="mb-3 p-2 bg-muted/30 rounded border border-border">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{payment.paymentType}</span>
                        {payment.isSmallCompany && (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">(Recipient Small Company - Exempt)</span>
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Gross Payment:</span>
                          <span className="font-medium">₦{(payment.grossAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">WHT Rate:</span>
                          <span className="font-medium">
                            {payment.rate}%
                            {payment.isSmallCompany && payment.baseRate !== undefined && payment.baseRate > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">(Standard: {payment.baseRate}%)</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">WHT Amount:</span>
                          <span className="font-medium text-primary">₦{(payment.whtAmount || 0).toLocaleString()}</span>
                        </div>
                        {payment.isSmallCompany && (
                          <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                            ✓ Recipient is Small Company - Exempt from WHT
                          </div>
                        )}
                        {payment.hasTIN === false && !payment.isSmallCompany && payment.rate > 0 && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            ⚠️ No TIN - Double rate applied ({payment.rate}%)
                          </div>
                        )}
                        {payment.hasTIN === false && !payment.isSmallCompany && payment.rate === 0 && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            Note: No TIN penalty not applicable (rate is 0%)
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-border/50 mt-1">
                          <span className="text-muted-foreground">Net Payment (after WHT):</span>
                          <span className="font-semibold">₦{(payment.netPayment || 0).toLocaleString()}</span>
                        </div>
                        {payment.whtAmount > 0 && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            Calculation: ₦{(payment.grossAmount || 0).toLocaleString()} × {payment.rate}% = ₦{(payment.whtAmount || 0).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm pt-3 border-t-2 border-primary/30 mt-3">
                    <span className="font-semibold">Total WHT to Remit:</span>
                    <span className="font-bold text-lg text-primary">₦{(result.totalWHTOnPayments || 0).toLocaleString()}</span>
                  </div>
                  {result.paymentsMadeBreakdown.length > 1 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Total of {result.paymentsMadeBreakdown.length} payment{result.paymentsMadeBreakdown.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
              
              {/* Income Received Section - For CIT Credit */}
              {result.incomeReceivedBreakdown && result.incomeReceivedBreakdown.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1 font-semibold">Income Received (WHT Deducted):</p>
                    <p className="text-xs text-muted-foreground italic">
                      ℹ️ WHT deducted from your income can be claimed as credit against CIT, but does NOT reduce your WHT remittance obligation
                    </p>
                  </div>
                  {result.incomeReceivedBreakdown.map((income: any, index: number) => (
                    <div key={index} className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/10 rounded border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{income.paymentType}</span>
                        {result.isSmallCompany && (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">(You are Small Company - Exempt)</span>
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Gross Income:</span>
                          <span className="font-medium">₦{(income.grossAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">WHT Rate:</span>
                          <span className="font-medium">
                            {income.rate}%
                            {result.isSmallCompany && income.rate === 0 && (
                              <span className="text-xs text-muted-foreground ml-1">(You are exempt)</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">WHT Deducted:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">₦{(income.whtAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/50 mt-1">
                          <span className="text-muted-foreground">Net Income Received:</span>
                          <span className="font-semibold">₦{(income.netAmount || 0).toLocaleString()}</span>
                        </div>
                        {income.whtAmount > 0 && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            Calculation: ₦{(income.grossAmount || 0).toLocaleString()} × {income.rate}% = ₦{(income.whtAmount || 0).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm pt-3 border-t-2 border-blue-300 dark:border-blue-700 mt-3 bg-blue-50 dark:bg-blue-900/10 p-2 rounded">
                    <div>
                      <span className="font-semibold text-blue-700 dark:text-blue-300">Total WHT Credit Available:</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Can be claimed as credit against CIT when filing annual returns
                      </p>
                    </div>
                    <span className="font-bold text-lg text-blue-600 dark:text-blue-400">₦{(result.totalWHTOnIncome || 0).toLocaleString()}</span>
                  </div>
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded">
                    <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                      ⚠️ Important: WHT on income received does NOT reduce your WHT remittance obligation above. 
                      You must still remit ₦{(result.totalWHTOnPayments || 0).toLocaleString()} regardless of WHT deducted from your income.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
          
          {result.calculationType === "vat" && (
            <>
              {result.turnover !== undefined && (
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">
                    Annual Turnover {result.period && result.period !== "yearly" ? `(${result.period} input annualized for exemption check)` : "(for exemption check)"}
                  </span>
                  <span className="font-medium">₦{(result.turnover || 0).toLocaleString()}</span>
                </div>
              )}
              {result.isSmallCompany !== undefined && (
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Company Status</span>
                  <span className="font-medium">{result.isSmallCompany ? "Small Company (Exempt)" : "VAT Registered"}</span>
                </div>
              )}
              
              {/* Supplies Breakdown */}
              {result.supplies && result.supplies.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2 font-semibold">Supplies Breakdown:</p>
                  {result.supplies.map((supply: any, index: number) => (
                    <div key={index} className="mb-2 p-2 bg-muted/30 rounded border border-border">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{supply.description}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          supply.status === "taxable" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" :
                          supply.status === "exempt" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" :
                          "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                        }`}>
                          {supply.status === "taxable" ? "Taxable (7.5%)" : supply.status === "exempt" ? "Exempt" : "Zero-Rated"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium">₦{(supply.amount || 0).toLocaleString()}</span>
                      </div>
                      {supply.vatAmount > 0 && (
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-muted-foreground">VAT:</span>
                          <span className="font-medium text-primary">₦{(supply.vatAmount || 0).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Taxable</p>
                      <p className="font-semibold text-sm">₦{(result.taxableSupplies || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Exempt</p>
                      <p className="font-semibold text-sm">₦{(result.exemptSupplies || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Zero-Rated</p>
                      <p className="font-semibold text-sm">₦{(result.zeroRatedSupplies || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Output VAT */}
              {result.outputVat !== undefined && (
                <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-border">
                  <span className="text-muted-foreground">Output VAT (7.5% on taxable supplies):</span>
                  <span className="font-medium">₦{(result.outputVat || 0).toLocaleString()}</span>
                </div>
              )}
              
              {/* Input VAT Breakdown */}
              {result.inputVATEntries && result.inputVATEntries.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2 font-semibold">Input VAT Breakdown:</p>
                  {result.inputVATEntries.map((entry: any, index: number) => (
                    <div key={index} className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{entry.description} {entry.eligibleForCredit ? '(Eligible)' : '(Not Eligible)'}</span>
                      <span className="font-medium">₦{(entry.amount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-border/50">
                    <span className="text-muted-foreground">Total Input VAT:</span>
                    <span className="font-medium">₦{(result.inputTax || 0).toLocaleString()}</span>
                  </div>
                  {result.eligibleInputVAT !== undefined && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Eligible Input VAT (Credit):</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-₦{(result.eligibleInputVAT || 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Net VAT Calculation */}
              {result.outputVat !== undefined && result.eligibleInputVAT !== undefined && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Output VAT:</span>
                      <span className="font-medium">₦{(result.outputVat || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Less: Eligible Input VAT:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-₦{(result.eligibleInputVAT || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                      <span className="font-semibold">Net VAT Payable:</span>
                      <span className="font-bold text-lg text-primary">₦{(result.totalTax || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Net VAT (fallback if calculation section isn't shown) */}
              {(!result.outputVat || result.eligibleInputVAT === undefined) && (
                <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t-2 border-primary/30">
                  <span className="font-semibold">Net VAT Payable:</span>
                  <span className="font-bold text-lg text-primary">₦{(result.totalTax || 0).toLocaleString()}</span>
                </div>
              )}
              
              {result.annualNetVATProjection !== undefined && result.period !== "yearly" && (
                <div className="flex items-center justify-between text-xs mt-2 text-muted-foreground">
                  <span>Annual Projection:</span>
                  <span>₦{(result.annualNetVATProjection || 0).toLocaleString()}</span>
                </div>
              )}
            </>
          )}
          
          {/* Standard tax brackets for PAYE */}
          {result.taxableIncome !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxable Income</span>
              <span className="font-medium">₦{(result.taxableIncome || 0).toLocaleString()}</span>
            </div>
          )}
          {result.taxBrackets && result.taxBrackets.length > 0 && result.taxBrackets.map((bracket: any, index: number) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {bracket.rate === 0 ? "Tax-free" : `${bracket.rate}% on`} ₦{(bracket.amount || 0).toLocaleString()}
              </span>
              <span className="font-medium">{bracket.rate === 0 ? "₦0" : `₦${(bracket.tax || 0).toLocaleString()}`}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 border-t-2 border-primary/20">
            <span className="font-semibold text-base">Total Tax Payable</span>
            <span className="font-bold text-xl text-primary">₦{(result.totalTax || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Quarterly Breakdown - Only show if quarterly payments exist */}
      {result.quarterlyPayments && result.quarterlyPayments.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-sm mb-3">Quarterly Payment Schedule</h3>
          <div className="grid grid-cols-2 gap-3">
            {result.quarterlyPayments.map((payment: any, index: number) => (
              <div key={index} className="bg-background rounded p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{payment.quarter}</p>
                <p className="font-semibold">₦{(payment.amount || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-border">
        <Button variant="outline" className="flex-1 bg-transparent">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
        <Button className="flex-1">
          <FileText className="w-4 h-4 mr-2" />
          Save Calculation
        </Button>
      </div>
    </>
  )
}

