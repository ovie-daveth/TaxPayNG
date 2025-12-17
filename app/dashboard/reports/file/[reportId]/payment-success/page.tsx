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
import { DocumentSelectionModal } from "@/components/filing/document-selection-modal"

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
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])

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

  const handleAgentSubmission = () => {
    if (!report || !selectedState) return
    // Show document selection modal first
    setShowDocumentModal(true)
  }

  const handleDocumentSelection = async (documentIds: string[]) => {
    if (!report || !selectedState || !user?.uid) return

    setSelectedDocumentIds(documentIds)
    setShowDocumentModal(false)
    setSubmitting(true)

    try {
      const response = await fetch("/api/filing/agent/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          state: selectedState,
          reportId: report.id,
          rrr: paymentData.rrr,
          supportingDocuments: documentIds
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit filing request")
      }

      toast.success("Filing request submitted successfully. An agent will be assigned shortly.")
      router.push(`/dashboard/reports/file/${reportId}/confirmation?requestId=${data.requestId}&amount=${paymentData.amount}`)
    } catch (error) {
      console.error("Error submitting filing request:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit filing request")
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
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 max-w-4xl">
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Payment Success Alert */}
          <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3 sm:p-4">
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-500 shrink-0" />
            <AlertTitle className="text-xs sm:text-sm md:text-base text-green-800 dark:text-green-200 font-medium">Payment Successful!</AlertTitle>
            <AlertDescription className="text-[11px] sm:text-xs md:text-sm text-green-700 dark:text-green-300 mt-1">
              Your tax payment has been processed successfully. RRR: <span className="font-mono break-all">{paymentData.rrr}</span>
            </AlertDescription>
          </Alert>

          {/* Receipt Section */}
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">Payment Receipt</CardTitle>
              <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">Download and save your payment receipt</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-[11px] sm:text-xs md:text-sm text-muted-foreground">RRR Number</Label>
                  <p className="font-mono font-semibold text-xs sm:text-sm md:text-base break-all sm:break-normal mt-0.5 sm:mt-1">{paymentData.rrr}</p>
                </div>
                <div>
                  <Label className="text-[11px] sm:text-xs md:text-sm text-muted-foreground">Transaction Reference</Label>
                  <p className="font-mono font-semibold text-xs sm:text-sm md:text-base break-all sm:break-normal mt-0.5 sm:mt-1">{paymentData.transactionRef}</p>
                </div>
                <div>
                  <Label className="text-[11px] sm:text-xs md:text-sm text-muted-foreground">Amount Paid</Label>
                  <p className="font-bold text-base sm:text-lg md:text-xl text-primary mt-0.5 sm:mt-1">₦{paymentData.amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-[11px] sm:text-xs md:text-sm text-muted-foreground">Payment Date</Label>
                  <p className="font-medium text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">{format(new Date(paymentData.timestamp), "PPP")}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 md:gap-3">
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
                  className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Download Receipt
                </Button>
                <Button
                  variant="outline"
                  onClick={saveReceiptAsDocument}
                  disabled={savingReceipt || receiptSaved}
                  className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  {savingReceipt ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : receiptSaved ? (
                    <>
                      <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      Saved to Documents
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      Save to Documents
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* IRS Submission Section */}
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">Submit Tax Return to State IRS</CardTitle>
              <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">
                Complete your tax filing by submitting your return to the appropriate tax authority
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="state" className="text-[11px] sm:text-xs md:text-sm">State of Filing</Label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger id="state" className="h-9 sm:h-10 text-xs sm:text-sm">
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
                    <div className="space-y-3 sm:space-y-4">
                      <Alert className="p-2.5 sm:p-3 md:p-4">
                        <AlertDescription className="text-[11px] sm:text-xs md:text-sm">
                          {selectedState} IRS supports digital filing. You can submit directly.
                        </AlertDescription>
                      </Alert>
                      <Button
                        onClick={handleDirectSubmission}
                        disabled={submitting}
                        className="w-full h-10 sm:h-11 text-xs sm:text-sm md:text-base"
                        size="lg"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                            Submit Directly to {selectedState} IRS
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      <Alert className="p-2.5 sm:p-3 md:p-4">
                        <AlertDescription className="text-[11px] sm:text-xs md:text-sm">
                          {selectedState} IRS does not have a digital filing portal. Choose one of the options below.
                        </AlertDescription>
                      </Alert>

                      <div className="grid gap-3 sm:gap-4">
                        <Card className="border-2">
                          <CardHeader className="p-3 sm:p-4 md:p-6">
                            <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                              Submit via OTax Agent (Recommended)
                            </CardTitle>
                            <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">
                              Our filing agent will handle the submission on your behalf
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                            <Button
                              onClick={handleAgentSubmission}
                              disabled={submitting}
                              className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                                  Assigning Agent...
                                </>
                              ) : (
                                "Assign Filing Agent"
                              )}
                            </Button>
                          </CardContent>
                        </Card>

                        <Card className="border-2">
                          <CardHeader className="p-3 sm:p-4 md:p-6">
                            <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                              <Mail className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                              Send via Email
                            </CardTitle>
                            <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">
                              We'll email your return and supporting documents to the IRS
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                            <Button
                              onClick={handleEmailSubmission}
                              disabled={submitting}
                              variant="outline"
                              className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
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

      {/* Document Selection Modal */}
      {user?.uid && (
        <DocumentSelectionModal
          open={showDocumentModal}
          onOpenChange={setShowDocumentModal}
          onConfirm={handleDocumentSelection}
          userId={user.uid}
        />
      )}
    </div>
  )
}

