"use client"

import { useState } from "react"
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
import { SelfAssessmentPreview } from "@/components/reports/self-assessment-preview"
import { ExpenseReportPreview } from "@/components/reports/expense-report-preview"

interface GenerateReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportType: 'income' | 'expense' | 'self-assessment'
  transactions?: any[] // For expense, we can use current transactions
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
  const [formData, setFormData] = useState({
    taxYear: new Date().getFullYear().toString(),
    period: 'annual' as 'annual' | 'q1' | 'q2' | 'q3' | 'q4',
    includeInvoices: reportType === 'income' // Only for income report
  })

  // Calculate period dates based on year and period
  const getPeriodDates = (year: number, period: string) => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-12

    if (period === 'annual') {
      return {
        startDate: `${year}-01-01`,
        endDate: year === currentYear 
          ? now.toISOString().split('T')[0] // Today's date
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

      // Generate report data
      // For expense report, use only transaction data (no invoices)
      const data = await reportService.generateReportData(
        profile.userId,
        period,
        reportType === 'income' ? formData.includeInvoices : false
      )

      // Generate report title
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

      // Save the report and show preview
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
        // For expense report, save as Expense Report type
        reportId = await reportService.saveReport(
          profile.userId,
          title,
          'Expense Report',
          data,
          'draft'
        )
        toast.success("Expense report generated and saved")
      } else {
        // For self-assessment, don't save yet - wait for user to edit and click save
        // reportId will remain null until user clicks "Save Report"
        toast.success("Self-assessment report generated. Please review and save when ready.")
      }
      
      // Show preview instead of closing
      setReportData(data)
      setSavedReportId(reportId)
      setShowPreview(true)
      // For self-assessment, start in editing mode
      if (reportType === 'self-assessment') {
        setIsEditing(true)
      }
    } catch (error) {
      console.error("Error generating report:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate report")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = async () => {
    if (!reportData) {
      toast.error("No report data available")
      return
    }

    try {
      setIsGenerating(true)
      
      // Combine all transactions from income and expenses
      const allTransactions = [
        ...(reportData.income.transactions || []),
        ...(reportData.expenses.transactions || [])
      ]
      
      // Remove duplicates based on transaction ID
      const uniqueTransactions = Array.from(
        new Map(allTransactions.map(t => [t.id, t])).values()
      )
      
      const exportData = uniqueTransactions.map(t => ({
        date: t.transactionDate || t.valueDate || t.date || '',
        description: t.description || '',
        category: t.category || '',
        amount: typeof t.amount === 'number' ? t.amount : Number(String(t.amount).replace(/[\u20A6,]/g, '').trim()) || 0,
        type: t.type || '',
        paymentMethod: t.paymentMethod || '',
        currency: t.currency || 'NGN',
        ngnEquivalent: t.ngnEquivalent || (typeof t.amount === 'number' ? t.amount : Number(String(t.amount).replace(/[\u20A6,]/g, '').trim()) || 0),
        notes: t.notes || ''
      }))
      
      const csv = [
        ['Date', 'Description', 'Category', 'Amount', 'Currency', 'NGN Equivalent', 'Type', 'Payment Method', 'Notes'],
        ...exportData.map(t => [
          t.date || '',
          `"${(t.description || '').replace(/"/g, '""')}"`,
          t.category || '',
          t.amount.toString(),
          t.currency,
          t.ngnEquivalent.toString(),
          t.type,
          t.paymentMethod || '',
          `"${(t.notes || '').replace(/"/g, '""')}"`
        ])
      ].map(row => row.join(',')).join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const periodLabel = reportData.period.periodType === 'annual' 
        ? `Annual-${reportData.period.year}`
        : reportData.period.quarter 
        ? `Q${reportData.period.quarter}-${reportData.period.year}`
        : `${reportData.period.startDate}-${reportData.period.endDate}`
      a.download = `transactions-export-${periodLabel}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success("Transactions exported successfully")
    } catch (error) {
      console.error('Error exporting transactions:', error)
      toast.error("Failed to export transactions")
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

  // Handle saving self-assessment report
  const handleSave = async () => {
    if (!reportData || !profile?.userId) {
      toast.error("Missing report information")
      return
    }

    setIsSaving(true)
    try {
      // Generate report title
      const periodLabel = reportData.period.periodType === 'annual' 
        ? `Annual ${reportData.period.year}`
        : reportData.period.quarter 
        ? `Q${reportData.period.quarter} ${reportData.period.year}`
        : `${new Date(reportData.period.startDate).toLocaleDateString()} - ${new Date(reportData.period.endDate).toLocaleDateString()}`
      
      const title = `Self-Assessment Filing - ${periodLabel}`

      if (savedReportId) {
        // Update existing report
        await reportService.updateReport(
          savedReportId,
          'Self-Assessment',
          {
            reportData,
            updatedAt: new Date().toISOString()
          }
        )
        toast.success("Report updated successfully")
      } else {
        // Create new report (first time saving)
        const reportId = await reportService.saveReport(
          profile.userId,
          title,
          'Self-Assessment',
          reportData,
          'draft'
        )
        setSavedReportId(reportId)
        toast.success("Report saved successfully")
      }

      // Exit editing mode and show file button
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving report:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save report")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle data changes from self-assessment preview
  const handleDataChange = (updatedData: ReportData) => {
    setReportData(updatedData)
  }

  // Reset preview when modal closes
  const handleClose = (open: boolean) => {
    if (!open) {
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
        <DialogContent className={`${showPreview ? 'max-w-5xl' : 'max-w-2xl'} max-h-[90vh] overflow-y-auto`}>
          {showPreview && reportData ? (
            // Show preview
            <div className="px-6 py-4">
              <DialogHeader className="mb-4">
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {getReportTitle()} - Preview
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
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
                  <div className="space-y-4">
                    <SelfAssessmentPreview
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
                      <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowPreview(false)
                            setReportData(null)
                            setIsEditing(false)
                            setSavedReportId(null)
                          }}
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4 mr-2" />
                              Save Report
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Show form
            <>
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {getReportTitle()}
                </DialogTitle>
                <DialogDescription>
                  {getReportDescription()}
                </DialogDescription>
              </DialogHeader>

            <form onSubmit={handleGenerate} className="space-y-6 px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <SelectItem value="q1">Q1 (Jan - Mar)</SelectItem>
                      <SelectItem value="q2">Q2 (Apr - Jun)</SelectItem>
                      <SelectItem value="q3">Q3 (Jul - Sep)</SelectItem>
                      <SelectItem value="q4">Q4 (Oct - Dec)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {reportType === 'income' && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Include in Report</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="include-invoices"
                        checked={formData.includeInvoices}
                        onChange={(e) => setFormData(prev => ({ ...prev, includeInvoices: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label htmlFor="include-invoices" className="font-normal cursor-pointer">
                        Include Invoice Income
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {profile && profile.businessType !== 'agent' && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile.businessType || 'freelancer'}
        />
      )}
    </>
  )
}

