"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface RemitaPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rrr: string
  amount: number
  reportId?: string
  paymentType?: "filing" | "regular"
  paymentData?: {
    period?: string
    taxDuration?: string
    method?: string
  }
  userId?: string
  onSuccess?: (receipt: PaymentReceipt) => void
  onPaymentSuccess?: (receipt: PaymentReceipt) => void
}

interface PaymentReceipt {
  transactionRef: string
  rrr: string
  amount: number
  status: string
  timestamp: string
  paymentMethod: string
}

export function RemitaPaymentModal({ 
  open, 
  onOpenChange, 
  rrr, 
  amount, 
  reportId, 
  paymentType = "filing",
  paymentData,
  userId,
  onSuccess,
  onPaymentSuccess 
}: RemitaPaymentModalProps) {
  // Support both onSuccess and onPaymentSuccess for backward compatibility
  const handleSuccess = onSuccess || onPaymentSuccess
  const [processing, setProcessing] = useState(false)
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    cardName: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: ""
  })

  const handlePayment = async () => {
    // Validate card details
    if (!cardDetails.cardNumber || !cardDetails.cardName || !cardDetails.expiryMonth || !cardDetails.expiryYear || !cardDetails.cvv) {
      toast.error("Please fill in all card details")
      return
    }

    if (cardDetails.cardNumber.replace(/\s/g, "").length < 16) {
      toast.error("Please enter a valid card number")
      return
    }

    setProcessing(true)

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Generate mock transaction reference
      const transactionRef = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`

      const receipt: PaymentReceipt = {
        transactionRef,
        rrr,
        amount,
        status: "PAID",
        timestamp: new Date().toISOString(),
        paymentMethod: "Card"
      }

      // Call webhook to confirm payment
      await fetch('/api/payment/rrr/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rrr,
          status: 'PAID',
          transactionRef,
          amount,
          reportId,
          paymentType,
          paymentData,
          userId
        }),
      })

      toast.success("Payment successful!")
      if (handleSuccess) {
        handleSuccess(receipt)
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Payment error:", error)
      toast.error("Payment failed. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Remita Payment</DialogTitle>
          <DialogDescription>
            Complete your payment using your card details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">RRR Number:</span>
                  <span className="font-mono font-semibold">{rrr}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="text-lg font-bold">₦{amount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.cardNumber}
                onChange={(e) => setCardDetails(prev => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }))}
                maxLength={19}
                disabled={processing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardName">Cardholder Name</Label>
              <Input
                id="cardName"
                placeholder="John Doe"
                value={cardDetails.cardName}
                onChange={(e) => setCardDetails(prev => ({ ...prev, cardName: e.target.value }))}
                disabled={processing}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryMonth">Month</Label>
                <Input
                  id="expiryMonth"
                  placeholder="MM"
                  value={cardDetails.expiryMonth}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 2)
                    if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 12)) {
                      setCardDetails(prev => ({ ...prev, expiryMonth: val }))
                    }
                  }}
                  maxLength={2}
                  disabled={processing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryYear">Year</Label>
                <Input
                  id="expiryYear"
                  placeholder="YY"
                  value={cardDetails.expiryYear}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 2)
                    setCardDetails(prev => ({ ...prev, expiryYear: val }))
                  }}
                  maxLength={2}
                  disabled={processing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  type="password"
                  value={cardDetails.cvv}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 3)
                    setCardDetails(prev => ({ ...prev, cvv: val }))
                  }}
                  maxLength={3}
                  disabled={processing}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={processing}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay ₦{amount.toLocaleString()}
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            <p>This is a mock payment. No actual charges will be made.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

