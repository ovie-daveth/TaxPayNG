"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useBusiness } from "@/lib/contexts/business-context"
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
  Search,
  ArrowRight
} from "lucide-react"
import { FilingRequest } from "@/lib/types"
import { OneTimeFilingModal } from "@/components/filing/one-time-filing-modal"

export default function FilingRequestsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { activeEntityId } = useBusiness()
  const [requests, setRequests] = useState<FilingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showOneTimeFilingModal, setShowOneTimeFilingModal] = useState(false)

  useEffect(() => {
    if (user?.uid) {
      loadFilingRequests()
    }
  }, [user?.uid])

  const loadFilingRequests = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      const params = new URLSearchParams({ userId: user.uid })
      if (activeEntityId) params.set("entityId", activeEntityId)
      if (profile?.defaultEntityId) params.set("defaultEntityId", profile.defaultEntityId)
      const response = await fetch(`/api/filing-requests?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setRequests(result.data || [])
      } else {
        toast.error("Failed to load filing requests")
      }
    } catch (error) {
      console.error("Error loading filing requests:", error)
      toast.error("Failed to load filing requests")
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
      <Badge variant={config.variant} className="flex items-center gap-1 text-xs sm:text-sm">
        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    )
  }

  const filteredRequests = requests.filter(request => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      request.id.toLowerCase().includes(search) ||
      request.state.toLowerCase().includes(search) ||
      request.assignedAgentName?.toLowerCase().includes(search) ||
      request.status.toLowerCase().includes(search)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
          <main className="mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-muted-foreground" />
            </div>
          </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
        <main className="mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
          <div className="space-y-4 sm:space-y-6">
        
      {/* Header with File Tax Button */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Filing Requests</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track your tax filing requests and their status
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => setShowOneTimeFilingModal(true)}
          className="w-full sm:w-auto"
        >
          <FileText className="w-4 h-4 mr-2" />
          File Tax Return
        </Button>
      </div>
        
      {/* Search */}
      <Card className="p-3 sm:p-4 md:p-5 lg:p-6">
        <div className="relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <Input
            placeholder="Search by request ID, state, or agent name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
          />
        </div>
      </Card>

      {/* Requests Table */}
      {filteredRequests.length === 0 ? (
        <Card className="p-3 sm:p-4 md:p-5 lg:p-6">
          <div className="text-center py-6 sm:py-8 md:py-10 lg:py-12">
            <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-sm sm:text-base md:text-lg font-medium mb-2">
              {searchTerm ? "No matching requests found" : "No filing requests yet"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground px-2 mb-4">
              {searchTerm 
                ? "Try adjusting your search terms"
                : "When you file a tax return via an agent, your requests will appear here"}
            </p>
            {!searchTerm && (
              <Button
                size="lg"
                onClick={() => {
                  const basePath = window.location.pathname.startsWith("/dashboard-creator")
                    ? "/dashboard-creator"
                    : window.location.pathname.startsWith("/dashboard-sme")
                      ? "/dashboard-sme"
                      : "/dashboard"
                  router.push(`${basePath}/reports/generate/self-assessment`)
                }}
                className="mt-2"
              >
                <FileText className="w-4 h-4 mr-2" />
                File Tax Return
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Report ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Assigned Agent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Documents
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-4 py-4">
                      <code className="text-xs font-mono text-muted-foreground">
                        {request.id.substring(0, 12)}...
                      </code>
                    </td>
                    <td className="px-4 py-4">
                      <code className="text-xs font-mono text-muted-foreground">
                        {request.reportId ? request.reportId.substring(0, 12) + '...' : '-'}
                      </code>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{request.state}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {request.assignedAgentName ? (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{request.assignedAgentName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {request.supportingDocuments?.length || 0} file{request.supportingDocuments?.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {request.updatedAt ? (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(request.updatedAt), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/filing-requests/${request.id}`)}
                      >
                        View
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
          </div>
        </main>
        
        <OneTimeFilingModal 
          open={showOneTimeFilingModal} 
          onOpenChange={setShowOneTimeFilingModal}
        />
    </div>
  )
}
    