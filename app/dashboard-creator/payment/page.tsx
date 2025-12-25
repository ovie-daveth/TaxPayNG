"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaymentReceipt } from "@/components/tax-payment/payment-receipt"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { useSidebar } from "@/lib/contexts/sidebar-context"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { taxPaymentService } from "@/lib/services"
import { TaxPayment } from "@/lib/types"
import { 
  ArrowLeft, 
  Download, 
  Search, 
  X, 
  LayoutGrid, 
  Table2, 
  Filter,
  Calendar,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Loader2,
  Copy,
  Sparkles,
  Plus
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, cn } from "@/lib/utils"

interface PaymentData {
  amount: number
  tips: string[]
  status: string
  transactionId: string
  method: string
  taxDuration: string
  timestamp: string
  rrr?: string
  tin?: string
  state?: string
}

type ViewMode = "grid" | "table"
type FilterCategory = "period" | "method" | "status"

export default function PaymentHistoryPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { isSubscribed, loading: subscriptionLoading } = useSubscription()
  const { sidebarCollapsed } = useSidebar()
  const [payments, setPayments] = useState<TaxPayment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<TaxPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("table")
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [activePeriod, setActivePeriod] = useState<string | null>(null)
  const [activeMethod, setActiveMethod] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState<string | null>(null)

  // Check subscription on mount
  useEffect(() => {
    if (subscriptionLoading) return
    if (!isSubscribed && profile && profile.businessType !== 'agent') {
      setShowSubscriptionModal(true)
    }
  }, [isSubscribed, subscriptionLoading, profile])

  useEffect(() => {
    if (user?.uid) {
      loadPayments()
    }
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [payments, searchTerm, activePeriod, activeMethod, activeStatus])

  const loadPayments = async () => {
    if (!user?.uid) return
    
    setLoading(true)
    try {
      const result = await taxPaymentService.getUserPaymentsSimple(user.uid)
      setPayments(result)
    } catch (error) {
      console.error("Error loading payments:", error)
      toast.error("Failed to load payment history")
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...payments]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(payment => 
        payment.transactionId.toLowerCase().includes(term) ||
        payment.taxDuration.toLowerCase().includes(term) ||
        payment.amount.toString().includes(term)
      )
    }

    // Period filter
    if (activePeriod) {
      filtered = filtered.filter(payment => payment.period === activePeriod)
    }

    // Method filter
    if (activeMethod) {
      filtered = filtered.filter(payment => payment.paymentMethod === activeMethod)
    }

    // Status filter
    if (activeStatus) {
      filtered = filtered.filter(payment => payment.status === activeStatus)
    }

    setFilteredPayments(filtered)
  }

  const handleViewReceipt = (payment: TaxPayment) => {
    const paymentData: PaymentData = {
      amount: payment.amount,
      tips: [
        "Keep this receipt for your records",
        "File your tax returns on time to avoid penalties",
        "Consider consulting a tax professional for complex situations",
        "Maintain records of all deductions and expenses",
        "Set reminders for upcoming tax deadlines"
      ],
      status: payment.status === 'completed' ? "Success" : payment.status,
      transactionId: payment.transactionId,
      method: payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1),
      taxDuration: payment.taxDuration,
      timestamp: payment.createdAt
    }
    
    setSelectedPayment(paymentData)
    setShowReceipt(true)
  }

  const handleCloseReceipt = () => {
    setShowReceipt(false)
    setSelectedPayment(null)
  }

  const getStatusBadge = (status: string) => {
    const config = {
      completed: { 
        icon: CheckCircle2, 
        color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50", 
        label: "Completed" 
      },
      pending: { 
        icon: Loader2, 
        color: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800/50", 
        label: "Pending" 
      },
      failed: { 
        icon: X, 
        color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50", 
        label: "Failed" 
      }
    }
    
    const { icon: Icon, color, label } = config[status as keyof typeof config] || config.pending
    
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border",
        color
      )}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    )
  }

  const toggleFilter = (type: FilterCategory, value: string | null) => {
    switch (type) {
      case "period":
        setActivePeriod(activePeriod === value ? null : value)
        break
      case "method":
        setActiveMethod(activeMethod === value ? null : value)
        break
      case "status":
        setActiveStatus(activeStatus === value ? null : value)
        break
    }
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setActivePeriod(null)
    setActiveMethod(null)
    setActiveStatus(null)
  }

  const copyTransactionId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast.success("Transaction ID copied!")
  }

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0)
  const completedCount = filteredPayments.filter(p => p.status === 'completed').length

  return (
    <>
      {/* Receipt Modal */}
      {showReceipt && selectedPayment && (
        <PaymentReceipt 
          paymentData={selectedPayment} 
          onDownload={() => {}} 
          onClose={handleCloseReceipt}
        />
      )}
      
      {/* Main Content */}
    <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial"
          >
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Filters
          </Button>
          
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="gap-1.5 sm:gap-2 h-7 sm:h-8 w-9 sm:w-auto"
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="gap-1.5 sm:gap-2 h-7 sm:h-8 w-9 sm:w-auto"
            >
              <Table2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>

        <Button
          onClick={() => router.push("/dashboard-creator/payment/add")}
          className="w-full sm:w-auto gap-1.5 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Add Payment</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className={`grid gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8 ${!sidebarCollapsed ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 md:grid-cols-3'}`}>
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <CardContent className="p-2.5 sm:p-3 md:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1 truncate">Total Payments</p>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold">{filteredPayments.length}</p>
              </div>
              <div className="p-1.5 sm:p-2 md:p-2.5 lg:p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform shrink-0 ml-1.5 sm:ml-2">
                <Wallet className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <CardContent className="p-2.5 sm:p-3 md:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1 truncate">Total Amount</p>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold truncate">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="p-1.5 sm:p-2 md:p-2.5 lg:p-3 bg-green-100 dark:bg-green-900/20 rounded-full group-hover:scale-110 transition-transform shrink-0 ml-1.5 sm:ml-2">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 col-span-2 md:col-span-1">
          <CardContent className="p-2.5 sm:p-3 md:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1 truncate">Completed</p>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold">{completedCount}</p>
              </div>
              <div className="p-1.5 sm:p-2 md:p-2.5 lg:p-3 bg-green-100 dark:bg-green-900/20 rounded-full group-hover:scale-110 transition-transform shrink-0 ml-1.5 sm:ml-2">
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-4 sm:mb-6 animate-in slide-in-from-top duration-300">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by transaction ID, amount, or duration..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 sm:right-2 top-1 h-7 w-7 sm:h-8 sm:w-8 p-0"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                )}
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {/* Period Filters */}
                {["monthly", "quarterly", "yearly"].map(period => (
                  <Button
                    key={period}
                    variant={activePeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFilter("period", period)}
                    className="capitalize text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">{period}</span>
                    <span className="sm:hidden">{period.slice(0, 3)}</span>
                  </Button>
                ))}

                {/* Method Filters */}
                {["paystack", "remitta", "interswitch", "firs"].map(method => (
                  <Button
                    key={method}
                    variant={activeMethod === method ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFilter("method", method)}
                    className="capitalize text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  >
                    {method}
                  </Button>
                ))}

                {/* Status Filters */}
                {["completed", "pending", "failed"].map(status => (
                  <Button
                    key={status}
                    variant={activeStatus === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFilter("status", status)}
                    className="capitalize text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  >
                    {status}
                  </Button>
                ))}

                {(activePeriod || activeMethod || activeStatus || searchTerm) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="ml-auto text-muted-foreground text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  >
                    <X className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Clear All</span>
                    <span className="sm:hidden">Clear</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <Card className="p-8 sm:p-12 text-center">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-3 sm:mb-4 text-primary" />
          <p className="text-sm sm:text-base text-muted-foreground">Loading payments...</p>
        </Card>
      ) : filteredPayments.length === 0 ? (
        <Card className="p-6 sm:p-8 md:p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-3 sm:p-4 bg-muted rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No payments found</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              {payments.length === 0 
                ? "Make your first payment to get started!" 
                : "Try adjusting your filters to see more results."}
            </p>
            {payments.length === 0 && (
              <Button onClick={() => router.push("/dashboard/payment/add")} size="lg" className="h-9 sm:h-10 text-sm sm:text-base">
                Make Payment
              </Button>
            )}
          </div>
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-1 lg:grid-cols-3">
          {filteredPayments.map((payment, index) => (
            <Card 
              key={payment.id} 
              className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg mb-1.5 sm:mb-2 group-hover:text-primary transition-colors truncate">
                      {payment.taxDuration}
                    </h3>
                    <div className="scale-90 sm:scale-100 origin-left">
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">Amount</span>
                    <span className="text-lg sm:text-xl font-bold truncate ml-2">{formatCurrency(payment.amount)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">Period</span>
                    <span className="text-xs sm:text-sm font-medium capitalize">{payment.period}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground">Method</span>
                    <span className="text-xs sm:text-sm font-medium capitalize truncate ml-2">{payment.paymentMethod}</span>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-mono flex-1 truncate">
                        {payment.transactionId}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 sm:h-7 sm:w-7 p-0 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyTransactionId(payment.transactionId)
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full h-9 sm:h-10 text-xs sm:text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={() => handleViewReceipt(payment)}
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  View Receipt
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] sm:min-w-[600px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-1.5 sm:p-2 md:p-3 lg:p-4 font-semibold text-[10px] sm:text-xs md:text-sm">Duration</th>
                  <th className="text-left p-1.5 sm:p-2 md:p-3 lg:p-4 font-semibold text-[10px] sm:text-xs md:text-sm">Amount</th>
                  <th className="text-left p-1.5 sm:p-2 md:p-3 lg:p-4 font-semibold text-[10px] sm:text-xs md:text-sm hidden md:table-cell">Period</th>
                  <th className="text-left p-1.5 sm:p-2 md:p-3 lg:p-4 font-semibold text-[10px] sm:text-xs md:text-sm hidden lg:table-cell">Method</th>
                  <th className="text-left p-1.5 sm:p-2 md:p-3 lg:p-4 font-semibold text-[10px] sm:text-xs md:text-sm">Status</th>
                  <th className="text-left p-1.5 sm:p-2 md:p-3 lg:p-4 font-semibold text-[10px] sm:text-xs md:text-sm hidden xl:table-cell">Transaction ID</th>
                  <th className="text-right p-1.5 sm:p-2 md:p-3 lg:p-4 font-semibold text-[10px] sm:text-xs md:text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment, index) => (
                  <tr 
                    key={payment.id} 
                    className="border-t hover:bg-muted/30 transition-colors animate-in fade-in slide-in-from-left-4"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="p-1.5 sm:p-2 md:p-3 lg:p-4 font-medium text-[10px] sm:text-xs md:text-sm max-w-[100px] sm:max-w-[150px] md:max-w-none truncate" title={payment.taxDuration}>{payment.taxDuration}</td>
                    <td className="p-1.5 sm:p-2 md:p-3 lg:p-4 font-bold text-[10px] sm:text-xs md:text-sm whitespace-nowrap">{formatCurrency(payment.amount)}</td>
                    <td className="p-1.5 sm:p-2 md:p-3 lg:p-4 capitalize text-[10px] sm:text-xs md:text-sm hidden md:table-cell">{payment.period}</td>
                    <td className="p-1.5 sm:p-2 md:p-3 lg:p-4 capitalize text-[10px] sm:text-xs md:text-sm hidden lg:table-cell">{payment.paymentMethod}</td>
                    <td className="p-1.5 sm:p-2 md:p-3 lg:p-4">
                      <div className="scale-75 sm:scale-90 md:scale-100 origin-left">
                        {getStatusBadge(payment.status)}
                      </div>
                    </td>
                    <td className="p-1.5 sm:p-2 md:p-3 lg:p-4 hidden xl:table-cell">
                      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                        <code className="text-[9px] sm:text-[10px] md:text-xs font-mono truncate max-w-[80px] sm:max-w-[120px] md:max-w-none" title={payment.transactionId}>{payment.transactionId}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 p-0 shrink-0"
                          onClick={() => copyTransactionId(payment.transactionId)}
                        >
                          <Copy className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-1.5 sm:p-2 md:p-3 lg:p-4">
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReceipt(payment)}
                          className="gap-1 sm:gap-1.5 md:gap-2 h-6 sm:h-7 md:h-8 lg:h-9 text-[10px] sm:text-xs md:text-sm px-2 sm:px-3"
                        >
                          <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
                          <span className="hidden sm:inline">Receipt</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
    {profile && profile.businessType !== 'agent' && (
      <SubscriptionRequiredModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        businessType={profile.businessType || 'freelancer'}
      />
    )}
    </>
  )
}
