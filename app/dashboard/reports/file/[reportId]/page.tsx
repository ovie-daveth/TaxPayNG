"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter, useParams } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, XCircle, ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { reportService, taxPaymentService } from "@/lib/services"
import { SavedReport } from "@/lib/types"
import { SelfAssessmentPreview } from "@/components/reports/self-assessment-preview"
import { documentService, transactionService } from "@/lib/services"
import Link from "next/link"
import { toast } from "sonner"

interface SystemCheck {
  name: string
  status: boolean
  message: string
  actionUrl?: string
  actionLabel?: string
}

export default function FileTaxReturnPage() {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const basePath = pathname?.startsWith("/dashboard-creator") ? "/dashboard-creator" : "/dashboard"
  const reportId = params?.reportId as string
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [report, setReport] = useState<SavedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([])
  const [allChecksPassed, setAllChecksPassed] = useState(false)
  const [balanceDue, setBalanceDue] = useState<number | null>(null)
  const [taxesAlreadyPaid, setTaxesAlreadyPaid] = useState<number>(0)
  const [filing, setFiling] = useState(false)
  const [filed, setFiled] = useState(false)
  const [showPendingPaymentModal, setShowPendingPaymentModal] = useState(false)
  const [showNrsModal, setShowNrsModal] = useState(false)
  const [showFilingActionSelect, setShowFilingActionSelect] = useState(false)
  const [filingAction, setFilingAction] = useState<string>("")
  const [showFileOnlyPendingPayModal, setShowFileOnlyPendingPayModal] = useState(false)
  const [showPaidOnlyContinueModal, setShowPaidOnlyContinueModal] = useState(false)
  const [showPaidAndFiledConfirmModal, setShowPaidAndFiledConfirmModal] = useState(false)

  const NRS_PORTAL_URL = "https://selfservice.nrs.gov.ng/"

  const openNrsInThisTab = () => {
    window.location.assign(NRS_PORTAL_URL)
  }

  const markPaid = async () => {
    if (!report) return
    const now = new Date().toISOString()
    const grossTaxPayable = report.reportData?.tax?.taxPayable || 0
    try {
      await reportService.updateReport(report.id, "Self-Assessment", {
        paymentStatus: "paid",
        paymentDate: now,
        // Manual confirmation (since payment happens on NRS)
        taxesAlreadyPaid: grossTaxPayable,
        balanceDue: 0
      })
      setReport((prev) =>
        prev
          ? ({
              ...prev,
              paymentStatus: "paid",
              paymentDate: now,
              taxesAlreadyPaid: grossTaxPayable,
              balanceDue: 0
            } as any)
          : prev
      )
      setTaxesAlreadyPaid(grossTaxPayable)
      setBalanceDue(0)
      toast.success("Marked as paid")
    } catch (e) {
      console.error(e)
      toast.error("Failed to mark as paid")
    }
  }

  const markFiledOnly = async () => {
    if (!report) return
    const now = new Date().toISOString()
    try {
      await reportService.updateReport(report.id, "Self-Assessment", {
        status: "completed",
        filingStatus: "filed",
        filingMethod: "direct",
        filingDate: now
      } as any)
      setReport((prev) =>
        prev ? ({ ...prev, status: "completed", filingStatus: "filed", filingMethod: "direct", filingDate: now } as any) : prev
      )
      setFiled(true)
      toast.success("Filing completed")
      router.push(`${basePath}/reports/file/${reportId}/confirmation?method=filed&amount=${report.reportData?.tax?.netTaxPayable || 0}`)
    } catch (e) {
      console.error(e)
      toast.error("Failed to mark as filed")
    }
  }

  const markPaidAndFiled = async () => {
    if (!report) return
    const now = new Date().toISOString()
    const grossTaxPayable = report.reportData?.tax?.taxPayable || 0
    try {
      await reportService.updateReport(report.id, "Self-Assessment", {
        paymentStatus: "paid",
        paymentDate: now,
        taxesAlreadyPaid: grossTaxPayable,
        balanceDue: 0,
        status: "completed",
        filingStatus: "filed",
        filingMethod: "direct",
        filingDate: now
      } as any)
      setReport((prev) =>
        prev
          ? ({
              ...prev,
              paymentStatus: "paid",
              paymentDate: now,
              taxesAlreadyPaid: grossTaxPayable,
              balanceDue: 0,
              filingStatus: "filed",
              filingMethod: "direct",
              filingDate: now
            } as any)
          : prev
      )
      setTaxesAlreadyPaid(grossTaxPayable)
      setBalanceDue(0)
      setFiled(true)
      // Record a manual tax payment so reconciliation can see it
      await taxPaymentService.createPayment(user!.uid, {
        transactionId: `manual-${report.id}`,
        amount: grossTaxPayable,
        period: "yearly",
        taxDuration: String(report.reportData?.period?.year || new Date().getFullYear()),
        paymentMethod: "firs",
        status: "completed",
        notes: `Manual confirmation: paid on NRS portal for report ${report.id}`
      })
      toast.success("Filing completed")
      router.push(`${basePath}/reports/file/${reportId}/confirmation?method=filed&amount=${grossTaxPayable}`)
    } catch (e) {
      console.error(e)
      toast.error("Failed to mark as paid & filed")
    }
  }

  const markCouldNotFile = async () => {
    if (!report) return
    const now = new Date().toISOString()
    try {
      await reportService.updateReport(report.id, "Self-Assessment", {
        filingStatus: "submitted",
        filingMethod: "direct",
        updatedAt: now
      } as any)
      setReport((prev) =>
        prev ? ({ ...prev, filingStatus: "submitted", filingMethod: "direct", updatedAt: now } as any) : prev
      )
      toast.message("No worries — your filing remains pending. You can try again.")
    } catch (e) {
      console.error(e)
      toast.error("Failed to update filing status")
    }
  }

  useEffect(() => {
    if (reportId && profile?.userId) {
      loadReport()
    }
  }, [reportId, profile?.userId])

  useEffect(() => {
    if (report && profile) {
      performSystemChecks()
      calculateBalance()
    }
  }, [report, profile])

  useEffect(() => {
    if (report) {
      // Check if already filed
      setFiled(report.filingStatus === 'filed' || report.filingStatus === 'submitted' || report.filingStatus === 'acknowledged')
      if (report.balanceDue !== undefined) {
        setBalanceDue(report.balanceDue)
      }
      if (report.taxesAlreadyPaid !== undefined) {
        setTaxesAlreadyPaid(report.taxesAlreadyPaid)
      }
    }
  }, [report])

  const loadReport = async () => {
    if (!reportId || !profile?.userId) return

    try {
      setLoading(true)
      // Try to get from selfAssessments collection
      const loadedReport = await reportService.getReportById(reportId, 'Self-Assessment')
      
      if (!loadedReport) {
        toast.error("Report not found")
        router.push(`${basePath}/reports`)
        return
      }

      setReport(loadedReport)
    } catch (error) {
      console.error("Error loading report:", error)
      toast.error("Failed to load report")
      router.push(`${basePath}/reports`)
    } finally {
      setLoading(false)
    }
  }

  const performSystemChecks = async () => {
    if (!report || !profile || !user?.uid) return

    const checks: SystemCheck[] = []

    // 1. Check if profile is complete
    const isProfileComplete = !!(
      profile.firstName &&
      profile.lastName &&
      profile.address &&
      profile.address.street &&
      profile.address.city &&
      profile.address.state &&
      profile.phone
    )
    
    checks.push({
      name: "Profile Complete",
      status: isProfileComplete,
      message: isProfileComplete 
        ? "Your profile information is complete"
        : "Please complete your profile information (name, address, phone)",
      actionUrl: !isProfileComplete ? `${basePath}/settings` : undefined,
      actionLabel: !isProfileComplete ? "Complete Profile" : undefined
    })

    // 2. Check if TIN is verified
    const taxId = profile.taxId
    const isTINVerified = !!(taxId && typeof taxId === 'string' && taxId.trim().length > 0)
    checks.push({
      name: "TIN Verified",
      status: isTINVerified,
      message: isTINVerified
        ? "Your Tax Identification Number is verified"
        : "Please verify your Tax Identification Number (TIN)",
      actionUrl: !isTINVerified ? `${basePath}/settings` : undefined,
      actionLabel: !isTINVerified ? "Add TIN" : undefined
    })

    // 3. Check if KYC is uploaded (check for identity documents in profile)
    try {
      const hasKYCDocuments = !!(
        profile.kycDocuments?.id || 
        profile.kycDocuments?.passport || 
        profile.kycDocuments?.driverLicense
      )
      
      checks.push({
        name: "KYC Documents",
        status: hasKYCDocuments,
        message: hasKYCDocuments
          ? "KYC documents are uploaded"
          : "Please upload your identity documents (ID, Passport, or Driver's License)",
        actionUrl: !hasKYCDocuments ? `${basePath}/settings?tab=profile&section=kyc` : undefined,
        actionLabel: !hasKYCDocuments ? "Upload Documents" : undefined
      })
    } catch (error) {
      console.error("Error checking KYC documents:", error)
      checks.push({
        name: "KYC Documents",
        status: false,
        message: "Unable to verify KYC documents",
        actionUrl: `${basePath}/settings?tab=profile&section=kyc`,
        actionLabel: "Upload Documents"
      })
    }

    // 4. Check if income & expense data is available
    try {
      const period = report.reportData.period
      const periodStart = new Date(period.startDate)
      const periodEnd = new Date(period.endDate)
      periodEnd.setHours(23, 59, 59, 999)

      const summary = await transactionService.getTransactionSummary(
        user.uid,
        periodStart.toISOString(),
        periodEnd.toISOString()
      )

      const hasData = (summary.totalIncome > 0 || summary.totalExpenses > 0)
      
      checks.push({
        name: "Income & Expense Data",
        status: hasData,
        message: hasData
          ? "Income and expense data is available for this period"
          : "No income or expense data found for this period. Please add transactions.",
        actionUrl: !hasData ? `${basePath}/transactions` : undefined,
        actionLabel: !hasData ? "Add Transactions" : undefined
      })
    } catch (error) {
      console.error("Error checking transaction data:", error)
      checks.push({
        name: "Income & Expense Data",
        status: false,
        message: "Unable to verify transaction data",
        actionUrl: `${basePath}/transactions`,
        actionLabel: "Add Transactions"
      })
    }

    setSystemChecks(checks)
    setAllChecksPassed(checks.every(check => check.status))
  }

  const calculateBalance = async () => {
    if (!report || !user?.uid) return

    try {
      const period = report.reportData.period
      const periodStart = new Date(period.startDate)
      const periodEnd = new Date(period.endDate)
      periodEnd.setHours(23, 59, 59, 999)

      // Calculate taxes already paid (matching Part D calculation)
      // 1. WHT from invoices
      const { invoiceService } = await import('@/lib/services')
      const allInvoices = await invoiceService.getAll([
        { field: 'userId', operator: '==', value: user.uid }
      ])
      const whtFromInvoices = allInvoices
        .filter(inv => 
          inv.invoiceType === 'outgoing' && 
          inv.whtDeducted && 
          inv.whtAmount && 
          inv.whtDeductedBy
        )
        .reduce((sum, inv) => sum + (inv.whtAmount || 0), 0)

      // 2. WHT from transactions
      const allTransactions = await transactionService.getAll([
        { field: 'userId', operator: '==', value: user.uid }
      ])
      const whtFromTransactions = allTransactions
        .filter(txn => {
          if (!txn.txnDate) return false
          const txnDate = new Date(txn.txnDate)
          if (txnDate < periodStart || txnDate > periodEnd) return false
          
          const desc = (txn.description || '').toLowerCase()
          const notes = (txn.notes || '').toLowerCase()
          return desc.includes('wht') || desc.includes('withholding') || 
                 notes.includes('wht') || notes.includes('withholding')
        })
        .reduce((sum, txn) => sum + (txn.amount || 0), 0)

      // 3. Tax payments (PAYE, provisional)
      const allPayments = await taxPaymentService.getUserPaymentsSimple(user.uid)
      const periodPayments = allPayments.filter(payment => {
        if (payment.status !== 'completed') return false
        const paymentDate = new Date(payment.createdAt)
        return paymentDate >= periodStart && paymentDate <= periodEnd
      })
      const taxPaymentsAmount = periodPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)

      // 4. Manual credits from metadata
      const manualCredits = (report.reportData as any)?.metadata?.manualTaxCredits || []
      const manualCreditsAmount = manualCredits.reduce((sum: number, credit: any) => sum + (credit.amount || 0), 0)

      // Total taxes already paid (matching Part D)
      const paid = whtFromInvoices + whtFromTransactions + taxPaymentsAmount + manualCreditsAmount

      // Gross Tax Payable (from tax brackets, BEFORE credits)
      const grossTaxPayable = report.reportData?.tax?.taxPayable || 0
      
      // Balance Due = Gross Tax - Tax Credits (same as netTaxPayable)
      const balance = Math.max(0, grossTaxPayable - paid)

      setTaxesAlreadyPaid(paid)
      setBalanceDue(balance)
    } catch (error) {
      console.error("Error calculating balance:", error)
    }
  }

  const handleFileReturn = async () => {
    if (!report || !user?.uid) return

    // Navigate to the appropriate flow based on balance due
    // If balance > 0, go to generate RRR and payment first
    // If balance <= 0, go directly to state selection and submission method
    if (balanceDue !== null && balanceDue > 0) {
      // Has pending balance: user pays + files on NRS portal (we don't generate RRR in-app)
      setShowFilingActionSelect(true)
      setShowPendingPaymentModal(true)
    } else {
      // No balance or already balanced - go directly to state selection and submission
      // Use payment-success page with amount=0 (it handles state selection and submission method)
      router.push(`${basePath}/reports/file/${reportId}/payment-success?amount=0`)
    }
  }

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background">
        <Card className="p-8 m-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Report Not Found</AlertTitle>
            <AlertDescription>
              The requested report could not be found.
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
        <main className="flex-1 px-4 py-6">
          <div className="space-y-6">
            <Dialog open={showPendingPaymentModal} onOpenChange={setShowPendingPaymentModal}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Pending payment before filing</DialogTitle>
                  <DialogDescription>
                    {balanceDue && balanceDue > 0
                      ? `You have a pending balance of ₦${balanceDue.toLocaleString()}. You can complete payment and file your return on the NRS portal.`
                      : "You may need to complete payment before filing. You can complete payment and file your return on the NRS portal."}
                  </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <p className="font-medium">Manual verification on OTax</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Payment and filing happen on the NRS portal (external). After you complete any step there, come back to OTax and select the matching status so we can register it.
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Before you return, keep:</p>
                    <ul className="list-disc list-inside">
                      <li>Payment receipt / reference</li>
                      <li>Acknowledgment number (if filing completed)</li>
                      <li>Any screenshot or confirmation email</li>
                    </ul>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setShowPendingPaymentModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowPendingPaymentModal(false)
                      setShowNrsModal(true)
                    }}
                  >
                    Continue to file
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* NRS portal in-app modal */}
            <Dialog open={showNrsModal} onOpenChange={setShowNrsModal}>
              <DialogContent className="max-w-3xl p-0 overflow-hidden">
                <div className="p-4 border-b">
                  <DialogHeader>
                    <DialogTitle>Continue Filing on NRS Portal</DialogTitle>
                    <DialogDescription>
                      Complete your payment (if any) and file your return on the NRS portal.
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="p-4 space-y-3">
                  <Alert>
                    <AlertTitle className="text-sm">After you finish on NRS</AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground">
                      Come back to this page and use the dropdown action to mark what happened (paid only / paid &amp; filed / couldn’t file). This is how OTax records your status since the process is manual on an external portal.
                    </AlertDescription>
                  </Alert>

                  <div className="rounded-lg border overflow-hidden">
                    <iframe
                      title="NRS Self Service Portal"
                      src={NRS_PORTAL_URL}
                      className="w-full h-[70vh] bg-background"
                    />
                  </div>

                  <Alert>
                    <AlertTitle className="text-sm">If the portal doesn’t show here</AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground">
                      Some sites block embedding in apps. You can open the portal in this tab and continue there.
                    </AlertDescription>
                  </Alert>
                </div>

                <DialogFooter className="p-4 border-t flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button variant="outline" onClick={() => setShowNrsModal(false)} className="w-full sm:w-auto">
                    Close
                  </Button>
                  <Button onClick={openNrsInThisTab} className="w-full sm:w-auto">
                    Open NRS in this tab
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* File-only but pending payment reminder */}
            <Dialog open={showFileOnlyPendingPayModal} onOpenChange={setShowFileOnlyPendingPayModal}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Pending payment detected</DialogTitle>
                  <DialogDescription>
                    You still have a pending balance of ₦{(balanceDue || 0).toLocaleString()}. Do you want to pay now before you mark this as filed?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setShowFileOnlyPendingPayModal(false)
                      await markFiledOnly()
                    }}
                  >
                    Later
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowFileOnlyPendingPayModal(false)
                      setShowNrsModal(true)
                    }}
                  >
                    Pay now
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Paid only -> prompt to continue filing */}
            <Dialog open={showPaidOnlyContinueModal} onOpenChange={setShowPaidOnlyContinueModal}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Great — payment confirmed</DialogTitle>
                  <DialogDescription>
                    Do you want to continue to file your return now on the NRS portal?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setShowPaidOnlyContinueModal(false)}>
                    Later
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowPaidOnlyContinueModal(false)
                      setShowNrsModal(true)
                    }}
                  >
                    Continue to file
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Paid + filed confirmation */}
            <Dialog open={showPaidAndFiledConfirmModal} onOpenChange={setShowPaidAndFiledConfirmModal}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Confirm paid + filed</DialogTitle>
                  <DialogDescription>
                    Are you sure you have completed BOTH payment and filing on the NRS portal? This will mark your self‑assessment as completed on OTax.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <p className="font-medium">Tip</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Keep your payment reference and acknowledgment number in case we need to verify later.
                  </p>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setShowPaidAndFiledConfirmModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={async () => {
                      setShowPaidAndFiledConfirmModal(false)
                      await markPaidAndFiled()
                    }}
                  >
                    Yes, I’m sure
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* System Checks Section */}
            {systemChecks.filter(check => !check.status).length > 0 && (
            <Card className="p-6">
                 <h2 className="text-xl font-semibold mb-4">System Checks</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Please ensure all requirements are met before filing your annual tax return
              </p>
                <Accordion type="single" collapsible className="w-full">
                  {systemChecks.filter(check => !check.status).map((check, index) => (
                    <AccordionItem
                      key={index}
                      value={`check-${index}`}
                      className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded-lg mb-4 [&:last-child]:border-b-2"
                    >
                      <AccordionTrigger className="px-4 hover:no-underline cursor-pointer">
                        <div className="flex items-center gap-3 flex-1">
                          <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                          <span className="font-medium">{check.name}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="pt-2 space-y-3">
                          <p className="text-sm text-muted-foreground">{check.message}</p>
                          {check.actionUrl && check.actionLabel && (
                            <Link href={check.actionUrl}>
                              <Button variant="outline" size="sm">
                                {check.actionLabel}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

              {!allChecksPassed && systemChecks.filter(check => !check.status).length > 0 && (
                <Alert className="mt-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Action Required</AlertTitle>
                  <AlertDescription>
                    Please complete all requirements above to file your annual tax return.
                  </AlertDescription>
                </Alert>
              )}
            </Card>
            )}

            {/* Balance Calculation Card */}
            {report && balanceDue !== null && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Tax Reconciliation</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Annual filing is a reconciliation of your tax payments. If you've already been paying monthly throughout the year, you may not need to pay anything further.
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Gross Tax Payable:</span>
                    <span className="font-semibold">₦{(report.reportData?.tax?.taxPayable || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Taxes Already Paid:</span>
                    <span className="font-semibold">₦{taxesAlreadyPaid.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-semibold">Balance Due:</span>
                    <span className={`font-bold text-lg ${balanceDue > 0 ? 'text-red-600' : balanceDue < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {balanceDue > 0 ? `₦${balanceDue.toLocaleString()}` : balanceDue < 0 ? `₦${Math.abs(balanceDue).toLocaleString()} Credit` : '₦0 (Balanced)'}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Success Message when all checks pass */}
            {allChecksPassed && systemChecks.length > 0 && !filed && (
              <Card className="p-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                <Alert className="border-green-200 dark:border-green-800 bg-transparent">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                  <AlertTitle className="text-green-800 dark:text-green-200">All Checks Complete</AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    You're ready to file your annual tax return. Filing is a reconciliation - you may not need to pay anything if you've already been paying monthly.
                  </AlertDescription>
                </Alert>

                {showFilingActionSelect && (
                  <Alert className="mt-4">
                    <AlertTitle className="text-sm">Manual verification</AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground">
                      Since payment/filing happens on the NRS portal, please use the dropdown below to confirm what you completed so OTax can register it.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="mt-4">
                  {showFilingActionSelect ? (
                    <Select
                      value={filingAction || undefined}
                      onValueChange={async (value) => {
                        setFilingAction(value)
                        // Execute and reset back to placeholder
                        if (value === "file_only") {
                          if ((balanceDue || 0) > 0) {
                            setShowFileOnlyPendingPayModal(true)
                          } else {
                            await markFiledOnly()
                          }
                        } else if (value === "paid_only") {
                          await markPaid()
                          setShowPaidOnlyContinueModal(true)
                        } else if (value === "paid_and_filed") {
                          setShowPaidAndFiledConfirmModal(true)
                        } else if (value === "try_again") {
                          await markCouldNotFile()
                          setShowNrsModal(true)
                        }
                        setTimeout(() => setFilingAction(""), 50)
                      }}
                    >
                      <SelectTrigger className="h-11 w-full sm:w-[320px]">
                        <SelectValue placeholder="How did it go?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="file_only">Yes, I filed only</SelectItem>
                        <SelectItem value="paid_only">Yes, I paid only</SelectItem>
                        <SelectItem value="paid_and_filed">Yes, I paid + file</SelectItem>
                        <SelectItem value="try_again">No, there was an issue, I’ll try again</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Button
                      size="lg"
                      onClick={handleFileReturn}
                      disabled={filing}
                      className="w-full sm:w-auto"
                    >
                      {filing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Filing...
                        </>
                      ) : (
                        "File Tax Return"
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Filed Success Message */}
            {filed && (
              <Card className="p-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
                <Alert className="border-green-200 dark:border-green-800 bg-transparent">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                  <AlertTitle className="text-green-800 dark:text-green-200">Tax Return Filed</AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    Your tax return has been filed successfully.
                    {balanceDue && balanceDue > 0 && (
                      <span className="block mt-2">You have a balance of ₦{balanceDue.toLocaleString()} due. Please proceed to payment.</span>
                    )}
                    {balanceDue && balanceDue === 0 && (
                      <span className="block mt-2">No additional payment is required. Your taxes are fully paid.</span>
                    )}
                    {balanceDue && balanceDue < 0 && (
                      <span className="block mt-2">You have a credit of ₦{Math.abs(balanceDue).toLocaleString()} available.</span>
                    )}
                  </AlertDescription>
                </Alert>
                {balanceDue && balanceDue > 0 && (
                  <div className="mt-4">
                    <Button 
                      size="lg" 
                      onClick={() => setShowPendingPaymentModal(true)}
                      className="w-full sm:w-auto"
                    >
                      Continue on NRS Portal (Pay & File)
                    </Button>
                  </div>
                )}
                {balanceDue && balanceDue <= 0 && (
                  <div className="mt-4">
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={() => router.push(`${basePath}/reports/file/${reportId}/confirmation?method=filed&amount=${report.reportData?.tax?.netTaxPayable || 0}`)}
                      className="w-full sm:w-auto"
                    >
                      View Filing Confirmation
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* Report Preview (full-bleed on mobile) */}
            <div className="-mx-2 sm:mx-0">
              <Card className="p-0 sm:p-6 rounded-none sm:rounded-lg border-x-0 sm:border">
                <div className="px-4 pt-4 pb-2 sm:px-0 sm:pt-0 sm:pb-0">
                  <h2 className="text-lg sm:text-xl font-semibold">Tax Return Preview</h2>
                </div>
                {report.reportData && (
                  <SelfAssessmentPreview
                    reportData={report.reportData}
                    formData={{
                      includeIncome: true,
                      includeExpenses: true,
                      includeTax: true,
                      includeReliefs: true
                    }}
                    showFileButton={false}
                    isEditing={false}
                    fullBleedMobile
                  />
                )}
              </Card>
            </div>
          </div>
        </main>

    </div>
  )
}

