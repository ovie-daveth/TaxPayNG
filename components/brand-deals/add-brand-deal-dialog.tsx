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
import { Plus, Trash2, Loader2, X, AlertCircle } from "lucide-react"
import { BrandDeal, BrandDealStatus, BrandDealType, BrandDealExpenseCategory } from "@/lib/types"
import { brandDealService } from "@/lib/services"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { useBusiness } from "@/lib/contexts/business-context"
import { SUPPORTED_CURRENCIES, CurrencyCode, getCurrencySymbol, formatCurrencyInput, parseCurrencyInput, formatCurrencyAmount, fetchExchangeRate, convertCurrency, handleCurrencyInputChange } from "@/lib/utils/currency"
import { formatDateForInput } from "@/lib/utils/date"
import { format } from "date-fns"
import { uploadToImageKit } from "@/lib/utils/imagekit"

interface AddBrandDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  brandDeal?: BrandDeal | null
  onSubscriptionRequired?: () => void
}

export function AddBrandDealDialog({
  open,
  onOpenChange,
  onSuccess,
  brandDeal,
  onSubscriptionRequired
}: AddBrandDealDialogProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { isSubscribed, isExpired, loading: subscriptionLoading } = useSubscription()
  const { activeEntityId } = useBusiness()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [amountDisplay, setAmountDisplay] = useState("")
  const [ngnEquivalent, setNgnEquivalent] = useState<number | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false)
  const [contractInputType, setContractInputType] = useState<"link" | "file">("link")
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [uploadingContract, setUploadingContract] = useState(false)

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
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")
  const [newTag, setNewTag] = useState("")
  const [newMilestone, setNewMilestone] = useState({ label: "", amount: 0, dueDate: "" })
  
  // Execution expenses state
  const [executionExpensesDetails, setExecutionExpensesDetails] = useState<Array<{
    description: string
    amount: number
    category?: BrandDealExpenseCategory
    date?: string
  }>>([])
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", category: "" as BrandDealExpenseCategory | "", date: "" })
  const [expenseAmountDisplay, setExpenseAmountDisplay] = useState("")
  
  // WHT state
  const [whtDeducted, setWhtDeducted] = useState(false)
  const [whtRate, setWhtRate] = useState<number>(0)
  const [whtCertificateNumber, setWhtCertificateNumber] = useState("")

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
      setExecutionExpensesDetails(brandDeal.executionExpensesDetails || [])
      setWhtDeducted(brandDeal.whtDeducted || false)
      setWhtRate(brandDeal.whtRate || 0)
      setWhtCertificateNumber(brandDeal.whtCertificateNumber || "")
      setAmountDisplay(formatCurrencyInput(amount.toString()))
      // Set contract input type - if contractUrl exists, use "link", otherwise default to "link"
      setContractInputType(brandDeal.contractUrl ? "link" : "link")
      setContractFile(null)
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
      setExecutionExpensesDetails([])
      setNewExpense({ description: "", amount: "", category: "" as BrandDealExpenseCategory | "", date: "" })
      setExpenseAmountDisplay("")
      setSelectedPlatform("")
      setWhtDeducted(false)
      setWhtRate(0)
      setWhtCertificateNumber("")
      setHasUnsavedChanges(false)
      setContractInputType("link")
      setContractFile(null)
    }
  }, [brandDeal, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Enforce subscription requirement (applies to create and update)
    if (subscriptionLoading) return
    if (!isSubscribed || isExpired) {
      onSubscriptionRequired?.()
      return
    }

    if (!user?.uid || !profile?.userId) {
      toast.error("User not authenticated")
      return
    }

    if (!formData.brandName || !formData.title || !formData.amount) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    setUploadingContract(false)

    try {
      // Upload contract file to ImageKit if file is selected
      let contractUrl = formData.contractUrl
      if (contractInputType === "file" && contractFile) {
        try {
          setUploadingContract(true)
          const uploadResult = await uploadToImageKit(
            contractFile,
            "brand-deals/contracts",
            profile.userId
          )
          contractUrl = uploadResult.url
          setUploadingContract(false)
        } catch (uploadError) {
          console.error("Error uploading contract file:", uploadError)
          setUploadingContract(false)
          toast.error("Failed to upload contract file. Please try again.")
          setIsSubmitting(false)
          return
        }
      }

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

      // Calculate WHT, cash received, and taxable income
      const calculatedWhtAmount = whtDeducted && whtRate > 0 ? (formData.amount * whtRate) / 100 : 0
      const calculatedCashReceived = formData.amount - calculatedWhtAmount
      const calculatedTaxableIncome = calculatedCashReceived - totalExecutionExpenses
      const calculatedTaxableIncomeNgn = calculatedTaxableIncome > 0 && ngnEquivalentValue !== undefined
        ? (formData.currency === 'NGN' ? calculatedTaxableIncome : calculatedTaxableIncome * (exchangeRateValue || 1))
        : undefined

      const dealData = {
        entityId: activeEntityId || undefined,
        brandName: formData.brandName,
        brandContact: Object.values(formData.brandContact).some(v => v) ? formData.brandContact : undefined,
        dealType: formData.dealType,
        status: formData.status,
        title: formData.title,
        description: formData.description || undefined,
        amount: formData.amount, // Gross amount
        currency: formData.currency,
        exchangeRate: exchangeRateValue,
        ngnEquivalent: ngnEquivalentValue,
        // Execution expenses
        executionExpenses: totalExecutionExpenses > 0 ? totalExecutionExpenses : undefined,
        executionExpensesCurrency: totalExecutionExpenses > 0 ? formData.currency : undefined,
        executionExpensesDetails: executionExpensesDetails.length > 0 ? executionExpensesDetails : undefined,
        // WHT (tax credit, not expense)
        whtDeducted: whtDeducted || undefined,
        whtRate: whtDeducted && whtRate > 0 ? whtRate : undefined,
        whtAmount: calculatedWhtAmount > 0 ? calculatedWhtAmount : undefined,
        whtCertificateNumber: whtDeducted && whtCertificateNumber ? whtCertificateNumber : undefined,
        // Calculated taxable income (cash received - expenses)
        // Cash received = Gross - WHT
        // Taxable income = Cash received - Expenses (this is what you pay tax on)
        netIncome: calculatedTaxableIncome > 0 ? calculatedTaxableIncome : (calculatedCashReceived > 0 ? calculatedCashReceived : undefined),
        netIncomeNgnEquivalent: calculatedTaxableIncomeNgn,
        paymentTerms: formData.paymentTerms || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        deliveryDate: formData.deliveryDate || undefined,
        deliverables: formData.deliverables.length > 0 ? formData.deliverables : undefined,
        contentRequirements: formData.contentRequirements || undefined,
        platform: formData.platform.length > 0 ? formData.platform : undefined,
        contractUrl: contractUrl || undefined,
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
        setHasUnsavedChanges(false)
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || "Failed to save brand deal")
      }
      } catch (error) {
      console.error("Error saving brand deal:", error)
      toast.error("Failed to save brand deal")
      setUploadingContract(false)
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

  const addPlatform = (platform: string) => {
    if (platform && !formData.platform.includes(platform)) {
      setFormData(prev => ({
        ...prev,
        platform: [...prev.platform, platform]
      }))
      setSelectedPlatform("") // Reset dropdown
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

  // Track unsaved changes
  useEffect(() => {
    // Only mark as having changes if form has been modified and isn't in edit mode for an existing brand deal
    if (!brandDeal) {
      const hasFormData = Boolean(
        formData.brandName.trim() ||
        formData.title.trim() ||
        formData.description.trim() ||
        formData.amount > 0 ||
        formData.deliverables.length > 0 ||
        formData.platform.length > 0 ||
        formData.contentRequirements.trim() ||
        formData.notes.trim() ||
        formData.tags.length > 0 ||
        executionExpensesDetails.length > 0 ||
        whtDeducted ||
        formData.contractUrl.trim() ||
        contractFile
      )
      setHasUnsavedChanges(hasFormData)
    }
  }, [formData, executionExpensesDetails, whtDeducted, brandDeal, contractFile])

  const handleDialogOpenChange = (newOpen: boolean) => {
    // If trying to close and there are unsaved changes, show confirmation
    if (!newOpen && hasUnsavedChanges) {
      setShowCloseConfirmation(true)
      return
    }
    // Otherwise, close normally
    onOpenChange(newOpen)
    // Reset unsaved changes when closing
    if (!newOpen) {
      setHasUnsavedChanges(false)
    }
  }

  const handleConfirmClose = () => {
    setShowCloseConfirmation(false)
    setHasUnsavedChanges(false)
    onOpenChange(false)
  }

  // Handle escape key
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (hasUnsavedChanges) {
          setShowCloseConfirmation(true)
        } else {
          handleDialogOpenChange(false)
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, hasUnsavedChanges])

  const addExpense = () => {
    // Parse amount from formatted string
    const parsedAmount = parseFloat(parseCurrencyInput(newExpense.amount))
    
    // Validate all fields are filled before adding expense
    // Note: Expenses are optional - deal can be created without any expenses
    if (
      newExpense.description.trim() &&
      parsedAmount > 0 &&
      newExpense.category &&
      newExpense.date
    ) {
      setExecutionExpensesDetails(prev => [...prev, {
        description: newExpense.description.trim(),
        amount: parsedAmount,
        category: newExpense.category as BrandDealExpenseCategory,
        date: newExpense.date
      }])
      // Clear the form after adding expense
      setNewExpense({ description: "", amount: "", category: "", date: "" })
      setExpenseAmountDisplay("")
    }
  }

  // Check if expense form is valid
  const parsedExpenseAmount = parseFloat(parseCurrencyInput(newExpense.amount))
  const isExpenseFormValid = 
    newExpense.description.trim() !== "" &&
    parsedExpenseAmount > 0 &&
    newExpense.category !== "" &&
    newExpense.date !== ""

  const removeExpense = (index: number) => {
    setExecutionExpensesDetails(prev => prev.filter((_, i) => i !== index))
  }

  // Helper function to format expense category names
  const formatCategoryName = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
  
  // Calculate total execution expenses (expenses are optional)
  const totalExecutionExpenses = executionExpensesDetails.length > 0
    ? executionExpensesDetails.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    : 0
  
  // Calculate WHT amount
  const whtAmount = whtDeducted && whtRate > 0 ? (formData.amount * whtRate) / 100 : 0
  
  // Calculate cash received (what actually hits your bank account)
  const cashReceived = formData.amount - whtAmount
  
  // Calculate taxable income (cash received - expenses)
  // Taxable income is what you pay tax on: money you received minus expenses you spent
  const taxableIncome = cashReceived - totalExecutionExpenses
  
  // NGN equivalents
  const taxableIncomeNgnEquivalent = taxableIncome > 0 && ngnEquivalent !== null 
    ? (formData.currency === 'NGN' ? taxableIncome : taxableIncome * (exchangeRate || 1))
    : undefined

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
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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

            {/* Execution Expenses & Net Income */}
            <div className="space-y-4 p-4 border rounded-md bg-muted/30">
              <div>
                <h4 className="text-sm font-semibold mb-1">Execution Expenses</h4>
                <p className="text-xs text-muted-foreground">
                  Track all costs to execute this deal. <strong>Real profit = Brand deal fee − expenses</strong>
                </p>
              </div>
              
              {/* WHT Section */}
              <div className="space-y-3 p-3 bg-background rounded border">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="whtDeducted"
                    checked={whtDeducted}
                    onCheckedChange={(checked) => {
                      setWhtDeducted(checked === true)
                      if (!checked) {
                        setWhtRate(0)
                        setWhtCertificateNumber("")
                      }
                    }}
                  />
                  <Label htmlFor="whtDeducted" className="text-sm font-medium cursor-pointer">
                    Withholding Tax (WHT) was deducted
                  </Label>
                </div>
                {whtDeducted && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                    <div className="space-y-1">
                      <Label htmlFor="whtRate" className="text-xs">WHT Rate (%)</Label>
                      <Input
                        id="whtRate"
                        type="number"
                        placeholder="e.g., 5 or 10"
                        value={whtRate || ""}
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0
                          setWhtRate(rate)
                        }}
                        step="0.1"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="whtCertificate" className="text-xs">WHT Certificate Number (Optional)</Label>
                      <Input
                        id="whtCertificate"
                        placeholder="WHT certificate/reference number"
                        value={whtCertificateNumber}
                        onChange={(e) => setWhtCertificateNumber(e.target.value)}
                      />
                    </div>
                    {whtRate > 0 && formData.amount > 0 && (
                      <div className="md:col-span-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                        <p className="text-muted-foreground">
                          💳 WHT Amount: <strong>{formatCurrencyAmount((formData.amount * whtRate) / 100, formData.currency as CurrencyCode)}</strong>
                        </p>
                        <p className="text-muted-foreground mt-1">
                          Note: WHT is a <strong>tax credit</strong> (reduces cash received but not taxable income). It's tracked separately from expenses.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Financial Summary */}
              {(totalExecutionExpenses > 0 || whtDeducted) && (
                <div className="p-4 bg-background rounded-lg border space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Gross Amount</p>
                      <p className="text-xl font-bold">{formatCurrencyAmount(formData.amount, formData.currency as CurrencyCode)}</p>
                    </div>
                    
                    {whtDeducted && whtRate > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">WHT (Tax Credit)</p>
                        <p className="text-xl font-bold text-blue-600">
                          {formatCurrencyAmount(whtAmount, formData.currency as CurrencyCode)}
                        </p>
                        <p className="text-xs text-muted-foreground">Rate: {whtRate}%</p>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Cash Received</p>
                      <p className="text-xl font-bold text-purple-600">
                        {formatCurrencyAmount(cashReceived, formData.currency as CurrencyCode)}
                      </p>
                      {whtDeducted && whtRate > 0 && (
                        <p className="text-xs text-muted-foreground">Gross − WHT</p>
                      )}
                    </div>
                    
                    {totalExecutionExpenses > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Total Expenses</p>
                        <p className="text-xl font-bold text-orange-600">
                          {formatCurrencyAmount(totalExecutionExpenses, formData.currency as CurrencyCode)}
                        </p>
                      </div>
                    )}
                    
                    <div className="space-y-1 sm:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground">Taxable Income</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrencyAmount(taxableIncome > 0 ? taxableIncome : cashReceived, formData.currency as CurrencyCode)}
                      </p>
                      <p className="text-xs text-muted-foreground">Cash Received − Expenses (this is what you pay tax on)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Expense Form - Expenses are optional, validation only happens when clicking "Add Expense" */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Select
                  value={newExpense.category || ""}
                  onValueChange={(value) => setNewExpense(prev => ({ ...prev, category: value as BrandDealExpenseCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expense category *" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production (Camera, Studio, Lighting, Props)</SelectItem>
                    <SelectItem value="editing">Editing (Video, Color, Sound, Captions)</SelectItem>
                    <SelectItem value="talent">Talent & Collaboration (Videographer, Photographer, Stylist)</SelectItem>
                    <SelectItem value="logistics">Logistics (Transport, Fuel, Accommodation, Meals)</SelectItem>
                    <SelectItem value="wardrobe">Wardrobe & Appearance (Deal-specific clothing, grooming)</SelectItem>
                    <SelectItem value="equipment_depreciation">Equipment Depreciation (Camera, Laptop usage)</SelectItem>
                    <SelectItem value="platform_fees">Platform & Transaction Fees (Payment gateway, exchange losses)</SelectItem>
                    <SelectItem value="professional">Professional Services (Legal, Contracts, Agent commission)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  placeholder="Date *"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input
                  placeholder="Expense description *"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                  className="md:col-span-2"
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground z-10">
                    {getCurrencySymbol(formData.currency)}
                  </span>
                  <Input
                    type="text"
                    placeholder="Amount *"
                    value={expenseAmountDisplay}
                    onChange={(e) => {
                      const result = handleCurrencyInputChange(e.target.value)
                      if (result.isValid) {
                        setExpenseAmountDisplay(result.displayValue)
                        setNewExpense(prev => ({ ...prev, amount: result.rawValue }))
                      }
                    }}
                    className="pl-8"
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={addExpense} 
                  size="sm" 
                  variant="outline"
                  disabled={!isExpenseFormValid}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </div>
              
              {/* Expense Category Guidance */}
              <p className="text-xs text-muted-foreground">
                💡 <strong>Track all deal-related costs:</strong> Production, editing, talent, logistics, wardrobe (if deal-specific), equipment usage, platform fees, and professional services. These reduce your taxable income.
              </p>

              {/* Expenses List */}
              {executionExpensesDetails.length > 0 && (
                <div className="space-y-2">
                  {executionExpensesDetails.map((expense, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background rounded border text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{expense.description}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {expense.category && (
                            <span>• {formatCategoryName(expense.category)}</span>
                          )}
                          {expense.date && <span>• {format(new Date(expense.date), "MMM dd, yyyy")}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatCurrencyAmount(expense.amount, formData.currency as CurrencyCode)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExpense(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
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
              <Select
                value={selectedPlatform}
                onValueChange={(value) => {
                  if (value) {
                    addPlatform(value)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YouTube">YouTube</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Twitter">Twitter/X</SelectItem>
                  <SelectItem value="Patreon">Patreon</SelectItem>
                  <SelectItem value="OnlyFans">OnlyFans</SelectItem>
                  <SelectItem value="Twitch">Twitch</SelectItem>
                  <SelectItem value="Spotify">Spotify</SelectItem>
                  <SelectItem value="Apple Music">Apple Music</SelectItem>
                  <SelectItem value="Amazon">Amazon</SelectItem>
                  <SelectItem value="Etsy">Etsy</SelectItem>
                  <SelectItem value="Shopify">Shopify</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="Snapchat">Snapchat</SelectItem>
                  <SelectItem value="Pinterest">Pinterest</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Substack">Substack</SelectItem>
                  <SelectItem value="Gumroad">Gumroad</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
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
              <Label>Contract Document</Label>
              <Select
                value={contractInputType}
                onValueChange={(value) => {
                  setContractInputType(value as "link" | "file")
                  // Clear the opposite field when switching
                  if (value === "link") {
                    setContractFile(null)
                  } else {
                    setFormData(prev => ({ ...prev, contractUrl: "" }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Link to Contract</SelectItem>
                  <SelectItem value="file">Upload Contract File</SelectItem>
                </SelectContent>
              </Select>
              
              {contractInputType === "link" ? (
                <Input
                  id="contractUrl"
                  type="url"
                  value={formData.contractUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, contractUrl: e.target.value }))}
                  placeholder="Link to contract document"
                />
              ) : (
                <div className="space-y-2">
                  <Input
                    id="contractFile"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setContractFile(file)
                      }
                    }}
                  />
                  {contractFile && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {contractFile.name} ({(contractFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              )}
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
              onClick={() => handleDialogOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploadingContract}>
              {(isSubmitting || uploadingContract) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {uploadingContract ? "Uploading Contract..." : brandDeal ? "Update" : "Create"} Brand Deal
            </Button>
          </div>
        </form>
      </DialogContent>
      
      {/* Close Confirmation Dialog */}
      <Dialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Unsaved Changes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You have unsaved changes in your brand deal. If you close now, all the data you entered will be lost.
            </p>
            <p className="text-sm font-medium">Are you sure you want to close without saving?</p>
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowCloseConfirmation(false)}
              >
                Continue Editing
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmClose}
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

