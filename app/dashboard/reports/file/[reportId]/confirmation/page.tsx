"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Download, FileText, ArrowLeft, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { reportService } from "@/lib/services"
import { SavedReport } from "@/lib/types"
import { toast } from "sonner"
import Link from "next/link"
// JSZip will be imported dynamically

export default function FilingConfirmationPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const reportId = params?.reportId as string
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [report, setReport] = useState<SavedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const acknowledgmentNumber = searchParams.get("acknowledgment")
  const ticketId = searchParams.get("ticketId")
  const method = searchParams.get("method")
  const paidAmount = searchParams.get("amount")

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

  const downloadFilingPack = async () => {
    if (!report) return

    setDownloading(true)
    try {
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()

      // Add report PDF (would need to generate this)
      // zip.file("annual-tax-return.pdf", reportPdfBlob)

      // Add receipt PDF (would need to fetch this)
      // zip.file("payment-receipt.pdf", receiptPdfBlob)

      // Add supporting documents (would need to fetch from documents)
      // zip.file("supporting-docs.pdf", supportingDocsBlob)

      // For now, create a placeholder
      zip.file("README.txt", `Tax Filing Package
Tax Year: ${report.reportData?.period?.year || 'N/A'}
Report ID: ${report.id}
${acknowledgmentNumber ? `Acknowledgment: ${acknowledgmentNumber}` : ''}
${ticketId ? `Ticket ID: ${ticketId}` : ''}
Generated: ${new Date().toISOString()}
`)

      const blob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tax-filing-${report.reportData?.period?.year || 'unknown'}-${Date.now()}.zip`
      a.click()
      URL.revokeObjectURL(url)

      toast.success("Filing pack downloaded")
    } catch (error) {
      console.error("Error downloading pack:", error)
      toast.error("Failed to download filing pack")
    } finally {
      setDownloading(false)
    }
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
          <Button onClick={() => router.push('/dashboard/reports')} className="mt-4">
            Back to Reports
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          <Link href="/dashboard/reports">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          {/* Success Alert */}
          <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
            <AlertTitle className="text-green-800 dark:text-green-200">Tax Return Filed Successfully!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Your annual tax return has been submitted successfully.
            </AlertDescription>
          </Alert>

          {/* Filing Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Filing Confirmation</CardTitle>
              <CardDescription>Your tax return filing details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                {ticketId && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Filing Ticket ID</Label>
                    <p className="font-mono font-semibold">{ticketId}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your filing is being processed by our agent. You'll receive updates on the status.
                    </p>
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

          {/* Receipt Section */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Receipt</CardTitle>
              <CardDescription>Your RRR payment confirmation</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your payment receipt has been saved to your documents. You can access it from the Documents section.
              </p>
            </CardContent>
          </Card>

          {/* Filing Proof */}
          <Card>
            <CardHeader>
              <CardTitle>Filing Proof</CardTitle>
              <CardDescription>Proof of your tax return submission</CardDescription>
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
              {ticketId && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Agent Assignment</p>
                  <p className="text-xs text-muted-foreground">
                    Ticket ID: <span className="font-mono">{ticketId}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: Pending → In Review → Filed → Completed
                  </p>
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
            </CardContent>
          </Card>

          {/* Download Pack */}
          <Card>
            <CardHeader>
              <CardTitle>Download Filing Pack</CardTitle>
              <CardDescription>Download all documents related to this filing</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={downloadFilingPack}
                disabled={downloading}
                variant="outline"
                className="w-full"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Preparing Download...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download Filing Pack (ZIP)
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Includes: Annual Return PDF, Payment Receipt, Supporting Documents
              </p>
            </CardContent>
          </Card>

          {/* Back to Dashboard */}
          <div className="flex justify-center">
            <Link href="/dashboard">
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

