 "use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calculator } from "lucide-react"
import { transactionService, taxPaymentService, reportService } from "@/lib/services"
import { useAuth } from "@/lib/hooks/useAuth"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp } from "lucide-react"

type DashboardBusinessType = "freelancer" | "creator" | "small-business"

interface TaxSummaryProps {
  businessType?: DashboardBusinessType
}

const SMALL_BUSINESS_TURNOVER_THRESHOLD = 100_000_000

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("NGN", "₦")

const getYearInfo = (date: Date, year?: number) => {
  const y = year ?? date.getFullYear()
  const start = new Date(y, 0, 1)
  const end = new Date(y, 11, 31, 23, 59, 59, 999)
  const label = `${y}`
  return { year: y, start, end, label }
}

interface TaxBracket {
  amount: number
  rate: number
  tax: number
}

interface SummaryState {
  yearLabel: string
  taxableIncome: number
  totalReliefs: number
  manualReliefs: number
  deductions: number
  grossIncome: number
  taxPayable: number
  totalPayments: number // Amount paid for this year
  monthlySetAside: number
  isSmallBusinessExempt: boolean
  taxBrackets?: TaxBracket[]
  capitalAllowanceDetails?: Array<{
    transactionId: string
    description: string
    originalCost: number
    purchaseYear: number
    allowanceRate: number
    allowanceAmount: number
    bookValueAfter: number
    yearsSincePurchase: number
  }>
  capitalAllowances?: number
}

