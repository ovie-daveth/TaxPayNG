"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
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
  FileText, 
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  ExternalLink,
  Download
} from "lucide-react"
import { FilingRequest } from "@/lib/types"
import { MessagePanel } from "@/components/agent/message-panel"

export default function ClientFilingRequestPage() {
  const router = useRouter()
  const params = useParams()
  const requestId = params?.requestId as string
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [request, setRequest] = useState<FilingRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const previousStatusRef = useRef<string | null>(null)

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        router.push('/login')
        return
      }
    }
  }, [user])

  useEffect(() => {
    if (requestId && user) {
      loadRequestDetails(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, user])

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

  const loadRequestDetails = async (showLoading = false) => {
    if (!requestId || !user?.uid) {
      return
    }

    try {
      if (showLoading || initialLoad) {
        setLoading(true)
      }
      
      // Fetch filing request
      const response = await fetch(`/api/filing-requests/${requestId}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch request' }))
        if (initialLoad) {
          toast.error(errorData.error || "Filing request not found")
        }
        setLoading(false)
        setInitialLoad(false)
        return
      }

      const result = await response.json()
      
      if (!result.success || !result.data) {
        if (initialLoad) {
          toast.error("Filing request not found")
        }
        setLoading(false)
        setInitialLoad(false)
        return
      }

      const filingRequest = result.data as FilingRequest
      
      // Verify this request belongs to the current user
      if (filingRequest.userId !== user.uid) {
        if (initialLoad) {
          toast.error("You are not authorized to view this request")
        }
        setLoading(false)
        setInitialLoad(false)
        return
      }

      // Check if status changed and show notification
      if (previousStatusRef.current && previousStatusRef.current !== filingRequest.status) {
        const statusText = filingRequest.status.replace('_', ' ').split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
        toast.success(`Status updated to: ${statusText}`)
      }
      
      previousStatusRef.current = filingRequest.status
      setRequest(filingRequest)
      setInitialLoad(false)
    } catch (error) {
      console.error("Error loading request details:", error)
      if (initialLoad) {
        toast.error("Failed to load request details")
      }
    } finally {
      setLoading(false)
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

  const getStatusMessage = (status: FilingRequest['status']) => {
    const messages: Record<string, string> = {
      pending: "Your filing request is pending assignment to an agent.",
      assigned: "An agent has been assigned to your filing request.",
      in_progress: "Your agent is currently processing your filing request.",
      completed: "Your filing request has been completed successfully.",
      cancelled: "Your filing request has been cancelled.",
    }
    return messages[status] || "Status unknown."
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
          <Button onClick={() => router.push('/dashboard/reports')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
        <main className="mx-auto px-4 py-6">
          <div className="space-y-6">

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Current Status
          </CardTitle>
          <CardDescription>
            Status updates automatically every few seconds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {getStatusBadge(request.status)}
            <p className="text-sm text-muted-foreground">{getStatusMessage(request.status)}</p>
          </div>
          
          {request.assignedAgentName && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-1">Assigned Agent</p>
              <p className="text-sm text-muted-foreground">{request.assignedAgentName}</p>
            </div>
          )}
          
          {request.notes && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-1">Agent Notes</p>
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="text-sm text-foreground whitespace-pre-wrap">{request.notes}</p>
              </div>
            </div>
          )}

          {request.assignedAt && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-1">Assigned On</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(request.assignedAt), 'MMM dd, yyyy hh:mm a')}
              </p>
            </div>
          )}

          {request.completedAt && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-1">Completed On</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(request.completedAt), 'MMM dd, yyyy hh:mm a')}
              </p>
            </div>
          )}

          {request.completedDocumentUrl && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Completed Document</p>
              <div className="border rounded-lg p-3 bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{request.completedDocumentName || 'Completed Document'}</p>
                    <p className="text-xs text-muted-foreground">Signed and stamped by tax authorities</p>
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
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        // Fetch the file as a blob
                        const response = await fetch(request.completedDocumentUrl!)
                        if (!response.ok) {
                          throw new Error('Failed to fetch document')
                        }
                        const blob = await response.blob()
                        
                        // Create a blob URL and trigger download
                        const blobUrl = window.URL.createObjectURL(blob)
                        const link = document.createElement('a')
                        link.href = blobUrl
                        link.download = request.completedDocumentName || 'completed-document'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        
                        // Clean up the blob URL
                        window.URL.revokeObjectURL(blobUrl)
                        toast.success('Download started')
                      } catch (error) {
                        console.error('Error downloading document:', error)
                        toast.error('Failed to download document. Please try viewing it instead.')
                      }
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Messages Panel */}
      <div id="messages">
        <MessagePanel requestId={requestId} userType="client" />
      </div>
          </div>
        </main>
    </div>
  )
}

