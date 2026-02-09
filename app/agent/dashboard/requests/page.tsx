"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { format } from "date-fns"
import { 
  ClipboardList, 
  Loader2, 
  Search, 
  Clock, 
  CheckCircle2, 
  FileText,
  MapPin,
  Calendar,
  User
} from "lucide-react"
import { FilingRequest } from "@/lib/types"

export default function AgentRequestsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [requests, setRequests] = useState<FilingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    if (user && profile?.businessType === 'consultant' && profile?.consultantKycCompleted) {
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
      <Badge variant={config.variant} className="flex items-center gap-1 h-8 p-3 w-fit">
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-row gap-4">
            <div className="md:flex-1 w-1/2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by request ID, or state..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div className="w-1/2 md:w-auto"> 
              <Select  value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue  className="text-xs sm:text-sm" placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="text-xs sm:text-sm">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select> 
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>My Filing Requests</CardTitle>
          <CardDescription>
            {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No filing requests assigned to you yet</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold text-sm">Request ID</th>
                      <th className="text-left p-4 font-semibold text-sm">State</th>
                      {/* <th className="text-left p-4 font-semibold text-sm">RRR</th> */}
                      <th className="text-left p-4 font-semibold text-sm">Status</th>
                      {/* <th className="text-left p-4 font-semibold text-sm">Documents</th> */}
                      <th className="text-left p-4 font-semibold text-sm">Created</th>
                      <th className="text-left p-4 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <code className="text-xs font-mono">{request.id.substring(0, 12)}...</code>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{request.state}</span>
                          </div>
                        </td>
                        {/* <td className="p-4">
                          <code className="text-xs font-mono">{request.rrr}</code>
                        </td> */}
                        <td className="p-4">
                          {getStatusBadge(request.status)}
                        </td>
                        {/* <td className="p-4">
                          <span className="text-sm">{request.supportingDocuments?.length || 0} doc(s)</span>
                        </td> */}
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                          </div>
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              router.push(`/consultant/dashboard/requests/${request.id}`)
                            }}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="md:hidden space-y-3">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(request.status)}
                              <code className="text-xs font-mono text-muted-foreground truncate">
                                {request.id.substring(0, 12)}...
                              </code>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <MapPin className="w-4 h-4" />
                              <span>{request.state}</span>
                            </div>
                            {/* <div className="text-xs text-muted-foreground">
                              <code>RRR: {request.rrr}</code>
                            </div> */}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>{request.supportingDocuments?.length || 0} document(s)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(request.createdAt), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            router.push(`/consultant/dashboard/requests/${request.id}`)
                          }}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

