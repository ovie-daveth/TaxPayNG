"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Download, Printer, ExternalLink, Upload, X, FileText, Loader2, Edit, Save, XCircle, Calculator, Plus, Info } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Invoice, InvoiceType, InvoiceClient, InvoiceItem } from "@/lib/types"
import { getCurrencySymbol, formatCurrencyAmount, formatCurrencyInput, parseCurrencyInput, SUPPORTED_CURRENCIES, CurrencyCode, fetchExchangeRate, convertCurrency } from "@/lib/utils/currency"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { invoiceService } from "@/lib/services"
import { uploadToImageKit } from "@/lib/utils/imagekit"

interface ViewInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
  onInvoiceUpdated?: () => void
  onEdit?: (invoice: Invoice) => void
}

export function ViewInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onInvoiceUpdated,
  onEdit
}: ViewInvoiceDialogProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false)
  const [taxDeductible, setTaxDeductible] = useState(true) // Default to true for bills
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedInvoice, setEditedInvoice] = useState<Invoice | null>(null)
  const [exchangeRate, setExchangeRate] = useState<string>("")
  // Store unitPriceDisplay for each item (formatted string) during editing
  const [itemDisplayValues, setItemDisplayValues] = useState<Record<string, string>>({})
  // Store currency for each item during editing
  const [itemCurrencies, setItemCurrencies] = useState<Record<string, CurrencyCode>>({})
  // Store converted amounts in base currency for each item
  const [itemConvertedAmounts, setItemConvertedAmounts] = useState<Record<string, number>>({})

  // Check if user can view this invoice (must be sender OR recipient)
  const isSender = invoice && profile?.userId && invoice.userId === profile.userId
  const isRecipient = invoice && profile?.userId && invoice.recipientUserId === profile.userId
  // Also check if user is the client (for incoming invoices)
  const isClient = invoice && profile?.userId && invoice.client?.id === profile.userId
  
  // Determine if this should be displayed as incoming
  const displayAsIncoming = isRecipient || isClient

  // Reset confirmation dialog when main dialog closes
  useEffect(() => {
    if (!open) {
      setShowConfirmDialog(false)
      setIsMarkingPaid(false)
      setIsEditing(false)
      setEditedInvoice(null)
    }
  }, [open])

  // Initialize edited invoice when entering edit mode
  useEffect(() => {
    if (invoice && isEditing && !editedInvoice) {
      const copied = JSON.parse(JSON.stringify(invoice)) // Deep copy
      setEditedInvoice(copied)
      
      // Initialize item currencies and display values
      const currencies: Record<string, CurrencyCode> = {}
      const displays: Record<string, string> = {}
      const converted: Record<string, number> = {}
      const baseCurrency = copied.currency as CurrencyCode
      
      copied.items.forEach((item: InvoiceItem) => {
        const itemCurrency = (item.currency as CurrencyCode) || baseCurrency || "NGN"
        currencies[item.id] = itemCurrency
        displays[item.id] = item.unitPrice.toString()
        
        // If item currency matches base currency, use unitPrice directly
        // Otherwise, convert it immediately
        if (itemCurrency === baseCurrency) {
          converted[item.id] = item.unitPrice
        } else {
          // Don't set wrong value - convert immediately
          // Start with 0, will be updated after conversion
          converted[item.id] = 0
          // Convert immediately
          if (item.unitPrice > 0) {
            convertCurrency(item.unitPrice, itemCurrency, baseCurrency)
              .then(convertedAmount => {
                setItemConvertedAmounts(prev => ({
                  ...prev,
                  [item.id]: convertedAmount
                }))
                // Recalculate after conversion
                setEditedInvoice(prev => {
                  if (prev) {
                    const itemToUpdate = prev.items.find((i: InvoiceItem) => i.id === item.id)
                    if (itemToUpdate) {
                      // Recalculate this item's amount and totals
                      const updatedItems = prev.items.map((i: InvoiceItem) => {
                        if (i.id === item.id) {
                          const ic = itemCurrencies[i.id] || (i.currency as CurrencyCode) || prev.currency
                          const bc = prev.currency as CurrencyCode
                          const bp = ic !== bc 
                            ? (convertedAmount)
                            : i.unitPrice
                          const itemSubtotal = i.quantity * bp
                          const itemTaxAmount = i.tax ? itemSubtotal * (i.tax / 100) : 0
                          return { ...i, amount: itemSubtotal + itemTaxAmount }
                        }
                        return i
                      })
                      // Recalculate totals using current converted amounts
                      setItemConvertedAmounts(currentConverted => {
                        let subtotal = 0
                        let totalTaxAmount = 0
                        updatedItems.forEach((i: InvoiceItem) => {
                          if (i.unitPrice === 0) return
                          const ic = itemCurrencies[i.id] || (i.currency as CurrencyCode) || prev.currency
                          const bc = prev.currency as CurrencyCode
                          // Use the converted amount we just set for this item, or get from current state
                          const bp = ic !== bc 
                            ? (i.id === item.id ? convertedAmount : (currentConverted[i.id] || i.unitPrice))
                            : i.unitPrice
                          const itemSubtotal = i.quantity * bp
                          subtotal += itemSubtotal
                          const itemTaxAmount = i.tax ? itemSubtotal * (i.tax / 100) : 0
                          totalTaxAmount += itemTaxAmount
                        })
                        const discountAmount = prev.discount ? subtotal * (prev.discount / 100) : 0
                        const total = subtotal + totalTaxAmount - discountAmount
                        setEditedInvoice(prevInvoice => prevInvoice ? {
                          ...prevInvoice,
                          items: updatedItems,
                          subtotal,
                          taxAmount: totalTaxAmount,
                          total
                        } : prevInvoice)
                        return currentConverted
                      })
                    }
                  }
                  return prev
                })
              })
              .catch(error => {
                console.error('Error converting currency on init:', error)
                // On error, use unitPrice (will be incorrect but prevents 0)
                setItemConvertedAmounts(prev => ({
                  ...prev,
                  [item.id]: item.unitPrice
                }))
              })
          }
        }
      })
      setItemCurrencies(currencies)
      setItemDisplayValues(displays)
      setItemConvertedAmounts(converted)
    }
  }, [invoice, isEditing, editedInvoice])

  // Use editedInvoice when editing, otherwise use original invoice
  const currentInvoice = isEditing && editedInvoice ? editedInvoice : invoice

  // Helper to update edited invoice
  const updateEditedInvoice = (updates: Partial<Invoice>) => {
    if (editedInvoice) {
      setEditedInvoice({ ...editedInvoice, ...updates })
    }
  }

  // Helper to update client in edited invoice
  const updateClient = (updates: Partial<InvoiceClient>) => {
    if (editedInvoice) {
      setEditedInvoice({
        ...editedInvoice,
        client: { ...editedInvoice.client, ...updates }
      })
    }
  }

  // Helper to calculate item amount
  const calculateItemAmount = (item: InvoiceItem): number => {
    if (item.unitPrice === 0) {
      return 0
    }
    
    const itemCurrency = itemCurrencies[item.id] || (item.currency as CurrencyCode) || editedInvoice?.currency || invoice?.currency
    const baseCurrency = editedInvoice?.currency || invoice?.currency
    
    // Get the converted price in base currency
    let basePrice: number
    if (itemCurrency !== baseCurrency) {
      // Item is in different currency - MUST use converted amount
      const convertedAmount = itemConvertedAmounts[item.id]
      // If converted amount is not available or is 0, we need to use unitPrice temporarily
      // but this will be wrong - so we should trigger conversion immediately
      if (convertedAmount === undefined || convertedAmount === 0) {
        // If we're in edit mode and have the item, trigger conversion
        if (editedInvoice && item.unitPrice > 0) {
          // Trigger conversion (async, won't block)
          handleItemCurrencyConversion(item.id, item.unitPrice, itemCurrency as CurrencyCode)
        }
        // Use unitPrice as fallback (will be wrong until conversion completes)
        // This is not ideal but better than showing 0
        basePrice = item.unitPrice
      } else {
        // Use the converted amount
        basePrice = convertedAmount
      }
    } else {
      // Same currency - use unitPrice directly
      basePrice = item.unitPrice
    }
    
    const subtotal = item.quantity * basePrice
    const taxAmount = item.tax ? subtotal * (item.tax / 100) : 0
    return subtotal + taxAmount
  }

  // Handle currency conversion for item unit price
  const handleItemCurrencyConversion = async (itemId: string, amount: number, fromCurrency: CurrencyCode) => {
    if (!editedInvoice) return
    
    const baseCurrency = editedInvoice.currency as CurrencyCode
    
    if (fromCurrency === baseCurrency) {
      // Same currency, no conversion needed
      setItemConvertedAmounts(prev => ({
        ...prev,
        [itemId]: amount
      }))
      updateItem(itemId, {})
      return
    }

    try {
      const converted = await convertCurrency(amount, fromCurrency, baseCurrency)
      setItemConvertedAmounts(prev => ({
        ...prev,
        [itemId]: converted
      }))
      // Recalculate amount after conversion completes
      updateItem(itemId, {})
    } catch (error) {
      console.error('Error converting currency for item:', error)
      // Fallback: use amount as-is
      setItemConvertedAmounts(prev => ({
        ...prev,
        [itemId]: amount
      }))
      updateItem(itemId, {})
    }
  }

  // Handle item currency change - real-time conversion
  const handleItemCurrencyChange = async (itemId: string, newCurrency: CurrencyCode) => {
    // Update currency immediately
    setItemCurrencies(prev => ({
      ...prev,
      [itemId]: newCurrency
    }))
    
    // Get current unit price
    const item = editedInvoice?.items.find(i => i.id === itemId)
    if (item && item.unitPrice > 0) {
      // Convert immediately when currency changes - this triggers recalculation
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

  // Handle unit price change - real-time formatting and conversion
  const handleUnitPriceChange = async (itemId: string, value: string) => {
    // Get current display value to detect if user is deleting
    const currentDisplay = itemDisplayValues[itemId] || ""
    const currentDisplayCleaned = currentDisplay.replace(/,/g, "")
    const newValueCleaned = value.replace(/,/g, "")
    const isDeleting = newValueCleaned.length < currentDisplayCleaned.length || 
                       (newValueCleaned.length === currentDisplayCleaned.length && value !== currentDisplay)
    
    // Allow empty string
    if (value === "") {
      setItemDisplayValues(prev => ({
        ...prev,
        [itemId]: ""
      }))
      setItemConvertedAmounts(prev => ({
        ...prev,
        [itemId]: 0
      }))
      updateItem(itemId, { unitPrice: 0 })
      return
    }
    
    // During deletion, preserve the raw input exactly as typed to allow deleting trailing zeros
    // Only format when not deleting (user is typing/adding characters)
    let formatted: string
    if (isDeleting) {
      // When deleting, preserve the input exactly as-is (including trailing zeros and leading zeros)
      // Just add commas to integer part, but preserve everything else exactly
      const cleaned = value.replace(/,/g, "")
      
      // Check if it's just "0" or starts with "0" followed by digits (like "01", "02", etc.)
      if (cleaned === "0" || /^0\d/.test(cleaned)) {
        // Preserve leading zeros exactly
        formatted = cleaned
      } else {
        // Normal case: format integer part with commas, preserve decimal exactly
        const parts = cleaned.split(".")
        const integerPart = parts[0] || ""
        const decimalPart = parts[1] !== undefined ? parts[1] : ""
        
        // Only format integer part with commas if it's not empty
        const formattedInteger = integerPart ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
        
        if (parts.length > 1) {
          formatted = decimalPart !== "" ? `${formattedInteger}.${decimalPart}` : `${formattedInteger}.`
        } else {
          formatted = formattedInteger || "0"
        }
      }
    } else {
      // When typing, use standard formatting
      formatted = formatCurrencyInput(value)
    }
    
    // Update the display value immediately for visual feedback
    setItemDisplayValues(prev => ({
      ...prev,
      [itemId]: formatted
    }))
    
    // Parse the currency input to get numeric value
    const parsed = parseCurrencyInput(formatted)
    const numericValue = parseFloat(parsed) || 0
    
    // Get item currency (default to invoice currency)
    const itemCurrency = itemCurrencies[itemId] || editedInvoice?.currency || invoice?.currency
    const baseCurrency = editedInvoice?.currency || invoice?.currency
    
    // If unit price is 0, clear converted amount and update
    if (numericValue === 0) {
      setItemConvertedAmounts(prev => ({
        ...prev,
        [itemId]: 0
      }))
      updateItem(itemId, { unitPrice: 0 })
      return
    }
    
    // Convert currency FIRST if needed, then update unitPrice
    // This ensures conversion is done before calculation
    if (numericValue > 0 && itemCurrency !== baseCurrency) {
      try {
        // Convert immediately and wait for it
        const converted = await convertCurrency(numericValue, itemCurrency as CurrencyCode, baseCurrency as CurrencyCode)
        setItemConvertedAmounts(prev => ({
          ...prev,
          [itemId]: converted
        }))
        // Now update unitPrice - this will use the converted amount in calculation
        updateItem(itemId, { unitPrice: numericValue })
      } catch (error) {
        console.error('Error converting currency:', error)
        // On error, still update but use unitPrice (will be wrong)
        setItemConvertedAmounts(prev => ({
          ...prev,
          [itemId]: numericValue
        }))
        updateItem(itemId, { unitPrice: numericValue })
      }
    } else if (itemCurrency === baseCurrency && numericValue > 0) {
      // Same currency, set converted amount to unitPrice
      setItemConvertedAmounts(prev => ({
        ...prev,
        [itemId]: numericValue
      }))
      // Update unitPrice and recalculate
      updateItem(itemId, { unitPrice: numericValue })
    } else {
      // Just update (for 0 or edge cases)
      updateItem(itemId, { unitPrice: numericValue })
    }
  }

  // Handle invoice currency change
  const handleInvoiceCurrencyChange = async (newCurrency: CurrencyCode) => {
    if (!editedInvoice) return
    
    const oldCurrency = editedInvoice.currency as CurrencyCode
    setEditedInvoice(prev => prev ? { ...prev, currency: newCurrency } : null)
    
    // Convert all item amounts if currency changed
    if (oldCurrency !== newCurrency) {
      for (const item of editedInvoice.items) {
        if (item.unitPrice > 0) {
          const itemCurrency = itemCurrencies[item.id] || oldCurrency
          // If item currency matches old invoice currency, convert it
          if (itemCurrency === oldCurrency) {
            await handleItemCurrencyConversion(item.id, item.unitPrice, oldCurrency)
          }
        }
      }
    }
  }

  // Helper to update item in edited invoice
  const updateItem = (itemId: string, updates: Partial<InvoiceItem>) => {
    if (editedInvoice) {
      const updatedItems = editedInvoice.items.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, ...updates }
          // Recalculate amount when quantity, unitPrice, or tax changes
          updated.amount = calculateItemAmount(updated)
          return updated
        }
        return item
      })
      
      // Recalculate totals using converted amounts
      let subtotal = 0
      let totalTaxAmount = 0
      
      updatedItems.forEach(item => {
        if (item.unitPrice === 0) return
        
        const itemCurrency = itemCurrencies[item.id] || (item.currency as CurrencyCode) || editedInvoice.currency
        const baseCurrency = editedInvoice.currency as CurrencyCode
        
        // Get base price - MUST use converted amount if currencies differ
        let basePrice: number
        if (itemCurrency !== baseCurrency) {
          // Different currency - must use converted amount
          const convertedAmount = itemConvertedAmounts[item.id]
          if (convertedAmount === undefined || convertedAmount === 0) {
            // Conversion not done yet - use unitPrice temporarily (will be wrong until conversion)
            // This ensures totals are calculated, but they'll update after conversion completes
            basePrice = item.unitPrice
          } else {
            basePrice = convertedAmount
          }
        } else {
          // Same currency - use unitPrice directly
          basePrice = item.unitPrice
        }
        
        const itemSubtotal = item.quantity * basePrice
        subtotal += itemSubtotal
        
        const itemTaxAmount = item.tax ? itemSubtotal * (item.tax / 100) : 0
        totalTaxAmount += itemTaxAmount
      })
      
      const discountAmount = editedInvoice.discount ? subtotal * (editedInvoice.discount / 100) : 0
      const total = subtotal + totalTaxAmount - discountAmount
      
      setEditedInvoice({
        ...editedInvoice,
        items: updatedItems,
        subtotal,
        taxAmount: totalTaxAmount,
        total
      })
    }
  }
  
  if (!invoice || !profile?.userId || (!isSender && !isRecipient && !isClient)) {
    if (invoice && profile?.userId) {
      toast.error("You don't have permission to view this invoice")
      onOpenChange(false)
    }
    return null
  }
  
  // Get the appropriate payment status based on user role
  const paymentStatus = isClient || isRecipient 
    ? invoice.clientPaymentStatus || 'pending'
    : invoice.supplierPaymentStatus || 'pending'

  const currencySymbol = getCurrencySymbol(invoice.currency as any)

  const handleReceiptUpload = async (file: File): Promise<string | null> => {
    if (!user?.uid || !invoice) return null

    try {
      setIsUploadingReceipt(true)
      
      // Upload to ImageKit
      const result = await uploadToImageKit(file, 'invoices/receipts')
      
      // Return the ImageKit URL
      return result.url
    } catch (error) {
      console.error("Error uploading receipt to ImageKit:", error)
      toast.error("Failed to upload receipt")
      return null
    } finally {
      setIsUploadingReceipt(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!profile?.userId || !invoice) return

    // This function is only for clients/recipients
    if (!isClient && !isRecipient) {
      toast.error("Only the client can mark this invoice as paid")
      return
    }

    try {
      setIsMarkingPaid(true)

      let receiptUrl: string | undefined

      // Get ImageKit URL from file if already uploaded, otherwise upload now
      if (receiptFile) {
        // Check if file already has ImageKit URL (uploaded when selected)
        if ((receiptFile as any).imageKitUrl) {
          receiptUrl = (receiptFile as any).imageKitUrl
        } else {
          // Fallback: upload now if not already uploaded
          const uploadedUrl = await handleReceiptUpload(receiptFile)
          if (uploadedUrl) {
            receiptUrl = uploadedUrl
          }
        }
      }

      if (!receiptUrl) {
        toast.error("Please upload a receipt")
        setIsMarkingPaid(false)
        return
      }
      
      // Only client can mark as paid
      if (!isClient && !isRecipient) {
        toast.error("Only the client can mark this invoice as paid")
        setIsMarkingPaid(false)
        return
      }

      const result = await invoiceService.markAsPaid(
        invoice.id,
        profile.userId,
        paymentMethod || undefined,
        paymentReference || undefined,
        receiptUrl,
        taxDeductible
      )

      if (result.success) {
        toast.success("Bill marked as paid and transaction created")
        setShowPaymentForm(false)
        setPaymentMethod("")
        setPaymentReference("")
        setReceiptFile(null)
        setTaxDeductible(true) // Reset to default
        onInvoiceUpdated?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || "Failed to mark bill as paid")
      }
    } catch (error) {
      console.error("Error marking bill as paid:", error)
      toast.error("Failed to mark bill as paid")
    } finally {
      setIsMarkingPaid(false)
    }
  }

  const handleConfirmPaymentReceived = async (e?: React.MouseEvent) => {
    // Prevent default dialog close behavior
    e?.preventDefault()
    e?.stopPropagation()
    
    console.log("handleConfirmPaymentReceived called", { 
      hasProfile: !!profile?.userId, 
      hasInvoice: !!invoice,
      invoiceUserId: invoice?.userId,
      profileUserId: profile?.userId,
      isMarkingPaid 
    })
    
    if (!profile?.userId || !invoice) {
      console.log("Early return: missing profile or invoice")
      return
    }

    // This function is only for issuers (senders)
    if (invoice.userId !== profile.userId) {
      console.log("Early return: user is not the issuer")
      toast.error("Only the issuer can confirm payment received")
      return
    }

    // Don't proceed if already processing
    if (isMarkingPaid) {
      console.log("Early return: already processing")
      return
    }

    try {
      console.log("Setting isMarkingPaid to true")
      setIsMarkingPaid(true)

      const result = await invoiceService.confirmPaymentReceived(
        invoice.id,
        profile.userId,
        paymentMethod || undefined,
        paymentReference || undefined
      )

      if (result.success) {
        toast.success("Payment confirmed and transaction created")
        setPaymentMethod("")
        setPaymentReference("")
        onInvoiceUpdated?.()
        // Close confirmation modal first
        setShowConfirmDialog(false)
        // Wait for confirmation modal to fully close before closing main dialog
        setTimeout(() => {
          onOpenChange(false)
        }, 300)
      } else {
        toast.error(result.error || "Failed to confirm payment")
        // Don't close dialog on error so user can retry
      }
    } catch (error) {
      console.error("Error confirming payment:", error)
      toast.error("Failed to confirm payment")
      // Don't close dialog on error so user can retry
    } finally {
      setIsMarkingPaid(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // TODO: Generate PDF and download
    toast.info("PDF download coming soon")
  }

  const handleSaveEdit = async () => {
    if (!editedInvoice || !profile?.userId) return

    setIsSaving(true)
    try {
      const result = await invoiceService.updateInvoice(
        editedInvoice.id,
        profile.userId,
        {
          client: editedInvoice.client,
          supplier: editedInvoice.supplier,
          items: editedInvoice.items,
          issueDate: editedInvoice.issueDate,
          dueDate: editedInvoice.dueDate,
          currency: editedInvoice.currency,
          discount: editedInvoice.discount,
          notes: editedInvoice.notes,
          terms: editedInvoice.terms,
          paymentTerms: editedInvoice.paymentTerms,
          paymentInstructions: editedInvoice.paymentInstructions,
          subtotal: editedInvoice.subtotal,
          taxAmount: editedInvoice.taxAmount,
          total: editedInvoice.total
        }
      )

      if (result.success) {
        toast.success("Invoice updated successfully")
        setIsEditing(false)
        setEditedInvoice(null)
        onInvoiceUpdated?.()
      } else {
        toast.error(result.error || "Failed to update invoice")
      }
    } catch (error) {
      console.error("Error updating invoice:", error)
      toast.error("Failed to update invoice")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedInvoice(null)
  }

  return (
    <>
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        // If main dialog is closing, also close the confirmation dialog
        if (!isOpen && showConfirmDialog) {
          setShowConfirmDialog(false)
        }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {displayAsIncoming ? 'Bill' : 'Invoice'} {invoice.invoiceNumber}
            </DialogTitle>
            <div className="flex gap-2">
              {/* Edit/Save/Cancel buttons - only for issuer when client hasn't paid */}
              {isSender && invoice.clientPaymentStatus !== 'paid' && (
                <>
                  {!isEditing ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  )}
                </>
              )}
              {!isEditing && (
                <>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Left Column - Invoice Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Invoice Header Card */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Calculator className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {isSender 
                          ? (currentInvoice?.supplier?.businessName || currentInvoice?.supplier?.name || "Your Company")
                          : (currentInvoice?.supplier?.businessName || currentInvoice?.supplier?.name || "Supplier")}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Invoice #{currentInvoice?.invoiceNumber || invoice.invoiceNumber} • {format(new Date(currentInvoice?.issueDate || invoice.issueDate), "MM/dd/yyyy")}
                      </p>
                    </div>
                  </div>
                  {!isEditing && (
                    <Badge variant={(currentInvoice || invoice).status === 'paid' ? 'default' : (currentInvoice || invoice).status === 'overdue' ? 'destructive' : 'secondary'}>
                      {(currentInvoice || invoice).status === 'sent' && displayAsIncoming 
                        ? 'Received' 
                        : ((currentInvoice || invoice).status.charAt(0).toUpperCase() + (currentInvoice || invoice).status.slice(1))}
                    </Badge>
                  )}
                </div>
                {isEditing && editedInvoice && (
                  <div className="mt-4">
                    <Label className="text-xs text-muted-foreground mb-2 block">Currency</Label>
                    <Select
                      value={editedInvoice.currency}
                      onValueChange={(value) => handleInvoiceCurrencyChange(value as CurrencyCode)}
                    >
                      <SelectTrigger className="w-full">
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
                )}
              </Card>

              {/* Client Information Card */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {isSender ? "Bill To" : displayAsIncoming ? "Bill To (You)" : "Client Information"}
                </h3>
                {isEditing && editedInvoice ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Business Name (Optional)</Label>
                      <Input
                        value={editedInvoice.client.businessName || ""}
                        onChange={(e) => updateClient({ businessName: e.target.value })}
                        placeholder="Business name"
                        className="h-9 mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Name *</Label>
                      <Input
                        value={editedInvoice.client.name}
                        onChange={(e) => updateClient({ name: e.target.value })}
                        placeholder="Client name"
                        className="h-9 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <Input
                        type="email"
                        value={editedInvoice.client.email || ""}
                        onChange={(e) => updateClient({ email: e.target.value })}
                        placeholder="Email"
                        className="h-9 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      <Input
                        value={editedInvoice.client.phone || ""}
                        onChange={(e) => updateClient({ phone: e.target.value })}
                        placeholder="Phone"
                        className="h-9 mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Street Address</Label>
                      <Input
                        value={editedInvoice.client.address?.street || ""}
                        onChange={(e) => updateClient({
                          address: { ...editedInvoice.client.address, street: e.target.value }
                        })}
                        placeholder="Street address"
                        className="h-9 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">City</Label>
                      <Input
                        value={editedInvoice.client.address?.city || ""}
                        onChange={(e) => updateClient({
                          address: { ...editedInvoice.client.address, city: e.target.value }
                        })}
                        placeholder="City"
                        className="h-9 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">State</Label>
                      <Input
                        value={editedInvoice.client.address?.state || ""}
                        onChange={(e) => updateClient({
                          address: { ...editedInvoice.client.address, state: e.target.value }
                        })}
                        placeholder="State"
                        className="h-9 mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Tax ID (TIN)</Label>
                      <Input
                        value={editedInvoice.client.taxId || ""}
                        onChange={(e) => updateClient({ taxId: e.target.value })}
                        placeholder="Tax ID"
                        className="h-9 mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {currentInvoice?.client.businessName && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Business Name</p>
                        <p className="font-semibold text-sm">{currentInvoice.client.businessName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Name</p>
                      <p className="font-semibold text-sm">{currentInvoice?.client.name || invoice.client.name}</p>
                    </div>
                    {(currentInvoice?.client.email || invoice.client.email) && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Email</p>
                        <p className="text-sm font-medium">{currentInvoice?.client.email || invoice.client.email}</p>
                      </div>
                    )}
                    {(currentInvoice?.client.phone || invoice.client.phone) && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Phone</p>
                        <p className="text-sm font-medium">{currentInvoice?.client.phone || invoice.client.phone}</p>
                      </div>
                    )}
                    {currentInvoice?.client.address && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Address</p>
                        <div className="text-sm font-medium">
                          {currentInvoice.client.address.street && <p>{currentInvoice.client.address.street}</p>}
                          {(currentInvoice.client.address.city || currentInvoice.client.address.state) && (
                            <p>
                              {currentInvoice.client.address.city}
                              {currentInvoice.client.address.city && currentInvoice.client.address.state && ", "}
                              {currentInvoice.client.address.state}
                            </p>
                          )}
                          {currentInvoice.client.address.postalCode && <p>{currentInvoice.client.address.postalCode}</p>}
                          {currentInvoice.client.address.country && <p>{currentInvoice.client.address.country}</p>}
                        </div>
                      </div>
                    )}
                    {(currentInvoice?.client.taxId || invoice.client.taxId) && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tax ID (TIN)</p>
                        <p className="text-sm font-medium">{currentInvoice?.client.taxId || invoice.client.taxId}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column - Payment Summary */}
            <div className="lg:col-span-1 space-y-4">
              {/* Payment Summary Card */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrencyAmount((currentInvoice || invoice).subtotal, (currentInvoice || invoice).currency as any)}</span>
                  </div>
                  {(currentInvoice || invoice).taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">{formatCurrencyAmount((currentInvoice || invoice).taxAmount, (currentInvoice || invoice).currency as any)}</span>
                    </div>
                  )}
                  {exchangeRate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Exchange Rate</span>
                      <span className="font-medium text-xs">{exchangeRate}</span>
                    </div>
                  )}
                  {currentInvoice?.discount && currentInvoice.discount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Discount ({currentInvoice.discount}%)</span>
                      <span>-{formatCurrencyAmount((currentInvoice.subtotal || 0) * (currentInvoice.discount / 100), currentInvoice.currency as any)}</span>
                    </div>
                  )}
                  {!currentInvoice?.discount && invoice.discount && invoice.discount > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Discount ({invoice.discount}%)</span>
                      <span>-{formatCurrencyAmount(invoice.subtotal * (invoice.discount / 100), invoice.currency as any)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-3 mt-3">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrencyAmount((currentInvoice || invoice).total, (currentInvoice || invoice).currency as any)}</span>
                  </div>
                </div>

                {/* Payment Actions */}
                {!(invoice.clientPaymentStatus === 'paid' && invoice.supplierPaymentStatus === 'paid') && (
                  <div className="mt-6 space-y-3">
                    {(isClient || isRecipient) ? (
                      !showPaymentForm ? (
                        <Button 
                          onClick={() => setShowPaymentForm(true)}
                          className="w-full bg-primary hover:bg-primary/90"
                          disabled={invoice.clientPaymentStatus === 'paid'}
                        >
                          {invoice.clientPaymentStatus === 'paid' ? 'Payment Marked' : 'Mark as Paid'}
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="payment-method" className="text-xs">Payment Method</Label>
                            <Input
                              id="payment-method"
                              placeholder="e.g., Bank Transfer, Cash, Card"
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label htmlFor="payment-reference" className="text-xs">Payment Reference (Optional)</Label>
                            <Input
                              id="payment-reference"
                              placeholder="Transaction ID or reference number"
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label htmlFor="receipt-upload" className="text-xs">Upload Receipt (Required)</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id="receipt-upload"
                                type="file"
                                accept="image/*,.pdf"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    setReceiptFile(file)
                                    setIsUploadingReceipt(true)
                                    try {
                                      const result = await uploadToImageKit(file, 'invoices/receipts')
                                      ;(file as any).imageKitUrl = result.url
                                      toast.success("Receipt uploaded successfully")
                                    } catch (error) {
                                      console.error("Error uploading receipt:", error)
                                      toast.error("Failed to upload receipt")
                                      setReceiptFile(null)
                                    } finally {
                                      setIsUploadingReceipt(false)
                                    }
                                  }
                                }}
                                disabled={isUploadingReceipt}
                                className="flex-1 h-9"
                              />
                              {receiptFile && !isUploadingReceipt && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setReceiptFile(null)}
                                  className="h-9"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                              {isUploadingReceipt && (
                                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted h-9">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="tax-deductible"
                              checked={taxDeductible}
                              onCheckedChange={(checked) => setTaxDeductible(checked === true)}
                            />
                            <Label
                              htmlFor="tax-deductible"
                              className="text-xs font-normal cursor-pointer"
                            >
                              This expense is tax deductible
                            </Label>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleMarkAsPaid}
                              disabled={isMarkingPaid || isUploadingReceipt || !receiptFile}
                              className="flex-1 bg-primary hover:bg-primary/90"
                            >
                              {isMarkingPaid || isUploadingReceipt ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                "Confirm Payment"
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowPaymentForm(false)
                                setPaymentMethod("")
                                setPaymentReference("")
                                setReceiptFile(null)
                                setTaxDeductible(true)
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )
                    ) : isSender ? (
                      <Button 
                        onClick={() => setShowConfirmDialog(true)}
                        className="w-full bg-primary hover:bg-primary/90"
                        disabled={invoice.supplierPaymentStatus === 'paid'}
                      >
                        {invoice.supplierPaymentStatus === 'paid' ? 'Payment Confirmed' : 'Confirm Payment Received'}
                      </Button>
                    ) : null}
                  </div>
                )}
              </Card>

              {/* Pro Tip Card */}
              <Card className="p-6 bg-gradient-to-br from-purple-500 to-blue-600 text-white">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-2">Pro Tip</h4>
                    <p className="text-sm text-white/90">
                      You can switch currencies per item. The total is automatically converted to NGN based on current rates.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Items Table Card - Full Width */}
          <div className="px-6 pb-6">
              <Card className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-4">Items</h3>
                  {isEditing && editedInvoice ? (
                    <div className="space-y-3">
                      {editedInvoice.items.map((item, index) => (
                        <div key={item.id || index} className="grid grid-cols-12 gap-3 items-center p-3 border rounded-lg">
                          <div className="col-span-4">
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(item.id, { description: e.target.value })}
                              placeholder="Description"
                              className="h-9"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                              placeholder="Qty"
                              className="h-9"
                            />
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <Select
                              value={itemCurrencies[item.id] || editedInvoice?.currency || invoice.currency}
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
                              value={itemDisplayValues[item.id] || item.unitPrice.toString()}
                              onChange={(e) => handleUnitPriceChange(item.id, e.target.value)}
                              className="h-9 flex-1"
                            />
                          </div>
                          <div className="col-span-2 flex items-center gap-1">
                            <Info className="w-4 h-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              value={item.tax || 0}
                              onChange={(e) => updateItem(item.id, { tax: parseFloat(e.target.value) || 0 })}
                              placeholder="Tax"
                              className="h-9 flex-1"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                          <div className="col-span-2 text-right">
                            <p className="font-semibold">{formatCurrencyAmount(calculateItemAmount(item), currentInvoice?.currency as any || invoice?.currency as any)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3 text-sm font-semibold">Description</th>
                            <th className="text-center p-3 text-sm font-semibold">Quantity</th>
                            <th className="text-right p-3 text-sm font-semibold">Unit Price</th>
                            <th className="text-right p-3 text-sm font-semibold">Tax (%)</th>
                            <th className="text-right p-3 text-sm font-semibold">Amount (₦)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(currentInvoice?.items || invoice.items).map((item, index) => (
                            <tr key={item.id || index} className="border-t hover:bg-muted/30 transition-colors">
                              <td className="p-3">{item.description}</td>
                              <td className="p-3 text-center">{item.quantity}</td>
                              <td className="p-3 text-right">
                                <span className="text-muted-foreground">
                                  {item.currency ? getCurrencySymbol(item.currency as any) : currencySymbol}
                                </span>
                                {item.unitPrice.toLocaleString()}
                              </td>
                              <td className="p-3 text-right">
                                {item.tax ? `${item.tax}%` : "—"}
                              </td>
                              <td className="p-3 text-right font-semibold">
                                {formatCurrencyAmount(calculateItemAmount(item), currentInvoice?.currency as any || invoice?.currency as any)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {/* Confirmation Dialog for Outgoing Invoices */}
    <Dialog open={showConfirmDialog} onOpenChange={(open) => {
      if (!isMarkingPaid) {
        setShowConfirmDialog(open)
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Payment Received</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you have received payment for this invoice? This will mark the invoice as paid and create a transaction record.
          </p>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (!isMarkingPaid) {
                  setShowConfirmDialog(false)
                }
              }}
              disabled={isMarkingPaid}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPaymentReceived}
              disabled={isMarkingPaid}
            >
              {isMarkingPaid ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Yes, Confirm Payment"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
               