export function TaxSummary({ businessType = "freelancer" }: TaxSummaryProps) {
  const { user } = useAuth()
  const { hasAccess } = useSubscription()
  const hasGoldAccess = hasAccess('GOLD')
  const now = new Date()
  const currentYear = now.getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<SummaryState | null>(null)

  useEffect(() => {
    if (!user) {
      setSummary(null)
      setLoading(false)
      return
    }

    let isMounted = true

    const fetchSummary = async () => {
      setLoading(true)

      const now = new Date()
      const yearInfo = getYearInfo(now, selectedYear)
      const yearStartIso = yearInfo.start.toISOString()
      // If current year, use end of today; otherwise use end of year
      let yearEndDate = yearInfo.end
      if (yearInfo.end > now) {
        // Current year - use end of today to include all transactions today
        yearEndDate = new Date(now)
        yearEndDate.setHours(23, 59, 59, 999)
      }
      const yearEndIso = yearEndDate.toISOString()

      try {
        // Fetch tax payments
        const taxPayments = await taxPaymentService.getUserPaymentsSimple(user.uid)

        // Use unified tax calculation engine (same as self-assessment)
        const taxData = await reportService.calculateTaxForPeriod(
          user.uid,
          yearInfo.start,
          yearEndDate,
          businessType === "small-business" ? "sme" : businessType
        )

        const totalIncome = taxData.grossIncome
        const totalExpenses = taxData.totalExpenses
        const manualReliefs = 0 // Manual reliefs are handled in self-assessment report

        // Filter payments for the selected year
        const yearPayments = taxPayments.filter(payment => {
          if (payment.status !== 'completed') return false
          const paymentDate = new Date(payment.createdAt || payment.paymentDate || '')
          return paymentDate >= yearInfo.start && paymentDate <= yearInfo.end
        })
        const totalPayments = yearPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)

        // Check if small business is exempt
        const isSmallBusinessExempt = businessType === "small-business" && totalIncome <= SMALL_BUSINESS_TURNOVER_THRESHOLD
        const taxCalculation = isSmallBusinessExempt ? null : {
          grossIncome: taxData.grossIncome,
          businessExpenses: taxData.totalExpenses,
          adjustedGrossIncome: taxData.adjustedGrossIncome,
          taxableIncome: taxData.taxableIncome,
          totalTax: taxData.taxPayable,
          taxBrackets: taxData.taxBrackets,
          totalReliefs: taxData.totalReliefs,
          monthlySetAside: taxData.taxPayable / 12,
          capitalAllowances: taxData.capitalAllowances,
          whtCredits: taxData.whtCredits,
          vatOutput: taxData.taxClassification?.vatOutput || 0,
          reliefs: taxData.reliefs
        }

        // Taxable income is already calculated as (income - expenses) - reliefs in calculateNigerianTax
        // So we need to show: Gross Income, then deduct expenses and reliefs separately
        const calculatedTaxableIncome = taxCalculation
          ? taxCalculation.taxableIncome
          : Math.max(totalIncome - totalExpenses, 0)

        const calculatedReliefs = (taxCalculation ? taxCalculation.totalReliefs : 0) + manualReliefs

        const rawTaxPayable = taxCalculation ? taxCalculation.totalTax : 0
        // Show gross tax payable (don't subtract payments)
        // Only subtract manual reliefs if they're tax reliefs, not payments
        const grossTaxPayable = rawTaxPayable
        const monthlySetAside = taxCalculation?.monthlySetAside ?? rawTaxPayable / 12

        if (!isMounted) return

        setSummary({
          yearLabel: yearInfo.label,
          taxableIncome: calculatedTaxableIncome,
          totalReliefs: calculatedReliefs,
          manualReliefs,
          deductions: totalExpenses,
          grossIncome: totalIncome, // Store gross income for display
          taxPayable: grossTaxPayable, // Show gross tax, not net after payments
          totalPayments: totalPayments, // Store total payments separately
          monthlySetAside: monthlySetAside,
          isSmallBusinessExempt,
          taxBrackets: taxCalculation?.taxBrackets || [],
          capitalAllowanceDetails: taxData.taxClassification?.capitalAllowanceDetails || [],
          capitalAllowances: taxData.capitalAllowances || 0,
        })
      } catch (error) {
        console.error("Error loading tax summary:", error)
        if (isMounted) {
          toast.error("Unable to load tax summary.")
          setSummary(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    const handleTransactionChanged = () => {
      if (!isMounted) return
      fetchSummary()
    }

    window.addEventListener("transactionChanged", handleTransactionChanged)
    fetchSummary()

    return () => {
      isMounted = false
      window.removeEventListener("transactionChanged", handleTransactionChanged)
    }
  }, [businessType, user, selectedYear])

  const displaySummary = summary
  const [showTaxCalculation, setShowTaxCalculation] = useState(false)

  // Generate year options (current year and previous 2 years)
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i)

  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="mb-4 sm:mb-5 md:mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base sm:text-lg font-semibold">Tax Summary</h3>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {loading ? "Loading..." : displaySummary ? `${displaySummary.yearLabel} (Full Year)` : "No data"}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 sm:space-y-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-2.5 sm:py-3 border-b border-border">
              <span className="text-xs sm:text-sm bg-muted h-4 w-24 rounded" />
              <span className="text-xs sm:text-sm bg-muted h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      ) : !displaySummary ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No data available. Please add transactions to see your tax summary.
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between py-2.5 sm:py-3 border-b border-border">
            <span className="text-xs sm:text-sm text-muted-foreground">Gross Income</span>
            <span className="font-semibold text-xs sm:text-sm">{formatCurrency(displaySummary.grossIncome ?? (displaySummary.taxableIncome + displaySummary.deductions + displaySummary.totalReliefs))}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 sm:py-3 border-b border-border">
            <span className="text-xs sm:text-sm text-muted-foreground">Work Expenses</span>
            <span className="font-semibold text-xs sm:text-sm text-primary">
              -{formatCurrency(Math.abs(displaySummary.deductions))}
            </span>
          </div>
          {(displaySummary.capitalAllowances ?? 0) > 0 && (
            <div className="flex items-center justify-between py-2.5 sm:py-3 border-b border-border">
              <span className="text-xs sm:text-sm text-muted-foreground">Capital Allowances (Depreciation)</span>
              <span className="font-semibold text-xs sm:text-sm text-primary">
                -{formatCurrency(displaySummary.capitalAllowances ?? 0)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between py-2.5 sm:py-3 border-b border-border">
            <span className="text-xs sm:text-sm text-muted-foreground">Tax Relief</span>
            <span className="font-semibold text-xs sm:text-sm text-primary">
              -{formatCurrency(Math.abs(displaySummary.totalReliefs))}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 sm:py-3 border-b border-border">
            <span className="text-xs sm:text-sm font-medium">Taxable Income</span>
            <span className="font-semibold text-xs sm:text-sm">{formatCurrency(displaySummary.taxableIncome)}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 sm:py-3">
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm font-medium">Tax Payable</span>
              {!displaySummary.isSmallBusinessExempt && displaySummary.totalPayments > 0 && (
                <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  Paid: {formatCurrency(displaySummary.totalPayments)}
                </span>
              )}
              {!displaySummary.isSmallBusinessExempt && displaySummary.taxPayable > 0 && displaySummary.totalPayments > 0 && displaySummary.taxPayable !== displaySummary.totalPayments && (
                <span className={`text-[10px] sm:text-xs mt-0.5 ${displaySummary.taxPayable > displaySummary.totalPayments ? 'text-destructive' : 'text-green-600'}`}>
                  {displaySummary.taxPayable > displaySummary.totalPayments 
                    ? `Balance: ${formatCurrency(displaySummary.taxPayable - displaySummary.totalPayments)}`
                    : `Overpaid: ${formatCurrency(displaySummary.totalPayments - displaySummary.taxPayable)}`
                  }
                </span>
              )}
            </div>
            <span className="text-lg sm:text-xl font-bold text-primary">
              {displaySummary.isSmallBusinessExempt ? "Exempt" : formatCurrency(displaySummary.taxPayable)}
            </span>
          </div>
          
          {/* Tax Calculation Breakdown */}
          {!displaySummary.isSmallBusinessExempt && displaySummary.taxBrackets && displaySummary.taxBrackets.length > 0 && (
            <div className="border-t border-border mt-2 pt-2">
              <button
                onClick={() => setShowTaxCalculation(!showTaxCalculation)}
                className="w-full flex items-center justify-between py-2 hover:bg-muted/50 rounded transition-colors"
              >
                <span className="text-[11px] sm:text-xs text-muted-foreground">
                  How tax is calculated
                </span>
                {showTaxCalculation ? (
                  <ChevronUp className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
              {showTaxCalculation && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  {/* Capital Allowances Breakdown */}
                  {displaySummary.capitalAllowanceDetails && displaySummary.capitalAllowanceDetails.length > 0 && (
                    <>
                      <div className="pb-2 border-b border-border">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-2">
                          Capital Allowances (Depreciation):
                        </p>
                        {displaySummary.capitalAllowanceDetails.map((detail, idx) => {
                          // Calculate book value at start of current year
                          let bookValueAtStartOfYear = detail.originalCost
                          if (detail.yearsSincePurchase > 0) {
                            // Calculate cumulative depreciation up to the start of this year using reducing balance method
                            for (let year = 0; year < detail.yearsSincePurchase; year++) {
                              const yearDepreciation = bookValueAtStartOfYear * (detail.allowanceRate / 100)
                              bookValueAtStartOfYear -= yearDepreciation
                            }
                          }
                          
                          // Calculate Year 1 depreciation for clarity
                          const year1Depreciation = detail.originalCost * (detail.allowanceRate / 100)
                          const bookValueAfterYear1 = detail.originalCost - year1Depreciation
                          
                          return (
                            <div key={idx} className="mb-2 pb-2 border-b border-border last:border-0">
                              <div className="flex items-center justify-between text-[11px] sm:text-xs mb-1">
                                <span className="font-medium">{detail.description}</span>
                                <span className="text-primary">-{formatCurrency(detail.allowanceAmount)}</span>
                              </div>
                              <div className="text-[10px] sm:text-[11px] text-muted-foreground space-y-0.5 pl-2">
                                <div>Purchased {detail.purchaseYear}: {formatCurrency(detail.originalCost)}</div>
                                {detail.yearsSincePurchase > 0 && (
                                  <>
                                    <div className="text-blue-600 dark:text-blue-400 font-medium">Year 1 Depreciation ({detail.allowanceRate}% of {formatCurrency(detail.originalCost)}): <strong>{formatCurrency(year1Depreciation)}</strong></div>
                                    <div className="text-blue-600 dark:text-blue-400">Book Value after Year 1: <strong>{formatCurrency(bookValueAfterYear1)}</strong></div>
                                    <div>Book Value at start of Year {detail.yearsSincePurchase + 1}: {formatCurrency(bookValueAtStartOfYear)}</div>
                                  </>
                                )}
                                <div>Year {detail.yearsSincePurchase + 1} Depreciation ({detail.allowanceRate}% of {formatCurrency(bookValueAtStartOfYear)}): <strong className="text-primary">{formatCurrency(detail.allowanceAmount)}</strong></div>
                                <div>Remaining Book Value: {formatCurrency(detail.bookValueAfter)}</div>
                              </div>
                            </div>
                          )
                        })}
                        <div className="flex items-center justify-between pt-1 border-t border-border mt-1">
                          <span className="text-[11px] sm:text-xs font-medium">Total Capital Allowances</span>
                          <span className="text-[11px] sm:text-xs font-bold text-primary">
                            -{formatCurrency(displaySummary.capitalAllowances || 0)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">
                    Tax is calculated progressively on each bracket:
                  </p>
                  {displaySummary.taxBrackets.map((bracket, index) => (
                    <div key={index} className="flex items-center justify-between py-1.5 text-[11px] sm:text-xs">
                      <span className="text-muted-foreground">
                        {formatCurrency(bracket.amount)} @ {bracket.rate}%
                      </span>
                      <span className="font-medium">{formatCurrency(bracket.tax)}</span>
                    </div>
                  ))}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                    <span className="text-[11px] sm:text-xs font-medium">Total Tax</span>
                    <span className="text-xs sm:text-sm font-bold text-primary">
                      {formatCurrency(displaySummary.taxPayable)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!displaySummary.isSmallBusinessExempt && (
            <p className="text-[11px] sm:text-xs text-muted-foreground text-right">
              Monthly set aside: {formatCurrency(displaySummary.monthlySetAside)}
            </p>
          )}
          {displaySummary.manualReliefs > 0 && (
            <p className="text-[11px] sm:text-xs text-muted-foreground text-right">
              Relief transactions applied: {formatCurrency(displaySummary.manualReliefs)}
            </p>
          )}
        </div>
      )}

      <Link href="/dashboard/tax-calculator" className="block mt-4 sm:mt-5 md:mt-6">
        <Button className="w-full bg-transparent text-xs sm:text-sm" variant="outline" size="sm">
          <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          Calculate Tax
        </Button>
      </Link>
    </Card>
  )
}
