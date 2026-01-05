"use client"

import { useState, useEffect, Fragment } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Download, Printer, ExternalLink, Upload, X, FileText, Loader2, Edit, Save, XCircle, Calculator, Plus, Info, Receipt, Mail } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Invoice, InvoiceType, InvoiceClient, InvoiceItem } from "@/lib/types"
import { getCurrencySymbol, formatCurrencyAmount, formatCurrencyInput, parseCurrencyInput, SUPPORTED_CURRENCIES, CurrencyCode, fetchExchangeRate, convertCurrency } from "@/lib/utils/currency"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { invoiceService, documentService } from "@/lib/services"
import { uploadToImageKit, ImageUploadResult } from "@/lib/utils/imagekit"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useBusiness } from "@/lib/contexts/business-context"

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
  const { entities } = useBusiness()
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptUploadResult, setReceiptUploadResult] = useState<ImageUploadResult | null>(null)
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false)
  const [taxDeductible, setTaxDeductible] = useState(true) // Default to true for bills
  const [showWHTForm, setShowWHTForm] = useState(false)
  const [whtRate, setWhtRate] = useState(5)
  const [whtCertificateNumber, setWhtCertificateNumber] = useState("")
  const [whtNotes, setWhtNotes] = useState("")
  const [isDeductingWHT, setIsDeductingWHT] = useState(false)
  const [showCreditNoteDialog, setShowCreditNoteDialog] = useState(false)
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
  const [shouldSaveReceipt, setShouldSaveReceipt] = useState(false)
  const [isSavingReceipt, setIsSavingReceipt] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>(invoice?.recipientEntityId)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState("")

  // Sync selectedEntityId with invoice prop
  useEffect(() => {
    setSelectedEntityId(invoice?.recipientEntityId)
  }, [invoice?.recipientEntityId])

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
      try {
        const copied = JSON.parse(JSON.stringify(invoice)) // Deep copy
        
        // Initialize item currencies and display values
        const currencies: Record<string, CurrencyCode> = {}
        const displays: Record<string, string> = {}
        const converted: Record<string, number> = {}
        const baseCurrency = copied.currency as CurrencyCode
        
        // First, set the basic state synchronously
        copied.items.forEach((item: InvoiceItem) => {
          const itemCurrency = (item.currency as CurrencyCode) || baseCurrency || "NGN"
          currencies[item.id] = itemCurrency
          displays[item.id] = item.unitPrice.toString()
          
          // If item currency matches base currency, use unitPrice directly
          if (itemCurrency === baseCurrency) {
            converted[item.id] = item.unitPrice
          } else {
            // Start with unitPrice, will be updated after conversion
            converted[item.id] = item.unitPrice
          }
        })
        
        // Set initial state
        setItemCurrencies(currencies)
        setItemDisplayValues(displays)
        setItemConvertedAmounts(converted)
        setEditedInvoice(copied)
        
        // Then do async conversions if needed (but don't block)
        copied.items.forEach((item: InvoiceItem) => {
          const itemCurrency = currencies[item.id]
          if (itemCurrency !== baseCurrency && item.unitPrice > 0) {
            convertCurrency(item.unitPrice, itemCurrency, baseCurrency)
              .then(convertedAmount => {
                setItemConvertedAmounts(prev => ({
                  ...prev,
                  [item.id]: convertedAmount
                }))
                // Recalculate totals after conversion
                setEditedInvoice(prev => {
                  if (!prev) return prev
                  
                  // Recalculate subtotal with converted amount
                  let subtotal = 0
                  let vatableSubtotal = 0
                  
                  prev.items.forEach((i: InvoiceItem) => {
                    const ic = currencies[i.id] || (i.currency as CurrencyCode) || prev.currency
                    const bc = prev.currency as CurrencyCode
                    const bp = ic !== bc 
                      ? (i.id === item.id ? convertedAmount : (converted[i.id] || i.unitPrice))
                      : i.unitPrice
                    const itemSubtotal = i.quantity * bp
                    subtotal += itemSubtotal
                    if (i.vatable) {
                      vatableSubtotal += itemSubtotal
                    }
                  })
                  
                  const discountAmount = prev.discount ? subtotal * (prev.discount / 100) : 0
                  const subtotalAfterDiscount = subtotal - discountAmount
                  const vatableDiscountAmount = vatableSubtotal > 0 && subtotal > 0 
                    ? (vatableSubtotal / subtotal) * discountAmount 
                    : 0
                  const vatableSubtotalAfterDiscount = vatableSubtotal - vatableDiscountAmount
                  const vatRate = prev.vatRate || 7.5
                  const vatAmount = vatableSubtotalAfterDiscount * (vatRate / 100)
                  const invoiceTotal = subtotalAfterDiscount + vatAmount
                  
                  return {
                    ...prev,
                    subtotal,
                    vatAmount,
                    taxAmount: vatAmount,
                    invoiceTotal,
                    total: invoiceTotal
                  }
                })
              })
              .catch(error => {
                console.error('Error converting currency on init:', error)
                // On error, keep the original unitPrice
              })
          }
        })
      } catch (error) {
        console.error('Error initializing edit mode:', error)
        toast.error('Failed to initialize edit mode')
        setIsEditing(false)
      }
    }
  }, [invoice, isEditing]) // Removed editedInvoice from dependencies to prevent loops

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
    
    // Amount is just subtotal (no item-level tax/VAT)
    const subtotal = item.quantity * basePrice
    return subtotal
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
          // Recalculate amount when quantity or unitPrice changes
          updated.amount = calculateItemAmount(updated)
          return updated
        }
        return item
      })
      
      // Recalculate totals using converted amounts
      let subtotal = 0
      let vatableSubtotal = 0
      
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
        
        // Only include in vatable subtotal if item is marked as vatable
        if (item.vatable) {
          vatableSubtotal += itemSubtotal
        }
      })
      
      const discountAmount = editedInvoice.discount ? subtotal * (editedInvoice.discount / 100) : 0
      const subtotalAfterDiscount = subtotal - discountAmount
      
      // Apply discount proportionally to vatable subtotal
      const vatableDiscountAmount = vatableSubtotal > 0 && subtotal > 0 
        ? (vatableSubtotal / subtotal) * discountAmount 
        : 0
      const vatableSubtotalAfterDiscount = vatableSubtotal - vatableDiscountAmount
      
      // Calculate VAT only on vatable items after discount
      const vatRate = editedInvoice.vatRate || 7.5
      const vatAmount = vatableSubtotalAfterDiscount * (vatRate / 100)
      
      // Invoice Total = Subtotal (after discount) + VAT
      const invoiceTotal = subtotalAfterDiscount + vatAmount
      
      // Note: WHT is deducted by client, not calculated here
      // Final Total = Invoice Total (WHT will be deducted by client if applicable)
      const total = invoiceTotal
      
      setEditedInvoice({
        ...editedInvoice,
        items: updatedItems,
        subtotal,
        vatAmount,
        taxAmount: vatAmount, // Legacy field
        invoiceTotal,
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
      const result = await uploadToImageKit(file, 'invoices/receipts', user?.uid)
      
      // Store the upload result (includes size)
      setReceiptUploadResult(result)
      
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
      let uploadResult: ImageUploadResult | null = null

      // Get ImageKit URL from file if already uploaded, otherwise upload now
      if (receiptFile) {
        // Use stored upload result if available
        if (receiptUploadResult) {
          receiptUrl = receiptUploadResult.url
          uploadResult = receiptUploadResult
        } else if ((receiptFile as any).imageKitUrl) {
          // Fallback: check if file already has ImageKit URL (uploaded when selected)
          receiptUrl = (receiptFile as any).imageKitUrl
          // Try to get upload result from file metadata
          uploadResult = (receiptFile as any).uploadResult || null
        } else {
          // Fallback: upload now if not already uploaded
          const uploadedUrl = await handleReceiptUpload(receiptFile)
          if (uploadedUrl && receiptUploadResult) {
            receiptUrl = uploadedUrl
            uploadResult = receiptUploadResult
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

      // Save receipt to document database with file size
      if (receiptFile && uploadResult && user?.uid) {
        try {
          await documentService.uploadDocument(user.uid, {
            file: receiptFile,
            name: `Invoice Payment Receipt - ${invoice.invoiceNumber}`,
            type: "receipt",
            imageKitUrl: receiptUrl,
            imageKitFileId: uploadResult.fileId, // Store fileId for deletion
            fileSize: uploadResult.size, // Use size from ImageKit upload result
            date: new Date().toISOString(),
            notes: `Invoice: ${invoice.invoiceNumber}, Payment Method: ${paymentMethod || 'N/A'}, Reference: ${paymentReference || 'N/A'}`,
            linkedTransaction: undefined // Will be linked after transaction is created
          })
        } catch (error) {
          console.error("Error saving receipt to documents:", error)
          // Don't block the payment flow if document save fails
        }
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
        setReceiptUploadResult(null)
        setTaxDeductible(true) // Reset to default
        onInvoiceUpdated?.()
        
        // Dispatch event to refresh transaction list
        window.dispatchEvent(new CustomEvent('transactionChanged', {
          detail: {
            action: 'created',
            invoiceId: invoice.id
          }
        }))
        
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

  const handleSaveReceiptToDocuments = async () => {
    if (!invoice?.clientReceiptUrl || !user?.uid) return

    setIsSavingReceipt(true)
    try {
      // Get auth token for API requests
      const authToken = await user?.getIdToken()
      
      // Fetch fileId and size from ImageKit using the receipt URL
      const response = await fetch(`/api/get-image-fileid?url=${encodeURIComponent(invoice.clientReceiptUrl)}`, {
        headers: {
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch receipt details')
      }

      const data = await response.json()
      if (!data.success || !data.fileId || !data.size) {
        throw new Error('Receipt details not found')
      }

      // Create a mock file object for documentService
      const fileName = invoice.clientReceiptUrl.split('/').pop() || `receipt-${invoice.invoiceNumber}.pdf`
      const mockFile = new File([''], fileName, { type: 'application/pdf' })

      // Save receipt to document database
      const result = await documentService.uploadDocument(user.uid, {
        file: mockFile,
        name: `Invoice Payment Receipt - ${invoice.invoiceNumber}`,
        type: "receipt",
        imageKitUrl: invoice.clientReceiptUrl,
        imageKitFileId: data.fileId,
        fileSize: data.size,
        date: invoice.clientPaidAt || new Date().toISOString(),
        notes: `Invoice: ${invoice.invoiceNumber}, Payment Method: ${invoice.clientPaymentMethod || 'N/A'}, Reference: ${invoice.clientPaymentReference || 'N/A'}`,
        linkedTransaction: invoice.linkedTransactionId || undefined
      })

      if (result.success) {
        // Explicitly update storage since this file was uploaded by the client, not the sender
        // The documentService assumes storage was already updated, but in this case it wasn't
        try {
          const storageResponse = await fetch('/api/user/update-storage', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken && { 'Authorization': `Bearer ${authToken}` })
            },
            body: JSON.stringify({
              additionalBytes: data.size
            })
          })

          if (!storageResponse.ok) {
            console.error('Failed to update storage, but document was saved')
          }
        } catch (storageError) {
          console.error('Error updating storage:', storageError)
          // Don't fail the whole operation if storage update fails
        }

        toast.success("Receipt saved to documents")
        setShouldSaveReceipt(false)
      } else {
        toast.error(result.error || "Failed to save receipt")
      }
    } catch (error) {
      console.error("Error saving receipt to documents:", error)
      toast.error("Failed to save receipt to documents")
    } finally {
      setIsSavingReceipt(false)
    }
  }

  const handleConfirmPaymentReceived = async (e?: React.MouseEvent) => {
    // Prevent default dialog close behavior
    e?.preventDefault()
    e?.stopPropagation()
    
    if (!profile?.userId || !invoice) {
      return
    }

    // This function is only for issuers (senders)
    if (invoice.userId !== profile.userId) {
      toast.error("Only the issuer can confirm payment received")
      return
    }

    // Don't proceed if already processing
    if (isMarkingPaid) {
      return
    }

    try {
      setIsMarkingPaid(true)

      const result = await invoiceService.confirmPaymentReceived(
        invoice.id,
        profile.userId
      )

      if (result.success) {
        // Save receipt to document database if user chose to save it
        if (shouldSaveReceipt && invoice.clientReceiptUrl && user?.uid) {
          await handleSaveReceiptToDocuments()
        }

        toast.success("Payment confirmed and transaction created")
        setShouldSaveReceipt(false)
        onInvoiceUpdated?.()
        
        // Dispatch event to refresh transaction list
        window.dispatchEvent(new CustomEvent('transactionChanged', {
          detail: {
            action: 'created',
            invoiceId: invoice.id
          }
        }))
        
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

  const handleDeductWHT = async () => {
    if (!profile?.userId || !invoice) return

    if (!isClient && !isRecipient) {
      toast.error("Only the client/buyer can deduct WHT")
      return
    }

    if (whtRate <= 0) {
      toast.error("Please enter a valid WHT rate")
      return
    }

    try {
      setIsDeductingWHT(true)

      const result = await invoiceService.deductWHT(
        invoice.id,
        profile.userId,
        whtRate,
        whtCertificateNumber || undefined,
        whtNotes || undefined
      )

      if (result.success) {
        toast.success("WHT deducted successfully. Credit note created.")
        setShowWHTForm(false)
        setWhtRate(5)
        setWhtCertificateNumber("")
        setWhtNotes("")
        onInvoiceUpdated?.()
      } else {
        toast.error(result.error || "Failed to deduct WHT")
      }
    } catch (error) {
      console.error("Error deducting WHT:", error)
      toast.error("Failed to deduct WHT")
    } finally {
      setIsDeductingWHT(false)
    }
  }

  const handleEntityChange = async (entityId: string) => {
    if (!profile?.userId || !invoice || !isRecipient) return

    const newEntityId = entityId === "none" ? undefined : entityId
    
    // Optimistically update the UI
    setSelectedEntityId(newEntityId)

    try {
      const result = await invoiceService.updateInvoice(invoice.id, profile.userId, {
        recipientEntityId: newEntityId
      })

      if (result.success) {
        toast.success("Business entity assigned successfully")
        onInvoiceUpdated?.()
      } else {
        // Revert on error
        setSelectedEntityId(invoice.recipientEntityId)
        toast.error(result.error || "Failed to assign business entity")
      }
    } catch (error) {
      // Revert on error
      setSelectedEntityId(invoice.recipientEntityId)
      console.error("Error updating entity:", error)
      toast.error("Failed to assign business entity")
    }
  }

  const handlePrint = () => {
    // Create a print window with the invoice content
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error("Please allow popups to print")
      return
    }

    const currentInv = currentInvoice || invoice
    const isIncoming = displayAsIncoming
    
    // Get the invoice content HTML
    // Get the logo URL - convert to base64 if needed, or use absolute URL
    const logoUrl = window.location.origin + '/logootax.jpg'

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${isIncoming ? 'Bill' : 'Invoice'} ${currentInv.invoiceNumber}</title>
  <style>
    @page {
      size: landscape;
      margin: 0.5in;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #000;
      background: #fff;
    }
    .print-container {
      max-width: 100%;
      padding: 20px;
    }
    .logo-section {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .logo-section img {
      max-height: 60px;
      width: auto;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .issuer-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .issuer-icon {
      width: 40px;
      height: 40px;
      background: #e5e7eb;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .issuer-details h2 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .issuer-details p {
      font-size: 11px;
      color: #6b7280;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: #e5e7eb;
      color: #374151;
    }
    .main-content {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    .left-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .right-column {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      background: #fff;
    }
    .card h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #111827;
    }
    .client-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .client-field {
      margin-bottom: 12px;
    }
    .client-field-label {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .client-field-value {
      font-size: 12px;
      font-weight: 500;
      color: #111827;
    }
    .payment-summary {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
    }
    .payment-summary h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .payment-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 12px;
    }
    .payment-row-label {
      color: #6b7280;
    }
    .payment-row-value {
      font-weight: 500;
      color: #111827;
    }
    .payment-total {
      display: flex;
      justify-content: space-between;
      padding-top: 12px;
      margin-top: 12px;
      border-top: 2px solid #e5e7eb;
      font-size: 16px;
      font-weight: bold;
    }
    .payment-total-value {
      color: #059669;
    }
    .payment-status {
      margin-top: 20px;
      padding: 12px;
      background: #d1fae5;
      border-radius: 6px;
      text-align: center;
      font-weight: 600;
      color: #059669;
    }
    .items-section {
      margin-top: 30px;
    }
    .items-section h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .items-table thead {
      background: #f9fafb;
    }
    .items-table th {
      padding: 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table th.text-right {
      text-align: right;
    }
    .items-table th.text-center {
      text-align: center;
    }
    .items-table td {
      padding: 12px;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
    }
    .items-table td.text-right {
      text-align: right;
    }
    .items-table td.text-center {
      text-align: center;
    }
    .pro-tip {
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      color: white;
      padding: 16px;
      border-radius: 8px;
      font-size: 11px;
    }
    .pro-tip h4 {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .pro-tip p {
      font-size: 11px;
      opacity: 0.9;
    }
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .print-container {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <!-- Logo Section -->
    <div class="logo-section">
      <img src="${logoUrl}" alt="OTax Logo" />
    </div>

    <!-- Header Section -->
    <div class="header-section">
      <div class="issuer-info">
        <div class="issuer-icon">📄</div>
        <div class="issuer-details">
          <h2>${isSender 
            ? (currentInv.supplier?.businessName || currentInv.supplier?.name || "Your Company")
            : (currentInv.supplier?.businessName || currentInv.supplier?.name || "Supplier")}</h2>
          <p>Invoice #${currentInv.invoiceNumber} • ${format(new Date(currentInv.issueDate), "MM/dd/yyyy")}</p>
          ${currentInv.supplier?.vatRegistrationNumber ? `<p style="font-size: 10px; color: #6b7280; margin-top: 4px;">VAT Reg: ${currentInv.supplier.vatRegistrationNumber}</p>` : ''}
        </div>
      </div>
      <div class="status-badge">
        ${currentInv.status === 'sent' && isIncoming 
          ? 'Received' 
          : (currentInv.status.charAt(0).toUpperCase() + currentInv.status.slice(1))}
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Left Column -->
      <div class="left-column">
        <!-- Client Information Card -->
        <div class="card">
          <h3>${isSender ? "Bill To" : isIncoming ? "Bill To (You)" : "Client Information"}</h3>
          <div class="client-grid">
            ${currentInv.client.businessName ? `
            <div class="client-field">
              <div class="client-field-label">Business Name</div>
              <div class="client-field-value">${currentInv.client.businessName}</div>
            </div>
            ` : ''}
            <div class="client-field">
              <div class="client-field-label">Name</div>
              <div class="client-field-value">${currentInv.client.name}</div>
            </div>
            ${currentInv.client.email ? `
            <div class="client-field">
              <div class="client-field-label">Email</div>
              <div class="client-field-value">${currentInv.client.email}</div>
            </div>
            ` : ''}
            ${currentInv.client.phone ? `
            <div class="client-field">
              <div class="client-field-label">Phone</div>
              <div class="client-field-value">${currentInv.client.phone}</div>
            </div>
            ` : ''}
            ${currentInv.client.address ? `
            <div class="client-field">
              <div class="client-field-label">Address</div>
              <div class="client-field-value">
                ${currentInv.client.address.street || ''}
                ${currentInv.client.address.street && (currentInv.client.address.city || currentInv.client.address.state) ? '<br>' : ''}
                ${currentInv.client.address.city || ''}
                ${currentInv.client.address.city && currentInv.client.address.state ? ', ' : ''}
                ${currentInv.client.address.state || ''}
                ${currentInv.client.address.postalCode ? '<br>' + currentInv.client.address.postalCode : ''}
                ${currentInv.client.address.country ? '<br>' + currentInv.client.address.country : ''}
              </div>
            </div>
            ` : ''}
            ${currentInv.client.taxId ? `
            <div class="client-field">
              <div class="client-field-label">Tax ID (TIN)</div>
              <div class="client-field-value">${currentInv.client.taxId}</div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="right-column">
        <!-- Payment Summary Card -->
        <div class="payment-summary">
          <h3>Payment Summary</h3>
          <div class="payment-row">
            <span class="payment-row-label">Subtotal</span>
            <span class="payment-row-value">${formatCurrencyAmount(currentInv.subtotal, currentInv.currency as any)}</span>
          </div>
          ${currentInv.discount && currentInv.discount > 0 ? `
          <div class="payment-row">
            <span class="payment-row-label">Discount (${currentInv.discount}%)</span>
            <span class="payment-row-value">-${formatCurrencyAmount(currentInv.subtotal * (currentInv.discount / 100), currentInv.currency as any)}</span>
          </div>
          ` : ''}
          ${((currentInv.vatAmount !== undefined && currentInv.vatAmount > 0) || currentInv.taxAmount > 0) ? `
          <div class="payment-row">
            <span class="payment-row-label">VAT (${currentInv.vatRate || 7.5}%)</span>
            <span class="payment-row-value">${formatCurrencyAmount(currentInv.vatAmount || currentInv.taxAmount, currentInv.currency as any)}</span>
          </div>
          ` : ''}
          ${(currentInv.invoiceTotal !== undefined) ? `
          <div class="payment-total" style="border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
            <span>Invoice Total</span>
            <span class="payment-total-value">${formatCurrencyAmount(currentInv.invoiceTotal, currentInv.currency as any)}</span>
          </div>
          ` : ''}
          ${(currentInv.whtDeducted && currentInv.whtAmount && currentInv.whtAmount > 0) ? `
          <div class="payment-row" style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px; color: #dc2626;">
            <span class="payment-row-label">Withholding Tax (${currentInv.whtRate || 5}%)</span>
            <span class="payment-row-value">-${formatCurrencyAmount(currentInv.whtAmount, currentInv.currency as any)}</span>
          </div>
          ${currentInv.whtCertificateNumber ? `
          <div class="payment-row" style="font-size: 10px; color: #6b7280; margin-top: 4px;">
            <span>WHT Certificate: ${currentInv.whtCertificateNumber}</span>
          </div>
          ` : ''}
          ${currentInv.whtDeductionDate ? `
          <div class="payment-row" style="font-size: 10px; color: #6b7280;">
            <span>Deducted: ${format(new Date(currentInv.whtDeductionDate), "MMM dd, yyyy")}</span>
          </div>
          ` : ''}
          ` : ''}
          <div class="payment-total" style="border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
            <span>Amount Payable</span>
            <span class="payment-total-value">${formatCurrencyAmount(currentInv.total, currentInv.currency as any)}</span>
          </div>
          ${(currentInv.clientPaymentStatus === 'paid' || currentInv.supplierPaymentStatus === 'paid') ? `
          <div class="payment-status">Payment Marked</div>
          ` : ''}
        </div>

      </div>
    </div>

    <!-- Items Table -->
    <div class="items-section">
      <h3>Items</h3>
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-center">Quantity</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Amount (${getCurrencySymbol(currentInv.currency as any)})</th>
            <th class="text-center">Vatable</th>
          </tr>
        </thead>
        <tbody>
          ${currentInv.items.map((item: InvoiceItem) => {
            const itemCurrency = item.currency || currentInv.currency
            const itemSubtotal = item.quantity * item.unitPrice
        // Amount is just subtotal (no item-level tax/VAT)
        const itemAmount = itemSubtotal
            const currencySymbol = getCurrencySymbol(currentInv.currency as any)
            const formattedAmount = `${currencySymbol}${itemAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            return `
            <tr>
              <td>${item.description}</td>
              <td class="text-center">${item.quantity}</td>
              <td class="text-right">${getCurrencySymbol(itemCurrency as any)}${item.unitPrice.toLocaleString()}</td>
              <td class="text-right">${formattedAmount}</td>
              <td class="text-center">${item.vatable ? '<span style="background: #d1fae5; color: #059669; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Yes</span>' : '<span style="background: #e5e7eb; color: #6b7280; padding: 2px 8px; border-radius: 4px; font-size: 11px;">No</span>'}</td>
            </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        // Close the window after printing (optional)
        // printWindow.close()
      }, 250)
    }
  }

  const handleDownload = () => {
    // TODO: Generate PDF and download
    toast.info("PDF download coming soon")
  }

  const handleSendViaEmail = async () => {
    if (!invoice || !profile?.userId || !user?.uid) return

    if (!recipientEmail.trim()) {
      toast.error("Please enter recipient email address")
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail.trim())) {
      toast.error("Please enter a valid email address")
      return
    }

    setIsSendingEmail(true)
    try {
      const authToken = await user.getIdToken()
      const response = await fetch('/api/invoices/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          recipientEmail: recipientEmail.trim(),
          senderUserId: profile.userId
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success(`Invoice email sent successfully to ${recipientEmail.trim()}`)
        setShowEmailDialog(false)
        setRecipientEmail("")
        onInvoiceUpdated?.()
      } else {
        toast.error(data.error || "Failed to send invoice email")
      }
    } catch (error) {
      console.error('Error sending invoice email:', error)
      toast.error("Failed to send invoice email")
    } finally {
      setIsSendingEmail(false)
    }
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
          vatRate: editedInvoice.vatRate,
          vatAmount: editedInvoice.vatAmount,
          taxAmount: editedInvoice.taxAmount, // Legacy field
          invoiceTotal: editedInvoice.invoiceTotal,
          // Note: WHT fields are not editable - they are set by client when deducting
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
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-7xl max-h-[95vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-3 sm:pb-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <DialogTitle className="text-base sm:text-lg md:text-xl break-words">
              {displayAsIncoming ? 'Bill' : 'Invoice'} {invoice.invoiceNumber}
            </DialogTitle>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:mr-8">
              {/* Send via Email button - only for sender */}
              {isSender && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRecipientEmail(invoice.client?.email || "")
                    setShowEmailDialog(true)
                  }}
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                >
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Send via Email</span>
                  <span className="sm:hidden">Email</span>
                </Button>
              )}
              {/* Edit/Save/Cancel buttons - only for issuer when client hasn't paid */}
              {isSender && invoice.clientPaymentStatus !== 'paid' && (
                <>
                  {!isEditing ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                      className="h-8 sm:h-9 text-xs sm:text-sm"
                    >
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                      <span className="sm:hidden">Edit</span>
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="h-8 sm:h-9 text-xs sm:text-sm"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                            <span className="hidden sm:inline">Saving...</span>
                            <span className="sm:hidden">Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                            <span className="hidden sm:inline">Save</span>
                            <span className="sm:hidden">Save</span>
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-8 sm:h-9 text-xs sm:text-sm"
                      >
                        <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                        <span className="hidden sm:inline">Cancel</span>
                        <span className="sm:hidden">Cancel</span>
                      </Button>
                    </>
                  )}
                </>
              )}
              {!isEditing && (
                <>
                  <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 sm:h-9 text-xs sm:text-sm">
                    <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Print</span>
                    <span className="sm:hidden">Print</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 sm:h-9 text-xs sm:text-sm">
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Download PDF</span>
                    <span className="sm:hidden">Download</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
            {/* Business Entity Selector for Received Invoices */}
            {isRecipient && !isSender && entities.length > 0 && (
              <Card className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <Label className="text-sm font-medium">Assign to Business Entity</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select which business entity this invoice belongs to for organization
                    </p>
                  </div>
                  <Select
                    value={selectedEntityId || "none"}
                    onValueChange={handleEntityChange}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Unassigned)</SelectItem>
                      {entities.map(entity => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            )}
            
            {/* Top Section: Invoice Header and Client Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {/* Left: Invoice Header */}
              <div className="lg:col-span-2">
                <Card className="p-3 sm:p-4 md:p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold mb-1 break-words">
                        {isSender 
                          ? (currentInvoice?.supplier?.businessName || currentInvoice?.supplier?.name || "Your Company")
                          : (currentInvoice?.supplier?.businessName || currentInvoice?.supplier?.name || "Supplier")}
                      </h2>
                      <p className="text-xs text-muted-foreground mb-1">
                        Invoice #{currentInvoice?.invoiceNumber || invoice.invoiceNumber}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <p className="text-xs text-muted-foreground">
                          Issue Date: {format(new Date(currentInvoice?.issueDate || invoice.issueDate), "MMM dd, yyyy")}
                        </p>
                        {currentInvoice?.dueDate && (
                          <>
                            <span className="hidden sm:inline text-xs text-muted-foreground mx-1">•</span>
                            <p className="text-xs text-muted-foreground sm:ml-0">
                              Due: {format(new Date(currentInvoice.dueDate), "MMM dd, yyyy")}
                            </p>
                          </>
                        )}
                      </div>
                      {(currentInvoice?.supplier?.vatRegistrationNumber || invoice.supplier?.vatRegistrationNumber) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          VAT Reg: {(currentInvoice?.supplier?.vatRegistrationNumber || invoice.supplier?.vatRegistrationNumber)}
                        </p>
                      )}
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
                  <div className="mt-4 space-y-4">
                    <div>
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
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">VAT Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={editedInvoice.vatRate || 7.5}
                        onChange={(e) => {
                          const vatRate = parseFloat(e.target.value) || 7.5
                          const subtotal = editedInvoice.subtotal
                          const discountAmount = editedInvoice.discount ? subtotal * (editedInvoice.discount / 100) : 0
                          const subtotalAfterDiscount = subtotal - discountAmount
                          // Calculate vatable subtotal
                          let vatableSubtotal = 0
                          editedInvoice.items.forEach(item => {
                            if (item.vatable && item.unitPrice > 0) {
                              const itemCurrency = itemCurrencies[item.id] || (item.currency as CurrencyCode) || editedInvoice.currency
                              const baseCurrency = editedInvoice.currency as CurrencyCode
                              const basePrice = itemCurrency !== baseCurrency 
                                ? (itemConvertedAmounts[item.id] || item.unitPrice)
                                : item.unitPrice
                              vatableSubtotal += item.quantity * basePrice
                            }
                          })
                          const vatableDiscountAmount = vatableSubtotal > 0 && subtotal > 0 
                            ? (vatableSubtotal / subtotal) * discountAmount 
                            : 0
                          const vatableSubtotalAfterDiscount = vatableSubtotal - vatableDiscountAmount
                          const vatAmount = vatableSubtotalAfterDiscount * (vatRate / 100)
                          const invoiceTotal = subtotalAfterDiscount + vatAmount
                          // Note: WHT is deducted by client, not calculated here
                          const total = invoiceTotal
                          setEditedInvoice(prev => prev ? {
                            ...prev,
                            vatRate,
                            vatAmount,
                            taxAmount: vatAmount,
                            invoiceTotal,
                            total
                          } : null)
                        }}
                        className="h-9"
                      />
                    </div>
                  </div>
                )}

                {/* Client Information */}
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                  {isSender ? "Bill To" : displayAsIncoming ? "Bill To (You)" : "Client Information"}
                </h3>
                {isEditing && editedInvoice ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="col-span-1 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Business Name (Optional)</Label>
                      <Input
                        value={editedInvoice.client.businessName || ""}
                        onChange={(e) => updateClient({ businessName: e.target.value })}
                        placeholder="Business name"
                        className="h-9 sm:h-10 mt-1 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Name *</Label>
                      <Input
                        value={editedInvoice.client.name}
                        onChange={(e) => updateClient({ name: e.target.value })}
                        placeholder="Client name"
                        className="h-9 sm:h-10 mt-1 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <Input
                        type="email"
                        value={editedInvoice.client.email || ""}
                        onChange={(e) => updateClient({ email: e.target.value })}
                        placeholder="Email"
                        className="h-9 sm:h-10 mt-1 text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      <Input
                        value={editedInvoice.client.phone || ""}
                        onChange={(e) => updateClient({ phone: e.target.value })}
                        placeholder="Phone"
                        className="h-9 sm:h-10 mt-1 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Street Address</Label>
                      <Input
                        value={editedInvoice.client.address?.street || ""}
                        onChange={(e) => updateClient({
                          address: { ...editedInvoice.client.address, street: e.target.value }
                        })}
                        placeholder="Street address"
                        className="h-9 sm:h-10 mt-1 text-xs sm:text-sm"
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
                        className="h-9 sm:h-10 mt-1 text-xs sm:text-sm"
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
                        className="h-9 sm:h-10 mt-1 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Tax ID (TIN)</Label>
                      <Input
                        value={editedInvoice.client.taxId || ""}
                        onChange={(e) => updateClient({ taxId: e.target.value })}
                        placeholder="Tax ID"
                        className="h-9 sm:h-10 mt-1 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                </div>

                {/* Creator-Specific Information */}
                {profile?.businessType === 'creator' && (currentInvoice || invoice).invoiceType === 'outgoing' && (
                  ((currentInvoice || invoice).platform || (currentInvoice || invoice).transactionNature || (currentInvoice || invoice).tags?.length || (currentInvoice || invoice).paymentMethod) && (
                    <div className="mt-4 pt-4 border-t">
                      <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Additional Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {/* Platform Information */}
                        {(currentInvoice || invoice).platform && (
                          <>
                            {(currentInvoice || invoice).platform?.name && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Platform</p>
                                <p className="text-sm font-medium">{(currentInvoice || invoice).platform?.name}</p>
                              </div>
                            )}
                            {(currentInvoice || invoice).platform?.platformType && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Platform Type</p>
                                <p className="text-sm font-medium capitalize">{(currentInvoice || invoice).platform?.platformType?.replace('_', ' ')}</p>
                              </div>
                            )}
                            {(currentInvoice || invoice).platform?.accountId && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Account ID</p>
                                <p className="text-sm font-medium">{(currentInvoice || invoice).platform?.accountId}</p>
                              </div>
                            )}
                            {(currentInvoice || invoice).platform?.accountUrl && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Account URL</p>
                                <a 
                                  href={(currentInvoice || invoice).platform?.accountUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                                >
                                  {(currentInvoice || invoice).platform?.accountUrl}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </>
                        )}

                        {/* Transaction Nature */}
                        {(currentInvoice || invoice).transactionNature && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Transaction Nature</p>
                            <p className="text-sm font-medium capitalize">{(currentInvoice || invoice).transactionNature}</p>
                            {(currentInvoice || invoice).transactionNature === 'mixed' && (currentInvoice || invoice).businessPercentage && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Business: {(currentInvoice || invoice).businessPercentage}%
                              </p>
                            )}
                          </div>
                        )}

                        {/* Payment Method */}
                        {(currentInvoice || invoice).paymentMethod && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Expected Payment Method</p>
                            <p className="text-sm font-medium">{(currentInvoice || invoice).paymentMethod}</p>
                          </div>
                        )}

                        {/* Exchange Rate Info */}
                        {((currentInvoice || invoice).currency !== 'NGN' && (currentInvoice || invoice).exchangeRate) && (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Exchange Rate</p>
                              <p className="text-sm font-medium">
                                {(currentInvoice || invoice).exchangeRate?.toFixed(4)} 
                                {((currentInvoice || invoice).exchangeRateDate && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    (as of {format(new Date((currentInvoice || invoice).exchangeRateDate!), "MMM dd, yyyy")})
                                  </span>
                                ))}
                              </p>
                            </div>
                            {(currentInvoice || invoice).ngnEquivalent && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">NGN Equivalent</p>
                                <p className="text-sm font-medium">{formatCurrencyAmount((currentInvoice || invoice).ngnEquivalent!, 'NGN')}</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Tax Period */}
                        {(currentInvoice || invoice).taxPeriod && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Tax Period</p>
                            <p className="text-sm font-medium">
                              {(currentInvoice || invoice).taxPeriod?.year} - Q{(currentInvoice || invoice).taxPeriod?.quarter}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {(currentInvoice || invoice).tags && (currentInvoice || invoice).tags!.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs text-muted-foreground mb-2">Tags</p>
                          <div className="flex flex-wrap gap-2">
                            {(currentInvoice || invoice).tags!.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </Card>
            </div>

              {/* Right: Payment Summary */}
              <div className="lg:col-span-1">
                <Card className="p-3 sm:p-4 md:p-5">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 md:mb-5">Payment Summary</h3>
                {isEditing && editedInvoice && (
                  <div className="mb-4 space-y-4 p-4 bg-muted/30 rounded-lg border-b pb-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">VAT Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={editedInvoice.vatRate || 7.5}
                        onChange={(e) => {
                          const vatRate = parseFloat(e.target.value) || 7.5
                          const subtotal = editedInvoice.subtotal
                          const discountAmount = editedInvoice.discount ? subtotal * (editedInvoice.discount / 100) : 0
                          const subtotalAfterDiscount = subtotal - discountAmount
                          // Calculate vatable subtotal
                          let vatableSubtotal = 0
                          editedInvoice.items.forEach(item => {
                            if (item.vatable && item.unitPrice > 0) {
                              const itemCurrency = itemCurrencies[item.id] || (item.currency as CurrencyCode) || editedInvoice.currency
                              const baseCurrency = editedInvoice.currency as CurrencyCode
                              const basePrice = itemCurrency !== baseCurrency 
                                ? (itemConvertedAmounts[item.id] || item.unitPrice)
                                : item.unitPrice
                              vatableSubtotal += item.quantity * basePrice
                            }
                          })
                          const vatableDiscountAmount = vatableSubtotal > 0 && subtotal > 0 
                            ? (vatableSubtotal / subtotal) * discountAmount 
                            : 0
                          const vatableSubtotalAfterDiscount = vatableSubtotal - vatableDiscountAmount
                          const vatAmount = vatableSubtotalAfterDiscount * (vatRate / 100)
                          const invoiceTotal = subtotalAfterDiscount + vatAmount
                          // Note: WHT is deducted by client, not calculated here
                          const total = invoiceTotal
                          setEditedInvoice(prev => prev ? {
                            ...prev,
                            vatRate,
                            vatAmount,
                            taxAmount: vatAmount,
                            invoiceTotal,
                            total
                          } : null)
                        }}
                        className="h-9"
                      />
                    </div>
                    {/* Note: WHT is deducted by the client/buyer, not set during editing */}
                    <div className="p-3 bg-muted/30 rounded-md border">
                      <p className="text-xs text-muted-foreground">
                        Note: Withholding Tax (WHT) is deducted by the client/buyer when making payment, not set by the issuer.
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrencyAmount((currentInvoice || invoice).subtotal, (currentInvoice || invoice).currency as any)}</span>
                  </div>
                  
                  {/* Discount */}
                  {((currentInvoice?.discount && currentInvoice.discount > 0) || (invoice.discount && invoice.discount > 0)) && (
                    <div className="flex justify-between items-center text-sm text-destructive py-1">
                      <span>Discount ({currentInvoice?.discount || invoice.discount}%)</span>
                      <span>-{formatCurrencyAmount(
                        ((currentInvoice?.subtotal || invoice.subtotal) * (((currentInvoice?.discount ?? invoice.discount) ?? 0) / 100)), 
                        (currentInvoice || invoice).currency as any
                      )}</span>
                    </div>
                  )}
                  
                  {/* VAT */}
                  {((currentInvoice || invoice).vatAmount !== undefined && (currentInvoice || invoice).vatAmount > 0) ? (
                    <div className="flex justify-between items-center text-sm py-1">
                      <span className="text-muted-foreground">VAT ({(currentInvoice || invoice).vatRate || 7.5}%)</span>
                      <span className="font-medium">{formatCurrencyAmount((currentInvoice || invoice).vatAmount, (currentInvoice || invoice).currency as any)}</span>
                    </div>
                  ) : (currentInvoice || invoice).taxAmount > 0 && (
                    <div className="flex justify-between items-center text-sm py-1">
                      <span className="text-muted-foreground">VAT ({((currentInvoice || invoice).vatRate || 7.5)}%)</span>
                      <span className="font-medium">{formatCurrencyAmount((currentInvoice || invoice).taxAmount, (currentInvoice || invoice).currency as any)}</span>
                    </div>
                  )}
                  
                  {/* Invoice Total */}
                  {((currentInvoice || invoice).invoiceTotal !== undefined) && (
                    <div className="flex justify-between items-center text-sm font-semibold border-t border-border pt-3 mt-2">
                      <span>Invoice Total</span>
                      <span>{formatCurrencyAmount((currentInvoice || invoice).invoiceTotal, (currentInvoice || invoice).currency as any)}</span>
                    </div>
                  )}
                  
                  {/* WHT - Show if deducted by client */}
                  {((currentInvoice || invoice).whtDeducted && (currentInvoice || invoice).whtAmount && (currentInvoice || invoice).whtAmount! > 0) && (
                    <div className="border-t border-border pt-3 mt-2 space-y-1.5">
                      <div className="flex justify-between items-center text-sm text-destructive">
                        <div className="flex items-center">
                          <span>Withholding Tax ({(currentInvoice || invoice).whtRate || 5}%)</span>
                          {(currentInvoice || invoice).whtCreditNote && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1.5 text-destructive hover:text-destructive/80"
                                  onClick={() => setShowCreditNoteDialog(true)}
                                >
                                  <Receipt className="w-3 h-3 mr-1" />
                                 
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View WHT Credit Note</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <span>-{formatCurrencyAmount((currentInvoice || invoice).whtAmount!, (currentInvoice || invoice).currency as any)}</span>
                      </div>
                      {(currentInvoice || invoice).whtCertificateNumber && (
                        <div className="text-xs text-muted-foreground pl-1">
                          WHT Cert: {(currentInvoice || invoice).whtCertificateNumber}
                    </div>
                  )}
                      {(currentInvoice || invoice).whtDeductionDate && (
                        <div className="text-xs text-muted-foreground pl-1">
                          Deducted: {format(new Date((currentInvoice || invoice).whtDeductionDate!), "MMM dd, yyyy")}
                    </div>
                  )}
                    </div>
                  )}
                  
                  {/* Final Total */}
                  <div className="flex justify-between items-center text-base sm:text-lg font-bold border-t-2 border-border pt-3 sm:pt-4 mt-2 sm:mt-3">
                    <span className="text-xs sm:text-sm md:text-base">Amount Payable</span>
                    <span className="text-primary text-sm sm:text-base md:text-lg">{formatCurrencyAmount((currentInvoice || invoice).total, (currentInvoice || invoice).currency as any)}</span>
                  </div>
                </div>

                {/* WHT Deduction Section - Only for clients/buyers, before payment */}
                {!(invoice.clientPaymentStatus === 'paid' && invoice.supplierPaymentStatus === 'paid') && (isClient || isRecipient) && !invoice.whtDeducted && (
                  <div className="mt-6 space-y-3 border-t pt-4">
                    {!showWHTForm ? (
                      <Button
                        variant="outline"
                        onClick={() => setShowWHTForm(true)}
                        className="w-full"
                      >
                        <Calculator className="w-4 h-4 mr-2" />
                        Deduct Withholding Tax (WHT)
                      </Button>
                    ) : (
                      <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">Deduct Withholding Tax</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowWHTForm(false)
                              setWhtRate(5)
                              setWhtCertificateNumber("")
                              setWhtNotes("")
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div>
                          <Label htmlFor="wht-rate" className="text-xs">WHT Rate (%)</Label>
                          <Input
                            id="wht-rate"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={whtRate}
                            onChange={(e) => setWhtRate(parseFloat(e.target.value) || 5)}
                            placeholder="5"
                            className="h-9"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Common rates: 5% or 10% (depending on transaction type)
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="wht-certificate" className="text-xs">WHT Certificate Number (Optional)</Label>
                          <Input
                            id="wht-certificate"
                            value={whtCertificateNumber}
                            onChange={(e) => setWhtCertificateNumber(e.target.value)}
                            placeholder="e.g., WH/2025/001234"
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label htmlFor="wht-notes" className="text-xs">Notes (Optional)</Label>
                          <Textarea
                            id="wht-notes"
                            value={whtNotes}
                            onChange={(e) => setWhtNotes(e.target.value)}
                            placeholder="Additional notes about the WHT deduction"
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                        <div className="p-3 bg-background rounded-md border">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Invoice Total:</span>
                            <span>{formatCurrencyAmount((currentInvoice || invoice).invoiceTotal || ((currentInvoice || invoice).subtotal + (currentInvoice || invoice).vatAmount), (currentInvoice || invoice).currency as any)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-destructive">
                            <span>WHT ({whtRate}%):</span>
                            <span>-{formatCurrencyAmount(((currentInvoice || invoice).invoiceTotal || ((currentInvoice || invoice).subtotal + (currentInvoice || invoice).vatAmount)) * (whtRate / 100), (currentInvoice || invoice).currency as any)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
                            <span>Amount to Pay:</span>
                            <span>{formatCurrencyAmount(((currentInvoice || invoice).invoiceTotal || ((currentInvoice || invoice).subtotal + (currentInvoice || invoice).vatAmount)) * (1 - whtRate / 100), (currentInvoice || invoice).currency as any)}</span>
                          </div>
                        </div>
                        <Button
                          onClick={handleDeductWHT}
                          disabled={isDeductingWHT || whtRate <= 0}
                          className="w-full"
                        >
                          {isDeductingWHT ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Deduct WHT & Create Credit Note"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

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
                                      const result = await uploadToImageKit(file, 'invoices/receipts', user?.uid)
                                      ;(file as any).imageKitUrl = result.url
                                      ;(file as any).uploadResult = result
                                      setReceiptUploadResult(result)
                                      toast.success("Receipt uploaded successfully")
                                    } catch (error) {
                                      console.error("Error uploading receipt:", error)
                                      toast.error("Failed to upload receipt")
                                      setReceiptFile(null)
                                      setReceiptUploadResult(null)
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
                  </div>
                </div>
            {/* End of Top Section Grid */}

            {/* Items Table - Full Width */}
            <Card className="p-3 sm:p-4 md:p-5">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Items</h3>
                  {isEditing && editedInvoice ? (
                    <div className="space-y-3">
                      {editedInvoice.items.map((item, index) => (
                        <div key={item.id || index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:items-center p-3 border rounded-lg">
                          <div className="col-span-1 sm:col-span-4">
                            <Label className="text-xs text-muted-foreground mb-1 block sm:hidden">Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(item.id, { description: e.target.value })}
                              placeholder="Description"
                              className="h-9 sm:h-9 text-xs sm:text-sm"
                            />
                          </div>
                          <div className="col-span-1 sm:col-span-2">
                            <Label className="text-xs text-muted-foreground mb-1 block sm:hidden">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                              placeholder="Qty"
                              className="h-9 sm:h-9 text-xs sm:text-sm"
                            />
                          </div>
                          <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Label className="text-xs text-muted-foreground mb-1 block sm:hidden">Unit Price</Label>
                            <Select
                              value={itemCurrencies[item.id] || editedInvoice?.currency || invoice.currency}
                              onValueChange={(value) => handleItemCurrencyChange(item.id, value as CurrencyCode)}
                            >
                              <SelectTrigger className="w-full sm:w-24 h-9 text-xs sm:text-sm">
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
                              className="h-9 flex-1 text-xs sm:text-sm"
                            />
                          </div>
                          <div className="col-span-1 sm:col-span-2 text-left sm:text-right">
                            <Label className="text-xs text-muted-foreground mb-1 block">Amount</Label>
                            <p className="font-semibold text-xs sm:text-sm">{formatCurrencyAmount(calculateItemAmount(item), currentInvoice?.currency as any || invoice?.currency as any)}</p>
                          </div>
                          <div className="col-span-1 sm:col-span-2 flex items-center gap-2">
                            <Checkbox
                              id={`vatable-${item.id}`}
                              checked={item.vatable || false}
                              onCheckedChange={(checked) => updateItem(item.id, { vatable: !!checked })}
                            />
                            <Label htmlFor={`vatable-${item.id}`} className="text-xs sm:text-sm cursor-pointer">
                              Vatable
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* Mobile/Tablet (Opay-style): Card list */}
                      <div className="lg:hidden space-y-2">
                        {(currentInvoice?.items || invoice.items).map((item, index) => {
                          const isCreatorInvoice = profile?.businessType === 'creator' && (currentInvoice || invoice).invoiceType === 'outgoing'
                          const grossAmount = item.grossAmount || (item.quantity * item.unitPrice)
                          const platformFees = item.platformFees || 0
                          const netAmount = item.netAmount || (grossAmount - platformFees)
                          const displayAmount = isCreatorInvoice && platformFees > 0 ? netAmount : grossAmount
                          const itemCurrencySymbol = item.currency ? getCurrencySymbol(item.currency as any) : currencySymbol

                          return (
                            <div
                              key={item.id || index}
                              className="border rounded-lg p-3 bg-card"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {item.description || "Item"}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <span>Qty: <span className="text-foreground font-medium">{item.quantity}</span></span>
                                    <span>
                                      Unit: <span className="text-foreground font-medium">{itemCurrencySymbol}{item.unitPrice.toLocaleString()}</span>
                                    </span>
                                    {item.vatable ? (
                                      <Badge variant="default" className="text-[10px] h-5">Vatable</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-[10px] h-5">Non‑vatable</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <p className="text-sm font-bold text-primary whitespace-nowrap">
                                    {formatCurrencyAmount(displayAmount, currentInvoice?.currency as any || invoice?.currency as any)}
                                  </p>
                                  {isCreatorInvoice && platformFees > 0 && (
                                    <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                                      Fees: -{formatCurrencyAmount(platformFees, currentInvoice?.currency as any || invoice?.currency as any)}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Creator platform-fee breakdown */}
                              {isCreatorInvoice && (
                                <div className="mt-2 pt-2 border-t text-[11px] text-muted-foreground">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate">Gross</span>
                                    <span className="font-medium text-foreground whitespace-nowrap">
                                      {formatCurrencyAmount(grossAmount, currentInvoice?.currency as any || invoice?.currency as any)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate">Platform Fees</span>
                                    <span className={`font-medium whitespace-nowrap ${platformFees > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                      {platformFees > 0
                                        ? `-${formatCurrencyAmount(platformFees, currentInvoice?.currency as any || invoice?.currency as any)}`
                                        : "—"}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate">Net</span>
                                    <span className="font-semibold text-foreground whitespace-nowrap">
                                      {formatCurrencyAmount(netAmount, currentInvoice?.currency as any || invoice?.currency as any)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Desktop: Table */}
                      <div className="hidden lg:block border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto -mx-2 sm:-mx-3 md:mx-0 px-2 sm:px-3 md:px-0">
                          <table className="w-full min-w-[500px] sm:min-w-[600px]">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-2 sm:p-3 text-xs sm:text-sm font-semibold">Description</th>
                              <th className="text-center p-2 sm:p-3 text-xs sm:text-sm font-semibold">Quantity</th>
                              <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Unit Price</th>
                              {profile?.businessType === 'creator' && (currentInvoice || invoice).invoiceType === 'outgoing' && (
                                <>
                                  <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Gross</th>
                                  <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Platform Fees</th>
                                </>
                              )}
                              <th className="text-right p-2 sm:p-3 text-xs sm:text-sm font-semibold">Amount</th>
                              <th className="text-center p-2 sm:p-3 text-xs sm:text-sm font-semibold">Vatable</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(currentInvoice?.items || invoice.items).map((item, index) => {
                              const isCreatorInvoice = profile?.businessType === 'creator' && (currentInvoice || invoice).invoiceType === 'outgoing'
                              const grossAmount = item.grossAmount || (item.quantity * item.unitPrice)
                              const platformFees = item.platformFees || 0
                              const netAmount = item.netAmount || (grossAmount - platformFees)
                              const displayAmount = isCreatorInvoice && platformFees > 0 ? netAmount : grossAmount
                              
                              return (
                                <Fragment key={item.id || index}>
                                  <tr className="border-t hover:bg-muted/30 transition-colors">
                                    <td className="p-2 sm:p-3 text-xs sm:text-sm break-words">{item.description}</td>
                                    <td className="p-2 sm:p-3 text-center text-xs sm:text-sm">{item.quantity}</td>
                                    <td className="p-2 sm:p-3 text-right text-xs sm:text-sm">
                                      <span className="text-muted-foreground">
                                        {item.currency ? getCurrencySymbol(item.currency as any) : currencySymbol}
                                      </span>
                                      {item.unitPrice.toLocaleString()}
                                    </td>
                                    {isCreatorInvoice && (
                                      <>
                                        <td className="p-2 sm:p-3 text-right text-xs sm:text-sm">
                                          {formatCurrencyAmount(grossAmount, currentInvoice?.currency as any || invoice?.currency as any)}
                                        </td>
                                        <td className="p-2 sm:p-3 text-right text-xs sm:text-sm text-destructive">
                                          {platformFees > 0 ? (
                                            <>-{formatCurrencyAmount(platformFees, currentInvoice?.currency as any || invoice?.currency as any)}</>
                                          ) : (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </td>
                                      </>
                                    )}
                                    <td className="p-2 sm:p-3 text-right font-semibold text-xs sm:text-sm">
                                      {formatCurrencyAmount(displayAmount, currentInvoice?.currency as any || invoice?.currency as any)}
                                    </td>
                                    <td className="p-2 sm:p-3 text-center">
                                      {item.vatable ? (
                                        <Badge variant="default" className="text-xs">Yes</Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs">No</Badge>
                                      )}
                                    </td>
                                  </tr>
                                  {isCreatorInvoice && platformFees > 0 && (
                                    <tr className="bg-muted/20">
                                      <td colSpan={isCreatorInvoice ? 7 : 5} className="p-2 sm:p-3 text-xs text-muted-foreground">
                                        <div className="flex flex-col gap-1">
                                          <div className="flex justify-between">
                                            <span>Gross Amount:</span>
                                            <span className="font-medium">{formatCurrencyAmount(grossAmount, currentInvoice?.currency as any || invoice?.currency as any)}</span>
                                          </div>
                                          <div className="flex justify-between text-destructive">
                                            <span>Platform Fees:</span>
                                            <span>-{formatCurrencyAmount(platformFees, currentInvoice?.currency as any || invoice?.currency as any)}</span>
                                          </div>
                                          <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                                            <span>Net Amount:</span>
                                            <span>{formatCurrencyAmount(netAmount, currentInvoice?.currency as any || invoice?.currency as any)}</span>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    </>
                  )}
              </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Receipt Viewer Modal */}
    <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
        </DialogHeader>
        {invoice?.clientReceiptUrl && (
          <div className="flex items-center justify-center p-4">
            {invoice.clientReceiptUrl.match(/\.(pdf)$/i) ? (
              <iframe
                src={invoice.clientReceiptUrl}
                className="w-full h-[70vh] border rounded-lg"
                title="Receipt PDF"
              />
            ) : (
              <img
                src={invoice.clientReceiptUrl}
                alt="Payment Receipt"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        )}
        <div className="flex justify-end pt-4">
          <Button onClick={() => setShowReceiptModal(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog for Outgoing Invoices */}
    <Dialog open={showConfirmDialog} onOpenChange={(open) => {
      if (!isMarkingPaid) {
        setShowConfirmDialog(open)
        if (!open) {
          setShouldSaveReceipt(false)
        }
      }
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Payment Received</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please review the payment receipt below. Once confirmed, this will mark the invoice as paid and create a transaction record.
          </p>
          
          {/* Receipt Section */}
          {invoice?.clientReceiptUrl ? (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Payment Receipt</Label>
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Receipt uploaded by client</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReceiptModal(true)}
                    className="h-7 text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Receipt
                  </Button>
                </div>
                {invoice.clientPaymentMethod && (
                  <p className="text-xs text-muted-foreground">
                    Method: {invoice.clientPaymentMethod}
                  </p>
                )}
                {invoice.clientPaymentReference && (
                  <p className="text-xs text-muted-foreground">
                    Reference: {invoice.clientPaymentReference}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Checkbox
                    id="save-receipt"
                    checked={shouldSaveReceipt}
                    onCheckedChange={(checked) => setShouldSaveReceipt(!!checked)}
                    disabled={isMarkingPaid || isSavingReceipt}
                  />
                  <Label htmlFor="save-receipt" className="text-xs cursor-pointer">
                    Save receipt to my documents
                  </Label>
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                No receipt uploaded by client yet. Please wait for the client to upload a receipt before confirming payment.
              </p>
            </div>
          )}
          
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (!isMarkingPaid) {
                  setShowConfirmDialog(false)
                  setShouldSaveReceipt(false)
                }
              }}
              disabled={isMarkingPaid}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPaymentReceived}
              disabled={isMarkingPaid || isSavingReceipt || !invoice?.clientReceiptUrl}
            >
              {isMarkingPaid || isSavingReceipt ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Credit Note Dialog */}
      <Dialog open={showCreditNoteDialog} onOpenChange={setShowCreditNoteDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>WHT Credit Note</DialogTitle>
          </DialogHeader>
          {invoice?.whtCreditNote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Credit Note Number</Label>
                  <p className="font-semibold">{invoice.whtCreditNote.creditNoteNumber}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Issued Date</Label>
                  <p>{format(new Date(invoice.whtCreditNote.issuedDate), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Invoice Number</Label>
                  <p>{invoice.whtCreditNote.invoiceNumber}</p>
                </div>
                {invoice.whtCreditNote.certificateNumber && (
                  <div>
                    <Label className="text-xs text-muted-foreground">WHT Certificate Number</Label>
                    <p>{invoice.whtCreditNote.certificateNumber}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Invoice Total:</span>
                  <span className="font-medium">{formatCurrencyAmount(invoice.whtCreditNote.invoiceTotal, invoice.currency as any)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Withholding Tax ({invoice.whtCreditNote.whtRate}%):</span>
                  <span>-{formatCurrencyAmount(invoice.whtCreditNote.whtAmount, invoice.currency as any)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Net Amount Paid:</span>
                  <span>{formatCurrencyAmount(invoice.whtCreditNote.netAmountPaid, invoice.currency as any)}</span>
                </div>
              </div>

              {invoice.whtCreditNote.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1">{invoice.whtCreditNote.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCreditNoteDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
      </DialogContent>
      </Dialog>

      {/* Send via Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Invoice via Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient-email">Recipient Email</Label>
              <Input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@example.com"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The recipient will receive an email with a link to create an OTax account and view the invoice.
              </p>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEmailDialog(false)
                  setRecipientEmail("")
                }}
                disabled={isSendingEmail}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendViaEmail}
                disabled={isSendingEmail || !recipientEmail.trim()}
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
    </>
  )
}
               