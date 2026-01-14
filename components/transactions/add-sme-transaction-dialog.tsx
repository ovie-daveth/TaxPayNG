"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Upload, Scan, Loader2, AlertCircle, HelpCircle, FileText, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Transaction, TransactionNature, TaxPeriod, TaxClassification } from "@/lib/types"
import { toast } from "sonner"
import { formatDateForInput, calculateTaxPeriod } from "@/lib/utils/date"
import { uploadToImageKit, ImageUploadResult } from "@/lib/utils/imagekit"
import { TagsInput } from "@/components/ui/tags-input"
import { ocrService, ReceiptData } from "@/lib/services"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { SUPPORTED_CURRENCIES, CurrencyCode, fetchExchangeRate, convertCurrency, getCurrencySymbol, formatCurrencyInput, parseCurrencyInput, handleCurrencyInputChange } from "@/lib/utils/currency"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { SubscriptionAlert } from "@/components/subscription/subscription-restriction"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { useAuth } from "@/lib/hooks/useAuth"
import { useBusiness } from "@/lib/contexts/business-context"
import { documentService, invoiceService } from "@/lib/services"
import { Invoice } from "@/lib/types"
import { canChargeVAT, getVATEligibility } from "@/lib/utils/vatEligibility"

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

interface AddSMETransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<any>
  transaction?: Transaction | null
  defaultType?: Transaction['type']
  defaultCategory?: string
  defaultDescription?: string
}

