"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Loader2, Info, X, Search } from "lucide-react"
import { Invoice, InvoiceItem, InvoiceClient, InvoiceSupplier, InvoiceTemplateType, InvoiceType } from "@/lib/types"
import { invoiceService, userService } from "@/lib/services"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { INVOICE_TEMPLATES, getDefaultTemplate } from "@/lib/utils/invoiceTemplates"
import { formatDateForInput } from "@/lib/utils/date"
import { SUPPORTED_CURRENCIES, CurrencyCode, getCurrencySymbol, formatCurrencyInput, parseCurrencyInput, formatCurrencyAmount, fetchExchangeRate, convertCurrency } from "@/lib/utils/currency"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useBusiness } from "@/lib/contexts/business-context"
import { canChargeVAT, getVATEligibility } from "@/lib/utils/vatEligibility"

interface AddInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  invoice?: Invoice | null
}

export function AddInvoiceDialog({
  open,
  onOpenChange,
  onSuccess,
  invoice
}: AddInvoiceDialogProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { hasAccess } = useSubscription()
  const { activeEntityId } = useBusiness()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [isSearchingUser, setIsSearchingUser] = useState(false)
  const [userSearchMessage, setUserSearchMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  // Store unitPriceDisplay for each item (formatted string)
  const [itemDisplayValues, setItemDisplayValues] = useState<Record<string, string>>({})
  // Store currency for each item (defaults to invoice currency)
  const [itemCurrencies, setItemCurrencies] = useState<Record<string, CurrencyCode>>({})
  // Store converted amounts in base currency (NGN) for each item
  const [itemConvertedAmounts, setItemConvertedAmounts] = useState<Record<string, number>>({})

  const [isSendingToUser, setIsSendingToUser] = useState(false)
  
  // Track if any Select dropdown is open to prevent dialog from closing on mobile
  const [isAnySelectOpen, setIsAnySelectOpen] = useState(false)
  const selectOpenTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // New invoice fields for creators (optional)
  const [showCreatorFields, setShowCreatorFields] = useState(false)
  const [platformName, setPlatformName] = useState("")
  const [platformType, setPlatformType] = useState<'social' | 'subscription' | 'marketplace' | 'streaming' | 'other'>('other')
  const [platformAccountId, setPlatformAccountId] = useState("")
  const [platformAccountUrl, setPlatformAccountUrl] = useState("")
  const [transactionNature, setTransactionNature] = useState<'business' | 'personal' | 'mixed' | undefined>(undefined)
  const [businessPercentage, setBusinessPercentage] = useState<number | undefined>(undefined)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  
  // Item-level platform fees (for creator mode)
  const [itemGrossAmounts, setItemGrossAmounts] = useState<Record<string, number | undefined>>({})
  const [itemPlatformFees, setItemPlatformFees] = useState<Record<string, number | undefined>>({})
  const [itemPlatformFeesDisplay, setItemPlatformFeesDisplay] = useState<Record<string, string>>({})
  
  // Store discount display value to allow decimal input while typing (e.g., "10." before "10.5")
  const [discountDisplayValue, setDiscountDisplayValue] = useState("")
  
  // Initialize supplier info from user profile
  const getInitialSupplier = useCallback((): InvoiceSupplier => {
    if (!profile) {
      return {
        name: user?.displayName || user?.email?.split('@')[0] || "",
        email: user?.email || "",
        phone: "",
        address: {
          street: "",
          city: "",
          state: "",
          country: "Nigeria",
          postalCode: ""
        },
        taxId: ""
      }
    }
    return {
      businessName: profile.businessType !== 'freelancer' ? `${profile.firstName} ${profile.lastName}` : undefined,
      name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user?.email?.split('@')[0] || "",
      email: profile.email || user?.email || "",
      phone: profile.phone || "",
      address: {
        street: profile.address?.street || "",
        city: profile.address?.city || "",
        state: profile.address?.state || "",
        country: profile.address?.country || "Nigeria",
        postalCode: profile.address?.postalCode || ""
      },
      taxId: profile.taxId || "",
      vatRegistrationNumber: "" // Will be added to profile later if needed
    }
  }, [profile, user])

  // Find user by email and prefill client details
  const handleFindUserByEmail = async (email: string) => {
    if (!email || !email.includes('@')) {
      setUserSearchMessage({ type: 'error', text: "Please enter a valid email address" })
      return
    }

    setIsSearchingUser(true)
    setUserSearchMessage(null) // Clear previous message
    try {
      const foundUser = await userService.findUserByEmail(email.trim())
      
      if (foundUser) {
        // Prefill ONLY client information section with found user's profile
        // Do not modify recipientEmail - keep what user typed
        setFormData(prev => ({
          ...prev,
          // Only update client information, nothing else
          client: {
            id: foundUser.userId,
            name: `${foundUser.firstName || ''} ${foundUser.lastName || ''}`.trim() || foundUser.email,
            email: foundUser.email,
            phone: foundUser.phone || "",
            address: foundUser.address ? {
              street: foundUser.address.street || "",
              city: foundUser.address.city || "",
              state: foundUser.address.state || "",
              country: foundUser.address.country || "Nigeria",
              postalCode: foundUser.address.postalCode || ""
            } : undefined,
            taxId: foundUser.taxId || "",
            businessName: foundUser.businessType !== 'freelancer' 
              ? `${foundUser.firstName} ${foundUser.lastName}` 
              : undefined
          }
          // recipientEmail remains unchanged - user's input is preserved
        }))
        setUserSearchMessage({ type: 'success', text: "User found! Client information has been prefilled." })
      } else {
        setUserSearchMessage({ type: 'error', text: "User not found. This email is not registered on OTax." })
      }
    } catch (error) {
      console.error('Error finding user:', error)
      setUserSearchMessage({ type: 'error', text: "Failed to search for user. Please try again." })
    } finally {
      setIsSearchingUser(false)
    }
  }

  // Handle email input blur (when clicking autocomplete suggestion)
  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.preventDefault()
    const email = e.target.value.trim()
    if (email && email.includes('@') && formData.sendToOtaxUser && !isSearchingUser) {
      // Small delay to allow autocomplete value to be set and avoid duplicate searches
      setTimeout(() => {
        const currentEmail = e.target.value.trim()
        if (currentEmail && currentEmail.includes('@')) {
          // Only search if email changed or is different from current state
          const currentStateEmail = formData.recipientEmail?.trim()
          if (currentEmail !== currentStateEmail) {
            handleFindUserByEmail(currentEmail)
          }
        }
      }, 150)
    }
  }
  
  const [formData, setFormData] = useState({
    invoiceType: 'outgoing' as InvoiceType,
    template: getDefaultTemplate().type as InvoiceTemplateType,
    supplier: getInitialSupplier(),
    sendToOtaxUser: false,
    recipientEmail: "",
    sendViaEmail: false,
    client: {
      name: "",
      email: "",
      phone: "",
      address: {
        street: "",
        city: "",
        state: "",
        country: "Nigeria",
        postalCode: ""
      },
      taxId: "",
      businessName: ""
    } as InvoiceClient,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    currency: 'NGN' as CurrencyCode,
    items: [
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        vatable: false,
        amount: 0
      }
    ] as InvoiceItem[],
    discount: 0,
    // VAT fields
    vatRate: 7.5, // Default 7.5% for Nigeria
    // Note: WHT is deducted by the client/buyer, not set by the issuer
    notes: "",
    terms: "",
    paymentInstructions: ""
  })

  // Update supplier when profile loads
  useEffect(() => {
    if (profile && !invoice) {
      setFormData(prev => ({
        ...prev,
        supplier: getInitialSupplier()
      }))
    }
  }, [profile])

  useEffect(() => {
    if (invoice) {
      const items = invoice.items
      const displayValues: Record<string, string> = {}
      const currencies: Record<string, CurrencyCode> = {}
      const convertedAmounts: Record<string, number> = {}
      items.forEach(item => {
        displayValues[item.id] = formatCurrencyInput(item.unitPrice.toString())
        // Initialize currency to invoice currency (items don't have currency field yet)
        currencies[item.id] = invoice.currency as CurrencyCode
        convertedAmounts[item.id] = item.unitPrice
      })
      setItemDisplayValues(displayValues)
      setItemCurrencies(currencies)
      setItemConvertedAmounts(convertedAmounts)
      // For users who cannot charge VAT (e.g., freelancers/creators below ₦100M threshold or not VAT-registered),
      // ensure vatable is false for all items. Users who qualify can charge VAT - see canChargeVAT().
      const userCanChargeVAT = canChargeVAT(profile)
      const itemsWithVATEligibility = !userCanChargeVAT
        ? items.map(item => ({ ...item, vatable: false }))
        : items
      
      setFormData({
        invoiceType: invoice.invoiceType || 'outgoing',
        template: invoice.template,
        supplier: invoice.supplier || getInitialSupplier(),
        client: invoice.client,
        issueDate: invoice.issueDate.split('T')[0],
        dueDate: invoice.dueDate.split('T')[0],
        currency: invoice.currency as CurrencyCode,
        items: itemsWithVATEligibility,
        discount: invoice.discount || 0,
        vatRate: invoice.vatRate || 7.5,
        // Note: WHT fields are not editable by issuer - they are set by client when deducting
        notes: invoice.notes || "",
        terms: invoice.terms || "",
        paymentInstructions: invoice.paymentInstructions || "",
        sendToOtaxUser: !!invoice.recipientUserId,
        recipientEmail: invoice.recipientEmail || "",
        sendViaEmail: false // Default to false, user can enable if needed
      })
      
      // Initialize new invoice fields
      if (invoice.platform) {
        setShowCreatorFields(true)
        setPlatformName(invoice.platform.name || "")
        setPlatformType(invoice.platform.platformType || 'other')
        setPlatformAccountId(invoice.platform.accountId || "")
        setPlatformAccountUrl(invoice.platform.accountUrl || "")
      }
      setTransactionNature(invoice.transactionNature)
      setBusinessPercentage(invoice.businessPercentage)
      setTags(invoice.tags || [])
      setPaymentMethod(invoice.paymentMethod || "")
      
      // Initialize item-level platform fees
      const grossAmounts: Record<string, number | undefined> = {}
      const platformFees: Record<string, number | undefined> = {}
      const platformFeesDisplay: Record<string, string> = {}
      items.forEach(item => {
        grossAmounts[item.id] = item.grossAmount
        platformFees[item.id] = item.platformFees
        platformFeesDisplay[item.id] = item.platformFees ? formatCurrencyInput(item.platformFees.toString()) : ""
      })
      setItemGrossAmounts(grossAmounts)
      setItemPlatformFees(platformFees)
      setItemPlatformFeesDisplay(platformFeesDisplay)
      
      // Initialize discount display value (preserves decimals from existing invoice)
      setDiscountDisplayValue((invoice.discount ?? 0).toString())
    } else {
      // Reset form
      const newItemId = crypto.randomUUID()
      setItemDisplayValues({ [newItemId]: "" })
      setItemCurrencies({ [newItemId]: 'NGN' as CurrencyCode })
      setItemConvertedAmounts({ [newItemId]: 0 })
      setFormData({
        invoiceType: 'outgoing' as InvoiceType,
        template: getDefaultTemplate().type as InvoiceTemplateType,
        supplier: getInitialSupplier(),
        client: {
          name: "",
          email: "",
          phone: "",
          address: {
            street: "",
            city: "",
            state: "",
            country: "Nigeria",
            postalCode: ""
          },
          taxId: ""
        },
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currency: 'NGN' as CurrencyCode,
        items: [{
          id: newItemId,
          description: "",
          quantity: 1,
          unitPrice: 0,
          vatable: false,
          amount: 0
        }],
        discount: 0,
        // VAT fields
        vatRate: 7.5, // Default 7.5% for Nigeria
        // Note: WHT is deducted by the client/buyer, not set by the issuer
        notes: "",
        terms: "",
        paymentInstructions: "",
        sendToOtaxUser: false,
        recipientEmail: "",
        sendViaEmail: false
      })
      
      // Reset new invoice fields
      setShowCreatorFields(false)
      setPlatformName("")
      setPlatformType('other')
      setPlatformAccountId("")
      setPlatformAccountUrl("")
      setTransactionNature(undefined)
      setBusinessPercentage(undefined)
      setTags([])
      setTagInput("")
      setPaymentMethod("")
      setItemGrossAmounts({})
      setItemPlatformFees({})
      setItemPlatformFeesDisplay({})
      
      // Reset discount display value
      setDiscountDisplayValue("")
    }
  }, [invoice, open])

  // Calculate gross amount (Quantity × Unit Price) - always fixed
  const calculateGrossAmount = (item: InvoiceItem): number => {
    if (item.unitPrice === 0) {
      return 0
    }
    
    const itemCurrency = itemCurrencies[item.id] || formData.currency
    const basePrice = itemCurrency !== formData.currency 
      ? (itemConvertedAmounts[item.id] || item.unitPrice)
      : item.unitPrice
    return item.quantity * basePrice
  }

  const calculateItemAmount = (item: InvoiceItem): number => {
    // If unit price is 0, amount should always be 0
    if (item.unitPrice === 0) {
      return 0
    }
    
    // Calculate gross amount first
    const grossAmount = calculateGrossAmount(item)
    
    // For creator items with platform fees, return net amount (gross - fees)
    if (profile?.businessType === 'creator' && formData.invoiceType === 'outgoing') {
      const platformFees = itemPlatformFees[item.id]
      if (platformFees) {
        return grossAmount - platformFees
      }
    }
    
    // Otherwise return gross amount
    return grossAmount
  }

  // Handle currency conversion for item unit price
  const handleItemCurrencyConversion = async (itemId: string, amount: number, fromCurrency: CurrencyCode) => {
    if (fromCurrency === formData.currency) {
      // Same currency, no conversion needed
      setItemConvertedAmounts(prev => ({
        ...prev,
        [itemId]: amount
      }))
      // Recalculate amount after setting converted amount
      const item = formData.items.find(i => i.id === itemId)
      if (item) {
        updateItem(itemId, {})
      }
      return
    }

    try {
      const converted = await convertCurrency(amount, fromCurrency, formData.currency)
      setItemConvertedAmounts(prev => ({
        ...prev,
        [itemId]: converted
      }))
      // Recalculate amount after conversion completes
      const item = formData.items.find(i => i.id === itemId)
      if (item) {
        updateItem(itemId, {})
      }
    } catch (error) {
      console.error('Error converting currency for item:', error)
      // Fallback: use amount as-is
      setItemConvertedAmounts(prev => ({
        ...prev,
        [itemId]: amount
      }))
      // Recalculate amount even on error
      const item = formData.items.find(i => i.id === itemId)
      if (item) {
        updateItem(itemId, {})
      }
    }
  }

  const updateItem = (itemId: string, updates: Partial<InvoiceItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, ...updates }
          
          // For users who cannot charge VAT (below ₦100M threshold or not VAT-registered),
          // keep vatable as false. Qualified users can set vatable per item.
          if (!canChargeVAT(profile)) {
            updated.vatable = false
          }
          
          // Always calculate gross amount (Quantity × Unit Price)
          const grossAmount = calculateGrossAmount(updated)
          
          // For creators, store gross amount and calculate net amount
          if (profile?.businessType === 'creator' && formData.invoiceType === 'outgoing') {
            setItemGrossAmounts(prev => ({ ...prev, [itemId]: grossAmount }))
            updated.grossAmount = grossAmount
            
            // Calculate net amount if platform fees exist
            const platformFees = itemPlatformFees[itemId]
            if (platformFees) {
              updated.netAmount = grossAmount - platformFees
            } else {
              updated.netAmount = undefined
            }
          }
          
          // Amount field shows net amount (if fees exist) or gross amount
          updated.amount = calculateItemAmount(updated)
          
          return updated
        }
        return item
      })
    }))
  }

  const handleUnitPriceChange = async (itemId: string, value: string) => {
    // Parse the currency input
    const parsed = parseCurrencyInput(value)
    const numericValue = parseFloat(parsed) || 0
    
    // Update the display value (formatted)
    setItemDisplayValues(prev => ({
      ...prev,
      [itemId]: formatCurrencyInput(value)
    }))
    
    // Get item currency (default to invoice currency)
    const itemCurrency = itemCurrencies[itemId] || formData.currency
    
    // If unit price is 0, clear converted amount and update
    if (numericValue === 0) {
      setItemConvertedAmounts(prev => ({
        ...prev,
        [itemId]: 0
      }))
      updateItem(itemId, { unitPrice: 0 })
      return
    }
    
    // Update the actual unitPrice first
    updateItem(itemId, { unitPrice: numericValue })
    
    // Convert currency if needed (only if value > 0)
    if (numericValue > 0 && itemCurrency !== formData.currency) {
      // Conversion will trigger recalculation in handleItemCurrencyConversion
      await handleItemCurrencyConversion(itemId, numericValue, itemCurrency)
    } else if (itemCurrency === formData.currency && numericValue > 0) {
      // Same currency, set converted amount to unitPrice and recalculate
      setItemConvertedAmounts(prev => ({
        ...prev,
        [itemId]: numericValue
      }))
      // Recalculate amount after setting converted amount
      updateItem(itemId, {})
    }
  }

  // Handle item currency change
  const handleItemCurrencyChange = async (itemId: string, newCurrency: CurrencyCode) => {
    setItemCurrencies(prev => ({
      ...prev,
      [itemId]: newCurrency
    }))
    
    // Get current unit price
    const item = formData.items.find(i => i.id === itemId)
    if (item && item.unitPrice > 0) {
      // Conversion will trigger recalculation in handleItemCurrencyConversion
      await handleItemCurrencyConversion(itemId, item.unitPrice, newCurrency)
    } else if (item && item.unitPrice === 0) {
      // Clear converted amount if unit price is 0
      setItemConvertedAmounts(prev => ({
        ...prev,
        [itemId]: 0
      }))
      updateItem(itemId, {})
    }
  }

  const addItem = () => {
    const newItemId = crypto.randomUUID()
    setItemDisplayValues(prev => ({
      ...prev,
      [newItemId]: ""
    }))
    // Initialize item currency to invoice currency
    setItemCurrencies(prev => ({
      ...prev,
      [newItemId]: formData.currency
    }))
    setItemConvertedAmounts(prev => ({
      ...prev,
      [newItemId]: 0
    }))
    // Initialize platform fees state for new item
    setItemGrossAmounts(prev => ({ ...prev, [newItemId]: undefined }))
    setItemPlatformFees(prev => ({ ...prev, [newItemId]: undefined }))
    setItemPlatformFeesDisplay(prev => ({ ...prev, [newItemId]: "" }))
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: newItemId,
          description: "",
          quantity: 1,
          unitPrice: 0,
          vatable: false,
          amount: 0
        }
      ]
    }))
  }

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
    // Clean up item-related state
    setItemDisplayValues(prev => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
    setItemCurrencies(prev => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
    setItemConvertedAmounts(prev => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
    setItemGrossAmounts(prev => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
    setItemPlatformFees(prev => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
    setItemPlatformFeesDisplay(prev => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
  }

  const calculateTotals = () => {
    // Calculate subtotal and vatable subtotal
    // Use calculateItemAmount to get net amount (after platform fees) for creators
    let subtotal = 0
    let vatableSubtotal = 0
    
    formData.items.forEach(item => {
      // If unit price is 0 or description is empty, skip this item
      if (item.unitPrice === 0 || !item.description.trim()) return
      
      // Use calculateItemAmount which returns net amount (gross - platform fees) for creators
      // or gross amount (quantity × unit price) for non-creators
      const itemAmount = calculateItemAmount(item)
      subtotal += itemAmount
      
      // Only include in vatable subtotal if item is marked as vatable
      if (item.vatable) {
        vatableSubtotal += itemAmount
      }
    })
    
    // Apply discount to subtotal (if any)
    const discountAmount = formData.discount ? subtotal * (formData.discount / 100) : 0
    const subtotalAfterDiscount = subtotal - discountAmount
    
    // Apply discount proportionally to vatable subtotal
    const vatableDiscountAmount = vatableSubtotal > 0 && subtotal > 0 
      ? (vatableSubtotal / subtotal) * discountAmount 
      : 0
    const vatableSubtotalAfterDiscount = vatableSubtotal - vatableDiscountAmount
    
    // Calculate VAT (7.5% default in Nigeria) only on vatable items after discount
    const vatRate = formData.vatRate || 7.5
    const vatAmount = vatableSubtotalAfterDiscount * (vatRate / 100)
    
    // Invoice Total = Subtotal (after discount) + VAT (on vatable items only)
    const invoiceTotal = subtotalAfterDiscount + vatAmount
    
    // Note: WHT is deducted by the client/buyer, not calculated here
    // Final Total = Invoice Total (WHT will be deducted by client if applicable)
    const total = invoiceTotal
    
    return { 
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      taxAmount: Math.round(vatAmount * 100) / 100, // Legacy field
      invoiceTotal: Math.round(invoiceTotal * 100) / 100,
      whtAmount: 0, // WHT is not calculated by issuer - will be set by client
      total: Math.round(total * 100) / 100
    }
  }

  const totals = calculateTotals()

  const handleSubmit = async () => {
    // Check subscription before submitting (only for new invoices, not edits)
    if (!invoice && !hasAccess()) {
      setShowSubscriptionModal(true)
      return
    }
    if (!user?.uid) {
      toast.error("User not authenticated")
      return
    }
  
    // Validation
    if (!formData.supplier?.name?.trim()) {
      toast.error("Please enter your business/contact name")
      return
    }
  
    if (!formData.supplier?.email?.trim()) {
      toast.error("Please enter your email")
      return
    }
  
    if (!formData.client.name.trim()) {
      toast.error("Please enter client name")
      return
    }
  
    // Filter out invalid items (empty description or zero unit price)
    const validItems = formData.items.filter(item => item.description.trim() && item.unitPrice > 0)
    
    if (validItems.length === 0) {
      toast.error("Please add at least one valid item with description and unit price")
      return
    }
  
    // Prevent duplicate submissions
    if (isSubmitting || isSendingToUser) {
      return
    }
  
    setIsSubmitting(true)
    try {
      // Helper function to remove undefined values from objects
      const removeUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) return obj
        if (Array.isArray(obj)) return obj.map(removeUndefined)
        if (typeof obj !== 'object') return obj
        
        const cleaned: any = {}
        for (const key in obj) {
          if (obj[key] !== undefined) {
            cleaned[key] = removeUndefined(obj[key])
          }
        }
        return cleaned
      }
  
      // Clean client and supplier objects
      const cleanedClient = removeUndefined(formData.client)
      const cleanedSupplier = removeUndefined(
        formData.invoiceType === 'outgoing' ? (formData.supplier || getInitialSupplier()) : getInitialSupplier()
      )
  
      // Filter out invalid items (empty description or zero unit price) before submitting
      const validItemsForSubmission = formData.items.filter(item => item.description.trim() && item.unitPrice > 0)
      
      // Use valid items only (amounts are already calculated during input via updateItem)
      // Just ensure currency is saved if different from invoice currency
      // Include item-level platform fees for creators
      const itemsWithCalculatedAmounts = validItemsForSubmission.map(item => {
        const itemCurrency = itemCurrencies[item.id] || formData.currency
        return {
          ...item,
          currency: itemCurrency !== formData.currency ? itemCurrency : undefined,
          // Include platform fees if available
          grossAmount: itemGrossAmounts[item.id],
          platformFees: itemPlatformFees[item.id],
          netAmount: itemGrossAmounts[item.id] && itemPlatformFees[item.id] 
            ? (itemGrossAmounts[item.id] || 0) - (itemPlatformFees[item.id] || 0)
            : undefined
        }
      })
  
      const invoiceData = {
        entityId: activeEntityId || undefined,
        invoiceType: formData.invoiceType,
        template: formData.template,
        supplier: cleanedSupplier,
        client: cleanedClient,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        currency: formData.currency,
        items: itemsWithCalculatedAmounts,
        discount: formData.discount || undefined,
        notes: formData.notes || undefined,
        terms: formData.terms || undefined,
        paymentInstructions: formData.paymentInstructions || undefined,
        status: 'draft' as const,
        subtotal: totals.subtotal,
        vatRate: formData.vatRate || 7.5,
        vatAmount: totals.vatAmount,
        taxAmount: totals.taxAmount, // Legacy field
        invoiceTotal: totals.invoiceTotal,
        // Note: WHT fields are not set by issuer - they are set by client when deducting
        total: totals.total,
        // New invoice fields for creators (optional)
        platform: (showCreatorFields && (platformName || platformAccountId || platformAccountUrl)) ? {
          name: platformName,
          platformType: platformType,
          accountId: platformAccountId || undefined,
          accountUrl: platformAccountUrl || undefined
        } : undefined,
        transactionNature: showCreatorFields ? transactionNature : undefined,
        businessPercentage: showCreatorFields ? businessPercentage : undefined,
        tags: tags.length > 0 ? tags : undefined,
        paymentMethod: paymentMethod || undefined
      }
      
      console.log('Invoice data:', invoiceData)
  
      // Remove undefined top-level fields
      const cleanedInvoiceData = removeUndefined(invoiceData)

      console.log('Cleaned invoice data:', cleanedInvoiceData)
  
      let result
      if (invoice) {
         result = await invoiceService.updateInvoice(invoice.id, user.uid, cleanedInvoiceData)
        console.log('Updating invoice:', invoice)
      } else {
         result = await invoiceService.createInvoice(user.uid, cleanedInvoiceData)
        console.log('Creating invoice:', cleanedInvoiceData)
      }
  
      if (result.success) {
        toast.success(invoice ? "Invoice updated successfully" : "Invoice created successfully")
        
        //If sending to OTax user, send the invoice
        if (formData.sendToOtaxUser && formData.recipientEmail && result.data) {
          setIsSendingToUser(true) // Prevent duplicate sends
          try {
            const sendResult = await invoiceService.sendInvoiceToUser(
              result.data.id,
              user.uid,
              formData.recipientEmail
            )
            
            if (sendResult.success) {
              toast.success(`Invoice sent to ${formData.recipientEmail}`)
            } else {
              toast.error(sendResult.error || "Failed to send invoice")
            }
          } catch (error) {
            console.error('Error sending invoice:', error)
            toast.error("Failed to send invoice")
          } finally {
            setIsSendingToUser(false)
          }
        }
        
        // If sending via email, send the invoice email
        if (formData.sendViaEmail && formData.client.email && result.data) {
          try {
            const authToken = await user.getIdToken()
            const emailResponse = await fetch('/api/invoices/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({
                invoiceId: result.data.id,
                recipientEmail: formData.client.email.trim(),
                senderUserId: user.uid
              })
            })

            const emailData = await emailResponse.json()

            if (emailResponse.ok && emailData.success) {
              toast.success(`Invoice email sent successfully to ${formData.client.email.trim()}`)
            } else {
              toast.error(emailData.error || "Failed to send invoice email")
            }
          } catch (error) {
            console.error('Error sending invoice email:', error)
            toast.error("Failed to send invoice email")
          }
        }
        
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || "Failed to save invoice")
      }
    } catch (error) {
      console.error("Error saving invoice:", error)
      toast.error("Failed to save invoice")
    } finally {
      setIsSubmitting(false)
    }
  }
  

  // Prevent form submission on Enter key for all inputs
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement
      // Don't prevent if it's a submit button or textarea (allow Enter in textarea)
      if (target.type === 'submit' || target.tagName === 'TEXTAREA') {
        return
      }
      // Prevent form submission for all other inputs
      e.preventDefault()
      e.stopPropagation()
    }
  }

  // Prevent form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // Monitor for Select dropdowns opening/closing to prevent dialog from closing on mobile
  useEffect(() => {
    if (!open) {
      setIsAnySelectOpen(false)
      if (selectOpenTimeoutRef.current) {
        clearTimeout(selectOpenTimeoutRef.current)
      }
      return
    }

    const checkSelectState = () => {
      const openSelect = document.querySelector('[data-radix-select-content][data-state="open"]')
      const isOpen = !!openSelect
      setIsAnySelectOpen(isOpen)
    }

    checkSelectState()

    const observer = new MutationObserver((mutations) => {
      const hasSelectMutation = mutations.some(mutation => {
        const target = mutation.target as HTMLElement
        return target.hasAttribute?.('data-radix-select-content') ||
               target.closest?.('[data-radix-select-content]') !== null ||
               mutation.attributeName === 'data-state'
      })
      
      if (hasSelectMutation) {
        checkSelectState()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state']
    })

    const interval = setInterval(checkSelectState, 200)

    return () => {
      clearInterval(interval)
      observer.disconnect()
      if (selectOpenTimeoutRef.current) {
        clearTimeout(selectOpenTimeoutRef.current)
      }
    }
  }, [open])

  // Handle escape key
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onOpenChange])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      const target = e.target as HTMLElement
      const isSelectContent = target.closest('[data-radix-select-content]') !== null
      const openSelectContent = document.querySelector('[data-radix-select-content][data-state="open"]')
      const selectViewport = document.querySelector('[data-radix-select-viewport]')
      const selectContent = document.querySelector('[data-radix-select-content]')
      
      const shouldPrevent = isSelectContent || 
                            isAnySelectOpen || 
                            openSelectContent || 
                            (selectContent && selectViewport)
      
      if (!shouldPrevent) {
        onOpenChange(false)
      }
    }
  }

  if (!open) return null

  // Render modal content using portal
  const modalContent = (
    <>
      {/* Custom Modal Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 dark:bg-black/50 animate-in fade-in-0"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Custom Modal Content */}
      <div className="fixed left-[50%] top-[50%] z-50 w-[calc(100vw-2rem)] sm:w-full max-w-5xl max-h-[90vh] sm:max-h-[95vh] translate-x-[-50%] translate-y-[-50%] border bg-background rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%] duration-200">
        <div className="flex flex-col h-full max-h-[90vh] sm:max-h-[95vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 pb-2 sm:pb-4 border-b">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold leading-none tracking-tight">
              {invoice ? "Edit Invoice" : "Create New Invoice"}
            </h2>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 hide-scrollbar">

        <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-5 md:space-y-6 max-w-full overflow-x-hidden">
          {/* Send to OTax User Option */}
          {formData.invoiceType === 'outgoing' && (
            <div className="space-y-2 p-3 sm:p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="send-to-otax-user"
                  checked={formData.sendToOtaxUser || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendToOtaxUser: !!checked }))}
                />
                <Label htmlFor="send-to-otax-user" className="font-medium cursor-pointer text-xs sm:text-sm">
                  Send to OTax User
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6 sm:ml-7">
                If the recipient is an OTax user, they will receive this invoice in their account
              </p>
              {formData.sendToOtaxUser && (
                <div
                  className="mt-3 space-y-2"
                >
                  <Label htmlFor="recipient-email">Recipient Email (OTax User)</Label>
                  <div className="relative">
                    <Input
                      id="recipient-email"
                      type="email"
                      value={formData.recipientEmail || ""}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, recipientEmail: e.target.value }))
                        // Clear message when user starts typing
                        if (userSearchMessage) {
                          setUserSearchMessage(null)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.stopPropagation()
                          handleFindUserByEmail(formData.recipientEmail || "")
                        }
                      }}
                      onBlur={handleEmailBlur}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="user@example.com"
                      disabled={isSearchingUser}
                      autoComplete="email"
                      className="h-9 sm:h-10 text-xs sm:text-sm pr-10"
                    />
                    {isSearchingUser ? (
                      <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleFindUserByEmail(formData.recipientEmail || "")
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Find user by email"
                        title="Find user"
                        disabled={!formData.recipientEmail}
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {userSearchMessage && (
                    <div className={`flex items-center gap-2 p-2 rounded-md text-[11px] sm:text-sm ${
                      userSearchMessage.type === 'success' 
                        ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-100' 
                        : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
                    }`}>
                      <Info className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${
                        userSearchMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`} />
                      <p className="flex-1 min-w-0 truncate whitespace-nowrap">{userSearchMessage.text}</p>
                      <button
                        type="button"
                        onClick={() => setUserSearchMessage(null)}
                        className="flex-shrink-0 hover:opacity-70 transition-opacity"
                        aria-label="Dismiss message"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  )}
                  {!userSearchMessage && (
                    <p className="text-xs text-muted-foreground">
                      Enter the email address and press Enter (desktop) or tap the search icon (mobile) to prefill client details.
                    </p>
                  )}
                </div>
              )}

              {/* Send via Email Option */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="send-via-email"
                    checked={formData.sendViaEmail || false}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendViaEmail: !!checked }))}
                  />
                  <Label htmlFor="send-via-email" className="font-medium cursor-pointer text-xs sm:text-sm">
                    Send via Email
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6 sm:ml-7">
                  Send invoice to client via email using the client email address. They will receive a PDF attachment and can create an OTax account to view it online.
                </p>
              </div>
            </div>
          )}

          {/* Currency Selection */}
          {/* <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value as CurrencyCode }))}
            >
              <SelectTrigger id="currency">
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
          </div> */}

          {/* Supplier/Business Information - Only show for outgoing invoices */}
          {formData.invoiceType === 'outgoing' && (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Your Business Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                  <Label htmlFor="supplier-name" className="text-xs sm:text-sm">Business/Contact Name *</Label>
                <Input
                  id="supplier-name"
                  value={formData.supplier?.name || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), name: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Your business or name"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="supplier-business-name" className="text-xs sm:text-sm">Business Name (Optional)</Label>
                <Input
                  id="supplier-business-name"
                  value={formData.supplier?.businessName || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), businessName: e.target.value || undefined } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Registered business name"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                  <Label htmlFor="supplier-email" className="text-xs sm:text-sm">Email *</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={formData.supplier?.email || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), email: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="your@email.com"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="supplier-phone" className="text-xs sm:text-sm">Phone</Label>
                <Input
                  id="supplier-phone"
                  value={formData.supplier?.phone || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), phone: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="+234 800 000 0000"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-address" className="text-xs sm:text-sm">Address</Label>
              <Input
                id="supplier-address"
                value={formData.supplier?.address?.street || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), address: { ...(prev.supplier?.address || {}), street: e.target.value } } }))}
                onKeyDown={handleInputKeyDown}
                onClick={(e) => e.stopPropagation()}
                placeholder="Street address"
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-city" className="text-xs sm:text-sm">City</Label>
                  <Input
                  id="supplier-city"
                  value={formData.supplier?.address?.city || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), address: { ...(prev.supplier?.address || {}), city: e.target.value } } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="City"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-state">State</Label>
                  <Input
                  id="supplier-state"
                  value={formData.supplier?.address?.state || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), address: { ...(prev.supplier?.address || {}), state: e.target.value } } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="State"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-postal">Postal Code</Label>
                  <Input
                  id="supplier-postal"
                  value={formData.supplier?.address?.postalCode || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), address: { ...(prev.supplier?.address || {}), postalCode: e.target.value } } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Postal code"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-tin">Tax Identification Number (TIN)</Label>
                <Input
                  id="supplier-tin"
                  value={formData.supplier?.taxId || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), taxId: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Your TIN"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-vat">VAT Registration Number</Label>
                <Input
                  id="supplier-vat"
                  value={formData.supplier?.vatRegistrationNumber || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), vatRegistrationNumber: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="VAT Reg Number (if VAT-registered)"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
                <p className="text-xs text-muted-foreground">Required if your business is VAT-registered</p>
              </div>
            </div>
          </div>
          )}

          {/* Client Information */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Client Information</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              The client who will receive this invoice
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-name" className="text-xs sm:text-sm">Client Name *</Label>
                <Input
                  id="client-name"
                  value={formData.client.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, name: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Enter client name"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-business-name" className="text-xs sm:text-sm">Business Name (Optional)</Label>
                <Input
                  id="client-business-name"
                  value={formData.client.businessName || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, businessName: e.target.value || undefined } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Client's business name"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-email" className="text-xs sm:text-sm">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={formData.client.email || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, email: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="client@example.com"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone" className="text-xs sm:text-sm">Phone</Label>
                <Input
                  id="client-phone"
                  value={formData.client.phone || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, phone: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="+234 800 000 0000"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-tax-id" className="text-xs sm:text-sm">Tax ID</Label>
                <Input
                  id="client-tax-id"
                  value={formData.client.taxId || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, taxId: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Optional"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Invoice Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue-date" className="text-xs sm:text-sm">Issue Date</Label>
              <Input
                id="issue-date"
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                onKeyDown={handleInputKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date" className="text-xs sm:text-sm">Due Date</Label>
              <Input
                id="due-date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                onKeyDown={handleInputKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Invoice Items */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Items</h3>
            
            {/* Note about VAT - different message based on user's VAT eligibility */}
            {canChargeVAT(profile) ? (
              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                  <strong>Note:</strong> Mark items as "Vatable" if they are subject to VAT. VAT (7.5%) will be calculated at invoice level and added to the subtotal. VAT is collected on behalf of government—remember to remit to FIRS.
                </AlertDescription>
              </Alert>
            ) : (profile?.businessType === 'freelancer' || profile?.businessType === 'creator') && (
              <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-xs sm:text-sm text-amber-900 dark:text-amber-100">
                  <strong>VAT Qualification:</strong> {getVATEligibility(profile).reason} Go to Settings → VAT &amp; Turnover to update your annual turnover and VAT registration if you qualify (₦100M+ turnover + FIRS VAT registration).
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-3 sm:space-y-4">
              {formData.items.map((item, index) => (
                <div key={item.id} className="space-y-3 p-3 sm:p-4 border rounded-lg">
                  {/* Row 1: Description and Quantity */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-1">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs sm:text-sm">Description</Label>
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        onKeyDown={handleInputKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Item description"
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="space-y-2 w-full sm:w-20 flex-shrink-0">
                      <Label className="text-xs sm:text-sm">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                        onKeyDown={handleInputKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-9 sm:h-10 text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm"
                      />
                    </div>
                  </div>

                  {/* Row 2: Unit Price, Vatable, and Amount */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                    <div className="flex-1 space-y-2 min-w-0">
                       <div className="flex items-center justify-between gap-2">
                         <Label className="text-xs sm:text-sm">Unit Price</Label>
                         {(() => {
                           const itemCurrency = itemCurrencies[item.id] || formData.currency
                           const needsConversion = itemCurrency !== formData.currency && item.unitPrice > 0
                           const convertedAmount = itemConvertedAmounts[item.id]
                           
                           if (!needsConversion || !convertedAmount || item.unitPrice === 0) return null
                           
                           // Calculate exchange rate per 1 unit
                           const exchangeRate = convertedAmount / item.unitPrice
                           
                           return (
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground cursor-help flex-shrink-0" />
                               </TooltipTrigger>
                               <TooltipContent className="bg-blue-600 text-white border-blue-600">
                                 <p className="font-medium mb-1">Exchange Rate</p>
                                 <p className="text-sm">
                                   1 {itemCurrency} = {getCurrencySymbol(formData.currency)}{exchangeRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                 </p>
                               </TooltipContent>
                             </Tooltip>
                           )
                         })()}
                       </div>
                      <div className="flex gap-2">
                        <Select
                          value={itemCurrencies[item.id] || formData.currency}
                          onValueChange={(value) => handleItemCurrencyChange(item.id, value as CurrencyCode)}
                        >
                          <SelectTrigger className="w-16 sm:w-20 md:w-24 h-9 sm:h-10 text-xs sm:text-sm flex-shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_CURRENCIES.map(currency => (
                              <SelectItem key={currency.code} value={currency.code}>
                                {currency.symbol} {currency.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={itemDisplayValues[item.id] || ""}
                          onChange={(e) => handleUnitPriceChange(item.id, e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs sm:text-sm font-medium flex-1 min-w-0 h-9 sm:h-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2 flex-1 min-w-0 sm:min-w-[100px]">
                     <div className="flex items-center justify-between gap-2">
                     <Label className="text-xs sm:text-sm">Amount ({getCurrencySymbol(formData.currency)})</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground cursor-help flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-blue-600 text-white border-blue-600">
                              <p>Amount is calculated as Quantity × Unit Price</p>
                            </TooltipContent>
                          </Tooltip>
                     </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="h-9 px-2 sm:px-3 py-2 rounded-md border border-input bg-muted text-xs sm:text-base font-semibold flex items-center justify-end cursor-help min-w-0">
                            <span className="truncate text-right w-full">
                              {getCurrencySymbol(formData.currency)} {calculateItemAmount(item).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-blue-600 text-white border-blue-600 max-w-xs">
                          <p className="break-words">
                            {getCurrencySymbol(formData.currency)} {calculateItemAmount(item).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      {/* <p className="text-xs text-muted-foreground">Qty × Unit Price</p> */}
                    </div>
                    {/* VAT checkbox - shown only if user can charge VAT (₦100M+ turnover AND VAT-registered for freelancers/creators) */}
                    {canChargeVAT(profile) && (
                      <div className="space-y-2 flex flex-col justify-end flex-shrink-0">
                        <div className="flex items-center space-x-2 sm:pt-0 pt-2">
                          <Checkbox
                            id={`vatable-${item.id}`}
                            checked={item.vatable || false}
                            onCheckedChange={(checked) => updateItem(item.id, { vatable: !!checked })}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex flex-col min-w-0">
                            <Label htmlFor={`vatable-${item.id}`} className="text-xs sm:text-sm cursor-pointer">
                              Vatable
                            </Label>
                            {item.vatable && (
                              <p className="text-xs text-muted-foreground mt-1 break-words">
                                VAT: {getCurrencySymbol(formData.currency)}{(calculateItemAmount(item) * (formData.vatRate || 7.5) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Platform Fees Breakdown (for creators) - Compact inline layout */}
                  {profile?.businessType === 'creator' && formData.invoiceType === 'outgoing' && (
                    <div className="pt-2 border-t space-y-2">
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">Platform Fees Breakdown (Optional)</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1 min-w-0">
                          <Label htmlFor={`gross-${item.id}`} className="text-[11px] sm:text-xs">Gross Amount</Label>
                          <div className="h-8 sm:h-9 px-2 py-1.5 rounded-md border border-input bg-muted text-[11px] sm:text-xs font-medium flex items-center overflow-hidden">
                            <span className="truncate whitespace-nowrap w-full">
                              {getCurrencySymbol(formData.currency)}{calculateGrossAmount(item).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <Label htmlFor={`fees-${item.id}`} className="text-[11px] sm:text-xs">Platform Fees</Label>
                          <Input
                            id={`fees-${item.id}`}
                            type="text"
                            value={itemPlatformFeesDisplay[item.id] || ""}
                            onChange={(e) => {
                              const inputValue = e.target.value
                              
                              // Allow empty string
                              if (inputValue === "") {
                                setItemPlatformFeesDisplay(prev => ({ ...prev, [item.id]: "" }))
                                setItemPlatformFees(prev => ({ ...prev, [item.id]: undefined }))
                                // Gross amount stays fixed, just clear fees
                                updateItem(item.id, { 
                                  platformFees: undefined,
                                  netAmount: undefined
                                })
                                return
                              }
                              
                              // Format the input
                              const formatted = formatCurrencyInput(inputValue)
                              setItemPlatformFeesDisplay(prev => ({ ...prev, [item.id]: formatted }))
                              
                              // Parse the numeric value
                              const parsed = parseCurrencyInput(formatted)
                              const numericValue = parseFloat(parsed) || 0
                              
                              if (numericValue > 0) {
                                const grossAmount = calculateGrossAmount(item)
                                setItemPlatformFees(prev => ({ ...prev, [item.id]: numericValue }))
                                // Gross amount stays fixed, only update fees and net amount
                                updateItem(item.id, { 
                                  platformFees: numericValue,
                                  netAmount: grossAmount - numericValue
                                })
                              }
                            }}
                            onKeyDown={handleInputKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="0.00"
                            className="h-8 sm:h-9 text-[11px] sm:text-xs"
                          />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <Label className="text-[11px] sm:text-xs">Net Amount</Label>
                          <div className="h-8 sm:h-9 px-2 py-1.5 rounded-md border border-input bg-muted text-[11px] sm:text-xs font-medium flex items-center overflow-hidden">
                            <span className="truncate whitespace-nowrap w-full">
                              {getCurrencySymbol(formData.currency)}{(calculateGrossAmount(item) - (itemPlatformFees[item.id] || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                    
                    {/* <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Amount ({getCurrencySymbol(formData.currency)})</Label>
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="p-2 border rounded bg-muted text-sm font-medium">
                        {formatCurrencyAmount(item.amount, formData.currency)}
                      </div>
                    </div> */}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto">
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Add Item</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>

          {/* VAT Section - shown only if user can charge VAT (qualifies per Nigerian VAT Act: ₦100M+ turnover + VAT registration) */}
          {canChargeVAT(profile) && (
            <div className="space-y-3 sm:space-y-4 border-t pt-3 sm:pt-4">
              <div className="space-y-2">
                <Label htmlFor="vat-rate" className="text-xs sm:text-sm">VAT Rate (%)</Label>
                <Input
                  id="vat-rate"
                  type="text"
                  inputMode="decimal"
                  placeholder="7.5"
                  value={formData.vatRate?.toString() || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    // Allow empty string, numbers, and decimals
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      const rate = value === '' ? 7.5 : (parseFloat(value) || 7.5)
                      setFormData(prev => ({ ...prev, vatRate: rate }))
                    }
                  }}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
                <p className="text-xs text-muted-foreground">Default: 7.5% (Nigeria VAT rate)</p>
              </div>
              
              {/* VAT Eligibility Information - Only shown to users who qualify to charge VAT */}
              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                  <strong>VAT Compliance (Nigeria VAT Act):</strong>
                  <ul className="mt-1.5 space-y-1 list-disc list-inside">
                    <li><strong>₦100M+ annual turnover + VAT registered</strong> → You may charge VAT (you qualify)</li>
                    <li><strong>Below ₦100M turnover</strong> → VAT-exempt, must NOT charge VAT</li>
                    <li><strong>Freelancers &amp; creators</strong> → Can qualify if turnover ≥₦100M and VAT-registered with FIRS</li>
                  </ul>
                  <p className="mt-1.5"><strong>Important:</strong> VAT is collected on behalf of government, not earned as income. You must remit collected VAT to FIRS. Update your annual turnover and VAT registration in Settings to qualify.</p>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Discount Section */}
          <div className="space-y-3 sm:space-y-4 border-t pt-3 sm:pt-4">
            <div className="space-y-2">
              <Label htmlFor="discount" className="text-xs sm:text-sm">Discount %</Label>
              <Input
                id="discount"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={discountDisplayValue}
                onChange={(e) => {
                  const value = e.target.value
                  // Allow empty string, numbers, and decimals (including intermediate states like "10." or ".5")
                  // Regex: optional digits, optional decimal point, optional digits after decimal
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setDiscountDisplayValue(value)
                    // Update formData.discount for calculations (parseFloat handles "10." as 10, "10.5" as 10.5)
                    const discount = value === '' || value === '.' ? 0 : (parseFloat(value) || 0)
                    setFormData(prev => ({ ...prev, discount: discount }))
                  }
                }}
                onKeyDown={handleInputKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">Enter percentage (e.g., 5, 10.5, 15.25)</p>
            </div>
          </div>

          {/* Payment Summary Totals */}
          <div className="space-y-2 sm:space-y-3 border-t pt-3 sm:pt-4 bg-muted/30 p-3 sm:p-4 rounded-lg">
            <h4 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3">Payment Summary</h4>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0 text-xs sm:text-sm">
              <span>Subtotal:</span>
              <span className="font-medium whitespace-nowrap">{getCurrencySymbol(formData.currency)} {totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {formData.discount > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0 text-xs sm:text-sm text-destructive">
                <span>Discount ({formData.discount}%):</span>
                <span className="whitespace-nowrap">-{getCurrencySymbol(formData.currency)} {(totals.subtotal * formData.discount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            {canChargeVAT(profile) && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0 text-xs sm:text-sm">
                <span>VAT ({formData.vatRate || 7.5}%):</span>
                <span className="font-medium whitespace-nowrap">{getCurrencySymbol(formData.currency)} {totals.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0 text-xs sm:text-sm font-semibold border-t pt-2 mt-2">
              <span>Invoice Total:</span>
              <span className="whitespace-nowrap">{getCurrencySymbol(formData.currency)} {totals.invoiceTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0 text-sm sm:text-lg font-bold border-t pt-2 mt-2">
              <span>Amount Payable:</span>
              <span className="text-primary whitespace-nowrap">{getCurrencySymbol(formData.currency)} {totals.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Creator-Specific Fields (for outgoing invoices) - Optional */}
          {profile?.businessType === 'creator' && formData.invoiceType === 'outgoing' && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-semibold">Creator-Specific Information (Optional)</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreatorFields(!showCreatorFields)}
                  className="text-xs sm:text-sm"
                >
                  {showCreatorFields ? "Hide" : "Show"}
                </Button>
              </div>
              
              {showCreatorFields && (
                <>
                  {/* Platform Information */}
                  <div className="space-y-3 p-3 sm:p-4 border rounded-lg bg-muted/30">
                    <h4 className="text-sm font-medium">Platform Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="platform-name" className="text-xs sm:text-sm">Platform Name</Label>
                        <Select value={platformName} onValueChange={(value) => setPlatformName(value)}>
                          <SelectTrigger id="platform-name" className="h-9 sm:h-10 text-xs sm:text-sm">
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
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="platform-type" className="text-xs sm:text-sm">Platform Type</Label>
                        <Select value={platformType} onValueChange={(value: any) => setPlatformType(value)}>
                          <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="social">Social Media</SelectItem>
                            <SelectItem value="subscription">Subscription</SelectItem>
                            <SelectItem value="marketplace">Marketplace</SelectItem>
                            <SelectItem value="streaming">Streaming</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="platform-account-id" className="text-xs sm:text-sm">Account ID/Username</Label>
                        <Input
                          id="platform-account-id"
                          value={platformAccountId}
                          onChange={(e) => setPlatformAccountId(e.target.value)}
                          placeholder="Your account ID or username"
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="platform-account-url" className="text-xs sm:text-sm">Account URL</Label>
                        <Input
                          id="platform-account-url"
                          type="url"
                          value={platformAccountUrl}
                          onChange={(e) => setPlatformAccountUrl(e.target.value)}
                          placeholder="https://..."
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Transaction Nature */}
                  <div className="space-y-3 p-3 sm:p-4 border rounded-lg bg-muted/30">
                    <h4 className="text-sm font-medium">Transaction Nature</h4>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="transaction-nature" className="text-xs sm:text-sm">Is this for business or personal use?</Label>
                        <Select value={transactionNature || ""} onValueChange={(value: any) => {
                          setTransactionNature(value || undefined)
                          if (value !== 'mixed') setBusinessPercentage(undefined)
                        }}>
                          <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                            <SelectValue placeholder="Select transaction nature" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="business">Business</SelectItem>
                            <SelectItem value="personal">Personal</SelectItem>
                            <SelectItem value="mixed">Mixed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {transactionNature === 'mixed' && (
                        <div className="space-y-2">
                          <Label htmlFor="business-percentage" className="text-xs sm:text-sm">Business Percentage (%)</Label>
                          <Input
                            id="business-percentage"
                            type="text"
                            inputMode="decimal"
                            placeholder="100"
                            value={businessPercentage?.toString() || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              // Allow empty string, numbers, and decimals
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                const percentage = value === '' ? undefined : parseFloat(value)
                                setBusinessPercentage(percentage)
                              }
                            }}
                            className="h-9 sm:h-10 text-xs sm:text-sm"
                          />
                          <p className="text-xs text-muted-foreground">Enter the percentage that applies to business use (0-100)</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-xs sm:text-sm">Tags (Optional)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((_, i) => i !== index))}
                    className="ml-2 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault()
                    if (!tags.includes(tagInput.trim())) {
                      setTags([...tags, tagInput.trim()])
                    }
                    setTagInput("")
                  }
                }}
                placeholder="Type and press Enter to add tag"
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">Add tags to organize and search your invoices</p>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment-method" className="text-xs sm:text-sm">Expected Payment Method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value)}
            >
              <SelectTrigger id="payment-method" className="h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                <SelectItem value="Check">Check</SelectItem>
                <SelectItem value="PayPal">PayPal</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">How you expect to receive payment for this invoice</p>
          </div>


          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs sm:text-sm">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              onKeyDown={handleInputKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder="Additional notes or comments"
              rows={3}
              className="text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms" className="text-xs sm:text-sm">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              onKeyDown={handleInputKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder="Terms and conditions"
              rows={3}
              className="text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-instructions" className="text-xs sm:text-sm">Payment Instructions</Label>
            <Textarea
              id="payment-instructions"
              value={formData.paymentInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentInstructions: e.target.value }))}
              onKeyDown={handleInputKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder="Payment instructions, bank details, payment link, or other payment information"
              rows={3}
              className="text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Include bank account details, payment links, or any specific payment instructions for your client.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 sm:pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting || isSendingToUser} className="h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto">
              {(isSubmitting || isSendingToUser) && <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />}
              {invoice ? "Update Invoice" : "Create Invoice"}
            </Button>
          </div>
        </form>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {typeof window !== 'undefined' && createPortal(modalContent, document.body)}
      
      {profile && profile.businessType !== 'consultant' && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile.businessType || 'freelancer'}
        />
      )}
    </>
  )
}

