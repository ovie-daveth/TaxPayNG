"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Loader2, Copy, Check, QrCode, CreditCard, Building2, Wallet } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { reportService } from "@/lib/services"
import { SavedReport } from "@/lib/types"
import { toast } from "sonner"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { RemitaPaymentModal } from "@/components/payment/remita-payment-modal"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"

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
  const params = useParams()
  const pathname = usePathname()
  const basePath = pathname?.startsWith("/dashboard-creator")
    ? "/dashboard-creator"
    : pathname?.startsWith("/dashboard-sme")
      ? "/dashboard-sme"
      : "/dashboard"
  const reportId = params?.reportId as string
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const { hasAccess, loading: subscriptionLoading } = useSubscription()
  const [report, setReport] = useState<SavedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [rrrData, setRrrData] = useState<RRRResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentReceipt, setPaymentReceipt] = useState<any>(null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  
  const [formData, setFormData] = useState({
    taxType: "PIT Annual Return",
    year: new Date().getFullYear().toString(),
    paymentMode: "card",
    amount: ""
  })
  const [amountDisplay, setAmountDisplay] = useState("")

  useEffect(() => {
    if (reportId && profile?.userId) {
      loadReport()
    }
  }, [reportId, profile?.userId])

  const loadReport = async () => {
    if (!reportId || !profile?.userId) return

    try {
      setLoading(true)
      const loadedReport = await reportService.getReportById(reportId, 'Self-Assessment')
      
      if (!loadedReport) {
        toast.error("Report not found")
        router.push(`${basePath}/reports`)
        return
      }

      setReport(loadedReport)
      // Set year from report period
      if (loadedReport.reportData?.period?.year) {
        setFormData(prev => ({ ...prev, year: loadedReport.reportData.period.year.toString() }))
      }
      // Set default amount from balanceDue (if filed) or calculate from taxPayable
      const balanceDue = loadedReport.balanceDue
      let defaultAmount = ""
      if (balanceDue !== undefined && balanceDue > 0) {
        // Use balanceDue if report has been filed
        defaultAmount = balanceDue.toString()
      } else if (loadedReport.reportData?.tax?.taxPayable) {
        // Calculate balance: gross tax payable - taxes already paid
        const grossTaxPayable = loadedReport.reportData.tax.taxPayable
        const taxesAlreadyPaid = loadedReport.taxesAlreadyPaid || 0
        const balance = Math.max(0, grossTaxPayable - taxesAlreadyPaid)
        if (balance > 0) {
          defaultAmount = balance.toString()
        }
      }
      
      if (defaultAmount) {
        setFormData(prev => ({ ...prev, amount: defaultAmount }))
        // Format for display
        const num = parseFloat(defaultAmount)
        if (!isNaN(num)) {
          const formatted = num.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })
          setAmountDisplay(formatted)
        }
      }
    } catch (error) {
      console.error("Error loading report:", error)
      toast.error("Failed to load report")
      router.push(`${basePath}/reports`)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateRRR = async () => {
    // Check subscription first
    // Allow access for active free trial users too
    if (!subscriptionLoading && !hasAccess()) {
      setShowSubscriptionModal(true)
      return
    }

    if (!user?.uid || !profile || !report) {
      toast.error("Please ensure you're logged in and the report is loaded")
      return
    }

    const taxId = profile.taxId
    if (!taxId || typeof taxId !== 'string' || taxId.trim().length === 0) {
      toast.error("Please add your Tax Identification Number (TIN) in settings")
      return
    }

    setGenerating(true)
    try {
      const taxAmount = parseFloat(formData.amount) || 0
      
      if (taxAmount <= 0) {
        toast.error("Please enter a valid amount")
        setGenerating(false)
        return
      }
      
      const response = await fetch('/api/payment/rrr/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: taxAmount,
          taxType: formData.taxType,
          taxYear: parseInt(formData.year),
          paymentMode: formData.paymentMode,
          userInfo: {
            tin: profile.taxId,
            name: `${profile.firstName} ${profile.lastName}`,
            email: profile.email || user.email
          },
          reportId: reportId
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate RRR')
      }

      setRrrData(data)
      toast.success("RRR generated successfully")
    } catch (error) {
      console.error("Error generating RRR:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate RRR")
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyRRR = () => {
    if (rrrData?.rrr) {
      navigator.clipboard.writeText(rrrData.rrr)
      setCopied(true)
      toast.success("RRR copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePayNow = () => {
    if (!rrrData) return
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = async (receipt: any) => {
    setPaymentReceipt(receipt)
    // Redirect to payment confirmation page
    router.push(`${basePath}/reports/file/${reportId}/payment-success?rrr=${rrrData?.rrr}&transactionRef=${receipt.transactionRef}&amount=${rrrData?.amount || receipt.amount || 0}`)
  }

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background">
        <Card className="p-8 m-8">
          <Alert>
            <AlertDescription>
              Report not found. Please go back and try again.
            </AlertDescription>
          </Alert>
          <Button onClick={() => router.push(`${basePath}/reports`)} className="mt-4">
            Back to Reports
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 py-6">
        <div className="space-y-6">

          <Card>
            <CardHeader>
              <CardTitle>RRR Payment Setup</CardTitle>
              <CardDescription>
                Generate your Remita Retrieval Reference (RRR) to proceed with tax payment
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
                          <SelectItem value="PIT Annual Return">PIT Annual Return</SelectItem>
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
                        max={new Date().getFullYear()}
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
                          <SelectItem value="transfer">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              <span>Transfer</span>
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
                      {report.balanceDue !== undefined && report.balanceDue > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Balance due: ₦{report.balanceDue.toLocaleString()}
                        </p>
                      )}
                      {(!report.balanceDue || report.balanceDue === 0) && report.reportData?.tax?.taxPayable && (
                        <p className="text-xs text-muted-foreground">
                          Gross tax payable: ₦{report.reportData.tax.taxPayable.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button 
                    onClick={handleGenerateRRR}
                    disabled={generating || !formData.taxType || !formData.year || !formData.paymentMode || !formData.amount || parseFloat(formData.amount) <= 0}
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
                <div className="space-y-6">
                  <Alert>
                    <AlertDescription>
                      Your RRR has been generated successfully. Use this reference to complete your payment.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <Label className="text-sm text-muted-foreground">RRR Number</Label>
                        <p className="text-2xl font-bold font-mono mt-1">{rrrData.rrr}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyRRR}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="flex flex-col items-center p-6 bg-muted rounded-lg">
                      <QrCode className="w-6 h-6 mb-2 text-muted-foreground" />
                      <div className="bg-white p-4 rounded-lg">
                        <QRCodeSVG 
                          value={rrrData.rrr} 
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">
                        Scan this QR code to pay via Remita
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Validity</Label>
                        <p className="font-medium">{new Date(rrrData.validity).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Amount</Label>
                        <p className="font-medium">₦{rrrData.amount.toLocaleString()}</p>
                      </div>
                    </div>

                    <Button 
                      onClick={handlePayNow}
                      className="w-full"
                      size="lg"
                    >
                      Pay Now
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {rrrData && user && (
        <RemitaPaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          rrr={rrrData.rrr}
          amount={rrrData.amount}
          onPaymentSuccess={handlePaymentSuccess}
          paymentType="filing"
          reportId={reportId}
          userId={user.uid}
        />
      )}

      <SubscriptionRequiredModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        businessType={profile?.businessType || 'freelancer'}
      />
    </div>
  )
}

