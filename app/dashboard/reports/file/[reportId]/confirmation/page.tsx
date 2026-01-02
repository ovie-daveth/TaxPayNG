"use client"

import { useState, useEffect, useMemo } from "react"
import { usePathname, useRouter, useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { CheckCircle2, FileText, ArrowLeft, Loader2, Clock, Mail, UserCheck } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { documentService, reportService } from "@/lib/services"
import { Document, SavedReport } from "@/lib/types"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { toast } from "sonner"
import Link from "next/link"
export default function FilingConfirmationPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const basePath = pathname?.startsWith("/dashboard-creator") ? "/dashboard-creator" : "/dashboard"
  const reportId = params?.reportId as string
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [report, setReport] = useState<SavedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingPaymentReceipt, setUploadingPaymentReceipt] = useState(false)
  const [uploadingFilingProof, setUploadingFilingProof] = useState(false)
  const [uploadingAdditional, setUploadingAdditional] = useState(false)

  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null)
  const [filingProofFile, setFilingProofFile] = useState<File | null>(null)
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([])

  const acknowledgmentNumber = searchParams.get("acknowledgment")
  const ticketId = searchParams.get("ticketId")
  const requestId = searchParams.get("requestId")
  const method = searchParams.get("method")
  const paidAmount = searchParams.get("amount")
  
  // Store requestId in state for navigation
  const [filingRequestId, setFilingRequestId] = useState<string | null>(requestId || ticketId || null)

  // Determine filing method: agent (requestId or ticketId), direct (acknowledgment), or email (method=email)
  // Priority: URL params > report data
  const filingMethod = useMemo(() => {
    if (requestId || ticketId) return 'agent'
    if (acknowledgmentNumber) return 'direct'
    if (method === 'email') return 'email'
    return report?.filingMethod || null
  }, [requestId, ticketId, acknowledgmentNumber, method, report?.filingMethod])

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
      if (loadedReport) {
        setReport(loadedReport)
      }
    } catch (error) {
      console.error("Error loading report:", error)
    } finally {
      setLoading(false)
    }
  }

  const attachEvidenceToReport = async (
    kind: "paymentReceipt" | "filingProof" | "additional",
    doc: Document
  ) => {
    if (!report) return

    const entry = { documentId: doc.id, name: doc.name, url: doc.url, uploadedAt: doc.uploadedAt }

    // IMPORTANT: Avoid race conditions when uploading receipt + proof concurrently.
    // We update only the nested field we need so one upload doesn't overwrite the other.
    if (kind === "paymentReceipt" || kind === "filingProof") {
      const fieldPath = kind === "paymentReceipt" ? "filingEvidence.paymentReceipt" : "filingEvidence.filingProof"
      await reportService.updateReport(report.id, "Self-Assessment", {
        [fieldPath]: entry
      } as any)

      setReport((prevReport) => {
        if (!prevReport) return prevReport
        return {
          ...prevReport,
          filingEvidence: {
            ...(prevReport.filingEvidence || {}),
            [kind]: entry
          }
        } as any
      })
      return
    }

    // Additional evidence: append (we keep this sequential in UI, so a simple merge is OK)
    const latest = await reportService.getReportById(report.id, "Self-Assessment")
    const prevAdditional = (latest as any)?.filingEvidence?.additional || report.filingEvidence?.additional || []
    const nextAdditional = [...prevAdditional, entry]

    await reportService.updateReport(report.id, "Self-Assessment", {
      "filingEvidence.additional": nextAdditional
    } as any)

    setReport((prevReport) => {
      if (!prevReport) return prevReport
      return {
        ...prevReport,
        filingEvidence: {
          ...(prevReport.filingEvidence || {}),
          additional: nextAdditional
        }
      } as any
    })
  }

  const uploadEvidence = async (file: File, kind: "paymentReceipt" | "filingProof" | "additional") => {
    if (!user?.uid || !report) {
      throw new Error("User/report not ready. Please refresh and try again.")
    }

    const year = report.reportData?.period?.year || new Date().getFullYear()
    const defaultName =
      kind === "paymentReceipt"
        ? `Tax Payment Receipt - ${year}`
        : kind === "filingProof"
          ? `Filing Proof - ${year}`
          : `Filing Evidence - ${year}`

    // Upload file to ImageKit via our API (reliable + enforces storage usage)
    const uploadResult = await uploadToImageKit(file, "filing-evidence", user.uid)

    const res = await documentService.uploadDocument(user.uid, {
      file,
      name: defaultName,
      type: kind === "paymentReceipt" ? "receipt" : "proof",
      imageKitUrl: uploadResult.url,
      imageKitFileId: uploadResult.fileId,
      fileSize: uploadResult.size,
      notes: `Self-Assessment Report: ${report.id}${acknowledgmentNumber ? ` | Ack: ${acknowledgmentNumber}` : ""}`
    })

    if (!res.success || !res.data) {
      throw new Error(res.error || "Upload failed")
    }

    await attachEvidenceToReport(kind, res.data as any)
    return res.data as any as Document
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
      <main className="mx-auto px-4 py-6">
        <div className="space-y-6">
          <Link href={`${basePath}/reports`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          {/* Success Alert - Dynamic based on filing method */}
          {filingMethod === 'agent' ? (
            <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-500" />
              <AlertTitle className="text-blue-800 dark:text-blue-200">Tax Return Submitted Successfully!</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                Your annual tax return has been submitted successfully. It is now pending with an agent for review and filing. We will update you once the filing is complete.
              </AlertDescription>
            </Alert>
          ) : filingMethod === 'email' ? (
            <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
              <Mail className="h-4 w-4 text-green-600 dark:text-green-500" />
              <AlertTitle className="text-green-800 dark:text-green-200">Tax Return Sent Successfully!</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                Your annual tax return has been submitted successfully via email to the IRS.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
              <AlertTitle className="text-green-800 dark:text-green-200">Tax Return Filed Successfully!</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                Your annual tax return has been submitted successfully.
              </AlertDescription>
            </Alert>
          )}

          {/* Filing Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Filing Confirmation</CardTitle>
              <CardDescription>Your tax return filing details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Return Year</Label>
                  <p className="font-semibold">{report.reportData?.period?.year || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tax Paid</Label>
                  <p className="font-semibold">₦{(paidAmount ? parseFloat(paidAmount) : (report.reportData?.tax?.netTaxPayable || 0)).toLocaleString()}</p>
                </div>
                {acknowledgmentNumber && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">IRS Acknowledgment Number</Label>
                    <p className="font-mono font-semibold">{acknowledgmentNumber}</p>
                  </div>
                )}
                {(requestId || ticketId) && (
                  <div className="col-span-2 space-y-2">
                    <div>
                      <Label className="text-muted-foreground">Filing Request ID</Label>
                      <p className="font-mono font-semibold">{requestId || ticketId}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your filing request is pending with an agent. You'll receive updates once an agent is assigned and the filing is processed.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`${basePath}/filing-requests/${requestId || ticketId}`)}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Track Status & Message Agent
                    </Button>
                  </div>
                )}
                {method === "email" && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Submission Method</Label>
                    <p className="font-semibold">Email</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your return has been sent to the IRS via email.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Receipt (manual upload) */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Receipt</CardTitle>
              <CardDescription>Upload your tax payment receipt (if you paid)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert>
                <AlertTitle className="text-sm">Manual upload</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground">
                  Since payment can happen on an external portal, upload the receipt/reference you received so OTax can store it.
                </AlertDescription>
              </Alert>

              {report.filingEvidence?.paymentReceipt ? (
                <div className="rounded-lg border p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{report.filingEvidence.paymentReceipt.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{report.filingEvidence.paymentReceipt.url}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={report.filingEvidence!.paymentReceipt!.url} target="_blank" rel="noreferrer">
                      View
                    </a>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Upload receipt</Label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (!paymentReceiptFile) return toast.error("Please choose a file")
                      setUploadingPaymentReceipt(true)
                      try {
                        await uploadEvidence(paymentReceiptFile, "paymentReceipt")
                        setPaymentReceiptFile(null)
                        toast.success("Payment receipt uploaded")
                      } catch (e) {
                        console.error(e)
                        toast.error(e instanceof Error ? e.message : "Failed to upload")
                      } finally {
                        setUploadingPaymentReceipt(false)
                      }
                    }}
                    disabled={uploadingPaymentReceipt}
                  >
                    {uploadingPaymentReceipt ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload Payment Receipt"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Filing Proof */}
          <Card>
            <CardHeader>
              <CardTitle>Filing Proof</CardTitle>
              <CardDescription>Upload proof of submission (confirmation email/screenshot/acknowledgment)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {acknowledgmentNumber && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">IRS Acknowledgment</p>
                  <p className="text-xs text-muted-foreground">
                    Acknowledgment Number: <span className="font-mono">{acknowledgmentNumber}</span>
                  </p>
                </div>
              )}
              {(requestId || ticketId) && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Agent Filing Request
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Request ID: <span className="font-mono">{requestId || ticketId}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Status:</strong> Pending Agent Assignment → Agent Review → Filed → Completed
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    An agent will be assigned to your request shortly. You'll receive notifications as your filing progresses.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`${basePath}/filing-requests/${requestId || ticketId}`)}
                    className="w-full mt-3"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    View Status & Messages
                  </Button>
                </div>
              )}
              {method === "email" && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Email Confirmation</p>
                  <p className="text-xs text-muted-foreground">
                    Your tax return has been sent to the IRS via email. Check your email for confirmation.
                  </p>
                </div>
              )}

              {report.filingEvidence?.filingProof ? (
                <div className="rounded-lg border p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{report.filingEvidence.filingProof.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{report.filingEvidence.filingProof.url}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={report.filingEvidence!.filingProof!.url} target="_blank" rel="noreferrer">
                      View
                    </a>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Upload proof</Label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setFilingProofFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (!filingProofFile) return toast.error("Please choose a file")
                      setUploadingFilingProof(true)
                      try {
                        await uploadEvidence(filingProofFile, "filingProof")
                        setFilingProofFile(null)
                        toast.success("Filing proof uploaded")
                      } catch (e) {
                        console.error(e)
                        toast.error(e instanceof Error ? e.message : "Failed to upload")
                      } finally {
                        setUploadingFilingProof(false)
                      }
                    }}
                    disabled={uploadingFilingProof}
                  >
                    {uploadingFilingProof ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload Filing Proof"
                    )}
                  </Button>
                </>
              )}

              <div className="pt-2 border-t space-y-2">
                <p className="text-sm font-medium">Other evidence (optional)</p>
                {report.filingEvidence?.additional?.length ? (
                  <div className="space-y-2">
                    {report.filingEvidence.additional.map((d) => (
                      <div key={d.documentId} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{d.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{d.url}</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={d.url} target="_blank" rel="noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No additional evidence uploaded.</p>
                )}

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Upload additional files</Label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={(e) => setAdditionalFiles(Array.from(e.target.files || []))}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!additionalFiles.length) return toast.error("Please choose at least one file")
                    setUploadingAdditional(true)
                    try {
                      for (const f of additionalFiles) {
                        await uploadEvidence(f, "additional")
                      }
                      setAdditionalFiles([])
                      toast.success("Evidence uploaded")
                    } catch (e) {
                      console.error(e)
                      toast.error(e instanceof Error ? e.message : "Failed to upload")
                    } finally {
                      setUploadingAdditional(false)
                    }
                  }}
                  disabled={uploadingAdditional}
                >
                  {uploadingAdditional ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload Additional Evidence"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Back to Dashboard */}
          <div className="flex justify-center">
            <Link href={basePath}>
              <Button size="lg">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

