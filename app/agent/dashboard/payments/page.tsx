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
  FileText,
  Users
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { db } from "@/firebase/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

interface AgentPayment {
  id: string
  type: 'filing' | 'consultation'
  requestId?: string
  clientId: string
  clientName: string
  amount: number
  commission: number
  status: 'pending' | 'paid' | 'failed'
  paymentDate?: string
  createdAt: string
  state?: string
}

export default function AgentPaymentsPage() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [payments, setPayments] = useState<AgentPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  useEffect(() => {
    if (user && profile?.businessType === 'consultant') {
      loadPayments()
    }
  }, [user, profile])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const allPayments: AgentPayment[] = []

      // 1. Load Filing Request Payments
      const filingResponse = await fetch('/api/admin/filing-requests?status=completed')
      const filingResult = await filingResponse.json()
      
      if (filingResult.success) {
        const myCompletedRequests = (filingResult.data || []).filter((req: any) => 
          req.assignedAgentId === user?.uid || 
          req.assignedAgentName === `${profile?.firstName} ${profile?.lastName}`
        )

        const filingPayments: AgentPayment[] = myCompletedRequests.map((req: any) => {
          const filingFee = 5000 // Base filing fee - should come from request
          const commission = filingFee * 0.05 // 5% commission
          
          return {
            id: `filing-${req.id}`,
            type: 'filing' as const,
            requestId: req.id,
            clientId: req.userId,
            clientName: req.userId, // TODO: Fetch actual client name
            amount: filingFee,
            commission: commission,
            status: req.completedAt ? 'paid' : 'pending',
            paymentDate: req.completedAt,
            createdAt: req.createdAt,
            state: req.state
          }
        })

        allPayments.push(...filingPayments)
      }

      // 2. Load Consultation Payments (from userProfiles where assignedConsultantId matches)
      if (user?.uid) {
        const consultationQuery = query(
          collection(db, 'userProfiles'),
          where('assignedConsultantId', '==', user.uid)
        )

        const consultationSnapshot = await getDocs(consultationQuery)
        
        const consultationPayments: AgentPayment[] = consultationSnapshot.docs.map((doc) => {
          const data = doc.data()
          const consultationFee = 10000 // Base consultation fee - should be configurable
          const commission = consultationFee * 0.10 // 10% commission for consultation
          
          // Check if payment was made (you might want to add a consultationPaymentDate field)
          const isPaid = !!data.consultationPaidAt
          
          return {
            id: `consultation-${doc.id}`,
            type: 'consultation' as const,
            clientId: data.userId,
            clientName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || 'Unknown Client',
            amount: consultationFee,
            commission: commission,
            status: isPaid ? 'paid' : 'pending',
            paymentDate: data.consultationPaidAt,
            createdAt: data.consultantAssignedAt || data.createdAt || new Date().toISOString(),
          }
        })

        allPayments.push(...consultationPayments)
      }

      // Sort by date (most recent first)
      allPayments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setPayments(allPayments)
    } catch (error) {
      console.error("Error loading payments:", error)
      toast.error("Failed to load payments")
    } finally {
      setLoading(false)
    }
  }

  const getTypeBadge = (type: AgentPayment['type']) => {
    const config = {
      filing: { 
        label: 'Filing', 
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        icon: FileText
      },
      consultation: { 
        label: 'Consultation', 
        className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        icon: Users
      }
    }
    
    const typeConfig = config[type]
    const Icon = typeConfig.icon
    
    return (
      <Badge variant="outline" className={typeConfig.className}>
        <Icon className="w-3 h-3 mr-1" />
        {typeConfig.label}
      </Badge>
    )
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

  const filteredPayments = payments
    .filter(payment => {
      if (!searchTerm) return true
      const search = searchTerm.toLowerCase()
      return (
        payment.requestId?.toLowerCase().includes(search) ||
        payment.state?.toLowerCase().includes(search) ||
        payment.clientName?.toLowerCase().includes(search) ||
        payment.type.toLowerCase().includes(search)
      )
    })
    .filter(payment => {
      if (statusFilter === 'all') return true
      return payment.status === statusFilter
    })
    .filter(payment => {
      if (typeFilter === 'all') return true
      return payment.type === typeFilter
    })

  const totalEarnings = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.commission, 0)
  
  const pendingEarnings = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.commission, 0)
  
  const totalCompleted = payments.filter(p => p.status === 'paid').length
  const totalPending = payments.filter(p => p.status === 'pending').length

  const filingEarnings = payments
    .filter(p => p.type === 'filing' && p.status === 'paid')
    .reduce((sum, p) => sum + p.commission, 0)
  
  const consultationEarnings = payments
    .filter(p => p.type === 'consultation' && p.status === 'paid')
    .reduce((sum, p) => sum + p.commission, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCompleted} completed payment{totalCompleted !== 1 ? 's' : ''}
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

        <Card className="bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Filing Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <div className="text-2xl font-bold">{formatCurrency(filingEarnings)}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From tax filing services
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consultation Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              <div className="text-2xl font-bold">{formatCurrency(consultationEarnings)}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From consultation services
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
                  placeholder="Search by client name, request ID, or state..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="filing">Filing</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
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
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold text-sm">Type</th>
                      <th className="text-left p-4 font-semibold text-sm">Client</th>
                      <th className="text-left p-4 font-semibold text-sm">State</th>
                      <th className="text-left p-4 font-semibold text-sm">Amount</th>
                      <th className="text-left p-4 font-semibold text-sm">Commission</th>
                      <th className="text-left p-4 font-semibold text-sm">Status</th>
                      <th className="text-left p-4 font-semibold text-sm">Date</th>
                      <th className="text-left p-4 font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          {getTypeBadge(payment.type)}
                        </td>
                        <td className="p-4 text-sm">
                          {payment.clientName}
                        </td>
                        <td className="p-4 text-sm">
                          {payment.state || 'N/A'}
                        </td>
                        <td className="p-4 font-medium text-sm">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="p-4 font-bold text-green-600 text-sm">
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

              {/* Mobile/Tablet Card View */}
              <div className="md:hidden space-y-3">
                {filteredPayments.map((payment) => (
                  <Card key={payment.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {getTypeBadge(payment.type)}
                              {getStatusBadge(payment.status)}
                            </div>
                            <p className="font-medium text-sm mb-1">{payment.clientName}</p>
                            <p className="text-xs text-muted-foreground">
                              {payment.state || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Amount</p>
                            <p className="font-medium text-sm">{formatCurrency(payment.amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Commission</p>
                            <p className="font-bold text-green-600 text-sm">{formatCurrency(payment.commission)}</p>
                          </div>
                        </div>

                        {payment.paymentDate && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Paid: {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}</span>
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            toast.info("Receipt download coming soon")
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Receipt
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

