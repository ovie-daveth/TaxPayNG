"use client"

import { useState, useEffect } from "react"
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
import { SelfAssessmentPreview } from "./self-assessment-preview"
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<SavedReport | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    // Navigate to the appropriate edit page based on report type
    const editRoutes: Record<string, string> = {
      'Self-Assessment': '/dashboard/reports/generate/self-assessment',
      'Income Statement': '/dashboard/reports/generate/income-statement',
      'Expense Report': '/dashboard/reports/generate/expense-report',
      'Tax Summary': '/dashboard/reports/generate/tax-summary'
    }
    
    const route = editRoutes[report.type]
    if (route) {
      // Store report data in sessionStorage to load in edit mode
      sessionStorage.setItem('editingReport', JSON.stringify({
        id: report.id,
        reportData: report.reportData,
        type: report.type
      }))
      router.push(route)
    }
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
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    )
  }

  if (reports.length === 0) {
  return (
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Recent Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">Your previously generated reports</p>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No reports generated yet</p>
        </div>
      </Card>
    )
  }

  return (
    <>
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Recent Reports</h2>
        <p className="text-sm text-muted-foreground mt-1">Your previously generated reports</p>
      </div>

      <div className="space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm mb-1 truncate">{report.title}</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {report.type}
                </Badge>
                  <span className="text-xs text-muted-foreground">{formatPeriod(report.period)}</span>
                <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    Generated {format(new Date(report.generatedAt || report.createdAt), 'MMM dd, yyyy')}
                  </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={report.status === "submitted" ? "default" : report.status === "completed" ? "secondary" : "outline"} className="text-xs capitalize">
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
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              )}
              {report.status === 'draft' && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleEdit(report)}
                  title="Edit report"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleView(report)}
                title="View report"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleDeleteClick(report)}
                title="Delete report"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>

      {/* View Report Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReport?.title}</DialogTitle>
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
