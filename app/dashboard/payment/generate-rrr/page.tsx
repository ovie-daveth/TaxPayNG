"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Loader2, Copy, Check, QrCode, CreditCard, Building2, Wallet } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { QRCodeSVG } from "qrcode.react"
import { RemitaPaymentModal } from "@/components/payment/remita-payment-modal"

interface RRRResponse {
  rrr: string
  validity: string
  amount: number
  taxType: string
  taxYear: number
  paymentMode: string
}

export default function GenerateRRRPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [rrrData, setRrrData] = useState<RRRResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  
  // Payment data from localStorage
  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "",
    period: "",
    taxDuration: "",
    taxCalculation: null as any
  })
  
  const [formData, setFormData] = useState({
    taxType: "PIT Payment",
    year: new Date().getFullYear().toString(),
    paymentMode: "card",
    amount: ""
  })
  const [amountDisplay, setAmountDisplay] = useState("")

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load payment data from localStorage
      const amount = localStorage.getItem('payment_amount') || ""
      const method = localStorage.getItem('payment_method') || ""
      const period = localStorage.getItem('payment_period') || ""
      const taxDuration = localStorage.getItem('payment_taxDuration') || ""
      const taxCalculationStr = localStorage.getItem('payment_taxCalculation')
      
      setPaymentData({
        amount,
        method,
        period,
        taxDuration,
        taxCalculation: taxCalculationStr ? JSON.parse(taxCalculationStr) : null
      })
      
      if (amount) {
        setFormData(prev => ({ ...prev, amount }))
        const num = parseFloat(amount)
        if (!isNaN(num)) {
          const formatted = num.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })
          setAmountDisplay(formatted)
        }
      }
      
      // Only set loading to false after profile has loaded
      if (!profileLoading) {
        setLoading(false)
      }
    }
  }, [profileLoading])

  const handleGenerateRRR = async () => {
    if (!user?.uid || !profile) {
      toast.error("Please complete your profile")
      return
    }

    const amount = parseFloat(formData.amount)
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    // Validate required user information
    const taxId = profile.taxId
    const name = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || user.displayName || ""
    const email = user.email || ""

    if (!taxId || typeof taxId !== 'string' || taxId.trim().length === 0) {
      toast.error("Please add your TIN number in your profile settings")
      return
    }

    if (!name) {
      toast.error("Please add your name in your profile settings")
      return
    }

    if (!email) {
      toast.error("Please ensure your email is set in your account")
      return
    }

    setGenerating(true)
    try {
      const response = await fetch("/api/payment/rrr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          taxType: formData.taxType,
          taxYear: parseInt(formData.year),
          paymentMode: formData.paymentMode,
          userInfo: {
            tin: taxId || "",
            name,
            email,
            phone: profile.phone || ""
          },
          paymentData: {
            period: paymentData.period,
            taxDuration: paymentData.taxDuration,
            method: paymentData.method
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate RRR")
      }

      const data: RRRResponse = await response.json()
      setRrrData(data)
      toast.success("RRR generated successfully")
    } catch (error: any) {
      console.error("Error generating RRR:", error)
      toast.error(error.message || "Failed to generate RRR")
    } finally {
      setGenerating(false)
    }
  }

  const copyRRR = () => {
    if (rrrData?.rrr) {
      navigator.clipboard.writeText(rrrData.rrr)
      setCopied(true)
      toast.success("RRR copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePaymentSuccess = async (receipt: any) => {
    // Call payment confirmation API
    try {
      const response = await fetch('/api/payment/rrr/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rrr: rrrData?.rrr || "",
          status: 'PAID',
          transactionRef: receipt.transactionRef || "",
          amount: parseFloat(formData.amount),
          paymentType: 'regular',
          paymentData: {
            period: paymentData.period,
            taxDuration: paymentData.taxDuration,
            method: paymentData.method
          },
          userId: user?.uid
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to confirm payment')
      }

      // Navigate to payment success page with payment details
      const params = new URLSearchParams({
        rrr: rrrData?.rrr || "",
        transactionRef: receipt.transactionRef || "",
        amount: formData.amount,
        period: paymentData.period,
        taxDuration: paymentData.taxDuration
      })
      router.push(`/dashboard/payment/payment-success?${params.toString()}`)
    } catch (error) {
      console.error('Error confirming payment:', error)
      toast.error('Payment successful but failed to save. Please contact support.')
      // Still navigate to success page
      const params = new URLSearchParams({
        rrr: rrrData?.rrr || "",
        transactionRef: receipt.transactionRef || "",
        amount: formData.amount,
        period: paymentData.period,
        taxDuration: paymentData.taxDuration
      })
      router.push(`/dashboard/payment/payment-success?${params.toString()}`)
    }
  }

  if (loading || profileLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate RRR for Tax Payment</CardTitle>
            <CardDescription>
              Generate a Remita Retrieval Reference (RRR) for your tax payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!rrrData ? (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="taxType">Tax Type</Label>
                    <Select
                      value={formData.taxType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, taxType: value }))}
                      disabled={generating}
                    >
                      <SelectTrigger id="taxType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PIT Payment">PIT Payment</SelectItem>
                        <SelectItem value="PAYE">PAYE</SelectItem>
                        <SelectItem value="Provisional Tax">Provisional Tax</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Tax Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                      disabled={generating}
                      min="2020"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMode">Payment Mode</Label>
                    <Select
                      value={formData.paymentMode}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMode: value }))}
                      disabled={generating}
                    >
                      <SelectTrigger id="paymentMode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            <span>Card</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="bank">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            <span>Bank</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Tax Amount (₦)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                      <Input
                        id="amount"
                        type="text"
                        value={amountDisplay || formData.amount}
                        onChange={(e) => {
                          const value = e.target.value
                          // Remove all non-digit characters except decimal point
                          const cleaned = value.replace(/[^\d.]/g, "")
                          
                          // Prevent multiple decimal points
                          const parts = cleaned.split(".")
                          if (parts.length > 2) return
                          
                          // Limit decimal places to 2
                          if (parts[1] && parts[1].length > 2) return
                          
                          // Store raw value
                          setFormData(prev => ({ ...prev, amount: cleaned }))
                          
                          // Format for display (add commas)
                          if (cleaned === "") {
                            setAmountDisplay("")
                          } else {
                            const num = parseFloat(cleaned)
                            if (!isNaN(num)) {
                              const formatted = num.toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2
                              })
                              setAmountDisplay(formatted)
                            } else {
                              setAmountDisplay(cleaned)
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // Ensure proper formatting on blur
                          const value = formData.amount
                          if (value) {
                            const num = parseFloat(value)
                            if (!isNaN(num)) {
                              const formatted = num.toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2
                              })
                              setAmountDisplay(formatted)
                            }
                          }
                        }}
                        disabled={generating}
                        placeholder="Enter tax amount"
                        className="pl-8"
                      />
                    </div>
                    {paymentData.amount && (
                      <p className="text-xs text-muted-foreground">
                        Suggested amount: ₦{parseFloat(paymentData.amount).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {paymentData.taxDuration && (
                    <Alert>
                      <AlertDescription>
                        <strong>Payment Period:</strong> {paymentData.taxDuration} ({paymentData.period})
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Button
                  onClick={handleGenerateRRR}
                  disabled={generating || !formData.amount || parseFloat(formData.amount) <= 0}
                  className="w-full"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating RRR...
                    </>
                  ) : (
                    "Generate RRR"
                  )}
                </Button>
              </>
            ) : (
              <>
                <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    RRR generated successfully! You can now proceed with payment.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">RRR Number</p>
                      <p className="text-2xl font-bold font-mono">{rrrData.rrr}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyRRR}
                      className="flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="text-xl font-semibold">₦{rrrData.amount.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Valid Until</p>
                      <p className="text-xl font-semibold">
                        {new Date(rrrData.validity).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center p-6 bg-muted rounded-lg">
                    <QRCodeSVG value={rrrData.rrr} size={200} />
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full"
                      size="lg"
                    >
                      Pay Now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRrrData(null)
                        setFormData(prev => ({ ...prev, amount: "" }))
                        setAmountDisplay("")
                      }}
                      className="w-full"
                    >
                      Generate New RRR
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {showPaymentModal && rrrData && user && (
        <RemitaPaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          rrr={rrrData.rrr}
          amount={rrrData.amount}
          onSuccess={handlePaymentSuccess}
          paymentType="regular"
          paymentData={{
            period: paymentData.period,
            taxDuration: paymentData.taxDuration,
            method: paymentData.method
          }}
          userId={user.uid}
        />
      )}
    </div>
  )
}

