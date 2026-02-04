"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Filter, Handshake, Eye, Edit, Trash2, CheckCircle2, Clock, X, Calendar, MoreVertical, AlertTriangle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { brandDealService } from "@/lib/services"
import { BrandDeal, BrandDealStatus, BrandDealType } from "@/lib/types"
import { toast } from "sonner"
import { AddBrandDealDialog } from "@/components/brand-deals/add-brand-deal-dialog"
import { ViewBrandDealDialog } from "@/components/brand-deals/view-brand-deal-dialog"
import { format } from "date-fns"
import { formatCurrencyAmount, fetchExchangeRate, CurrencyCode } from "@/lib/utils/currency"
import { useBusiness } from "@/lib/contexts/business-context"
import { useSidebar } from "@/lib/contexts/sidebar-context"
import { cn } from "@/lib/utils"

export default function BrandDealsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { sidebarCollapsed } = useSidebar()
  const { activeEntityId } = useBusiness()
  const { isSubscribed, isExpired, freeTrialStatus, loading: subscriptionLoading } = useSubscription()
  const [brandDeals, setBrandDeals] = useState<BrandDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedBrandDeal, setSelectedBrandDeal] = useState<BrandDeal | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [dealToDelete, setDealToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<BrandDealStatus | "all">("all")
  const [typeFilter, setTypeFilter] = useState<BrandDealType | "all">("all")
  const [currentPage, setCurrentPage] = useState(1)

  const loadBrandDeals = async () => {
    if (!profile?.userId) return
    
    try {
      setLoading(true)
      const filters: any = {}
      if (activeEntityId) {
        filters.entityId = activeEntityId
      }
      if (statusFilter !== "all") {
        filters.status = statusFilter
      }
      if (typeFilter !== "all") {
        filters.dealType = typeFilter
      }
      if (searchTerm) {
        filters.brandName = searchTerm
      }
      
      const result = await brandDealService.getUserBrandDeals(profile.userId, filters, currentPage, 20)
      setBrandDeals(result.data)
    } catch (error) {
      console.error("Error loading brand deals:", error)
      toast.error("Failed to load brand deals")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBrandDeals()
  }, [profile?.userId, activeEntityId, currentPage, statusFilter, typeFilter, searchTerm])

  const requireSubscription = (action: () => void) => {
    if (subscriptionLoading) return
    // Allow free trial users to add brand deals
    const hasActiveTrial = freeTrialStatus?.isInFreeTrial === true
    if (!isSubscribed && !hasActiveTrial) {
      setShowSubscriptionModal(true)
      return
    }
    if (isExpired && !hasActiveTrial) {
      setShowSubscriptionModal(true)
      return
    }
    action()
  }

  // Listen for create brand deal event from header
  useEffect(() => {
    const handleCreateBrandDeal = () => {
      requireSubscription(() => setIsAddDialogOpen(true))
    }
    window.addEventListener('createBrandDeal', handleCreateBrandDeal)
    return () => window.removeEventListener('createBrandDeal', handleCreateBrandDeal)
  }, [isSubscribed, isExpired, freeTrialStatus, subscriptionLoading])

  const handleDelete = (dealId: string) => {
    setDealToDelete(dealId)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!profile?.userId || !dealToDelete) return

    setIsDeleting(true)
    try {
      const result = await brandDealService.deleteBrandDeal(dealToDelete, profile.userId)
      if (result.success) {
        toast.success("Brand deal deleted successfully")
        loadBrandDeals()
        setShowDeleteConfirm(false)
        setDealToDelete(null)
      } else {
        toast.error(result.error || "Failed to delete brand deal")
      }
    } catch (error) {
      toast.error("Failed to delete brand deal")
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: BrandDealStatus) => {
    const variants: Record<BrandDealStatus, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, label: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      in_progress: { variant: "outline", icon: Clock, label: "In Progress" },
      completed: { variant: "default", icon: CheckCircle2, label: "Completed" },
      cancelled: { variant: "destructive", icon: X, label: "Cancelled" }
    }
    const config = variants[status]
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const getTypeLabel = (type: BrandDealType) => {
    const labels: Record<BrandDealType, string> = {
      sponsorship: "Sponsorship",
      collaboration: "Collaboration",
      endorsement: "Endorsement",
      affiliate: "Affiliate",
      other: "Other"
    }
    return labels[type]
  }

  // Calculate amount breakdown for tooltip
  const getAmountBreakdown = (deal: BrandDeal) => {
    const grossAmount = deal.amount
    const executionExpenses = deal.executionExpenses || 0
    const whtAmount = deal.whtAmount || 0
    const cashReceived = grossAmount - whtAmount
    const taxableIncome = deal.netIncome !== undefined 
      ? deal.netIncome 
      : (cashReceived - executionExpenses > 0 ? cashReceived - executionExpenses : cashReceived)
    
    const breakdown: Array<{ label: string; value: string; color?: string }> = []
    
    breakdown.push({
      label: 'Gross Amount',
      value: formatCurrencyAmount(grossAmount, deal.currency as CurrencyCode)
    })
    
    if (whtAmount > 0) {
      breakdown.push({
        label: 'WHT (Tax Credit)',
        value: `${formatCurrencyAmount(whtAmount, deal.currency as CurrencyCode)}${deal.whtRate ? ` (${deal.whtRate}%)` : ''}`,
        color: 'text-blue-600'
      })
      breakdown.push({
        label: 'Cash Received',
        value: formatCurrencyAmount(cashReceived, deal.currency as CurrencyCode),
        color: 'text-purple-600'
      })
    }
    
    if (executionExpenses > 0) {
      breakdown.push({
        label: 'Total Expenses',
        value: formatCurrencyAmount(executionExpenses, deal.currency as CurrencyCode),
        color: 'text-orange-600'
      })
    }
    
    breakdown.push({
      label: 'Taxable Income',
      value: formatCurrencyAmount(taxableIncome, deal.currency as CurrencyCode),
      color: 'text-green-600'
    })
    
    return breakdown
  }

  const filteredDeals = brandDeals.filter(deal => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        deal.brandName.toLowerCase().includes(searchLower) ||
        deal.title.toLowerCase().includes(searchLower) ||
        deal.description?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6 overflow-x-hidden max-w-full">
      <div className="space-y-4 sm:space-y-5 md:space-y-6">
        {/* Filters - Responsive to sidebar state only in tablet view */}
        <Card className="p-3 sm:p-4">
          <div className={cn(
            "flex gap-2 sm:gap-3",
            !sidebarCollapsed ? "flex-row" : "flex-col md:flex-row lg:flex-row"
          )}>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <Input
                placeholder="Search by brand name, title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>

            <div className={cn(
              "flex gap-2 shrink-0",
              !sidebarCollapsed ? "flex-row" : "flex-col md:flex-row lg:flex-row"
            )}>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as BrandDealType | "all")}>
                <SelectTrigger className={cn(
                  "h-9 sm:h-10 text-xs sm:text-sm",
                  !sidebarCollapsed ? "w-[120px] sm:w-[150px]" : "w-full md:w-[150px] lg:w-[150px]"
                )}>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sponsorship">Sponsorship</SelectItem>
                  <SelectItem value="collaboration">Collaboration</SelectItem>
                  <SelectItem value="endorsement">Endorsement</SelectItem>
                  <SelectItem value="affiliate">Affiliate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BrandDealStatus | "all")}>
                <SelectTrigger className={cn(
                  "h-9 sm:h-10 text-xs sm:text-sm",
                  !sidebarCollapsed ? "w-[120px] sm:w-[150px]" : "w-full md:w-[150px] lg:w-[150px]"
                )}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Brand Deals List */}
        {loading ? (
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading brand deals...</div>
            </div>
          </Card>
        ) : filteredDeals.length === 0 ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Handshake className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No brand deals found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first brand deal or sponsorship"}
              </p>
              {!searchTerm && statusFilter === "all" && typeFilter === "all" && (
                <Button onClick={() => requireSubscription(() => setIsAddDialogOpen(true))} disabled={subscriptionLoading}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Brand Deal
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Mobile Card View - Transaction Style (always on mobile, on tablet when sidebar collapsed, never on desktop) */}
            <div className={cn(
              "space-y-2",
              !sidebarCollapsed ? "block md:block lg:hidden" : "block md:hidden lg:hidden"
            )}>
              {filteredDeals.map((deal) => {
                const netIncomeAmount = deal.netIncomeNgnEquivalent !== undefined
                  ? deal.netIncomeNgnEquivalent
                  : (deal.netIncome !== undefined
                    ? (deal.currency === 'NGN' ? deal.netIncome : deal.netIncome * (deal.exchangeRate || 1500))
                    : (deal.ngnEquivalent !== undefined 
                      ? deal.ngnEquivalent 
                      : (deal.currency === 'NGN' ? deal.amount : deal.amount * (deal.exchangeRate || 1500))))
                
                return (
                  <div
                    key={deal.id}
                    onClick={() => {
                      setSelectedBrandDeal(deal)
                      setIsViewDialogOpen(true)
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/50 bg-card"
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
                      <Handshake className="w-5 h-5 text-primary" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{deal.brandName}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{deal.title}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] h-5">
                              {getTypeLabel(deal.dealType)}
                            </Badge>
                            <div className="scale-90 origin-left">{getStatusBadge(deal.status)}</div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(deal.startDate), "MMM dd, yyyy")}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 -mr-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-40"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedBrandDeal(deal)
                                  setIsViewDialogOpen(true)
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              {deal.status !== "completed" && deal.status !== "cancelled" && (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    requireSubscription(() => {
                                      setSelectedBrandDeal(deal)
                                      setIsAddDialogOpen(true)
                                    })
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(deal.id)
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-right cursor-help">
                                <p className="text-sm font-semibold text-primary">
                                  {formatCurrencyAmount(netIncomeAmount, 'NGN')}
                                </p>
                                {deal.currency !== 'NGN' && (
                                  <p className="text-xs text-muted-foreground">
                                    {formatCurrencyAmount(
                                      deal.netIncome !== undefined ? deal.netIncome : deal.amount,
                                      deal.currency as CurrencyCode
                                    )}
                                  </p>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm bg-popover border p-3 shadow-lg" side="left">
                              <div className="space-y-2 text-xs">
                                <p className="font-semibold mb-2 text-foreground">Amount Breakdown</p>
                                <div className="space-y-1.5">
                                  {getAmountBreakdown(deal).map((item, index) => (
                                    <div key={index} className="flex justify-between items-center gap-4">
                                      <span className="text-muted-foreground">{item.label}:</span>
                                      <span className={cn("font-medium", item.color || "text-foreground")}>{item.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table View (never on mobile, on tablet when sidebar expanded, always on desktop) */}
            <Card className={cn(
              "overflow-hidden border-0 shadow-none md:border md:shadow-sm",
              !sidebarCollapsed ? "hidden md:hidden lg:block" : "hidden md:block lg:block"
            )}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold">Brand</th>
                      <th className="text-left p-3 text-xs font-semibold">Title</th>
                      <th className="text-left p-3 text-xs font-semibold">Type</th>
                      <th className="text-left p-3 text-xs font-semibold">Amount</th>
                      <th className="text-left p-3 text-xs font-semibold">Status</th>
                      <th className="text-left p-3 text-xs font-semibold">Start Date</th>
                      <th className="text-right p-3 text-xs font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeals.map((deal) => (
                      <tr key={deal.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="font-medium text-sm">{deal.brandName}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm truncate max-w-xs">{deal.title}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(deal.dealType)}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col cursor-help">
                                <span className="font-semibold text-sm text-primary">
                                  {formatCurrencyAmount(
                                    deal.netIncomeNgnEquivalent !== undefined
                                      ? deal.netIncomeNgnEquivalent
                                      : (deal.netIncome !== undefined
                                        ? (deal.currency === 'NGN' ? deal.netIncome : deal.netIncome * (deal.exchangeRate || 1500))
                                        : (deal.ngnEquivalent !== undefined 
                                          ? deal.ngnEquivalent 
                                          : (deal.currency === 'NGN' ? deal.amount : deal.amount * (deal.exchangeRate || 1500)))),
                                    'NGN'
                                  )}
                                </span>
                                {deal.currency !== 'NGN' && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatCurrencyAmount(
                                      deal.netIncome !== undefined ? deal.netIncome : deal.amount,
                                      deal.currency as CurrencyCode
                                    )}
                                  </span>
                                )}
                                {deal.executionExpenses && deal.executionExpenses > 0 && (
                                  <span className="text-xs text-orange-600">
                                    Gross: {formatCurrencyAmount(deal.amount, deal.currency as CurrencyCode)} • Expenses: {formatCurrencyAmount(deal.executionExpenses, deal.currency as CurrencyCode)}
                                  </span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm bg-popover border p-3 shadow-lg" side="top">
                              <div className="space-y-2 text-xs">
                                <p className="font-semibold mb-2 text-foreground">Amount Breakdown</p>
                                <div className="space-y-1.5">
                                  {getAmountBreakdown(deal).map((item, index) => (
                                    <div key={index} className="flex justify-between items-center gap-4">
                                      <span className="text-muted-foreground">{item.label}:</span>
                                      <span className={`font-medium ${item.color || 'text-foreground'}`}>{item.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="p-3">{getStatusBadge(deal.status)}</td>
                        <td className="p-3">
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(deal.startDate), "MMM dd, yyyy")}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBrandDeal(deal)
                                setIsViewDialogOpen(true)
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {deal.status !== "completed" && deal.status !== "cancelled" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  requireSubscription(() => {
                                    setSelectedBrandDeal(deal)
                                    setIsAddDialogOpen(true)
                                  })
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(deal.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <AddBrandDealDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            setSelectedBrandDeal(null)
          }
        }}
        onSuccess={() => {
          loadBrandDeals()
          setSelectedBrandDeal(null)
        }}
        brandDeal={selectedBrandDeal}
        onSubscriptionRequired={() => setShowSubscriptionModal(true)}
      />

      {/* View Dialog */}
      <ViewBrandDealDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        brandDeal={selectedBrandDeal}
        onEdit={selectedBrandDeal?.status !== "completed" && selectedBrandDeal?.status !== "cancelled" ? () => {
          requireSubscription(() => {
            setIsViewDialogOpen(false)
            setIsAddDialogOpen(true)
          })
        } : undefined}
        onDelete={handleDelete}
        onUpdate={loadBrandDeals}
      />

      {/* Subscription Modal */}
      {profile && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile.businessType}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Brand Deal
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this brand deal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false)
                setDealToDelete(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

