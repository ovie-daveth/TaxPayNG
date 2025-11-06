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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Annual Turnover</span>
                  <span className="font-medium">₦{(result.turnover || 0).toLocaleString()}</span>
                </div>
              )}
              {result.totalFixedAssets !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Fixed Assets</span>
                  <span className="font-medium">₦{(result.totalFixedAssets || 0).toLocaleString()}</span>
                </div>
              )}
              {result.assessableProfit !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Assessable Profit</span>
                  <span className="font-medium">₦{(result.assessableProfit || 0).toLocaleString()}</span>
                </div>
              )}
              {result.isSmallCompany !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Company Status</span>
                  <span className="font-medium">{result.isSmallCompany ? "Small Company (Exempt)" : "Large Corporation"}</span>
                </div>
              )}
              {result.citRate !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">CIT Rate</span>
                  <span className="font-medium">{result.citRate}%</span>
                </div>
              )}
            </>
          )}
          
          {result.calculationType === "development-levy" && (
            <>
              {result.turnover !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Annual Turnover</span>
                  <span className="font-medium">₦{(result.turnover || 0).toLocaleString()}</span>
                </div>
              )}
              {result.assessableProfit !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Assessable Profit</span>
                  <span className="font-medium">₦{(result.assessableProfit || 0).toLocaleString()}</span>
                </div>
              )}
              {result.levyRate !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Development Levy Rate</span>
                  <span className="font-medium">{result.levyRate}%</span>
                </div>
              )}
            </>
          )}
          
          {result.calculationType === "withholding-tax" && (
            <>
              {result.turnover !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Annual Turnover</span>
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
                  <p className="text-xs text-muted-foreground mb-2">Payments Made (WHT Deducted):</p>
                  {result.paymentsMadeBreakdown.map((payment: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        {payment.paymentType} ({payment.rate}%)
                      </span>
                      <span className="font-medium">₦{(payment.whtAmount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-border mt-2">
                    <span className="font-medium">Total WHT to Remit</span>
                    <span className="font-semibold">₦{(result.totalWHTOnPayments || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </>
          )}
          
          {result.calculationType === "vat" && (
            <>
              {result.turnover !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Annual Turnover</span>
                  <span className="font-medium">₦{(result.turnover || 0).toLocaleString()}</span>
                </div>
              )}
              {result.taxableSupplies !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Taxable Supplies</span>
                  <span className="font-medium">₦{(result.taxableSupplies || 0).toLocaleString()}</span>
                </div>
              )}
              {result.inputTax !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Input Tax Credit</span>
                  <span className="font-medium text-green-600">-₦{(result.inputTax || 0).toLocaleString()}</span>
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

