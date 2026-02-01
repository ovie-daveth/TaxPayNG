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
import { CheckCircle2, XCircle, ArrowLeft, Loader2, AlertCircle, ExternalLink, Upload } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { reportService, taxPaymentService, userService } from "@/lib/services"
import { SavedReport } from "@/lib/types"
import { SelfAssessmentPreview } from "@/components/reports/self-assessment-preview"
import { documentService, transactionService } from "@/lib/services"
import Link from "next/link"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { PaymentPortalSelectorModal } from "@/components/payment/payment-portal-selector-modal"
import React from "react"

interface SystemCheck {
  name: string
  status: boolean
  message: string
  actionUrl?: string
  actionLabel?: string
  actionType?: 'profile' | 'tin' | 'kyc'
}

export default function FileTaxReturnPage() {
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
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  
  // Modals for updating requirements
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showTINModal, setShowTINModal] = useState(false)
  const [showKYCModal, setShowKYCModal] = useState(false)
  const [showNrsTaxIdModal, setShowNrsTaxIdModal] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingTIN, setSavingTIN] = useState(false)
  const [uploadingKYC, setUploadingKYC] = useState(false)
  const [localProfile, setLocalProfile] = useState<any>(null)

  const NRS_PORTAL_URL = "https://selfservice.nrs.gov.ng/"
  const NRS_TAX_ID_URL = "https://taxid.nrs.gov.ng/"

  // Update local profile when profile changes (but only on initial load)
  useEffect(() => {
    if (profile && !localProfile) {
      setLocalProfile(profile)
    }
  }, [profile, localProfile])

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
    if (report && (localProfile || profile)) {
      performSystemChecks()
      calculateBalance()
    }
  }, [report, profile, localProfile])

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
    if (!report || !user?.uid) return
    const profileToCheck = localProfile || profile
    if (!profileToCheck) return

    const checks: SystemCheck[] = []

    // 1. Check if profile is complete
    const isProfileComplete = !!(
      profileToCheck.firstName &&
      profileToCheck.lastName &&
      profileToCheck.address &&
      profileToCheck.address.street &&
      profileToCheck.address.city &&
      profileToCheck.address.state &&
      profileToCheck.phone
    )
    
    checks.push({
      name: "Profile Complete",
      status: isProfileComplete,
      message: isProfileComplete 
        ? "Your profile information is complete"
        : "Please complete your profile information (name, address, phone)",
      actionLabel: !isProfileComplete ? "Complete Profile" : undefined,
      actionType: !isProfileComplete ? 'profile' : undefined
    })

    // 2. Check if TIN is verified
    const taxId = profileToCheck.taxId
    const isTINVerified = !!(taxId && typeof taxId === 'string' && taxId.trim().length > 0)
    checks.push({
      name: "TIN Verified",
      status: isTINVerified,
      message: isTINVerified
        ? "Your Tax Identification Number is verified"
        : "Please verify your Tax Identification Number (TIN)",
      actionLabel: !isTINVerified ? "Add Tax ID" : undefined,
      actionType: !isTINVerified ? 'tin' : undefined
    })

    // 3. Check if KYC is uploaded (check for identity documents in profile)
    try {
      const hasKYCDocuments = !!(
        profileToCheck.kycDocuments?.id || 
        profileToCheck.kycDocuments?.passport || 
        profileToCheck.kycDocuments?.driverLicense
      )
      
      checks.push({
        name: "KYC Documents",
        status: hasKYCDocuments,
        message: hasKYCDocuments
          ? "KYC documents are uploaded"
          : "Please upload your identity documents (ID, Passport, or Driver's License)",
        actionLabel: !hasKYCDocuments ? "Upload Documents" : undefined,
        actionType: !hasKYCDocuments ? 'kyc' : undefined
      })
    } catch (error) {
      console.error("Error checking KYC documents:", error)
      checks.push({
        name: "KYC Documents",
        status: false,
        message: "Unable to verify KYC documents",
        actionLabel: "Upload Documents",
        actionType: 'kyc'
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

      // 3. Tax payments (PAYE, provisional, and annual payments)
      const allPayments = await taxPaymentService.getUserPaymentsSimple(user.uid)
      const reportYear = report.period.year?.toString()
      const periodPayments = allPayments.filter(payment => {
        if (payment.status !== 'completed') return false
        
        // Include payments made during the period
        const paymentDate = new Date(payment.createdAt)
        const inPeriod = paymentDate >= periodStart && paymentDate <= periodEnd
        
        // Also include annual tax return payments for this specific year
        // Check if taxDuration contains the report year (e.g., "Tax Year 2025")
        const taxDuration = payment.taxDuration || ''
        const forThisYear = reportYear && taxDuration.includes(reportYear)
        
        return inPeriod || forThisYear
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
      router.push(`${basePath}/reports/file/${reportId}/payment-success?amount=0`)
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

  // Handler functions for modal saves
  async function handleSaveProfile(data: any) {
    if (!user?.uid) return
    
    setSavingProfile(true)
    try {
      await userService.upsertProfile(user.uid, data)
      const updatedProfile = { ...(localProfile || profile), ...data }
      setLocalProfile(updatedProfile)
      toast.success("Profile updated successfully")
      setShowProfileModal(false)
      // Refresh the page to get updated data
      router.refresh()
    } catch (error) {
      console.error("Error saving profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSaveTIN(tin: string) {
    if (!user?.uid) return
    
    setSavingTIN(true)
    try {
      await userService.upsertProfile(user.uid, { taxId: tin })
      const updatedProfile = { ...(localProfile || profile), taxId: tin }
      setLocalProfile(updatedProfile)
      toast.success("Tax ID saved successfully")
      setShowTINModal(false)
      // Refresh the page to get updated data
      router.refresh()
    } catch (error) {
      console.error("Error saving Tax ID:", error)
      toast.error("Failed to save Tax ID")
    } finally {
      setSavingTIN(false)
    }
  }

  async function handleUploadKYC(file: File) {
    if (!user?.uid) return
    
    setUploadingKYC(true)
    try {
      const result = await uploadToImageKit(file, 'kyc', user.uid)
      const kycUpdate = {
        kycDocuments: {
          ...(localProfile?.kycDocuments || profile?.kycDocuments || {}),
          id: result.url,
          idFileId: result.fileId,
          idSize: result.size
        }
      }
      
      await userService.upsertProfile(user.uid, kycUpdate)
      
      await documentService.uploadDocument(user.uid, {
        file,
        name: 'KYC Identity Document',
        type: 'proof',
        imageKitUrl: result.url,
        imageKitFileId: result.fileId,
        fileSize: result.size
      })
      
      const updatedProfile = { ...(localProfile || profile), ...kycUpdate }
      setLocalProfile(updatedProfile)
      
      toast.success("KYC document uploaded successfully")
      setShowKYCModal(false)
      // Refresh the page to get updated data
      router.refresh()
    } catch (error) {
      console.error("Error uploading KYC:", error)
      toast.error("Failed to upload document")
    } finally {
      setUploadingKYC(false)
    }
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
                          {check.actionLabel && check.actionType && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                if (check.actionType === 'profile') {
                                  setShowProfileModal(true)
                                } else if (check.actionType === 'tin') {
                                  setShowTINModal(true)
                                } else if (check.actionType === 'kyc') {
                                  setShowKYCModal(true)
                                }
                              }}
                            >
                              {check.actionLabel}
                            </Button>
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
                    <div className="flex flex-col items-end gap-2">
                      <span className={`font-bold text-lg ${balanceDue > 0 ? 'text-red-600' : balanceDue < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {balanceDue > 0 ? `₦${balanceDue.toLocaleString()}` : balanceDue < 0 ? `₦${Math.abs(balanceDue).toLocaleString()} Credit` : '₦0 (Balanced)'}
                    </span>
                    {balanceDue > 0 && (
                      <Button 
                        size="sm"
                        onClick={() => setShowPaymentModal(true)}
                        className="h-8 px-4"
                      >
                        Pay Now
                      </Button>
                    )}
                    </div>
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

        {/* Profile Update Modal */}
        <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Complete Your Profile</DialogTitle>
              <DialogDescription>
                Please fill in all required information to proceed with filing
              </DialogDescription>
            </DialogHeader>
            <ProfileUpdateForm
              profile={localProfile || profile}
              onSave={handleSaveProfile}
              onCancel={() => setShowProfileModal(false)}
              saving={savingProfile}
            />
          </DialogContent>
        </Dialog>

        {/* Tax ID Update Modal */}
        <Dialog open={showTINModal} onOpenChange={setShowTINModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Tax Identification Number</DialogTitle>
              <DialogDescription>
                Please enter your Tax Identification Number (Tax ID) to proceed
              </DialogDescription>
            </DialogHeader>
            <TINUpdateForm
              currentTIN={localProfile?.taxId || profile?.taxId || ''}
              onSave={handleSaveTIN}
              onCancel={() => setShowTINModal(false)}
              saving={savingTIN}
              onOpenNrsModal={() => setShowNrsTaxIdModal(true)}
            />
          </DialogContent>
        </Dialog>

        {/* NRS Tax ID Portal Modal */}
        <Dialog open={showNrsTaxIdModal} onOpenChange={setShowNrsTaxIdModal}>
          <DialogContent className="max-w-full w-full h-[90vh] p-0 sm:max-w-4xl sm:h-[85vh] flex flex-col">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b">
              <DialogTitle className="text-base sm:text-lg">NRS Tax ID Portal</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Complete your Tax ID registration or verification in the portal below. You can close this window when done.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 relative min-h-0">
              <iframe
                src={NRS_TAX_ID_URL}
                className="w-full h-full border-0"
                title="NRS Tax ID Portal"
                allow="fullscreen"
              />
            </div>
            <div className="px-4 sm:px-6 py-3 border-t flex justify-end">
              <Button type="button" onClick={() => setShowNrsTaxIdModal(false)} className="h-9 sm:h-10 text-xs sm:text-sm">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* KYC Upload Modal */}
        <Dialog open={showKYCModal} onOpenChange={setShowKYCModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload KYC Document</DialogTitle>
              <DialogDescription>
                Please upload a valid identity document (ID, Passport, or Driver's License)
              </DialogDescription>
            </DialogHeader>
            <KYCUploadForm
              onUpload={handleUploadKYC}
              onCancel={() => setShowKYCModal(false)}
              uploading={uploadingKYC}
            />
          </DialogContent>
        </Dialog>

        {/* Payment Portal Modal */}
        <PaymentPortalSelectorModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          userState={profile?.address?.state}
          taxAmount={balanceDue || 0}
          taxDescription="Annual Tax Return Payment"
          taxDuration={`Tax Year ${report?.period?.year || new Date().getFullYear()}`}
          period="yearly"
          onSelectNRC={() => {
            // NRC portal selected
          }}
          onSelectStateIRS={(url) => {
            // State IRS portal selected
          }}
          onPaymentMade={async (receiptFile) => {
            // Payment completed - reload the report and recalculate balance
            try {
              // First reload the report from database
              await loadReport()
              
              // Then recalculate the balance which will fetch the new payment
              if (report) {
                await calculateBalance()
              }
              
              toast.success("Payment recorded! Balance updated.")
            } catch (error) {
              console.error("Error refreshing data:", error)
              toast.error("Payment recorded but failed to refresh. Please reload the page.")
            }
            
            // Close the modal - stay on the same page
            setShowPaymentModal(false)
          }}
        />

    </div>
  )
}

// Profile Update Form Component
function ProfileUpdateForm({ 
  profile, 
  onSave, 
  onCancel, 
  saving 
}: { 
  profile: any
  onSave: (data: any) => void
  onCancel: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    phone: profile?.phone || '',
    address: {
      street: profile?.address?.street || '',
      city: profile?.address?.city || '',
      state: profile?.address?.state || '',
      country: profile?.address?.country || 'Nigeria',
      postalCode: profile?.address?.postalCode || ''
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.firstName || !formData.lastName || !formData.phone || 
        !formData.address.street || !formData.address.city || !formData.address.state) {
      toast.error('Please fill in all required fields')
      return
    }
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="street">Street Address *</Label>
        <Input
          id="street"
          value={formData.address.street}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            address: { ...prev.address, street: e.target.value }
          }))}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.address.city}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              address: { ...prev.address, city: e.target.value }
            }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            value={formData.address.state}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              address: { ...prev.address, state: e.target.value }
            }))}
            required
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Tax ID Update Form Component
function TINUpdateForm({ 
  currentTIN, 
  onSave, 
  onCancel, 
  saving,
  onOpenNrsModal
}: { 
  currentTIN: string
  onSave: (tin: string) => void
  onCancel: () => void
  saving: boolean
  onOpenNrsModal: () => void
}) {
  const [taxId, setTaxId] = useState(currentTIN)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taxId.trim()) {
      toast.error('Please enter a Tax ID')
      return
    }
    onSave(taxId.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="taxId">Tax Identification Number (Tax ID) *</Label>
        <Input
          id="taxId"
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
          placeholder="Enter your Tax ID"
          required
        />
        <p className="text-xs text-muted-foreground">
          Your Tax Identification Number from the Nigerian tax authority
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onOpenNrsModal}
          className="flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Get Tax ID from NRS Portal
        </Button>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

// KYC Upload Form Component
function KYCUploadForm({ 
  onUpload, 
  onCancel, 
  uploading 
}: { 
  onUpload: (file: File) => void
  onCancel: () => void
  uploading: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Please upload a valid image (JPEG, PNG) or PDF file')
        return
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please select a file to upload')
      return
    }
    onUpload(file)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="kycFile">Identity Document *</Label>
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            id="kycFile"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          {file ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                disabled={uploading}
              >
                Remove
              </Button>
            </div>
          ) : (
            <label htmlFor="kycFile" className="cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ID, Passport, or Driver's License (PDF, PNG, JPG - Max 10MB)
              </p>
            </label>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={uploading || !file}>
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
