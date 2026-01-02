"use client"

import { useCallback, useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowRight, ArrowLeft, Calculator, Calendar, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSidebar } from "@/lib/contexts/sidebar-context"
import { transactionService, taxPaymentService } from "@/lib/services"
import { calculateNigerianTax } from "@/lib/tax-calculator"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { calculatePeriodTaxes } from "@/lib/utils/tax-period-calculation"
import { TaxDurationSelector } from "@/components/tax-payment/tax-duration-selector"

const formatCurrencyAmount = (amount: number): string => {
  return formatCurrency(amount).replace("NGN", "₦").replace(".00", "")
}

interface SimplifiedPaymentFormProps {
  onContinue: (data: PaymentFormData) => void
}

interface PaymentFormData {
  period: 'monthly' | 'quarterly' | 'yearly'
  amount: number
  taxDuration: string
  calculatedAmount?: number
  pendingPeriods?: PendingPeriod[]
  isManual: boolean
}

interface PendingPeriod {
  period: string
  amount: number
  taxDuration: string
}

type Step = 'period' | 'amount'

export function SimplifiedPaymentForm({ onContinue }: SimplifiedPaymentFormProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { sidebarCollapsed } = useSidebar()
  const [currentStep, setCurrentStep] = useState<Step>('period')
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly' | 'yearly' | ''>('')
  const [isManual, setIsManual] = useState(false)
  const [manualAmount, setManualAmount] = useState("")
  const [manualAmountDisplay, setManualAmountDisplay] = useState("")
  const [calculatedAmount, setCalculatedAmount] = useState<number | null>(null)
  const [pendingPeriods, setPendingPeriods] = useState<PendingPeriod[]>([])
  const [selectedPendingPeriods, setSelectedPendingPeriods] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [selectedTaxDuration, setSelectedTaxDuration] = useState<string>("")
  const [isSelectedDurationPaid, setIsSelectedDurationPaid] = useState(false)

  // Calculate tax amount when period is selected and we move to amount step
  useEffect(() => {
    if (currentStep === 'amount' && selectedPeriod && user?.uid) {
      calculateTaxAmount()
    }
  }, [currentStep, selectedPeriod, user?.uid, isManual, selectedTaxDuration])

  const yearsToCheck = useMemo(() => {
    const y = new Date().getFullYear()
    return [y, y - 1]
  }, [])

  const handleDurationChange = useCallback((duration: string) => {
    setSelectedTaxDuration(duration)
    // reset extra pending selection when changing the target period
    setSelectedPendingPeriods(new Set())
  }, [])

  const calculateTaxAmount = async () => {
    if (!user?.uid || !selectedPeriod || !profile) return

    setLoading(true)
    try {
      const businessType = (profile?.businessType as any) || 'freelancer'

      // Get all periods with income and check which are unpaid
      const allPayments = await taxPaymentService.getUserPaymentsSimple(user.uid)
      const completedPayments = allPayments.filter(p => p.status === 'completed')

      const allPeriodsWithIncome = (
        await Promise.all(
          yearsToCheck.map((year) =>
            calculatePeriodTaxes(
              user.uid,
              selectedPeriod as 'monthly' | 'quarterly' | 'yearly',
              year,
              businessType
            )
          )
        )
      ).flat()

      // Initialize default selected duration if not set yet
      if (!selectedTaxDuration) {
        const now = new Date()
        let defaultDuration = ""
        if (selectedPeriod === 'monthly') {
          defaultDuration = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
        } else if (selectedPeriod === 'quarterly') {
          const currentQuarter = Math.floor(now.getMonth() / 3) + 1
          const months = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec']
          defaultDuration = `${months[currentQuarter - 1]} ${now.getFullYear()}`
        } else {
          defaultDuration = now.getFullYear().toString()
        }
        setSelectedTaxDuration(defaultDuration)
      }

      const hasSelectedPayment = completedPayments.some(
        p =>
          p.period === selectedPeriod &&
          p.taxDuration.trim() === (selectedTaxDuration || "").trim()
      )

      const selectedPeriodTax = allPeriodsWithIncome.find(p => p.taxDuration.trim() === (selectedTaxDuration || "").trim())
      const selectedAmount = selectedPeriodTax?.amount ?? 0

      setIsSelectedDurationPaid(hasSelectedPayment)
      setCalculatedAmount(hasSelectedPayment ? 0 : selectedAmount)
      
      // Filter to only unpaid periods, excluding the current period
      const pending = allPeriodsWithIncome
        .filter(period => {
          // Exclude the selected target period to avoid double-counting
          if (period.taxDuration.trim() === (selectedTaxDuration || "").trim()) {
            return false
          }
          
          // Check if already paid
          const hasPayment = allPayments.some(
            p => p.period === selectedPeriod && 
            p.taxDuration === period.taxDuration && 
            p.status === 'completed'
          )
          return !hasPayment
        })
        .map(period => ({
          period: period.period,
          amount: period.amount,
          taxDuration: period.taxDuration
        }))
      
      setPendingPeriods(pending)
    } catch (error) {
      console.error('Error calculating tax:', error)
      toast.error('Failed to calculate tax amount')
    } finally {
      setLoading(false)
    }
  }


  const handlePeriodSelect = (period: 'monthly' | 'quarterly' | 'yearly') => {
    setSelectedPeriod(period)
  }

  const handleContinue = () => {
    if (currentStep === 'period') {
      if (!selectedPeriod) {
        toast.error('Please select a payment period')
        return
      }
      setCurrentStep('amount')
    } else {
      // Amount step - validate and continue
      let finalAmount = 0
      let taxDuration = selectedTaxDuration || ""

      if (isManual) {
        const amount = parseFloat(manualAmount)
        if (!amount || amount <= 0) {
          toast.error('Please enter a valid amount')
          return
        }
        finalAmount = amount
      } else {
        if (calculatedAmount === null) {
          toast.error('Please wait for calculation to complete')
          return
        }
        finalAmount = calculatedAmount

        // Add selected pending periods
        const selectedPending = pendingPeriods.filter(p => 
          selectedPendingPeriods.has(p.taxDuration)
        )
        const pendingTotal = selectedPending.reduce((sum, p) => sum + p.amount, 0)
        finalAmount += pendingTotal
      }
      if (!taxDuration) {
        toast.error("Please select the period you want to pay for.")
        return
      }

      onContinue({
        period: selectedPeriod as 'monthly' | 'quarterly' | 'yearly',
        amount: finalAmount,
        taxDuration,
        calculatedAmount: calculatedAmount ?? undefined,
        pendingPeriods: pendingPeriods.length > 0 ? pendingPeriods : undefined,
        isManual
      })
    }
  }

  const togglePendingPeriod = (taxDuration: string) => {
    setSelectedPendingPeriods(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taxDuration)) {
        newSet.delete(taxDuration)
      } else {
        newSet.add(taxDuration)
      }
      return newSet
    })
  }

  const totalWithPending = () => {
    const base = isManual ? (parseFloat(manualAmount) || 0) : (calculatedAmount || 0)
    const pendingTotal = pendingPeriods
      .filter(p => selectedPendingPeriods.has(p.taxDuration))
      .reduce((sum, p) => sum + p.amount, 0)
    return base + pendingTotal
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {currentStep === 'period' && (
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold">Select Payment Period</CardTitle>
            <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">
              Choose how often you want to pay your taxes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 space-y-2.5 sm:space-y-3 md:space-y-4">
            <div className={`grid gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 ${!sidebarCollapsed ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-3'}`}>
              <button
                onClick={() => handlePeriodSelect('monthly')}
                className={`p-3 sm:p-4 md:p-5 lg:p-6 border-2 rounded-lg text-left transition-all ${
                  selectedPeriod === 'monthly'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 mb-1 sm:mb-1.5 md:mb-2">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary shrink-0" />
                  <h3 className="font-semibold text-xs sm:text-sm md:text-base">Monthly</h3>
                </div>
                <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed">
                  <span className="sm:hidden">Pay monthly</span>
                  <span className="hidden sm:inline">Pay your taxes every month</span>
                </p>
              </button>

              <button
                onClick={() => handlePeriodSelect('quarterly')}
                className={`p-3 sm:p-4 md:p-5 lg:p-6 border-2 rounded-lg text-left transition-all ${
                  selectedPeriod === 'quarterly'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 mb-1 sm:mb-1.5 md:mb-2">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary shrink-0" />
                  <h3 className="font-semibold text-xs sm:text-sm md:text-base">Quarterly</h3>
                </div>
                <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed">
                  <span className="sm:hidden">Pay quarterly</span>
                  <span className="hidden sm:inline">Pay your taxes every 3 months</span>
                </p>
              </button>

              <button
                onClick={() => handlePeriodSelect('yearly')}
                className={`p-3 sm:p-4 md:p-5 lg:p-6 border-2 rounded-lg text-left transition-all ${
                  selectedPeriod === 'yearly'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 mb-1 sm:mb-1.5 md:mb-2">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary shrink-0" />
                  <h3 className="font-semibold text-xs sm:text-sm md:text-base">Yearly</h3>
                </div>
                <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed">
                  <span className="sm:hidden">Pay yearly</span>
                  <span className="hidden sm:inline">Pay your taxes once a year</span>
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-2.5 sm:pt-3 md:pt-4">
              <Button onClick={handleContinue} disabled={!selectedPeriod} className="h-9 sm:h-10 text-xs sm:text-sm">
                Continue
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'amount' && (
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold">Payment Amount</CardTitle>
                <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">
                  {selectedPeriod === 'monthly' && 'Your monthly tax payment amount'}
                  {selectedPeriod === 'quarterly' && 'Your quarterly tax payment amount'}
                  {selectedPeriod === 'yearly' && 'Your annual tax payment amount'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
            {/* Choose which period to pay for */}
            {selectedPeriod && (
              <div className="space-y-2">
                <Label className="text-[11px] sm:text-xs md:text-sm">Pay for</Label>
                <div className="rounded-lg border p-3 bg-background">
                  <TaxDurationSelector period={selectedPeriod} onDurationChange={handleDurationChange} />
                  {selectedTaxDuration && (
                    <p className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground mt-2">
                      Selected: <span className="font-medium text-foreground">{selectedTaxDuration}</span>
                      {isSelectedDurationPaid ? (
                        <span className="ml-2 text-green-600 font-medium">• Already paid</span>
                      ) : null}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Toggle between auto and manual */}
            <div className="flex items-center justify-between p-2.5 sm:p-3 md:p-4 bg-muted rounded-lg">
              <div className="space-y-0.5 flex-1 min-w-0 pr-2 sm:pr-3">
                <Label htmlFor="manual-toggle" className="text-xs sm:text-sm md:text-base font-medium">
                  {isManual ? 'Manual Entry' : 'Auto-Calculated'}
                </Label>
                <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {isManual 
                    ? 'Enter the amount manually' 
                    : 'Amount calculated from your transactions'}
                </p>
              </div>
              <Switch
                id="manual-toggle"
                checked={isManual}
                onCheckedChange={setIsManual}
                className="shrink-0"
              />
            </div>

            {loading && !isManual && (
              <div className="flex items-center justify-center py-4 sm:py-6 md:py-8">
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 animate-spin text-primary" />
                <span className="ml-2 text-[11px] sm:text-xs md:text-sm text-muted-foreground">Calculating amount...</span>
              </div>
            )}

            {!isManual && calculatedAmount !== null && (
              <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
                <div className="p-2.5 sm:p-3 md:p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground">Calculated Amount</p>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-primary truncate">
                        {formatCurrencyAmount(calculatedAmount)}
                      </p>
                      <p className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                        {selectedTaxDuration ? `For ${selectedTaxDuration}` : "Select a period above"}
                      </p>
                    </div>
                    <Calculator className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary shrink-0" />
                  </div>
                </div>

                {pendingPeriods.length > 0 && (
                  <Alert className="p-2.5 sm:p-3 md:p-4">
                    <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                    <AlertDescription className="text-[11px] sm:text-xs md:text-sm">
                      <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                        <p className="font-medium text-[11px] sm:text-xs md:text-sm">
                          You have {pendingPeriods.length} unpaid {selectedPeriod === 'monthly' ? 'month' : selectedPeriod === 'quarterly' ? 'quarter' : 'period'}(s)
                        </p>
                        <div className="space-y-1.5 sm:space-y-2">
                          {pendingPeriods.map((pending, index) => (
                            <label
                              key={index}
                              className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={selectedPendingPeriods.has(pending.taxDuration)}
                                  onChange={() => togglePendingPeriod(pending.taxDuration)}
                                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-[11px] sm:text-xs md:text-sm truncate">{pending.taxDuration}</p>
                                  <p className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground mt-0.5">
                                    {formatCurrencyAmount(pending.amount)}
                                  </p>
                                </div>
                              </div>
                              {selectedPendingPeriods.has(pending.taxDuration) && (
                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary shrink-0 ml-1.5 sm:ml-2" />
                              )}
                            </label>
                          ))}
                        </div>
                        {selectedPendingPeriods.size > 0 && (
                          <div className="pt-1.5 sm:pt-2 border-t">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-[11px] sm:text-xs md:text-sm">Total with pending:</span>
                              <span className="text-sm sm:text-base md:text-lg font-bold text-primary">
                                {formatCurrencyAmount(totalWithPending())}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {isManual && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="manual-amount" className="text-[11px] sm:text-xs md:text-sm">Enter Amount (₦)</Label>
                <div className="relative">
                  <span className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs sm:text-sm md:text-base">₦</span>
                  <Input
                    id="manual-amount"
                    type="text"
                    value={manualAmountDisplay || manualAmount}
                    onChange={(e) => {
                      const value = e.target.value
                      const cleaned = value.replace(/[^\d.]/g, "")
                      const parts = cleaned.split(".")
                      if (parts.length > 2) return
                      if (parts[1] && parts[1].length > 2) return
                      
                      setManualAmount(cleaned)
                      
                      if (cleaned === "") {
                        setManualAmountDisplay("")
                      } else {
                        const num = parseFloat(cleaned)
                        if (!isNaN(num)) {
                          const formatted = num.toLocaleString('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          })
                          setManualAmountDisplay(formatted)
                        } else {
                          setManualAmountDisplay(cleaned)
                        }
                      }
                    }}
                    onBlur={() => {
                      if (manualAmount) {
                        const num = parseFloat(manualAmount)
                        if (!isNaN(num)) {
                          const formatted = num.toLocaleString('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          })
                          setManualAmountDisplay(formatted)
                        }
                      }
                    }}
                    placeholder="Enter tax amount"
                    className="pl-6 sm:pl-7 md:pl-8 h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2.5 md:gap-3 pt-2.5 sm:pt-3 md:pt-4">
              <Button 
                onClick={() => {
                  if (!isManual && totalWithPending() <= 0) {
                    toast.message("No tax due for the selected period (already paid).")
                    return
                  }
                  handleContinue()
                }}
                disabled={loading || (isManual && !manualAmount) || (!isManual && calculatedAmount === null) || (!isManual && totalWithPending() <= 0)}
                className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
              >
                Continue
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

