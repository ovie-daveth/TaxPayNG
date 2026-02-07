"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { format } from "date-fns"
import { 
  ClipboardList, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  FileText,
  MapPin,
  Calendar,
  User,
  Wallet
} from "lucide-react"
import { FilingRequest } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { isConsultant } from "@/lib/utils/businessTypeHelpers"

export default function AgentDashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [requests, setRequests] = useState<FilingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    // Wait for both auth and profile to finish loading
    if (authLoading || profileLoading) {
      return
    }

    if (!user) {
      router.push('/login')
      return
    }

    // If profile is still null after loading, wait a bit more
    if (!profile) {
      console.log("Agent dashboard - profile is null, waiting...")
      return
    }

    // Check for both 'consultant' and legacy 'agent' for backward compatibility
    if (!isConsultant(profile.businessType)) {
      router.push('/dashboard')
      return
    }

    // Only redirect if consultantKycCompleted is explicitly false or undefined
    // true means they can access the dashboard
    // Also check for legacy agentKycCompleted field
    const kycCompleted = profile.consultantKycCompleted === true || (profile as any).agentKycCompleted === true
    if (!kycCompleted) {
      const timer = setTimeout(() => {
        router.push('/consultant/kyc')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [user, profile, authLoading, profileLoading, router])

  useEffect(() => {
    const kycCompleted = profile?.consultantKycCompleted === true || (profile as any)?.agentKycCompleted === true
    if (user && isConsultant(profile?.businessType) && kycCompleted) {
      fetchMyRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, statusFilter])

  const fetchMyRequests = async () => {
    try {
      setLoading(true)
      const url = statusFilter === 'all' 
        ? '/api/admin/filing-requests'
        : `/api/admin/filing-requests?status=${statusFilter}`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        // Filter requests assigned to this agent
        const myRequests = (result.data || []).filter((req: FilingRequest) => 
          req.assignedAgentId === user?.uid || req.assignedAgentName === `${profile?.firstName} ${profile?.lastName}`
        )
        setRequests(myRequests)
      } else {
        toast.error("Failed to load your requests")
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
      toast.error("Failed to load your requests")
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

  const filteredRequests = requests.filter(request => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      request.id.toLowerCase().includes(search) ||
      request.state.toLowerCase().includes(search) ||
      request.rrr.toLowerCase().includes(search)
    )
  })


  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || profile?.businessType !== 'consultant') {
    return null
  }

  const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'assigned').length
  const inProgressCount = requests.filter(r => r.status === 'in_progress').length
  const completedCount = requests.filter(r => r.status === 'completed').length

  // Calculate earnings from completed requests
  const completedRequests = requests.filter(r => r.status === 'completed')
  const totalEarnings = completedRequests.length * 250 // 5% of ₦5,000 base fee = ₦250 per filing

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Tax Consultant Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Welcome back, {profile?.firstName} {profile?.lastName}. Manage your clients and their tax filings.
        </p>
      </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalEarnings)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {completedCount} completed filing{completedCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending/Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting action
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently working
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Successfully filed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Requests</CardTitle>
                <CardDescription>
                  Latest filing requests assigned to you
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 sm:mt-0"
                onClick={() => router.push('/consultant/dashboard/requests')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No filing requests assigned to you yet</p>
                <p className="text-sm mt-2">New requests will appear here once assigned</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/consultant/dashboard/requests/${request.id}`)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          {getStatusBadge(request.status)}
                          <code className="text-xs font-mono text-muted-foreground truncate">
                            {request.id.substring(0, 12)}...
                          </code>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="truncate">{request.state}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="whitespace-nowrap">{format(new Date(request.createdAt), 'MMM dd, yyyy')}</span>
                          </div>
                          <span className="whitespace-nowrap">{request.supportingDocuments?.length || 0} document(s)</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full sm:w-auto"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/consultant/dashboard/requests/${request.id}`)
                        }}
                      >
                        <FileText className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredRequests.length > 5 && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/consultant/dashboard/requests')}
                    >
                      View All {filteredRequests.length} Requests
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  )
}

