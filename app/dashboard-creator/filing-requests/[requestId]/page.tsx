"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "sonner"
import { format } from "date-fns"
import { 
  Loader2, 
  FileText, 
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  ArrowLeft,
  Download,
  Eye,
  MessageSquare,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { FilingRequest } from "@/lib/types"

export default function FilingRequestDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [request, setRequest] = useState<FilingRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewDocument, setPreviewDocument] = useState<{ url: string; name: string } | null>(null)

  useEffect(() => {
    if (user?.uid) {
      loadFilingRequest()
    }
  }, [user?.uid, requestId])

  const loadFilingRequest = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      const response = await fetch(`/api/filing-requests/${requestId}?userId=${user.uid}`)
      const result = await response.json()

      if (result.success) {
        setRequest(result.data)
      } else {
        toast.error(result.error || "Failed to load filing request")
      }
    } catch (error) {
      console.error("Error loading filing request:", error)
      toast.error("Failed to load filing request")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: FilingRequest['status']) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, color: string }> = {
      pending: { variant: "secondary", icon: Clock, color: "text-yellow-600" },
      assigned: { variant: "default", icon: User, color: "text-blue-600" },
      in_progress: { variant: "default", icon: Loader2, color: "text-blue-600" },
      completed: { variant: "default", icon: CheckCircle2, color: "text-green-600" },
      cancelled: { variant: "destructive", icon: AlertCircle, color: "text-red-600" },
    }
    
    const config = variants[status] || variants.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-2 text-sm">
        <Icon className={`w-4 h-4 ${config.color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    )
  }

  const viewDocument = async (docId: string, docName: string) => {
    try {
      const response = await fetch(`/api/get-image-fileid?fileId=${docId}`)
      const data = await response.json()
      
      if (data.url) {
        setPreviewDocument({ url: data.url, name: docName })
      } else {
        toast.error("Failed to load document")
      }
    } catch (error) {
      console.error("Error loading document:", error)
      toast.error("Failed to load document")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-5xl px-4 md:px-6 py-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-5xl px-4 md:px-6 py-6">
          <Card className="p-6">
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Filing request not found</h3>
              <p className="text-sm text-muted-foreground mb-6">
                The filing request you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => router.push('/dashboard-creator/filing-requests')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Filing Requests
              </Button>
            </div>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full px-4 md:px-6 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard-creator/filing-requests')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">Filing Request Details</CardTitle>
                  <CardDescription>
                    Request ID: <code className="font-mono text-xs">{request.id}</code>
                  </CardDescription>
                </div>
                {getStatusBadge(request.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    State
                  </div>
                  <p className="font-medium">{request.state}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Submitted
                  </div>
                  <p className="font-medium">
                    {format(new Date(request.createdAt), 'MMMM dd, yyyy \'at\' h:mm a')}
                  </p>
                </div>

                {request.rrr && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      RRR
                    </div>
                    <p className="font-mono text-sm">{request.rrr}</p>
                  </div>
                )}

                {request.updatedAt && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Last Updated
                    </div>
                    <p className="font-medium">
                      {format(new Date(request.updatedAt), 'MMMM dd, yyyy \'at\' h:mm a')}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Agent Info */}
              {(request.assignedAgentId || request.assignedAgentName) && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Assigned Agent
                    </h3>
                    <div className="space-y-2">
                      {request.assignedAgentName && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Name: </span>
                          {request.assignedAgentName}
                        </p>
                      )}
                      {request.assignedAgentId && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Agent ID: </span>
                          <code className="font-mono text-xs">{request.assignedAgentId}</code>
                        </p>
                      )}
                      {request.assignedAt && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Assigned: </span>
                          {format(new Date(request.assignedAt), 'MMMM dd, yyyy \'at\' h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Notes */}
              {request.notes && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Notes / Messages
                    </h3>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap">{request.notes}</p>
                      </CardContent>
                    </Card>
                  </div>
                  <Separator />
                </>
              )}

              {/* Supporting Documents */}
              {request.supportingDocuments && request.supportingDocuments.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Supporting Documents ({request.supportingDocuments.length})
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {request.supportingDocuments.map((doc, index) => {
                      const docObj = typeof doc === 'string' ? { name: doc, type: 'Document', fileId: doc } : doc;
                      return (
                        <Card key={index} className="bg-muted/50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{docObj.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Type: {docObj.type}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => viewDocument(docObj.fileId, docObj.name)}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Request Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="w-0.5 h-full bg-border mt-2" />
                  </div>
                  <div className="pb-8">
                    <p className="font-medium">Request Submitted</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.createdAt), 'MMMM dd, yyyy \'at\' h:mm a')}
                    </p>
                  </div>
                </div>

                {request.assignedAt && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      {(request.status === 'in_progress' || request.status === 'completed') && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="pb-8">
                      <p className="font-medium">Agent Assigned</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.assignedAt), 'MMMM dd, yyyy \'at\' h:mm a')}
                      </p>
                      {request.assignedAgentName && (
                        <p className="text-sm text-muted-foreground">
                          Agent: {request.assignedAgentName}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {request.status === 'in_progress' && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">In Progress</p>
                      <p className="text-sm text-muted-foreground">
                        Your filing is being processed
                      </p>
                    </div>
                  </div>
                )}

                {request.status === 'completed' && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">Completed</p>
                      <p className="text-sm text-muted-foreground">
                        Your filing has been completed
                      </p>
                    </div>
                  </div>
                )}

                {request.status === 'cancelled' && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">Cancelled</p>
                      <p className="text-sm text-muted-foreground">
                        This request has been cancelled
                      </p>
                    </div>
                  </div>
                )}

                {request.status === 'pending' && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-yellow-600" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">Awaiting Assignment</p>
                      <p className="text-sm text-muted-foreground">
                        Waiting for an agent to be assigned
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Document Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold truncate flex-1">{previewDocument.name}</h3>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(previewDocument.url, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewDocument(null)}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {previewDocument.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDocument.url}
                  className="w-full h-full min-h-[500px]"
                  title={previewDocument.name}
                />
              ) : (
                <img
                  src={previewDocument.url}
                  alt={previewDocument.name}
                  className="max-w-full h-auto mx-auto"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
