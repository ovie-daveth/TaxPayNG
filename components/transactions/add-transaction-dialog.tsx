"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Upload, Scan, Loader2, AlertCircle } from "lucide-react"
import { Transaction } from "@/lib/types"
import { toast } from "sonner"
import { formatDateForInput } from "@/lib/utils/date"
import { uploadToImageKit, ImageUploadResult } from "@/lib/utils/imagekit"
import { TagsInput } from "@/components/ui/tags-input"
import { ocrService, ReceiptData } from "@/lib/services"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SUPPORTED_CURRENCIES, CurrencyCode, fetchExchangeRate, convertCurrency, getCurrencySymbol, formatCurrencyInput, parseCurrencyInput, handleCurrencyInputChange } from "@/lib/utils/currency"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { SubscriptionAlert } from "@/components/subscription/subscription-restriction"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"

interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<any>
  transaction?: Transaction | null
  defaultType?: Transaction['type']
  defaultCategory?: string
  defaultDescription?: string
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  onSubmit,
  transaction,
  defaultType,
  defaultCategory,
  defaultDescription
}: AddTransactionDialogProps) {

  const [formData, setFormData] = useState({
    type: 'income' as Transaction['type'],
    description: '',
    amount: '',
    amountDisplay: '', // Formatted display value with commas
    currency: 'NGN' as CurrencyCode,
    date: "",
    category: '',
    paymentMethod: 'Bank Transfer',
    notes: '',
    taxDeductible: false,
    tags: [] as string[],
    attachments: [] as string[]
  })
  const [convertedAmountNGN, setConvertedAmountNGN] = useState<number | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedImage, setUploadedImage] = useState<ImageUploadResult | null>(null)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [ocrResult, setOcrResult] = useState<ReceiptData | null>(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [showFormFields, setShowFormFields] = useState(false) // Track if form fields should be shown
  const { isSubscribed } = useSubscription()
  const { profile } = useUserProfile()
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setSelectedFile(file)

      // Auto-upload file to ImageKit
      await uploadFileToImageKit(file)
    }
  }

  const handleScanReceipt = async (file: File) => {
    setIsScanning(true)
    setOcrProgress(0)
    setOcrResult(null)

    try {
      // Show progress updates
      const progressInterval = setInterval(() => {
        setOcrProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Perform OCR
      const result = await ocrService.extractReceiptData(file)

      clearInterval(progressInterval)
      setOcrProgress(100)

      // Auto-populate form fields
      if (result.amount) {
        const rawAmount = parseCurrencyInput(result.amount)
        const displayAmount = formatCurrencyInput(result.amount)
        setFormData(prev => {
          const updated = {
            ...prev,
            amount: rawAmount,
            amountDisplay: displayAmount,
            date: result.date || prev.date,
            description: result.description || prev.description,
            category: result.category || prev.category,
            taxDeductible: result.taxDeductible || prev.taxDeductible,
            notes: result.notes || prev.notes, // Extract remarks/notes from receipt
            type: 'expense' as Transaction['type'] // Receipts are usually expenses
          }

          // Convert to NGN if not already
          if (prev.currency !== 'NGN') {
            handleCurrencyConversion(rawAmount, prev.currency)
          } else {
            setConvertedAmountNGN(parseFloat(rawAmount) || null)
            setExchangeRate(1)
          }

          return updated
        })
      }

      setOcrResult(result)
      setShowFormFields(true) // Show form fields after OCR completes

      // Show success message with confidence
      const confidencePercent = Math.round(result.confidence)
      if (confidencePercent >= 70) {
        toast.success(`Receipt scanned! Extracted data with ${confidencePercent}% confidence.`)
      } else {
        toast.warning(`Receipt scanned with ${confidencePercent}% confidence. Please review the extracted data.`)
      }
    } catch (error) {
      console.error('OCR scanning failed:', error)
      toast.error('Failed to scan receipt. Please try again or enter details manually.')
      // Still show form fields even if OCR fails, so user can enter manually
      setShowFormFields(true)
    } finally {
      setIsScanning(false)
      setTimeout(() => setOcrProgress(0), 1000)
    }
  }

  const uploadFileToImageKit = async (file: File) => {
    setUploadingImages(true)

    try {
      const result = await uploadToImageKit(file, 'transactions')
      setUploadedImage(result)
      toast.success('Document uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload document')
      setSelectedFile(null)
    } finally {
      setUploadingImages(false)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setUploadedImage(null)
  }

  // Handle currency conversion
  const handleCurrencyConversion = async (amount: string, currency: CurrencyCode) => {
    const numericAmount = parseFloat(parseCurrencyInput(amount))
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setConvertedAmountNGN(null)
      setExchangeRate(null)
      return
    }

    if (currency === 'NGN') {
      setConvertedAmountNGN(numericAmount)
      setExchangeRate(1)
      return
    }

    setIsConverting(true)
    try {
      const rate = await fetchExchangeRate(currency, 'NGN')
      const converted = await convertCurrency(numericAmount, currency, 'NGN')
      setConvertedAmountNGN(converted)
      setExchangeRate(rate)
    } catch (error) {
      console.error('Currency conversion error:', error)
      toast.error('Failed to convert currency. Using fallback rate.')
      // Fallback: try to convert anyway
      const rate = await fetchExchangeRate(currency, 'NGN')
      const converted = numericAmount * rate
      setConvertedAmountNGN(converted)
      setExchangeRate(rate)
    } finally {
      setIsConverting(false)
    }
  }

  // Handle amount input change with formatting
  const handleAmountChange = (value: string) => {
    const result = handleCurrencyInputChange(value)
    if (result.isValid) {
      setFormData(prev => ({
        ...prev,
        amount: result.rawValue,
        amountDisplay: result.displayValue
      }))

      // Convert to NGN if currency is not NGN
      if (formData.currency !== 'NGN' && result.rawValue) {
        handleCurrencyConversion(result.rawValue, formData.currency)
      } else if (formData.currency === 'NGN') {
        const numAmount = parseFloat(result.rawValue) || 0
        setConvertedAmountNGN(numAmount > 0 ? numAmount : null)
        setExchangeRate(1)
      }
    }
  }

  // Handle currency change
  const handleCurrencyChange = async (newCurrency: CurrencyCode) => {
    setFormData(prev => ({ ...prev, currency: newCurrency }))

    // Convert existing amount to NGN
    if (formData.amount) {
      await handleCurrencyConversion(formData.amount, newCurrency)
    }
  }

  useEffect(() => {
    if (transaction) {
      // Editing existing transaction - show all fields immediately
      const transactionCurrency = (transaction as any).currency || 'NGN' as CurrencyCode
      const amountStr = transaction.amount.toString()

      setFormData({
        type: transaction.type,
        description: transaction.description,
        amount: amountStr,
        amountDisplay: formatCurrencyInput(amountStr),
        currency: transactionCurrency,
        date: formatDateForInput(transaction.date),
        category: transaction.category,
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes || '',
        taxDeductible: transaction.taxDeductible,
        tags: transaction.tags || [],
        attachments: transaction.attachments || []
      })

      // Initialize conversion if currency is not NGN
      if (transactionCurrency !== 'NGN') {
        handleCurrencyConversion(amountStr, transactionCurrency)
      } else {
        setConvertedAmountNGN(transaction.amount)
        setExchangeRate(1)
      }

      // Load existing attachment if available
      if (transaction.attachments && transaction.attachments.length > 0) {
        const attachmentUrl = transaction.attachments[0]
        // Extract filename from URL (last part after the last /)
        const filename = attachmentUrl.split('/').pop() || 'attachment'
        setUploadedImage({
          url: attachmentUrl,
          name: filename,
          fileId: '', // Not needed for existing attachments
          thumbnailUrl: attachmentUrl,
          size: 0 // Size unknown for existing attachments
        })
      } else {
        setUploadedImage(null)
      }

      setSelectedFile(null)
      setOcrResult(null)
      setShowFormFields(true) // Show fields for editing
    } else {
      // New transaction - start with file input only
      setFormData({
        type: defaultType ?? 'income',
        description: defaultDescription ?? '',
        amount: '',
        amountDisplay: '',
        currency: 'NGN' as CurrencyCode,
        date: new Date().toISOString().split('T')[0],
        category: defaultCategory ?? '',
        paymentMethod: 'Bank Transfer',
        notes: '',
        taxDeductible: false,
        tags: [],
        attachments: []
      })
      setSelectedFile(null)
      setUploadedImage(null)
      setOcrResult(null)
      setShowFormFields(false) // Hide fields initially for new transactions
      setConvertedAmountNGN(null)
      setExchangeRate(null)
    }
  }, [transaction, open, defaultType, defaultCategory, defaultDescription])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description || !formData.amount || !formData.category) return

    // Check subscription before submitting
    if (!isSubscribed && !transaction) {
      toast.error("Please subscribe to add transactions")
      return
    }

    console.log("Before submission:", formData)
    setIsSubmitting(true)
    try {
      // Get image URL from uploaded image
      const imageUrl = uploadedImage ? [uploadedImage.url] : []

      // Use converted NGN amount for storage (always store in NGN)
      const amountToStore = formData.currency === 'NGN'
        ? parseFloat(formData.amount)
        : (convertedAmountNGN || parseFloat(formData.amount))

      const result = await onSubmit({
        type: formData.type,
        description: formData.description,
        amount: amountToStore,
        date: formData.date,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
        taxDeductible: formData.taxDeductible,
        tags: formData.tags,
        attachments: imageUrl
      })

      console.log("Result:", result)

      if (result.success) {
        const hasAttachment = uploadedImage !== null
        const successMessage = transaction
          ? 'Transaction updated successfully!'
          : hasAttachment
            ? 'Transaction added successfully! Document also saved.'
            : 'Transaction added successfully!'

        toast.success(successMessage)
        onOpenChange(false)

        // Dispatch custom event to notify other components of the change
        const event = new CustomEvent('transactionChanged', {
          detail: {
            action: transaction ? 'updated' : 'created',
            transactionId: result.data?.id
          }
        })
        window.dispatchEvent(event)

        // Dispatch document changed event if document was created
        if (hasAttachment && !transaction) {
          const docEvent = new CustomEvent('documentChanged', {
            detail: { action: 'created' }
          })
          window.dispatchEvent(docEvent)
        }
      } else {
        toast.error(result.error || 'Failed to save transaction')
      }
    } catch (error) {
      console.error('Error submitting transaction:', error)
      toast.error('Failed to save transaction')
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {!isSubscribed && !transaction && (
            <SubscriptionAlert 
              message="You need an active subscription to add transactions. Subscribe to unlock this feature."
              onUpgrade={() => setShowSubscriptionModal(true)}
            />
          )}
          {/* Step 1: File Upload (shown first for new transactions) */}
          {!showFormFields && !transaction && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Upload Receipt or Invoice</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a receipt image to automatically extract transaction details
                </p>
              </div>

              {isScanning && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>Scanning receipt... {ocrProgress}%</p>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">This may take a few seconds...</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept="image/*,.pdf"
                onChange={async (e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0]
                    // Check if it's an image or PDF
                    if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                      // Automatically scan the receipt
                      await handleScanReceipt(file)
                      // Also upload the file
                      setSelectedFile(file)
                      await uploadFileToImageKit(file)
                    } else {
                      // For other file types, just upload without OCR
                      setSelectedFile(file)
                      await uploadFileToImageKit(file)
                      setShowFormFields(true) // Show form to enter details manually
                    }
                  }
                }}
                disabled={uploadingImages || isScanning}
              />
              <label
                htmlFor="file-upload"
                className={`border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors block ${uploadingImages || isScanning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  {uploadingImages ? 'Uploading...' : isScanning ? 'Scanning...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground">Images or PDF up to 10MB</p>
              </label>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowFormFields(true)}
                  className="text-sm"
                >
                  Or enter details manually
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Form Fields (shown after OCR or for editing) */}
          {showFormFields && (
            <>
              {/* File upload section (shown when form is visible) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Attach Receipt/Invoice</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*,.pdf'
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) {
                          await handleScanReceipt(file)
                          // Also upload the file
                          setSelectedFile(file)
                          await uploadFileToImageKit(file)
                        }
                      }
                      input.click()
                    }}
                    disabled={isScanning || uploadingImages}
                    className="gap-2"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Scan className="w-4 h-4" />
                        Scan Receipt
                      </>
                    )}
                  </Button>
                </div>

                {isScanning && (
                  <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>Scanning receipt... {ocrProgress}%</p>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">This may take a few seconds...</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {ocrResult && (
                  <Alert className={ocrResult.confidence >= 70 ? 'border-green-500' : 'border-yellow-500'}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {ocrResult.confidence >= 70 ? '✓ Data extracted successfully' : '⚠ Low confidence - please review'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Confidence: {Math.round(ocrResult.confidence)}% |
                          Amount: {ocrResult.amount ? `₦${ocrResult.amount}` : 'Not found'} |
                          Merchant: {ocrResult.merchant || 'Not found'}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setOcrResult(null)}
                          className="mt-2 h-6 text-xs"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <input
                  type="file"
                  id="file-upload-secondary"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const file = e.target.files[0]
                      // Check if it's an image or PDF
                      if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                        // Offer to scan the receipt
                        const shouldScan = window.confirm('Would you like to scan this receipt to auto-fill transaction details?')
                        if (shouldScan) {
                          await handleScanReceipt(file)
                        }
                      }
                      // Always upload the file
                      setSelectedFile(file)
                      await uploadFileToImageKit(file)
                    }
                  }}
                  disabled={uploadingImages || isScanning}
                />
                <label
                  htmlFor="file-upload-secondary"
                  className={`border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors block ${uploadingImages || isScanning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {uploadingImages ? 'Uploading...' : isScanning ? 'Scanning...' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Images or PDF up to 10MB</p>
                </label>

                {uploadedImage && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <Upload className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{uploadedImage.name}</span>
                          <p className="text-xs text-muted-foreground">Uploaded successfully</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        className="text-destructive hover:text-destructive/80"
                      >
                        Remove
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 You can add more documents later in the Documents module
                    </p>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Transaction Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as Transaction['type'] }))}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="relief">Tax Relief</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => handleCurrencyChange(value as CurrencyCode)}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.name} ({currency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount ({getCurrencySymbol(formData.currency)})
                </Label>
                <Input
                  id="amount"
                  type="text"
                  placeholder="0.00"
                  value={formData.amountDisplay}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  required
                  className="text-lg font-medium"
                />
                {formData.currency !== 'NGN' && convertedAmountNGN !== null && (
                  <div className="text-xs text-muted-foreground space-y-1 mt-2 p-2 bg-muted/50 rounded-md">
                    <p className="font-medium">
                      ≈ ₦{convertedAmountNGN.toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </p>
                    {exchangeRate && (
                      <p className="text-xs">
                        Exchange Rate: 1 {formData.currency} = ₦{exchangeRate.toLocaleString('en-NG', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                    )}
                    {isConverting && (
                      <p className="text-xs text-primary flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Converting...
                      </p>
                    )}
                  </div>
                )}
                {formData.currency === 'NGN' && formData.amount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Amount will be stored in NGN
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g., Client payment for website design"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Services">Services</SelectItem>
                      <SelectItem value="Consulting">Consulting</SelectItem>
                      <SelectItem value="Projects">Projects</SelectItem>
                      <SelectItem value="Rent">Rent</SelectItem>
                      <SelectItem value="Software">Software</SelectItem>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Food">Food</SelectItem>
                      <SelectItem value="Transport">Transport</SelectItem>
                      <SelectItem value="Entertainment">Entertainment</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                  >
                    <SelectTrigger id="payment-method">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                      <SelectItem value="Check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes..."
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags (Optional)</Label>
                <TagsInput
                  tags={formData.tags}
                  onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                  placeholder="Add tags like 'business', 'travel', 'meals'..."
                  maxTags={5}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="tax-deductible" className="cursor-pointer">
                    Tax Deductible
                  </Label>
                  <p className="text-xs text-muted-foreground">Mark this expense as tax deductible</p>
                </div>
                <Switch
                  id="tax-deductible"
                  checked={formData.taxDeductible}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, taxDeductible: checked }))}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => {
                    if (!transaction && !showFormFields) {
                      // If we're still on file upload step, just close
                      onOpenChange(false)
                    } else {
                      // Otherwise, go back to file upload or close
                      if (showFormFields && !transaction) {
                        setShowFormFields(false)
                        setOcrResult(null)
                        setFormData({
                          type: defaultType ?? 'income',
                          description: defaultDescription ?? '',
                          amount: '',
                          amountDisplay: '',
                          currency: 'NGN' as CurrencyCode,
                          date: new Date().toISOString().split('T')[0],
                          category: defaultCategory ?? '',
                          paymentMethod: 'Bank Transfer',
                          notes: '',
                          taxDeductible: false,
                          tags: [],
                          attachments: []
                        })
                      } else {
                        onOpenChange(false)
                      }
                    }
                  }}
                  disabled={isSubmitting}
                >
                  {!transaction && !showFormFields ? 'Cancel' : 'Back'}
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (transaction ? 'Update Transaction' : 'Add Transaction')}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
      {profile && profile.businessType !== 'agent' && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile.businessType || 'freelancer'}
        />
      )}
    </Dialog>
  )
}
