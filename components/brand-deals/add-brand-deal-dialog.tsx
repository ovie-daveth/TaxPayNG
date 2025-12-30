"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Loader2, X } from "lucide-react"
import { BrandDeal, BrandDealStatus, BrandDealType } from "@/lib/types"
import { brandDealService } from "@/lib/services"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { SUPPORTED_CURRENCIES, CurrencyCode, formatCurrencyInput, parseCurrencyInput, formatCurrencyAmount, fetchExchangeRate, convertCurrency } from "@/lib/utils/currency"
import { formatDateForInput } from "@/lib/utils/date"

interface AddBrandDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  brandDeal?: BrandDeal | null
}

export function AddBrandDealDialog({
  open,
  onOpenChange,
  onSuccess,
  brandDeal
}: AddBrandDealDialogProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [amountDisplay, setAmountDisplay] = useState("")
  const [ngnEquivalent, setNgnEquivalent] = useState<number | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    brandName: "",
    brandContact: {
      name: "",
      email: "",
      phone: "",
      company: ""
    },
    dealType: "sponsorship" as BrandDealType,
    status: "pending" as BrandDealStatus,
    title: "",
    description: "",
    amount: 0,
    currency: "NGN" as CurrencyCode,
    paymentTerms: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    deliveryDate: "",
    deliverables: [] as string[],
    contentRequirements: "",
    platform: [] as string[],
    contractUrl: "",
    contractSigned: false,
    contractSignedDate: "",
    notes: "",
    tags: [] as string[],
    paymentSchedule: {
      type: "single" as "single" | "milestone" | "recurring",
      milestones: [] as Array<{
        label: string
        amount: number
        dueDate: string
        paid: boolean
        paidDate?: string
      }>
    }
  })

  const [newDeliverable, setNewDeliverable] = useState("")
  const [newPlatform, setNewPlatform] = useState("")
  const [newTag, setNewTag] = useState("")
  const [newMilestone, setNewMilestone] = useState({ label: "", amount: 0, dueDate: "" })

  // Fetch exchange rate when currency changes
  useEffect(() => {
    const loadExchangeRate = async () => {
      if (formData.currency !== "NGN" && formData.amount > 0) {
        try {
          const rate = await fetchExchangeRate(formData.currency, "NGN")
          setExchangeRate(rate)
          setNgnEquivalent(formData.amount * rate)
        } catch (error) {
          console.error("Error fetching exchange rate:", error)
          setExchangeRate(null)
          setNgnEquivalent(null)
        }
      } else {
        setExchangeRate(null)
        setNgnEquivalent(formData.amount > 0 ? formData.amount : null)
      }
    }
    loadExchangeRate()
  }, [formData.currency, formData.amount])

  useEffect(() => {
    if (brandDeal && open) {
      const amount = brandDeal.amount || 0
      setFormData({
        brandName: brandDeal.brandName || "",
        brandContact: brandDeal.brandContact ? {
          name: brandDeal.brandContact.name || "",
          email: brandDeal.brandContact.email || "",
          phone: brandDeal.brandContact.phone || "",
          company: brandDeal.brandContact.company || ""
        } : { name: "", email: "", phone: "", company: "" },
        dealType: brandDeal.dealType || "sponsorship",
        status: brandDeal.status || "pending",
        title: brandDeal.title || "",
        description: brandDeal.description || "",
        amount: amount,
        currency: (brandDeal.currency || "NGN") as CurrencyCode,
        paymentTerms: brandDeal.paymentTerms || "",
        startDate: brandDeal.startDate ? brandDeal.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: brandDeal.endDate ? brandDeal.endDate.split('T')[0] : "",
        deliveryDate: brandDeal.deliveryDate ? brandDeal.deliveryDate.split('T')[0] : "",
        deliverables: brandDeal.deliverables || [],
        contentRequirements: brandDeal.contentRequirements || "",
        platform: brandDeal.platform || [],
        contractUrl: brandDeal.contractUrl || "",
        contractSigned: brandDeal.contractSigned || false,
        contractSignedDate: brandDeal.contractSignedDate ? brandDeal.contractSignedDate.split('T')[0] : "",
        notes: brandDeal.notes || "",
        tags: brandDeal.tags || [],
        paymentSchedule: brandDeal.paymentSchedule ? {
          type: brandDeal.paymentSchedule.type,
          milestones: brandDeal.paymentSchedule.milestones || []
        } : {
          type: "single",
          milestones: []
        }
      })
      setAmountDisplay(formatCurrencyInput(amount.toString()))
    } else if (open && !brandDeal) {
      // Reset form for new deal
      setFormData({
        brandName: "",
        brandContact: { name: "", email: "", phone: "", company: "" },
        dealType: "sponsorship",
        status: "pending",
        title: "",
        description: "",
        amount: 0,
        currency: "NGN",
        paymentTerms: "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
        deliveryDate: "",
        deliverables: [],
        contentRequirements: "",
        platform: [],
        contractUrl: "",
        contractSigned: false,
        contractSignedDate: "",
        notes: "",
        tags: [],
        paymentSchedule: { type: "single", milestones: [] }
      })
      setAmountDisplay("")
      setNgnEquivalent(null)
      setExchangeRate(null)
    }
  }, [brandDeal, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid || !profile?.userId) {
      toast.error("User not authenticated")
      return
    }

    if (!formData.brandName || !formData.title || !formData.amount) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)

    try {
      // Calculate NGN equivalent and exchange rate if currency is not NGN
      let exchangeRateValue: number | undefined = undefined
      let ngnEquivalentValue: number | undefined = undefined
      
      if (formData.currency === 'NGN') {
        ngnEquivalentValue = formData.amount
      } else if (formData.amount > 0) {
        try {
          exchangeRateValue = exchangeRate || await fetchExchangeRate(formData.currency, 'NGN')
          ngnEquivalentValue = formData.amount * exchangeRateValue
        } catch (error) {
          console.error('Error calculating NGN equivalent:', error)
          // Continue without conversion if rate fetch fails
        }
      }

      const dealData = {
        brandName: formData.brandName,
        brandContact: Object.values(formData.brandContact).some(v => v) ? formData.brandContact : undefined,
        dealType: formData.dealType,
        status: formData.status,
        title: formData.title,
        description: formData.description || undefined,
        amount: formData.amount,
        currency: formData.currency,
        exchangeRate: exchangeRateValue,
        ngnEquivalent: ngnEquivalentValue,
        paymentTerms: formData.paymentTerms || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        deliveryDate: formData.deliveryDate || undefined,
        deliverables: formData.deliverables.length > 0 ? formData.deliverables : undefined,
        contentRequirements: formData.contentRequirements || undefined,
        platform: formData.platform.length > 0 ? formData.platform : undefined,
        contractUrl: formData.contractUrl || undefined,
        contractSigned: formData.contractSigned || undefined,
        contractSignedDate: formData.contractSignedDate || undefined,
        notes: formData.notes || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        paymentSchedule: formData.paymentSchedule.type !== "single" || formData.paymentSchedule.milestones.length > 0
          ? formData.paymentSchedule
          : undefined
      } as any

      let result
      if (brandDeal) {
        result = await brandDealService.updateBrandDeal(brandDeal.id, profile.userId, dealData)
      } else {
        result = await brandDealService.createBrandDeal(profile.userId, dealData)
      }

      if (result.success) {
        toast.success(brandDeal ? "Brand deal updated successfully" : "Brand deal created successfully")
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || "Failed to save brand deal")
      }
    } catch (error) {
      console.error("Error saving brand deal:", error)
      toast.error("Failed to save brand deal")
    } finally {
      setIsSubmitting(false)
    }
  }

  const addDeliverable = () => {
    if (newDeliverable.trim()) {
      setFormData(prev => ({
        ...prev,
        deliverables: [...prev.deliverables, newDeliverable.trim()]
      }))
      setNewDeliverable("")
    }
  }

  const removeDeliverable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }))
  }

  const addPlatform = () => {
    if (newPlatform.trim()) {
      setFormData(prev => ({
        ...prev,
        platform: [...prev.platform, newPlatform.trim()]
      }))
      setNewPlatform("")
    }
  }

  const removePlatform = (index: number) => {
    setFormData(prev => ({
      ...prev,
      platform: prev.platform.filter((_, i) => i !== index)
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag("")
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const addMilestone = () => {
    if (newMilestone.label && newMilestone.amount > 0 && newMilestone.dueDate) {
      setFormData(prev => ({
        ...prev,
        paymentSchedule: {
          ...prev.paymentSchedule,
          milestones: [...prev.paymentSchedule.milestones, {
            ...newMilestone,
            paid: false
          }]
        }
      }))
      setNewMilestone({ label: "", amount: 0, dueDate: "" })
    }
  }

  const removeMilestone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      paymentSchedule: {
        ...prev.paymentSchedule,
        milestones: prev.paymentSchedule.milestones.filter((_, i) => i !== index)
      }
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{brandDeal ? "Edit Brand Deal" : "Add Brand Deal"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand Name *</Label>
                <Input
                  id="brandName"
                  value={formData.brandName}
                  onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Deal Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dealType">Deal Type</Label>
                <Select
                  value={formData.dealType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dealType: value as BrandDealType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sponsorship">Sponsorship</SelectItem>
                    <SelectItem value="collaboration">Collaboration</SelectItem>
                    <SelectItem value="endorsement">Endorsement</SelectItem>
                    <SelectItem value="affiliate">Affiliate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as BrandDealStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          {/* Brand Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Brand Contact (Optional)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={formData.brandContact.name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brandContact: { ...prev.brandContact, name: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.brandContact.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brandContact: { ...prev.brandContact, email: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.brandContact.phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brandContact: { ...prev.brandContact, phone: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactCompany">Company</Label>
                <Input
                  id="contactCompany"
                  value={formData.brandContact.company}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brandContact: { ...prev.brandContact, company: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Financial Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="text"
                  value={amountDisplay}
                  onChange={(e) => {
                    const formatted = formatCurrencyInput(e.target.value)
                    setAmountDisplay(formatted)
                    const parsed = parseCurrencyInput(formatted)
                    const numericValue = parseFloat(parsed) || 0
                    setFormData(prev => ({ ...prev, amount: numericValue }))
                  }}
                  placeholder="0.00"
                  required
                />
                {ngnEquivalent !== null && formData.currency !== "NGN" && exchangeRate && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {formatCurrencyAmount(ngnEquivalent, "NGN")} (Rate: 1 {formData.currency} = {exchangeRate.toFixed(2)} NGN)
                  </p>
                )}
                {formData.currency === "NGN" && formData.amount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrencyAmount(formData.amount, "NGN")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, currency: value as CurrencyCode }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={formData.paymentTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                placeholder="e.g., Net 30, 50% upfront, 50% on completion"
              />
            </div>

            {/* Payment Schedule */}
            <div className="space-y-2">
              <Label>Payment Schedule</Label>
              <Select
                value={formData.paymentSchedule.type}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  paymentSchedule: { ...prev.paymentSchedule, type: value as "single" | "milestone" | "recurring" }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Payment</SelectItem>
                  <SelectItem value="milestone">Milestone Payments</SelectItem>
                  <SelectItem value="recurring">Recurring Payments</SelectItem>
                </SelectContent>
              </Select>

              {formData.paymentSchedule.type === "milestone" && (
                <div className="space-y-2 mt-2 p-3 border rounded-md">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Milestone label"
                      value={newMilestone.label}
                      onChange={(e) => setNewMilestone(prev => ({ ...prev, label: e.target.value }))}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newMilestone.amount || ""}
                      onChange={(e) => setNewMilestone(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-24"
                    />
                    <Input
                      type="date"
                      value={newMilestone.dueDate}
                      onChange={(e) => setNewMilestone(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-40"
                    />
                    <Button type="button" onClick={addMilestone} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.paymentSchedule.milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="flex-1">{milestone.label}</span>
                      <span>{formData.currency} {milestone.amount}</span>
                      <span className="text-muted-foreground">{milestone.dueDate}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMilestone(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Dates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Delivery Date</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Content Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Content Details</h3>
            
            <div className="space-y-2">
              <Label>Deliverables</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 3 Instagram posts"
                  value={newDeliverable}
                  onChange={(e) => setNewDeliverable(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addDeliverable()
                    }
                  }}
                />
                <Button type="button" onClick={addDeliverable} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.deliverables.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.deliverables.map((item, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {item}
                      <button
                        type="button"
                        onClick={() => removeDeliverable(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Platforms</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Instagram, YouTube"
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addPlatform()
                    }
                  }}
                />
                <Button type="button" onClick={addPlatform} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.platform.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.platform.map((item, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {item}
                      <button
                        type="button"
                        onClick={() => removePlatform(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contentRequirements">Content Requirements</Label>
              <Textarea
                id="contentRequirements"
                value={formData.contentRequirements}
                onChange={(e) => setFormData(prev => ({ ...prev, contentRequirements: e.target.value }))}
                rows={3}
                placeholder="Guidelines, requirements, or specifications for the content"
              />
            </div>
          </div>

          {/* Contract */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Contract</h3>
            
            <div className="space-y-2">
              <Label htmlFor="contractUrl">Contract URL</Label>
              <Input
                id="contractUrl"
                type="url"
                value={formData.contractUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, contractUrl: e.target.value }))}
                placeholder="Link to contract document"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="contractSigned"
                checked={formData.contractSigned}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  contractSigned: checked === true,
                  contractSignedDate: checked ? new Date().toISOString().split('T')[0] : ""
                }))}
              />
              <Label htmlFor="contractSigned" className="cursor-pointer">
                Contract Signed
              </Label>
            </div>

            {formData.contractSigned && (
              <div className="space-y-2">
                <Label htmlFor="contractSignedDate">Signed Date</Label>
                <Input
                  id="contractSignedDate"
                  type="date"
                  value={formData.contractSignedDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, contractSignedDate: e.target.value }))}
                />
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Additional Information</h3>
            
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                />
                <Button type="button" onClick={addTag} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Additional notes or comments"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {brandDeal ? "Update" : "Create"} Brand Deal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

