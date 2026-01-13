"use client"

import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, FileText, Download } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { reportService, ReportData } from "@/lib/services"
import { toast } from "sonner"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { IncomeStatementPreview } from "@/components/reports/income-statement-preview"
import { SelfAssessmentPreview, type SelfAssessmentPreviewHandle } from "@/components/reports/self-assessment-preview"
import { ExpenseReportPreview } from "@/components/reports/expense-report-preview"

interface GenerateReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportType: 'income' | 'expense' | 'self-assessment'
  transactions?: any[]
}

export function GenerateReportModal({
  open,
  onOpenChange,
  reportType,
  transactions = []
}: GenerateReportModalProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { isSubscribed } = useSubscription()
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [savedReportId, setSavedReportId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const selfAssessmentRef = useRef<SelfAssessmentPreviewHandle | null>(null)
  const [formData, setFormData] = useState({
    taxYear: new Date().getFullYear().toString(),
    period: 'annual' as 'annual' | 'q1' | 'q2' | 'q3' | 'q4',
    includeInvoices: reportType === 'income'
  })

  const getPeriodDates = (year: number, period: string) => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    if (period === 'annual') {
      return {
        startDate: `${year}-01-01`,
        endDate: year === currentYear 
          ? now.toISOString().split('T')[0]
          : `${year}-12-31`,
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
    const endDate = (year === currentYear && currentMonth <= quarter.endMonth)
      ? now.toISOString().split('T')[0]
      : quarter.end
    
    return {
      startDate: quarter.start,
      endDate,
      periodType: 'quarterly' as const,
      quarter: parseInt(period[1])
    }
  }

  const handleGenerate = async () => {
    if (!user?.uid || !profile?.userId) {
      toast.error("Please log in to generate reports")
      return
    }

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

      const data = await reportService.generateReportData(
        profile.userId,
        period,
        reportType === 'income' ? formData.includeInvoices : false
      )

      const periodLabel = period.periodType === 'annual' 
        ? `Annual ${period.year}`
        : period.quarter 
        ? `Q${period.quarter} ${period.year}`
        : `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`

      const title = reportType === 'income' 
        ? `Income Statement - ${periodLabel}`
        : reportType === 'expense'
        ? `Expense Report - ${periodLabel}`
        : `Self-Assessment Filing - ${periodLabel}`

      let reportId: string | null = null
      if (reportType === 'income') {
        reportId = await reportService.saveReport(
          profile.userId,
          title,
          'Income Statement',
          data,
          'draft'
        )
        toast.success("Income statement generated and saved successfully")
      } else if (reportType === 'expense') {
        reportId = await reportService.saveReport(
          profile.userId,
          title,
          'Expense Report',
          data,
          'draft'
        )
        toast.success("Expense report generated and saved")
      } else {
        // For self-assessment, don't auto-save, let user review and save manually
        toast.success("Self-assessment report generated. Please review and save when ready.")
      }
      
      setReportData(data)
      setSavedReportId(reportId)
      setShowPreview(true)
      if (reportType === 'self-assessment') {
        setIsEditing(true)
        // Don't close modal - keep it open for review and filing
      }
    } catch (error) {
      console.error("Error generating report:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate report")
    } finally {
      setIsGenerating(false)
    }
  }

  const getReportTitle = () => {
    switch (reportType) {
      case 'income':
        return 'Generate Income Report'
      case 'expense':
        return 'Generate Expense Report'
      case 'self-assessment':
        return 'Generate Self Assessment Report'
      default:
        return 'Generate Report'
    }
  }

  const getReportDescription = () => {
    switch (reportType) {
      case 'income':
        return 'Create a comprehensive income statement report showing your total income, income by category, and income by source for the selected period.'
      case 'expense':
        return 'Generate an expense report for the selected period showing all your expenses. Review and download as CSV for external analysis or record keeping.'
      case 'self-assessment':
        return 'Generate a self-assessment tax filing report for the selected period. Review and submit when ready.'
      default:
        return ''
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

      const periodLabel = dataToSave.period.periodType === 'annual' 
        ? `Annual ${dataToSave.period.year}`
        : dataToSave.period.quarter 
        ? `Q${dataToSave.period.quarter} ${dataToSave.period.year}`
        : `${new Date(dataToSave.period.startDate).toLocaleDateString()} - ${new Date(dataToSave.period.endDate).toLocaleDateString()}`
      
      const title = `Self-Assessment Filing - ${periodLabel}`

      let finalReportId = savedReportId
      
      if (savedReportId) {
        await reportService.updateReport(
          savedReportId,
          'Self-Assessment',
          {
            reportData: dataToSave,
            updatedAt: new Date().toISOString()
          }
        )
        toast.success("Report updated successfully. You can now file from here.")
      } else {
        const reportId = await reportService.saveReport(
          profile.userId,
          title,
          'Self-Assessment',
          dataToSave,
          'draft'
        )
        setSavedReportId(reportId)
        finalReportId = reportId
        toast.success("Report saved successfully. You can now file from here.")
      }

      // Exit editing mode to show file button, but keep modal open
      setIsEditing(false)
      
      // Ensure reportId is set for file button to show
      if (finalReportId && !savedReportId) {
        setSavedReportId(finalReportId)
      }
    } catch (error) {
      console.error("Error saving report:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save report")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDataChange = (updatedData: ReportData) => {
    setReportData(updatedData)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      // Only reset state if user explicitly closes (not when navigating to file)
      // This allows the modal to stay open after generating/saving
      setShowPreview(false)
      setReportData(null)
      setSavedReportId(null)
      setIsEditing(false)
    }
    onOpenChange(open)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className={[
            "left-0 top-0 translate-x-0 translate-y-0 w-screen h-[100dvh] rounded-none",
            "sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-full sm:h-auto sm:rounded-lg",
            showPreview ? "sm:max-w-5xl" : "sm:max-w-2xl",
            "overflow-hidden p-0 gap-0",
          ].join(" ")}
        >
          {showPreview && reportData ? (
            <div className="flex flex-col h-[100dvh] sm:max-h-[90vh]">
              <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-3 py-2.5 sm:px-6 sm:py-4 pr-10 sm:pr-12">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-sm sm:text-lg font-semibold truncate">
                      {getReportTitle()} - Preview
                    </DialogTitle>
                    <DialogDescription className="text-[10px] sm:text-sm line-clamp-1 sm:line-clamp-2">
                      Review your report. You can edit fields and file when ready.
                    </DialogDescription>
                  </div>
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-muted-foreground" />
                </div>
              </div>

              <div className="flex-1 overflow-auto px-3 py-3 sm:px-6 sm:pb-4">
                {reportType === 'income' ? (
                  <IncomeStatementPreview
                    reportData={reportData}
                    formData={{
                      includeInvoices: formData.includeInvoices,
                      includeTransactions: true
                    }}
                    onBack={() => {
                      setShowPreview(false)
                      setReportData(null)
                    }}
                  />
                ) : reportType === 'expense' ? (
                  <ExpenseReportPreview
                    reportData={reportData}
                    onBack={() => {
                      setShowPreview(false)
                      setReportData(null)
                    }}
                  />
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <SelfAssessmentPreview
                      ref={selfAssessmentRef}
                      reportData={reportData}
                      reportId={savedReportId || undefined}
                      isEditing={isEditing}
                      onDataChange={handleDataChange}
                      onBack={() => {
                        setShowPreview(false)
                        setReportData(null)
                        setIsEditing(false)
                      }}
                      showFileButton={!isEditing && !!savedReportId}
                    />
                    {isEditing && (
                      <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur px-3 py-2.5 sm:px-6 sm:py-3 -mx-3 sm:-mx-6">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowPreview(false)
                              setReportData(null)
                              setIsEditing(false)
                              setSavedReportId(null)
                            }}
                            disabled={isSaving}
                            className="h-9 sm:h-10 text-xs sm:text-sm"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-9 sm:h-10 text-xs sm:text-sm"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                Save Report
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-3 py-2.5 sm:px-6 sm:py-4 pr-10 sm:pr-12">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-sm sm:text-lg font-semibold truncate">
                      {getReportTitle()}
                    </DialogTitle>
                    <DialogDescription className="text-[10px] sm:text-sm line-clamp-2">
                      {getReportDescription()}
                    </DialogDescription>
                  </div>
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-muted-foreground" />
                </div>
              </div>

              <div className="flex flex-col h-[calc(100dvh-56px)] sm:h-auto">
                <div className="flex-1 overflow-auto px-3 py-3 sm:px-6 sm:py-6 space-y-3 sm:space-y-4">
                  <div className="rounded-lg border bg-muted/20 p-3 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="tax-year" className="text-xs sm:text-sm">Tax Year</Label>
                        <Select 
                          value={formData.taxYear}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, taxYear: value }))}
                        >
                          <SelectTrigger id="tax-year" className="h-10 sm:h-11 text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(year => (
                              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="period" className="text-xs sm:text-sm">Period</Label>
                        <Select 
                          value={formData.period}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, period: value as any }))}
                        >
                          <SelectTrigger id="period" className="h-10 sm:h-11 text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="annual">Annual</SelectItem>
                            <SelectItem value="q1">Q1 (Jan - Mar)</SelectItem>
                            <SelectItem value="q2">Q2 (Apr - Jun)</SelectItem>
                            <SelectItem value="q3">Q3 (Jul - Sep)</SelectItem>
                            <SelectItem value="q4">Q4 (Oct - Dec)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {reportType === 'income' && (
                    <div className="rounded-lg border p-3 sm:p-4">
                      <Label className="text-xs sm:text-sm font-semibold">Include in Report</Label>
                      <div className="mt-2 sm:mt-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="include-invoices"
                            checked={formData.includeInvoices}
                            onChange={(e) => setFormData(prev => ({ ...prev, includeInvoices: e.target.checked }))}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <Label htmlFor="include-invoices" className="font-normal cursor-pointer text-xs sm:text-sm">
                            Include Invoice Income
                          </Label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur px-3 py-2.5 sm:px-6 sm:py-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="h-9 sm:h-11 text-xs sm:text-sm"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleGenerate} disabled={isGenerating} className="h-9 sm:h-11 text-xs sm:text-sm">
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {profile && profile.businessType !== 'consultant' && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile.businessType || 'freelancer'}
        />
      )}
    </>
  )
}