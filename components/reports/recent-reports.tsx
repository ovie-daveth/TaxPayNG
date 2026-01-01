"use client"

import { useRef, useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Eye, FileText, Trash2, Loader2, Edit, MessageSquare, CheckCircle2, ExternalLink, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { reportService } from "@/lib/services"
import { SavedReport } from "@/lib/types"
import { toast } from "sonner"
import { format } from "date-fns"
import { SelfAssessmentPreview, type SelfAssessmentPreviewHandle } from "./self-assessment-preview"
import { IncomeStatementPreview } from "./income-statement-preview"
import { ExpenseReportPreview } from "./expense-report-preview"
import { TaxSummaryPreview } from "./tax-summary-preview"

export function RecentReports() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [reports, setReports] = useState<SavedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingReport, setEditingReport] = useState<SavedReport | null>(null)
  const [editingReportData, setEditingReportData] = useState<any>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<SavedReport | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const selfAssessmentEditRef = useRef<SelfAssessmentPreviewHandle | null>(null)

  useEffect(() => {
    if (profile?.userId) {
      loadReports()
    }
  }, [profile?.userId])

  const loadReports = async () => {
    if (!profile?.userId) return

    try {
      setLoading(true)
      const userReports = await reportService.getUserReports(profile.userId)
      setReports(userReports)
    } catch (error) {
      console.error("Error loading reports:", error)
      toast.error("Failed to load reports")
    } finally {
      setLoading(false)
    }
  }

  const handleView = (report: SavedReport) => {
    setSelectedReport(report)
    setShowViewDialog(true)
  }

  const handleEdit = (report: SavedReport) => {
    setEditingReport(report)
    setEditingReportData(report.reportData)
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    if (!editingReport || !editingReportData) return

    try {
      setSaving(true)
      let dataToSave = editingReportData
      if (editingReport.type === "Self-Assessment" && selfAssessmentEditRef.current) {
        dataToSave = await selfAssessmentEditRef.current.prepareForSave()
        setEditingReportData(dataToSave)
      }
      await reportService.updateReport(editingReport.id, editingReport.type, {
        reportData: dataToSave
      })
      toast.success("Report updated successfully")
      
      // Update the report in the list
      setReports(reports.map(r => 
        r.id === editingReport.id 
          ? { ...r, reportData: dataToSave }
          : r
      ))
      
      setShowEditDialog(false)
      setEditingReport(null)
      setEditingReportData(null)
    } catch (error) {
      console.error("Error saving report:", error)
      toast.error("Failed to save report")
    } finally {
      setSaving(false)
    }
  }

  const handleEditDataChange = (data: any) => {
    setEditingReportData(data)
  }

  const handleDeleteClick = (report: SavedReport) => {
    setReportToDelete(report)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return

    try {
      setDeleting(true)
      await reportService.deleteReport(reportToDelete.id, reportToDelete.type)
      toast.success("Report deleted successfully")
      setReports(reports.filter(r => r.id !== reportToDelete.id))
      setShowDeleteDialog(false)
      setReportToDelete(null)
    } catch (error) {
      console.error("Error deleting report:", error)
      toast.error("Failed to delete report")
    } finally {
      setDeleting(false)
    }
  }

  const formatPeriod = (period: SavedReport['period']) => {
    if (period.periodType === 'annual') {
      return `Annual ${period.year}`
    }
    if (period.quarter) {
      return `Q${period.quarter} ${period.year}`
    }
    return `${format(new Date(period.startDate), 'MMM dd')} - ${format(new Date(period.endDate), 'MMM dd, yyyy')}`
  }

  if (loading) {
    return (
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-center py-6 sm:py-8">
          <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    )
  }

  if (reports.length === 0) {
  return (
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold">Recent Reports</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Your previously generated reports</p>
        </div>
        <div className="text-center py-6 sm:py-8 text-muted-foreground">
          <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm sm:text-base">No reports generated yet</p>
        </div>
      </Card>
    )
  }

  return (
    <>
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold">Recent Reports</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Your previously generated reports</p>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0 w-full sm:w-auto">
              <h3 className="font-medium text-xs sm:text-sm mb-1.5 sm:mb-1 truncate">{report.title}</h3>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3">
                <Badge variant="secondary" className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1">
                  {report.type}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatPeriod(report.period)}</span>
                <span className="hidden sm:inline text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  Generated {format(new Date(report.generatedAt || report.createdAt), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
              <Badge variant={report.status === "submitted" ? "default" : report.status === "completed" ? "secondary" : "outline"} className="text-xs capitalize px-1.5 sm:px-2 py-0.5 sm:py-1">
                {report.status}
              </Badge>
              {report.filingMethod === 'agent' && report.filingStatus === 'submitted' && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    // Extract requestId from report metadata or navigate to filing requests list
                    // For now, navigate to filing requests page where user can find their request
                    router.push('/dashboard/filing-requests')
                  }}
                  title="View filing request status"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                >
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              )}
              {report.status === 'draft' && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleEdit(report)}
                  title="Edit report"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                >
                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleView(report)}
                title="View report"
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleDeleteClick(report)}
                title="Delete report"
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>

      {/* View Report Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-5xl max-h-[90vh] sm:max-h-[95vh] overflow-y-auto p-3 sm:p-4 md:p-6">
          <DialogHeader className="pb-2 sm:pb-4">
            <DialogTitle className="text-base sm:text-lg md:text-xl">{selectedReport?.title}</DialogTitle>
          </DialogHeader>
          {selectedReport?.reportData && (
            <>
              {selectedReport.type === 'Self-Assessment' && (
                <SelfAssessmentPreview
                  reportData={selectedReport.reportData}
                  formData={{
                    includeIncome: true,
                    includeExpenses: true,
                    includeTax: true,
                    includeReliefs: true
                  }}
                  reportId={selectedReport.id}
                  showFileButton={true}
                  filingStatus={selectedReport.filingStatus}
                  filingMethod={selectedReport.filingMethod}
                />
              )}
              {selectedReport.type === 'Income Statement' && (
                <IncomeStatementPreview
                  reportData={selectedReport.reportData}
                  formData={{
                    includeInvoices: true,
                    includeTransactions: true
                  }}
                  onBack={() => setShowViewDialog(false)}
                />
              )}
              {selectedReport.type === 'Expense Report' && (
                <ExpenseReportPreview
                  reportData={selectedReport.reportData}
                  onBack={() => setShowViewDialog(false)}
                />
              )}
              {selectedReport.type === 'Tax Summary' && (
                <TaxSummaryPreview
                  reportData={selectedReport.reportData}
                  onBack={() => setShowViewDialog(false)}
                />
              )}
              {selectedReport.type !== 'Self-Assessment' && selectedReport.type !== 'Income Statement' && selectedReport.type !== 'Expense Report' && selectedReport.type !== 'Tax Summary' && (
                <div className="p-8 text-center text-muted-foreground">
                  Preview not yet implemented for {selectedReport.type}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Report Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-5xl max-h-[90vh] sm:max-h-[95vh] overflow-y-auto p-3 sm:p-4 md:p-6">
          <DialogHeader className="pb-2 sm:pb-4">
            <DialogTitle className="text-base sm:text-lg md:text-xl">Edit {editingReport?.title}</DialogTitle>
          </DialogHeader>
          {editingReport && editingReportData && (
            <>
              {editingReport.type === 'Self-Assessment' && (
                <SelfAssessmentPreview
                  ref={selfAssessmentEditRef}
                  reportData={editingReportData}
                  formData={{
                    includeIncome: true,
                    includeExpenses: true,
                    includeTax: true,
                    includeReliefs: true
                  }}
                  isEditing={true}
                  onDataChange={handleEditDataChange}
                  reportId={editingReport.id}
                  showFileButton={false}
                  filingStatus={editingReport.filingStatus}
                  filingMethod={editingReport.filingMethod}
                />
              )}
              {editingReport.type === 'Income Statement' && (
                <div className="p-8 text-center text-muted-foreground">
                  Editing not yet implemented for Income Statement
                </div>
              )}
              {editingReport.type === 'Expense Report' && (
                <div className="p-8 text-center text-muted-foreground">
                  Editing not yet implemented for Expense Report
                </div>
              )}
              {editingReport.type === 'Tax Summary' && (
                <div className="p-8 text-center text-muted-foreground">
                  Editing not yet implemented for Tax Summary
                </div>
              )}
              {editingReport.type !== 'Self-Assessment' && editingReport.type !== 'Income Statement' && editingReport.type !== 'Expense Report' && editingReport.type !== 'Tax Summary' && (
                <div className="p-8 text-center text-muted-foreground">
                  Editing not yet implemented for {editingReport.type}
                </div>
              )}
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false)
                    setEditingReport(null)
                    setEditingReportData(null)
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{reportToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
