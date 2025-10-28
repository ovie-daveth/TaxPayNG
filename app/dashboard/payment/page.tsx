"use client"

import { useState } from "react"
import { PaymentReceipt } from "@/components/tax-payment/payment-receipt"
import { Card } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { TaxPaymentForm } from "@/components/tax-payment/tax-payment-form"
import { taxPaymentService } from "@/lib/services"
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "sonner"

interface PaymentData {
  amount: number
  tips: string[]
  status: string
  transactionId: string
  method: string
  taxDuration: string
  timestamp: string
}

export default function PaymentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [showReceipt, setShowReceipt] = useState(false)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [processing, setProcessing] = useState(false)

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

  const handlePay = async (amount: number, method: string, period: string, taxDuration: string, taxCalculation?: any) => {
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
      
      // Add taxDuration to paymentResult
      paymentResult.taxDuration = taxDuration
      
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
    <div className="container mx-auto px-4 py-6 ">
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {!showReceipt ? (
        <div className="space-y-6">
          <Card className="p-6">
            <h1 className="text-3xl font-bold mb-2">Pay Your Tax</h1>
            <p className="text-muted-foreground">
              Complete your tax payment through our secure payment gateways
            </p>
          </Card>
          
          <TaxPaymentForm 
            onPay={handlePay} 
            processing={processing}
            onCheckDuplicate={checkDuplicatePayment}
          />
        </div>
      ) : paymentData ? (
        <PaymentReceipt 
          paymentData={paymentData} 
          onDownload={() => {}} 
          onClose={handleCloseReceipt}
        />
      ) : null}
    </div>
  )
}

