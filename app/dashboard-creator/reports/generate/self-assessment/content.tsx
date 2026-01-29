"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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

export default function GenerateSelfAssessmentPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { activeEntityId } = useBusiness()
  const { hasAccess } = useSubscription()
  const [showPreview, setShowPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showFileButton, setShowFileButton] = useState(false)
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
          
          if (editingReport.type !== 'Self-Assessment') {
            sessionStorage.removeItem('editingReport')
            return
          }

          if (editingReport.reportData) {
            setReportId(editingReport.id)
            setReportData(editingReport.reportData)
            
            const period = editingReport.reportData.period
            setFormData(prev => ({
              ...prev,
              taxYear: period.year.toString(),
              period: period.quarter ? `q${period.quarter}` as any : 'annual'
            }))
            
            setShowPreview(true)
            setIsEditing(true)
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

  const getPeriodDates = (year: number, period: string) => {
    const now = new Date()
    const currentYear = now.getFullYear()
    
    if (period === 'annual') {
      const endDate = year === currentYear 
        ? now.toISOString().split('T')[0]
        : `${year}-12-31`
      return {
        startDate: `${year}-01-01`,
        endDate,
        quarter: undefined,
        periodType: 'annual' as const
      }
    } else {
      const quarter = parseInt(period.replace('q', ''))
      const quarterStartMonth = (quarter - 1) * 3
      const quarterEndMonth = quarter * 3 - 1
      
      const startDate = `${year}-${String(quarterStartMonth + 1).padStart(2, '0')}-01`
      let endDate: string
      
      if (year === currentYear && quarter === Math.floor(now.getMonth() / 3) + 1) {
        endDate = now.toISOString().split('T')[0]
      } else {
        const lastDay = new Date(year, quarterEndMonth + 1, 0).getDate()
        endDate = `${year}-${String(quarterEndMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      }
      
      return {
        startDate,
        endDate,
        quarter,
        periodType: 'quarterly' as const
      }
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.uid || !profile?.userId) {
      toast.error("Please log in to generate reports")
      return
    }

    // Allow access for active free trial users too
    if (!hasAccess()) {
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

      const data = selectedPlatform
        ? await reportService.generatePlatformReportData(
            profile.userId,
            selectedPlatform,
            period,
            false,
            activeEntityId || undefined,
            profile.defaultEntityId
          )
        : await reportService.generateReportData(
            profile.userId,
            period,
            false,
            activeEntityId || undefined,
            profile.defaultEntityId
          )

      const periodLabel = period.periodType === 'annual' 
        ? `Annual ${period.year}`
        : period.quarter 
        ? `Q${period.quarter} ${period.year}`
        : `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`

      const platformLabel = selectedPlatform ? ` - ${selectedPlatform}` : ''
      const title = `Self-Assessment Filing${platformLabel} - ${periodLabel}`

      setReportId(null)
      setReportData(data)
      setShowPreview(true)
      setIsEditing(true)
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
      const prepared = await selfAssessmentRef.current?.prepareForSave?.()
      const dataToSave = prepared || reportData
      if (prepared) setReportData(prepared)

      const period = dataToSave.period
      const periodLabel = period.periodType === 'annual' 
        ? `Annual ${period.year}`
        : period.quarter 
        ? `Q${period.quarter} ${period.year}`
        : `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`
      const platformLabel = selectedPlatform ? ` - ${selectedPlatform}` : ''
      const title = `Self-Assessment Filing${platformLabel} - ${periodLabel}`

      const reportDataToSave = {
        ...dataToSave,
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
        await reportService.updateReport(
          reportId,
          'Self-Assessment',
          {
            reportData: reportDataToSave
          }
        )
        toast.success("Report updated successfully")
      } else {
        const savedReportId = await reportService.saveReport(
          profile.userId,
          title,
          'Self-Assessment',
          reportDataToSave,
          'draft',
          activeEntityId || undefined
        )
        setReportId(savedReportId)
        toast.success("Report saved successfully")
      }
      // Show file button after successful save
      setShowFileButton(true)
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving report:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save report")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background overflow-x-hidden">
        <main className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 max-w-full overflow-x-hidden">
          {!showPreview ? (
            <div className="space-y-4 sm:space-y-6">
              <Card className="p-4 sm:p-5 md:p-6">
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="p-2.5 sm:p-3 bg-primary/10 rounded-lg">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                      Generate Self-Assessment Tax Return
                      {selectedPlatform && (
                        <span className="text-sm text-muted-foreground block mt-1">
                          Platform: {selectedPlatform}
                        </span>
                      )}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Create a comprehensive self-assessment tax return report for filing with the Federal Inland Revenue Service (FIRS) 
                      or Lagos Internal Revenue Service (LIRS). This report includes your income, expenses, reliefs, and calculated tax liability.
                      {selectedPlatform && ` This report is filtered to show only transactions from ${selectedPlatform}.`}
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

                <form className="space-y-6" onSubmit={handleGenerate}>
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
                    <Link href="/dashboard-creator/reports" className="flex-1">
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
              <Link href="/dashboard-creator/reports">
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
                  showFileButton={showFileButton}
                  reportId={reportId}
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
      </div>
      {profile && profile.businessType !== 'consultant' && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile.businessType || 'creator'}
        />
      )}
    </>
  )
}