export function AddSMETransactionDialog({
  open,
  onOpenChange,
  onSubmit,
  transaction,
  defaultType,
  defaultCategory,
  defaultDescription
}: AddSMETransactionDialogProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { activeEntity } = useBusiness()
  
  // Define base categories for SME business type and transaction type
  const getBaseCategories = () => {
    const isIncome = formData.type === 'income'
    const businessType = activeEntity?.businessType || 'both'
     if (isIncome) {
      // SME Income Categories - based on business type
      if (businessType === 'service') {
        // Service-based business income categories
        return [
          { value: "Service Revenue", label: "Service Revenue" },
          { value: "Consulting Fees", label: "Consulting Fees" },
          { value: "Professional Services", label: "Professional Services" },
          { value: "Contract Revenue", label: "Contract Revenue" },
          { value: "Retainer Fees", label: "Retainer Fees" },
          { value: "Project Fees", label: "Project Fees" },
          { value: "Hourly Services", label: "Hourly Services" },
          { value: "Commission Income", label: "Commission Income" },
          { value: "Licensing Revenue", label: "Licensing Revenue" },
          { value: "Rent Income", label: "Rent Income" },
          { value: "Interest Income", label: "Interest Income" },
          { value: "Other Income", label: "Other Income" },
        ]
      } else if (businessType === 'sales') {
        // Sales-based business income categories
        return [
          { value: "Sales Revenue", label: "Sales Revenue" },
          { value: "Product Sales", label: "Product Sales" },
          { value: "Retail Sales", label: "Retail Sales" },
          { value: "Wholesale Sales", label: "Wholesale Sales" },
          { value: "Online Sales", label: "Online Sales" },
          { value: "Merchandise Sales", label: "Merchandise Sales" },
          { value: "Commission Income", label: "Commission Income" },
          { value: "Rent Income", label: "Rent Income" },
          { value: "Interest Income", label: "Interest Income" },
          { value: "Other Income", label: "Other Income" },
        ]
      } else {
        // Both service and sales - combined categories
        return [
          { value: "Sales Revenue", label: "Sales Revenue" },
          { value: "Service Revenue", label: "Service Revenue" },
          { value: "Product Sales", label: "Product Sales" },
          { value: "Consulting Fees", label: "Consulting Fees" },
          { value: "Professional Services", label: "Professional Services" },
          { value: "Contract Revenue", label: "Contract Revenue" },
          { value: "Retainer Fees", label: "Retainer Fees" },
          { value: "Project Fees", label: "Project Fees" },
          { value: "Commission Income", label: "Commission Income" },
          { value: "Licensing Revenue", label: "Licensing Revenue" },
          { value: "Rent Income", label: "Rent Income" },
          { value: "Interest Income", label: "Interest Income" },
          { value: "Other Income", label: "Other Income" },
        ]
      }
    } else {
      // SME Expense Categories - based on business type
      const baseExpenses = [
        // Operating Expenses (common to all)
        { value: "Salaries & Wages", label: "Salaries & Wages" },
        { value: "Office Rent", label: "Office Rent / Workspace" },
        { value: "Utilities", label: "Utilities (Electricity, Water, etc.)" },
        { value: "Internet & Phone", label: "Internet & Phone" },
        { value: "Software & Subscriptions", label: "Software & Subscriptions" },
        { value: "Marketing & Advertising", label: "Marketing & Advertising" },
        { value: "Professional Fees", label: "Professional Fees (Accountants, Lawyers)" },
        { value: "Business Travel", label: "Business Travel & Transport" },
        { value: "Business Meals", label: "Business Meals & Entertainment" },
        { value: "Office Supplies", label: "Office Supplies" },
        { value: "Office Equipment", label: "Office Equipment" },
        { value: "Maintenance & Repairs", label: "Maintenance & Repairs" },
        { value: "Insurance", label: "Business Insurance" },
        { value: "Bank Charges", label: "Bank Charges & Fees" },
        { value: "Accounting Software", label: "Accounting Software" },
        { value: "Training & Education", label: "Training & Education" },
        { value: "Contractor Fees", label: "Contractor / Freelancer Fees" },
        { value: "Depreciation", label: "Depreciation" },
        { value: "Taxes & Licenses", label: "Taxes & Licenses" },
        { value: "Other", label: "Other Expenses" },
      ]
      
      if (businessType === 'sales' || businessType === 'both') {
        // Add COGS categories for sales-based businesses
        return [
          // Cost of Goods Sold
          { value: "Cost of Goods Sold", label: "Cost of Goods Sold (COGS)" },
          { value: "Raw Materials", label: "Raw Materials" },
          { value: "Inventory", label: "Inventory" },
          { value: "Direct Labor", label: "Direct Labor" },
          { value: "Packaging", label: "Packaging" },
          { value: "Shipping & Delivery", label: "Shipping & Delivery Costs" },
          ...baseExpenses
        ]
      } else {
        // Service-based businesses don't have COGS
        return baseExpenses
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

  // Helper function to check if a category is tax deductible (for display in dropdown)
  const isCategoryTaxDeductible = (categoryValue: string): boolean => {
    if (formData.type !== 'expense') {
      return false // Income transactions don't have tax deductible status
    }
    return autoDetermineTaxDeductible(formData.type, categoryValue)
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
  const { subscriptionType, hasAccess } = useSubscription()
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
  
  // Check if user has access to OCR (GOLD and above plans only)
  // OCR is enabled for the first upload box, but disabled when manual entry is selected
  const hasOcrAccess = hasAccess('GOLD')
  const isOcrEnabled = hasOcrAccess && !isManualEntryMode
  
  // Check if user has access to Tax Classification (GOLD and above plans only)
  const hasTaxClassificationAccess = hasAccess('GOLD')
  
  // Tax Classification state (only for Gold+ users)
  const [taxClassification, setTaxClassification] = useState<TaxClassification | undefined>(undefined)
  const [taxClassificationManuallyEdited, setTaxClassificationManuallyEdited] = useState(false)
  const [showCapitalAllowanceAdvanced, setShowCapitalAllowanceAdvanced] = useState(false)
  
  // WHT Credit Note (for income transactions - proof that WHT was deducted)
  const [whtCreditNoteFile, setWhtCreditNoteFile] = useState<File | null>(null)
  const [whtCreditNoteUrl, setWhtCreditNoteUrl] = useState<string | null>(null)
  
  // Track if any Select dropdown is open to prevent dialog from closing on mobile
  const [isAnySelectOpen, setIsAnySelectOpen] = useState(false)
  const selectOpenTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Help modal state
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const [helpModalContent, setHelpModalContent] = useState<{ title: string; content: string } | null>(null)
  
  // Helper function to open help modal
  const openHelpModal = (title: string, content: string) => {
    setHelpModalContent({ title, content })
    setHelpModalOpen(true)
  }
  
  // Auto-determine tax deductible for SMEs based on category
  const autoDetermineTaxDeductible = (
    type: Transaction['type'],
    category: string
  ): boolean => {
    // Only for expense transactions
    if (type !== 'expense') {
      return false // Income transactions don't use taxDeductible field
    }

    if (!category) {
      return false // No category selected
    }

    const categoryLower = category.toLowerCase()

    // Tax Deductible Categories for SMEs (business expenses)
    const taxDeductibleCategories = [
      'cost of goods sold',
      'raw materials',
      'inventory',
      'direct labor',
      'salaries & wages',
      'office rent',
      'utilities',
      'internet & phone',
      'software & subscriptions',
      'marketing & advertising',
      'professional fees',
      'business travel',
      'business meals',
      'business meals & entertainment',
      'office supplies',
      'office equipment',
      'maintenance & repairs',
      'insurance',
      'business insurance',
      'bank charges',
      'bank charges & fees',
      'accounting software',
      'training & education',
      'contractor fees',
      'depreciation',
      'taxes & licenses'
    ]

    // Check if category is tax deductible (exact match or contains)
    if (taxDeductibleCategories.some(tdc => {
      const tdcLower = tdc.toLowerCase().trim()
      return categoryLower === tdcLower || categoryLower.includes(tdcLower)
    })) {
      return true
    }

    // Default for "Other" category - assume deductible for SMEs (most business expenses are deductible)
    if (categoryLower === 'other' || categoryLower === 'other expenses') {
      return true
    }

    // Default: assume deductible for SME business expenses (conservative approach favors business)
    return true
  }

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
        if (transaction.type === 'relief') {
          // Relief transactions: set as allowable expense in background
          setTaxClassification({
            expenseType: 'allowable',
            vatApplicable: false,
            whtCreditable: false
          })
        } else if (transaction.taxClassification) {
          setTaxClassification(transaction.taxClassification)
          // Load WHT credit note URL if it exists
          if (transaction.taxClassification.whtCreditNoteUrl) {
            setWhtCreditNoteUrl(transaction.taxClassification.whtCreditNoteUrl)
          }
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
      
      // Platform fees not applicable for SMEs
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
        taxDeductible: (defaultType ?? 'income') === 'relief' ? true : false, // Relief is always tax deductible
        tags: [],
        attachments: [],
        documentId: undefined
      })
      setSelectedFiles([])
      setUploadedImages([])
      setUploadedFiles([])
      setOcrResult(null)
      // For SMEs (no OCR access by default), show form fields directly
      // For users with OCR access, show upload screen first
      const shouldShowFormFields = !hasOcrAccess
      setShowFormFields(shouldShowFormFields)
      setIsManualEntryMode(shouldShowFormFields) // Set manual mode for SMEs
      setConvertedAmountNGN(null)
      setExchangeRate(null)
      
      // Phase 1: Initialize new fields for new transaction
      setTransactionDate(today)
      setValueDate(today)
      setTransactionNature('business')
      setBusinessPercentage(100)
      
      // Invoice linking
      setSelectedInvoiceId('')
      
      // Platform fees not applicable for SMEs
      
      // Initialize tax classification (Gold+ only) - Required
      if (hasTaxClassificationAccess) {
        // Auto-populate tax classification for new transactions
        const autoClassification = autoPopulateTaxClassification(
          defaultType ?? 'income',
          defaultCategory ?? '',
          'business',
          defaultDescription ?? '',
          ''
        )
        setTaxClassification(autoClassification)
        setTaxClassificationManuallyEdited(false)
      }
      
      // Reset WHT credit note
      setWhtCreditNoteFile(null)
      if (whtCreditNoteUrl && whtCreditNoteUrl.startsWith('blob:')) {
        URL.revokeObjectURL(whtCreditNoteUrl)
      }
      setWhtCreditNoteUrl(null)
    }
  }, [transaction, open, defaultType, defaultCategory, defaultDescription, hasOcrAccess, hasTaxClassificationAccess])
  
  // Auto-populate tax classification when form data changes (Gold+ only) - Required
  useEffect(() => {
    if (!hasTaxClassificationAccess) return
    if (formData.type === 'relief') {
      // Relief transactions: set tax classification in background as allowable expense
      setTaxClassification({
        expenseType: 'allowable',
        vatApplicable: false,
        whtCreditable: false
      })
      return
    }
    if (taxClassificationManuallyEdited) return // Don't overwrite user edits
    
    // If no category or type, initialize with defaults only if taxClassification doesn't exist
    if (!formData.category || !formData.type) {
      // Only set default if taxClassification is completely undefined
      // Use a functional update to check current state
      setTaxClassification(prev => {
        if (prev) return prev // Don't overwrite existing
        return {
          incomeType: formData.type === 'income' ? 'taxable' : undefined,
          expenseType: formData.type === 'expense' ? 'allowable' : undefined,
          vatApplicable: false,
          whtCreditable: false
        }
      })
      return
    }
    
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
    
    // Ensure VAT is only set if user can charge VAT (VAT-eligible)
    if (!canChargeVAT(profile)) {
      autoClassification.vatApplicable = false
      autoClassification.vatRate = undefined
    }
    
    // Use functional update to avoid unnecessary re-renders
    setTaxClassification(prev => {
      // Only update if classification actually changed
      if (prev && 
          prev.incomeType === autoClassification.incomeType &&
          prev.expenseType === autoClassification.expenseType &&
          prev.vatApplicable === autoClassification.vatApplicable &&
          prev.whtCreditable === autoClassification.whtCreditable) {
        return prev
      }
      return autoClassification
    })
  }, [formData.type, formData.category, formData.description, formData.notes, transactionNature, hasTaxClassificationAccess, taxClassificationManuallyEdited, profile])

  // Auto-determine tax deductible for SMEs (non-Gold users) - based on category only
  useEffect(() => {
    // Only apply to SMEs and non-Gold users (no tax classification access)
    // Only for expense transactions
    if (hasTaxClassificationAccess) return // Gold users use tax classification instead
    if (formData.type !== 'expense') return
    if (!formData.category) return // Skip if no category selected

    // Auto-determine tax deductible based on category only
    const shouldBeTaxDeductible = autoDetermineTaxDeductible(
      formData.type,
      formData.category
    )

    // Update tax deductible (this will only trigger re-render if value actually changes)
    setFormData(prev => {
      // Only update if different to avoid unnecessary state updates
      if (prev.taxDeductible !== shouldBeTaxDeductible) {
        return { ...prev, taxDeductible: shouldBeTaxDeductible }
      }
      return prev
    })
  }, [formData.type, formData.category, hasTaxClassificationAccess])

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
      // Check if any Select dropdown is open
      const openSelect = document.querySelector('[data-radix-select-content][data-state="open"]')
      const isOpen = !!openSelect
      
      setIsAnySelectOpen(isOpen)
    }

    // Check immediately
    checkSelectState()

    // Listen for mutations to catch Select state changes immediately
    // This is more efficient than polling
    const observer = new MutationObserver((mutations) => {
      // Only check if mutations are related to Select components
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

    // Also set up a fallback interval (less frequent) in case mutations are missed
    const interval = setInterval(checkSelectState, 200)

    return () => {
      clearInterval(interval)
      observer.disconnect()
      if (selectOpenTimeoutRef.current) {
        clearTimeout(selectOpenTimeoutRef.current)
      }
    }
  }, [open])

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
    if (!formData.description) {
      toast.error("Please enter a description")
      return
    }
    if (!formData.amount) {
      toast.error("Please enter an amount")
      return
    }
    if (!formData.category) {
      toast.error("Please select a category")
      return
    }

    // Check subscription before submitting
    if (!hasAccess() && !transaction) {
      toast.error("Please subscribe to add transactions")
      return
    }

    console.log("Before submission:", formData)
    
    // Validate tax classification is required (Gold+ only)
    if (hasTaxClassificationAccess && !taxClassification) {
      toast.error('Tax classification is required. Please fill in the tax classification section.')
      setIsSubmitting(false)
      return
    }
    
    setIsSubmitting(true)
    try {
      let documentId: string | undefined = undefined
      let imageUrl: string[] = []
      let attachmentFileIds: string[] = []
      let uploadedWhtCreditNoteUrl: string | undefined = undefined
      let uploadedWhtCreditNoteFileId: string | undefined = undefined

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
              // Continue silently - transaction will save without attachments
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


          // Upload WHT Credit Note if present (for income transactions)
          if (whtCreditNoteFile && user?.uid && formData.type === 'income' && taxClassification?.whtCreditable) {
            try {
              const whtUploadResult = await uploadToImageKit(whtCreditNoteFile, 'wht-credit-notes', user.uid)
              uploadedWhtCreditNoteUrl = whtUploadResult.url
              uploadedWhtCreditNoteFileId = whtUploadResult.fileId
              // Update tax classification with WHT credit note
              setTaxClassification(prev => prev ? {
                ...prev,
                whtCreditNoteUrl: whtUploadResult.url,
                whtCreditNoteFileId: whtUploadResult.fileId
              } : undefined)
            } catch (whtError) {
              console.error('Error uploading WHT credit note:', whtError)
              // Continue silently - transaction will save without WHT credit note
            }
          } else if (whtCreditNoteUrl && !whtCreditNoteFile && taxClassification?.whtCreditable) {
            // Existing credit note URL (from editing) - use existing URL
            uploadedWhtCreditNoteUrl = whtCreditNoteUrl
            // Get fileId from tax classification if available
            if (taxClassification?.whtCreditNoteFileId) {
              uploadedWhtCreditNoteFileId = taxClassification.whtCreditNoteFileId
            }
          }
        } catch (error) {
          console.error('Error uploading documents:', error)
          // Don't show error toast here - individual file errors are already handled above
          // Transaction will continue to save without attachments
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

      // Calculate amount to store (SMEs don't use platform fees breakdown)
      const amountToStore = formData.currency === 'NGN'
        ? parseFloat(formData.amount)
        : (convertedAmountNGN || parseFloat(formData.amount))

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
        // Platform fees not applicable for SMEs
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
        taxDeductible: formData.taxDeductible,
        tags: formData.tags,
        attachments: imageUrl,
        attachmentFileIds: attachmentFileIds,
        documentId: documentId,
        // Tax Classification (Gold+ only) - Required, include WHT credit note if uploaded
        // Ensure VAT is only included if user can charge VAT
        taxClassification: hasTaxClassificationAccess ? {
          ...taxClassification,
          // Remove VAT fields if user cannot charge VAT
          vatApplicable: canChargeVAT(profile) ? taxClassification?.vatApplicable : false,
          vatRate: canChargeVAT(profile) ? taxClassification?.vatRate : undefined,
          ...(uploadedWhtCreditNoteUrl && { whtCreditNoteUrl: uploadedWhtCreditNoteUrl }),
          ...(uploadedWhtCreditNoteFileId && { whtCreditNoteFileId: uploadedWhtCreditNoteFileId })
        } : undefined
      })

      console.log("Result:", result)

      if (!result) {
        toast.error('Failed to save transaction: No response from server')
        return
      }

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
        toast.error(result?.error || 'Failed to save transaction')
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

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the overlay (not on content)
    if (e.target === e.currentTarget) {
      // Check if a Select dropdown is open
      const target = e.target as HTMLElement
      const isSelectContent = target.closest('[data-radix-select-content]') !== null
      const openSelectContent = document.querySelector('[data-radix-select-content][data-state="open"]')
      const selectViewport = document.querySelector('[data-radix-select-viewport]')
      const selectContent = document.querySelector('[data-radix-select-content]')
      
      // Prevent closing if Select is open
      const shouldPrevent = isSelectContent || 
                            isAnySelectOpen || 
                            openSelectContent || 
                            (selectContent && selectViewport)
      
      if (!shouldPrevent) {
        if (hasUnsavedChanges) {
          setShowCloseConfirmation(true)
        } else {
          handleDialogOpenChange(false)
        }
      }
    }
  }

  // Render modal content using portal to ensure proper z-index layering
  const modalContent = open ? (
    <>
      {/* Custom Modal Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 dark:bg-black/50 animate-in fade-in-0"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Custom Modal Content */}
      <div className="fixed left-[50%] top-[50%] z-50 w-[calc(100vw-2rem)] sm:w-full max-w-2xl max-h-[90vh] sm:max-h-[95vh] translate-x-[-50%] translate-y-[-50%] border bg-background rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%] duration-200">
        <div className="flex flex-col h-full max-h-[90vh] sm:max-h-[95vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 pb-2 sm:pb-4 border-b">
            <h2 className="text-sm sm:text-lg md:text-xl font-semibold leading-none tracking-tight">
              {transaction ? 'Edit Transaction' : 'Add Transaction'}
            </h2>
            <button
              onClick={() => {
                if (hasUnsavedChanges) {
                  setShowCloseConfirmation(true)
                } else {
                  handleDialogOpenChange(false)
                }
              }}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto p-3 sm:p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-2 sm:mt-4">
          {!hasAccess() && !transaction && (
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
                          category: '', // Reset category when type changes since categories differ by type
                          taxDeductible: newType === 'relief' ? true : prev.taxDeductible // Relief is always tax deductible
                        }))
                        // Set tax classification for relief transactions in background
                        if (newType === 'relief' && hasTaxClassificationAccess) {
                          setTaxClassification({
                            expenseType: 'allowable',
                            vatApplicable: false,
                            whtCreditable: false
                          })
                          setTaxClassificationManuallyEdited(false)
                        }
                      }}
                  >
                    <SelectTrigger id="type" className="text-xs sm:text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      {/* <SelectItem value="relief">Tax Relief</SelectItem> */}
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
                    Amount ({getCurrencySymbol(formData.currency)})
                  </Label>
                </div>
                <Input
                  id="amount"
                  type="text"
                  placeholder="0.00"
                  value={formData.amountDisplay}
                  onChange={(e) => {
                    handleAmountChange(e.target.value)
                  }}
                  required
                  className="text-xs sm:text-base md:text-lg font-medium"
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

              {/* Platform fees not applicable for SMEs */}
              {false && (
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
                          {getCurrencySymbol(formData.currency)}{netAmount!.toLocaleString('en-NG', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                      {formData.currency !== 'NGN' && convertedAmountNGN && grossAmount && netAmount !== null && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ≈ ₦{(netAmount! * (convertedAmountNGN! / (parseFloat(grossAmount) || 1))).toLocaleString('en-NG', {
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="category" className="text-xs sm:text-sm">What is this for?</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => openHelpModal(
                            "Category",
                            "Select the category that best describes this transaction. This helps us organize your finances and apply the right tax rules. Categories are automatically classified as tax deductible or not based on Nigerian tax regulations."
                          )}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <HelpCircle className="w-4 h-4 cursor-pointer" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Select the category that best describes this transaction. This helps us organize your finances and apply the right tax rules.</p>
                        <p className="text-xs text-muted-foreground mt-1">Click for more details</p>
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
                {/* Tax Deductible Status Indicator - Show for expense and relief transactions when category is selected */}
                {(formData.type === 'expense' || formData.type === 'relief') && formData.category && (
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">Tax Status:</p>
                    <Badge 
                      variant={formData.type === 'relief' || isCategoryTaxDeductible(formData.category) ? 'default' : 'secondary'} 
                      className="text-xs"
                    >
                      {formData.type === 'relief' || isCategoryTaxDeductible(formData.category) ? '✓ Tax Deductible' : 'Not Tax Deductible'}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
                <Input
                  id="description"
                  placeholder={
                    formData.type === 'income'
                      ? "e.g., Sales revenue from customer payment"
                      : "e.g., Office rent payment"
                  }
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  className="text-xs sm:text-sm"
                />
                <p className="text-xs text-muted-foreground">You can add more details later</p>
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

              {/* Personal vs Business separation - SMEs are always business, but keeping for consistency */}
              {false && (
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

              {/* Tax Classification Section (Gold+ only) - Required (not for relief transactions) */}
              {hasTaxClassificationAccess && taxClassification && formData.type !== 'relief' && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label className="text-xs sm:text-sm font-semibold">Tax Classification</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Auto-populated based on transaction details. Please review and update as needed.
                      </p>
                    </div>
                  </div>
                  
                  {/* Editable form (always visible) */}
                  <div className="space-y-4 pt-2 border-t">
                      {formData.type === 'income' && taxClassification && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>Income Type</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => openHelpModal(
                                      "Income Type",
                                      "Taxable: Regular income subject to tax.\n\nNon-taxable: Income that doesn't count toward your tax (e.g., gifts, grants).\n\nExempt: Income that's legally exempt from tax."
                                    )}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <HelpCircle className="w-4 h-4 cursor-pointer" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-sm mb-1"><strong>Taxable:</strong> Regular income subject to tax</p>
                                  <p className="text-sm mb-1"><strong>Non-taxable:</strong> Income that doesn't count toward your tax</p>
                                  <p className="text-sm"><strong>Exempt:</strong> Income that's legally exempt from tax</p>
                                  <p className="text-xs text-muted-foreground mt-1">Click for more details</p>
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
                                    <button
                                      type="button"
                                      onClick={() => openHelpModal(
                                        "Expense Type",
                                        "Allowable: Regular business expenses you can deduct (e.g., internet, software, rent).\n\nDisallowable: Expenses you cannot claim (e.g., personal expenses, fines).\n\nCapital: Long-term assets eligible for depreciation (e.g., equipment, vehicles)."
                                      )}
                                      className="text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <HelpCircle className="w-4 h-4 cursor-pointer" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm mb-1"><strong>Allowable:</strong> Regular business expenses you can deduct</p>
                                    <p className="text-sm mb-1"><strong>Disallowable:</strong> Expenses you cannot claim</p>
                                    <p className="text-sm"><strong>Capital:</strong> Long-term assets eligible for depreciation</p>
                                    <p className="text-xs text-muted-foreground mt-1">Click for more details</p>
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
                                      <button
                                        type="button"
                                        onClick={() => openHelpModal(
                                          "Long-term Asset",
                                          "Long-term assets (like equipment or vehicles) can be depreciated over multiple years instead of claiming the full cost immediately. This can help spread out your tax benefits.\n\nExamples: Equipment, vehicles, furniture, software licenses.\n\nNOT Capital Assets: Rent, subscriptions, services, utilities, repairs."
                                        )}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <HelpCircle className="w-4 h-4 cursor-pointer" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-sm">Long-term assets can be depreciated over multiple years instead of claiming the full cost immediately.</p>
                                      <p className="text-xs text-muted-foreground mt-1">Click for more details</p>
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
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="25"
                                    value={taxClassification.capitalAllowanceRate?.toString() || ''}
                                    onChange={(e) => {
                                      setTaxClassificationManuallyEdited(true)
                                      const value = e.target.value
                                      // Allow empty string, numbers, and decimals
                                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        const rate = value === '' ? undefined : parseFloat(value)
                                        setTaxClassification(prev => {
                                          const next: any = { ...prev, capitalAllowanceRate: rate }
                                          if (next.initialAllowanceRate === undefined && rate !== undefined) {
                                            next.initialAllowanceRate = 50
                                          }
                                          return next
                                        })
                                      }
                                    }}
                                    className="text-xs sm:text-sm"
                                  />
                                  <Label>Initial Allowance Rate (%)</Label>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="50"
                                    value={taxClassification.initialAllowanceRate?.toString() || ''}
                                    onChange={(e) => {
                                      setTaxClassificationManuallyEdited(true)
                                      const value = e.target.value
                                      // Allow empty string, numbers, and decimals
                                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                        const rate = value === '' ? undefined : parseFloat(value)
                                        setTaxClassification(prev => ({
                                          ...prev,
                                          initialAllowanceRate: rate
                                        }))
                                      }
                                    }}
                                    className="text-xs sm:text-sm"
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
                            if (!checked) {
                              // Clear credit note when WHT is disabled
                              setWhtCreditNoteFile(null)
                              setWhtCreditNoteUrl(null)
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Label className="text-sm">
                            {formData.type === 'income' 
                              ? 'Was withholding tax deducted from your payment?' 
                              : 'Did you deduct withholding tax from this payment?'}
                          </Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => openHelpModal(
                                    "Withholding Tax (WHT)",
                                    formData.type === 'income'
                                      ? "What is Withholding Tax?\n\nWithholding Tax (WHT) is tax that your customer or client deducts from your payment BEFORE paying you. It's a way for the government to collect taxes in advance.\n\nExample: If you provide consulting services worth ₦100,000 and WHT is 10%, your client will:\n- Deduct ₦10,000 as WHT\n- Pay you ₦90,000\n- Remit the ₦10,000 to the tax authority\n\nWhy it matters:\n\nWhen you file your annual tax return, you can claim the WHT that was deducted as a CREDIT against your final tax bill. This means you've already paid part of your taxes, so you'll owe less (or get a refund if you overpaid).\n\nCommon WHT rates in Nigeria:\n- Professional services (consulting, legal, accounting): 10%\n- Other services: 5%\n- Dividends: 10%\n- Interest: 10%\n\nWhen to use this:\n\nEnable this option if your customer/client deducted WHT from your payment. You'll need to enter the WHT rate that was applied."
                                      : "Withholding Tax (WHT) on Expenses\n\nWhen you pay for services or goods, you may be required to deduct WHT from the payment and remit it to the tax authority.\n\nExample: If you pay ₦100,000 for consulting services and WHT is 10%:\n- You deduct ₦10,000 as WHT\n- Pay your supplier ₦90,000\n- You remit the ₦10,000 to the tax authority\n\nWhy it matters:\n\nAs the person deducting WHT, you are responsible for remitting it to the tax authority. This is a compliance requirement and helps track tax payments.\n\nCommon WHT rates in Nigeria:\n- Professional services (consulting, legal, accounting): 10%\n- Other services: 5%\n- Dividends: 10%\n- Interest: 10%\n\nWhen to use this:\n\nEnable this option if you deducted WHT from a payment you made to a supplier or vendor."
                                  )}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <HelpCircle className="w-4 h-4 cursor-pointer" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">
                                  <strong>Withholding Tax (WHT)</strong> {
                                    formData.type === 'income'
                                      ? 'is tax deducted from your payment by your customer. You can claim it as a credit against your final tax bill.'
                                      : 'is tax you deduct from payments you make. You must remit it to the tax authority.'
                                  }
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formData.type === 'income'
                                    ? 'Example: ₦100,000 payment with 10% WHT = ₦10,000 deducted, you receive ₦90,000'
                                    : 'Example: ₦100,000 payment with 10% WHT = you deduct ₦10,000, pay supplier ₦90,000'
                                  }
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Click for more details</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      
                      {taxClassification.whtCreditable && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>WHT Rate (%)</Label>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="5"
                              value={taxClassification.whtRate?.toString() || ''}
                              onChange={(e) => {
                                setTaxClassificationManuallyEdited(true)
                                const value = e.target.value
                                // Allow empty string, numbers, and decimals
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  const rate = value === '' ? undefined : parseFloat(value)
                                  setTaxClassification(prev => ({
                                    ...prev,
                                    whtRate: rate
                                  }))
                                }
                              }}
                              className="text-xs sm:text-sm"
                            />
                          </div>
                          
                          {/* WHT Credit Note Upload - Only for income transactions */}
                          {formData.type === 'income' && (
                            <div className="space-y-2">
                              <Label className="text-xs sm:text-sm">
                                WHT Credit Note (Optional)
                                <span className="text-xs text-muted-foreground ml-1">- Upload proof of WHT deduction</span>
                              </Label>
                              <input
                                type="file"
                                id="wht-credit-note-upload"
                                className="hidden"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0]
                                    setWhtCreditNoteFile(file)
                                    // Create preview URL
                                    const url = URL.createObjectURL(file)
                                    setWhtCreditNoteUrl(url)
                                  }
                                }}
                              />
                              {!whtCreditNoteFile && !whtCreditNoteUrl ? (
                                <label
                                  htmlFor="wht-credit-note-upload"
                                  className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary transition-colors block cursor-pointer"
                                >
                                  <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                                  <p className="text-xs sm:text-sm text-muted-foreground">
                                    Click to upload WHT credit note
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">Image or PDF (optional - can add later)</p>
                                </label>
                              ) : (
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" />
                                    <div>
                                      <p className="text-xs sm:text-sm font-medium">
                                        {whtCreditNoteFile?.name || 'WHT Credit Note'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {whtCreditNoteFile ? 'Ready to upload' : 'Credit Note uploaded'}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setWhtCreditNoteFile(null)
                                      if (whtCreditNoteUrl && whtCreditNoteUrl.startsWith('blob:')) {
                                        URL.revokeObjectURL(whtCreditNoteUrl)
                                      }
                                      setWhtCreditNoteUrl(null)
                                      // Update tax classification to remove credit note
                                      setTaxClassification(prev => prev ? {
                                        ...prev,
                                        whtCreditNoteUrl: undefined,
                                        whtCreditNoteFileId: undefined
                                      } : undefined)
                                      // Reset file input
                                      const input = document.getElementById('wht-credit-note-upload') as HTMLInputElement
                                      if (input) input.value = ''
                                    }}
                                    className="text-destructive hover:text-destructive/80"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground">
                                💡 Upload the credit note you received from your customer showing WHT was deducted. You can add this later if you don't have it now.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* VAT Eligibility Explanation - show when user cannot charge VAT */}
                      {formData.type === 'income' && !canChargeVAT(profile) && (
                        <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <AlertDescription className="text-xs sm:text-sm text-amber-900 dark:text-amber-100">
                            <strong>VAT Qualification:</strong> {getVATEligibility(profile).reason} Go to Settings → VAT &amp; Turnover to update your annual turnover and VAT registration if you qualify (₦100M+ turnover + FIRS VAT registration).
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {/* VAT Applicable - only show for income transactions and if user can charge VAT */}
                      {formData.type === 'income' && canChargeVAT(profile) && (
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
                                    <button
                                      type="button"
                                      onClick={() => openHelpModal(
                                        "Value Added Tax (VAT)",
                                        "If you're VAT-registered and this income includes VAT, you'll need to remit the VAT amount to the government. The VAT portion will be excluded from your taxable income.\n\nStandard VAT rate in Nigeria: 7.5%\n\nNote: VAT only applies to income transactions, not expenses."
                                      )}
                                      className="text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <HelpCircle className="w-4 h-4 cursor-pointer" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm">If you're VAT-registered and this income includes VAT, you'll need to remit the VAT amount to the government.</p>
                                    <p className="text-xs text-muted-foreground mt-1">Click for more details</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          
                          {taxClassification.vatApplicable && (
                            <div className="space-y-2">
                              <Label>VAT Rate (%)</Label>
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="7.5"
                                value={taxClassification.vatRate?.toString() || ''}
                                onChange={(e) => {
                                  setTaxClassificationManuallyEdited(true)
                                  const value = e.target.value
                                  // Allow empty string, numbers, and decimals
                                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    const rate = value === '' ? undefined : parseFloat(value)
                                    setTaxClassification(prev => ({
                                      ...prev,
                                      vatRate: rate
                                    }))
                                  }
                                }}
                                className="text-xs sm:text-sm"
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
          </div>
        </div>
      </div>
    </>
  ) : null

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
                className="text-xs sm:text-sm"
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

      {/* Help Modal */}
      <Dialog open={helpModalOpen} onOpenChange={setHelpModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{helpModalContent?.title || "Help"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground whitespace-pre-line">
              {helpModalContent?.content}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setHelpModalOpen(false)}>
                Got it
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
    </>
  )
}
