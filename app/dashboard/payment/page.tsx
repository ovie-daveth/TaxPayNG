"use client"

import { useState, useEffect } from "react"
import { PaymentReceipt } from "@/components/tax-payment/payment-receipt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { SimplifiedPaymentForm } from "@/components/tax-payment/simplified-payment-form"
import { taxPaymentService, documentService } from "@/lib/services"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

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

    // 3. Check if KYC is uploaded (check for identity documents)
    try {
      const documentsResult = await documentService.getUserDocuments(user.uid)
      const documents = documentsResult.data || []
      const hasKYCDocuments = documents.some(doc => 
        doc.type === 'proof' || 
        doc.name?.toLowerCase().includes('id') ||
        doc.name?.toLowerCase().includes('passport') ||
        doc.name?.toLowerCase().includes('license') ||
        doc.originalName?.toLowerCase().includes('id') ||
        doc.originalName?.toLowerCase().includes('passport') ||
        doc.originalName?.toLowerCase().includes('license')
      )
      
      checks.push({
        name: "KYC Documents",
        status: hasKYCDocuments,
        message: hasKYCDocuments
          ? "KYC documents are uploaded"
          : "Please upload your identity documents (ID, Passport, or Driver's License)",
        actionUrl: !hasKYCDocuments ? "/dashboard/documents" : undefined,
        actionLabel: !hasKYCDocuments ? "Upload Documents" : undefined
      })
    } catch (error) {
      console.error("Error checking KYC documents:", error)
      checks.push({
        name: "KYC Documents",
        status: false,
        message: "Unable to verify KYC documents",
        actionUrl: "/dashboard/documents",
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
      <div className="container mx-auto px-4 py-6 ">
        <Button 
          variant="ghost" 
          onClick={() => {
            if (showValidation) {
              setShowValidation(false)
            } else {
              router.back()
            }
          }}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {showValidation ? (
          <div className="space-y-6 max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>System Checks</CardTitle>
                <CardDescription>
                  Please ensure all requirements are met before generating RRR
                </CardDescription>
              </CardHeader>
              <CardContent>
                {checking || profileLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Checking requirements...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {systemChecks.filter(check => !check.status).length > 0 ? (
                      <>
                        <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <AlertTitle className="text-amber-800 dark:text-amber-200">
                            Action Required
                          </AlertTitle>
                          <AlertDescription className="text-amber-700 dark:text-amber-300">
                            Please complete the following requirements before generating RRR
                          </AlertDescription>
                        </Alert>

                        <Accordion type="single" collapsible className="w-full">
                          {systemChecks
                            .filter(check => !check.status)
                            .map((check, index) => (
                              <AccordionItem key={index} value={`check-${index}`}>
                                <AccordionTrigger className="hover:no-underline">
                                  <div className="flex items-center gap-3 w-full">
                                    <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                    <span className="font-medium text-amber-800 dark:text-amber-200">
                                      {check.name}
                                    </span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="pl-8 space-y-3">
                                    <p className="text-sm text-muted-foreground">{check.message}</p>
                                    {check.actionUrl && check.actionLabel && (
                                      <Link href={check.actionUrl}>
                                        <Button variant="outline" size="sm">
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
                      <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertTitle className="text-green-800 dark:text-green-200">
                          All Checks Passed
                        </AlertTitle>
                        <AlertDescription className="text-green-700 dark:text-green-300">
                          You're ready to generate RRR and proceed with payment
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowValidation(false)}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleProceedToRRR}
                        disabled={!allChecksPassed}
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
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Pay Your Tax</h1>
                  <p className="text-muted-foreground">
                    Select your payment period and we'll calculate the amount based on your transactions, or enter it manually.
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => router.push("/dashboard/payment/history")}
                >
                  View Payment History
                </Button>
              </div>
            </Card>
            
            <SimplifiedPaymentForm onContinue={handlePaymentFormContinue} />
          </div>
        )}
      </div>
    </>
  )
}

