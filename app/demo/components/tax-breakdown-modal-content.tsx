import { Button } from "@/components/ui/button"
import { Wallet, Download, FileText } from "lucide-react"
import { getCurrencySymbol } from "@/lib/utils/currency"

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

      {/* Freelancer/Self-Employed Detailed Breakdown */}
      {!isBusinessTax && (result.businessType === "freelancer" || result.businessType === "creator" || result.businessType === "employee") && result.grossIncome !== undefined && (
        <>
          {/* Step 1: Income Breakdown */}
          <div className="mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-sm mb-3 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <span className="text-lg">📊</span>
                Step 1: Add Up All Income for the Year
              </h4>
              <p className="text-xs text-blue-800 dark:text-blue-200 mb-3">
                As a freelancer/self-employed person, you must include all income from all clients (local or overseas) for the year.
              </p>
              <div className="space-y-2 text-sm">
                {/* Income Breakdown by Source with Calculation */}
                {result.incomeBreakdown && result.incomeBreakdown.length > 0 && (
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded border border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-gray-700 dark:text-gray-200 mb-2 font-medium">Income Sources Calculation:</p>
                    <div className="space-y-2">
                      {result.incomeBreakdown.map((source: any, index: number) => {
                        const allTypes = [
                          { value: "salary", label: "Salary (PAYE)" },
                          { value: "bonus", label: "Bonus" },
                          { value: "allowance", label: "Allowances" },
                          { value: "freelance", label: "Freelance Work" },
                          { value: "consulting", label: "Consulting" },
                          { value: "contract", label: "Contract Work" },
                          { value: "retainer", label: "Retainer Fees" },
                          { value: "platform_income", label: "Platform Income" },
                          { value: "remote_work", label: "Remote Work" },
                          { value: "project_based", label: "Project-Based" },
                          { value: "hourly_work", label: "Hourly Work" },
                          { value: "service_fees", label: "Service Fees" },
                          { value: "commission", label: "Commission" },
                          { value: "design_services", label: "Design Services" },
                          { value: "development_services", label: "Development Services" },
                          { value: "writing_editing", label: "Writing/Editing" },
                          { value: "translation", label: "Translation" },
                          { value: "virtual_assistant", label: "Virtual Assistant" },
                          { value: "online_tutoring", label: "Online Tutoring" },
                          { value: "training_workshops", label: "Training/Workshops" },
                          { value: "digital_products", label: "Digital Products" },
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
                        const annualizedAmount = source.amount || 0
                        const originalAmount = source.originalAmount || annualizedAmount
                        const multiplier = result.period === "monthly" ? 12 : result.period === "quarterly" ? 4 : 1
                        const needsAnnualization = result.period === "monthly" || result.period === "quarterly"
                        const currencySymbol = source.originalCurrency && source.originalCurrency !== "NGN" ? getCurrencySymbol(source.originalCurrency) : "₦"
                        
                        return (
                          <div key={index} className="pb-2 border-b border-blue-100 dark:border-blue-900/50 last:border-0">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-700 dark:text-gray-200 font-medium">{typeLabel}:</span>
                              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                                ₦{annualizedAmount.toLocaleString()}
                              </span>
                            </div>
                            {needsAnnualization && originalAmount !== annualizedAmount && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono ml-2">
                                = {currencySymbol}{originalAmount.toLocaleString()} ({result.period === "monthly" ? "monthly" : "quarterly"}) × {multiplier} = ₦{annualizedAmount.toLocaleString()}
                              </p>
                            )}
                            {!needsAnnualization && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono ml-2">
                                = {currencySymbol}{originalAmount.toLocaleString()} (annual)
                              </p>
                            )}
                            {source.originalCurrency && source.originalCurrency !== "NGN" && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                Converted from {source.originalCurrency}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t-2 border-blue-300 dark:border-blue-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-900 dark:text-blue-100 font-semibold">Total Gross Income:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      ₦{(result.grossIncome || 0).toLocaleString()}
                    </span>
                  </div>
                  {result.incomeBreakdown && result.incomeBreakdown.length > 1 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                      = {result.incomeBreakdown.map((s: any) => `₦${(s.amount || 0).toLocaleString()}`).join(" + ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Business Expenses */}
          {result.businessExpenses > 0 && (
            <div className="mb-4">
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-4 rounded-lg border-2 border-orange-200 dark:border-orange-800">
                <h4 className="font-semibold text-sm mb-3 text-orange-900 dark:text-orange-100 flex items-center gap-2">
                  <span className="text-lg">💼</span>
                  Step 2: Subtract Allowable Business Expenses
                </h4>
                <p className="text-xs text-orange-800 dark:text-orange-200 mb-3">
                  Allowable expenses are costs that are <strong>wholly, exclusively, and necessarily</strong> incurred in producing your income.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded border border-orange-200 dark:border-orange-700">
                    <p className="text-xs text-gray-700 dark:text-gray-200 mb-2 font-medium">Examples of allowable expenses:</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
                      <li>Internet/data costs</li>
                      <li>Software subscriptions and licenses</li>
                      <li>Laptop, computer equipment, and tools</li>
                      <li>Co-working space rent</li>
                      <li>Transport to client meetings</li>
                      <li>Professional fees (accountants, lawyers)</li>
                      <li>Marketing and promotion costs</li>
                      <li>Training and professional development</li>
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-orange-200 dark:border-orange-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-300">Gross Income:</span>
                      <span className="font-mono">₦{(result.grossIncome || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-300">Less: Business Expenses:</span>
                      <span className="font-mono text-red-600 dark:text-red-400">-₦{(result.businessExpenses || 0).toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t-2 border-orange-300 dark:border-orange-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-orange-900 dark:text-orange-100 font-semibold">Adjusted Gross Income:</span>
                        <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                          ₦{(result.adjustedGrossIncome || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                        = ₦{(result.grossIncome || 0).toLocaleString()} - ₦{(result.businessExpenses || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Reliefs & Deductions */}
          {result.reliefs && result.totalReliefs > 0 && (
            <div className="mb-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-sm mb-3 text-green-900 dark:text-green-100 flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  Step 3: Apply Tax Reliefs & Deductions
                </h4>
                <p className="text-xs text-green-800 dark:text-green-200 mb-3">
                  Even as self-employed, you may claim certain reliefs depending on your status and whether you've opted into certain schemes.
                </p>
                <div className="space-y-2 text-sm">
                  {result.reliefs.rentRelief > 0 && (
                    <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Rent Relief:</span>
                        <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                          -₦{(result.reliefs.rentRelief || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">20% of rent paid, capped at ₦500,000/year</p>
                    </div>
                  )}
                  {result.reliefs.pension > 0 && (
                    <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Pension Contribution:</span>
                        <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                          -₦{(result.reliefs.pension || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Up to 8% of gross income</p>
                    </div>
                  )}
                  {result.reliefs.healthInsurance > 0 && (
                    <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Health Insurance (NHIS):</span>
                        <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                          -₦{(result.reliefs.healthInsurance || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Full deduction</p>
                    </div>
                  )}
                  {result.reliefs.housingFund > 0 && (
                    <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">National Housing Fund (NHF):</span>
                        <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                          -₦{(result.reliefs.housingFund || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Full deduction</p>
                    </div>
                  )}
                  {result.reliefs.lifeInsurance > 0 && (
                    <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Life Insurance:</span>
                        <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                          -₦{(result.reliefs.lifeInsurance || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Full deduction</p>
                    </div>
                  )}
                  {result.reliefs.charitable > 0 && (
                    <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Charitable Donations:</span>
                        <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                          -₦{(result.reliefs.charitable || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Up to 10% of gross income</p>
                    </div>
                  )}
                  {result.reliefs.transportAllowance > 0 && (
                    <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-700 dark:text-gray-200 font-medium">Transport Allowance Exemption:</span>
                        <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                          -₦{(result.reliefs.transportAllowance || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Up to ₦30,000/month (₦360,000/year) exempt</p>
                    </div>
                  )}
                  <div className="pt-2 border-t-2 border-green-300 dark:border-green-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-900 dark:text-green-100 font-semibold">Total Reliefs:</span>
                      <span className="font-mono font-bold text-green-600 dark:text-green-400">
                        -₦{(result.totalReliefs || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Calculate Taxable Income */}
          {result.taxableIncome !== undefined && (
            <div className="mb-4">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                <h4 className="font-semibold text-sm mb-3 text-purple-900 dark:text-purple-100 flex items-center gap-2">
                  <span className="text-lg">📈</span>
                  Step 4: Calculate Taxable Income
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded border border-purple-200 dark:border-purple-700">
                    <p className="text-xs text-gray-700 dark:text-gray-200 mb-2 font-medium">Formula:</p>
                    <p className="text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded border border-purple-200 dark:border-purple-700">
                      Taxable Income = Adjusted Gross Income - Total Reliefs
                    </p>
                    <div className="pt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-300">Adjusted Gross Income:</span>
                        <span className="font-mono">₦{(result.adjustedGrossIncome || result.grossIncome || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-300">Less: Total Reliefs:</span>
                        <span className="font-mono text-green-600 dark:text-green-400">-₦{(result.totalReliefs || 0).toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-purple-900 dark:text-purple-100 font-semibold">Taxable Income:</span>
                          <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                            ₦{(result.taxableIncome || 0).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                          = ₦{(result.adjustedGrossIncome || result.grossIncome || 0).toLocaleString()} - ₦{(result.totalReliefs || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Progressive Tax Brackets */}
          {result.taxBrackets && result.taxBrackets.length > 0 && (
            <div className="mb-4">
              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 p-4 rounded-lg border-2 border-indigo-200 dark:border-indigo-800">
                <h4 className="font-semibold text-sm mb-3 text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  Step 5: Apply Progressive PIT Rate Schedule
                </h4>
                <p className="text-xs text-indigo-800 dark:text-indigo-200 mb-3">
                  Nigerian tax law applies progressive rates to your taxable income. The first ₦800,000 is tax-free, then rates increase progressively.
                </p>
                <div className="space-y-3 text-sm">
                  <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded border border-indigo-200 dark:border-indigo-700">
                    <p className="text-xs text-gray-700 dark:text-gray-200 mb-2 font-medium">Tax Brackets:</p>
                    <div className="space-y-2">
                      {result.taxBrackets.map((bracket: any, index: number) => (
                        <div key={index} className="flex items-center justify-between text-xs py-1 border-b border-indigo-100 dark:border-indigo-900/50 last:border-0">
                          <span className="text-gray-600 dark:text-gray-300">
                            {bracket.rate === 0 ? (
                              <span className="text-green-600 dark:text-green-400 font-semibold">Tax-free</span>
                            ) : (
                              `${bracket.rate}% on`
                            )}{" "}
                            ₦{(bracket.amount || 0).toLocaleString()}
                          </span>
                          <div className="flex items-center gap-2">
                            {bracket.rate > 0 && (
                              <span className="text-gray-500 dark:text-gray-400 text-xs font-mono">
                                = ₦{(bracket.amount || 0).toLocaleString()} × {bracket.rate}%
                              </span>
                            )}
                            <span className={`font-mono font-semibold ${bracket.rate === 0 ? 'text-green-600 dark:text-green-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                              {bracket.rate === 0 ? "₦0" : `₦${(bracket.tax || 0).toLocaleString()}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t-2 border-indigo-300 dark:border-indigo-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-indigo-900 dark:text-indigo-100 font-semibold">Total Tax Payable:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-base">
                        ₦{(result.totalTax || 0).toLocaleString()}
                      </span>
                    </div>
                    {result.effectiveRate && (
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                        Effective Tax Rate: {result.effectiveRate}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Legacy Income Section - Only show for non-business tax types that aren't freelancer/creator/employee */}
      {!isBusinessTax && result.businessType !== "freelancer" && result.businessType !== "creator" && result.businessType !== "employee" && result.grossIncome !== undefined && (
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

      {/* Legacy Reliefs & Deductions - Only show for non-business tax types that aren't freelancer/creator/employee */}
      {!isBusinessTax && result.businessType !== "freelancer" && result.businessType !== "creator" && result.businessType !== "employee" && result.reliefs && (
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
                  <p className="text-xs text-muted-foreground mb-3 italic">
                    These expenses reduce Revenue to calculate Profit Before Tax. They are also allowable deductions for CIT purposes.
                  </p>
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
                  {result.revenue !== undefined && result.totalOperatingExpenses !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      = Revenue (₦{(result.revenue || 0).toLocaleString()}) - COGS (₦{(result.costOfGoodsSold || 0).toLocaleString()}) - Operating Expenses (₦{(result.totalOperatingExpenses || 0).toLocaleString()})
                    </p>
                  )}
                </div>
              )}
              
              {/* Note: Operating Expenses are already shown above, so we don't show deductionsBreakdown separately */}
              {/* The operating expenses ARE the allowable deductions (excluding COGS which is not deductible) */}
              
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
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mb-2">
                    <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                      <strong>Note:</strong> Operating expenses (shown above) are allowable deductions for CIT. 
                      They are deducted from Profit Before Tax along with Capital Allowances to calculate Taxable Profit.
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      Total deductions = Operating Expenses (excluding COGS) + Capital Allowances
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Allowable Deductions:</span>
                    <span className="font-medium">₦{((result.totalDeductions || 0) + (result.capitalAllowancesTotal || 0)).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    = Operating Expenses (₦{(result.totalDeductions || 0).toLocaleString()}) + Capital Allowances (₦{(result.capitalAllowancesTotal || 0).toLocaleString()})
                  </p>
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
                      <span className="text-muted-foreground">Less: Operating Expenses (Allowable Deductions):</span>
                      <span className="font-medium text-green-600">-₦{(result.totalDeductions || 0).toLocaleString()}</span>
                    </div>
                    {result.capitalAllowancesTotal !== undefined && result.capitalAllowancesTotal > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Less: Capital Allowances:</span>
                        <span className="font-medium text-green-600">-₦{(result.capitalAllowancesTotal || 0).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                      <span className="font-semibold">Taxable Profit:</span>
                      <span className="font-bold text-lg text-primary">₦{(result.taxableProfit || 0).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      = Profit Before Tax - Operating Expenses - Capital Allowances
                    </p>
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
              
              {/* Large Multinational ETR Rule Explanation */}
              {result.isLargeMultinational && result.assessableProfit !== undefined && result.assessableProfit > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-sm mb-4 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <span className="text-lg">📊</span>
                      15% Effective Tax Rate (ETR) Rule for Large Multinationals
                    </h4>
                    <p className="text-xs text-blue-800 dark:text-blue-200 mb-4">
                      Companies with turnover ≥ ₦50 billion must maintain a minimum Effective Tax Rate of 15% of Profit Before Tax.
                    </p>
                    
                    <div className="space-y-4 text-sm">
                      {/* Step 1: Normal CIT Calculation */}
                      <div className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-700 shadow-sm">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                          Normal CIT Calculation (30% of Taxable Profit)
                        </p>
                        <div className="space-y-2 ml-8">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-300">Taxable Profit:</span>
                            <span className="font-mono font-semibold">₦{(result.taxableProfit || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-300">CIT Rate:</span>
                            <span className="font-mono font-semibold">30%</span>
                          </div>
                          <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-900 dark:text-gray-100 font-semibold">Normal CIT:</span>
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                ₦{((result.annualTax || 0) - (result.topUpTax || 0)).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                              = ₦{(result.taxableProfit || 0).toLocaleString()} × 30%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Step 2: ETR Calculation */}
                      <div className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-700 shadow-sm">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                          Calculate Effective Tax Rate (ETR)
                        </p>
                        <div className="space-y-2 ml-8">
                          <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">Formula:</p>
                          <p className="text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded border border-blue-200 dark:border-blue-700">
                            ETR = (Company Income Tax Paid ÷ Profit Before Tax) × 100
                          </p>
                          <div className="pt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-300">Normal CIT Paid:</span>
                              <span className="font-mono">₦{((result.annualTax || 0) - (result.topUpTax || 0)).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-300">Profit Before Tax:</span>
                              <span className="font-mono">₦{(result.assessableProfit || 0).toLocaleString()}</span>
                            </div>
                            <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-900 dark:text-gray-100 font-semibold">Your ETR (Before Top-Up):</span>
                                <span className={`font-mono font-bold ${((result.originalETR !== undefined ? result.originalETR : result.effectiveTaxRate) || 0) < 15 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                                  {((result.originalETR !== undefined ? result.originalETR : result.effectiveTaxRate) || 0).toFixed(2)}%
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                                = (₦{((result.annualTax || 0) - (result.topUpTax || 0)).toLocaleString()} ÷ ₦{(result.assessableProfit || 0).toLocaleString()}) × 100
                              </p>
                              {result.topUpTax !== undefined && result.topUpTax > 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-semibold">
                                  ⚠️ This ETR ({result.originalETR?.toFixed(2)}%) is below the 15% minimum requirement
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 3: Minimum Tax Requirement */}
                      <div className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-lg border-2 border-blue-300 dark:border-blue-700 shadow-sm">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                          Minimum Tax Requirement (15% of Profit Before Tax)
                        </p>
                        <div className="space-y-2 ml-8">
                          <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">Formula:</p>
                          <p className="text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded border border-blue-200 dark:border-blue-700">
                            Minimum Tax = 15% × Profit Before Tax
                          </p>
                          <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-900 dark:text-gray-100 font-semibold">Minimum Tax Required:</span>
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                ₦{((result.assessableProfit || 0) * 0.15).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                              = 15% × ₦{(result.assessableProfit || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Step 4: Top-Up Tax Calculation (if applicable) */}
                      {result.topUpTax !== undefined && result.topUpTax > 0 ? (
                        <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg border-2 border-amber-400 dark:border-amber-600 shadow-sm">
                          <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">4</span>
                            ⚠️ Top-Up Tax Calculation (ETR Below 15%)
                          </p>
                          <div className="space-y-2 ml-8">
                            <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                              Since your ETR ({result.originalETR?.toFixed(2)}%) is below the 15% minimum, a top-up tax is required.
                            </p>
                            <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded border border-amber-300 dark:border-amber-700">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-amber-900 dark:text-amber-100">Minimum Tax Required:</span>
                                  <span className="font-mono font-semibold">₦{((result.assessableProfit || 0) * 0.15).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-amber-900 dark:text-amber-100">Less: Normal CIT Paid:</span>
                                  <span className="font-mono">-₦{((result.annualTax || 0) - (result.topUpTax || 0)).toLocaleString()}</span>
                                </div>
                                <div className="pt-2 border-t-2 border-amber-400 dark:border-amber-600">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-amber-900 dark:text-amber-100 font-bold">Top-Up Tax:</span>
                                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-base">
                                      ₦{(result.topUpTax || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 font-mono">
                                    = ₦{((result.assessableProfit || 0) * 0.15).toLocaleString()} - ₦{((result.annualTax || 0) - (result.topUpTax || 0)).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : result.effectiveTaxRate !== undefined && result.effectiveTaxRate >= 15 ? (
                        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border-2 border-green-400 dark:border-green-600 shadow-sm">
                          <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">✓</span>
                            ✅ ETR Requirement Met - No Top-Up Tax Required
                          </p>
                          <p className="text-xs text-green-800 dark:text-green-200 ml-8">
                            Your ETR ({result.effectiveTaxRate.toFixed(2)}%) meets or exceeds the 15% minimum requirement. 
                            You only pay the normal CIT of ₦{((result.annualTax || 0) - (result.topUpTax || 0)).toLocaleString()}.
                          </p>
                        </div>
                      ) : null}

                      {/* Final Total CIT */}
                      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 p-4 rounded-lg border-2 border-blue-400 dark:border-blue-600 shadow-md">
                        <p className="text-xs font-bold text-blue-900 dark:text-blue-100 mb-3">Final Total CIT Payable</p>
                        <div className="space-y-2 ml-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-700 dark:text-gray-200">Normal CIT:</span>
                            <span className="font-mono">₦{((result.annualTax || 0) - (result.topUpTax || 0)).toLocaleString()}</span>
                          </div>
                          {result.topUpTax !== undefined && result.topUpTax > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-700 dark:text-gray-200">Top-Up Tax:</span>
                              <span className="font-mono text-amber-600 dark:text-amber-400">+₦{(result.topUpTax || 0).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="pt-2 border-t-2 border-blue-400 dark:border-blue-600">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-blue-900 dark:text-blue-100">Total CIT Payable:</span>
                              <span className="text-lg font-bold text-blue-700 dark:text-blue-300 font-mono">
                                ₦{(result.annualTax || 0).toLocaleString()}
                              </span>
                            </div>
                            {result.topUpTax !== undefined && result.topUpTax > 0 && (
                              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 font-mono">
                                = ₦{((result.annualTax || 0) - (result.topUpTax || 0)).toLocaleString()} + ₦{(result.topUpTax || 0).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                    {result.annualTax !== undefined && result.taxableProfit > 0 && !result.isLargeMultinational && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Calculation: ₦{(result.taxableProfit || 0).toLocaleString()} × {result.citRate}% = ₦{(result.annualTax || 0).toLocaleString()}
                      </p>
                    )}
                    {result.isLargeMultinational && result.topUpTax !== undefined && result.topUpTax > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Normal CIT: ₦{(result.taxableProfit || 0).toLocaleString()} × {result.citRate}% = ₦{((result.annualTax || 0) - (result.topUpTax || 0)).toLocaleString()}
                        <br />
                        + Top-Up Tax: ₦{(result.topUpTax || 0).toLocaleString()}
                        <br />
                        = Total CIT: ₦{(result.annualTax || 0).toLocaleString()}
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
          
          {/* PAYE Detailed Explanation */}
          {result.calculationType === "paye" && (
            <>
              {/* Employment Income Breakdown */}
              {(result.salary !== undefined || result.housingAllowance !== undefined || result.bonuses !== undefined) && (
                <div className="mb-4 pt-3 border-t border-border">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-sm mb-3 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                      <span className="text-lg">💼</span>
                      Step 1: Employment Income Breakdown
                    </h4>
                    <div className="space-y-2 text-sm">
                      {result.salary !== undefined && result.salary > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-300">Salary:</span>
                          <span className="font-mono font-semibold">₦{(result.salary || 0).toLocaleString()}</span>
                        </div>
                      )}
                      {result.housingAllowance !== undefined && result.housingAllowance > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-300">Housing Allowance:</span>
                          <span className="font-mono font-semibold">₦{(result.housingAllowance || 0).toLocaleString()}</span>
                        </div>
                      )}
                      {result.bonuses !== undefined && result.bonuses > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-300">Bonuses/Other Income:</span>
                          <span className="font-mono font-semibold">₦{(result.bonuses || 0).toLocaleString()}</span>
                        </div>
                      )}
                      {result.transportAllowance && result.transportAllowance.total > 0 && (
                        <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-300">Transport Allowance:</span>
                            <span className="font-mono">₦{(result.transportAllowance.total || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                      <div className="pt-2 border-t-2 border-blue-300 dark:border-blue-700">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-blue-900 dark:text-blue-100 font-semibold">Gross Income:</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            ₦{(result.grossIncome || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tax Reliefs Detailed Breakdown */}
              {result.reliefs && result.totalReliefs > 0 && (
                <div className="mb-4 pt-3 border-t border-border">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
                    <h4 className="font-semibold text-sm mb-3 text-green-900 dark:text-green-100 flex items-center gap-2">
                      <span className="text-lg">💰</span>
                      Step 2: Tax Reliefs & Deductions
                    </h4>
                    <div className="space-y-2 text-sm">
                      {result.reliefs.rentRelief > 0 && (
                        <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-200 font-medium">Rent Relief:</span>
                            <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                              -₦{(result.reliefs.rentRelief || 0).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            20% of rent paid, capped at ₦500,000/year
                          </p>
                        </div>
                      )}
                      {result.reliefs.pension > 0 && (
                        <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-200 font-medium">Pension Contribution:</span>
                            <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                              -₦{(result.reliefs.pension || 0).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Up to 8% of gross income
                          </p>
                        </div>
                      )}
                      {result.reliefs.healthInsurance > 0 && (
                        <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-200 font-medium">Health Insurance:</span>
                            <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                              -₦{(result.reliefs.healthInsurance || 0).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Full deduction</p>
                        </div>
                      )}
                      {result.reliefs.housingFund > 0 && (
                        <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-200 font-medium">National Housing Fund:</span>
                            <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                              -₦{(result.reliefs.housingFund || 0).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Full deduction</p>
                        </div>
                      )}
                      {result.reliefs.lifeInsurance > 0 && (
                        <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-200 font-medium">Life Insurance:</span>
                            <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                              -₦{(result.reliefs.lifeInsurance || 0).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Full deduction</p>
                        </div>
                      )}
                      {result.reliefs.charitable > 0 && (
                        <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-200 font-medium">Charitable Donations:</span>
                            <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                              -₦{(result.reliefs.charitable || 0).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Up to 10% of gross income</p>
                        </div>
                      )}
                      {result.reliefs.transportAllowance > 0 && (
                        <div className="bg-white/60 dark:bg-gray-800/60 p-2 rounded border border-green-200 dark:border-green-700">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-700 dark:text-gray-200 font-medium">Transport Allowance Exemption:</span>
                            <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                              -₦{(result.reliefs.transportAllowance || 0).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Up to ₦30,000/month (₦360,000/year) exempt</p>
                        </div>
                      )}
                      <div className="pt-2 border-t-2 border-green-300 dark:border-green-700">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-green-900 dark:text-green-100 font-semibold">Total Reliefs:</span>
                          <span className="font-mono font-bold text-green-600 dark:text-green-400">
                            -₦{(result.totalReliefs || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Taxable Income Calculation */}
              {result.taxableIncome !== undefined && (
                <div className="mb-4 pt-3 border-t border-border">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold text-sm mb-3 text-purple-900 dark:text-purple-100 flex items-center gap-2">
                      <span className="text-lg">📊</span>
                      Step 3: Calculate Taxable Income
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded border border-purple-200 dark:border-purple-700">
                        <p className="text-xs text-gray-700 dark:text-gray-200 mb-2 font-medium">Formula:</p>
                        <p className="text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded border border-purple-200 dark:border-purple-700">
                          Taxable Income = Gross Income - Total Reliefs
                        </p>
                        <div className="pt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-300">Gross Income:</span>
                            <span className="font-mono">₦{(result.grossIncome || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-300">Less: Total Reliefs:</span>
                            <span className="font-mono text-green-600 dark:text-green-400">-₦{(result.totalReliefs || 0).toLocaleString()}</span>
                          </div>
                          <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-purple-900 dark:text-purple-100 font-semibold">Taxable Income:</span>
                              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                ₦{(result.taxableIncome || 0).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                              = ₦{(result.grossIncome || 0).toLocaleString()} - ₦{(result.totalReliefs || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Progressive Tax Brackets Calculation */}
              {result.taxBrackets && result.taxBrackets.length > 0 && (
                <div className="mb-4 pt-3 border-t border-border">
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-4 rounded-lg border-2 border-orange-200 dark:border-orange-800">
                    <h4 className="font-semibold text-sm mb-3 text-orange-900 dark:text-orange-100 flex items-center gap-2">
                      <span className="text-lg">📈</span>
                      Step 4: Progressive Tax Brackets Calculation
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="bg-white/60 dark:bg-gray-800/60 p-3 rounded border border-orange-200 dark:border-orange-700">
                        <p className="text-xs text-gray-700 dark:text-gray-200 mb-2 font-medium">Tax Brackets:</p>
                        <div className="space-y-2">
                          {result.taxBrackets.map((bracket: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-xs py-1 border-b border-orange-100 dark:border-orange-900/50 last:border-0">
                              <span className="text-gray-600 dark:text-gray-300">
                                {bracket.rate === 0 ? (
                                  <span className="text-green-600 dark:text-green-400 font-semibold">Tax-free</span>
                                ) : (
                                  `${bracket.rate}% on`
                                )}{" "}
                                ₦{(bracket.amount || 0).toLocaleString()}
                              </span>
                              <div className="flex items-center gap-2">
                                {bracket.rate > 0 && (
                                  <span className="text-gray-500 dark:text-gray-400 text-xs font-mono">
                                    = ₦{(bracket.amount || 0).toLocaleString()} × {bracket.rate}%
                                  </span>
                                )}
                                <span className={`font-mono font-semibold ${bracket.rate === 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                  {bracket.rate === 0 ? "₦0" : `₦${(bracket.tax || 0).toLocaleString()}`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2 border-t-2 border-orange-300 dark:border-orange-700">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-orange-900 dark:text-orange-100 font-semibold">Total Tax:</span>
                          <span className="font-mono font-bold text-orange-600 dark:text-orange-400 text-base">
                            ₦{(result.totalTax || 0).toLocaleString()}
                          </span>
                        </div>
                        {result.effectiveRate && (
                          <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                            Effective Tax Rate: {result.effectiveRate}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Standard tax brackets for non-PAYE and non-freelancer/creator/employee */}
          {result.calculationType !== "paye" && 
           result.businessType !== "freelancer" && 
           result.businessType !== "creator" && 
           result.businessType !== "employee" && 
           result.taxableIncome !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxable Income</span>
              <span className="font-medium">₦{(result.taxableIncome || 0).toLocaleString()}</span>
            </div>
          )}
          {result.calculationType !== "paye" && 
           result.businessType !== "freelancer" && 
           result.businessType !== "creator" && 
           result.businessType !== "employee" && 
           result.taxBrackets && result.taxBrackets.length > 0 && result.taxBrackets.map((bracket: any, index: number) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {bracket.rate === 0 ? "Tax-free" : `${bracket.rate}% on`} ₦{(bracket.amount || 0).toLocaleString()}
              </span>
              <span className="font-medium">{bracket.rate === 0 ? "₦0" : `₦${(bracket.tax || 0).toLocaleString()}`}</span>
            </div>
          ))}
          {/* Total Tax Payable - Show for all except freelancer/creator/employee (they have it in Step 5) */}
          {result.businessType !== "freelancer" && 
           result.businessType !== "creator" && 
           result.businessType !== "employee" && (
            <div className="flex items-center justify-between pt-3 border-t-2 border-primary/20">
              <span className="font-semibold text-base">Total Tax Payable</span>
              <span className="font-bold text-xl text-primary">₦{(result.totalTax || 0).toLocaleString()}</span>
            </div>
          )}
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

