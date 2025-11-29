"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup } from "@/components/ui/radio"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Calculator, DollarSign, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { PAYMENT_METHODS, PaymentMethodCard } from "./payment-method-card"
import { PERIODS, PaymentPeriodCard } from "./payment-period-card"
import { PaymentStepsIndicator } from "./payment-steps-indicator"
import { TaxCalculatorForm } from "@/components/tax-calculator/form/tax-calculator-form"
import { TaxDurationSelector } from "./tax-duration-selector"
import { RRRPaymentForm } from "./rrr-payment-form"

interface TaxPaymentFormProps {
  onPay: (amount: number, method: string, period: string, taxDuration: string, taxCalculation?: any, rrr?: string, tin?: string, state?: string) => void
  processing: boolean
  onCheckDuplicate?: (period: string, taxDuration: string) => Promise<{ isDuplicate: boolean; payment?: any }>
}

const STEPS = [
  { id: 1, title: "Period", description: "Select tax period" },
  { id: 2, title: "Amount", description: "Enter tax amount" },
  { id: 3, title: "Payment", description: "Choose gateway" },
  { id: 4, title: "Generate RRR", description: "Create reference" },
  { id: 5, title: "Review", description: "Confirm payment" },
]

export function TaxPaymentForm({ onPay, processing, onCheckDuplicate }: TaxPaymentFormProps) {
  // Load from localStorage on mount
  const [taxDuration, setTaxDuration] = useState<string>("")
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tax_payment_step')
      return saved ? parseInt(saved) : 1
    }
    return 1
  })
  
  const [period, setPeriod] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tax_payment_period') || ""
    }
    return ""
  })
  
  const [amount, setAmount] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tax_payment_amount') || ""
    }
    return ""
  })
  
  const [selectedMethod, setSelectedMethod] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tax_payment_method') || ""
    }
    return ""
  })
  
  const [calculatedTax, setCalculatedTax] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tax_payment_calculated')
      return saved ? parseFloat(saved) : null
    }
    return null
  })
  
  const [calculatedTaxFull, setCalculatedTaxFull] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tax_payment_calculated_full')
      return saved ? JSON.parse(saved) : null
    }
    return null
  })
  
  const [originalTaxInputs, setOriginalTaxInputs] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tax_payment_original_inputs')
      return saved ? JSON.parse(saved) : null
    }
    return null
  })
  
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tax_payment_tab') || "direct"
    }
    return "direct"
  })

  // Save to localStorage whenever values change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tax_payment_step', currentStep.toString())
    }
  }, [currentStep])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tax_payment_period', period)
    }
  }, [period])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tax_payment_amount', amount)
    }
  }, [amount])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tax_payment_method', selectedMethod)
    }
  }, [selectedMethod])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (calculatedTax !== null) {
        localStorage.setItem('tax_payment_calculated', calculatedTax.toString())
      }
    }
  }, [calculatedTax])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (calculatedTaxFull !== null) {
        localStorage.setItem('tax_payment_calculated_full', JSON.stringify(calculatedTaxFull))
      }
    }
  }, [calculatedTaxFull])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tax_payment_tab', activeTab)
    }
  }, [activeTab])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tax_payment_tax_duration', taxDuration)
    }
  }, [taxDuration])

  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicatePaymentInfo, setDuplicatePaymentInfo] = useState<any>(null)
  const [generatedRRR, setGeneratedRRR] = useState<string>("")
  const [tinNumber, setTinNumber] = useState<string>("")
  const [stateOfWork, setStateOfWork] = useState<string>("")

  const handleCalculate = (result: any) => {
    // Validate that expenses don't exceed income
    const totalExpenses = result.businessExpenses + 
      result.reliefs?.rentRelief + 
      result.reliefs?.pension + 
      result.reliefs?.healthInsurance + 
      result.reliefs?.housingFund + 
      result.reliefs?.lifeInsurance + 
      result.reliefs?.charitable || 0
    
    if (totalExpenses > result.grossIncome) {
      toast.error("Invalid Entry: Total expenses exceed your income. Please review your entries.")
      setCalculatedTax(null)
      setCalculatedTaxFull(null)
      setAmount("")
      return
    }
    
    // Store the full calculation result
    setCalculatedTaxFull(result)
    
    // Calculate the appropriate tax amount based on the period selected
    // The result.totalTax is the ANNUAL tax amount
    let paymentAmount = result.totalTax
    
    if (period === "monthly") {
      // For monthly payments, divide annual tax by 12
      paymentAmount = result.monthlySetAside
    } else if (period === "quarterly") {
      // For quarterly payments, divide annual tax by 4
      paymentAmount = result.totalTax / 4
    }
    // For yearly, use the full annual tax amount
    
    setCalculatedTax(paymentAmount)
    setAmount(paymentAmount.toString())
  }

  // Clear localStorage
  const clearPaymentData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tax_payment_step')
      localStorage.removeItem('tax_payment_period')
      localStorage.removeItem('tax_payment_amount')
      localStorage.removeItem('tax_payment_method')
      localStorage.removeItem('tax_payment_calculated')
      localStorage.removeItem('tax_payment_calculated_full')
      localStorage.removeItem('tax_payment_tab')
    }
  }

  const handleGenerateRRR = (rrr: string, tin: string, state: string) => {
    setGeneratedRRR(rrr)
    setTinNumber(tin)
    setStateOfWork(state)
    // Go to next step (review)
    setCurrentStep(5)
  }

  const handlePay = async () => {
    const paymentAmount = parseFloat(amount) || 0
    if (paymentAmount > 0 && selectedMethod && period && taxDuration) {
      // Check for duplicate payment if the function is provided
      if (onCheckDuplicate) {
        const result = await onCheckDuplicate(period, taxDuration)
        if (result.isDuplicate && result.payment) {
          setDuplicatePaymentInfo(result.payment)
          setShowDuplicateModal(true)
          return // Don't proceed with payment
        }
      }
      
      // For Remita/Interswitch/Paystack, navigate to generate-rrr page
      if (['remitta', 'interswitch', 'paystack'].includes(selectedMethod)) {
        // Store payment data in localStorage for the generate-rrr page
        if (typeof window !== 'undefined') {
          localStorage.setItem('payment_amount', paymentAmount.toString())
          localStorage.setItem('payment_method', selectedMethod)
          localStorage.setItem('payment_period', period)
          localStorage.setItem('payment_taxDuration', taxDuration)
          localStorage.setItem('payment_taxCalculation', JSON.stringify(calculatedTaxFull || {}))
        }
        // Navigate to generate-rrr page
        window.location.href = `/dashboard/payment/generate-rrr`
        return
      }
      
      // For FIRS, proceed with direct payment
      // Clear localStorage when payment is initiated
      clearPaymentData()
      // Pass the full tax calculation and RRR details if they exist
      onPay(paymentAmount, selectedMethod, period, taxDuration, calculatedTaxFull, generatedRRR, tinNumber, stateOfWork)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return period !== ""
      case 2:
        return amount !== "" && parseFloat(amount) > 0 && taxDuration !== ""
      case 3:
        return selectedMethod !== ""
      case 4:
        // Only require RRR for certain payment methods
        const requiresRRR = selectedMethod && ['remitta', 'interswitch', 'paystack'].includes(selectedMethod)
        return requiresRRR ? generatedRRR !== "" : true
      case 5:
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (canProceed() && currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }
  
  // Check if current payment method requires RRR
  const requiresRRR = () => {
    return selectedMethod && ['remitta', 'interswitch', 'paystack'].includes(selectedMethod)
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getPeriodDisplay = () => {
    return PERIODS.find(p => p.id === period)?.name || ""
  }

  const getMethodDisplay = () => {
    return PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name || ""
  }

  return (
    <div className="space-y-6">
      <PaymentStepsIndicator currentStep={currentStep} steps={STEPS} />

      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <Card className="animate-in fade-in slide-in-from-right duration-300">
            <CardHeader>
              <CardTitle>Select Tax Period</CardTitle>
              <CardDescription>Choose when you want to pay your tax</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={period} onValueChange={setPeriod}>
                <div className="grid grid-cols-3 gap-4">
                  {PERIODS.map((periodOption) => (
                    <PaymentPeriodCard
                      key={periodOption.id}
                      period={periodOption}
                      selected={period === periodOption.id}
                      onSelect={setPeriod}
                    />
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button onClick={nextStep} disabled={!canProceed()} size="lg">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="animate-in fade-in slide-in-from-right duration-300">
            <CardHeader>
              <CardTitle>Tax Amount</CardTitle>
              <CardDescription>Enter or calculate your tax amount for {getPeriodDisplay().toLowerCase()} period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tax Duration Selector */}
              <div className="space-y-2">
                <Label>Select Tax Duration for Payment</Label>
                <TaxDurationSelector period={period} onDurationChange={setTaxDuration} />
                <p className="text-xs text-muted-foreground">
                  Specify which period you are paying for (e.g., October 2024)
                </p>
              </div>

              <div className="border-t pt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="direct">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Enter Amount
                  </TabsTrigger>
                  <TabsTrigger value="calculate">
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate Tax
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="direct" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Tax Amount (₦)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter tax amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="calculate" className="mt-4">
                  <TaxCalculatorForm onCalculate={handleCalculate} />
                  {calculatedTax && calculatedTaxFull && (
                    <div className="mt-4 space-y-3">
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <p className="text-sm text-muted-foreground">Annual Tax (calculated):</p>
                        <p className="text-lg font-semibold">₦{calculatedTaxFull.totalTax.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">{getPeriodDisplay()} Payment Amount:</p>
                        <p className="text-2xl font-bold text-primary">₦{calculatedTax.toLocaleString()}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          {period === "monthly" && `Based on ₦${calculatedTaxFull.totalTax.toLocaleString()} annual tax ÷ 12`}
                          {period === "quarterly" && `Based on ₦${calculatedTaxFull.totalTax.toLocaleString()} annual tax ÷ 4`}
                          {period === "yearly" && "Full annual tax amount"}
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-3">
              <Button variant="outline" onClick={prevStep} size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={nextStep} disabled={!canProceed()} size="lg">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="animate-in fade-in slide-in-from-right duration-300">
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Select your preferred payment gateway</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
                <div className="grid grid-cols-2 gap-4">
                  {PAYMENT_METHODS.map((method) => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      selected={selectedMethod === method.id}
                      onSelect={setSelectedMethod}
                      processing={processing}
                    />
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
            <CardFooter className="flex justify-between gap-3">
              <Button variant="outline" onClick={prevStep} size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={nextStep} disabled={!canProceed()} size="lg">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 4 && (
          <Card className="animate-in fade-in slide-in-from-right duration-300">
            <CardHeader>
              <CardTitle>Review Payment</CardTitle>
              <CardDescription>Please review your payment details before proceeding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-6 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-muted-foreground">Tax Period:</span>
                  <span className="font-semibold">{getPeriodDisplay()}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-muted-foreground">Tax Duration:</span>
                  <span className="font-semibold text-primary">{taxDuration || "Not specified"}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-semibold">{getMethodDisplay()}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-3xl font-bold text-primary">
                    ₦{amount ? parseFloat(amount).toLocaleString() : "0.00"}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Secure Payment</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      Your payment will be processed securely through our payment gateway. 
                      You'll receive a receipt upon successful payment.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-3">
              <Button variant="outline" onClick={prevStep} size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={handlePay} 
                disabled={!canProceed() || processing} 
                size="lg"
                className="flex-1"
              >
                {processing ? "Processing Payment..." : "Confirm Payment"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {currentStep === 4 && requiresRRR() && (
          <RRRPaymentForm 
            onGenerateRRR={handleGenerateRRR}
            processing={processing}
          />
        )}

        {currentStep === 4 && !requiresRRR() && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground mb-4">
                Click continue to proceed to review...
              </p>
              <Button onClick={nextStep} className="w-full">Continue</Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 5 && (
          <Card className="animate-in fade-in slide-in-from-right duration-300">
            <CardHeader>
              <CardTitle>Review Payment</CardTitle>
              <CardDescription>Please review your payment details before proceeding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-6 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-muted-foreground">Tax Period:</span>
                  <span className="font-semibold">{getPeriodDisplay()}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-muted-foreground">Tax Duration:</span>
                  <span className="font-semibold text-primary">{taxDuration || "Not specified"}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-semibold">{getMethodDisplay()}</span>
                </div>
                {generatedRRR && (
                  <div className="flex items-center justify-between pb-3 border-b">
                    <span className="text-muted-foreground">RRR:</span>
                    <span className="font-mono font-semibold text-primary">{generatedRRR}</span>
                  </div>
                )}
                {tinNumber && (
                  <div className="flex items-center justify-between pb-3 border-b">
                    <span className="text-muted-foreground">TIN:</span>
                    <span className="font-semibold">{tinNumber}</span>
                  </div>
                )}
                {stateOfWork && (
                  <div className="flex items-center justify-between pb-3 border-b">
                    <span className="text-muted-foreground">State of Work:</span>
                    <span className="font-semibold">{stateOfWork}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-3xl font-bold text-primary">
                    ₦{amount ? parseFloat(amount).toLocaleString() : "0.00"}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Secure Payment</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      Your payment will be processed securely through our payment gateway. 
                      You'll receive a receipt upon successful payment.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-3">
              <Button variant="outline" onClick={prevStep} size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={handlePay} 
                disabled={!canProceed() || processing} 
                size="lg"
                className="flex-1"
              >
                {processing ? "Processing Payment..." : "Confirm Payment"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Duplicate Payment Modal */}
        <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <DialogTitle>Payment Already Made</DialogTitle>
                  <DialogDescription>
                    A payment has already been recorded for this period
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            {duplicatePaymentInfo && (
              <div className="space-y-3 py-4">
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Period:</span>
                    <span className="font-medium">{duplicatePaymentInfo.period}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax Duration:</span>
                    <span className="font-medium">{duplicatePaymentInfo.taxDuration}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-medium">₦{duplicatePaymentInfo.amount?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`font-medium ${
                      duplicatePaymentInfo.status === 'completed' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {duplicatePaymentInfo.status || 'Completed'}
                    </span>
                  </div>
                  {duplicatePaymentInfo.transactionId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Transaction ID:</span>
                      <span className="font-mono text-xs">{duplicatePaymentInfo.transactionId}</span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground">
                  You cannot make another payment for this same tax duration. If you need to make changes, please contact support.
                </p>
              </div>
            )}
            
            <DialogFooter>
              <Button onClick={() => setShowDuplicateModal(false)} variant="outline">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

