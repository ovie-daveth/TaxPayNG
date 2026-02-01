"use client"

import { useRef, useState, useEffect } from "react"
import { usePathname, useRouter, useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, Download, FileText, UserCheck, Loader2, ExternalLink, Check, XCircle, Printer, FileCheck } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useBusiness } from "@/lib/contexts/business-context"
import { reportService, documentService } from "@/lib/services"
import type { Document, SavedReport } from "@/lib/types"
import { SelfAssessmentPreview, type SelfAssessmentPreviewHandle } from "@/components/reports/self-assessment-preview"
import { toast } from "sonner"
import { format } from "date-fns"
import jsPDF from "jspdf"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { DocumentSelectionModal } from "@/components/filing/document-selection-modal"
import { PaymentPortalSelectorModal } from "@/components/payment/payment-portal-selector-modal"

interface PaymentData {
  rrr: string
  transactionRef: string
  amount: number
  timestamp: string
}

const NRS_PORTAL_URL = "https://selfservice.nrs.gov.ng/"

export default function PaymentSuccessPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const basePath = pathname?.startsWith("/dashboard-creator")
    ? "/dashboard-creator"
    : pathname?.startsWith("/dashboard-sme")
      ? "/dashboard-sme"
      : "/dashboard"
  const reportId = params?.reportId as string
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const { activeEntityId } = useBusiness()
  const [report, setReport] = useState<SavedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const selfAssessmentRef = useRef<SelfAssessmentPreviewHandle>(null)
  const [stateForPrint, setStateForPrint] = useState<string>("")
  const [savingReceipt, setSavingReceipt] = useState(false)
  const [receiptSaved, setReceiptSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [documentSelectMode, setDocumentSelectMode] = useState<"attachments" | "agent">("attachments")
  const [showNrsModal, setShowNrsModal] = useState(false)
  const [showFilingPortalModal, setShowFilingPortalModal] = useState(false)
  const [downloadingPack, setDownloadingPack] = useState(false)
  const [downloadingDocs, setDownloadingDocs] = useState(false)
  const [printingReturn, setPrintingReturn] = useState(false)

  const paymentData: PaymentData = {
    rrr: searchParams.get("rrr") || "",
    transactionRef: searchParams.get("transactionRef") || "",
    amount: parseFloat(searchParams.get("amount") || "0"),
    timestamp: new Date().toISOString()
  }

  // Check if this is a no-payment filing (balanceDue = 0)
  const isNoPaymentFiling = paymentData.amount === 0 && !paymentData.rrr && !paymentData.transactionRef

  useEffect(() => {
    if (reportId && profile?.userId) {
      loadReport()
    }
  }, [reportId, profile?.userId])

  useEffect(() => {
    if (profile?.address?.state && !stateForPrint) {
      setStateForPrint(profile.address.state)
    }
  }, [profile?.address?.state, stateForPrint])

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

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const printSelfAssessmentReport = () => {
    if (!report?.reportData) {
      toast.error("Report not loaded yet")
      return
    }
    setPrintingReturn(true)
    try {
      selfAssessmentRef.current?.printReport()
    } finally {
      // Best-effort: allow button to re-enable even if the print dialog blocks the thread
      setTimeout(() => setPrintingReturn(false), 1500)
    }
  }

  const downloadSelectedDocumentsZip = async () => {
    if (!user?.uid) return
    if (selectedDocumentIds.length === 0) {
      toast.error("Select supporting documents first")
      return
    }
    setDownloadingDocs(true)
    try {
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()
      const folder = zip.folder("supporting-documents")

      await Promise.all(
        selectedDocumentIds.map(async (docId) => {
          const docMeta = (await documentService.getById(docId)) as Document
          const res = await fetch(docMeta.url)
          if (!res.ok) throw new Error(`Failed to download ${docMeta.originalName}`)
          const blob = await res.blob()
          folder?.file(docMeta.originalName || `${docMeta.name}-${docId}`, blob)
        })
      )

      const blob = await zip.generateAsync({ type: "blob" })
      downloadBlob(blob, `supporting-documents-${Date.now()}.zip`)
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : "Failed to download documents")
    } finally {
      setDownloadingDocs(false)
    }
  }

  const downloadFilingPackZip = async () => {
    if (!report?.reportData) return
    setDownloadingPack(true)
    try {
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()

      const year = (report as any)?.reportData?.period?.year || new Date().getFullYear()
      zip.file(
        "README.txt",
        `OTax Filing Pack\n\nThis ZIP includes your payment receipt (if any) and supporting documents.\n\nIMPORTANT: Please print your self-assessment return separately using the "Print Self-Assessment" button above.\n\nYear: ${year}\nGenerated: ${new Date().toISOString()}\n\nContents:\n- Payment receipt (if applicable)\n- ${selectedDocumentIds.length} supporting document(s)\n`
      )

      // Add receipt if exists
      if (!isNoPaymentFiling && paymentData.rrr) {
        const receipt = await generateReceiptPDF()
        zip.file(`payment-receipt-${paymentData.rrr}.pdf`, receipt)
      }

      // Add selected supporting docs (if any)
      if (selectedDocumentIds.length > 0) {
        const folder = zip.folder("supporting-documents")
        let successCount = 0
        let failCount = 0
        
        for (const docId of selectedDocumentIds) {
          try {
            const docMeta = (await documentService.getById(docId)) as Document
            const res = await fetch(docMeta.url)
            if (!res.ok) throw new Error(`Failed to download ${docMeta.originalName}`)
            const blob = await res.blob()
            folder?.file(docMeta.originalName || `${docMeta.name}-${docId}`, blob)
            successCount++
          } catch (error) {
            console.error(`Error downloading document ${docId}:`, error)
            failCount++
          }
        }
        
        if (failCount > 0) {
          toast.warning(`Downloaded ${successCount} of ${selectedDocumentIds.length} documents. ${failCount} failed.`)
        } else {
          toast.success(`Filing pack downloaded with ${successCount} document(s)!`)
        }
      }

      const blob = await zip.generateAsync({ type: "blob" })
      downloadBlob(blob, `tax-filing-pack-${year}-${Date.now()}.zip`)
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : "Failed to download filing pack")
    } finally {
      setDownloadingPack(false)
    }
  }

  const openNrsPortal = () => {
    // Fallback if iframe embedding is blocked (opens in the same tab)
    window.location.assign(NRS_PORTAL_URL)
  }

  const startSelfFiling = async () => {
    if (!report) return
    setSubmitting(true)
    try {
      await reportService.updateReport(report.id, "Self-Assessment", {
        filingStatus: "submitted",
        filingMethod: "direct"
      } as any)
      setReport((prev) => (prev ? ({ ...prev, filingStatus: "submitted", filingMethod: "direct" } as any) : prev))
      setShowNrsModal(true)
    } catch (e) {
      console.error(e)
      toast.error("Failed to start filing")
    } finally {
      setSubmitting(false)
    }
  }

  const markSelfFilingResult = async (result: "success" | "failed") => {
    if (!report) return
    setSubmitting(true)
    try {
      if (result === "success") {
        await reportService.updateReport(report.id, "Self-Assessment", {
          filingStatus: "filed",
          filingMethod: "direct"
        } as any)
        setReport((prev) => (prev ? ({ ...prev, filingStatus: "filed", filingMethod: "direct" } as any) : prev))
        toast.success("Marked as filed")
        setShowNrsModal(false)
        router.push(`${basePath}/reports/file/${report.id}/confirmation?method=filed&amount=${paymentData.amount}`)
      } else {
        // Keep it pending/submitted (user can try again)
        await reportService.updateReport(report.id, "Self-Assessment", {
          filingStatus: "submitted",
          filingMethod: "direct"
        } as any)
        setReport((prev) => (prev ? ({ ...prev, filingStatus: "submitted", filingMethod: "direct" } as any) : prev))
        toast.message("No worries — your filing remains pending. You can try again.")
        setShowNrsModal(false)
      }
    } catch (e) {
      console.error(e)
      toast.error("Failed to update filing status")
    } finally {
      setSubmitting(false)
    }
  }

  const handleAgentSubmission = () => {
    if (!user?.uid) return
    setDocumentSelectMode("agent")
    setShowDocumentModal(true)
  }

  const handleSelectAttachments = () => {
    if (!user?.uid) return
    setDocumentSelectMode("attachments")
    setShowDocumentModal(true)
  }

  const handleDocumentSelection = async (documentIds: string[]) => {
    if (!report || !user?.uid) return
    setSelectedDocumentIds(documentIds)
    setShowDocumentModal(false)

    if (documentSelectMode === "attachments") {
      toast.success(`${documentIds.length} document(s) selected`)
      return
    }

    // Agent flow
    setSubmitting(true)
    try {
      const response = await fetch("/api/filing/agent/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          state: "NRS",
          reportId: report.id,
          rrr: paymentData.rrr || "",
          supportingDocuments: documentIds,
          entityId: activeEntityId || undefined
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to submit filing request")

      toast.success("Filing request submitted. An agent will be assigned shortly.")
      router.push(`${basePath}/reports/file/${reportId}/confirmation?requestId=${data.requestId}&amount=${paymentData.amount}`)
    } catch (error) {
      console.error("Error submitting filing request:", error)
      toast.error(error instanceof Error ? error.message : "Failed to submit filing request")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Payment Success Alert - Only show if there was a payment */}
          {!isNoPaymentFiling && (
            <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-3 sm:p-4">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-500 shrink-0" />
              <AlertTitle className="text-xs sm:text-sm md:text-base text-green-800 dark:text-green-200 font-medium">Payment Successful!</AlertTitle>
              <AlertDescription className="text-[11px] sm:text-xs md:text-sm text-green-700 dark:text-green-300 mt-1">
                Your tax payment has been processed successfully. RRR: <span className="font-mono break-all">{paymentData.rrr}</span>
              </AlertDescription>
            </Alert>
          )}

          {/* No Payment Alert - Show if balance is 0 */}
          {isNoPaymentFiling && (
            <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 sm:p-4">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-500 shrink-0" />
              <AlertTitle className="text-xs sm:text-sm md:text-base text-blue-800 dark:text-blue-200 font-medium">Ready to File</AlertTitle>
              <AlertDescription className="text-[11px] sm:text-xs md:text-sm text-blue-700 dark:text-blue-300 mt-1">
                Your tax return is balanced (no additional payment required). Download your return and supporting documents, then file via NRS or use an agent.
              </AlertDescription>
            </Alert>
          )}

          {/* Receipt Section - Only show if there was a payment */}
          {!isNoPaymentFiling && (
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">Payment Receipt</CardTitle>
              <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">Download and save your payment receipt</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
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
          )}

          {/* Download pack */}
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl font-semibold">Download report pack to file  manually to IRS office</CardTitle>
              <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">Print your self-assessment report and attach supporting documents before filing.</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] sm:text-xs md:text-sm">State Government (for the printed header)</Label>
                <Select value={stateForPrint} onValueChange={setStateForPrint}>
                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder={profile?.address?.state ? "Using profile state" : "Select a state"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Abia">Abia</SelectItem>
                    <SelectItem value="Adamawa">Adamawa</SelectItem>
                    <SelectItem value="Akwa Ibom">Akwa Ibom</SelectItem>
                    <SelectItem value="Anambra">Anambra</SelectItem>
                    <SelectItem value="Bauchi">Bauchi</SelectItem>
                    <SelectItem value="Bayelsa">Bayelsa</SelectItem>
                    <SelectItem value="Benue">Benue</SelectItem>
                    <SelectItem value="Borno">Borno</SelectItem>
                    <SelectItem value="Cross River">Cross River</SelectItem>
                    <SelectItem value="Delta">Delta</SelectItem>
                    <SelectItem value="Ebonyi">Ebonyi</SelectItem>
                    <SelectItem value="Edo">Edo</SelectItem>
                    <SelectItem value="Ekiti">Ekiti</SelectItem>
                    <SelectItem value="Enugu">Enugu</SelectItem>
                    <SelectItem value="FCT">FCT</SelectItem>
                    <SelectItem value="Gombe">Gombe</SelectItem>
                    <SelectItem value="Imo">Imo</SelectItem>
                    <SelectItem value="Jigawa">Jigawa</SelectItem>
                    <SelectItem value="Kaduna">Kaduna</SelectItem>
                    <SelectItem value="Kano">Kano</SelectItem>
                    <SelectItem value="Katsina">Katsina</SelectItem>
                    <SelectItem value="Kebbi">Kebbi</SelectItem>
                    <SelectItem value="Kogi">Kogi</SelectItem>
                    <SelectItem value="Kwara">Kwara</SelectItem>
                    <SelectItem value="Lagos">Lagos</SelectItem>
                    <SelectItem value="Nasarawa">Nasarawa</SelectItem>
                    <SelectItem value="Niger">Niger</SelectItem>
                    <SelectItem value="Ogun">Ogun</SelectItem>
                    <SelectItem value="Ondo">Ondo</SelectItem>
                    <SelectItem value="Osun">Osun</SelectItem>
                    <SelectItem value="Oyo">Oyo</SelectItem>
                    <SelectItem value="Plateau">Plateau</SelectItem>
                    <SelectItem value="Rivers">Rivers</SelectItem>
                    <SelectItem value="Sokoto">Sokoto</SelectItem>
                    <SelectItem value="Taraba">Taraba</SelectItem>
                    <SelectItem value="Yobe">Yobe</SelectItem>
                    <SelectItem value="Zamfara">Zamfara</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Default is your profile state (if available). You can change it for this printout.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={printSelfAssessmentReport}
                  disabled={printingReturn || !report?.reportData}
                  className="h-9 sm:h-10 text-xs sm:text-sm justify-start"
                >
                  {printingReturn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                  Print Self-Assessment
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSelectAttachments}
                  disabled={!user?.uid}
                  className="h-9 sm:h-10 text-xs sm:text-sm justify-start"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Select Supporting Documents {selectedDocumentIds.length > 0 ? `(${selectedDocumentIds.length})` : ""}
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadSelectedDocumentsZip}
                  disabled={downloadingDocs || selectedDocumentIds.length === 0}
                  className="h-9 sm:h-10 text-xs sm:text-sm justify-start"
                >
                  {downloadingDocs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Download Supporting Docs (ZIP)
                </Button>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Tip: The full pack includes your return PDF, receipt (if any), and selected supporting documents.
              </p>
            </CardContent>
          </Card>

          {/* Filing options */}
          <div className="grid gap-3 sm:gap-4">
            <Card className="border-2">
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  File Yourself on official government Portal
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">
                  Continue filing on the official government portal, federal or state.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2">
                <Button
                  onClick={() => setShowFilingPortalModal(true)}
                  disabled={submitting || !report}
                  className="w-full h-10 sm:h-11 text-xs sm:text-sm"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Opening Portal...
                    </>
                  ) : (
                    <>
                      Continue Self Filing
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                {(report as any)?.filingMethod === "direct" && (report as any)?.filingStatus === "submitted" && (
                  <Button
                    variant="outline"
                    onClick={() => setShowNrsModal(true)}
                    className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    I need to try again
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base md:text-lg flex items-center gap-2">
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  Use an Agent
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs md:text-sm mt-0.5 sm:mt-1">
                  An agent will file on your behalf. You’ll select supporting documents first.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <Button
                  onClick={handleAgentSubmission}
                  disabled={submitting || !report}
                  className="w-full h-10 sm:h-11 text-xs sm:text-sm"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Request Agent Filing"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
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

      {/* Hidden full report renderer for printing (prints the entire assessment via SelfAssessmentPreview) */}
      {report?.reportData && (
        <div className="hidden">
          <SelfAssessmentPreview
            ref={selfAssessmentRef}
            reportData={report.reportData as any}
            showFileButton={false}
            isEditing={false}
            printState={stateForPrint}
          />
        </div>
      )}

      {/* Filing Portal Selector Modal */}
      <PaymentPortalSelectorModal
        open={showFilingPortalModal}
        onOpenChange={setShowFilingPortalModal}
        userState={profile?.address?.state}
        taxDescription="Self-Assessment Tax Filing"
        taxDuration={`Tax Year ${report?.period?.year || new Date().getFullYear()}`}
        period="yearly"
        mode="filing"
        reportId={reportId}
        onFilingComplete={() => {
          // Redirect to confirmation page after filing is complete
          router.push(`${basePath}/reports/file/${reportId}/confirmation?amount=${paymentData.amount}`)
        }}
        onSelectNRC={() => {}}
        onSelectStateIRS={() => {}}
      />

      {/* NRS portal modal */}
      <Dialog open={showNrsModal} onOpenChange={setShowNrsModal}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-3xl p-0 overflow-hidden sm:rounded-lg h-[92dvh] sm:h-auto">
          <div className="p-4 border-b">
            <DialogHeader>
              <DialogTitle>Continue Filing on NRS Portal</DialogTitle>
              <DialogDescription>
                Complete your payment (if any) and file your return on the NRS portal.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(92dvh-140px)] sm:max-h-[70vh]">
            <div className="rounded-lg border overflow-hidden">
              <iframe
                title="NRS Self Service Portal"
                src={NRS_PORTAL_URL}
                className="w-full h-[55dvh] sm:h-[70vh] bg-background"
              />
            </div>

            <Alert>
              <AlertTitle className="text-sm">If the portal doesn’t show here</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">
                Some sites block embedding in apps. You can open the portal in this tab and continue there.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="p-4 border-t flex-col sm:flex-row gap-2 sm:gap-3 sticky bottom-0 bg-background">
            <Button
              variant="outline"
              onClick={openNrsPortal}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Open NRS in this tab
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => markSelfFilingResult("failed")}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              <XCircle className="w-4 h-4 mr-2" />
              I couldn’t file
            </Button>
            <Button
              onClick={() => markSelfFilingResult("success")}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              <Check className="w-4 h-4 mr-2" />
              I filed successfully
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

