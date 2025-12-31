"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Filter, Handshake, Eye, Edit, Trash2, CheckCircle2, Clock, X, Calendar } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { brandDealService } from "@/lib/services"
import { BrandDeal, BrandDealStatus, BrandDealType } from "@/lib/types"
import { toast } from "sonner"
import { AddBrandDealDialog } from "@/components/brand-deals/add-brand-deal-dialog"
import { ViewBrandDealDialog } from "@/components/brand-deals/view-brand-deal-dialog"
import { format } from "date-fns"
import { formatCurrencyAmount, fetchExchangeRate, CurrencyCode } from "@/lib/utils/currency"
import { useBusiness } from "@/lib/contexts/business-context"

export default function BrandDealsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { activeEntityId } = useBusiness()
  const { isSubscribed, isExpired, loading: subscriptionLoading } = useSubscription()
  const [brandDeals, setBrandDeals] = useState<BrandDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedBrandDeal, setSelectedBrandDeal] = useState<BrandDeal | null>(null)
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
    if (!isSubscribed || isExpired) {
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
  }, [isSubscribed, isExpired, subscriptionLoading])

  const handleDelete = async (dealId: string) => {
    if (!profile?.userId) return
    if (!confirm("Are you sure you want to delete this brand deal?")) return

    try {
      const result = await brandDealService.deleteBrandDeal(dealId, profile.userId)
      if (result.success) {
        toast.success("Brand deal deleted successfully")
        loadBrandDeals()
      } else {
        toast.error(result.error || "Failed to delete brand deal")
      }
    } catch (error) {
      toast.error("Failed to delete brand deal")
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Brand Deals & Sponsorships</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage your brand partnerships, sponsorships, and collaborations
            </p>
          </div>
          <Button
            onClick={() => requireSubscription(() => setIsAddDialogOpen(true))}
            className="w-full sm:w-auto"
            disabled={subscriptionLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Brand Deal
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by brand name, title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BrandDealStatus | "all")}>
              <SelectTrigger className="w-full sm:w-[150px]">
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
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as BrandDealType | "all")}>
              <SelectTrigger className="w-full sm:w-[150px]">
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
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredDeals.map((deal) => (
                <Card key={deal.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{deal.brandName}</h3>
                        {getStatusBadge(deal.status)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{deal.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(deal.dealType)}
                        </Badge>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-primary">
                            {formatCurrencyAmount(
                              deal.ngnEquivalent !== undefined 
                                ? deal.ngnEquivalent 
                                : (deal.currency === 'NGN' ? deal.amount : deal.amount * (deal.exchangeRate || 1500)),
                              'NGN'
                            )}
                          </span>
                          {deal.currency !== 'NGN' && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatCurrencyAmount(deal.amount, deal.currency as CurrencyCode)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBrandDeal(deal)
                        setIsViewDialogOpen(true)
                      }}
                      className="flex-1 text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    {deal.status !== "completed" && deal.status !== "cancelled" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBrandDeal(deal)
                          setIsAddDialogOpen(true)
                        }}
                        className="flex-1 text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(deal.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop Table View */}
            <Card className="hidden md:block overflow-hidden border-0 shadow-none md:border md:shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
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
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-primary">
                              {formatCurrencyAmount(
                                deal.ngnEquivalent !== undefined 
                                  ? deal.ngnEquivalent 
                                  : (deal.currency === 'NGN' ? deal.amount : deal.amount * (deal.exchangeRate || 1500)),
                                'NGN'
                              )}
                            </span>
                            {deal.currency !== 'NGN' && (
                              <span className="text-xs text-muted-foreground">
                                {formatCurrencyAmount(deal.amount, deal.currency as CurrencyCode)}
                              </span>
                            )}
                          </div>
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
    </div>
  )
}

