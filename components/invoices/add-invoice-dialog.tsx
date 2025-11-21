"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, Loader2, Info } from "lucide-react"
import { Invoice, InvoiceItem, InvoiceClient, InvoiceSupplier, InvoiceTemplateType, InvoiceType } from "@/lib/types"
import { invoiceService, userService } from "@/lib/services"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { INVOICE_TEMPLATES, getDefaultTemplate } from "@/lib/utils/invoiceTemplates"
import { formatDateForInput } from "@/lib/utils/date"
import { SUPPORTED_CURRENCIES, CurrencyCode, getCurrencySymbol, formatCurrencyInput, parseCurrencyInput, formatCurrencyAmount, fetchExchangeRate, convertCurrency } from "@/lib/utils/currency"

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearchingUser, setIsSearchingUser] = useState(false)
  // Store unitPriceDisplay for each item (formatted string)
  const [itemDisplayValues, setItemDisplayValues] = useState<Record<string, string>>({})
  // Store currency for each item (defaults to invoice currency)
  const [itemCurrencies, setItemCurrencies] = useState<Record<string, CurrencyCode>>({})
  // Store converted amounts in base currency (NGN) for each item
  const [itemConvertedAmounts, setItemConvertedAmounts] = useState<Record<string, number>>({})

  const [isSendingToUser, setIsSendingToUser] = useState(false)
  
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
      taxId: profile.taxId || ""
    }
  }, [profile, user])

  // Find user by email and prefill client details
  const handleFindUserByEmail = async (email: string) => {
    if (!email || !email.includes('@')) {
      toast.error("Please enter a valid email address")
      return
    }

    setIsSearchingUser(true)
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
        toast.success("User found! Client information has been prefilled.")
      } else {
        toast.error("User not found. This email is not registered on OTax.")
      }
    } catch (error) {
      console.error('Error finding user:', error)
      toast.error("Failed to search for user. Please try again.")
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
        tax: 0,
        amount: 0
      }
    ] as InvoiceItem[],
    discount: 0,
    notes: "",
    terms: "",
    paymentTerms: "Net 30",
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
      setFormData({
        invoiceType: invoice.invoiceType || 'outgoing',
        template: invoice.template,
        supplier: invoice.supplier || getInitialSupplier(),
        client: invoice.client,
        issueDate: invoice.issueDate.split('T')[0],
        dueDate: invoice.dueDate.split('T')[0],
        currency: invoice.currency as CurrencyCode,
        items: items,
        discount: invoice.discount || 0,
        notes: invoice.notes || "",
        terms: invoice.terms || "",
        paymentTerms: invoice.paymentTerms || "Net 30",
        paymentInstructions: invoice.paymentInstructions || "",
        sendToOtaxUser: !!invoice.recipientUserId,
        recipientEmail: invoice.recipientEmail || ""
      })
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
          tax: 0,
          amount: 0
        }],
        discount: 0,
        notes: "",
        terms: "",
        paymentTerms: "Net 30",
        paymentInstructions: "",
        sendToOtaxUser: false,
        recipientEmail: ""
      })
    }
  }, [invoice, open])

  const calculateItemAmount = (item: InvoiceItem): number => {
    // Use the exact same logic as calculateTotals for consistency
    // If unit price is 0, amount should always be 0
    if (item.unitPrice === 0) {
      return 0
    }
    
    const itemCurrency = itemCurrencies[item.id] || formData.currency
    const basePrice = itemCurrency !== formData.currency 
      ? (itemConvertedAmounts[item.id] || item.unitPrice)
      : item.unitPrice
    const subtotal = item.quantity * basePrice
    const taxAmount = item.tax ? subtotal * (item.tax / 100) : 0
    return subtotal + taxAmount
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
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: newItemId,
          description: "",
          quantity: 1,
          unitPrice: 0,
          tax: 0,
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
  }

  const calculateTotals = () => {
    // Calculate subtotal using converted amounts
    const subtotal = formData.items.reduce((sum, item) => {
      // If unit price is 0, skip this item
      if (item.unitPrice === 0) return sum
      
      const itemCurrency = itemCurrencies[item.id] || formData.currency
      const basePrice = itemCurrency !== formData.currency 
        ? (itemConvertedAmounts[item.id] || item.unitPrice)
        : item.unitPrice
      return sum + (item.quantity * basePrice)
    }, 0)
    
    // Calculate tax using converted amounts
    const taxAmount = formData.items.reduce((sum, item) => {
      // If unit price is 0, skip this item
      if (item.unitPrice === 0) return sum
      
      const itemCurrency = itemCurrencies[item.id] || formData.currency
      const basePrice = itemCurrency !== formData.currency 
        ? (itemConvertedAmounts[item.id] || item.unitPrice)
        : item.unitPrice
      const itemSubtotal = item.quantity * basePrice
      return sum + (item.tax ? itemSubtotal * (item.tax / 100) : 0)
    }, 0)
    
    const discountAmount = formData.discount ? subtotal * (formData.discount / 100) : 0
    const total = subtotal + taxAmount - discountAmount
    return { subtotal, taxAmount, total }
  }

  // const handleSubmit = async () => {
  //   if (!user?.uid) {
  //     toast.error("User not authenticated")
  //     return
  //   }

  //   // Validation
  //   if (!formData.supplier?.name?.trim()) {
  //     toast.error("Please enter your business/contact name")
  //     return
  //   }

  //   if (!formData.supplier?.email?.trim()) {
  //     toast.error("Please enter your email")
  //     return
  //   }

  //   if (!formData.client.name.trim()) {
  //     toast.error("Please enter client name")
  //     return
  //   }

  //   if (formData.items.length === 0 || formData.items.some(item => !item.description.trim() || item.unitPrice <= 0)) {
  //     toast.error("Please add at least one valid item")
  //     return
  //   }

  //   setIsSubmitting(true)
  //   try {
  //     // Helper function to remove undefined values from objects
  //     const removeUndefined = (obj: any): any => {
  //       if (obj === null || obj === undefined) return obj
  //       if (Array.isArray(obj)) return obj.map(removeUndefined)
  //       if (typeof obj !== 'object') return obj
        
  //       const cleaned: any = {}
  //       for (const key in obj) {
  //         if (obj[key] !== undefined) {
  //           cleaned[key] = removeUndefined(obj[key])
  //         }
  //       }
  //       return cleaned
  //     }

  //     // Clean client and supplier objects
  //     const cleanedClient = removeUndefined(formData.client)
  //     const cleanedSupplier = removeUndefined(
  //       formData.invoiceType === 'outgoing' ? (formData.supplier || getInitialSupplier()) : getInitialSupplier()
  //     )

  //     // Recalculate all item amounts before saving to ensure they're correct
  //     const itemsWithCalculatedAmounts = formData.items.map(item => {
  //       const itemCurrency = itemCurrencies[item.id] || formData.currency
  //       const basePrice = itemCurrency !== formData.currency 
  //         ? (itemConvertedAmounts[item.id] || item.unitPrice)
  //         : item.unitPrice
  //       const subtotal = item.quantity * basePrice
  //       const taxAmount = item.tax ? subtotal * (item.tax / 100) : 0
  //       return {
  //         ...item,
  //         amount: subtotal + taxAmount
  //       }
  //     })

  //     const invoiceData = {
  //       invoiceType: formData.invoiceType,
  //       template: formData.template,
  //       supplier: cleanedSupplier,
  //       client: cleanedClient,
  //       issueDate: formData.issueDate,
  //       dueDate: formData.dueDate,
  //       currency: formData.currency,
  //       items: itemsWithCalculatedAmounts,
  //       discount: formData.discount || undefined,
  //       notes: formData.notes || undefined,
  //       terms: formData.terms || undefined,
  //       paymentTerms: formData.paymentTerms,
  //       paymentInstructions: formData.paymentInstructions || undefined,
  //       status: 'draft' as const
  //     }

  //     // Remove undefined top-level fields
  //     const cleanedInvoiceData = removeUndefined(invoiceData)

  //     let result
  //     if (invoice) {
  //       result = await invoiceService.updateInvoice(invoice.id, user.uid, cleanedInvoiceData)
  //     } else {
  //       result = await invoiceService.createInvoice(user.uid, cleanedInvoiceData)
  //     }

  //     if (result.success) {
  //       toast.success(invoice ? "Invoice updated successfully" : "Invoice created successfully")
        
  //       // If sending to OTax user, send the invoice
  //       if (formData.sendToOtaxUser && formData.recipientEmail && result.data) {
  //         const sendResult = await invoiceService.sendInvoiceToUser(
  //           result.data.id,
  //           user.uid,
  //           formData.recipientEmail
  //         )
          
  //         if (sendResult.success) {
  //           toast.success(`Invoice sent to ${formData.recipientEmail}`)
  //         } else {
  //           toast.error(sendResult.error || "Failed to send invoice")
  //         }
  //       }
        
  //       onOpenChange(false)
  //       onSuccess?.()
  //     } else {
  //       toast.error(result.error || "Failed to save invoice")
  //     }
  //   } catch (error) {
  //     console.error("Error saving invoice:", error)
  //     toast.error("Failed to save invoice")
  //   } finally {
  //     setIsSubmitting(false)
  //   }
  // }

  const handleSubmit = async () => {
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
  
    if (formData.items.length === 0 || formData.items.some(item => !item.description.trim() || item.unitPrice <= 0)) {
      toast.error("Please add at least one valid item")
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
  
      // Recalculate all item amounts before saving to ensure they're correct
      const itemsWithCalculatedAmounts = formData.items.map(item => {
        const itemCurrency = itemCurrencies[item.id] || formData.currency
        const basePrice = itemCurrency !== formData.currency 
          ? (itemConvertedAmounts[item.id] || item.unitPrice)
          : item.unitPrice
        const subtotal = item.quantity * basePrice
        const taxAmount = item.tax ? subtotal * (item.tax / 100) : 0
        return {
          ...item,
          amount: subtotal + taxAmount
        }
      })
  
      const invoiceData = {
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
        paymentTerms: formData.paymentTerms,
        paymentInstructions: formData.paymentInstructions || undefined,
        status: 'draft' as const
      }
  
      // Remove undefined top-level fields
      const cleanedInvoiceData = removeUndefined(invoiceData)
  
      let result
      if (invoice) {
        result = await invoiceService.updateInvoice(invoice.id, user.uid, cleanedInvoiceData)
      } else {
        result = await invoiceService.createInvoice(user.uid, cleanedInvoiceData)
      }
  
      if (result.success) {
        toast.success(invoice ? "Invoice updated successfully" : "Invoice created successfully")
        
        // If sending to OTax user, send the invoice
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

  const totals = calculateTotals()

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto hide-scrollbar">
        <DialogHeader>
          <DialogTitle>{invoice ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* Send to OTax User Option */}
          {formData.invoiceType === 'outgoing' && (
            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="send-to-otax-user"
                  checked={formData.sendToOtaxUser || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendToOtaxUser: !!checked }))}
                />
                <Label htmlFor="send-to-otax-user" className="font-medium cursor-pointer">
                  Send to OTax User
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                If the recipient is an OTax user, they will receive this invoice in their account
              </p>
              {formData.sendToOtaxUser && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleFindUserByEmail(formData.recipientEmail || "")
                  }}
                  className="mt-3 space-y-2"
                >
                  <Label htmlFor="recipient-email">Recipient Email (OTax User)</Label>
                  <div className="relative">
                    <Input
                      id="recipient-email"
                      type="email"
                      value={formData.recipientEmail || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, recipientEmail: e.target.value }))}
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
                    />
                    {isSearchingUser && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the email address and press Enter to find the user and prefill client details
                  </p>
                </form>
              )}
            </div>
          )}

          {/* Template Selection */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={formData.template}
                onValueChange={(value) => setFormData(prev => ({ ...prev, template: value as InvoiceTemplateType }))}
              >
                <SelectTrigger id="template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_TEMPLATES.map(template => (
                    <SelectItem key={template.id} value={template.type}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
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
            </div>
          </div>

          {/* Supplier/Business Information - Only show for outgoing invoices */}
          {formData.invoiceType === 'outgoing' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Business Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="supplier-name">Business/Contact Name *</Label>
                <Input
                  id="supplier-name"
                  value={formData.supplier?.name || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), name: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Your business or name"
                />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="supplier-business-name">Business Name (Optional)</Label>
                <Input
                  id="supplier-business-name"
                  value={formData.supplier?.businessName || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), businessName: e.target.value || undefined } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Registered business name"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="supplier-email">Email *</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={formData.supplier?.email || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), email: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="supplier-phone">Phone</Label>
                <Input
                  id="supplier-phone"
                  value={formData.supplier?.phone || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), phone: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="+234 800 000 0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-address">Address</Label>
              <Input
                id="supplier-address"
                value={formData.supplier?.address?.street || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), address: { ...(prev.supplier?.address || {}), street: e.target.value } } }))}
                onKeyDown={handleInputKeyDown}
                onClick={(e) => e.stopPropagation()}
                placeholder="Street address"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-city">City</Label>
                  <Input
                  id="supplier-city"
                  value={formData.supplier?.address?.city || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), address: { ...(prev.supplier?.address || {}), city: e.target.value } } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="City"
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
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-tin">Tax Identification Number (TIN)</Label>
              <Input
                id="supplier-tin"
                value={formData.supplier?.taxId || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), taxId: e.target.value } }))}
                onKeyDown={handleInputKeyDown}
                onClick={(e) => e.stopPropagation()}
                placeholder="Your TIN"
              />
            </div>
          </div>
          )}

          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Client Information</h3>
            <p className="text-sm text-muted-foreground">
              The client who will receive this invoice
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name *</Label>
                <Input
                  id="client-name"
                  value={formData.client.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, name: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Enter client name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-business-name">Business Name (Optional)</Label>
                <Input
                  id="client-business-name"
                  value={formData.client.businessName || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, businessName: e.target.value || undefined } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Client's business name"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={formData.client.email || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, email: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="client@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Phone</Label>
                <Input
                  id="client-phone"
                  value={formData.client.phone || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, phone: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="+234 800 000 0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-tax-id">Tax ID</Label>
                <Input
                  id="client-tax-id"
                  value={formData.client.taxId || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, taxId: e.target.value } }))}
                  onKeyDown={handleInputKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Invoice Dates */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue-date">Issue Date</Label>
              <Input
                id="issue-date"
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                onKeyDown={handleInputKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date">Due Date</Label>
              <Input
                id="due-date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                onKeyDown={handleInputKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Invoice Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            {/* Tax Calculation Explanation */}
            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Tax Calculation:</strong> Tax is calculated per item. Each item's tax is applied to its subtotal (quantity × unit price). 
                For example, if an item costs {getCurrencySymbol(formData.currency)}1,000 with 7.5% tax, the tax amount is {getCurrencySymbol(formData.currency)}75. 
                The total invoice tax is the sum of all item taxes.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={item.id} className="space-y-4 p-4 border rounded-lg flex items-center gap-4">
                  {/* Row 1: Description and Quantity */}
                  <div className="flex items-center gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        onKeyDown={handleInputKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                        onKeyDown={handleInputKeyDown}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Row 2: Unit Price, Tax, and Amount */}
                  <div className="flex items-center gap-4 -mt-3">
                    <div className="md:col-span-2 space-y-2">
                      <Label>Unit Price</Label>
                      <div className="flex gap-2">
                        <Select
                          value={itemCurrencies[item.id] || formData.currency}
                          onValueChange={(value) => handleItemCurrencyChange(item.id, value as CurrencyCode)}
                        >
                          <SelectTrigger className="w-24">
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
                          className="text-lg font-medium flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tax %</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.tax === 0 ? "" : item.tax}
                        onChange={(e) => {
                          const value = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0
                          updateItem(item.id, { tax: value })
                        }}
                        onFocus={(e) => {
                          if (e.target.value === "0" || e.target.value === "") {
                            e.target.select()
                          }
                        }}
                        onKeyDown={handleInputKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="0"
                      />
                    </div>
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
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{getCurrencySymbol(formData.currency)} {totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span>{getCurrencySymbol(formData.currency)} {totals.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {formData.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Discount ({formData.discount}%):</span>
                <span>-{getCurrencySymbol(formData.currency)} {(totals.subtotal * formData.discount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>Total:</span>
              <span>{getCurrencySymbol(formData.currency)} {totals.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Discount %</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={formData.discount}
                onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                onKeyDown={handleInputKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-terms">Payment Terms</Label>
              <Input
                id="payment-terms"
                value={formData.paymentTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                onKeyDown={handleInputKeyDown}
                onClick={(e) => e.stopPropagation()}
                placeholder="e.g., Net 30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              onKeyDown={handleInputKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder="Additional notes or comments"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              onKeyDown={handleInputKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder="Terms and conditions"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-instructions">Payment Instructions</Label>
            <Textarea
              id="payment-instructions"
              value={formData.paymentInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentInstructions: e.target.value }))}
              onKeyDown={handleInputKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder="Payment instructions, bank details, payment link, or other payment information"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Include bank account details, payment links, or any specific payment instructions for your client.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {/* <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {invoice ? "Update Invoice" : "Create Invoice"}
            </Button> */}
<Button type="button" onClick={handleSubmit} disabled={isSubmitting || isSendingToUser}>
  {(isSubmitting || isSendingToUser) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
  {invoice ? "Update Invoice" : "Create Invoice"}
</Button>          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

