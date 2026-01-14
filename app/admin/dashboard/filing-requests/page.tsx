"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AdminTableSkeleton } from "@/components/ui/skeletons"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { toast } from "sonner"
import { format } from "date-fns"
import { 
  ClipboardList, 
  Loader2, 
  Search, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText,
  MapPin,
  Calendar
} from "lucide-react"
import { FilingRequest } from "@/lib/types"

export default function AdminFilingRequestsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [requests, setRequests] = useState<FilingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean
    request: FilingRequest | null
  }>({
    open: false,
    request: null
  })
  const [agents, setAgents] = useState<Array<{ id: string; userId: string; name: string; email: string }>>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>("")
  const [selectedAgentName, setSelectedAgentName] = useState<string>("")
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) {
        router.push('/admin/login')
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, router])

  useEffect(() => {
    if (user && isAdmin) {
      fetchRequests()
      fetchAgents()
    }
  }, [user, isAdmin, statusFilter])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const url = statusFilter === 'all' 
        ? '/api/admin/filing-requests'
        : `/api/admin/filing-requests?status=${statusFilter}`
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setRequests(result.data || [])
      } else {
        toast.error("Failed to load filing requests")
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
      toast.error("Failed to load filing requests")
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/agents')
      const result = await response.json()
      
      if (result.success) {
        setAgents(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching agents:", error)
    }
  }

  const handleAssignAgent = async () => {
    if (!assignDialog.request || !selectedAgentId || !selectedAgentName) {
      toast.error("Please select an agent")
      return
    }

    setAssigning(true)
    try {
      const response = await fetch('/api/admin/filing-requests/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: assignDialog.request.id,
          agentId: selectedAgentId,
          agentName: selectedAgentName
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign agent')
      }

      toast.success("Agent assigned successfully")
      setAssignDialog({ open: false, request: null })
      setSelectedAgentId("")
      setSelectedAgentName("")
      fetchRequests()
    } catch (error) {
      console.error("Error assigning agent:", error)
      toast.error(error instanceof Error ? error.message : "Failed to assign agent")
    } finally {
      setAssigning(false)
    }
  }

  const getStatusBadge = (status: FilingRequest['status']) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      assigned: { variant: "default", icon: UserCheck },
      in_progress: { variant: "default", icon: Loader2 },
      completed: { variant: "default", icon: CheckCircle2 },
      cancelled: { variant: "destructive", icon: XCircle },
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
      request.rrr.toLowerCase().includes(search) ||
      request.assignedAgentName?.toLowerCase().includes(search)
    )
  })

  if (authLoading || adminLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <AdminTableSkeleton />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Filing Requests</h1>
        <p className="text-muted-foreground">Manage and assign agents to tax filing requests</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by request ID, state, RRR, or agent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Filing Requests</CardTitle>
          <CardDescription>
            {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No filing requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Request ID</th>
                    <th className="text-left p-4 font-semibold">State</th>
                    <th className="text-left p-4 font-semibold">RRR</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Agent</th>
                    <th className="text-left p-4 font-semibold">Created</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
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
                          {request.state}
                        </div>
                      </td>
                      <td className="p-4">
                        <code className="text-xs font-mono">{request.rrr}</code>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="p-4">
                        {request.assignedAgentName ? (
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{request.assignedAgentName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="p-4">
                        {request.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => setAssignDialog({ open: true, request })}
                            disabled={assigning}
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Assign Agent
                          </Button>
                        )}
                        {request.status !== 'pending' && request.assignedAgentName && (
                          <span className="text-sm text-muted-foreground">Assigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Agent Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={(open) => {
        if (!open) {
          setAssignDialog({ open: false, request: null })
          setSelectedAgentId("")
          setSelectedAgentName("")
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Agent</DialogTitle>
            <DialogDescription>
              Select an agent to assign to this filing request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Request Details</Label>
              <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                <p><strong>State:</strong> {assignDialog.request?.state}</p>
                <p><strong>RRR:</strong> {assignDialog.request?.rrr}</p>
                <p><strong>Documents:</strong> {assignDialog.request?.supportingDocuments?.length || 0} document(s)</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent">Select Agent</Label>
              {agents.length === 0 ? (
                <div className="p-4 border rounded-lg text-center text-muted-foreground">
                  <p className="text-sm">No agents found. You can manually enter agent details.</p>
                  <div className="mt-4 space-y-2">
                    <Input
                      placeholder="Agent Name"
                      value={selectedAgentName}
                      onChange={(e) => setSelectedAgentName(e.target.value)}
                    />
                    <Input
                      placeholder="Agent ID/Email"
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <Select
                  value={selectedAgentId}
                  onValueChange={(value) => {
                    setSelectedAgentId(value)
                    const agent = agents.find(a => a.userId === value || a.id === value)
                    if (agent) {
                      setSelectedAgentName(agent.name)
                    }
                  }}
                >
                  <SelectTrigger id="agent">
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.userId || agent.id}>
                        {agent.name} ({agent.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialog({ open: false, request: null })
                setSelectedAgentId("")
                setSelectedAgentName("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignAgent}
              disabled={assigning || !selectedAgentId || !selectedAgentName}
            >
              {assigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Assign Agent
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

