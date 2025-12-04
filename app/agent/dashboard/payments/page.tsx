"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { format } from "date-fns"
import { 
  Wallet, 
  Loader2, 
  Search, 
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Copy
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface AgentPayment {
  id: string
  requestId: string
  amount: number
  commission: number
  status: 'pending' | 'paid' | 'failed'
  paymentDate?: string
  createdAt: string
  clientName?: string
  state?: string
}

export default function AgentPaymentsPage() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [payments, setPayments] = useState<AgentPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    if (user && profile?.businessType === 'agent') {
      loadPayments()
    }
  }, [user, profile])

  const loadPayments = async () => {
    try {
      setLoading(true)
      // TODO: Replace with actual API endpoint for agent payments
      // For now, we'll calculate from completed filing requests
      const response = await fetch('/api/admin/filing-requests?status=completed')
      const result = await response.json()
      
      if (result.success) {
        // Filter requests assigned to this agent
        const myCompletedRequests = (result.data || []).filter((req: any) => 
          req.assignedAgentId === user?.uid || 
          req.assignedAgentName === `${profile?.firstName} ${profile?.lastName}`
        )

        // Calculate payments (assuming 5% commission on filing fee)
        // In production, this would come from a separate payments collection
        const agentPayments: AgentPayment[] = myCompletedRequests.map((req: any) => {
          // Mock commission calculation - replace with actual logic
          const filingFee = 5000 // Base filing fee
          const commission = filingFee * 0.05 // 5% commission
          
          return {
            id: `payment-${req.id}`,
            requestId: req.id,
            amount: filingFee,
            commission: commission,
            status: req.completedAt ? 'paid' : 'pending',
            paymentDate: req.completedAt,
            createdAt: req.createdAt,
            clientName: req.userId, // Would be fetched from user profile
            state: req.state
          }
        })

        setPayments(agentPayments)
      }
    } catch (error) {
      console.error("Error loading payments:", error)
      toast.error("Failed to load payments")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: AgentPayment['status']) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      paid: { variant: "default", icon: CheckCircle2 },
      failed: { variant: "destructive", icon: XCircle },
    }
    
    const config = variants[status] || variants.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      payment.requestId.toLowerCase().includes(search) ||
      payment.state?.toLowerCase().includes(search) ||
      payment.clientName?.toLowerCase().includes(search)
    )
  }).filter(payment => {
    if (statusFilter === 'all') return true
    return payment.status === statusFilter
  })

  const totalEarnings = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.commission, 0)
  
  const pendingEarnings = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.commission, 0)
  
  const totalCompleted = payments.filter(p => p.status === 'paid').length
  const totalPending = payments.filter(p => p.status === 'pending').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Payment History</h1>
        <p className="text-muted-foreground">
          View your earnings and payment history
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCompleted} completed filing{totalCompleted !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div className="text-2xl font-bold">{formatCurrency(pendingEarnings)}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPending} pending payment{totalPending !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Filings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div className="text-2xl font-bold">
                {payments.length > 0 
                  ? Math.round((totalCompleted / payments.length) * 100) 
                  : 0}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by request ID, state, or client..."
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
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Request ID</th>
                    <th className="text-left p-4 font-semibold">State</th>
                    <th className="text-left p-4 font-semibold">Filing Fee</th>
                    <th className="text-left p-4 font-semibold">Commission</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Payment Date</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <code className="text-xs font-mono">{payment.requestId.substring(0, 12)}...</code>
                      </td>
                      <td className="p-4">
                        {payment.state || 'N/A'}
                      </td>
                      <td className="p-4 font-medium">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="p-4 font-bold text-green-600">
                        {formatCurrency(payment.commission)}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="p-4">
                        {payment.paymentDate ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Pending</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // TODO: Download receipt
                            toast.info("Receipt download coming soon")
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

