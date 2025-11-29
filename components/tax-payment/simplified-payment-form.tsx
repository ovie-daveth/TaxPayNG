"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowRight, ArrowLeft, Calculator, Calendar, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { transactionService, taxPaymentService } from "@/lib/services"
import { calculateNigerianTax } from "@/lib/tax-calculator"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { calculatePeriodTaxes, getCurrentPeriodTax } from "@/lib/utils/tax-period-calculation"

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
  const [currentStep, setCurrentStep] = useState<Step>('period')
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly' | 'yearly' | ''>('')
  const [isManual, setIsManual] = useState(false)
  const [manualAmount, setManualAmount] = useState("")
  const [manualAmountDisplay, setManualAmountDisplay] = useState("")
  const [calculatedAmount, setCalculatedAmount] = useState<number | null>(null)
  const [pendingPeriods, setPendingPeriods] = useState<PendingPeriod[]>([])
  const [selectedPendingPeriods, setSelectedPendingPeriods] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // Calculate tax amount when period is selected and we move to amount step
  useEffect(() => {
    if (currentStep === 'amount' && selectedPeriod && user?.uid && !isManual) {
      calculateTaxAmount()
    }
  }, [currentStep, selectedPeriod, user?.uid, isManual])

  const calculateTaxAmount = async () => {
    if (!user?.uid || !selectedPeriod || !profile) return

    setLoading(true)
    try {
      const now = new Date()
      const currentYear = now.getFullYear()
      const businessType = (profile?.businessType as any) || 'freelancer'
      
      // Get current period tax based on actual income
      const currentPeriodTax = await getCurrentPeriodTax(
        user.uid,
        selectedPeriod,
        businessType
      )
      
      if (!currentPeriodTax) {
        // No income in current period
        setCalculatedAmount(0)
        setPendingPeriods([])
        return
      }
      
      setCalculatedAmount(currentPeriodTax.amount)

      // Get all periods with income and check which are unpaid
      const allPayments = await taxPaymentService.getUserPaymentsSimple(user.uid)
      const allPeriodsWithIncome = await calculatePeriodTaxes(
        user.uid,
        selectedPeriod,
        currentYear,
        businessType
      )
      
      // Filter to only unpaid periods, excluding the current period
      const pending = allPeriodsWithIncome
        .filter(period => {
          // Exclude current period to avoid double-counting
          if (period.taxDuration === currentPeriodTax.taxDuration) {
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
      let taxDuration = ""

      if (isManual) {
        const amount = parseFloat(manualAmount)
        if (!amount || amount <= 0) {
          toast.error('Please enter a valid amount')
          return
        }
        finalAmount = amount
      } else {
        if (!calculatedAmount) {
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

      // Determine tax duration
      const now = new Date()
      if (selectedPeriod === 'monthly') {
        taxDuration = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
      } else if (selectedPeriod === 'quarterly') {
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1
        const months = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec']
        taxDuration = `Q${currentQuarter} ${now.getFullYear()} (${months[currentQuarter - 1]})`
      } else {
        taxDuration = now.getFullYear().toString()
      }

      onContinue({
        period: selectedPeriod as 'monthly' | 'quarterly' | 'yearly',
        amount: finalAmount,
        taxDuration,
        calculatedAmount: calculatedAmount || undefined,
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
    <div className="space-y-6">
      {currentStep === 'period' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Payment Period</CardTitle>
            <CardDescription>
              Choose how often you want to pay your taxes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handlePeriodSelect('monthly')}
                className={`p-6 border-2 rounded-lg text-left transition-all ${
                  selectedPeriod === 'monthly'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Monthly</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pay your taxes every month
                </p>
              </button>

              <button
                onClick={() => handlePeriodSelect('quarterly')}
                className={`p-6 border-2 rounded-lg text-left transition-all ${
                  selectedPeriod === 'quarterly'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Quarterly</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pay your taxes every 3 months
                </p>
              </button>

              <button
                onClick={() => handlePeriodSelect('yearly')}
                className={`p-6 border-2 rounded-lg text-left transition-all ${
                  selectedPeriod === 'yearly'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Yearly</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pay your taxes once a year
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleContinue} disabled={!selectedPeriod}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'amount' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Amount</CardTitle>
                <CardDescription>
                  {selectedPeriod === 'monthly' && 'Your monthly tax payment amount'}
                  {selectedPeriod === 'quarterly' && 'Your quarterly tax payment amount'}
                  {selectedPeriod === 'yearly' && 'Your annual tax payment amount'}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep('period')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toggle between auto and manual */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="manual-toggle" className="text-base font-medium">
                  {isManual ? 'Manual Entry' : 'Auto-Calculated'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isManual 
                    ? 'Enter the amount manually' 
                    : 'Amount calculated from your transactions'}
                </p>
              </div>
              <Switch
                id="manual-toggle"
                checked={isManual}
                onCheckedChange={setIsManual}
              />
            </div>

            {loading && !isManual && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Calculating amount...</span>
              </div>
            )}

            {!isManual && calculatedAmount !== null && (
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Calculated Amount</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrencyAmount(calculatedAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedPeriod === 'monthly' && 'Current month'}
                        {selectedPeriod === 'quarterly' && 'Current quarter'}
                        {selectedPeriod === 'yearly' && 'Current year'}
                      </p>
                    </div>
                    <Calculator className="w-8 h-8 text-primary" />
                  </div>
                </div>

                {pendingPeriods.length > 0 && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <div className="space-y-3">
                        <p className="font-medium">
                          You have {pendingPeriods.length} unpaid {selectedPeriod === 'monthly' ? 'month' : selectedPeriod === 'quarterly' ? 'quarter' : 'period'}(s)
                        </p>
                        <div className="space-y-2">
                          {pendingPeriods.map((pending, index) => (
                            <label
                              key={index}
                              className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedPendingPeriods.has(pending.taxDuration)}
                                  onChange={() => togglePendingPeriod(pending.taxDuration)}
                                  className="w-4 h-4"
                                />
                                <div>
                                  <p className="font-medium">{pending.taxDuration}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatCurrencyAmount(pending.amount)}
                                  </p>
                                </div>
                              </div>
                              {selectedPendingPeriods.has(pending.taxDuration) && (
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                              )}
                            </label>
                          ))}
                        </div>
                        {selectedPendingPeriods.size > 0 && (
                          <div className="pt-2 border-t">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Total with pending:</span>
                              <span className="text-lg font-bold text-primary">
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
              <div className="space-y-2">
                <Label htmlFor="manual-amount">Enter Amount (₦)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
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
                    className="pl-8"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('period')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleContinue}
                disabled={loading || (isManual && !manualAmount) || (!isManual && calculatedAmount === null)}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

