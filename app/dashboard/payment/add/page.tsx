"use client"

import { useState, useEffect } from "react"
import { PaymentReceipt } from "@/components/tax-payment/payment-receipt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { SimplifiedPaymentForm } from "@/components/tax-payment/simplified-payment-form"
import { taxPaymentService, documentService, transactionService } from "@/lib/services"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CheckCircle2, XCircle, AlertCircle, Loader2, TrendingUp } from "lucide-react"
import Link from "next/link"
import { calculatePeriodTaxes } from "@/lib/utils/tax-period-calculation"
import { formatCurrencyAmount } from "@/lib/utils/currency"

interface PaymentData {
  amount: number
  tips: string[]
  status: string
  transactionId: string
  method: string
  taxDuration: string
  timestamp: string
  rrr?: string
  tin?: string
  state?: string
}

interface PaymentFormData {
  period: 'monthly' | 'quarterly' | 'yearly'
  amount: number
  taxDuration: string
  calculatedAmount?: number
  pendingPeriods?: Array<{
    period: string
    amount: number
    taxDuration: string
  }>
  isManual: boolean
}

interface SystemCheck {
  name: string
  status: boolean
  message: string
  actionUrl?: string
  actionLabel?: string
}

export default function PaymentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [showReceipt, setShowReceipt] = useState(false)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [processing, setProcessing] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([])
  const [allChecksPassed, setAllChecksPassed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [outstandingTaxes, setOutstandingTaxes] = useState<Array<{
    period: string
    taxDuration: string
    amount: number
    periodType: 'monthly' | 'quarterly' | 'yearly'
  }>>([])
  const [loadingOutstanding, setLoadingOutstanding] = useState(false)

  // Mock payment processing
  const processPayment = async (amount: number, method: string): Promise<PaymentData> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
    const tips = [
      "Keep this receipt for your records",
      "File your tax returns on time to avoid penalties",
      "Consider consulting a tax professional for complex situations",
      "Maintain records of all deductions and expenses",
      "Set reminders for upcoming tax deadlines"
    ]
    
    return {
      amount,
      tips,
      status: "Success",
      transactionId,
      method: method.charAt(0).toUpperCase() + method.slice(1),
      taxDuration: "", // Will be set by caller
      timestamp: new Date().toISOString()
    }
  }

  const performSystemChecks = async () => {
    if (!profile || !user?.uid) return

    setChecking(true)
    const checks: SystemCheck[] = []

    // 1. Check if profile is complete
    const isProfileComplete = !!(
      profile.firstName &&
      profile.lastName &&
      profile.address &&
      profile.address.street &&
      profile.address.city &&
      profile.address.state &&
      profile.phone
    )
    
    checks.push({
      name: "Profile Complete",
      status: isProfileComplete,
      message: isProfileComplete 
        ? "Your profile information is complete"
        : "Please complete your profile information (name, address, phone)",
      actionUrl: !isProfileComplete ? "/dashboard/settings" : undefined,
      actionLabel: !isProfileComplete ? "Complete Profile" : undefined
    })

    // 2. Check if TIN is verified
    const taxId = profile.taxId
    const isTINVerified = !!(taxId && typeof taxId === 'string' && taxId.trim().length > 0)
    checks.push({
      name: "TIN Verified",
      status: isTINVerified,
      message: isTINVerified
        ? "Your Tax Identification Number is verified"
        : "Please verify your Tax Identification Number (TIN)",
      actionUrl: !isTINVerified ? "/dashboard/settings" : undefined,
      actionLabel: !isTINVerified ? "Add TIN" : undefined
    })

    // 3. Check if KYC is uploaded (check for identity documents in profile)
    try {
      const hasKYCDocuments = !!(
        profile.kycDocuments?.id || 
        profile.kycDocuments?.passport || 
        profile.kycDocuments?.driverLicense
      )
      
      checks.push({
        name: "KYC Documents",
        status: hasKYCDocuments,
        message: hasKYCDocuments
          ? "KYC documents are uploaded"
          : "Please upload your identity documents (ID, Passport, or Driver's License)",
        actionUrl: !hasKYCDocuments ? "/dashboard/settings?tab=profile&section=kyc" : undefined,
        actionLabel: !hasKYCDocuments ? "Upload Documents" : undefined
      })
    } catch (error) {
      console.error("Error checking KYC documents:", error)
      checks.push({
        name: "KYC Documents",
        status: false,
        message: "Unable to verify KYC documents",
        actionUrl: "/dashboard/settings?tab=profile&section=kyc",
        actionLabel: "Upload Documents"
      })
    }

    setSystemChecks(checks)
    const passed = checks.every(check => check.status)
    setAllChecksPassed(passed)
    setChecking(false)
  }

  const handlePaymentFormContinue = async (data: PaymentFormData) => {
    // Store payment data
    setPaymentFormData(data)
    
    // Store in localStorage for the generate-rrr page
    if (typeof window !== 'undefined') {
      localStorage.setItem('payment_amount', data.amount.toString())
      localStorage.setItem('payment_period', data.period)
      localStorage.setItem('payment_taxDuration', data.taxDuration)
      if (data.calculatedAmount) {
        localStorage.setItem('payment_calculatedAmount', data.calculatedAmount.toString())
      }
    }
    
    // Perform system checks before navigating
    await performSystemChecks()
    setShowValidation(true)
  }

  const handleProceedToRRR = () => {
    if (allChecksPassed) {
      // Navigate to generate RRR page
      router.push('/dashboard/payment/generate-rrr')
    } else {
      toast.error("Please complete all required checks before proceeding")
    }
  }

  const handlePay = async (amount: number, method: string, period: string, taxDuration: string, taxCalculation?: any, rrr?: string, tin?: string, state?: string) => {
    setProcessing(true)
    
    try {
      // Simulate payment processing based on method
      let paymentResult: PaymentData
      
      if (method === "firs") {
        // Open FIRS in new tab
        const confirmProceed = window.confirm(
          "You will be redirected to the FIRS official payment portal. Continue?"
        )
        if (!confirmProceed) {
          setProcessing(false)
          return
        }
        window.open("https://firs.gov.ng", "_blank")
        // Still process as success for demo
        paymentResult = await processPayment(amount, method)
      } else {
        // Mock payment for other gateways
        paymentResult = await processPayment(amount, method)
      }
      
      // Save payment to Firebase
      if (user?.uid) {
        try {
          console.log('Attempting to save payment to Firebase...')
          console.log('Payment data:', { 
            transactionId: paymentResult.transactionId, 
            amount: paymentResult.amount, 
            period,
            method 
          })
          
          const saveResult = await taxPaymentService.createPayment(user.uid, {
            transactionId: paymentResult.transactionId,
            amount: paymentResult.amount,
            period: period as 'monthly' | 'quarterly' | 'yearly',
            taxDuration: taxDuration,
            paymentMethod: method as 'remitta' | 'interswitch' | 'paystack' | 'firs',
            status: 'completed',
            taxCalculation: taxCalculation,
            notes: 'Payment completed successfully'
          })
          
          console.log('Save result:', saveResult)
          
          if (!saveResult.success) {
            console.error('Failed to save payment to Firebase:', saveResult.error)
            toast.error(`Payment completed but failed to save record: ${saveResult.error}`)
          } else {
            toast.success('Payment saved successfully')
          }
        } catch (error) {
          console.error('Error saving payment to Firebase:', error)
          toast.error('Payment completed but failed to save record. Please check console for details.')
        }
      } else {
        console.error('User not found, cannot save payment')
        toast.error('Payment completed but user not authenticated')
      }
      
      // Add taxDuration and RRR details to paymentResult
      paymentResult.taxDuration = taxDuration
      if (rrr) paymentResult.rrr = rrr
      if (tin) paymentResult.tin = tin
      if (state) paymentResult.state = state
      
      setPaymentData(paymentResult)
      setShowReceipt(true)
      setProcessing(false)
    } catch (error) {
      console.error("Payment processing error:", error)
      toast.error("Payment failed. Please try again.")
      setProcessing(false)
    }
  }

  const handleCloseReceipt = () => {
    // Clear any remaining localStorage data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tax_payment_step')
      localStorage.removeItem('tax_payment_period')
      localStorage.removeItem('tax_payment_amount')
      localStorage.removeItem('tax_payment_method')
      localStorage.removeItem('tax_payment_calculated')
      localStorage.removeItem('tax_payment_calculated_full')
      localStorage.removeItem('tax_payment_tab')
      localStorage.removeItem('tax_payment_tax_duration')
    }
    
    setShowReceipt(false)
    router.push("/dashboard")
  }

  // Helper function to extract year from taxDuration
  const extractYear = (taxDuration: string): number | null => {
    const yearMatch = taxDuration.match(/\b(20\d{2})\b/)
    return yearMatch ? parseInt(yearMatch[1]) : null
  }

  // Helper function to extract month index (0-11) from taxDuration
  const extractMonthIndex = (taxDuration: string): number | null => {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december']
    const lower = taxDuration.toLowerCase()
    for (let i = 0; i < monthNames.length; i++) {
      if (lower.includes(monthNames[i])) {
        return i
      }
    }
    return null
  }

  // Helper function to extract quarter number (1-4) from taxDuration
  const extractQuarter = (taxDuration: string): number | null => {
    // Try "Q1", "Q2", etc.
    const qMatch = taxDuration.match(/Q(\d+)/i)
    if (qMatch) {
      return parseInt(qMatch[1])
    }
    // Try "Jan-Mar", "Apr-Jun", etc.
    if (taxDuration.includes('Jan-Mar')) return 1
    if (taxDuration.includes('Apr-Jun')) return 2
    if (taxDuration.includes('Jul-Sep')) return 3
    if (taxDuration.includes('Oct-Dec')) return 4
    return null
  }

  // Helper function to check if a payment matches a tax period
  const paymentMatchesPeriod = (
    payment: any,
    calculatedTaxDuration: string,
    calculatedPeriod: 'monthly' | 'quarterly' | 'yearly'
  ): boolean => {
    // First check if period matches
    if (payment.period !== calculatedPeriod) return false
    
    const paymentDuration = payment.taxDuration || ''
    const calculatedDuration = calculatedTaxDuration || ''
    
    // Try exact match first (case-insensitive, trimmed)
    if (paymentDuration.trim().toLowerCase() === calculatedDuration.trim().toLowerCase()) {
      return true
    }
    
    // Extract year from both
    const paymentYear = extractYear(paymentDuration)
    const calculatedYear = extractYear(calculatedDuration)
    
    if (!paymentYear || !calculatedYear || paymentYear !== calculatedYear) {
      return false
    }
    
    // For monthly: match by month name and year
    if (calculatedPeriod === 'monthly') {
      const paymentMonth = extractMonthIndex(paymentDuration)
      const calculatedMonth = extractMonthIndex(calculatedDuration)
      return paymentMonth !== null && calculatedMonth !== null && paymentMonth === calculatedMonth
    }
    
    // For quarterly: match by quarter number and year
    if (calculatedPeriod === 'quarterly') {
      const paymentQ = extractQuarter(paymentDuration)
      const calculatedQ = extractQuarter(calculatedDuration)
      return paymentQ !== null && calculatedQ !== null && paymentQ === calculatedQ
    }
    
    // For yearly: match by year only
    if (calculatedPeriod === 'yearly') {
      return paymentYear === calculatedYear
    }
    
    return false
  }

  // Calculate outstanding tax payments
  const loadOutstandingTaxes = async () => {
    if (!user?.uid || !profile?.userId || !profile?.businessType) return

    setLoadingOutstanding(true)
    try {
      const currentYear = new Date().getFullYear()
      
      // Get all completed payments for the current year
      const payments = await taxPaymentService.getUserPaymentsSimple(user.uid)
      const completedPayments = payments.filter(p => p.status === 'completed')
      
      console.log('Completed payments:', completedPayments.map(p => ({
        taxDuration: p.taxDuration,
        period: p.period,
        amount: p.amount
      })))
      
      // Calculate taxes due for monthly, quarterly, and yearly periods
      const outstanding: Array<{
        period: string
        taxDuration: string
        amount: number
        periodType: 'monthly' | 'quarterly' | 'yearly'
      }> = []

      // Check monthly outstanding
      const monthlyTaxes = await calculatePeriodTaxes(
        user.uid,
        'monthly',
        currentYear,
        profile.businessType as 'freelancer' | 'creator' | 'small-business' | 'sme'
      )
      
      console.log('Calculated monthly taxes:', monthlyTaxes.map(t => ({
        taxDuration: t.taxDuration,
        amount: t.amount
      })))
      
      for (const monthTax of monthlyTaxes) {
        // Check if payment exists for this taxDuration using flexible matching
        const hasPayment = completedPayments.some(
          p => paymentMatchesPeriod(p, monthTax.taxDuration, 'monthly')
        )
        
        if (!hasPayment && monthTax.amount > 0) {
          outstanding.push({
            period: monthTax.period,
            taxDuration: monthTax.taxDuration,
            amount: monthTax.amount,
            periodType: 'monthly'
          })
        }
      }

      // Check quarterly outstanding
      const quarterlyTaxes = await calculatePeriodTaxes(
        user.uid,
        'quarterly',
        currentYear,
        profile.businessType as 'freelancer' | 'creator' | 'small-business' | 'sme'
      )
      
      console.log('Calculated quarterly taxes:', quarterlyTaxes.map(t => ({
        taxDuration: t.taxDuration,
        amount: t.amount
      })))
      
      for (const quarterTax of quarterlyTaxes) {
        const hasPayment = completedPayments.some(
          p => paymentMatchesPeriod(p, quarterTax.taxDuration, 'quarterly')
        )
        
        if (!hasPayment && quarterTax.amount > 0) {
          outstanding.push({
            period: quarterTax.period,
            taxDuration: quarterTax.taxDuration,
            amount: quarterTax.amount,
            periodType: 'quarterly'
          })
        }
      }

      // Check yearly outstanding (only for current year)
      const yearlyTaxes = await calculatePeriodTaxes(
        user.uid,
        'yearly',
        currentYear,
        profile.businessType as 'freelancer' | 'creator' | 'small-business' | 'sme'
      )
      
      console.log('Calculated yearly taxes:', yearlyTaxes.map(t => ({
        taxDuration: t.taxDuration,
        amount: t.amount
      })))
      
      for (const yearTax of yearlyTaxes) {
        const hasPayment = completedPayments.some(
          p => paymentMatchesPeriod(p, yearTax.taxDuration, 'yearly')
        )
        
        if (!hasPayment && yearTax.amount > 0) {
          outstanding.push({
            period: yearTax.period,
            taxDuration: yearTax.taxDuration,
            amount: yearTax.amount,
            periodType: 'yearly'
          })
        }
      }

      console.log('Outstanding taxes after matching:', outstanding)

      // Sort by amount (highest first) and then by period
      outstanding.sort((a, b) => {
        if (b.amount !== a.amount) return b.amount - a.amount
        return a.taxDuration.localeCompare(b.taxDuration)
      })

      setOutstandingTaxes(outstanding)
    } catch (error) {
      console.error('Error loading outstanding taxes:', error)
      toast.error('Failed to load outstanding tax information')
    } finally {
      setLoadingOutstanding(false)
    }
  }

  useEffect(() => {
    if (user?.uid && profile?.userId && !showValidation) {
      loadOutstandingTaxes()
    }
  }, [user?.uid, profile?.userId, showValidation])

  // Check for duplicate payment
  const checkDuplicatePayment = async (period: string, taxDuration: string): Promise<{ isDuplicate: boolean; payment?: any }> => {
    if (!user?.uid) {
      return { isDuplicate: false }
    }

    try {
      // Get all payments for this user using simple query (no index required)
      const payments = await taxPaymentService.getUserPaymentsSimple(user.uid)
      
      if (payments && payments.length > 0) {
        // Check if any payment exists with the same period and taxDuration
        const duplicate = payments.find(payment => 
          payment.period === period && 
          payment.taxDuration === taxDuration &&
          payment.status === 'completed'
        )
        
        if (duplicate) {
          return { isDuplicate: true, payment: duplicate }
        }
      }
      
      return { isDuplicate: false }
    } catch (error) {
      console.error('Error checking duplicate payment:', error)
      return { isDuplicate: false }
    }
  }

  return (
    <>
      {/* Receipt Modal */}
      {showReceipt && paymentData && (
        <PaymentReceipt 
          paymentData={paymentData} 
          onDownload={() => {}} 
          onClose={handleCloseReceipt}
        />
      )}

      {/* Main Content */}
      <div className=" px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        {showValidation ? (
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold">System Checks</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Please ensure all requirements are met before generating RRR
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                {checking || profileLoading ? (
                  <div className="flex items-center justify-center py-4 sm:py-6 md:py-8">
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 animate-spin text-primary" />
                    <span className="ml-2 text-xs sm:text-sm text-muted-foreground">Checking requirements...</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
                    {systemChecks.filter(check => !check.status).length > 0 ? (
                      <>
                        <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-2.5 sm:p-3 md:p-4">
                          <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-amber-600 dark:text-amber-400" />
                          <AlertTitle className="text-xs sm:text-sm md:text-base text-amber-800 dark:text-amber-200 font-medium">
                            Action Required
                          </AlertTitle>
                          <AlertDescription className="text-[11px] sm:text-xs md:text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Please complete the following requirements before generating RRR
                          </AlertDescription>
                        </Alert>

                        <Accordion type="single" collapsible className="w-full">
                          {systemChecks
                            .filter(check => !check.status)
                            .map((check, index) => (
                              <AccordionItem key={index} value={`check-${index}`}>
                                <AccordionTrigger className="hover:no-underline px-2 sm:px-3 md:px-4 py-2.5 sm:py-3">
                                  <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 w-full">
                                    <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                    <span className="font-medium text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                                      {check.name}
                                    </span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 sm:px-3 md:px-4 pb-2.5 sm:pb-3">
                                  <div className="pl-5 sm:pl-6 md:pl-8 space-y-2 sm:space-y-2.5 md:space-y-3">
                                    <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed">{check.message}</p>
                                    {check.actionUrl && check.actionLabel && (
                                      <Link href={check.actionUrl}>
                                        <Button variant="outline" size="sm" className="h-8 sm:h-9 text-[11px] sm:text-xs md:text-sm">
                                          {check.actionLabel}
                                        </Button>
                                      </Link>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                        </Accordion>
                      </>
                    ) : (
                      <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-2.5 sm:p-3 md:p-4">
                        <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
                        <AlertTitle className="text-xs sm:text-sm md:text-base text-green-800 dark:text-green-200 font-medium">
                          All Checks Passed
                        </AlertTitle>
                        <AlertDescription className="text-[11px] sm:text-xs md:text-sm text-green-700 dark:text-green-300 mt-1">
                          You're ready to generate RRR and proceed with payment
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2.5 md:gap-3 pt-2.5 sm:pt-3 md:pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowValidation(false)}
                        className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleProceedToRRR}
                        disabled={!allChecksPassed}
                        className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
                      >
                        Proceed to Generate RRR
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Back Button - Desktop Only */}
            <div className="hidden md:block mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="h-8 text-xs sm:text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
            <Card className="p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 sm:mb-1.5 md:mb-2">Pay Your Tax</h1>
                  <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed">
                    Select your payment period and we'll calculate the amount based on your transactions, or enter it manually.
                  </p>
                </div>
              </div>
            </Card>

            {/* Outstanding Taxes Alert */}
            {loadingOutstanding ? (
              <Card>
                <CardContent className="pt-3 sm:pt-4 md:pt-6 p-3 sm:p-4 md:p-6">
                  <div className="flex items-center justify-center py-2.5 sm:py-3 md:py-4">
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 animate-spin text-muted-foreground mr-2" />
                    <span className="text-[11px] sm:text-xs md:text-sm text-muted-foreground">Checking outstanding taxes...</span>
                  </div>
                </CardContent>
              </Card>
            ) : outstandingTaxes.length > 0 ? (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <CardTitle className="text-sm sm:text-base md:text-lg text-amber-800 dark:text-amber-200 font-semibold">
                      Outstanding Tax Payments
                    </CardTitle>
                  </div>
                  <CardDescription className="text-[11px] sm:text-xs md:text-sm text-amber-700 dark:text-amber-300 mt-0.5 sm:mt-1">
                    You have {outstandingTaxes.length} outstanding tax payment{outstandingTaxes.length !== 1 ? 's' : ''} to make
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                  <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                    {outstandingTaxes.map((outstanding, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-white dark:bg-gray-900 rounded-lg border border-amber-200 dark:border-amber-800"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-medium text-[11px] sm:text-xs md:text-sm text-foreground truncate">
                            {outstanding.taxDuration}
                          </p>
                          <p className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground capitalize mt-0.5">
                            {outstanding.periodType} payment
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-[11px] sm:text-xs md:text-sm text-amber-600 dark:text-amber-400">
                            {formatCurrencyAmount(outstanding.amount, 'NGN')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-amber-200 dark:border-amber-800">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[11px] sm:text-xs md:text-sm text-foreground">Total Outstanding</p>
                        <p className="font-bold text-xs sm:text-sm md:text-base lg:text-lg text-amber-600 dark:text-amber-400">
                          {formatCurrencyAmount(
                            outstandingTaxes.reduce((sum, tax) => sum + tax.amount, 0),
                            'NGN'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                <CardContent className="pt-3 sm:pt-4 md:pt-6 p-3 sm:p-4 md:p-6">
                  <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-xs sm:text-sm md:text-base text-green-800 dark:text-green-200">
                        No Outstanding Taxes
                      </p>
                      <p className="text-[11px] sm:text-xs md:text-sm text-green-700 dark:text-green-300 mt-0.5">
                        All tax payments for the current year are up to date.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <SimplifiedPaymentForm onContinue={handlePaymentFormContinue} />
          </div>
        )}
      </div>
    </>
  )
}

