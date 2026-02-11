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
import { Separator } from "@/components/ui/separator"
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
  Edit,
  Upload,
  Mail,
  Phone,
  Building2,
  Hash,
  Info
} from "lucide-react"
import { FilingRequest, SavedReport, Document, FilingRequestStatus } from "@/lib/types"
import { reportService, userService } from "@/lib/services"
import { documentService } from "@/lib/services"

import { SelfAssessmentPreview } from "@/components/reports/self-assessment-preview"
import { StatusUpdateDialog } from "@/components/agent/status-update-dialog"
import { uploadToImageKit, ImageUploadResult } from "@/lib/utils/imagekit"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageModal } from "@/components/agent/message-panel"

export default function AgentRequestDetailPage() {
  const router = useRouter()
  const params = useParams()
  const requestId = params?.requestId as string
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [request, setRequest] = useState<FilingRequest | null>(null)
  const [report, setReport] = useState<SavedReport | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [clientProfile, setClientProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingClient, setLoadingClient] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [uploadingCompletedDoc, setUploadingCompletedDoc] = useState(false)
  const [completedDocFile, setCompletedDocFile] = useState<File | null>(null)

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        router.push('/login')
        return
      }
      if(!profile) {
        router.refresh()
        return
      }
      if (profile?.businessType !== 'consultant') {
        router.refresh()
        return
      }
      if (!profile?.consultantKycCompleted) {
        router.push('/consultant/kyc')
        return
      }
    }
  }, [user, profile, authLoading, profileLoading, router])

  useEffect(() => {
    if (requestId && user && profile && profile.businessType === 'consultant') {
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

      // Fetch self-assessment report first (contains userId for client profile)
      if (filingRequest.reportId) {
        try {
          const loadedReport = await reportService.getReportById(filingRequest.reportId, 'Self-Assessment')
          if (loadedReport) {
            setReport(loadedReport)
            
            // Fetch client profile using userId from the report
            if (loadedReport.userId) {
              loadClientProfile(loadedReport.userId)
            }
          }
        } catch (error) {
          console.error("Error loading report:", error)
          toast.error("Failed to load assessment report")
        }
      }

      // Fetch supporting documents - UPDATED LOGIC
      if (filingRequest.supportingDocuments && filingRequest.supportingDocuments.length > 0) {
        try {
          console.log("Loading supporting documents:", filingRequest.supportingDocuments)
          
          // Check if supportingDocuments contains document objects or just IDs/URLs
          const firstDoc = filingRequest.supportingDocuments[0]
          
          if (typeof firstDoc === 'object' && firstDoc !== null && 'url' in firstDoc) {
            // Documents are already objects with url, name, type
            const formattedDocs = filingRequest.supportingDocuments.map((doc: any) => ({
              id: doc.id || doc.url, // Use URL as fallback ID
              name: doc.name || 'Document',
              originalName: doc.name || 'Document',
              type: doc.type || 'Document',
              url: doc.url,
              size: doc.size,
              createdAt: filingRequest.createdAt,
              userId: filingRequest.userId,
              fileType: doc.type || 'Document',
              mimeType: doc.mimeType || 'application/octet-stream',
              uploadedAt: filingRequest.createdAt,
              updatedAt: filingRequest.createdAt
            }))
            setDocuments(formattedDocs)
          } else if (typeof firstDoc === 'string') {
            // Documents are IDs - try to fetch them
            const docPromises = filingRequest.supportingDocuments.map(async (docId: string) => {
              try {
                return await documentService.getById(docId)
              } catch (error) {
                console.error(`Error loading document ${docId}:`, error)
                // If document fetch fails, create a basic document object with the ID as URL
                return {
                  id: docId,
                  name: 'Document',
                  originalName: 'Document',
                  type: 'Document',
                  url: docId, // Use docId as URL (might be a URL string)
                  userId: filingRequest.userId,
                  createdAt: filingRequest.createdAt
                } as unknown as Document
              }
            })
            
            const loadedDocs = await Promise.all(docPromises)
            setDocuments(loadedDocs.filter((doc): doc is Document => doc !== null))
          }
        } catch (error) {
          console.error("Error loading documents:", error)
          toast.error("Failed to load some documents")
        }
      } else {
        // Clear documents if none exist
        setDocuments([])
      }
    } catch (error) {
      console.error("Error loading request details:", error)
      toast.error("Failed to load request details")
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const loadClientProfile = async (userId: string) => {
    try {
      setLoadingClient(true)
      const profile = await userService.getProfile(userId)

      console.log("Client profile response:", profile)
      
      if (profile) {
        setClientProfile(profile)
      }
    } catch (error) {
      console.error("Error loading client profile:", error)
      // Don't show error toast as client info is supplementary
    } finally {
      setLoadingClient(false)
    }
  }

  // const handlePrint = () => {
  //   window.print()
  // }

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

  const handleCompletedDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !requestId || !user?.uid || !request) return

    setCompletedDocFile(file)
    setUploadingCompletedDoc(true)

    try {
      // Upload to ImageKit
      const uploadResult = await uploadToImageKit(file, 'filing-completed')
      
      // Save as document in the client's documents
      const docResult = await documentService.uploadDocument(request.userId, {
        file,
        name: `Completed Filing - ${request.rrr}`,
        type: 'proof',
        imageKitUrl: uploadResult.url,
        fileSize: uploadResult.size,
        notes: `Completed and stamped tax return document for RRR: ${request.rrr}`
      })

      // Upload completed document to filing request
      const response = await fetch(`/api/admin/filing-requests/${requestId}/upload-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentUrl: uploadResult.url,
          documentName: file.name,
          documentId: docResult.data?.id
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to upload completed document')
      }

      // Reload request details
      await loadRequestDetails()
      
      toast.success('Completed document uploaded successfully')
      setCompletedDocFile(null)
    } catch (error) {
      console.error("Error uploading completed document:", error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload completed document')
    } finally {
      setUploadingCompletedDoc(false)
      // Reset input
      e.target.value = ''
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
      <Badge variant={config.variant} className="flex items-center gap-1 h-8 p-3 w-fit">
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

  if (profile.businessType !== 'consultant') {
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/consultant/dashboard/requests')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
          </Button>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Filing Request Details</h1>
            <p className="text-sm text-muted-foreground mt-1">
              ID: {request.id.substring(0, 12)}... • Created {format(new Date(request.createdAt), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(request.status)}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStatusDialog(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Update Status
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Client & Request Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingClient ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : clientProfile ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Full Name</p>
                        <p className="font-medium">
                          {clientProfile.firstName} {clientProfile.lastName}
                        </p>
                      </div>
                    </div>

                    {clientProfile.email && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium text-sm truncate">{clientProfile.email}</p>
                        </div>
                      </div>
                    )}

                    {clientProfile.phoneNumber && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <Phone className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium">{clientProfile.phoneNumber}</p>
                        </div>
                      </div>
                    )}

                    {clientProfile.businessType && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Business Type</p>
                          <p className="font-medium capitalize">{clientProfile.businessType}</p>
                        </div>
                      </div>
                    )}

                    {clientProfile.tin && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <Hash className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">TIN</p>
                          <p className="font-medium font-mono">{clientProfile.tin}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Client information unavailable</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Request Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">State</span>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{request.state}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Tax Year</span>
                  <span className="font-medium">{report?.reportData?.period?.year || 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>

                {request.assignedAgentName && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Assigned To</span>
                    <span className="font-medium text-sm">{request.assignedAgentName}</span>
                  </div>
                )}

                {request.notes && (
                  <div className="py-2">
                    <p className="text-sm text-muted-foreground mb-2">Notes</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{request.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
      {/* Self-Assessment Report */}
      {report && report.reportData && (
        <Card>
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
            <SelfAssessmentPreview
              reportData={report.reportData}
              showFileButton={false}
              filingStatus={report.filingStatus}
              filingMethod={report.filingMethod}
            />
          </CardContent>
        </Card>
      )}

      {/* Supporting Documents */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              Supporting Documents
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {documents.length}
            </Badge>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Documents provided by client
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {documents.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <FileText className="w-8 h-8 sm:w-10 sm:h-10 opacity-50" />
              </div>
              <p className="text-sm sm:text-base font-medium">No documents attached</p>
              <p className="text-xs sm:text-sm mt-1">Client hasn't uploaded any supporting documents</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {documents.map((doc, index) => (
                <div
                  key={doc.id}
                  className="group border rounded-lg overflow-hidden hover:shadow-md transition-all bg-card"
                >
                  <div className="p-4 flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1 mb-1">
                        {(doc.name || doc.originalName) || 'Document'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                        <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">
                          {doc.type}
                        </span>
                        {doc.size && (
                          <span>• {formatFileSize(doc.size)}</span>
                        )}
                        {doc.createdAt && (
                          <span>• {format(new Date(doc.createdAt), 'MMM dd')}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => window.open(doc.url, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8"
                          onClick={async () => {
                            try {
                              const response = await fetch(doc.url)
                              if (!response.ok) throw new Error('Failed to fetch document')
                              const blob = await response.blob()
                              const blobUrl = window.URL.createObjectURL(blob)
                              const link = document.createElement('a')
                              link.href = blobUrl
                              link.download = doc.name || doc.originalName || 'document'
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                              window.URL.revokeObjectURL(blobUrl)
                              toast.success('Download started')
                            } catch (error) {
                              console.error('Error downloading document:', error)
                              toast.error('Failed to download document')
                            }
                          }}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Completed Document */}
      {(request.status === 'completed' || request.status === 'in_progress') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {request.status === 'completed' && request.completedDocumentUrl 
                ? 'Completed Document' 
                : 'Upload Completed Document'}
            </CardTitle>
            <CardDescription>
              {request.status === 'completed' && request.completedDocumentUrl
                ? 'The signed and stamped document has been uploaded'
                : 'Upload the signed and stamped document from the tax authorities'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {request.completedDocumentUrl ? (
              <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{request.completedDocumentName || 'Completed Document'}</h4>
                    <p className="text-sm text-muted-foreground">
                      Uploaded on {request.completedAt ? format(new Date(request.completedAt), 'MMM dd, yyyy hh:mm a') : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(request.completedDocumentUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch(request.completedDocumentUrl!)
                        if (!response.ok) throw new Error('Failed to fetch document')
                        const blob = await response.blob()
                        const blobUrl = window.URL.createObjectURL(blob)
                        const link = document.createElement('a')
                        link.href = blobUrl
                        link.download = request.completedDocumentName || 'completed-document'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        window.URL.revokeObjectURL(blobUrl)
                        toast.success('Download started')
                      } catch (error) {
                        console.error('Error downloading document:', error)
                        toast.error('Failed to download document')
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="completed-doc-upload">Upload Signed & Stamped Document</Label>
                  <Input
                    id="completed-doc-upload"
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleCompletedDocUpload}
                    disabled={uploadingCompletedDoc}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Upload the document that has been signed and stamped by the tax authorities (PDF or Image)
                  </p>
                </div>
                {uploadingCompletedDoc && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading document...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages Panel */}
      <div id="messages">
        <MessageModal requestId={requestId} userType="agent" />
      </div>
        </div>
      </div>

      {/* Status Update Dialog */}
      {request && (
        <StatusUpdateDialog
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          currentStatus={request.status}
          onUpdate={handleStatusUpdate}
        />
      )}

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

