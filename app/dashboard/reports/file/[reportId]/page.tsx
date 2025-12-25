"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
        router.push('/dashboard/reports')
        return
      }

      setReport(loadedReport)
    } catch (error) {
      console.error("Error loading report:", error)
      toast.error("Failed to load report")
      router.push('/dashboard/reports')
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
      actionUrl: !isProfileComplete ? "/dashboard/settings" : undefined,
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
      actionUrl: !isTINVerified ? "/dashboard/settings" : undefined,
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
        actionUrl: !hasKYCDocuments ? "/dashboard/settings?tab=profile&section=kyc" : undefined,
        actionLabel: !hasKYCDocuments ? "Upload Documents" : undefined
      })
    } catch (error) {
      console.error("Error checking KYC documents:", error)
      checks.push({
        name: "KYC Documents",
        status: false,
        message: "Unable to verify KYC documents",
        actionUrl: "/dashboard/settings?tab=profile&section=kyc",
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
        actionUrl: !hasData ? "/dashboard/transactions" : undefined,
        actionLabel: !hasData ? "Add Transactions" : undefined
      })
    } catch (error) {
      console.error("Error checking transaction data:", error)
      checks.push({
        name: "Income & Expense Data",
        status: false,
        message: "Unable to verify transaction data",
        actionUrl: "/dashboard/transactions",
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
      // Has balance to pay - go to payment flow first
      router.push(`/dashboard/reports/file/${reportId}/generate-rrr`)
    } else {
      // No balance or already balanced - go directly to state selection and submission
      // Use payment-success page with amount=0 (it handles state selection and submission method)
      router.push(`/dashboard/reports/file/${reportId}/payment-success?amount=0`)
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
          <Button onClick={() => router.push('/dashboard/reports')} className="mt-4">
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
                <div className="mt-4">
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
                      'File Tax Return'
                    )}
                  </Button>
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
                      onClick={() => router.push(`/dashboard/reports/file/${reportId}/generate-rrr`)}
                      className="w-full sm:w-auto"
                    >
                      Pay Balance (₦{balanceDue.toLocaleString()})
                    </Button>
                  </div>
                )}
                {balanceDue && balanceDue <= 0 && (
                  <div className="mt-4">
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={() => router.push(`/dashboard/reports/file/${reportId}/confirmation?method=filed&amount=${report.reportData?.tax?.netTaxPayable || 0}`)}
                      className="w-full sm:w-auto"
                    >
                      View Filing Confirmation
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* Report Preview */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Tax Return Preview</h2>
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
                />
              )}
            </Card>
          </div>
        </main>

    </div>
  )
}

