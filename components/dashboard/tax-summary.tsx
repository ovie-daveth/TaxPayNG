 "use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calculator } from "lucide-react"
import { calculateNigerianTax } from "@/lib/tax-calculator"
import { transactionService, taxPaymentService } from "@/lib/services"
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp } from "lucide-react"

type DashboardBusinessType = "freelancer" | "creator" | "small-business"

interface TaxSummaryProps {
  businessType?: DashboardBusinessType
  useMockData?: boolean
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
  monthlySetAside: number
  isSmallBusinessExempt: boolean
  taxBrackets?: TaxBracket[]
}

export function TaxSummary({ businessType = "freelancer", useMockData = false }: TaxSummaryProps) {
  const { user } = useAuth()
  const now = new Date()
  const currentYear = now.getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<SummaryState | null>(null)

  const mockSummary = useMemo<SummaryState>(
    () => ({
      yearLabel: "2025",
      taxableIncome: 1_560_000,
      totalReliefs: 200_000,
      manualReliefs: 200_000,
      deductions: 50_000,
      grossIncome: 1_610_000,
      taxPayable: 234_000,
      monthlySetAside: 234_000 / 12,
      isSmallBusinessExempt: false,
      taxBrackets: [
        { amount: 800_000, rate: 0, tax: 0 },
        { amount: 760_000, rate: 15, tax: 114_000 },
      ],
    }),
    []
  )

  useEffect(() => {
    if (useMockData) {
      setSummary(mockSummary)
      setLoading(false)
      return
    }

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
        // Fetch full year data for tax calculation (transactions only)
        const [yearSummary, taxPayments] = await Promise.all([
          transactionService.getTransactionSummary(
            user.uid,
            yearStartIso,
            yearEndIso
          ),
          taxPaymentService.getUserPaymentsSimple(user.uid)
        ])

        const totalIncome = yearSummary?.totalIncome ?? 0
        const totalExpenses = yearSummary?.totalExpenses ?? 0
        const manualReliefs = yearSummary?.totalReliefs ?? 0

        // Filter payments for the selected year
        const yearPayments = taxPayments.filter(payment => {
          if (payment.status !== 'completed') return false
          const paymentDate = new Date(payment.createdAt || payment.paymentDate || '')
          return paymentDate >= yearInfo.start && paymentDate <= yearInfo.end
        })
        const totalPayments = yearPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)

        const taxCalculation =
          businessType === "small-business" && totalIncome <= SMALL_BUSINESS_TURNOVER_THRESHOLD
            ? null
            : calculateNigerianTax({
                businessType: businessType === "small-business" ? "sme" : businessType,
                period: "yearly",
                income: totalIncome,
                rentPaid: 0,
                pensionContribution: 0,
                healthInsurance: 0,
                housingFund: 0,
                lifeInsurance: 0,
                charitableDonations: 0,
                businessExpenses: totalExpenses,
                dependents: 0,
              })

        const isSmallBusinessExempt = !taxCalculation && businessType === "small-business"

        // Taxable income is already calculated as (income - expenses) - reliefs in calculateNigerianTax
        // So we need to show: Gross Income, then deduct expenses and reliefs separately
        const calculatedTaxableIncome = taxCalculation
          ? taxCalculation.taxableIncome
          : Math.max(totalIncome - totalExpenses, 0)

        const calculatedReliefs = (taxCalculation ? taxCalculation.totalReliefs : 0) + manualReliefs

        const rawTaxPayable = taxCalculation ? taxCalculation.totalTax : 0
        // Deduct both manual reliefs and tax payments from gross tax payable
        const adjustedTaxPayable = Math.max(rawTaxPayable - manualReliefs - totalPayments, 0)
        const adjustedMonthlySetAside = Math.max(
          (taxCalculation?.monthlySetAside ?? rawTaxPayable / 12) - (manualReliefs + totalPayments) / 12,
          0
        )

        if (!isMounted) return

        setSummary({
          yearLabel: yearInfo.label,
          taxableIncome: calculatedTaxableIncome,
          totalReliefs: calculatedReliefs,
          manualReliefs,
          deductions: totalExpenses,
          grossIncome: totalIncome, // Store gross income for display
          taxPayable: adjustedTaxPayable,
          monthlySetAside: adjustedMonthlySetAside,
          isSmallBusinessExempt,
          taxBrackets: taxCalculation?.taxBrackets || [],
        })
      } catch (error) {
        console.error("Error loading tax summary:", error)
        if (isMounted) {
          toast.error("Unable to load tax summary. Showing recent data instead.")
          setSummary(mockSummary)
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
  }, [businessType, mockSummary, useMockData, user, selectedYear])

  const displaySummary = summary ?? mockSummary
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
          {loading ? "Loading..." : `${displaySummary.yearLabel} (Full Year)`}
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
            <span className="text-xs sm:text-sm font-medium">Tax Payable</span>
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
