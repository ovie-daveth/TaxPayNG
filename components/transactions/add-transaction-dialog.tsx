"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Upload, Scan, Loader2, AlertCircle, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Transaction, TransactionNature, TaxPeriod, TaxClassification } from "@/lib/types"
import { toast } from "sonner"
import { formatDateForInput, calculateTaxPeriod } from "@/lib/utils/date"
import { uploadToImageKit, ImageUploadResult } from "@/lib/utils/imagekit"
import { TagsInput } from "@/components/ui/tags-input"
import { ocrService, ReceiptData } from "@/lib/services"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SUPPORTED_CURRENCIES, CurrencyCode, fetchExchangeRate, convertCurrency, getCurrencySymbol, formatCurrencyInput, parseCurrencyInput, handleCurrencyInputChange } from "@/lib/utils/currency"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { SubscriptionAlert } from "@/components/subscription/subscription-restriction"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { useAuth } from "@/lib/hooks/useAuth"
import { documentService, invoiceService } from "@/lib/services"
import { Invoice } from "@/lib/types"

function getCapitalAllowanceRatesByAssetType(
  assetType: TaxClassification['capitalAssetType']
): { initial: number; annual: number } {
  switch (assetType) {
    case 'furniture_fittings':
      return { initial: 25, annual: 20 }
    case 'building':
      return { initial: 15, annual: 10 }
    case 'intangible_software':
      // Case-by-case in practice; default to plant & machinery style unless overridden in Advanced
      return { initial: 50, annual: 25 }
    case 'it_equipment':
    case 'motor_vehicle':
    case 'plant_machinery':
    default:
      return { initial: 50, annual: 25 }
  }
}

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
  const { user } = useAuth()
  const { profile } = useUserProfile()
  
  // Define base categories based on business type and transaction type
  const getBaseCategories = () => {
    const isCreator = profile?.businessType === 'creator'
    const isIncome = formData.type === 'income'
    
    if (isCreator) {
      if (isIncome) {
        return [
          { value: "Brand Sponsorship", label: "Brand Sponsorship" },
          { value: "Ad Revenue", label: "Ad Revenue (YouTube, Instagram, etc.)" },
          { value: "Affiliate Income", label: "Affiliate Income" },
          { value: "Brand Deal", label: "Brand Deal" },
          { value: "Content Licensing", label: "Content Licensing" },
          { value: "Merchandise Sales", label: "Merchandise Sales" },
          { value: "Subscription Revenue", label: "Subscription Revenue (Patreon, etc.)" },
          { value: "Online Courses", label: "Online Courses/Coaching" },
          { value: "Events & Speaking", label: "Events & Speaking" },
          { value: "Platform Payout", label: "Platform Payout (YouTube, TikTok, etc.)" },
          { value: "Other", label: "Other" },
        ]
      } else {
        return [
          { value: "Equipment", label: "Equipment (Camera, Mic, etc.)" },
          { value: "Software & Subscriptions", label: "Software & Subscriptions" },
          { value: "Studio Rent", label: "Studio Rent/Setup" },
          { value: "Co-working Space", label: "Co-working Space" },
          { value: "Editing Services", label: "Editing Services" },
          { value: "Marketing & Promotion", label: "Marketing & Promotion" },
          { value: "Travel for Content", label: "Travel for Content" },
          { value: "Props & Supplies", label: "Props & Supplies" },
          { value: "Internet & Utilities", label: "Internet & Utilities" },
          { value: "Staff/Contractor", label: "Staff/Contractor Payments" },
          { value: "Professional Fees", label: "Professional Fees (Accountants, Lawyers)" },
          { value: "Rent", label: "Rent" },
          { value: "Food", label: "Food" },
          { value: "Transport", label: "Transport" },
          { value: "Healthcare", label: "Healthcare" },
          { value: "Other", label: "Other" },
        ]
      }
    } else {
      // Freelancer categories
      if (isIncome) {
        return [
          { value: "Services", label: "Services" },
          { value: "Consulting", label: "Consulting" },
          { value: "Projects", label: "Projects" },
          { value: "Platform Income", label: "Platform Income (Upwork, Fiverr, etc.)" },
          { value: "Retainer", label: "Retainer Fees" },
          { value: "Commission", label: "Commission-Based Income" },
          { value: "Other", label: "Other" },
        ]
      } else {
        return [
          { value: "Rent", label: "Rent" },
          { value: "Software", label: "Software" },
          { value: "Utilities", label: "Utilities" },
          { value: "Marketing", label: "Marketing" },
          { value: "Food", label: "Food" },
          { value: "Transport", label: "Transport" },
          { value: "Entertainment", label: "Entertainment" },
          { value: "Healthcare", label: "Healthcare" },
          { value: "Education", label: "Education" },
          { value: "Other", label: "Other" },
        ]
      }
    }
  }

  // Get categories with custom category included if it exists
  const getCategories = () => {
    const baseCategories = getBaseCategories()
    
    // If there's a custom category (not in base list), add it before "Other"
    if (formData.category && !baseCategories.some(cat => cat.value === formData.category)) {
      const categoriesWithoutOther = baseCategories.filter(cat => cat.value !== 'Other')
      return [
        ...categoriesWithoutOther,
        { value: formData.category, label: formData.category },
        { value: 'Other', label: 'Other' }
      ]
    }
    
    return baseCategories
  }

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
    attachments: [] as string[],
    documentId: undefined as string | undefined
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false)
  const [convertedAmountNGN, setConvertedAmountNGN] = useState<number | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]) // Multiple files support
  const [uploadedImages, setUploadedImages] = useState<ImageUploadResult[]>([]) // Multiple upload results
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]) // Store original files for document creation
  const [uploadingImages, setUploadingImages] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [ocrResult, setOcrResult] = useState<ReceiptData | null>(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [showFormFields, setShowFormFields] = useState(false) // Track if form fields should be shown
  const [isManualEntryMode, setIsManualEntryMode] = useState(false) // Track if user explicitly chose manual entry
  const [customCategory, setCustomCategory] = useState('') // For "Other" category custom input
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false) // Modal for custom category
  const { isSubscribed, subscriptionType, hasAccess } = useSubscription()
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  
  // Phase 1: New fields for tax compliance
  const [transactionDate, setTransactionDate] = useState('') // When transaction occurred
  const [valueDate, setValueDate] = useState('') // When money moved
  const [transactionNature, setTransactionNature] = useState<TransactionNature>('business') // business/personal/mixed
  const [businessPercentage, setBusinessPercentage] = useState<number>(100) // For mixed transactions
  
  // Invoice linking - optional manual linking
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  
  // Phase 2: Platform fees tracking (for income transactions)
  const [usePlatformFeesBreakdown, setUsePlatformFeesBreakdown] = useState(false) // Switch to toggle platform fees breakdown
  const [grossAmount, setGrossAmount] = useState('')
  const [grossAmountDisplay, setGrossAmountDisplay] = useState('')
  const [platformFees, setPlatformFees] = useState('')
  const [platformFeesDisplay, setPlatformFeesDisplay] = useState('')
  const [netAmount, setNetAmount] = useState<number | null>(null)
  
  // Phase 2: Platform info
  const [platformName, setPlatformName] = useState('')
  const [platformType, setPlatformType] = useState<'social' | 'subscription' | 'marketplace' | 'streaming' | 'other'>('social')
  const [platformAccountId, setPlatformAccountId] = useState('')
  const [platformAccountUrl, setPlatformAccountUrl] = useState('')
  const [savedPlatforms, setSavedPlatforms] = useState<Array<{
    id: string
    name: string
    platformType: 'social' | 'subscription' | 'marketplace' | 'streaming' | 'other'
    accountId?: string
    accountUrl?: string
  }>>([])
  
  // Check if user has access to OCR (GOLD and above plans only)
  // OCR is enabled for the first upload box, but disabled when manual entry is selected
  const hasOcrAccess = hasAccess('GOLD')
  const isOcrEnabled = hasOcrAccess && !isManualEntryMode
  
  // Check if user has access to Tax Classification (GOLD and above plans only)
  const hasTaxClassificationAccess = hasAccess('GOLD')
  
  // Tax Classification state (only for Gold+ users)
  const [taxClassification, setTaxClassification] = useState<TaxClassification | undefined>(undefined)
  const [skipTaxClassification, setSkipTaxClassification] = useState(false)
  const [taxClassificationManuallyEdited, setTaxClassificationManuallyEdited] = useState(false)
  const [showCapitalAllowanceAdvanced, setShowCapitalAllowanceAdvanced] = useState(false)
  
  // Auto-populate tax classification based on transaction data (Gold+ only)
  const autoPopulateTaxClassification = (
    type: Transaction['type'],
    category: string,
    transactionNature: TransactionNature,
    description: string,
    notes: string
  ): TaxClassification => {
    const classification: TaxClassification = {}
    
    if (type === 'income') {
      // Income classification
      classification.incomeType = 'taxable' // Default to taxable
      
      // Check for WHT indicators
      const hasWHT = description.toLowerCase().includes('wht') || 
                     description.toLowerCase().includes('withholding') ||
                     notes.toLowerCase().includes('wht') ||
                     notes.toLowerCase().includes('withholding') ||
                     category.toLowerCase().includes('wht')
      
      if (hasWHT) {
        classification.whtCreditable = true
        // Common WHT rates in Nigeria: 5%, 10%
        classification.whtRate = category.includes('Professional') || category.includes('Consulting') ? 10 : 5
      }
      
      // Non-taxable income categories
      if (category === 'Gift' || category === 'Grant' || description.toLowerCase().includes('gift')) {
        classification.incomeType = 'non-taxable'
      }
    } else {
      // Expense classification
      const isBusiness = transactionNature === 'business' || transactionNature === 'mixed'
      
      if (isBusiness) {
        classification.expenseType = 'allowable'
        
        // Capital asset categories - only physical/intangible assets with long-term value
        // Note: Subscriptions, Rent, and Services are operating expenses, NOT capital assets
        const capitalAssetKeywords = [
          'equipment', 'camera', 'computer', 'laptop', 'vehicle', 'car', 'furniture', 
          'machinery', 'software license', 'software purchase', 'hardware', 
          'building', 'property', 'office equipment', 'production equipment'
        ]
        
        // Check if category or description contains capital asset keywords
        // Use exact word matching to avoid false positives (e.g., "Subscription" matching "Software & Subscriptions")
        const categoryLower = category.toLowerCase()
        const descriptionLower = description.toLowerCase()
        
        const isCapitalAsset = capitalAssetKeywords.some(keyword => {
          // Check for whole word matches to avoid partial matches
          const categoryMatch = categoryLower === keyword || 
                               categoryLower.includes(` ${keyword} `) ||
                               categoryLower.startsWith(`${keyword} `) ||
                               categoryLower.endsWith(` ${keyword}`)
          const descriptionMatch = descriptionLower.includes(keyword)
          return categoryMatch || descriptionMatch
        })
        
        // Exclude common non-capital expense categories
        const nonCapitalCategories = ['rent', 'subscription', 'service', 'utilities', 'maintenance', 'repair']
        const isNonCapital = nonCapitalCategories.some(nonCap => 
          categoryLower.includes(nonCap) || descriptionLower.includes(nonCap)
        )
        
        if (isCapitalAsset && !isNonCapital) {
          classification.isCapitalAsset = true
          classification.capitalAssetType = 'it_equipment'
          const { initial, annual } = getCapitalAllowanceRatesByAssetType(classification.capitalAssetType)
          classification.capitalAllowanceRate = annual
          classification.initialAllowanceRate = initial
        }
      } else {
        // Personal expenses are not allowable
        classification.expenseType = 'disallowable'
      }
      
      // VAT is not applicable to expenses - only to income transactions
      // VAT on expenses (input VAT) is handled separately and doesn't need to be tracked here
    }
    
    return classification
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files)
      setSelectedFiles(prev => [...prev, ...fileArray])
      setUploadedFiles(prev => [...prev, ...fileArray]) // Store files for later upload when saving
      // Don't upload to ImageKit automatically - wait until transaction is saved
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

  const handleRemoveFile = (index: number) => {
    // Clean up object URL if it was a preview
    if (uploadedImages[index] && uploadedImages[index].url && uploadedImages[index].url.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedImages[index].url)
      if (uploadedImages[index].thumbnailUrl && uploadedImages[index].thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(uploadedImages[index].thumbnailUrl)
      }
    }
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    // Clear documentId if removing all files (will be deleted on save)
    if (selectedFiles.length === 1) {
      setFormData(prev => ({ ...prev, documentId: undefined }))
    }
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
      
      // Calculate original amount based on locked exchange rate
      let originalAmount: number
      let displayAmount: string
      
      if (transactionCurrency !== 'NGN' && transaction.ngnEquivalent && transaction.exchangeRate) {
        // Reverse calculate: original amount = ngnEquivalent / exchangeRate
        originalAmount = transaction.ngnEquivalent / transaction.exchangeRate
        displayAmount = formatCurrencyInput(originalAmount.toString())
        // Set the locked exchange rate and converted amount
        setExchangeRate(transaction.exchangeRate)
        setConvertedAmountNGN(transaction.ngnEquivalent)
      } else if (transactionCurrency !== 'NGN' && transaction.exchangeRate) {
        // Fallback: if we have exchange rate but no ngnEquivalent, calculate from stored amount
        // This handles edge cases where ngnEquivalent might be missing
        originalAmount = transaction.amount / transaction.exchangeRate
        displayAmount = formatCurrencyInput(originalAmount.toString())
        setExchangeRate(transaction.exchangeRate)
        setConvertedAmountNGN(transaction.amount)
      } else {
        // NGN transaction or no currency info
        originalAmount = transaction.amount
        displayAmount = formatCurrencyInput(transaction.amount.toString())
        setConvertedAmountNGN(transaction.amount)
        setExchangeRate(1)
      }

      setFormData({
        type: transaction.type,
        description: transaction.description,
        amount: originalAmount.toString(),
        amountDisplay: displayAmount,
        currency: transactionCurrency,
        date: formatDateForInput(transaction.date),
        category: transaction.category,
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes || '',
        taxDeductible: transaction.taxDeductible,
        tags: transaction.tags || [],
        attachments: transaction.attachments || [],
        documentId: transaction.documentId
      })

      // Load multiple attachments if they exist
      if (transaction.attachments && transaction.attachments.length > 0) {
        const attachmentImages: ImageUploadResult[] = transaction.attachments.map((url, index) => {
          const filename = url.split('/').pop() || `Receipt ${index + 1}`
          return {
            url: url,
            name: filename,
            thumbnailUrl: url,
            fileId: transaction.attachmentFileIds?.[index] || '', // Get corresponding fileId
            size: 0 // Size unknown for existing attachments
          }
        })
        setUploadedImages(attachmentImages)
        setSelectedFiles([]) // Files already uploaded, no need to store File objects
      } else {
        setUploadedImages([])
      }

      setSelectedFiles([])
      setOcrResult(null)
      setShowFormFields(true) // Show fields for editing
      
      // Phase 1: Initialize new fields from existing transaction
      setTransactionDate(transaction.transactionDate || transaction.date)
      setValueDate(transaction.valueDate || transaction.date)
      setTransactionNature(transaction.transactionNature || 'business')
      setBusinessPercentage(transaction.businessPercentage || 100)
      
      // Invoice linking
      setSelectedInvoiceId(transaction.linkedInvoiceId || '')
      
      // Tax Classification (Gold+ only)
      if (hasTaxClassificationAccess) {
        if (transaction.taxClassification) {
          setTaxClassification(transaction.taxClassification)
        } else {
          // Auto-populate if not set
          const autoClassification = autoPopulateTaxClassification(
            transaction.type,
            transaction.category,
            transaction.transactionNature || 'business',
            transaction.description,
            transaction.notes || ''
          )
          setTaxClassification(autoClassification)
        }
      }
      
      // Phase 2: Initialize platform fees and platform info
      if (profile?.businessType === 'creator' && transaction.type === 'income') {
        // Enable breakdown if platform fees data exists
        const hasPlatformFees = !!(transaction.grossAmount || transaction.platformFees || transaction.platform)
        setUsePlatformFeesBreakdown(hasPlatformFees)
        
        if (transaction.grossAmount) {
          const gross = transaction.currency === 'NGN' 
            ? transaction.grossAmount 
            : (transaction.exchangeRate ? transaction.grossAmount * transaction.exchangeRate : transaction.grossAmount)
          setGrossAmount(gross.toString())
          setGrossAmountDisplay(formatCurrencyInput(gross.toString()))
        }
        if (transaction.platformFees) {
          const fees = transaction.currency === 'NGN'
            ? transaction.platformFees
            : (transaction.exchangeRate ? transaction.platformFees * transaction.exchangeRate : transaction.platformFees)
          setPlatformFees(fees.toString())
          setPlatformFeesDisplay(formatCurrencyInput(fees.toString()))
        }
        if (transaction.netAmount !== undefined) {
          const net = transaction.currency === 'NGN'
            ? transaction.netAmount
            : (transaction.exchangeRate ? transaction.netAmount * transaction.exchangeRate : transaction.netAmount)
          setNetAmount(net)
        }
        if (transaction.platform) {
          setPlatformName(transaction.platform.name)
          setPlatformType(transaction.platform.platformType)
          setPlatformAccountId(transaction.platform.accountId || '')
          setPlatformAccountUrl(transaction.platform.accountUrl || '')
        }
      }
    } else {
      // New transaction - start with file input only
      const today = new Date().toISOString().split('T')[0]
      setFormData({
        type: defaultType ?? 'income',
        description: defaultDescription ?? '',
        amount: '',
        amountDisplay: '',
        currency: 'NGN' as CurrencyCode,
        date: today,
        category: defaultCategory ?? '',
        paymentMethod: 'Bank Transfer',
        notes: '',
        taxDeductible: false,
        tags: [],
        attachments: [],
        documentId: undefined
      })
      setSelectedFiles([])
      setUploadedImages([])
      setUploadedFiles([])
      setOcrResult(null)
      // For freelancers (no OCR access), show form fields directly
      // For creators (with OCR access), show upload screen first
      const shouldShowFormFields = !hasOcrAccess
      setShowFormFields(shouldShowFormFields)
      setIsManualEntryMode(shouldShowFormFields) // Set manual mode for freelancers
      setConvertedAmountNGN(null)
      setExchangeRate(null)
      
      // Phase 1: Initialize new fields for new transaction
      setTransactionDate(today)
      setValueDate(today)
      setTransactionNature('business')
      setBusinessPercentage(100)
      
      // Invoice linking
      setSelectedInvoiceId('')
      
      // Phase 2: Reset platform fees and platform info
      setUsePlatformFeesBreakdown(false)
      setGrossAmount('')
      setGrossAmountDisplay('')
      setPlatformFees('')
      setPlatformFeesDisplay('')
      setNetAmount(null)
      setPlatformName('')
      setPlatformType('social')
      setPlatformAccountId('')
      setPlatformAccountUrl('')
      
      // Reset tax classification (Gold+ only)
      if (hasTaxClassificationAccess) {
        setTaxClassification(undefined)
        setSkipTaxClassification(false)
        setTaxClassificationManuallyEdited(false)
      }
    }
  }, [transaction, open, defaultType, defaultCategory, defaultDescription, hasOcrAccess, hasTaxClassificationAccess])
  
  // Auto-populate tax classification when form data changes (Gold+ only)
  useEffect(() => {
    if (!hasTaxClassificationAccess) return
    if (!formData.category || !formData.type) return
    if (skipTaxClassification) return // Don't auto-populate if user skipped
    if (taxClassificationManuallyEdited) return // Don't overwrite user edits
    
    // Auto-populate tax classification
    const autoClassification = autoPopulateTaxClassification(
      formData.type,
      formData.category,
      transactionNature,
      formData.description,
      formData.notes
    )
    
    // Ensure VAT is never set for expenses (VAT only applies to income)
    if (formData.type === 'expense') {
      autoClassification.vatApplicable = false
      autoClassification.vatRate = undefined
    }
    
    setTaxClassification(autoClassification)
  }, [formData.type, formData.category, formData.description, formData.notes, transactionNature, hasTaxClassificationAccess, skipTaxClassification, taxClassificationManuallyEdited])

  // Load available invoices when dialog opens (for manual linking)
  useEffect(() => {
    const loadInvoices = async () => {
      if (!open || !profile?.userId) return
      
      try {
        setLoadingInvoices(true)
        // Fetch unpaid or pending invoices that could be linked
        const result = await invoiceService.getUserInvoices(profile.userId, {}, 1, 100)
        // Filter to show invoices that don't already have a linked transaction
        const unlinkedInvoices = result.data.filter(inv => !inv.linkedTransactionId)
        setAvailableInvoices(unlinkedInvoices)
      } catch (error) {
        console.error('Error loading invoices:', error)
      } finally {
        setLoadingInvoices(false)
      }
    }
    
    loadInvoices()
  }, [open, profile?.userId])

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
      let documentId: string | undefined = undefined
      let imageUrl: string[] = []
      let attachmentFileIds: string[] = []

      // Handle multiple file uploads
      if (uploadedFiles.length > 0 && user?.uid) {
        // New files to upload (either new transaction or replacing existing)
        try {
          setUploadingImages(true)
          
          // If editing and there are existing attachments, delete them first
          if (transaction?.attachmentFileIds && transaction.attachmentFileIds.length > 0) {
            try {
              // Delete all existing attachment files from ImageKit
              for (const fileId of transaction.attachmentFileIds) {
                if (fileId) {
                  try {
                    const response = await fetch(`/api/delete-image?fileId=${encodeURIComponent(fileId)}`, {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                    })
                    if (!response.ok) {
                      console.warn(`Failed to delete ImageKit file ${fileId}`)
                    }
                  } catch (deleteError) {
                    console.error(`Error deleting ImageKit file ${fileId}:`, deleteError)
                  }
                }
              }
              // Delete linked document if it exists
              if (transaction.documentId) {
                await documentService.deleteDocument(transaction.documentId, user.uid)
                console.log(`Deleted old document ${transaction.documentId} before replacing`)
              }
            } catch (deleteError) {
              console.error('Error deleting old documents:', deleteError)
              // Continue even if deletion fails
            }
          }

          // Upload all files to ImageKit
          const uploadResults: ImageUploadResult[] = []
          for (const file of uploadedFiles) {
            try {
              const uploadResult = await uploadToImageKit(file, 'transactions', user.uid)
              uploadResults.push(uploadResult)
              imageUrl.push(uploadResult.url)
              attachmentFileIds.push(uploadResult.fileId)
            } catch (uploadError) {
              console.error('Error uploading file:', uploadError)
              toast.error(`Failed to upload ${file.name}. Continuing with other files...`)
            }
          }

          setUploadedImages(uploadResults)

          // Create document record for the first file (for backward compatibility)
          if (uploadResults.length > 0) {
            const firstFile = uploadedFiles[0]
            const firstResult = uploadResults[0]
            const documentType = formData.type === 'income' ? 'invoice' : 'receipt'
            const docResult = await documentService.uploadDocument(user.uid, {
              file: firstFile,
              name: `${formData.description} - Receipt`,
              type: documentType,
              imageKitUrl: firstResult.url,
              imageKitFileId: firstResult.fileId,
              fileSize: firstResult.size,
              date: formData.date,
              notes: `Auto-created from transaction: ${formData.description}`
            })

            if (docResult.success && docResult.data) {
              documentId = docResult.data.id
            }
          }

          if (uploadResults.length > 0) {
            toast.success(`Successfully uploaded ${uploadResults.length} file(s)`)
          }
        } catch (error) {
          console.error('Error uploading documents:', error)
          toast.error('Failed to upload some documents. Transaction will be saved with available attachments.')
          // Continue with transaction creation even if some uploads fail
        } finally {
          setUploadingImages(false)
        }
      } else if (transaction?.attachments && transaction.attachments.length > 0 && uploadedFiles.length === 0) {
        // Editing transaction but all files were removed - delete all attachments
        try {
          // Delete all attachment files from ImageKit
          if (transaction.attachmentFileIds && transaction.attachmentFileIds.length > 0) {
            for (const fileId of transaction.attachmentFileIds) {
              if (fileId) {
                try {
                  const response = await fetch(`/api/delete-image?fileId=${encodeURIComponent(fileId)}`, {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  })
                  if (!response.ok) {
                    console.warn(`Failed to delete ImageKit file ${fileId}`)
                  }
                } catch (deleteError) {
                  console.error(`Error deleting ImageKit file ${fileId}:`, deleteError)
                }
              }
            }
          }
          // Delete linked document if it exists
          if (transaction.documentId) {
            await documentService.deleteDocument(transaction.documentId, user?.uid || '')
            console.log(`Deleted document ${transaction.documentId} as files were removed`)
          }
          documentId = undefined
          imageUrl = []
          attachmentFileIds = []
        } catch (deleteError) {
          console.error('Error deleting documents:', deleteError)
          // Keep existing attachments if deletion fails
          documentId = transaction.documentId
          imageUrl = transaction.attachments || []
          attachmentFileIds = transaction.attachmentFileIds || []
        }
      } else if (transaction?.attachments && transaction.attachments.length > 0) {
        // Editing transaction, no file change - keep existing attachments
        documentId = transaction.documentId
        imageUrl = transaction.attachments || []
        attachmentFileIds = transaction.attachmentFileIds || []
      }

      // Phase 2: For income transactions with platform fees breakdown enabled, use netAmount if available
      // Otherwise use the regular amount
      let amountToStore: number
      if (profile?.businessType === 'creator' && formData.type === 'income' && usePlatformFeesBreakdown && grossAmount && platformFees) {
        // Use net amount (gross - fees) for income with platform fees
        const gross = parseFloat(grossAmount)
        const fees = parseFloat(platformFees)
        const net = gross - fees
        amountToStore = formData.currency === 'NGN'
          ? net
          : (convertedAmountNGN ? (net * (convertedAmountNGN / gross)) : net)
      } else {
        // Use regular amount
        amountToStore = formData.currency === 'NGN'
          ? parseFloat(formData.amount)
          : (convertedAmountNGN || parseFloat(formData.amount))
      }

      // Phase 1: Calculate tax period from transaction date
      const taxPeriod = calculateTaxPeriod(transactionDate || formData.date)
      
      // Phase 1: Lock exchange rate at transaction date
      const lockedExchangeRate = formData.currency === 'NGN' 
        ? 1 
        : (exchangeRate || 1)
      const lockedNgnEquivalent = formData.currency === 'NGN'
        ? amountToStore
        : (convertedAmountNGN || amountToStore * lockedExchangeRate)
      const exchangeRateDate = new Date().toISOString().split('T')[0] // Current date when rate is locked

      // Use transactionDate as the primary date (for backward compatibility with legacy 'date' field)
      const primaryDate = transactionDate || formData.date
      
      const result = await onSubmit({
        type: formData.type,
        description: formData.description,
        amount: amountToStore,
        date: primaryDate, // Keep for backward compatibility - uses transactionDate
        // Phase 1: New date fields
        transactionDate: primaryDate,
        valueDate: valueDate || primaryDate,
        taxPeriod: taxPeriod,
        // Phase 1: Personal vs Business
        transactionNature: transactionNature,
        businessPercentage: transactionNature === 'mixed' ? businessPercentage : undefined,
        // Phase 1: Locked exchange rates
        currency: formData.currency,
        exchangeRate: formData.currency !== 'NGN' ? lockedExchangeRate : undefined,
        exchangeRateDate: formData.currency !== 'NGN' ? exchangeRateDate : undefined,
        ngnEquivalent: formData.currency !== 'NGN' ? lockedNgnEquivalent : undefined,
        // Invoice linking - optional manual linking
        linkedInvoiceId: selectedInvoiceId || undefined,
        isFromInvoice: selectedInvoiceId ? true : undefined,
        invoiceStatus: selectedInvoiceId ? 'completed' : undefined,
        // Phase 2: Platform fees tracking (for income transactions when breakdown is enabled)
        grossAmount: (profile?.businessType === 'creator' && formData.type === 'income' && usePlatformFeesBreakdown && grossAmount) 
          ? (formData.currency === 'NGN' ? parseFloat(grossAmount) : (lockedExchangeRate ? parseFloat(grossAmount) * lockedExchangeRate : parseFloat(grossAmount)))
          : undefined,
        platformFees: (profile?.businessType === 'creator' && formData.type === 'income' && usePlatformFeesBreakdown && platformFees)
          ? (formData.currency === 'NGN' ? parseFloat(platformFees) : (lockedExchangeRate ? parseFloat(platformFees) * lockedExchangeRate : parseFloat(platformFees)))
          : undefined,
        netAmount: (profile?.businessType === 'creator' && formData.type === 'income' && usePlatformFeesBreakdown && netAmount !== null)
          ? (formData.currency === 'NGN' ? netAmount : (lockedExchangeRate ? netAmount * lockedExchangeRate : netAmount))
          : undefined,
        // Phase 2: Platform info (when breakdown is enabled)
        platform: (profile?.businessType === 'creator' && formData.type === 'income' && usePlatformFeesBreakdown && platformName && (platformName !== 'Other' || platformAccountId))
          ? {
              name: platformName === 'Other' ? (platformAccountId || 'Other') : platformName,
              platformType: platformType,
              accountId: platformName !== 'Other' ? (platformAccountId || undefined) : undefined,
              accountUrl: platformAccountUrl || undefined
            }
          : undefined,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
        taxDeductible: formData.taxDeductible,
        tags: formData.tags,
        attachments: imageUrl,
        attachmentFileIds: attachmentFileIds,
        documentId: documentId,
        // Tax Classification (Gold+ only)
        taxClassification: (hasTaxClassificationAccess && !skipTaxClassification) ? taxClassification : undefined
      })

      console.log("Result:", result)

      if (result.success) {
        const hasAttachment = documentId !== undefined

        // Link document to transaction if document was created
        if (hasAttachment && result.data?.id && documentId) {
          try {
            await documentService.updateDocument(documentId, user?.uid || '', {
              linkedTransaction: result.data.id
            })
            console.log(`Linked document ${documentId} to transaction ${result.data.id}`)
          } catch (linkError) {
            console.error('Error linking document to transaction:', linkError)
            // Don't block success message if linking fails
          }
        }

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

  // Track changes in form fields
  useEffect(() => {
    // Only mark as having changes if form has been modified and isn't in edit mode for an existing transaction
    if (!transaction) {
      const hasFormData = formData.description.trim() || 
                          formData.amount || 
                          formData.category || 
                          formData.notes.trim() ||
                          formData.attachments.length > 0 ||
                          formData.tags.length > 0
      setHasUnsavedChanges(hasFormData as boolean)
    }
  }, [formData, transaction])

  const handleConfirmClose = () => {
    setShowCloseConfirmation(false)
    setHasUnsavedChanges(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent 
        className="w-[calc(100vw-2rem)] sm:w-full max-w-2xl max-h-[90vh] sm:max-h-[95vh] overflow-y-auto p-3 sm:p-4 md:p-6"
        onEscapeKeyDown={(e) => {
          // Prevent close on escape if there are unsaved changes
          if (hasUnsavedChanges) {
            e.preventDefault()
            setShowCloseConfirmation(true)
          }
        }}
        onInteractOutside={(e) => {
          // Prevent closing the dialog when clicking outside if a Select dropdown is open
          // This fixes the mobile issue where tapping outside a Select closes the entire modal
          const target = e.target as HTMLElement
          
          // Check if the click target is within a Select portal (Radix Select uses a portal)
          const isSelectContent = target.closest('[data-radix-select-content]') !== null
          
          // Check if any Select dropdown is currently open
          // We check synchronously to catch it before it closes
          const openSelectContent = document.querySelector('[data-radix-select-content][data-state="open"]')
          
          // Also check for Select trigger that might be in an open state
          // This provides an additional check in case the content check misses it
          const openSelectTrigger = document.querySelector('[data-radix-select-trigger][data-state="open"]')
          
          // Prevent closing if:
          // 1. Clicking directly on Select content, OR
          // 2. An open Select content exists, OR
          // 3. An open Select trigger exists
          // This prevents the modal from closing when user taps outside Select on mobile
          if (isSelectContent || openSelectContent || openSelectTrigger) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-sm sm:text-lg md:text-xl">{transaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-2 sm:mt-4">
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
                <h3 className="text-base sm:text-lg font-semibold">Upload Receipt or Invoice</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Upload a receipt image or enter details manually
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
                multiple
                onChange={async (e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const files = Array.from(e.target.files)
                    handleFileSelect(e.target.files)
                    // OCR is enabled for the first upload box (if user has access)
                    // Only scan the first file if OCR is enabled (not in manual entry mode)
                    if (isOcrEnabled && files.length > 0) {
                      await handleScanReceipt(files[0])
                    } else {
                      // Just show the form without scanning
                      setShowFormFields(true)
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
                <p className="text-xs sm:text-sm font-medium mb-1">
                  {isScanning ? 'Scanning...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground">Images or PDF up to 10MB</p>
              </label>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsManualEntryMode(true) // Disable OCR when manual entry is selected
                    setShowFormFields(true)
                  }}
                  className="text-xs sm:text-sm"
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
                  <Label className="text-xs sm:text-sm">Attach Receipt/Invoice</Label>
                  {isOcrEnabled && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/*,.pdf'
                        input.multiple = true
                        input.onchange = async (e) => {
                          const files = (e.target as HTMLInputElement).files
                          if (files && files.length > 0) {
                            const fileArray = Array.from(files)
                            handleFileSelect(files)
                            // Scan the first file if OCR is enabled
                            if (isOcrEnabled && fileArray.length > 0) {
                              await handleScanReceipt(fileArray[0])
                            }
                            // Create preview objects without uploading
                            const previews: ImageUploadResult[] = fileArray.map(file => ({
                              url: URL.createObjectURL(file),
                              name: file.name,
                              fileId: '',
                              thumbnailUrl: URL.createObjectURL(file),
                              size: file.size
                            }))
                            setUploadedImages(prev => [...prev, ...previews])
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
                  )}
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
                  multiple
                  onChange={async (e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const files = e.target.files
                      handleFileSelect(files)
                      // Create preview objects without uploading
                      const fileArray = Array.from(files)
                      const previews: ImageUploadResult[] = fileArray.map(file => ({
                        url: URL.createObjectURL(file),
                        name: file.name,
                        fileId: '',
                        thumbnailUrl: URL.createObjectURL(file),
                        size: file.size
                      }))
                      setUploadedImages(prev => [...prev, ...previews])
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
                    {isScanning ? 'Scanning...' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Images or PDF up to 10MB (multiple files supported)</p>
                </label>

                {uploadedImages.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                            <Upload className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <span className="text-sm font-medium">{image.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {image.url && image.url.startsWith('blob:') ? 'Ready to upload when saved' : 'Uploaded successfully'}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 Files will be uploaded when you save the transaction
                    </p>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-xs sm:text-sm">Transaction Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => {
                      const newType = value as Transaction['type']
                      setFormData(prev => ({ 
                        ...prev, 
                        type: newType,
                        category: '' // Reset category when type changes since categories differ by type
                      }))
                    }}
                  >
                    <SelectTrigger id="type" className="text-xs sm:text-sm">
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
                  <Label htmlFor="currency" className="text-xs sm:text-sm">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => handleCurrencyChange(value as CurrencyCode)}
                  >
                    <SelectTrigger id="currency" className="text-xs sm:text-sm">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount" className="text-xs sm:text-sm">
                    {profile?.businessType === 'creator' && formData.type === 'income' && usePlatformFeesBreakdown
                      ? `Net Amount (${getCurrencySymbol(formData.currency)})` 
                      : `Amount (${getCurrencySymbol(formData.currency)})`}
                    {profile?.businessType === 'creator' && formData.type === 'income' && usePlatformFeesBreakdown && (
                      <span className="text-xs text-muted-foreground ml-1">(After platform fees)</span>
                    )}
                  </Label>
                  {/* Switch to toggle platform fees breakdown - Only for creators with income transactions */}
                  {profile?.businessType === 'creator' && formData.type === 'income' && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="platform-fees-switch" className="text-xs text-muted-foreground cursor-pointer">
                        Track platform fees
                      </Label>
                      <Switch
                        id="platform-fees-switch"
                        checked={usePlatformFeesBreakdown}
                        onCheckedChange={(checked) => {
                          setUsePlatformFeesBreakdown(checked)
                          // If turning off, clear platform fees data
                          if (!checked) {
                            setGrossAmount('')
                            setGrossAmountDisplay('')
                            setPlatformFees('')
                            setPlatformFeesDisplay('')
                            setNetAmount(null)
                            setPlatformName('')
                            setPlatformType('social')
                            setPlatformAccountId('')
                            setPlatformAccountUrl('')
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
                <Input
                  id="amount"
                  type="text"
                  placeholder="0.00"
                  value={formData.amountDisplay}
                  onChange={(e) => {
                    // If platform fees breakdown is enabled, don't allow manual entry
                    if (profile?.businessType === 'creator' && formData.type === 'income' && usePlatformFeesBreakdown) {
                      return
                    }
                    handleAmountChange(e.target.value)
                  }}
                  readOnly={!!(profile?.businessType === 'creator' && formData.type === 'income' && usePlatformFeesBreakdown)}
                  disabled={!!(profile?.businessType === 'creator' && formData.type === 'income' && usePlatformFeesBreakdown)}
                  required
                  className="text-base sm:text-lg font-medium"
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
                    {profile?.businessType === 'creator' && formData.type === 'income' && usePlatformFeesBreakdown
                      ? 'Net amount (after platform fees) will be stored in NGN'
                      : 'Amount will be stored in NGN'}
                  </p>
                )}
                {profile?.businessType === 'creator' && formData.type === 'income' && usePlatformFeesBreakdown && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    💡 This field is auto-calculated from Gross Amount - Platform Fees. Enter values in the Platform Fees section below.
                  </p>
                )}
              </div>

              {/* Phase 2: Platform Fees Tracking - Only for income transactions and creators when switch is ON */}
              {profile?.businessType === 'creator' && formData.type === 'income' && usePlatformFeesBreakdown && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-semibold">Platform Fees (Optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Track platform commissions and fees for accurate net income calculation
                    </p>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gross-amount" className="text-xs sm:text-sm">
                        Gross Amount ({getCurrencySymbol(formData.currency)})
                        <span className="text-xs text-muted-foreground ml-1">(Before fees)</span>
                      </Label>
                      <Input
                        id="gross-amount"
                        type="text"
                        placeholder="0.00"
                        value={grossAmountDisplay}
                        className="text-xs sm:text-sm"
                      onChange={(e) => {
                        const formatted = formatCurrencyInput(e.target.value)
                        setGrossAmountDisplay(formatted)
                        const parsedStr = parseCurrencyInput(formatted)
                        const parsed = parseFloat(parsedStr)
                        if (!isNaN(parsed) && parsed > 0) {
                          setGrossAmount(parsedStr)
                          // Auto-calculate net amount
                          if (platformFees) {
                            const fees = parseFloat(platformFees) || 0
                            const net = parsed - fees
                            setNetAmount(net)
                            // Auto-populate the main amount field with net amount
                            setFormData(prev => ({
                              ...prev,
                              amount: net.toString(),
                              amountDisplay: formatCurrencyInput(net.toString())
                            }))
                          } else {
                            setNetAmount(parsed)
                            // Auto-populate the main amount field with gross amount (no fees yet)
                            setFormData(prev => ({
                              ...prev,
                              amount: parsedStr,
                              amountDisplay: formatCurrencyInput(parsedStr)
                            }))
                          }
                        } else {
                          setGrossAmount('')
                          setNetAmount(null)
                          // Clear amount field if gross amount is cleared
                          if (!platformFees) {
                            setFormData(prev => ({
                              ...prev,
                              amount: '',
                              amountDisplay: ''
                            }))
                          }
                        }
                      }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Total amount before platform fees
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="platform-fees" className="text-xs sm:text-sm">
                        Platform Fees ({getCurrencySymbol(formData.currency)})
                      </Label>
                      <Input
                        id="platform-fees"
                        type="text"
                        placeholder="0.00"
                        value={platformFeesDisplay}
                        className="text-xs sm:text-sm"
                      onChange={(e) => {
                        const formatted = formatCurrencyInput(e.target.value)
                        setPlatformFeesDisplay(formatted)
                        const parsedStr = parseCurrencyInput(formatted)
                        const parsed = parseFloat(parsedStr)
                        if (!isNaN(parsed) && parsed >= 0) {
                          setPlatformFees(parsedStr)
                          // Auto-calculate net amount
                          if (grossAmount) {
                            const gross = parseFloat(grossAmount) || 0
                            const net = gross - parsed
                            setNetAmount(net)
                            // Auto-populate the main amount field with net amount
                            setFormData(prev => ({
                              ...prev,
                              amount: net.toString(),
                              amountDisplay: formatCurrencyInput(net.toString())
                            }))
                          } else {
                            setNetAmount(null)
                          }
                        } else {
                          setPlatformFees('')
                          if (grossAmount) {
                            const gross = parseFloat(grossAmount) || 0
                            setNetAmount(gross)
                            // Update amount field to gross (no fees)
                            setFormData(prev => ({
                              ...prev,
                              amount: gross.toString(),
                              amountDisplay: formatCurrencyInput(gross.toString())
                            }))
                          } else {
                            setNetAmount(null)
                          }
                        }
                      }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Platform commission/fees deducted
                      </p>
                    </div>
                  </div>
                  
                  {netAmount !== null && (grossAmount || platformFees) && (
                    <div className="p-3 bg-background rounded-md border">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm font-medium">Net Amount:</span>
                        <span className="text-base sm:text-lg font-semibold text-primary">
                          {getCurrencySymbol(formData.currency)}{netAmount.toLocaleString('en-NG', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                      {formData.currency !== 'NGN' && convertedAmountNGN && grossAmount && netAmount !== null && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ≈ ₦{(netAmount * (convertedAmountNGN / (parseFloat(grossAmount) || 1))).toLocaleString('en-NG', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Platform Info */}
                  <div className="space-y-4 pt-2 border-t">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm font-semibold">Platform Information (Optional)</Label>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="platform-name" className="text-xs sm:text-sm">Platform Name</Label>
                        <Select
                          value={platformName}
                          onValueChange={setPlatformName}
                        >
                          <SelectTrigger id="platform-name" className="text-xs sm:text-sm">
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
                        {platformName === 'Other' && (
                          <Input
                            placeholder="Enter platform name"
                            value={platformAccountId}
                            onChange={(e) => setPlatformAccountId(e.target.value)}
                            className="mt-2 text-xs sm:text-sm"
                          />
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="platform-type" className="text-xs sm:text-sm">Platform Type</Label>
                        <Select
                          value={platformType}
                          onValueChange={(value) => setPlatformType(value as typeof platformType)}
                        >
                          <SelectTrigger id="platform-type" className="text-xs sm:text-sm">
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
                    </div>
                    
                    {platformName && platformName !== 'Other' && (
                      <div className="space-y-2">
                        <Label htmlFor="platform-account" className="text-xs sm:text-sm">Account ID/Username (Optional)</Label>
                        <Input
                          id="platform-account"
                          placeholder="e.g., @yourusername or channel ID"
                          value={platformAccountId}
                          onChange={(e) => setPlatformAccountId(e.target.value)}
                          className="text-xs sm:text-sm"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="platform-url" className="text-xs sm:text-sm">Account URL (Optional)</Label>
                      <Input
                        id="platform-url"
                        type="url"
                        placeholder="https://..."
                        value={platformAccountUrl}
                        onChange={(e) => setPlatformAccountUrl(e.target.value)}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
                <Input
                  id="description"
                  placeholder={
                    profile?.businessType === 'creator'
                      ? formData.type === 'income'
                        ? "e.g., Brand sponsorship payment from XYZ Company"
                        : "e.g., Camera equipment purchase"
                      : formData.type === 'income'
                        ? "e.g., Client payment for website design"
                        : "e.g., Software subscription"
                  }
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  className="text-xs sm:text-sm"
                />
                <p className="text-xs text-muted-foreground">You can add more details later</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="category" className="text-xs sm:text-sm">What is this for?</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Select the category that best describes this transaction. This helps us organize your finances and apply the right tax rules.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={formData.category && !getBaseCategories().some(cat => cat.value === formData.category) ? 'Other' : formData.category}
                  onValueChange={(value) => {
                    if (value === 'Other') {
                      // Open modal for custom category
                      // If there's already a custom category, pre-fill it
                      if (formData.category && formData.category !== 'Other' && !getBaseCategories().some(cat => cat.value === formData.category)) {
                        setCustomCategory(formData.category)
                      } else {
                        setCustomCategory('')
                      }
                      setShowCustomCategoryModal(true)
                    } else {
                      setFormData(prev => ({ ...prev, category: value }))
                    }
                  }}
                >
                  <SelectTrigger id="category" className="text-xs sm:text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCategories().map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.category && formData.category !== 'Other' && !getBaseCategories().some(cat => cat.value === formData.category) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Custom: {formData.category}
                  </p>
                )}
              </div>

              {/* Phase 1: Date separation for tax compliance */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction-date" className="text-xs sm:text-sm">
                    Transaction Date
                    <span className="text-xs text-muted-foreground ml-1">(When it occurred)</span>
                  </Label>
                  <Input
                    id="transaction-date"
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    required
                    className="text-xs sm:text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    When the transaction occurred (invoice date, service date)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value-date" className="text-xs sm:text-sm">
                    Payment Date
                    <span className="text-xs text-muted-foreground ml-1">(When money moved)</span>
                  </Label>
                  <Input
                    id="value-date"
                    type="date"
                    value={valueDate}
                    onChange={(e) => setValueDate(e.target.value)}
                    required
                    className="text-xs sm:text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    When money was actually received or paid
                  </p>
                </div>
              </div>

              {/* Phase 1: Personal vs Business separation - Only for creators */}
              {profile?.businessType === 'creator' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="transaction-nature">Is this for business or personal use?</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">Business expenses can reduce your tax bill. Personal expenses cannot. If it's a mix (like a phone used for both), select "Mixed" and specify the percentage.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={transactionNature}
                    onValueChange={(value) => {
                      setTransactionNature(value as TransactionNature)
                      if (value !== 'mixed') {
                        setBusinessPercentage(value === 'business' ? 100 : 0)
                      }
                    }}
                  >
                    <SelectTrigger id="transaction-nature" className="text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="mixed">Mixed (Business & Personal)</SelectItem>
                    </SelectContent>
                  </Select>
                  {transactionNature === 'mixed' && (
                    <div className="space-y-2 mt-2">
                      <Label htmlFor="business-percentage">
                        Business Percentage: {businessPercentage}%
                      </Label>
                      <Input
                        id="business-percentage"
                        type="range"
                        min="0"
                        max="100"
                        value={businessPercentage}
                        onChange={(e) => setBusinessPercentage(Number(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Only {businessPercentage}% of this transaction is tax deductible
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {transactionNature === 'business' 
                      ? 'This is a business transaction and is fully tax deductible (if applicable)'
                      : transactionNature === 'personal'
                      ? 'This is a personal transaction and is not tax deductible'
                      : `This is a mixed transaction. ${businessPercentage}% is business-related.`}
                  </p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                  >
                    <SelectTrigger id="payment-method" className="text-xs sm:text-sm">
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
                <div className="space-y-2">
                  <Label htmlFor="linked-invoice">Link to Invoice (Optional)</Label>
                  <Select
                    value={selectedInvoiceId || undefined}
                    onValueChange={(value) => {
                      if (value && value !== 'no-invoices') {
                        setSelectedInvoiceId(value)
                        // Auto-fill amount and description if invoice is selected
                        const selectedInvoice = availableInvoices.find(inv => inv.id === value)
                        if (selectedInvoice) {
                          // Set amount to invoice total
                          const invoiceAmount = selectedInvoice.total.toString()
                          setFormData(prev => ({
                            ...prev,
                            amount: invoiceAmount,
                            amountDisplay: formatCurrencyInput(invoiceAmount),
                            description: prev.description || `${selectedInvoice.invoiceType === 'incoming' ? 'Bill' : 'Invoice'} ${selectedInvoice.invoiceNumber}${selectedInvoice.client?.name ? ` - ${selectedInvoice.client.name}` : selectedInvoice.supplier?.name ? ` - ${selectedInvoice.supplier.name}` : ''}`
                          }))
                          // Set currency if different
                          if (selectedInvoice.currency && selectedInvoice.currency !== formData.currency) {
                            handleCurrencyChange(selectedInvoice.currency as CurrencyCode)
                          }
                        }
                      } else {
                        setSelectedInvoiceId('')
                      }
                    }}
                    disabled={loadingInvoices || !!transaction?.linkedInvoiceId}
                  >
                    <SelectTrigger id="linked-invoice" className="text-xs sm:text-sm">
                      <SelectValue placeholder={loadingInvoices ? "Loading invoices..." : transaction?.linkedInvoiceId ? "Already linked to invoice" : "Select invoice (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableInvoices.length === 0 ? (
                        <SelectItem value="no-invoices" disabled>
                          No unlinked invoices available
                        </SelectItem>
                      ) : (
                        availableInvoices.map((invoice) => {
                          const clientOrSupplier = invoice.invoiceType === 'incoming' 
                            ? invoice.supplier?.name 
                            : invoice.client?.name
                          return (
                            <SelectItem key={invoice.id} value={invoice.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {invoice.invoiceType === 'incoming' ? 'Bill' : 'Invoice'} {invoice.invoiceNumber}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {clientOrSupplier ? `${clientOrSupplier} • ` : ''}{invoice.currency} {invoice.total.toLocaleString()}
                                  {invoice.issueDate && ` • ${new Date(invoice.issueDate).toLocaleDateString()}`}
                                </span>
                              </div>
                            </SelectItem>
                          )
                        })
                      )}
                    </SelectContent>
                  </Select>
                  {selectedInvoiceId && (() => {
                    const selectedInvoice = availableInvoices.find(inv => inv.id === selectedInvoiceId)
                    if (!selectedInvoice) return null
                    const amountMatch = Math.abs(parseFloat(formData.amount) - selectedInvoice.total) < 0.01
                    return (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          This transaction will be linked to the selected invoice
                        </p>
                        {!amountMatch && (
                          <p className="text-xs text-amber-600 dark:text-amber-500">
                            ⚠️ Transaction amount ({formData.currency} {formData.amount}) doesn't match invoice total ({selectedInvoice.currency} {selectedInvoice.total.toLocaleString()})
                          </p>
                        )}
                      </div>
                    )
                  })()}
                  {transaction?.linkedInvoiceId && (
                    <div className="p-2 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground">
                        ✓ This transaction is already linked to an invoice
                      </p>
                    </div>
                  )}
                  {!selectedInvoiceId && !transaction?.linkedInvoiceId && (
                    <p className="text-xs text-muted-foreground">
                      Leave empty if this transaction is not related to an invoice
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs sm:text-sm">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes..."
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="text-xs sm:text-sm"
                />
              </div>

              {/* Tax Classification Section (Gold+ only) */}
              {hasTaxClassificationAccess && taxClassification && !skipTaxClassification && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs sm:text-sm font-semibold">Tax Classification (Optional</Label>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setSkipTaxClassification(true)
                            setTaxClassification(undefined)
                            setTaxClassificationManuallyEdited(false)
                          }}
                          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          - Skip for now
                        </Button>
                        <Label className="text-xs sm:text-sm font-semibold">)</Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Auto-populated based on transaction details. You can edit or skip this section - you can always update it later.
                      </p>
                    </div>
                  </div>
                  
                  {/* Editable form (always visible) */}
                  <div className="space-y-4 pt-2 border-t">
                      {formData.type === 'income' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Income Type</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-sm mb-1"><strong>Taxable:</strong> Regular income subject to tax</p>
                                  <p className="text-sm mb-1"><strong>Non-taxable:</strong> Income that doesn't count toward your tax (e.g., gifts, grants)</p>
                                  <p className="text-sm"><strong>Exempt:</strong> Income that's legally exempt from tax</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Select
                            value={taxClassification.incomeType || 'taxable'}
                            onValueChange={(value) => {
                              setTaxClassificationManuallyEdited(true)
                              setTaxClassification(prev => ({
                                ...prev,
                                incomeType: value as 'taxable' | 'non-taxable' | 'exempt'
                              }))
                            }}
                          >
                            <SelectTrigger className="text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="taxable">Taxable</SelectItem>
                              <SelectItem value="non-taxable">Non-taxable</SelectItem>
                              <SelectItem value="exempt">Exempt</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {formData.type === 'expense' && (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label>Expense Type</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm mb-1"><strong>Allowable:</strong> Regular business expenses you can deduct (e.g., internet, software, rent)</p>
                                    <p className="text-sm mb-1"><strong>Disallowable:</strong> Expenses you cannot claim (e.g., personal expenses, fines)</p>
                                    <p className="text-sm"><strong>Capital:</strong> Long-term assets eligible for depreciation (e.g., equipment, vehicles)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Select
                              value={taxClassification.expenseType || 'allowable'}
                              onValueChange={(value) => {
                                const expenseType = value as 'allowable' | 'disallowable' | 'capital'
                                setTaxClassificationManuallyEdited(true)
                                setTaxClassification(prev => ({
                                  ...prev,
                                  expenseType
                                }))
                                // Auto-sync taxDeductible based on expenseType
                                // Allowable and Capital are tax deductible, Disallowable is not
                                setFormData(prev => ({
                                  ...prev,
                                  taxDeductible: expenseType === 'allowable' || expenseType === 'capital'
                                }))
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="allowable">Allowable</SelectItem>
                                <SelectItem value="disallowable">Disallowable</SelectItem>
                                <SelectItem value="capital">Capital</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="p-2.5 bg-muted/50 border border-border rounded-md">
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">Allowable:</span> Tax-deductible expenses (e.g., internet, software subscriptions, office rent, business travel)
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">Disallowable:</span> Not tax-deductible (e.g., personal expenses, fines, penalties)
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">Capital:</span> Long-term assets eligible for capital allowances (e.g., equipment, vehicles, furniture)
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={taxClassification.isCapitalAsset || false}
                                onCheckedChange={(checked) => {
                                  setTaxClassificationManuallyEdited(true)
                                  setTaxClassification(prev => ({
                                    ...prev,
                                    isCapitalAsset: checked,
                                    capitalAssetType: checked ? (prev?.capitalAssetType || 'it_equipment') : undefined,
                                    ...(() => {
                                      if (!checked) return { capitalAllowanceRate: undefined, initialAllowanceRate: undefined }
                                      const nextType = prev?.capitalAssetType || 'it_equipment'
                                      const { initial, annual } = getCapitalAllowanceRatesByAssetType(nextType)
                                      return {
                                        capitalAllowanceRate: prev?.capitalAllowanceRate ?? annual,
                                        initialAllowanceRate: prev?.initialAllowanceRate ?? initial
                                      }
                                    })()
                                  }))
                                }}
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <Label className="text-sm">Is this a long-term asset? (for depreciation)</Label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-sm">Long-term assets (like equipment or vehicles) can be depreciated over multiple years instead of claiming the full cost immediately. This can help spread out your tax benefits.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                              <p className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-1.5">
                                What is a Capital Asset?
                              </p>
                              <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                                A capital asset is a long-term asset used in your business that provides value over multiple years (not just one tax year). You can claim capital allowances (depreciation) over time instead of deducting the full cost immediately.
                              </p>
                              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                <p className="font-medium">Examples:</p>
                                <ul className="list-disc list-inside space-y-0.5 ml-2">
                                  <li>Equipment: Cameras, computers, laptops, machinery</li>
                                  <li>Vehicles: Cars, vans used for business</li>
                                  <li>Furniture: Office furniture, desks, chairs</li>
                                  <li>Software: One-time software license purchases</li>
                                </ul>
                                <p className="font-medium mt-1.5">NOT Capital Assets:</p>
                                <ul className="list-disc list-inside space-y-0.5 ml-2">
                                  <li>Rent, subscriptions, services, utilities, repairs</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                          
                          {taxClassification.isCapitalAsset && (
                            <div className="space-y-2">
                              <div className="space-y-1.5">
                                <Label>Asset type</Label>
                                <Select
                                  value={taxClassification.capitalAssetType || 'it_equipment'}
                                  onValueChange={(value) => {
                                    const assetType = value as TaxClassification['capitalAssetType']
                                    const { initial, annual } = getCapitalAllowanceRatesByAssetType(assetType)
                                    setTaxClassificationManuallyEdited(true)
                                    setTaxClassification(prev => ({
                                      ...prev,
                                      capitalAssetType: assetType,
                                      // Overwrite rates to match the selected asset type unless user already opened Advanced and edited them
                                      capitalAllowanceRate: annual,
                                      initialAllowanceRate: initial
                                    }))
                                  }}
                                >
                                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="it_equipment">Office & IT Equipment</SelectItem>
                                    <SelectItem value="motor_vehicle">Motor Vehicles</SelectItem>
                                    <SelectItem value="plant_machinery">Plant & Machinery</SelectItem>
                                    <SelectItem value="furniture_fittings">Furniture & Fittings</SelectItem>
                                    <SelectItem value="building">Buildings (Business-use)</SelectItem>
                                    <SelectItem value="intangible_software">Intangible / Software</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-[11px] text-muted-foreground">
                                  We’ll apply Nigeria’s common capital allowance rates automatically.
                                </p>
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                  <Label>Capital allowance rates</Label>
                                  <p className="text-xs text-muted-foreground">
                                    Using:{" "}
                                    {(() => {
                                      const annual = taxClassification.capitalAllowanceRate || 25
                                      const initial = taxClassification.initialAllowanceRate ?? 50
                                      return `Initial ${initial}%, Annual ${annual}%`
                                    })()}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => setShowCapitalAllowanceAdvanced((v) => !v)}
                                >
                                  {showCapitalAllowanceAdvanced ? "Hide Advanced" : "Advanced"}
                                </Button>
                              </div>

                              {showCapitalAllowanceAdvanced && (
                                <div className="space-y-2 pt-2 border-t">
                                  <Label>Annual Allowance Rate (%)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={taxClassification.capitalAllowanceRate || 25}
                                    onChange={(e) => setTaxClassification(prev => {
                                      setTaxClassificationManuallyEdited(true)
                                      const rate = parseFloat(e.target.value) || 25
                                      const next: any = { ...prev, capitalAllowanceRate: rate }
                                      if (next.initialAllowanceRate === undefined) {
                                        next.initialAllowanceRate = 50
                                      }
                                      return next
                                    })}
                                  />
                                  <Label>Initial Allowance Rate (%)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={taxClassification.initialAllowanceRate ?? 50}
                                    onChange={(e) => {
                                      setTaxClassificationManuallyEdited(true)
                                      setTaxClassification(prev => ({
                                        ...prev,
                                        initialAllowanceRate: parseFloat(e.target.value) || 0
                                      }))
                                    }}
                                  />
                                  <p className="text-[11px] text-muted-foreground">
                                    Most users shouldn’t edit this. We’ll later auto-pick rates based on asset type.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={taxClassification.whtCreditable || false}
                          onCheckedChange={(checked) => {
                            setTaxClassificationManuallyEdited(true)
                            setTaxClassification(prev => ({
                              ...prev,
                              whtCreditable: checked,
                              whtRate: checked ? (prev?.whtRate || 5) : undefined
                            }))
                          }}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Label className="text-sm">Was withholding tax deducted from this?</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">If tax was already deducted at source (withholding tax), you can claim it as a credit against your final tax bill. This reduces how much tax you need to pay.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      
                      {taxClassification.whtCreditable && (
                        <div className="space-y-2">
                          <Label>WHT Rate (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={taxClassification.whtRate || 5}
                            onChange={(e) => {
                              setTaxClassificationManuallyEdited(true)
                              setTaxClassification(prev => ({
                                ...prev,
                                whtRate: parseFloat(e.target.value) || 5
                              }))
                            }}
                          />
                        </div>
                      )}
                      
                      {/* VAT Applicable - only show for income transactions, not expenses */}
                      {formData.type === 'income' && (
                        <>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={taxClassification.vatApplicable || false}
                              onCheckedChange={(checked) => {
                                setTaxClassificationManuallyEdited(true)
                                setTaxClassification(prev => ({
                                  ...prev,
                                  vatApplicable: checked,
                                  vatRate: checked ? (prev?.vatRate || 7.5) : undefined
                                }))
                              }}
                            />
                            <div className="flex items-center gap-2 flex-1">
                              <Label className="text-sm">Does this include VAT?</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm">If you're VAT-registered and this income includes VAT, you'll need to remit the VAT amount to the government. The VAT portion will be excluded from your taxable income.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          
                          {taxClassification.vatApplicable && (
                            <div className="space-y-2">
                              <Label>VAT Rate (%)</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={taxClassification.vatRate || 7.5}
                                onChange={(e) => {
                                  setTaxClassificationManuallyEdited(true)
                                  setTaxClassification(prev => ({
                                    ...prev,
                                    vatRate: parseFloat(e.target.value) || 7.5
                                  }))
                                }}
                              />
                              {formData.type === 'income' && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                              <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                                ⚠️ VAT Remittance Required
                              </p>
                              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                For income with VAT, {taxClassification.vatRate || 7.5}% of the transaction amount must be remitted to the government. This VAT amount will be excluded from your taxable income to avoid double payment.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                        </>
                      )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tags (Optional)</Label>
                <TagsInput
                  tags={formData.tags}
                  onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                  placeholder="Add tags like 'business', 'travel', 'meals'..."
                  maxTags={5}
                />
              </div>

              {/* Tax Deductible switch - only show if Expense Type is not set (for non-Gold users or legacy compatibility) */}
              {formData.type !== 'income' && !hasTaxClassificationAccess && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="tax-deductible" className="cursor-pointer">
                        Can I claim this for tax?
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">If this expense is used for your business, you can claim it to reduce your tax bill. Personal expenses cannot be claimed.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-xs text-muted-foreground">You can update this later if you're not sure</p>
                  </div>
                  <Switch
                    id="tax-deductible"
                    checked={formData.taxDeductible}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, taxDeductible: checked }))}
                  />
                </div>
              )}

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
                        setIsManualEntryMode(false) // Reset manual entry mode when going back
                        setOcrResult(null)
                        // Clean up blob URLs before resetting
                        uploadedImages.forEach(img => {
                          if (img.url && img.url.startsWith('blob:')) {
                            URL.revokeObjectURL(img.url)
                          }
                          if (img.thumbnailUrl && img.thumbnailUrl.startsWith('blob:')) {
                            URL.revokeObjectURL(img.thumbnailUrl)
                          }
                        })
                        setSelectedFiles([])
                        setUploadedImages([])
                        setUploadedFiles([])
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
                          attachments: [],
                          documentId: undefined
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

      {/* Custom Category Modal */}
      <Dialog open={showCustomCategoryModal} onOpenChange={setShowCustomCategoryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Custom Category</DialogTitle>
            <DialogDescription>
              Please enter a custom category name for this transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-category-input" className="text-xs sm:text-sm">Category Name</Label>
              <Input
                id="custom-category-input"
                placeholder="e.g., Custom expense type"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customCategory.trim()) {
                    setFormData(prev => ({ ...prev, category: customCategory.trim() }))
                    setShowCustomCategoryModal(false)
                    setCustomCategory('')
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomCategoryModal(false)
                  setCustomCategory('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (customCategory.trim()) {
                    setFormData(prev => ({ ...prev, category: customCategory.trim() }))
                    setShowCustomCategoryModal(false)
                    setCustomCategory('')
                  } else {
                    toast.error("Please enter a category name")
                  }
                }}
                disabled={!customCategory.trim()}
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              You have unsaved changes in your transaction. If you close now, all the data you entered will be lost.
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
