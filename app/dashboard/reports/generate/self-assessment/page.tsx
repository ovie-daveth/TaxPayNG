"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, FileText, Download, Loader2, Info, Calculator, Shield } from "lucide-react"
import { SelfAssessmentPreview, type SelfAssessmentPreviewHandle } from "@/components/reports/self-assessment-preview"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useBusiness } from "@/lib/contexts/business-context"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { reportService, ReportData } from "@/lib/services"
import { toast } from "sonner"

export default function GenerateSelfAssessmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { activeEntityId } = useBusiness()
  const { isSubscribed } = useSubscription()
  const [showPreview, setShowPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(true) // Start in edit mode by default
  const [isSaving, setIsSaving] = useState(false)
  const selfAssessmentRef = useRef<SelfAssessmentPreviewHandle | null>(null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    taxYear: new Date().getFullYear().toString(),
    period: 'annual' as 'annual' | 'q1' | 'q2' | 'q3' | 'q4',
    includeIncome: true,
    includeExpenses: true,
    includeTax: true,
    includeReliefs: true,
    includeDocuments: false
  })

  // Get platform from URL params
  useEffect(() => {
    const platform = searchParams.get('platform')
    if (platform) {
      setSelectedPlatform(platform)
    }
  }, [searchParams])

  // Load existing report if editing
  useEffect(() => {
    const loadExistingReport = () => {
      try {
        const editingReportStr = sessionStorage.getItem('editingReport')
        if (editingReportStr) {
          const editingReport = JSON.parse(editingReportStr)
          
          // Verify it's a Self-Assessment report
          if (editingReport.type !== 'Self-Assessment') {
            sessionStorage.removeItem('editingReport')
            return
          }

          // Use report data directly from sessionStorage (no database fetch needed)
          if (editingReport.reportData) {
            setReportId(editingReport.id)
            setReportData(editingReport.reportData)
            
            // Set form data based on report period
            const period = editingReport.reportData.period
            setFormData(prev => ({
              ...prev,
              taxYear: period.year.toString(),
              period: period.quarter ? `q${period.quarter}` as any : 'annual'
            }))
            
            setShowPreview(true)
            setIsEditing(true)
            
            // Clear sessionStorage after loading
            sessionStorage.removeItem('editingReport')
          }
        }
      } catch (error) {
        console.error("Error loading existing report:", error)
        sessionStorage.removeItem('editingReport')
      }
    }

    loadExistingReport()
  }, [])

  // Calculate period dates based on year and period
  const getPeriodDates = (year: number, period: string) => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-12
    
    if (period === 'annual') {
      // If current year, use today as end date; otherwise use Dec 31
      const endDate = year === currentYear 
        ? now.toISOString().split('T')[0] // Today's date
        : `${year}-12-31`
      return {
        startDate: `${year}-01-01`,
        endDate,
        periodType: 'annual' as const
      }
    }
    
    const quarters: { [key: string]: { start: string; end: string; endMonth: number } } = {
      q1: { start: `${year}-01-01`, end: `${year}-03-31`, endMonth: 3 },
      q2: { start: `${year}-04-01`, end: `${year}-06-30`, endMonth: 6 },
      q3: { start: `${year}-07-01`, end: `${year}-09-30`, endMonth: 9 },
      q4: { start: `${year}-10-01`, end: `${year}-12-31`, endMonth: 12 }
    }
    
    const quarter = quarters[period]
    // If current year and current quarter, use today as end date; otherwise use quarter end
    const endDate = (year === currentYear && currentMonth <= quarter.endMonth)
      ? now.toISOString().split('T')[0] // Today's date
      : quarter.end
    
    return {
      startDate: quarter.start,
      endDate,
      periodType: 'quarterly' as const,
      quarter: parseInt(period[1])
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid || !profile?.userId) {
      toast.error("Please log in to generate reports")
      return
    }

    // Check subscription
    if (!isSubscribed) {
      setShowSubscriptionModal(true)
      return
    }

    setIsGenerating(true)
    try {
      const year = parseInt(formData.taxYear)
      const periodInfo = getPeriodDates(year, formData.period)
      
      const period = {
        startDate: periodInfo.startDate,
        endDate: periodInfo.endDate,
        year,
        quarter: periodInfo.quarter,
        periodType: periodInfo.periodType
      }

      // For self-assessment, use only transaction data (no invoices)
      // If platform is specified, generate platform-specific report
      const data = selectedPlatform
        ? await reportService.generatePlatformReportData(
            profile.userId,
            selectedPlatform,
            period,
            false, // includeInvoices = false (use only transactions)
            activeEntityId || undefined,
            profile.defaultEntityId
          )
        : await reportService.generateReportData(
            profile.userId,
            period,
            false, // includeInvoices = false (use only transactions)
            activeEntityId || undefined,
            profile.defaultEntityId
          )

      // Generate report title
      const periodLabel = period.periodType === 'annual' 
        ? `Annual ${period.year}`
        : period.quarter 
        ? `Q${period.quarter} ${period.year}`
        : `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`

      const platformLabel = selectedPlatform ? ` - ${selectedPlatform}` : ''
      const title = `Self-Assessment Filing${platformLabel} - ${periodLabel}`

      // Don't save immediately - let user edit first
      setReportId(null) // No report ID yet - will be created on save
      setReportData(data)
      setShowPreview(true)
      setIsEditing(true) // Start in edit mode
      toast.success("Report generated. Please review and save when ready.")
    } catch (error) {
      console.error("Error generating report:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate report")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!reportData || !profile?.userId) {
      toast.error("Missing report information")
      return
    }

    setIsSaving(true)
    try {
      // Upload signature (if any) only at save time
      const prepared = await selfAssessmentRef.current?.prepareForSave?.()
      const dataToSave = prepared || reportData
      if (prepared) setReportData(prepared)

      // Generate report title if not already set
      const period = dataToSave.period
      const periodLabel = period.periodType === 'annual' 
        ? `Annual ${period.year}`
        : period.quarter 
        ? `Q${period.quarter} ${period.year}`
        : `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`
      const title = `Self-Assessment Filing - ${periodLabel}`

      // Include any additional metadata in reportData
      // The reportData should already have all metadata from the preview component via onDataChange
      const reportDataToSave = {
        ...dataToSave,
        // Ensure metadata exists and includes all fields
        metadata: {
          ...(dataToSave as any).metadata,
          personalInfo: (dataToSave as any).metadata?.personalInfo || {},
          attachments: (dataToSave as any).metadata?.attachments || {},
          reliefEvidence: (dataToSave as any).metadata?.reliefEvidence || {},
          reliefNotes: (dataToSave as any).metadata?.reliefNotes || {},
          manualTaxCredits: (dataToSave as any).metadata?.manualTaxCredits || [],
          declarationInfo: (dataToSave as any).metadata?.declarationInfo || {}
        }
      }

      if (reportId) {
        // Update existing report
        await reportService.updateReport(
          reportId,
          'Self-Assessment',
          {
            reportData: reportDataToSave
          }
        )
        toast.success("Report updated successfully")
      } else {
        // Create new report
        const savedReportId = await reportService.saveReport(
          profile.userId,
          title,
          'Self-Assessment',
          reportDataToSave,
          'draft', // Save as draft initially
          activeEntityId || undefined
        )
        setReportId(savedReportId)
        toast.success("Report saved successfully")
      }
      // Close preview and redirect to reports page
      setTimeout(() => {
        router.push('/dashboard/reports')
      }, 1000) // Small delay to show success message
    } catch (error) {
      console.error("Error saving report:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save report")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* <DashboardNav /> */}
      <main className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 max-w-full overflow-x-hidden">
          {!showPreview ? (
            <div className="space-y-4 sm:space-y-6">

              {/* Header Section */}
              <Card className="p-4 sm:p-5 md:p-6">
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="p-2.5 sm:p-3 bg-primary/10 rounded-lg">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">Generate Self-Assessment Tax Return</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Create a comprehensive self-assessment tax return report for filing with the Federal Inland Revenue Service (FIRS) 
                      or Lagos Internal Revenue Service (LIRS). This report includes your income, expenses, reliefs, and calculated tax liability.
                    </p>
                  </div>
                </div>

                <Alert className="mt-3 sm:mt-4">
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <AlertDescription className="text-xs sm:text-sm">
                    <strong>What is a Self-Assessment Tax Return?</strong> A self-assessment tax return is a document that taxpayers use to 
                    report their income, claim deductions and reliefs, and calculate their tax liability for a given tax year. 
                    In Nigeria, self-employed individuals, freelancers, and small business owners are required to file self-assessment returns 
                    annually with the tax authorities. This report helps you prepare and file your tax return accurately.
                  </AlertDescription>
                </Alert>
              </Card>

              {/* Configuration Form */}
              <Card className="p-4 sm:p-5 md:p-6">
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
                    <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
                    Report Configuration
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Configure your self-assessment filing details and select what to include in the report
                  </p>
                </div>

              <form
                className="space-y-6"
                onSubmit={handleGenerate}
              >
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax-year">Tax Year</Label>
                    <Select 
                      value={formData.taxYear}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, taxYear: value }))}
                    >
                      <SelectTrigger id="tax-year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period">Period</Label>
                    <Select 
                      value={formData.period}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, period: value as any }))}
                    >
                      <SelectTrigger id="period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="q1">Q1 (Jan-Mar)</SelectItem>
                        <SelectItem value="q2">Q2 (Apr-Jun)</SelectItem>
                        <SelectItem value="q3">Q3 (Jul-Sep)</SelectItem>
                        <SelectItem value="q4">Q4 (Oct-Dec)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="font-semibold mb-4">Include in Report</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-income" 
                        checked={formData.includeIncome}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeIncome: !!checked }))}
                      />
                      <Label htmlFor="include-income" className="cursor-pointer font-normal">
                        Income Statement (All transactions)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-expenses" 
                        checked={formData.includeExpenses}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeExpenses: !!checked }))}
                      />
                      <Label htmlFor="include-expenses" className="cursor-pointer font-normal">
                        Expense Breakdown
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-tax" 
                        checked={formData.includeTax}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeTax: !!checked }))}
                      />
                      <Label htmlFor="include-tax" className="cursor-pointer font-normal">
                        Tax Calculation Details
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-reliefs" 
                        checked={formData.includeReliefs}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeReliefs: !!checked }))}
                      />
                      <Label htmlFor="include-reliefs" className="cursor-pointer font-normal">
                        Reliefs and Deductions
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-documents"
                        checked={formData.includeDocuments}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeDocuments: !!checked }))}
                      />
                      <Label htmlFor="include-documents" className="cursor-pointer font-normal">
                        Supporting Documents (Receipts & Invoices)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Link href="/dashboard/reports" className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" className="flex-1 text-xs sm:text-sm" disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="hidden sm:block w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Generate Self-Assessment</span>
                        <span className="sm:hidden">Generate</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
              </Card>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-4">
              {/* Back Button */}
              <Link href="/dashboard/reports">
                <Button variant="ghost" className="mb-2 sm:mb-3 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back to Reports</span>
                </Button>
              </Link>

              <Card className="p-2 sm:p-3 md:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg md:text-xl font-semibold">Report Preview</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {reportId ? 'Edit your saved self-assessment filing' : 'Review and edit your self-assessment filing before saving'}
                    </p>
                  </div>
                  <div className="flex justify-end w-full sm:w-auto">
                    <Button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                          <span className="hidden sm:inline">Saving...</span>
                          <span className="sm:hidden">Saving...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                          <span className="hidden sm:inline">{reportId ? 'Save Changes' : 'Save Report'}</span>
                          <span className="sm:hidden">Save</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
              {reportData ? (
                <SelfAssessmentPreview 
                  ref={selfAssessmentRef}
                  reportData={reportData} 
                  formData={formData}
                  isEditing={isEditing}
                  onDataChange={setReportData}
                />
              ) : (
                <Card className="p-8">
                  <div className="text-center text-muted-foreground">
                    No report data available
                  </div>
                </Card>
              )}
            </div>
          )}
      </main>
      {profile && profile.businessType !== 'consultant' && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile.businessType || 'freelancer'}
        />
      )}
    </div>
  )
}
