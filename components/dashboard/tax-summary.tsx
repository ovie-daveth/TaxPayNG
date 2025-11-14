 "use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calculator } from "lucide-react"
import { calculateNigerianTax } from "@/lib/tax-calculator"
import { transactionService } from "@/lib/services/transactionService"
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

interface SummaryState {
  yearLabel: string
  taxableIncome: number
  totalReliefs: number
  manualReliefs: number
  deductions: number
  taxPayable: number
  monthlySetAside: number
  isSmallBusinessExempt: boolean
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
      taxPayable: 234_000,
      monthlySetAside: 234_000 / 12,
      isSmallBusinessExempt: false,
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
      const yearEndIso = yearInfo.end > now ? now.toISOString() : yearInfo.end.toISOString()

      try {
        // Fetch full year data for tax calculation
        const yearSummary = await transactionService.getTransactionSummary(
          user.uid,
          yearStartIso,
          yearEndIso
        )

        const totalIncome = yearSummary?.totalIncome ?? 0
        const totalExpenses = yearSummary?.totalExpenses ?? 0
        const manualReliefs = yearSummary?.totalReliefs ?? 0

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

        const calculatedTaxableIncome = taxCalculation
          ? taxCalculation.taxableIncome
          : Math.max(totalIncome - totalExpenses, 0)

        const calculatedReliefs = (taxCalculation ? taxCalculation.totalReliefs : 0) + manualReliefs

        const rawTaxPayable = taxCalculation ? taxCalculation.totalTax : 0
        const adjustedTaxPayable = Math.max(rawTaxPayable - manualReliefs, 0)
        const adjustedMonthlySetAside = Math.max(
          (taxCalculation?.monthlySetAside ?? rawTaxPayable / 12) - manualReliefs / 12,
          0
        )

        if (!isMounted) return

        setSummary({
          yearLabel: yearInfo.label,
          taxableIncome: calculatedTaxableIncome,
          totalReliefs: calculatedReliefs,
          manualReliefs,
          deductions: totalExpenses,
          taxPayable: adjustedTaxPayable,
          monthlySetAside: adjustedMonthlySetAside,
          isSmallBusinessExempt,
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
            <span className="text-xs sm:text-sm text-muted-foreground">Taxable Income</span>
            <span className="font-semibold text-xs sm:text-sm">{formatCurrency(displaySummary.taxableIncome)}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 sm:py-3 border-b border-border">
            <span className="text-xs sm:text-sm text-muted-foreground">Tax Relief</span>
            <span className="font-semibold text-xs sm:text-sm text-primary">
              -{formatCurrency(Math.abs(displaySummary.totalReliefs))}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 sm:py-3 border-b border-border">
            <span className="text-xs sm:text-sm text-muted-foreground">Work Expenses</span>
            <span className="font-semibold text-xs sm:text-sm text-primary">
              -{formatCurrency(Math.abs(displaySummary.deductions))}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5 sm:py-3">
            <span className="text-xs sm:text-sm font-medium">Tax Payable</span>
            <span className="text-lg sm:text-xl font-bold text-primary">
              {displaySummary.isSmallBusinessExempt ? "Exempt" : formatCurrency(displaySummary.taxPayable)}
            </span>
          </div>
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
