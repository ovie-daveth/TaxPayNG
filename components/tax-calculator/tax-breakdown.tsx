import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, FileText, Wallet } from "lucide-react"
import { formatCurrencyAmount } from "@/lib/utils/currency"

interface TaxBreakdownProps {
  result: any
}

export function TaxBreakdown({ result }: TaxBreakdownProps) {
  // Determine the period - all calculations are done in annual amounts
  const period = result.period || "yearly"
  const isAnnual = period === "yearly"
  
  // Helper to format with period label
  const formatWithPeriod = (amount: number, showPeriod: boolean = true) => {
    const formatted = `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    return showPeriod ? `${formatted} ${isAnnual ? "(Annual)" : "(Monthly)"}` : formatted
  }

  // Calculate monthly equivalents for annual amounts
  const getMonthlyEquivalent = (annualAmount: number) => {
    return annualAmount / 12
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Tax Breakdown</h2>
          <p className="text-sm text-muted-foreground mt-1">
            All amounts shown are annual. Monthly equivalents are provided where applicable.
          </p>
        </div>
        <Badge variant="secondary">2025</Badge>
      </div>

      <div className="space-y-4">
        {/* Monthly Set-Aside Card */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border-2 border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Monthly Set-Aside</h3>
          </div>
          <p className="text-2xl font-bold text-primary">₦{result.monthlySetAside.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Save this amount each month for tax payments
            <span className="block mt-1 text-[10px]">
              (Annual tax: ₦{result.totalTax.toLocaleString()})
            </span>
          </p>
        </div>

        {/* Income Section */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">Income (Annual)</h3>
          <div className="space-y-2">
            {/* Income Breakdown by Source */}
            {result.incomeBreakdown && result.incomeBreakdown.length > 0 && (
              <div className="mb-3 pb-3 border-b border-border">
                <p className="text-xs text-muted-foreground mb-2">Income Sources (Annual):</p>
                <div className="space-y-1.5">
                  {result.incomeBreakdown.map((source: any, index: number) => {
                    // Get readable label for income type
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
                    const hasCurrencyConversion = source.originalCurrency && source.originalCurrency !== "NGN"
                    const monthlyAmount = getMonthlyEquivalent(source.amount)
                    
                    return (
                      <div key={index} className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {typeLabel}
                          </span>
                          <div className="flex flex-col items-end">
                            <span className="font-medium">₦{source.amount.toLocaleString()} (Annual)</span>
                            <span className="text-muted-foreground text-[10px]">
                              ≈ ₦{monthlyAmount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                            </span>
                            {hasCurrencyConversion && source.originalAmount && (
                              <span className="text-muted-foreground text-[10px]">
                                {formatCurrencyAmount(source.originalAmount, source.originalCurrency)} converted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gross Income (Annual)</span>
              <div className="flex flex-col items-end">
                <span className="font-medium">₦{result.grossIncome.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  ≈ ₦{getMonthlyEquivalent(result.grossIncome).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                </span>
              </div>
            </div>
            {result.businessExpenses > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Business Expenses (Annual)</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-red-600">-₦{result.businessExpenses.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.businessExpenses).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="font-medium">Adjusted Gross Income (Annual)</span>
              <div className="flex flex-col items-end">
                <span className="font-semibold">₦{result.adjustedGrossIncome.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  ≈ ₦{getMonthlyEquivalent(result.adjustedGrossIncome).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reliefs & Deductions */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">Tax Reliefs & Deductions (Annual)</h3>
          <div className="space-y-2">
            {result.reliefs.rentRelief > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rent Relief (20%)</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.rentRelief.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.rentRelief).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            {result.reliefs.pension > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pension Contribution</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.pension.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.pension).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            {result.reliefs.healthInsurance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Health Insurance</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.healthInsurance.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.healthInsurance).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            {result.reliefs.housingFund > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">National Housing Fund (NHF)</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.housingFund.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.housingFund).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            {result.reliefs.transportAllowance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Transport Allowance Exemption</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.transportAllowance.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.transportAllowance).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            {result.reliefs.lifeInsurance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Life Insurance</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.lifeInsurance.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.lifeInsurance).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            {result.reliefs.charitable > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Charitable Donations</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.charitable.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.charitable).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="font-medium">Total Reliefs (Annual)</span>
              <div className="flex flex-col items-end">
                <span className="font-semibold text-green-600">-₦{result.totalReliefs.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  ≈ -₦{getMonthlyEquivalent(result.totalReliefs).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Calculation */}
        <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary/20">
          <h3 className="font-semibold text-sm mb-3">Tax Calculation</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxable Income (Annual)</span>
              <div className="flex flex-col items-end">
                <span className="font-medium">₦{result.taxableIncome.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  ≈ ₦{getMonthlyEquivalent(result.taxableIncome).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                </span>
              </div>
            </div>
            {result.taxBrackets.map((bracket: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {bracket.rate === 0 ? "Tax-free" : `${bracket.rate}% on`} ₦{bracket.amount.toLocaleString()} (Annual)
                </span>
                <span className="font-medium">{bracket.rate === 0 ? "₦0" : `₦${bracket.tax.toLocaleString()}`}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t-2 border-primary/20">
              <div className="flex flex-col">
                <span className="font-semibold text-base">Total Tax Payable (Annual)</span>
                <span className="text-xs text-muted-foreground">≈ ₦{result.monthlySetAside.toLocaleString()}/month</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-xl text-primary">₦{result.totalTax.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  Monthly: ₦{result.monthlySetAside.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quarterly Breakdown */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">Quarterly Payment Schedule (Annual Total: ₦{result.totalTax.toLocaleString()})</h3>
          <div className="grid grid-cols-2 gap-3">
            {result.quarterlyPayments.map((payment: any, index: number) => (
              <div key={index} className="bg-background rounded p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{payment.quarter}</p>
                <p className="font-semibold">₦{payment.amount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Quarterly payment</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            💡 Each quarterly payment is 25% of your annual tax (₦{result.totalTax.toLocaleString()})
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-6 border-t border-border">
        <Button variant="outline" className="flex-1 bg-transparent">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
        <Button className="flex-1">
          <FileText className="w-4 h-4 mr-2" />
          Save Calculation
        </Button>
      </div>
    </Card>
  )
}
