"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle2, UserCheck, MessageSquare, Eye, CreditCard, Info } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"

interface AgentPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPaymentSuccess: () => void
  reportId: string
  amount?: number // Default is 25,000 if not provided
}

export function AgentPaymentModal({ 
  open, 
  onOpenChange, 
  onPaymentSuccess, 
  reportId,
  amount = 25000 
}: AgentPaymentModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [hasPaid, setHasPaid] = useState(false)

  useEffect(() => {
    if (open && reportId && user?.uid) {
      checkExistingPayment()
    }
  }, [open, reportId, user?.uid])

  const checkExistingPayment = async () => {
    if (!reportId || !user?.uid) return
    
    setCheckingPayment(true)
    try {
      const response = await fetch(`/api/filing/check-agent-payment?reportId=${reportId}&userId=${user.uid}`)
      const data = await response.json()
      
      if (data.success && data.hasPaid) {
        setHasPaid(true)
      }
    } catch (error) {
      console.error("Error checking payment:", error)
    } finally {
      setCheckingPayment(false)
    }
  }

  const handlePayment = async () => {
    if (!user?.uid) {
      toast.error("Please log in to continue")
      return
    }

    setLoading(true)
    try {
      // Initialize payment with Paystack
      const response = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount * 100, // Convert to kobo
          email: user.email,
          metadata: {
            userId: user.uid,
            reportId: reportId,
            purpose: "agent_filing_fee",
            description: `Agent Filing Fee for Report ${reportId.substring(0, 8)}`
          }
        })
      })

      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize payment")
      }

      // Load Paystack inline
      // Hide this modal temporarily so Paystack modal can be on top
      onOpenChange(false)
      
      const handler = (globalThis as any).PaystackPop?.setup({
        key: data.publicKey,
        email: user.email,
        amount: amount * 100,
        ref: data.reference,
        metadata: {
          userId: user.uid,
          reportId: reportId,
          purpose: "agent_filing_fee"
        },
        onClose: function() {
          // Reopen this modal if payment was cancelled
          onOpenChange(true)
          setLoading(false)
          toast.message("Payment cancelled")
        },
        callback: function(response: any) {
          // Call verification in a separate function
          verifyPayment(response.reference)
        }
      })

      const verifyPayment = async (reference: string) => {
        try {
          // Verify payment
          const verifyResponse = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reference: reference,
              reportId: reportId,
              userId: user.uid,
              purpose: "agent_filing_fee"
            })
          })

          const verifyData = await verifyResponse.json()

          if (verifyData.success) {
            setHasPaid(true)
            toast.success("Payment successful!")
            
            // Wait a moment to show success state
            setTimeout(() => {
              onPaymentSuccess()
            }, 1000)
          } else {
            throw new Error(verifyData.error || "Payment verification failed")
          }
        } catch (error) {
          console.error("Payment verification error:", error)
          toast.error(error instanceof Error ? error.message : "Payment verification failed")
        } finally {
          setLoading(false)
        }
      }

      handler?.openIframe()
    } catch (error) {
      console.error("Payment error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to process payment")
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (hasPaid) {
      onPaymentSuccess()
    } else {
      handlePayment()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            File via Agent Service
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Professional agents will handle your tax filing from start to finish
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {checkingPayment ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}
          
          {!checkingPayment && hasPaid ? (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">Payment Confirmed</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300 text-xs sm:text-sm">
                Your agent filing fee has been paid. Click continue to select supporting documents.
              </AlertDescription>
            </Alert>
          ) : null}
          
          {!checkingPayment && !hasPaid ? (
            <>
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800 dark:text-blue-200 text-sm">How It Works</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-300 text-xs sm:text-sm space-y-2 mt-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>A qualified agent will be assigned to your filing request</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Track progress and communicate with your agent in real-time</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Eye className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Monitor status updates from submission to completion</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <UserCheck className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Professional filing with compliance guarantee</span>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                <h4 className="font-semibold text-sm sm:text-base">Service Fee</h4>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Agent Filing Fee</span>
                  <span className="text-2xl font-bold">₦{amount.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  One-time fee for professional agent filing service
                </p>
              </div>

              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                <CreditCard className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-200 text-sm">Payment Required</AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs sm:text-sm">
                Your payment is tracked and you can return to continue your filing anytime.
                </AlertDescription>
              </Alert>
            </>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={loading || checkingPayment}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : null}
            {!loading && hasPaid ? "Continue" : null}
            {!loading && !hasPaid ? (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay ₦{amount.toLocaleString()}
              </>
            ) : null}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
