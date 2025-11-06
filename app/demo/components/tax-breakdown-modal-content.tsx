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
              {result.assessableProfit !== undefined && (
                <div className="flex items-center justify-between text-sm">
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
              {result.assessableProfit !== undefined && (
                <div className="flex items-center justify-between text-sm">
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Annual Turnover {result.period && result.period !== "yearly" ? `(${result.period} input annualized for exemption check)` : "(for exemption check)"}
                  </span>
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

