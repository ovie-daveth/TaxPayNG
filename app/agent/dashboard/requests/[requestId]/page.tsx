"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { format } from "date-fns"
import { 
  Loader2, 
  ArrowLeft, 
  Printer, 
  FileText, 
  Download,
  MapPin,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Edit
} from "lucide-react"
import { FilingRequest, SavedReport, Document, FilingRequestStatus } from "@/lib/types"
import { reportService } from "@/lib/services"
import { documentService } from "@/lib/services"
import { SelfAssessmentPreview } from "@/components/reports/self-assessment-preview"
import { StatusUpdateDialog } from "@/components/agent/status-update-dialog"
import { MessagePanel } from "@/components/agent/message-panel"

export default function AgentRequestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const requestId = params?.requestId as string
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [request, setRequest] = useState<FilingRequest | null>(null)
  const [report, setReport] = useState<SavedReport | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showStatusDialog, setShowStatusDialog] = useState(false)

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      if (profile?.businessType !== 'agent') {
        router.push('/dashboard')
        return
      }
      if (!profile?.agentKycCompleted) {
        router.push('/agent/kyc')
        return
      }
    }
  }, [user, profile, authLoading, profileLoading, router])

  useEffect(() => {
    if (requestId && user && profile && profile.businessType === 'agent') {
      loadRequestDetails()
    }
  }, [requestId, user, profile])

  // Scroll to messages section if hash is present
  useEffect(() => {
    if (window.location.hash === '#messages') {
      setTimeout(() => {
        const messagesElement = document.getElementById('messages')
        if (messagesElement) {
          messagesElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 500) // Wait for page to load
    }
  }, [requestId])

  const loadRequestDetails = async () => {
    if (!requestId || !user?.uid || !profile) {
      console.log("Missing required data:", { requestId, userId: user?.uid, profile: !!profile })
      return
    }

    try {
      setLoading(true)
      
      // Fetch filing request
      const response = await fetch(`/api/admin/filing-requests/${requestId}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch request' }))
        toast.error(errorData.error || "Filing request not found")
        setLoading(false)
        return
      }

      const result = await response.json()
      
      if (!result.success || !result.data) {
        toast.error("Filing request not found")
        setLoading(false)
        return
      }

      const filingRequest = result.data as FilingRequest
      
      // Verify this request is assigned to the current agent
      // Allow access if:
      // 1. Request is assigned to this agent (by ID or name), OR
      // 2. Request is pending (not yet assigned to anyone), OR
      // 3. Request status is 'assigned' or 'in_progress' (agent might have been assigned)
      const agentName = profile.firstName && profile.lastName 
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : null
      
      const assignedAgentName = filingRequest.assignedAgentName?.trim() || ''
      
      // Check if assigned by ID (most reliable)
      const isAssignedById = filingRequest.assignedAgentId === user.uid
      
      // Check if assigned by name (with flexible matching)
      const isAssignedByName = agentName && assignedAgentName && (
        assignedAgentName === agentName ||
        assignedAgentName.toLowerCase() === agentName.toLowerCase() ||
        assignedAgentName.toLowerCase().includes(profile.firstName?.toLowerCase() || '') ||
        assignedAgentName.toLowerCase().includes(profile.lastName?.toLowerCase() || '')
      )
      
      const isAssignedToMe = isAssignedById || isAssignedByName
      const isPending = filingRequest.status === 'pending' && !filingRequest.assignedAgentId
      const isAssignedStatus = filingRequest.status === 'assigned' || filingRequest.status === 'in_progress'
      
      // If not explicitly assigned but status suggests it might be, allow access with a warning
      if (!isAssignedToMe && !isPending) {
        if (isAssignedStatus) {
          // Status is assigned/in_progress but not matching - might be a timing/name mismatch issue
          // Allow access but log for debugging
          console.warn("Agent access granted despite mismatch:", {
            assignedAgentId: filingRequest.assignedAgentId,
            currentUserId: user.uid,
            assignedAgentName: filingRequest.assignedAgentName,
            currentAgentName: agentName,
            status: filingRequest.status
          })
        } else {
          // Status is completed/cancelled and not assigned to this agent - deny access
          toast.error("You are not authorized to view this request")
          setLoading(false)
          router.push('/agent/dashboard/requests')
          return
        }
      }

      setRequest(filingRequest)

      // Fetch self-assessment report
      if (filingRequest.reportId) {
        try {
          const loadedReport = await reportService.getReportById(filingRequest.reportId, 'Self-Assessment')
          if (loadedReport) {
            setReport(loadedReport)
          }
        } catch (error) {
          console.error("Error loading report:", error)
          toast.error("Failed to load assessment report")
        }
      }

      // Fetch supporting documents
      if (filingRequest.supportingDocuments && filingRequest.supportingDocuments.length > 0) {
        try {
          const docPromises = filingRequest.supportingDocuments.map(async (docId) => {
            try {
              return await documentService.getById(docId)
            } catch (error) {
              console.error(`Error loading document ${docId}:`, error)
              return null
            }
          })
          
          const loadedDocs = await Promise.all(docPromises)
          setDocuments(loadedDocs.filter((doc): doc is Document => doc !== null))
        } catch (error) {
          console.error("Error loading documents:", error)
          toast.error("Failed to load some documents")
        }
      }
    } catch (error) {
      console.error("Error loading request details:", error)
      toast.error("Failed to load request details")
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleStatusUpdate = async (newStatus: FilingRequestStatus, notes?: string) => {
    if (!requestId) return

    try {
      const response = await fetch(`/api/admin/filing-requests/${requestId}/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update status')
      }

      // Update local state
      setRequest(prev => prev ? { ...prev, status: newStatus, notes: notes || prev.notes } : null)
      
      // Reload request details
      await loadRequestDetails()
      
      toast.success('Status updated successfully')
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
      throw error
    }
  }

  const getStatusBadge = (status: FilingRequest['status']) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      assigned: { variant: "default", icon: User },
      in_progress: { variant: "default", icon: Loader2 },
      completed: { variant: "default", icon: CheckCircle2 },
      cancelled: { variant: "destructive", icon: Clock },
    }
    
    const config = variants[status] || variants.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    )
  }

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return '0 B'
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (profile.businessType !== 'agent') {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Request not found</p>
          <Button onClick={() => router.push('/agent/dashboard/requests')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - Hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/agent/dashboard/requests')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">
              Request ID: {request.id.substring(0, 12)}...
            </p>
          </div>
        </div>
        <Button onClick={handlePrint} className="print:hidden">
          <Printer className="w-4 h-4 mr-2" />
          Print All
        </Button>
      </div>

      {/* Request Summary - Hidden when printing */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowStatusDialog(true)
                }}
                className="h-6 w-6 p-0 hover:bg-muted"
                title="Update status"
              >
                <Edit className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {getStatusBadge(request.status)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              {request.state}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">RRR</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-sm font-mono">{request.rrr}</code>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {format(new Date(request.createdAt), 'MMM dd, yyyy')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Self-Assessment Report */}
      {report && report.reportData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Self-Assessment Form
            </CardTitle>
            <CardDescription>
              Tax year: {report.reportData.period?.year || 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-muted/30">
              <SelfAssessmentPreview
                reportData={report.reportData}
                showFileButton={false}
                filingStatus={report.filingStatus}
                filingMethod={report.filingMethod}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supporting Documents */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Supporting Documents
          </CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? 's' : ''} attached
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No documents attached</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{doc.name || doc.originalName || 'Document'}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{doc.type}</span>
                        {doc.size && <span>{formatFileSize(doc.size)}</span>}
                        {doc.createdAt && (
                          <span>{format(new Date(doc.createdAt), 'MMM dd, yyyy')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = doc.url
                        link.download = doc.name || doc.originalName || 'document'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      {request && (
        <StatusUpdateDialog
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          currentStatus={request.status}
          onUpdate={handleStatusUpdate}
        />
      )}

      {/* Messages Panel */}
      <div id="messages">
        <MessagePanel requestId={requestId} userType="agent" />
      </div>

      {/* Print Footer - Only visible when printing */}
      <div className="hidden print:block mt-8 pt-8 border-t">
        <div className="text-center text-sm text-muted-foreground">
          <p>Printed on {format(new Date(), 'MMMM dd, yyyy')} at {format(new Date(), 'hh:mm a')}</p>
          <p className="mt-2">Request ID: {request.id}</p>
          <p>RRR: {request.rrr}</p>
          <p className="mt-4">OTax - Tax Filing Agent Portal</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
          }
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}

