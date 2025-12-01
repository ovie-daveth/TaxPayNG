"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Download, FileText, Mail, UserCheck, Loader2, ArrowLeft, FileCheck } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { reportService, documentService } from "@/lib/services"
import { SavedReport } from "@/lib/types"
import { toast } from "sonner"
import Link from "next/link"
import { format } from "date-fns"
import jsPDF from "jspdf"
import { uploadToImageKit } from "@/lib/utils/imagekit"

interface PaymentData {
  rrr: string
  transactionRef: string
  amount: number
  timestamp: string
}

// States with digital filing capabilities
const STATES_WITH_DIGITAL_FILING = ["Lagos", "FCT", "Rivers", "Kano"]

export default function PaymentSuccessPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const reportId = params?.reportId as string
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [report, setReport] = useState<SavedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingReceipt, setSavingReceipt] = useState(false)
  const [receiptSaved, setReceiptSaved] = useState(false)
  const [selectedState, setSelectedState] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [submissionMethod, setSubmissionMethod] = useState<"direct" | "agent" | "email" | null>(null)

  const paymentData: PaymentData = {
    rrr: searchParams.get("rrr") || "",
    transactionRef: searchParams.get("transactionRef") || "",
    amount: parseFloat(searchParams.get("amount") || "0"),
    timestamp: new Date().toISOString()
  }

  useEffect(() => {
    if (reportId && profile?.userId) {
      loadReport()
    }
    if (profile?.address?.state) {
      setSelectedState(profile.address.state)
    }
  }, [reportId, profile?.userId, profile?.address?.state])

  const loadReport = async () => {
    if (!reportId || !profile?.userId) return

    try {
      setLoading(true)
      const loadedReport = await reportService.getReportById(reportId, 'Self-Assessment')
      if (loadedReport) {
        setReport(loadedReport)
      }
    } catch (error) {
      console.error("Error loading report:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateReceiptPDF = async (): Promise<Blob> => {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(20)
    doc.text("OTax Payment Receipt", 105, 20, { align: "center" })
    
    doc.setFontSize(12)
    doc.text("Tax Payment Confirmation", 105, 30, { align: "center" })
    
    // Payment Details
    let yPos = 50
    doc.setFontSize(10)
    doc.text(`RRR Number: ${paymentData.rrr}`, 20, yPos)
    yPos += 10
    doc.text(`Transaction Reference: ${paymentData.transactionRef}`, 20, yPos)
    yPos += 10
    doc.text(`Amount Paid: ₦${paymentData.amount.toLocaleString()}`, 20, yPos)
    yPos += 10
    doc.text(`Payment Date: ${format(new Date(paymentData.timestamp), "PPP")}`, 20, yPos)
    yPos += 10
    doc.text(`Status: PAID`, 20, yPos)
    
    // Footer
    doc.setFontSize(8)
    doc.text("This is an official receipt for tax payment", 105, 280, { align: "center" })
    
    return doc.output("blob")
  }

  const saveReceiptAsDocument = async () => {
    if (!user?.uid || receiptSaved) return

    setSavingReceipt(true)
    try {
      const receiptBlob = await generateReceiptPDF()
      const receiptFile = new File([receiptBlob], `tax-payment-receipt-${paymentData.rrr}.pdf`, { type: "application/pdf" })

      // Upload to ImageKit
      const uploadResult = await uploadToImageKit(receiptFile, `users/${user.uid}/receipts`)

      // Save to documents using documentService
      const result = await documentService.uploadDocument(user.uid, {
        file: receiptFile,
        name: `Tax Payment Receipt - ${paymentData.rrr}`,
        type: "proof",
        imageKitUrl: uploadResult.url,
        fileSize: uploadResult.size, // Use size from ImageKit upload result
        notes: `RRR: ${paymentData.rrr}, Transaction: ${paymentData.transactionRef}`,
        linkedTransaction: paymentData.transactionRef
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to save receipt")
      }

      setReceiptSaved(true)
      toast.success("Receipt saved to documents")
    } catch (error) {
      console.error("Error saving receipt:", error)
      toast.error("Failed to save receipt")
    } finally {
      setSavingReceipt(false)
    }
  }

  const handleDirectSubmission = async () => {
    if (!report || !selectedState) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/irs/submit-return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId: report.id,
          state: selectedState,
          rrr: paymentData.rrr,
          transactionRef: paymentData.transactionRef
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit return")
      }

      toast.success("Tax return submitted successfully to IRS")
      router.push(`/dashboard/reports/file/${reportId}/confirmation?acknowledgment=${data.acknowledgmentNumber}&amount=${paymentData.amount}`)
    } catch (error) {
      console.error("Error submitting return:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit return")
    } finally {
      setSubmitting(false)
    }
  }

  const handleAgentSubmission = async () => {
    if (!report || !selectedState) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/filing/agent/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.uid,
          state: selectedState,
          reportId: report.id,
          rrr: paymentData.rrr
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign agent")
      }

      toast.success("Filing agent assigned. You'll be notified of updates.")
      router.push(`/dashboard/reports/file/${reportId}/confirmation?ticketId=${data.ticketId}&amount=${paymentData.amount}`)
    } catch (error) {
      console.error("Error assigning agent:", error)
      toast.error(error instanceof Error ? error.message : "Failed to assign agent")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEmailSubmission = async () => {
    if (!report || !selectedState) return

    setSubmitting(true)
    try {
      const response = await fetch("/api/irs/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state: selectedState,
          reportId: report.id,
          rrr: paymentData.rrr,
          userInfo: {
            name: `${profile?.firstName} ${profile?.lastName}`,
            email: profile?.email || user?.email,
            tin: profile?.taxId
          }
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email")
      }

      toast.success("Tax return sent to IRS via email")
      router.push(`/dashboard/reports/file/${reportId}/confirmation?method=email&amount=${paymentData.amount}`)
    } catch (error) {
      console.error("Error sending email:", error)
      toast.error(error instanceof Error ? error.message : "Failed to send email")
    } finally {
      setSubmitting(false)
    }
  }

  const hasDigitalFiling = selectedState && STATES_WITH_DIGITAL_FILING.includes(selectedState)

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          <Link href={`/dashboard/reports/file/${reportId}/generate-rrr`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>

          {/* Payment Success Alert */}
          <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
            <AlertTitle className="text-green-800 dark:text-green-200">Payment Successful!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Your tax payment has been processed successfully. RRR: {paymentData.rrr}
            </AlertDescription>
          </Alert>

          {/* Receipt Section */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Receipt</CardTitle>
              <CardDescription>Download and save your payment receipt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">RRR Number</Label>
                  <p className="font-mono font-semibold">{paymentData.rrr}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Transaction Reference</Label>
                  <p className="font-mono font-semibold">{paymentData.transactionRef}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount Paid</Label>
                  <p className="font-bold text-lg">₦{paymentData.amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Date</Label>
                  <p className="font-medium">{format(new Date(paymentData.timestamp), "PPP")}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const receiptBlob = await generateReceiptPDF()
                    const url = URL.createObjectURL(receiptBlob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `tax-payment-receipt-${paymentData.rrr}.pdf`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </Button>
                <Button
                  variant="outline"
                  onClick={saveReceiptAsDocument}
                  disabled={savingReceipt || receiptSaved}
                >
                  {savingReceipt ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : receiptSaved ? (
                    <>
                      <FileCheck className="w-4 h-4 mr-2" />
                      Saved to Documents
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Save to Documents
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* IRS Submission Section */}
          <Card>
            <CardHeader>
              <CardTitle>Submit Tax Return to State IRS</CardTitle>
              <CardDescription>
                Complete your tax filing by submitting your return to the appropriate tax authority
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="state">State of Filing</Label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lagos">Lagos</SelectItem>
                    <SelectItem value="FCT">FCT (Abuja)</SelectItem>
                    <SelectItem value="Rivers">Rivers</SelectItem>
                    <SelectItem value="Kano">Kano</SelectItem>
                    <SelectItem value="Ogun">Ogun</SelectItem>
                    <SelectItem value="Oyo">Oyo</SelectItem>
                    <SelectItem value="Delta">Delta</SelectItem>
                    <SelectItem value="Kaduna">Kaduna</SelectItem>
                    <SelectItem value="Enugu">Enugu</SelectItem>
                    <SelectItem value="Anambra">Anambra</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedState && (
                <>
                  {hasDigitalFiling ? (
                    <div className="space-y-4">
                      <Alert>
                        <AlertDescription>
                          {selectedState} IRS supports digital filing. You can submit directly.
                        </AlertDescription>
                      </Alert>
                      <Button
                        onClick={handleDirectSubmission}
                        disabled={submitting}
                        className="w-full"
                        size="lg"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            Submit Directly to {selectedState} IRS
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Alert>
                        <AlertDescription>
                          {selectedState} IRS does not have a digital filing portal. Choose one of the options below.
                        </AlertDescription>
                      </Alert>

                      <div className="grid gap-4">
                        <Card className="border-2">
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <UserCheck className="w-5 h-5" />
                              Submit via OTax Agent (Recommended)
                            </CardTitle>
                            <CardDescription>
                              Our filing agent will handle the submission on your behalf
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Button
                              onClick={handleAgentSubmission}
                              disabled={submitting}
                              className="w-full"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Assigning Agent...
                                </>
                              ) : (
                                "Assign Filing Agent"
                              )}
                            </Button>
                          </CardContent>
                        </Card>

                        <Card className="border-2">
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Mail className="w-5 h-5" />
                              Send via Email
                            </CardTitle>
                            <CardDescription>
                              We'll email your return and supporting documents to the IRS
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Button
                              onClick={handleEmailSubmission}
                              disabled={submitting}
                              variant="outline"
                              className="w-full"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                "Send via Email"
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

