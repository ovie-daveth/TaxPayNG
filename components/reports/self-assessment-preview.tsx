"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ReportData } from "@/lib/services/reportService"
import { formatCurrencyAmount, formatCurrencyInput, handleCurrencyInputChange } from "@/lib/utils/currency"
import { format } from "date-fns"
import { Printer, ArrowLeft, Plus, Trash2, X, Upload, Loader2, FileCheck, Clock, Mail, CheckCircle2, ExternalLink, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { ocrService } from "@/lib/services/ocrService"
import { taxPaymentService, invoiceService, transactionService } from "@/lib/services"
import { TaxPayment, Invoice, Transaction } from "@/lib/types"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { calculateNigerianTax } from "@/lib/tax-calculator"

interface SelfAssessmentPreviewProps {
  reportData: ReportData
  formData?: {
    includeIncome?: boolean
    includeExpenses?: boolean
    includeTax?: boolean
    includeReliefs?: boolean
  }
  isEditing?: boolean
  onDataChange?: (data: ReportData) => void
  onBack?: () => void
  reportId?: string
  showFileButton?: boolean
  filingStatus?: 'not_filed' | 'filed' | 'submitted' | 'acknowledged'
  filingMethod?: 'direct' | 'agent' | 'email' | null
}

export function SelfAssessmentPreview({ reportData, formData, isEditing = false, onDataChange, onBack, reportId, showFileButton = false, filingStatus, filingMethod }: SelfAssessmentPreviewProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { hasAccess } = useSubscription()
  const hasGoldAccess = hasAccess('GOLD')
  
  // Get tax classification benefits (Gold+ feature)
  const capitalAllowances = reportData.taxClassification?.capitalAllowances || 0
  const whtCredits = reportData.taxClassification?.whtCredits || 0
  const vatInput = reportData.taxClassification?.vatInput || 0
  const vatOutput = reportData.taxClassification?.vatOutput || 0
  const capitalAllowanceDetails = reportData.taxClassification?.capitalAllowanceDetails || []
  const whtCreditDetails = reportData.taxClassification?.whtCreditDetails || []
  const vatDetails = reportData.taxClassification?.vatDetails || []
  
  const [taxCredits, setTaxCredits] = useState<{ paye: number; wht: number; provisional: number; other: number; total: number }>({
    paye: 0,
    wht: 0,
    provisional: 0,
    other: 0,
    total: 0
  })
  // All tax credits (from invoices, transactions, payments, and manual entries)
  const [allTaxCredits, setAllTaxCredits] = useState<Array<{
    id: string
    type: string
    amount: number
    taxYear: number
    evidenceAttached: boolean
    notes: string
    source: 'invoice' | 'transaction' | 'payment' | 'manual'
    invoiceId?: string
    transactionId?: string
    paymentId?: string
  }>>([])
  const [loadingCredits, setLoadingCredits] = useState(true)
  const [showAddCredit, setShowAddCredit] = useState(false)
  const [newCredit, setNewCredit] = useState({
    type: '',
    amount: '',
    amountDisplay: '',
    taxYear: reportData.period.year.toString(),
    evidenceAttached: false,
    notes: ''
  })
  
  // Editable personal information
  const [personalInfo, setPersonalInfo] = useState({
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    state: '',
    lga: '',
    contactPhone: '',
    contactEmail: ''
  })

  // Declaration & Signature
  const [declarationInfo, setDeclarationInfo] = useState({
    signatureUrl: '',
    signatureDate: new Date().toISOString().split('T')[0], // Default to today's date
    signatureText: '' // Text extracted from signature via OCR if applicable
  })
  const [uploadingSignature, setUploadingSignature] = useState(false)
  const [scanningSignature, setScanningSignature] = useState(false)

  // Attachment checklist
  const [attachments, setAttachments] = useState({
    payslips: false,
    receipts: false,
    invoices: false,
    bankStatements: false,
    capitalAllowance: false,
    taxPayments: false
  })

  // Evidence attached for Part C (Deductible Expenses & Reliefs)
  const [reliefEvidence, setReliefEvidence] = useState<Record<string, boolean>>({
    pensionContribution: false,
    nhfContribution: false,
    lifeInsurance: false,
    healthInsurance: false,
    businessExpenses: false,
    depreciation: false,
    charitableDonations: false,
    otherRelief: false
  })

  // Notes for Part C (Deductible Expenses & Reliefs)
  const [reliefNotes, setReliefNotes] = useState<Record<string, string>>({
    pensionContribution: '',
    nhfContribution: '',
    lifeInsurance: '',
    healthInsurance: '',
    businessExpenses: '',
    depreciation: '',
    charitableDonations: '',
    otherRelief: ''
  })

  // Editable relief amounts (users can add/edit these)
  const [reliefAmounts, setReliefAmounts] = useState<Record<string, number>>({
    pensionContribution: 0,
    nhfContribution: 0,
    lifeInsurance: 0,
    healthInsurance: 0,
    depreciation: 0,
    charitableDonations: 0,
    otherRelief: 0
  })

  // Track if personal info has been initialized from address
  const personalInfoInitializedRef = useRef(false)
  
  // Initialize personal info from reportData metadata OR user profile (only once, don't overwrite user input)
  useEffect(() => {
    // Only initialize once, and only if fields are empty (user hasn't entered anything)
    if (!personalInfoInitializedRef.current) {
      setPersonalInfo(prev => {
        const newState = { ...prev }
        
        // First, try to get from saved metadata
        const savedPersonalInfo = (reportData as any).metadata?.personalInfo
        
        // Set from saved metadata if available, otherwise from profile
        if (savedPersonalInfo) {
          // Use saved values if they exist
          newState.dateOfBirth = prev.dateOfBirth || savedPersonalInfo.dateOfBirth || ''
          newState.gender = prev.gender || savedPersonalInfo.gender || ''
          newState.maritalStatus = prev.maritalStatus || savedPersonalInfo.maritalStatus || ''
          newState.state = prev.state || savedPersonalInfo.state || ''
          newState.lga = prev.lga || savedPersonalInfo.lga || ''
          newState.contactPhone = prev.contactPhone || savedPersonalInfo.contactPhone || ''
          newState.contactEmail = prev.contactEmail || savedPersonalInfo.contactEmail || ''
        } else {
          // Initialize from user profile if no saved data
          // Set state/lga from address if they're currently empty
          if (profile?.address && !prev.state && !prev.lga) {
            newState.state = profile.address.state || ''
            newState.lga = profile.address.city || '' // Using city as LGA approximation
          } else if (reportData.userInfo.address && !prev.state && !prev.lga) {
            const addressParts = reportData.userInfo.address.split(',')
            newState.state = addressParts[1]?.trim() || ''
            newState.lga = addressParts[2]?.trim() || ''
          }
          
          // Set phone from profile if available
          if (!prev.contactPhone && profile?.phone) {
            newState.contactPhone = profile.phone
          }
          
          // Set email from user or profile
          if (!prev.contactEmail) {
            newState.contactEmail = user?.email || profile?.email || ''
          }
        }
        
        return newState
      })
      personalInfoInitializedRef.current = true
    }
  }, [profile, user, reportData]) // Include dependencies to re-initialize if profile changes

  // Update tax credits totals when credits change
  const updateTaxCreditsTotals = (credits: typeof allTaxCredits) => {
    let paye = 0
    let wht = 0
    let provisional = 0
    let other = 0
    
    credits.forEach(credit => {
      if (credit.type === 'PAYE withheld by employer') {
        paye += credit.amount
      } else if (credit.type === 'Withholding Tax (WHT) from clients/orders') {
        wht += credit.amount
      } else if (credit.type === 'Provisional tax payments / Installments') {
        provisional += credit.amount
      } else {
        other += credit.amount
      }
    })
    
    setTaxCredits({
      paye,
      wht,
      provisional,
      other,
      total: paye + wht + provisional + other
    })
  }

  const handleAddCredit = () => {
    // Parse the amount from display value or raw value
    const amountValue = newCredit.amountDisplay ? 
      parseFloat(newCredit.amountDisplay.replace(/[,\u20A6]/g, '')) : 
      parseFloat(newCredit.amount) || 0

    if (!newCredit.type || !amountValue || amountValue <= 0) {
      toast.error("Please fill in type and amount")
      return
    }

    const credit = {
      id: `manual-${Date.now()}`,
      type: newCredit.type,
      amount: amountValue,
      taxYear: parseInt(newCredit.taxYear) || reportData.period.year,
      evidenceAttached: newCredit.evidenceAttached,
      notes: newCredit.notes,
      source: 'manual' as const
    }

    const updated = [...allTaxCredits, credit]
    setAllTaxCredits(updated)
    updateTaxCreditsTotals(updated)
    
    setNewCredit({
      type: '',
      amount: '',
      amountDisplay: '',
      taxYear: reportData.period.year.toString(),
      evidenceAttached: false,
      notes: ''
    })
    setShowAddCredit(false)
    toast.success("Tax credit added")
  }

  const updateReportData = (updates: Partial<ReportData>) => {
    if (onDataChange) {
      const updated = { ...reportData, ...updates }
      // Also store personal info and attachments in metadata
      const metadata = (updated as any).metadata || {}
      metadata.personalInfo = { ...personalInfo }
      metadata.attachments = { ...attachments }
      metadata.reliefEvidence = { ...reliefEvidence }
      metadata.reliefNotes = { ...reliefNotes }
      metadata.reliefAmounts = { ...reliefAmounts }
      metadata.manualTaxCredits = allTaxCredits.filter(c => c.source === 'manual')
      // Store evidence attached status and notes for all tax credits (keyed by id)
      metadata.taxCreditEvidence = allTaxCredits.reduce((acc, credit) => {
        acc[credit.id] = {
          evidenceAttached: credit.evidenceAttached,
          notes: credit.notes
        }
        return acc
      }, {} as Record<string, { evidenceAttached: boolean; notes: string }>)
      metadata.declarationInfo = { ...declarationInfo }
      ;(updated as any).metadata = metadata
      onDataChange(updated)
    }
  }

  const handleSignatureUpload = async (file: File) => {
    setUploadingSignature(true)
    setScanningSignature(true)
    try {
      // Upload signature image to ImageKit
      const uploadResult = await uploadToImageKit(file, 'signatures')
      
      // Try OCR extraction to see if there's any text in the signature image
      let extractedText = ''
      try {
        const ocrResult = await ocrService.extractReceiptData(file)
        extractedText = ocrResult.rawText || ''
      } catch (ocrError) {
        // OCR might fail for signature images - that's okay, signatures are usually just images
        console.log('OCR extraction not applicable for signature')
      }
      
      setDeclarationInfo(prev => ({
        ...prev,
        signatureUrl: uploadResult.url,
        signatureText: extractedText
      }))
      
      // The useEffect will automatically sync this change to parent reportData
      toast.success("Signature uploaded successfully")
    } catch (error) {
      console.error("Error uploading signature:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to upload signature"
      toast.error(errorMessage)
    } finally {
      setUploadingSignature(false)
      setScanningSignature(false)
    }
  }

  // Track if we've initialized to prevent re-initialization loops
  const hasInitializedRef = useRef(false)
  
  // Load saved personal info and attachments from metadata
  useEffect(() => {
    if (isUpdatingRef.current) return // Don't update if we're in the middle of syncing
    
    // Only initialize once, or when reportData ID changes (new report)
    const reportId = (reportData as any).id || JSON.stringify(reportData.period)
    const initializationKey = `${reportId}-${hasInitializedRef.current}`
    
    // Initialize relief amounts from reportData (which will be 0 by default now)
    // Prefer metadata reliefAmounts if they exist, otherwise use reportData.tax.reliefs
    const savedReliefAmounts = (reportData as any).metadata?.reliefAmounts
    // Auto-populate depreciation from capital allowances if available
    const autoDepreciation = capitalAllowances > 0 ? capitalAllowances : 0
    const newReliefAmounts = savedReliefAmounts ? {
      pensionContribution: savedReliefAmounts.pensionContribution || 0,
      nhfContribution: savedReliefAmounts.nhfContribution || 0,
      lifeInsurance: savedReliefAmounts.lifeInsurance || 0,
      healthInsurance: savedReliefAmounts.healthInsurance || 0,
      depreciation: savedReliefAmounts.depreciation || autoDepreciation, // Use saved value or auto-populate
      charitableDonations: savedReliefAmounts.charitableDonations || 0,
      otherRelief: savedReliefAmounts.otherRelief || 0
    } : {
      pensionContribution: reportData.tax.reliefs.pensionContribution || 0,
      nhfContribution: reportData.tax.reliefs.nhfContribution || 0,
      lifeInsurance: reportData.tax.reliefs.lifeInsurance || 0,
      healthInsurance: reportData.tax.reliefs.healthInsurance || 0,
      depreciation: autoDepreciation, // Auto-populate from capital allowances
      charitableDonations: reportData.tax.reliefs.charitableDonations || 0,
      otherRelief: 0
    }
    
    // Always update depreciation if capital allowances are available and depreciation is 0 or not set
    if (autoDepreciation > 0 && (newReliefAmounts.depreciation === 0 || (!savedReliefAmounts || !savedReliefAmounts.depreciation))) {
      newReliefAmounts.depreciation = autoDepreciation
    }
    
    // Only update if values actually changed
    const currentReliefAmountsStr = JSON.stringify(reliefAmounts)
    const newReliefAmountsStr = JSON.stringify(newReliefAmounts)
    if (currentReliefAmountsStr !== newReliefAmountsStr) {
      isUpdatingRef.current = true
      setReliefAmounts(newReliefAmounts)
      setTimeout(() => { isUpdatingRef.current = false }, 50)
    }
  }, [reportData, capitalAllowances]) // Add capitalAllowances as dependency

  // Separate useEffect to update depreciation when capitalAllowances changes
  useEffect(() => {
    if (isUpdatingRef.current) return
    if (capitalAllowances > 0 && (reliefAmounts.depreciation === 0 || reliefAmounts.depreciation !== capitalAllowances)) {
      // Only update if it's truly 0 or different from capitalAllowances
      const savedReliefAmounts = (reportData as any).metadata?.reliefAmounts
      if (!savedReliefAmounts || !savedReliefAmounts.depreciation || savedReliefAmounts.depreciation === 0) {
        isUpdatingRef.current = true
        setReliefAmounts(prev => ({ ...prev, depreciation: capitalAllowances }))
        setTimeout(() => { isUpdatingRef.current = false }, 50)
      }
    }
  }, [capitalAllowances, reportData])

  useEffect(() => {
    if (isUpdatingRef.current) return

    if ((reportData as any).metadata) {
      if ((reportData as any).metadata.personalInfo) {
        setPersonalInfo(prev => {
          const newInfo = { ...prev, ...(reportData as any).metadata.personalInfo }
          return JSON.stringify(prev) !== JSON.stringify(newInfo) ? newInfo : prev
        })
      }
      if ((reportData as any).metadata.attachments) {
        setAttachments(prev => {
          const newAttachments = { ...prev, ...(reportData as any).metadata.attachments }
          return JSON.stringify(prev) !== JSON.stringify(newAttachments) ? newAttachments : prev
        })
      }
      if ((reportData as any).metadata.reliefEvidence) {
        setReliefEvidence(prev => {
          const newEvidence = { ...prev, ...(reportData as any).metadata.reliefEvidence }
          return JSON.stringify(prev) !== JSON.stringify(newEvidence) ? newEvidence : prev
        })
      }
      if ((reportData as any).metadata.reliefNotes) {
        setReliefNotes(prev => {
          const newNotes = { ...prev, ...(reportData as any).metadata.reliefNotes }
          return JSON.stringify(prev) !== JSON.stringify(newNotes) ? newNotes : prev
        })
      }
      if ((reportData as any).metadata.manualTaxCredits) {
        // Manual credits will be loaded in loadTaxCredits
      }
      if ((reportData as any).metadata.declarationInfo) {
        setDeclarationInfo(prev => {
          const newInfo = { 
            ...prev, 
            ...(reportData as any).metadata.declarationInfo,
            signatureDate: (reportData as any).metadata.declarationInfo.signatureDate || prev.signatureDate
          }
          return JSON.stringify(prev) !== JSON.stringify(newInfo) ? newInfo : prev
        })
      }
    }
    
    hasInitializedRef.current = true
  }, [reportData])

  // Use useRef to track previous values and prevent infinite loops
  const prevMetadataRef = useRef<string>('')
  const isInitialMount = useRef(true)
  const isUpdatingRef = useRef(false)
  
  // Initialize prevMetadataRef with current metadata from reportData on mount
  useEffect(() => {
    if (isInitialMount.current) {
      const currentMetadata = {
        personalInfo: (reportData as any).metadata?.personalInfo || {},
        attachments: (reportData as any).metadata?.attachments || {},
        reliefEvidence: (reportData as any).metadata?.reliefEvidence || {},
        reliefNotes: (reportData as any).metadata?.reliefNotes || {},
        reliefAmounts: (reportData as any).metadata?.reliefAmounts || {},
        manualTaxCredits: (reportData as any).metadata?.manualTaxCredits || [],
        taxCreditEvidence: (reportData as any).metadata?.taxCreditEvidence || {},
        declarationInfo: (reportData as any).metadata?.declarationInfo || {}
      }
      prevMetadataRef.current = JSON.stringify(currentMetadata)
      isInitialMount.current = false
    }
  }, [reportData])
  
  // Sync all metadata changes to parent reportData whenever they change
  useEffect(() => {
    // Don't sync if we don't have onDataChange or if we're currently updating
    if (!onDataChange || isUpdatingRef.current) return
    
    // Allow sync if initialization is complete OR if user has manually entered data
    // This ensures personalInfo changes are saved even during initial mount
    const hasUserInput = personalInfo.dateOfBirth || personalInfo.gender || personalInfo.maritalStatus || 
                         personalInfo.state || personalInfo.lga || personalInfo.contactPhone || personalInfo.contactEmail
    
    if (!hasInitializedRef.current && !hasUserInput) {
      // Wait for initialization if no user input yet
      return
    }
    
    // Create new metadata object
    const newMetadata = {
      personalInfo: { ...personalInfo },
      attachments: { ...attachments },
      reliefEvidence: { ...reliefEvidence },
      reliefNotes: { ...reliefNotes },
      reliefAmounts: { ...reliefAmounts },
      manualTaxCredits: allTaxCredits.filter(c => c.source === 'manual'),
      // Store evidence attached status and notes for all tax credits (keyed by id)
      taxCreditEvidence: allTaxCredits.reduce((acc, credit) => {
        acc[credit.id] = {
          evidenceAttached: credit.evidenceAttached,
          notes: credit.notes
        }
        return acc
      }, {} as Record<string, { evidenceAttached: boolean; notes: string }>),
      declarationInfo: { ...declarationInfo }
    }
    
    // Serialize to compare with previous value
    const newMetadataStr = JSON.stringify(newMetadata)
    
    // Only sync if metadata actually changed
    if (prevMetadataRef.current !== newMetadataStr) {
      isUpdatingRef.current = true
      prevMetadataRef.current = newMetadataStr
      
      // Calculate total reliefs from user-entered amounts
      const totalReliefs = Object.values(reliefAmounts).reduce((sum, amount) => sum + (amount || 0), 0)
      
      // Recalculate tax with updated reliefs
      const taxCalcData = {
        businessType: (reportData as any).userInfo?.businessType || 'freelancer',
        period: 'yearly' as const,
        income: reportData.tax.grossIncome,
        rentPaid: 0,
        pensionContribution: reliefAmounts.pensionContribution || 0,
        healthInsurance: reliefAmounts.healthInsurance || 0,
        housingFund: reliefAmounts.nhfContribution || 0,
        lifeInsurance: reliefAmounts.lifeInsurance || 0,
        charitableDonations: reliefAmounts.charitableDonations || 0,
        businessExpenses: reportData.expenses.taxDeductibleExpenses,
        dependents: 0
      }
      const taxResult = calculateNigerianTax(taxCalcData)
      
      const updated = { 
        ...reportData,
        tax: {
          ...reportData.tax,
          reliefs: {
            ...reportData.tax.reliefs,
            pensionContribution: reliefAmounts.pensionContribution || 0,
            nhfContribution: reliefAmounts.nhfContribution || 0,
            healthInsurance: reliefAmounts.healthInsurance || 0,
            lifeInsurance: reliefAmounts.lifeInsurance || 0,
            charitableDonations: reliefAmounts.charitableDonations || 0
          },
          totalReliefs: taxResult.totalReliefs || 0,
          taxableIncome: taxResult.taxableIncome || 0,
          taxPayable: taxResult.totalTax || 0,
          taxBrackets: taxResult.taxBrackets || []
        }
      }
      ;(updated as any).metadata = newMetadata
      onDataChange(updated)
      
      // Reset the flag after a short delay to allow the update to complete
      setTimeout(() => {
        isUpdatingRef.current = false
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalInfo, attachments, reliefEvidence, reliefNotes, reliefAmounts, allTaxCredits, declarationInfo])

  const formatCurrency = (amount: number) => formatCurrencyAmount(amount, 'NGN')
  
  const periodLabel = reportData.period.periodType === 'annual' 
    ? `Annual ${reportData.period.year}`
    : reportData.period.quarter 
    ? `Q${reportData.period.quarter} ${reportData.period.year}`
    : `${format(new Date(reportData.period.startDate), 'MMM dd')} - ${format(new Date(reportData.period.endDate), 'MMM dd, yyyy')}`

  // Fetch tax credits from invoices, transactions, and payments
  useEffect(() => {
    const loadTaxCredits = async () => {
      if (!user?.uid) {
        setLoadingCredits(false)
        return
      }

      try {
        setLoadingCredits(true)
        const credits: typeof allTaxCredits = []
        
        // Filter for the report period
        const periodStart = new Date(reportData.period.startDate)
        const periodEnd = new Date(reportData.period.endDate)
        periodEnd.setHours(23, 59, 59, 999)

        // 1. Get WHT from ALL invoices (where user is the supplier/issuer and WHT was deducted)
        try {
          const allInvoices = await invoiceService.getAll([
            { field: 'userId', operator: '==', value: user.uid },
            { field: 'whtDeducted', operator: '==', value: true }
          ])
          
          allInvoices.forEach((invoice: Invoice) => {
            if (invoice.whtDeducted && invoice.whtAmount && invoice.whtAmount > 0) {
              const invoiceDate = new Date(invoice.issueDate)
              if (invoiceDate >= periodStart && invoiceDate <= periodEnd) {
                credits.push({
                  id: `invoice-${invoice.id}`,
                  type: 'Withholding Tax (WHT) from clients/orders',
                  amount: invoice.whtAmount,
                  taxYear: reportData.period.year,
                  evidenceAttached: false,
                  notes: invoice.whtCertificateNumber ? `Certificate: ${invoice.whtCertificateNumber}` : `Invoice: ${invoice.invoiceNumber}`,
                  source: 'invoice',
                  invoiceId: invoice.id
                })
              }
            }
          })
        } catch (error) {
          console.error('Error fetching invoices for WHT:', error)
        }

        // 2. Get WHT from transactions (if any transactions have WHT info)
        if (reportData.income.transactions) {
          reportData.income.transactions.forEach(transaction => {
            // Check if transaction has WHT-related notes or description
            if (transaction.notes?.toLowerCase().includes('wht') || 
                transaction.notes?.toLowerCase().includes('withholding') ||
                transaction.description?.toLowerCase().includes('wht')) {
              const txnDate = new Date(transaction.date)
              if (txnDate >= periodStart && txnDate <= periodEnd && transaction.type === 'income') {
                // Try to extract WHT amount from notes or use a portion of amount
                const whtMatch = transaction.notes?.match(/wht[:\s]+([\d,]+\.?\d*)/i)
                const whtAmount = whtMatch ? parseFloat(whtMatch[1].replace(/,/g, '')) : (transaction.amount as number) * 0.05 // Default 5%
                
                credits.push({
                  id: `transaction-${transaction.id}`,
                  type: 'Withholding Tax (WHT) from clients/orders',
                  amount: whtAmount,
                  taxYear: reportData.period.year,
                  evidenceAttached: false,
                  notes: transaction.description || transaction.notes || '',
                  source: 'transaction',
                  transactionId: transaction.id
                })
              }
            }
          })
        }

        // 3. Get tax payments (PAYE, provisional, etc.)
        const payments = await taxPaymentService.getUserPaymentsSimple(user.uid)
        const periodPayments = payments.filter(payment => {
          const paymentDate = new Date(payment.createdAt)
          return paymentDate >= periodStart && paymentDate <= periodEnd && payment.status === 'completed'
        })

        // Track month/year combinations to prevent duplicates
        const monthYearMap = new Map<string, TaxPayment>()
        
        // Helper function to extract month/year from taxDuration
        const getMonthYearKey = (payment: TaxPayment): string | null => {
          if (payment.period === 'monthly' && payment.taxDuration) {
            // Extract month and year from taxDuration (e.g., "October 2024" -> "2024-10")
            const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                              'july', 'august', 'september', 'october', 'november', 'december']
            const durationLower = payment.taxDuration.toLowerCase()
            const yearMatch = payment.taxDuration.match(/\d{4}/)
            const year = yearMatch ? yearMatch[0] : reportData.period.year.toString()
            
            for (let i = 0; i < monthNames.length; i++) {
              if (durationLower.includes(monthNames[i])) {
                const month = String(i + 1).padStart(2, '0')
                return `${year}-${month}`
              }
            }
            
            // Try to extract month number if format is different
            const monthMatch = payment.taxDuration.match(/\b(0?[1-9]|1[0-2])\b/)
            if (monthMatch) {
              const month = monthMatch[1].padStart(2, '0')
              return `${year}-${month}`
            }
          }
          return null
        }

        // Process payments and keep only one per month/year
        periodPayments.forEach(payment => {
          if (payment.period === 'monthly') {
            const monthYearKey = getMonthYearKey(payment)
            if (monthYearKey) {
              // If we already have a payment for this month/year, skip or replace if this one is newer
              const existing = monthYearMap.get(monthYearKey)
              if (!existing || new Date(payment.createdAt) > new Date(existing.createdAt)) {
                monthYearMap.set(monthYearKey, payment)
              }
            } else {
              // If we can't extract month/year, add it anyway (shouldn't happen often)
              monthYearMap.set(`unknown-${payment.id}`, payment)
            }
          } else {
            // For quarterly or yearly payments, add them directly (no duplicate check needed)
            monthYearMap.set(`other-${payment.id}`, payment)
          }
        })

        // Add unique payments to credits
        Array.from(monthYearMap.values()).forEach(payment => {
          let type = 'Other tax credits / overpayments from prior year'
          if (payment.notes?.toLowerCase().includes('paye') || payment.paymentMethod === 'firs') {
            type = 'PAYE withheld by employer'
          } else if (payment.notes?.toLowerCase().includes('provisional') || payment.period === 'quarterly') {
            type = 'Provisional tax payments / Installments'
          }

          credits.push({
            id: `payment-${payment.id}`,
            type,
            amount: payment.amount,
            taxYear: reportData.period.year,
            evidenceAttached: false,
            notes: payment.notes || payment.taxDuration || '',
            source: 'payment',
            paymentId: payment.id
          })
        })

        // 4. Load manual credits from metadata
        if ((reportData as any).metadata?.manualTaxCredits) {
          credits.push(...(reportData as any).metadata.manualTaxCredits)
        }

        // 5. Restore evidence attached status and notes from metadata for all credits
        const taxCreditEvidence = (reportData as any).metadata?.taxCreditEvidence || {}
        
        // Restore evidence and notes for each credit
        credits.forEach(credit => {
          const savedEvidence = taxCreditEvidence[credit.id]
          if (savedEvidence !== undefined && savedEvidence !== null) {
            // Restore evidence attached status - check if explicitly saved (true or false)
            if (savedEvidence.evidenceAttached !== undefined) {
              // Handle both boolean and string representations
              credit.evidenceAttached = savedEvidence.evidenceAttached === true || 
                                       savedEvidence.evidenceAttached === 'true' ||
                                       savedEvidence.evidenceAttached === 1
            }
            // Restore notes if they were edited (saved in metadata)
            if (savedEvidence.notes !== undefined && savedEvidence.notes !== null) {
              credit.notes = savedEvidence.notes
            }
          }
        })

        setAllTaxCredits(credits)
        
        // Calculate aggregated totals
        let paye = 0
        let wht = 0
        let provisional = 0
        let other = 0
        
        credits.forEach(credit => {
          if (credit.type === 'PAYE withheld by employer') {
            paye += credit.amount
          } else if (credit.type === 'Withholding Tax (WHT) from clients/orders') {
            wht += credit.amount
          } else if (credit.type === 'Provisional tax payments / Installments') {
            provisional += credit.amount
          } else {
            other += credit.amount
          }
        })
        
        setTaxCredits({
          paye,
          wht,
          provisional,
          other,
          total: paye + wht + provisional + other
        })
      } catch (error) {
        console.error("Error loading tax credits:", error)
      } finally {
        setLoadingCredits(false)
      }
    }

    loadTaxCredits()
  }, [user?.uid, reportData.period])

  // Check if user is freelancer or creator
  const isFreelancer = profile?.businessType === 'freelancer' || reportData.userInfo.businessType?.toLowerCase() === 'freelancer'
  const isCreator = profile?.businessType === 'creator' || reportData.userInfo.businessType?.toLowerCase() === 'creator'
  
  // Categorize income by source
  const employmentIncome = reportData.income.incomeByCategory['Salary'] || 
                           reportData.income.incomeByCategory['Employment'] || 0
  
  // For freelancers and creators: all income is business income (break down by category)
  // For others: business income excludes employment income
  const businessIncomeCategories = (isFreelancer || isCreator)
    ? Object.entries(reportData.income.incomeByCategory)
        .filter(([cat]) => !['Salary', 'Employment'].includes(cat))
        .map(([cat, amount]) => ({ category: cat, amount: amount as number }))
        .filter(item => item.amount > 0)
    : Object.entries(reportData.income.incomeByCategory)
        .filter(([cat]) => !['Salary', 'Employment', 'Rental', 'Investment', 'Dividend'].includes(cat))
        .map(([cat, amount]) => ({ category: cat, amount: amount as number }))
        .filter(item => item.amount > 0)
  
  const businessIncome = businessIncomeCategories.reduce((sum, item) => sum + item.amount, 0)
  
  // Calculate category breakdowns with mixed transaction details and VAT transactions
  const categoryBreakdowns: { [category: string]: { 
    totalAmount: number, 
    businessAmount: number, 
    mixedTransactions: Array<{ description: string; originalAmount: number; businessPercentage: number; businessAmount: number }>
    vatTransactions: Array<{ description: string; originalAmount: number; vatAmount: number; taxableAmount: number; vatRate: number }>
  } } = {}
  
  // Process transactions to build category breakdowns
  if (reportData.income.transactions) {
    reportData.income.transactions.forEach(txn => {
      if (txn.type !== 'income') return
      
      const category = txn.category || 'uncategorized'
      if (!categoryBreakdowns[category]) {
        categoryBreakdowns[category] = {
          totalAmount: 0,
          businessAmount: 0,
          mixedTransactions: [],
          vatTransactions: []
        }
      }
      
      // Get the original amount (before VAT exclusion)
      let originalAmount = 0
      if (txn.currency && txn.currency !== 'NGN' && txn.ngnEquivalent) {
        originalAmount = txn.ngnEquivalent
      } else {
        originalAmount = txn.netAmount !== undefined ? txn.netAmount : (typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0)
      }
      
      // Track VAT transactions and apply VAT exclusion if applicable
      let baseAmount = originalAmount
      if (txn.taxClassification?.vatApplicable && txn.taxClassification?.vatRate) {
        const vatRate = txn.taxClassification.vatRate / 100
        const vatAmount = originalAmount * vatRate
        baseAmount = originalAmount * (1 - vatRate)
        
        categoryBreakdowns[category].vatTransactions.push({
          description: txn.description || 'Untitled transaction',
          originalAmount,
          vatAmount,
          taxableAmount: baseAmount,
          vatRate: txn.taxClassification.vatRate
        })
      }
      
      // Calculate business amount based on transaction nature
      let businessAmount = baseAmount
      if (txn.transactionNature === 'mixed' && txn.businessPercentage !== undefined) {
        businessAmount = baseAmount * (txn.businessPercentage / 100)
        categoryBreakdowns[category].mixedTransactions.push({
          description: txn.description || 'Untitled transaction',
          originalAmount: baseAmount,
          businessPercentage: txn.businessPercentage,
          businessAmount
        })
      } else if (txn.transactionNature === 'personal') {
        businessAmount = 0
      }
      
      categoryBreakdowns[category].totalAmount += baseAmount
      categoryBreakdowns[category].businessAmount += businessAmount
    })
  }
  
  // Calculate excluded/adjusted transactions for transparency
  const excludedTransactions = {
    vatExclusions: [] as Array<{ description: string; originalAmount: number; vatAmount: number; taxableAmount: number; vatRate: number }>,
    personalTransactions: [] as Array<{ description: string; amount: number }>,
    mixedTransactions: [] as Array<{ description: string; originalAmount: number; businessPercentage: number; taxableAmount: number }>,
    totalVatExcluded: 0,
    totalPersonalExcluded: 0,
    totalMixedAdjustment: 0
  }

  // Process transactions to identify exclusions
  if (reportData.income.transactions) {
    reportData.income.transactions.forEach(txn => {
      // VAT exclusions (for income with VAT)
      if (txn.type === 'income' && txn.taxClassification?.vatApplicable && txn.taxClassification?.vatRate) {
        const vatRate = txn.taxClassification.vatRate / 100
        const originalAmount = typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0
        const vatAmount = originalAmount * vatRate
        const taxableAmount = originalAmount * (1 - vatRate)
        
        excludedTransactions.vatExclusions.push({
          description: txn.description || 'Untitled transaction',
          originalAmount,
          vatAmount,
          taxableAmount,
          vatRate: txn.taxClassification.vatRate
        })
        excludedTransactions.totalVatExcluded += vatAmount
      }
      
      // Personal transactions (excluded from business income)
      if (txn.type === 'income' && txn.transactionNature === 'personal') {
        const amount = typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0
        excludedTransactions.personalTransactions.push({
          description: txn.description || 'Untitled transaction',
          amount
        })
        excludedTransactions.totalPersonalExcluded += amount
      }
      
      // Mixed transactions (only business percentage counted)
      if (txn.type === 'income' && txn.transactionNature === 'mixed' && txn.businessPercentage !== undefined) {
        const originalAmount = typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0
        const taxableAmount = originalAmount * (txn.businessPercentage / 100)
        const excludedAmount = originalAmount - taxableAmount
        
        excludedTransactions.mixedTransactions.push({
          description: txn.description || 'Untitled transaction',
          originalAmount,
          businessPercentage: txn.businessPercentage,
          taxableAmount
        })
        excludedTransactions.totalMixedAdjustment += excludedAmount
      }
    })
  }
  
  const otherIncome = Object.entries(reportData.income.incomeByCategory)
    .filter(([cat]) => !['Salary', 'Employment', 'Invoice Income'].includes(cat))
    .reduce((sum, [, amount]) => sum + amount, 0)

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=100%,height=100%')
    if (!printWindow) {
      toast.error("Please allow popups to print")
      return
    }

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Personal Income Tax Return - ${reportData.period.year}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 15mm;
      }
      body {
        margin: 0;
      }
      .page-break {
        page-break-before: always;
      }
    }
    body {
      font-family: 'Times New Roman', serif;
      padding: 20px;
      width: 100%;
      margin: 0 auto;
      background: white;
      color: #000;
      font-size: 11pt;
      line-height: 1.4;
    }
    .cover-page {
      text-align: center;
      padding: 40px 20px;
      border: 2px solid #000;
      margin-bottom: 30px;
    }
    .cover-title {
      font-size: 20pt;
      font-weight: bold;
      margin-bottom: 30px;
      text-transform: uppercase;
    }
    .cover-subtitle {
      font-size: 14pt;
      margin-bottom: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .header h1 {
      margin: 0;
      font-size: 18pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .header h2 {
      margin: 5px 0;
      font-size: 14pt;
      font-weight: normal;
    }
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .section-title {
      font-weight: bold;
      font-size: 13pt;
      margin-bottom: 12px;
      border-bottom: 1.5px solid #000;
      padding-bottom: 5px;
      text-transform: uppercase;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 10pt;
    }
    .info-table td {
      padding: 6px 8px;
      border: 1px solid #ccc;
      vertical-align: top;
    }
    .info-table td:first-child {
      font-weight: bold;
      width: 35%;
      background: #f5f5f5;
    }
    .amount-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 10pt;
    }
    .amount-table th,
    .amount-table td {
      padding: 8px;
      border: 1px solid #000;
      text-align: left;
    }
    .amount-table th {
      background: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }
    .amount-table td:last-child {
      text-align: right;
      font-weight: bold;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dotted #666;
      font-size: 10pt;
    }
    .amount-label {
      font-weight: normal;
    }
    .amount-value {
      font-weight: bold;
      text-align: right;
    }
    .total-row {
      border-top: 2px solid #000;
      padding-top: 8px;
      margin-top: 8px;
      font-weight: bold;
      font-size: 11pt;
    }
    .checkbox-list {
      list-style: none;
      padding: 0;
      margin: 10px 0;
    }
    .checkbox-list li {
      padding: 4px 0;
      font-size: 10pt;
    }
    .declaration {
      margin-top: 30px;
      padding: 15px;
      border: 1px solid #000;
      font-size: 10pt;
      line-height: 1.6;
    }
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      margin-top: 40px;
    }
    .signature-line {
      border-top: 1px solid #000;
      padding-top: 8px;
      font-size: 10pt;
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-title">Personal Income Tax Return</div>
    <div class="cover-subtitle">Year of Assessment: ${reportData.period.year}</div>
    <div style="margin-top: 40px; text-align: left; width: 100%; margin-left: auto; margin-right: auto;">
      <table class="info-table" style="border: none;">
        <tr><td style="border: none; padding: 4px 0;"><strong>Taxpayer Name:</strong></td><td style="border: none; padding: 4px 0;">${reportData.userInfo.name}</td></tr>
        <tr><td style="border: none; padding: 4px 0;"><strong>TIN / NIN:</strong></td><td style="border: none; padding: 4px 0;">${reportData.userInfo.tin || 'N/A'}</td></tr>
        <tr><td style="border: none; padding: 4px 0;"><strong>Address:</strong></td><td style="border: none; padding: 4px 0;">${reportData.userInfo.address || 'N/A'}</td></tr>
        <tr><td style="border: none; padding: 4px 0;"><strong>Business Type:</strong></td><td style="border: none; padding: 4px 0;">${reportData.userInfo.businessType || 'N/A'}</td></tr>
        <tr><td style="border: none; padding: 4px 0;"><strong>Date Generated:</strong></td><td style="border: none; padding: 4px 0;">${format(new Date(reportData.generatedAt), 'MMMM dd, yyyy')}</td></tr>
      </table>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- Part A: Personal & Employment Information -->
  <div class="section">
    <div class="section-title">Part A – Personal & Employment Information</div>
    <table class="info-table">
      <tr>
        <td>Full Name</td>
        <td>${reportData.userInfo.name}</td>
      </tr>
      <tr>
        <td>TIN / NIN</td>
        <td>${reportData.userInfo.tin || 'N/A'}</td>
      </tr>
      <tr>
        <td>Date of Birth</td>
        <td>_________________</td>
      </tr>
      <tr>
        <td>Gender</td>
        <td>☐ Male ☐ Female</td>
      </tr>
      <tr>
        <td>Marital Status</td>
        <td>☐ Single ☐ Married ☐ Divorced ☐ Widowed</td>
      </tr>
      <tr>
        <td>State / LGA of Residence</td>
        <td>${reportData.userInfo.address?.split(',')[1]?.trim() || '_________________'}</td>
      </tr>
      <tr>
        <td>Residential Address</td>
        <td>${reportData.userInfo.address || '_________________'}</td>
      </tr>
      <tr>
        <td>Contact (Phone / Email)</td>
        <td>_________________</td>
      </tr>
    </table>
  </div>

  <!-- Part B: Statement of Income -->
  <div class="section">
    <div class="section-title">Part B – Statement of Income (All Sources)</div>
    
    ${(!isFreelancer && !isCreator) ? `
    <div style="margin-bottom: 15px;">
      <strong style="font-size: 11pt;">1. Employment Income (if any)</strong>
      <div class="amount-row">
        <span class="amount-label">Basic Salary</span>
        <span class="amount-value">${formatCurrency(employmentIncome * 0.7)}</span>
      </div>
      <div class="amount-row">
        <span class="amount-label">Allowances (Housing, Transport, Utility, Leave, Overtime, Bonuses, etc.)</span>
        <span class="amount-value">${formatCurrency(employmentIncome * 0.3)}</span>
      </div>
      <div class="amount-row">
        <span class="amount-label">Benefits in Kind (BIK) – accommodation, vehicle, equipment, etc.</span>
        <span class="amount-value">₦0.00</span>
      </div>
      <div class="amount-row total-row">
        <span>Subtotal Employment Income</span>
        <span>${formatCurrency(employmentIncome)}</span>
      </div>
    </div>
    ` : ''}

    <div style="margin-bottom: 15px;">
      <strong style="font-size: 11pt;">${(isFreelancer || isCreator) ? '1.' : '2.'} Business / Self-Employment Income</strong>
      ${(() => {
        const categories = (isFreelancer || isCreator)
          ? Object.entries(reportData.income.incomeByCategory)
              .filter(([cat]) => !['Salary', 'Employment'].includes(cat))
              .filter(([, amt]) => (amt as number) > 0)
          : Object.entries(reportData.income.incomeByCategory)
              .filter(([cat]) => !['Salary', 'Employment', 'Rental', 'Investment', 'Dividend'].includes(cat))
              .filter(([, amt]) => (amt as number) > 0)
        
        if (categories.length > 0) {
          return categories.map(([cat, amt]) => {
            const breakdown = categoryBreakdowns[cat]
            const hasMixedTransactions = breakdown?.mixedTransactions && breakdown.mixedTransactions.length > 0
            const hasVatTransactions = breakdown?.vatTransactions && breakdown.vatTransactions.length > 0
            // Show breakdown if there are VAT transactions OR mixed transactions (regardless of amount comparison)
            const showBreakdownWithVat = (hasMixedTransactions || hasVatTransactions) && breakdown
            
            let breakdownDetails = ''
            if (showBreakdownWithVat && breakdown) {
              const vatDetails = hasVatTransactions ? breakdown.vatTransactions.map((vat: { description: string; originalAmount: number; vatAmount: number; taxableAmount: number; vatRate: number }) => 
                `<div style="margin-left: 15px; font-size: 9pt; color: #1e40af; margin-top: 2px;">
                  VAT ${vat.vatRate}% deducted: ${formatCurrency(vat.vatAmount)} of ${formatCurrency(vat.originalAmount)}
                </div>`
              ).join('') : ''
              
              const mixedDetails = hasMixedTransactions ? breakdown.mixedTransactions.map(mixed => 
                `<div style="margin-left: 15px; font-size: 9pt; color: #b45309; margin-top: 2px;">
                  ${mixed.businessPercentage}% business: ${formatCurrency(mixed.businessAmount)} of ${formatCurrency(mixed.originalAmount)}
                </div>`
              ).join('') : ''
              
              breakdownDetails = vatDetails + mixedDetails
            }
            
            return `
      <div class="amount-row">
        <div>
          <span class="amount-label">${cat}</span>
          <span class="amount-value">${formatCurrency(amt as number)}</span>
        </div>
        ${breakdownDetails}
      </div>
      `
          }).join('')
        } else {
          return `
      <div class="amount-row">
        <span class="amount-label">Gross receipts / revenue from business, freelance, services, gigs, etc.</span>
        <span class="amount-value">${formatCurrency(businessIncome)}</span>
      </div>
      `
        }
      })()}
      <div class="amount-row total-row">
        <span>Subtotal Business Income</span>
        <span>${formatCurrency(businessIncome)}</span>
      </div>
      
      ${(excludedTransactions.vatExclusions.length > 0 || excludedTransactions.personalTransactions.length > 0 || excludedTransactions.mixedTransactions.length > 0) ? `
      <div style="margin-top: 15px; padding: 10px; background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; font-size: 9pt;">
        <strong style="color: #666;">Transaction Adjustments & Exclusions:</strong>
        ${excludedTransactions.vatExclusions.length > 0 ? `
        <div style="margin-top: 8px;">
          <strong style="color: #b45309;">VAT Exclusions (${excludedTransactions.vatExclusions.length} transaction${excludedTransactions.vatExclusions.length > 1 ? 's' : ''}):</strong>
          <div style="margin-left: 10px; margin-top: 4px; color: #666;">
            For income transactions with VAT, the VAT amount (${formatCurrency(excludedTransactions.totalVatExcluded)}) is excluded from taxable income as it must be remitted to the government separately.
          </div>
        </div>
        ` : ''}
        ${excludedTransactions.personalTransactions.length > 0 ? `
        <div style="margin-top: 8px;">
          <strong style="color: #666;">Personal Transactions Excluded (${excludedTransactions.personalTransactions.length} transaction${excludedTransactions.personalTransactions.length > 1 ? 's' : ''}):</strong>
          <div style="margin-left: 10px; margin-top: 4px; color: #666;">
            Personal transactions totaling ${formatCurrency(excludedTransactions.totalPersonalExcluded)} are excluded from business income as they are not taxable business income.
          </div>
        </div>
        ` : ''}
        ${excludedTransactions.mixedTransactions.length > 0 ? `
        <div style="margin-top: 8px;">
          <strong style="color: #666;">Mixed Transactions Adjusted (${excludedTransactions.mixedTransactions.length} transaction${excludedTransactions.mixedTransactions.length > 1 ? 's' : ''}):</strong>
          <div style="margin-left: 10px; margin-top: 4px; color: #666;">
            For mixed transactions, only the business portion is included. Personal portion totaling ${formatCurrency(excludedTransactions.totalMixedAdjustment)} is excluded.
          </div>
        </div>
        ` : ''}
      </div>
      ` : ''}
    </div>

    ${(!isFreelancer && !isCreator) ? `
    <div style="margin-bottom: 15px;">
      <strong style="font-size: 11pt;">3. Other Income Sources</strong>
      ${(() => {
        const rentalAmount = reportData.income.incomeByCategory['Rental'] || 0
        const rentalBreakdown = categoryBreakdowns['Rental']
        const hasRentalVat = rentalBreakdown?.vatTransactions && rentalBreakdown.vatTransactions.length > 0
        const rentalVatDetails = hasRentalVat ? rentalBreakdown.vatTransactions.map((vat: { description: string; originalAmount: number; vatAmount: number; taxableAmount: number; vatRate: number }) => 
          `<div style="margin-left: 15px; font-size: 9pt; color: #1e40af; margin-top: 2px;">
            VAT ${vat.vatRate}% deducted: ${formatCurrency(vat.vatAmount)} of ${formatCurrency(vat.originalAmount)}
          </div>`
        ).join('') : ''
        
        return rentalAmount > 0 ? `
      <div class="amount-row">
        <div>
          <span class="amount-label">Rental income</span>
          <span class="amount-value">${formatCurrency(rentalAmount)}</span>
        </div>
        ${rentalVatDetails}
      </div>
        ` : ''
      })()}
      ${(() => {
        const investmentAmount = reportData.income.incomeByCategory['Investment'] || reportData.income.incomeByCategory['Dividend'] || 0
        const investmentBreakdown = categoryBreakdowns['Investment'] || categoryBreakdowns['Dividend']
        const hasInvestmentVat = investmentBreakdown?.vatTransactions && investmentBreakdown.vatTransactions.length > 0
        const investmentVatDetails = hasInvestmentVat ? investmentBreakdown.vatTransactions.map((vat: { description: string; originalAmount: number; vatAmount: number; taxableAmount: number; vatRate: number }) => 
          `<div style="margin-left: 15px; font-size: 9pt; color: #1e40af; margin-top: 2px;">
            VAT ${vat.vatRate}% deducted: ${formatCurrency(vat.vatAmount)} of ${formatCurrency(vat.originalAmount)}
          </div>`
        ).join('') : ''
        
        return investmentAmount > 0 ? `
      <div class="amount-row">
        <div>
          <span class="amount-label">Dividends / Interest / Investment returns</span>
          <span class="amount-value">${formatCurrency(investmentAmount)}</span>
        </div>
        ${investmentVatDetails}
      </div>
        ` : ''
      })()}
      ${Object.entries(reportData.income.incomeByCategory)
        .filter(([cat, amt]) => 
          !['Salary', 'Employment', 'Invoice Income', 'Rental', 'Investment', 'Dividend'].includes(cat) && 
          (amt as number) > 0
        )
        .map(([cat, amt]) => {
          const breakdown = categoryBreakdowns[cat]
          const hasVat = breakdown?.vatTransactions && breakdown.vatTransactions.length > 0
          const vatDetails = hasVat ? breakdown.vatTransactions.map((vat: { description: string; originalAmount: number; vatAmount: number; taxableAmount: number; vatRate: number }) => 
            `<div style="margin-left: 15px; font-size: 9pt; color: #1e40af; margin-top: 2px;">
              VAT ${vat.vatRate}% deducted: ${formatCurrency(vat.vatAmount)} of ${formatCurrency(vat.originalAmount)}
            </div>`
          ).join('') : ''
          
          return `
      <div class="amount-row">
        <div>
          <span class="amount-label">${cat}</span>
          <span class="amount-value">${formatCurrency(amt as number)}</span>
        </div>
        ${vatDetails}
      </div>
          `
        }).join('')}
      ${otherIncome > 0 ? `
      <div class="amount-row">
        <span class="amount-label">Royalties, commissions, digital earnings, foreign income, etc.</span>
        <span class="amount-value">${formatCurrency(otherIncome)}</span>
      </div>
      ` : ''}
      <div class="amount-row">
        <span class="amount-label">Capital gains (if applicable)</span>
        <span class="amount-value">₦0.00</span>
      </div>
      <div class="amount-row">
        <span class="amount-label">Any other income</span>
        <span class="amount-value">${formatCurrency(Object.entries(reportData.income.incomeByCategory).reduce((sum, [cat, amt]) => {
          if (!['Salary', 'Employment', 'Invoice Income', 'Rental', 'Investment', 'Dividend'].includes(cat)) {
            return sum + amt
          }
          return sum
        }, 0))}</span>
      </div>
      <div class="amount-row total-row">
        <span>Subtotal Other Income</span>
        <span>${formatCurrency((reportData.income.incomeByCategory['Rental'] || 0) + (reportData.income.incomeByCategory['Investment'] || reportData.income.incomeByCategory['Dividend'] || 0) + otherIncome)}</span>
      </div>
    </div>
    ` : ''}

    <div class="amount-row total-row" style="border-top: 3px solid #000; font-size: 12pt; padding-top: 10px;">
      <span>${(isFreelancer || isCreator) ? '2.' : '4.'} Total Gross Income (Sum of above)</span>
      <span>${formatCurrency(reportData.income.totalIncome)}</span>
    </div>
  </div>

  <!-- Part C: Deductible Expenses & Reliefs -->
  <div class="section">
    <div class="section-title">Part C – Deductible Expenses & Reliefs</div>
    <table class="amount-table">
      <thead>
        <tr>
          <th style="width: 50%;">Deduction / Relief Type</th>
          <th style="width: 25%;">Amount (₦)</th>
          <th style="width: 12%;">Evidence Attached? (Y/N)</th>
          <th style="width: 13%;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.tax.reliefs.pensionContribution > 0 ? `
        <tr>
          <td>Pension contribution / Retirement savings</td>
          <td style="text-align: right;">${formatCurrency(reportData.tax.reliefs.pensionContribution)}</td>
          <td style="text-align: center;">☐</td>
          <td></td>
        </tr>
        ` : ''}
        ${reportData.tax.reliefs.nhfContribution > 0 ? `
        <tr>
          <td>National Housing Fund (NHF) contribution</td>
          <td style="text-align: right;">${formatCurrency(reportData.tax.reliefs.nhfContribution)}</td>
          <td style="text-align: center;">☐</td>
          <td></td>
        </tr>
        ` : ''}
        ${reportData.tax.reliefs.lifeInsurance > 0 ? `
        <tr>
          <td>Life Insurance Premiums</td>
          <td style="text-align: right;">${formatCurrency(reportData.tax.reliefs.lifeInsurance)}</td>
          <td style="text-align: center;">☐</td>
          <td></td>
        </tr>
        ` : ''}
        ${reportData.tax.reliefs.healthInsurance > 0 ? `
        <tr>
          <td>Health Insurance / Medical contributions</td>
          <td style="text-align: right;">${formatCurrency(reportData.tax.reliefs.healthInsurance)}</td>
          <td style="text-align: center;">☐</td>
          <td></td>
        </tr>
        ` : ''}
        ${reportData.expenses.totalExpenses > 0 ? `
        <tr>
          <td>Business expenses (if self-employed) – rent, utilities, materials, fuel, services, etc.</td>
          <td style="text-align: right;">${formatCurrency(reportData.expenses.totalExpenses)}</td>
          <td style="text-align: center;">☐</td>
          <td></td>
        </tr>
        ` : ''}
        <tr>
          <td>Depreciation / Capital Allowance on assets (if applicable)</td>
          <td style="text-align: right;">₦0.00</td>
          <td style="text-align: center;">☐</td>
          <td></td>
        </tr>
        ${reportData.tax.reliefs.charitableDonations > 0 ? `
        <tr>
          <td>Charitable Donations</td>
          <td style="text-align: right;">${formatCurrency(reportData.tax.reliefs.charitableDonations)}</td>
          <td style="text-align: center;">☐</td>
          <td></td>
        </tr>
        ` : ''}
        <tr>
          <td>Any other allowed relief or deduction</td>
          <td style="text-align: right;">₦0.00</td>
          <td style="text-align: center;">☐</td>
          <td></td>
        </tr>
        <tr style="border-top: 2px solid #000; font-weight: bold;">
          <td>Total Allowable Deductions & Reliefs</td>
          <td style="text-align: right;">${formatCurrency(reportData.tax.totalReliefs + reportData.expenses.taxDeductibleExpenses)}</td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Part D: Tax Already Paid (Credits) -->
  <div class="section">
    <div class="section-title">Part D – Tax Already Paid (Credits)</div>
    <table class="amount-table">
      <thead>
        <tr>
          <th style="width: 40%;">Type of Payment</th>
          <th style="width: 25%;">Amount (₦)</th>
          <th style="width: 15%;">Tax Year</th>
          <th style="width: 10%;">Evidence Attached (Y/N)</th>
          <th style="width: 10%;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${allTaxCredits.length === 0 ? `
        <tr>
          <td colspan="5" style="text-align: center; color: #666; font-style: italic;">No tax credits recorded for this period</td>
        </tr>
        ` : allTaxCredits.map(credit => `
        <tr>
          <td>${credit.type}</td>
          <td style="text-align: right;">${formatCurrency(credit.amount)}</td>
          <td style="text-align: center;">${credit.taxYear}</td>
          <td style="text-align: center;">${credit.evidenceAttached ? '☑' : '☐'}</td>
          <td>${credit.notes || ''}</td>
        </tr>
        `).join('')}
        <tr style="border-top: 2px solid #000; font-weight: bold;">
          <td>Total Tax Credits / Prepaid Tax</td>
          <td style="text-align: right;">${formatCurrency(taxCredits.total)}</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Part E: Tax Computation -->
  <div class="section">
    <div class="section-title">Part E – Tax Computation</div>
    <div class="amount-row">
      <span class="amount-label">1. Total Gross Income (from Part B)</span>
      <span class="amount-value">${formatCurrency(reportData.tax.grossIncome)}</span>
    </div>
    <div class="amount-row">
      <span class="amount-label">2. Less: Total Allowable Deductions & Reliefs (from Part C)</span>
      <span class="amount-value" style="color: #dc2626;">-${formatCurrency(reportData.tax.totalReliefs + reportData.expenses.taxDeductibleExpenses)}</span>
    </div>
    <div class="amount-row total-row">
      <span>→ Net Taxable Income</span>
      <span>${formatCurrency(reportData.tax.taxableIncome)}</span>
    </div>
    <div style="margin: 15px 0; padding: 10px; background: #f5f5f5; border: 1px solid #ccc;">
      <strong>3. Computed Tax (based on current PIT rates)</strong>
      ${reportData.tax.taxBrackets.map((bracket, index) => `
      <div class="amount-row" style="border: none; padding: 4px 0;">
        <span class="amount-label">${formatCurrency(bracket.amount)} @ ${bracket.rate}%</span>
        <span class="amount-value">${formatCurrency(bracket.tax)}</span>
      </div>
      `).join('')}
      <div class="amount-row total-row" style="border-top: 1px solid #000; margin-top: 8px;">
        <span>→ Gross Tax Due</span>
        <span>${formatCurrency(reportData.tax.taxPayable)}</span>
      </div>
    </div>
    <div class="amount-row">
      <span class="amount-label">4. Less: Tax Credits / Prepaid Tax (from Part D)</span>
      <span class="amount-value" style="color: #dc2626;">-${formatCurrency(taxCredits.total)}</span>
    </div>
    <div class="amount-row total-row" style="border-top: 3px solid #000; font-size: 12pt; padding-top: 10px;">
      <span>→ Net Tax Payable or Refund Due</span>
      <span>${formatCurrency(Math.max(0, reportData.tax.taxPayable - taxCredits.total))}</span>
    </div>
  </div>

  <!-- Part F: Declaration & Signature -->
  <div class="section">
    <div class="section-title">Part F – Declaration & Signature</div>
    <div class="declaration">
      <p style="margin: 0 0 20px 0;">
        <strong>I hereby declare that the information given in this return is correct and complete to the best of my knowledge and belief. 
        I understand that false declaration may lead to penalties under the law.</strong>
      </p>
      <div class="signature-section">
        <div class="signature-line">
          <div>Name: ${reportData.userInfo.name}</div>
          <div style="margin-top: 30px;">
            Signature / Digital Signature: 
            ${declarationInfo.signatureUrl 
              ? `<img src="${declarationInfo.signatureUrl}" alt="Signature" style="max-height: 60px; margin-top: 10px; display: block;" />` 
              : '_________________'}
          </div>
        </div>
        <div class="signature-line">
          <div>Date: ${declarationInfo.signatureDate 
            ? (() => {
                const date = new Date(declarationInfo.signatureDate);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day} / ${month} / ${year}`;
              })()
            : `__ / __ / ${reportData.period.year}`}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Attachment Checklist -->
  <div class="section page-break">
    <div class="section-title">Attachment Checklist</div>
    <p style="font-size: 10pt; margin-bottom: 10px;">Please tick (✓) the documents attached with this return:</p>
    <ul class="checkbox-list">
      <li>☐ Receipts for pension, NHF, insurance, reliefs</li>
      <li>☐ Invoice records or business income evidence (for self-employed)</li>
      <li>☐ Bank statements, rental receipts, dividend/interest slips, WHT certificates</li>
      <li>☐ Capital allowance / depreciation schedules</li>
      <li>☐ Proofs of WHT / earlier tax payments / provisional tax</li>
      <li>☐ Any other supporting documents</li>
    </ul>
  </div>
</body>
</html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  return (
    <Card className="p-2 sm:p-3 md:p-4 overflow-x-hidden max-w-full">
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3 sm:mb-4 justify-end">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto">
          {showFileButton && reportId && !isEditing && (
            (() => {
              // Determine button text and icon based on filing status and method
              const isFiled = filingStatus === 'filed' || filingStatus === 'submitted' || filingStatus === 'acknowledged'
              
              let buttonText = "File Return"
              let ButtonIcon = FileCheck
              let buttonVariant: "default" | "outline" | "secondary" = "default"
              let isDisabled = false
              
              if (isFiled) {
                if (filingMethod === 'agent') {
                  // Agent filing: check if completed (acknowledged) or still pending
                  if (filingStatus === 'acknowledged') {
                    // Agent has completed the filing
                    buttonText = "Filed and Completed"
                    ButtonIcon = CheckCircle2
                    buttonVariant = "outline"
                    isDisabled = true
                  } else {
                    // Still awaiting agent (submitted but not yet acknowledged)
                    buttonText = "Awaiting Agent"
                    ButtonIcon = Clock
                    buttonVariant = "outline"
                    isDisabled = true
                  }
                } else if (filingMethod === 'direct') {
                  // Direct filing: show "Filed and Completed" when acknowledged or filed
                  buttonText = "Filed and Completed"
                  ButtonIcon = CheckCircle2
                  buttonVariant = "outline"
                  isDisabled = true
                } else if (filingMethod === 'email') {
                  // Email filing: show "Mail Sent, Pending Response"
                  buttonText = "Mail Sent, Pending Response"
                  ButtonIcon = Mail
                  buttonVariant = "outline"
                  isDisabled = true
                }
              }
              
              return (
                <Button
                  onClick={() => {
                    if (!isDisabled) {
                      router.push(`/dashboard/reports/file/${reportId}`)
                    }
                  }}
                  variant={buttonVariant}
                  disabled={isDisabled}
                  className="h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto"
                >
                  <ButtonIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">{buttonText}</span>
                  <span className="sm:hidden">{buttonText.length > 15 ? buttonText.split(' ')[0] : buttonText}</span>
                </Button>
              )
            })()
          )}
          <Button
            variant="outline"
            onClick={handlePrint}
            className="h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">Print Return</span>
            <span className="sm:hidden">Print</span>
          </Button>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        {/* Cover Page Preview */}
        <div className="text-center border-2 border-border p-3 sm:p-4 md:p-6 rounded-lg bg-muted/20">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 uppercase">Personal Income Tax Return</h1>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Year of Assessment: {reportData.period.year}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-left">
            <div className="font-semibold">Taxpayer Name:</div>
            <div>{reportData.userInfo.name}</div>
            <div className="font-semibold">TIN / NIN:</div>
            <div>{reportData.userInfo.tin || 'N/A'}</div>
            <div className="font-semibold">Address:</div>
            <div>{reportData.userInfo.address || 'N/A'}</div>
            <div className="font-semibold">Business Type:</div>
            <div>{reportData.userInfo.businessType || 'N/A'}</div>
            <div className="font-semibold">Date Generated:</div>
            <div>{format(new Date(reportData.generatedAt), 'MMMM dd, yyyy')}</div>
          </div>
        </div>

        {/* Part A: Personal & Employment Information */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 border-b-2 border-border pb-1.5 sm:pb-2 uppercase">Part A – Personal & Employment Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div>
              <Label className="text-xs sm:text-sm text-muted-foreground font-semibold">Full Name</Label>
              {isEditing ? (
                <Input 
                  value={reportData.userInfo.name}
                  onChange={(e) => updateReportData({
                    userInfo: { ...reportData.userInfo, name: e.target.value }
                  })}
                  className="mt-1 h-9 sm:h-10 text-xs sm:text-sm"
                />
              ) : (
                <p className="font-medium text-xs sm:text-sm mt-1">{reportData.userInfo.name}</p>
              )}
            </div>
            <div>
              <Label className="text-xs sm:text-sm text-muted-foreground font-semibold">TIN / NIN</Label>
              {isEditing ? (
                <Input 
                  value={reportData.userInfo.tin || ''}
                  onChange={(e) => updateReportData({
                    userInfo: { ...reportData.userInfo, tin: e.target.value }
                  })}
                  className="mt-1 h-9 sm:h-10 text-xs sm:text-sm"
                  placeholder="Enter TIN/NIN"
                />
              ) : (
                <p className="font-medium text-xs sm:text-sm mt-1">{reportData.userInfo.tin || 'N/A'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs sm:text-sm text-muted-foreground font-semibold">Date of Birth</Label>
              {isEditing ? (
                <Input 
                  type="date"
                  value={personalInfo.dateOfBirth}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  className="mt-1 h-9 sm:h-10 text-xs sm:text-sm"
                />
              ) : (
                <p className="font-medium text-xs sm:text-sm text-muted-foreground mt-1">{personalInfo.dateOfBirth || '_________________'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs sm:text-sm text-muted-foreground font-semibold">Gender</Label>
              {isEditing ? (
                <Select value={personalInfo.gender} onValueChange={(value) => setPersonalInfo(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger className="mt-1 h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-medium text-xs sm:text-sm mt-1">{personalInfo.gender ? (personalInfo.gender === 'male' ? '☑ Male ☐ Female' : '☐ Male ☑ Female') : '☐ Male ☐ Female'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs sm:text-sm text-muted-foreground font-semibold">Marital Status</Label>
              {isEditing ? (
                <Select value={personalInfo.maritalStatus} onValueChange={(value) => setPersonalInfo(prev => ({ ...prev, maritalStatus: value }))}>
                  <SelectTrigger className="mt-1 h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-medium text-xs sm:text-sm mt-1">
                  {personalInfo.maritalStatus 
                    ? `☑ ${personalInfo.maritalStatus.charAt(0).toUpperCase() + personalInfo.maritalStatus.slice(1)}`
                    : '☐ Single ☐ Married ☐ Divorced ☐ Widowed'}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs sm:text-sm text-muted-foreground font-semibold">State / LGA of Residence</Label>
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <Input 
                    value={personalInfo.state}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                  <Input 
                    value={personalInfo.lga}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, lga: e.target.value }))}
                    placeholder="LGA"
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              ) : (
                <p className="font-medium text-xs sm:text-sm mt-1">{personalInfo.state && personalInfo.lga ? `${personalInfo.state} / ${personalInfo.lga}` : (reportData.userInfo.address?.split(',')[1]?.trim() || '_________________')}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs sm:text-sm text-muted-foreground font-semibold">Residential Address</Label>
              {isEditing ? (
                <Input 
                  value={reportData.userInfo.address || ''}
                  onChange={(e) => updateReportData({
                    userInfo: { ...reportData.userInfo, address: e.target.value }
                  })}
                  className="mt-1 h-9 sm:h-10 text-xs sm:text-sm"
                  placeholder="Enter full address"
                />
              ) : (
                <p className="font-medium text-xs sm:text-sm mt-1">{reportData.userInfo.address || '_________________'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs sm:text-sm text-muted-foreground font-semibold">Contact Phone</Label>
              {isEditing ? (
                <Input 
                  value={personalInfo.contactPhone}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, contactPhone: e.target.value }))}
                  className="mt-1 h-9 sm:h-10 text-xs sm:text-sm"
                  placeholder="Phone number"
                />
              ) : (
                <p className="font-medium text-xs sm:text-sm text-muted-foreground mt-1">{personalInfo.contactPhone || '_________________'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs sm:text-sm text-muted-foreground font-semibold">Contact Email</Label>
              {isEditing ? (
                <Input 
                  type="email"
                  value={personalInfo.contactEmail}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, contactEmail: e.target.value }))}
                  className="mt-1 h-9 sm:h-10 text-xs sm:text-sm"
                  placeholder="Email address"
                />
              ) : (
                <p className="font-medium text-xs sm:text-sm text-muted-foreground mt-1">{personalInfo.contactEmail || '_________________'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Part B: Statement of Income */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 border-b-2 border-border pb-1.5 sm:pb-2 uppercase">Part B – Statement of Income (All Sources)</h2>
          
          {(!isFreelancer && !isCreator) && (
            <div className="mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">1. Employment Income (if any)</h3>
          <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs sm:text-sm">Basic Salary</span>
                  <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{formatCurrency(employmentIncome * 0.7)}</span>
            </div>
                <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs sm:text-sm break-words sm:break-normal">Allowances (Housing, Transport, Utility, Leave, Overtime, Bonuses, etc.)</span>
                  <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{formatCurrency(employmentIncome * 0.3)}</span>
            </div>
                <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs sm:text-sm">Benefits in Kind (BIK)</span>
                  <span className="font-medium text-xs sm:text-sm whitespace-nowrap">₦0.00</span>
            </div>
                <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 sm:py-3 border-t-2 border-border font-semibold text-xs sm:text-sm">
                  <span>Subtotal Employment Income</span>
                  <span className="whitespace-nowrap">{formatCurrency(employmentIncome)}</span>
          </div>
        </div>
            </div>
          )}

          <div className="mb-4 sm:mb-6">
            <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">{(isFreelancer || isCreator) ? '1.' : '2.'} Business / Self-Employment Income</h3>
          <div className="space-y-2 text-xs sm:text-sm">
              {businessIncomeCategories.length > 0 ? (
                <>
                  {businessIncomeCategories.map((item, index) => {
                    const breakdown = categoryBreakdowns[item.category]
                    const hasMixedTransactions = breakdown?.mixedTransactions && breakdown.mixedTransactions.length > 0
                    const hasVatTransactions = breakdown?.vatTransactions && breakdown.vatTransactions.length > 0
                    // Show breakdown if there are VAT transactions OR mixed transactions (regardless of amount comparison)
                    const showBreakdown = (hasMixedTransactions || hasVatTransactions) && breakdown
                    
                    return (
                      <div key={index} className="py-2 border-b border-border">
                        <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0">
                          <span className="text-muted-foreground text-xs sm:text-sm">{item.category}</span>
                          <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{formatCurrency(item.amount)}</span>
                        </div>
                        {showBreakdown && breakdown && (
                          <div className="mt-1 text-[10px] pl-2 space-y-0.5">
                            {hasVatTransactions && breakdown.vatTransactions.map((vat: { description: string; originalAmount: number; vatAmount: number; taxableAmount: number; vatRate: number }, idx: number) => (
                              <div key={`vat-${idx}`} className="text-blue-700 dark:text-blue-300">
                                VAT {vat.vatRate}% deducted: {formatCurrency(vat.vatAmount)} of {formatCurrency(vat.originalAmount)}
                              </div>
                            ))}
                            {hasMixedTransactions && breakdown.mixedTransactions.map((mixed, idx) => (
                              <div key={`mixed-${idx}`} className="text-amber-700 dark:text-amber-300">
                                {mixed.businessPercentage}% business: {formatCurrency(mixed.businessAmount)} of {formatCurrency(mixed.originalAmount)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 sm:py-3 border-t-2 border-border font-semibold text-xs sm:text-sm">
                    <span>Subtotal Business Income</span>
                    <span className="whitespace-nowrap">{formatCurrency(businessIncome)}</span>
            </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 border-b border-border">
                    <span className="text-muted-foreground text-xs sm:text-sm break-words sm:break-normal">Gross receipts / revenue from business, freelance, services, gigs, etc.</span>
                    <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{formatCurrency(businessIncome)}</span>
            </div>
                  <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 sm:py-3 border-t-2 border-border font-semibold text-xs sm:text-sm">
                    <span>Subtotal Business Income</span>
                    <span className="whitespace-nowrap">{formatCurrency(businessIncome)}</span>
            </div>
                </>
              )}
           
          </div>
        </div>

          {(!isFreelancer && !isCreator) && (
            <div className="mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3">3. Other Income Sources</h3>
              <div className="space-y-2 text-xs sm:text-sm">
                {/* Rental income */}
                {(() => {
                  const rentalAmount = reportData.income.incomeByCategory['Rental'] || 0
                  const rentalBreakdown = categoryBreakdowns['Rental']
                  const hasRentalVat = rentalBreakdown?.vatTransactions && rentalBreakdown.vatTransactions.length > 0
                  return rentalAmount > 0 ? (
                    <div className="py-2 border-b border-border">
                      <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0">
                        <span className="text-muted-foreground text-xs sm:text-sm">Rental income</span>
                        <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{formatCurrency(rentalAmount)}</span>
                      </div>
                      {hasRentalVat && rentalBreakdown && (
                        <div className="mt-1 text-[10px] pl-2 space-y-0.5">
                          {rentalBreakdown.vatTransactions.map((vat: { description: string; originalAmount: number; vatAmount: number; taxableAmount: number; vatRate: number }, idx: number) => (
                            <div key={`rental-vat-${idx}`} className="text-blue-700 dark:text-blue-300">
                              VAT {vat.vatRate}% deducted: {formatCurrency(vat.vatAmount)} of {formatCurrency(vat.originalAmount)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null
                })()}
                
                {/* Dividends / Interest / Investment returns */}
                {(() => {
                  const investmentAmount = reportData.income.incomeByCategory['Investment'] || reportData.income.incomeByCategory['Dividend'] || 0
                  const investmentBreakdown = categoryBreakdowns['Investment'] || categoryBreakdowns['Dividend']
                  const hasInvestmentVat = investmentBreakdown?.vatTransactions && investmentBreakdown.vatTransactions.length > 0
                  return investmentAmount > 0 ? (
                    <div className="py-2 border-b border-border">
                      <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0">
                        <span className="text-muted-foreground text-xs sm:text-sm break-words sm:break-normal">Dividends / Interest / Investment returns</span>
                        <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{formatCurrency(investmentAmount)}</span>
                      </div>
                      {hasInvestmentVat && investmentBreakdown && (
                        <div className="mt-1 text-[10px] pl-2 space-y-0.5">
                          {investmentBreakdown.vatTransactions.map((vat: { description: string; originalAmount: number; vatAmount: number; taxableAmount: number; vatRate: number }, idx: number) => (
                            <div key={`investment-vat-${idx}`} className="text-blue-700 dark:text-blue-300">
                              VAT {vat.vatRate}% deducted: {formatCurrency(vat.vatAmount)} of {formatCurrency(vat.originalAmount)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null
                })()}
                
                {/* Other income categories */}
                {Object.entries(reportData.income.incomeByCategory)
                  .filter(([cat, amt]) => 
                    !['Salary', 'Employment', 'Invoice Income', 'Rental', 'Investment', 'Dividend'].includes(cat) && 
                    (amt as number) > 0
                  )
                  .map(([cat, amt]) => {
                    const breakdown = categoryBreakdowns[cat]
                    const hasVat = breakdown?.vatTransactions && breakdown.vatTransactions.length > 0
                    return (
                      <div key={cat} className="py-2 border-b border-border">
                        <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0">
                          <span className="text-muted-foreground text-xs sm:text-sm break-words sm:break-normal">{cat}</span>
                          <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{formatCurrency(amt as number)}</span>
                        </div>
                        {hasVat && breakdown && (
                          <div className="mt-1 text-[10px] pl-2 space-y-0.5">
                            {breakdown.vatTransactions.map((vat: { description: string; originalAmount: number; vatAmount: number; taxableAmount: number; vatRate: number }, idx: number) => (
                              <div key={`${cat}-vat-${idx}`} className="text-blue-700 dark:text-blue-300">
                                VAT {vat.vatRate}% deducted: {formatCurrency(vat.vatAmount)} of {formatCurrency(vat.originalAmount)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                
                {/* Royalties, commissions, digital earnings, foreign income, etc. */}
                {otherIncome > 0 && (
                  <div className="py-2 border-b border-border">
                    <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0">
                      <span className="text-muted-foreground text-xs sm:text-sm break-words sm:break-normal">Royalties, commissions, digital earnings, foreign income, etc.</span>
                      <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{formatCurrency(otherIncome)}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs sm:text-sm">Capital gains (if applicable)</span>
                  <span className="font-medium text-xs sm:text-sm whitespace-nowrap">₦0.00</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs sm:text-sm">Any other income</span>
                  <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{formatCurrency(Object.entries(reportData.income.incomeByCategory).reduce((sum, [cat, amt]) => {
                    if (!['Salary', 'Employment', 'Invoice Income', 'Rental', 'Investment', 'Dividend'].includes(cat)) {
                      return sum + amt
                    }
                    return sum
                  }, 0))}</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 sm:py-3 border-t-2 border-border font-semibold text-xs sm:text-sm">
                  <span>Subtotal Other Income</span>
                  <span className="whitespace-nowrap">{formatCurrency((reportData.income.incomeByCategory['Rental'] || 0) + (reportData.income.incomeByCategory['Investment'] || reportData.income.incomeByCategory['Dividend'] || 0) + otherIncome)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 py-3 sm:py-4 border-t-4 border-border font-bold text-base sm:text-lg bg-primary/5 rounded-lg p-3 sm:p-4">
            <span className="text-xs sm:text-base">{(isFreelancer || isCreator) ? '2.' : '4.'} Total Gross Income (Sum of above)</span>
            <span className="text-sm sm:text-lg">{formatCurrency(reportData.income.totalIncome)}</span>
          </div>
        </div>

        {/* Part C: Deductible Expenses & Reliefs */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 border-b-2 border-border pb-1.5 sm:pb-2 uppercase">Part C – Deductible Expenses & Reliefs</h2>
          
          {/* Section 1: Reliefs */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Reliefs</h3>
            <div className="overflow-x-auto -mx-3 sm:-mx-4 md:mx-0 px-3 sm:px-4 md:px-0">
              <table className="w-full min-w-[600px] border-collapse border border-border text-xs sm:text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-1.5 sm:p-2 text-left" style={{ width: '50%' }}>Relief Type</th>
                    <th className="border border-border p-1.5 sm:p-2 text-right" style={{ width: '25%' }}>Amount (₦)</th>
                    <th className="border border-border p-1.5 sm:p-2 text-center" style={{ width: '12%' }}>Evidence Attached? (Y/N)</th>
                    <th className="border border-border p-1.5 sm:p-2 text-left" style={{ width: '13%' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                <tr>
                  <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">Pension contribution / Retirement savings</td>
                  <td className="border border-border p-1.5 sm:p-2 text-right font-medium text-xs sm:text-sm">
                    {isEditing ? (
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={formatCurrencyInput(reliefAmounts.pensionContribution.toString())}
                        onChange={(e) => {
                          const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                          if (isValid) {
                            setReliefAmounts(prev => ({ ...prev, pensionContribution: parseFloat(rawValue) || 0 }))
                          }
                        }}
                        className="h-8 sm:h-9 text-xs sm:text-sm text-right"
                      />
                    ) : (
                      formatCurrency(reliefAmounts.pensionContribution || 0)
                    )}
                  </td>
                    <td className="border border-border p-1.5 sm:p-2 text-center">
                      {isEditing ? (
                        <Checkbox 
                          checked={reliefEvidence.pensionContribution}
                          onCheckedChange={(checked) => setReliefEvidence(prev => ({ ...prev, pensionContribution: !!checked }))}
                        />
                      ) : (
                        reliefEvidence.pensionContribution ? '☑' : '☐'
                      )}
                    </td>
                    <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">
                      {isEditing ? (
                        <Input 
                          value={reliefNotes.pensionContribution}
                          onChange={(e) => setReliefNotes(prev => ({ ...prev, pensionContribution: e.target.value }))}
                          placeholder="Notes"
                          className="h-8 sm:h-9 text-xs sm:text-sm"
                        />
                      ) : (
                        reliefNotes.pensionContribution || ''
                      )}
                    </td>
                  </tr>
                <tr>
                  <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">National Housing Fund (NHF) contribution</td>
                    <td className="border border-border p-2 text-right font-medium">
                      {isEditing ? (
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={formatCurrencyInput(reliefAmounts.nhfContribution.toString())}
                          onChange={(e) => {
                            const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                            if (isValid) {
                              setReliefAmounts(prev => ({ ...prev, nhfContribution: parseFloat(rawValue) || 0 }))
                            }
                          }}
                          className="h-8 sm:h-9 text-xs sm:text-sm text-right"
                        />
                      ) : (
                        formatCurrency(reliefAmounts.nhfContribution || 0)
                      )}
                    </td>
                    <td className="border border-border p-2 text-center">
                      {isEditing ? (
                        <Checkbox 
                          checked={reliefEvidence.nhfContribution}
                          onCheckedChange={(checked) => setReliefEvidence(prev => ({ ...prev, nhfContribution: !!checked }))}
                        />
                      ) : (
                        reliefEvidence.nhfContribution ? '☑' : '☐'
                      )}
                    </td>
                    <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">
                      {isEditing ? (
                        <Input 
                          value={reliefNotes.nhfContribution}
                          onChange={(e) => setReliefNotes(prev => ({ ...prev, nhfContribution: e.target.value }))}
                          placeholder="Notes"
                          className="h-8 sm:h-9 text-xs sm:text-sm"
                        />
                      ) : (
                        reliefNotes.nhfContribution || ''
                      )}
                    </td>
                  </tr>
                <tr>
                  <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">Life Insurance Premiums</td>
                    <td className="border border-border p-2 text-right font-medium">
                      {isEditing ? (
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={formatCurrencyInput(reliefAmounts.lifeInsurance.toString())}
                          onChange={(e) => {
                            const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                            if (isValid) {
                              setReliefAmounts(prev => ({ ...prev, lifeInsurance: parseFloat(rawValue) || 0 }))
                            }
                          }}
                          className="h-8 sm:h-9 text-xs sm:text-sm text-right"
                        />
                      ) : (
                        formatCurrency(reliefAmounts.lifeInsurance || 0)
                      )}
                    </td>
                    <td className="border border-border p-2 text-center">
                      {isEditing ? (
                        <Checkbox 
                          checked={reliefEvidence.lifeInsurance}
                          onCheckedChange={(checked) => setReliefEvidence(prev => ({ ...prev, lifeInsurance: !!checked }))}
                        />
                      ) : (
                        reliefEvidence.lifeInsurance ? '☑' : '☐'
                      )}
                    </td>
                    <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">
                      {isEditing ? (
                        <Input 
                          value={reliefNotes.lifeInsurance}
                          onChange={(e) => setReliefNotes(prev => ({ ...prev, lifeInsurance: e.target.value }))}
                          placeholder="Notes"
                          className="h-8 sm:h-9 text-xs sm:text-sm"
                        />
                      ) : (
                        reliefNotes.lifeInsurance || ''
                      )}
                    </td>
                  </tr>
                <tr>
                  <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">Health Insurance / Medical contributions</td>
                    <td className="border border-border p-2 text-right font-medium">
                      {isEditing ? (
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={formatCurrencyInput(reliefAmounts.healthInsurance.toString())}
                          onChange={(e) => {
                            const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                            if (isValid) {
                              setReliefAmounts(prev => ({ ...prev, healthInsurance: parseFloat(rawValue) || 0 }))
                            }
                          }}
                          className="h-8 sm:h-9 text-xs sm:text-sm text-right"
                        />
                      ) : (
                        formatCurrency(reliefAmounts.healthInsurance || 0)
                      )}
                    </td>
                    <td className="border border-border p-2 text-center">
                      {isEditing ? (
                        <Checkbox 
                          checked={reliefEvidence.healthInsurance}
                          onCheckedChange={(checked) => setReliefEvidence(prev => ({ ...prev, healthInsurance: !!checked }))}
                        />
                      ) : (
                        reliefEvidence.healthInsurance ? '☑' : '☐'
                      )}
                    </td>
                    <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">
                      {isEditing ? (
                        <Input 
                          value={reliefNotes.healthInsurance}
                          onChange={(e) => setReliefNotes(prev => ({ ...prev, healthInsurance: e.target.value }))}
                          placeholder="Notes"
                          className="h-8 sm:h-9 text-xs sm:text-sm"
                        />
                      ) : (
                        reliefNotes.healthInsurance || ''
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Business Expenses */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Business Expenses</h3>
            <div className="overflow-x-auto -mx-3 sm:-mx-4 md:mx-0 px-3 sm:px-4 md:px-0">
              <table className="w-full min-w-[600px] border-collapse border border-border text-xs sm:text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-1.5 sm:p-2 text-left" style={{ width: '50%' }}>Expense Description</th>
                    <th className="border border-border p-1.5 sm:p-2 text-right" style={{ width: '25%' }}>Amount (₦)</th>
                    <th className="border border-border p-1.5 sm:p-2 text-center" style={{ width: '12%' }}>Evidence Attached? (Y/N)</th>
                    <th className="border border-border p-1.5 sm:p-2 text-left" style={{ width: '13%' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    console.log('🔍 [SelfAssessment] All expense transactions from reportData:', reportData.expenses.transactions?.map(t => ({
                      id: t.id,
                      description: t.description,
                      category: t.category,
                      amount: t.amount,
                      isCapitalAsset: t.taxClassification?.isCapitalAsset,
                      capitalAllowanceRate: t.taxClassification?.capitalAllowanceRate,
                      expenseType: t.taxClassification?.expenseType,
                      transactionNature: t.transactionNature
                    })))
                    console.log('🔍 [SelfAssessment] Capital allowance details:', capitalAllowanceDetails)
                    return null
                  })()}
                  {reportData.expenses.transactions && reportData.expenses.transactions.length > 0 ? (
                    reportData.expenses.transactions
                      .filter(txn => {
                        // Show all expense transactions (including capital assets)
                        // Capital assets should be shown even if they're not in the deductible expenses total
                        // because they're claimed as depreciation instead
                        console.log('🔍 [SelfAssessment] Filtering transaction:', {
                          id: txn.id,
                          description: txn.description,
                          isCapitalAsset: txn.taxClassification?.isCapitalAsset,
                          willShow: true
                        })
                        return true
                      })
                      .map((txn, index) => {
                        // Calculate base amount
                        let baseAmount = 0
                        if (txn.currency && txn.currency !== 'NGN' && txn.ngnEquivalent) {
                          baseAmount = txn.ngnEquivalent
                        } else {
                          baseAmount = txn.netAmount !== undefined ? txn.netAmount : (typeof txn.amount === 'number' ? txn.amount : Number(String(txn.amount).replace(/[\u20A6,]/g, '').trim()) || 0)
                        }
                        
                        // Check if this is a capital asset
                        const isCapitalAsset = txn.taxClassification?.isCapitalAsset && txn.taxClassification?.capitalAllowanceRate
                        const capitalAssetDetail = isCapitalAsset && capitalAllowanceDetails.find(d => d.transactionId === txn.id)
                        
                        // For capital assets, show the original purchase amount (not deductible as expense, but as depreciation)
                        // For non-capital assets, calculate deductible amount
                        let deductibleAmount = baseAmount
                        if (!isCapitalAsset) {
                          // Regular expenses: apply business percentage
                          if (txn.transactionNature === 'mixed' && txn.businessPercentage !== undefined) {
                            deductibleAmount = baseAmount * (txn.businessPercentage / 100)
                          } else if (txn.transactionNature === 'personal') {
                            deductibleAmount = 0
                          }
                        }

                        return (
                          <tr key={txn.id || index}>
                            <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{txn.description || 'Untitled transaction'}</span>
                                {txn.category && (
                                  <span className="text-[10px] text-muted-foreground">Category: {txn.category}</span>
                                )}
                                {txn.transactionNature === 'mixed' && txn.businessPercentage !== undefined && (
                                  <span className="text-[10px] text-amber-700 dark:text-amber-300">Mixed: {txn.businessPercentage}% business</span>
                                )}
                                {isCapitalAsset && capitalAssetDetail && (
                                  <div className="text-[12px] text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                                    <div className="font-medium text-[10px] text-muted-foreground mb-1">Depreciation / Capital Allowance on assets</div>
                                    {(() => {
                                      // Calculate the book value at the start of the year for display
                                      let bookValueAtStartOfYear = capitalAssetDetail.originalCost
                                      if (capitalAssetDetail.yearsSincePurchase > 0) {
                                        // Calculate cumulative depreciation up to the start of this year
                                        for (let year = 0; year < capitalAssetDetail.yearsSincePurchase; year++) {
                                          const yearDepreciation = bookValueAtStartOfYear * (capitalAssetDetail.allowanceRate / 100)
                                          bookValueAtStartOfYear -= yearDepreciation
                                        }
                                      }

                                      // Calculate Year 1 depreciation for clarity
                                      const year1Depreciation = capitalAssetDetail.originalCost * (capitalAssetDetail.allowanceRate / 100)
                                      const bookValueAfterYear1 = capitalAssetDetail.originalCost - year1Depreciation

                                      return (
                                        <div className="border-l-2 border-blue-300 dark:border-blue-700 pl-2 py-0.5">
                                          <div className="text-[11px] space-y-0.5 mt-0.5">
                                            <div>Purchased {capitalAssetDetail.purchaseYear}: {formatCurrency(capitalAssetDetail.originalCost)}</div>
                                            {capitalAssetDetail.yearsSincePurchase > 0 && (
                                              <>
                                                <div className="text-blue-600 dark:text-blue-400 font-medium">Year 1 Depreciation ({capitalAssetDetail.allowanceRate}% of {formatCurrency(capitalAssetDetail.originalCost)}): <strong>{formatCurrency(year1Depreciation)}</strong></div>
                                                <div className="text-blue-600 dark:text-blue-400">Book Value after Year 1: <strong>{formatCurrency(bookValueAfterYear1)}</strong></div>
                                              </>
                                            )}
                                            {capitalAssetDetail.yearsSincePurchase > 0 && (
                                              <div>Book Value at start of Year {capitalAssetDetail.yearsSincePurchase + 1}: {formatCurrency(bookValueAtStartOfYear)}</div>
                                            )}
                                            <div>Year {capitalAssetDetail.yearsSincePurchase + 1} Depreciation ({capitalAssetDetail.allowanceRate}% of {formatCurrency(bookValueAtStartOfYear)}): <strong className="text-blue-700 dark:text-blue-300">{formatCurrency(capitalAssetDetail.allowanceAmount)}</strong></div>
                                            <div>Remaining Book Value: {formatCurrency(capitalAssetDetail.bookValueAfter)}</div>
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )}
                               
                              </div>
                            </td>
                            <td className="border border-border p-2 text-right font-medium text-xs sm:text-sm">
                              {isCapitalAsset ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-muted-foreground text-[10px]">Purchase: {formatCurrency(baseAmount)}</span>
                                  {capitalAssetDetail && (
                                    <span className="text-blue-700 dark:text-blue-300 font-semibold text-xs">
                                      Depreciation: {formatCurrency(capitalAssetDetail.allowanceAmount)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                formatCurrency(deductibleAmount)
                              )}
                            </td>
                            <td className="border border-border p-2 text-center">
                              {isEditing ? (
                                <Checkbox 
                                  checked={reliefEvidence[`expense_${txn.id}`] || false}
                                  onCheckedChange={(checked) => setReliefEvidence(prev => ({ ...prev, [`expense_${txn.id}`]: !!checked }))}
                                />
                              ) : (
                                (reliefEvidence[`expense_${txn.id}`] || false) ? '☑' : '☐'
                              )}
                            </td>
                            <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">
                              {isEditing ? (
                                <Input 
                                  value={reliefNotes[`expense_${txn.id}`] || ''}
                                  onChange={(e) => setReliefNotes(prev => ({ ...prev, [`expense_${txn.id}`]: e.target.value }))}
                                  placeholder="Notes"
                                  className="h-8 sm:h-9 text-xs sm:text-sm"
                                />
                              ) : (
                                reliefNotes[`expense_${txn.id}`] || ''
                              )}
                            </td>
                          </tr>
                        )
                      })
                  ) : (
                    <tr>
                      <td colSpan={4} className="border border-border p-2 text-center text-muted-foreground text-xs sm:text-sm">
                        No business expenses recorded for this period
                      </td>
                    </tr>
                  )}
                  {reportData.expenses.transactions && reportData.expenses.transactions.length > 0 && (
                    <tr className="bg-muted font-bold">
                      <td className="border border-border p-2 text-xs sm:text-sm">Subtotal Business Expenses</td>
                      <td className="border border-border p-2 text-right text-xs sm:text-sm">{formatCurrency(reportData.expenses.taxDeductibleExpenses)}</td>
                      <td className="border border-border p-2"></td>
                      <td className="border border-border p-2"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Row */}
          <div className="mt-4 overflow-x-auto -mx-3 sm:-mx-4 md:mx-0 px-3 sm:px-4 md:px-0">
            <table className="w-full min-w-[600px] border-collapse border border-border text-xs sm:text-sm">
              <tbody>
                <tr className="bg-muted font-bold">
                  <td className="border border-border p-2 text-xs sm:text-sm" style={{ width: '50%' }}>Total Allowable Deductions & Reliefs</td>
                  <td className="border border-border p-2 text-right text-xs sm:text-sm" style={{ width: '25%' }}>
                    {formatCurrency(
                      Object.values(reliefAmounts).reduce((sum, amount) => sum + (amount || 0), 0) + 
                      reportData.expenses.taxDeductibleExpenses
                    )}
                  </td>
                  <td className="border border-border p-2" style={{ width: '12%' }}></td>
                  <td className="border border-border p-2" style={{ width: '13%' }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Part D: Tax Already Paid (Credits) */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
            <h2 className="text-base sm:text-lg font-semibold border-b-2 border-border pb-1.5 sm:pb-2 uppercase">Part D – Tax Already Paid (Credits)</h2>
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddCredit(true)}
                className="h-8 sm:h-9 text-xs sm:text-sm"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Add Credit</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
            </div>
          <div className="overflow-x-auto -mx-2 sm:-mx-3 md:mx-0 px-2 sm:px-3 md:px-0">
            <table className="w-full min-w-[600px] border-collapse border border-border text-xs sm:text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-1.5 sm:p-2 text-left text-xs sm:text-sm" style={{ width: '35%' }}>Type of Payment</th>
                  <th className="border border-border p-1.5 sm:p-2 text-right text-xs sm:text-sm" style={{ width: '20%' }}>Amount (₦)</th>
                  <th className="border border-border p-1.5 sm:p-2 text-center text-xs sm:text-sm" style={{ width: '15%' }}>Tax Year</th>
                  <th className="border border-border p-1.5 sm:p-2 text-center text-xs sm:text-sm" style={{ width: '10%' }}>Evidence Attached (Y/N)</th>
                  <th className="border border-border p-1.5 sm:p-2 text-left text-xs sm:text-sm" style={{ width: '15%' }}>Notes</th>
                  {isEditing && (
                    <th className="border border-border p-1.5 sm:p-2 text-center text-xs sm:text-sm" style={{ width: '5%' }}>Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loadingCredits ? (
                  <tr>
                    <td colSpan={isEditing ? 6 : 5} className="border border-border p-3 sm:p-4 text-center text-muted-foreground text-xs sm:text-sm">
                      Loading tax credits...
                    </td>
                  </tr>
                ) : allTaxCredits.length === 0 ? (
                  <tr>
                    <td colSpan={isEditing ? 6 : 5} className="border border-border p-3 sm:p-4 text-center text-muted-foreground italic text-xs sm:text-sm">
                      No tax credits recorded for this period
                    </td>
                  </tr>
                ) : (
                  <>
                    {allTaxCredits.map((credit) => (
                      <tr key={credit.id}>
                        <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">
                          {isEditing && credit.source === 'manual' ? (
                            <Input
                              value={credit.type}
                              onChange={(e) => {
                                const updated = allTaxCredits.map(c => 
                                  c.id === credit.id ? { ...c, type: e.target.value } : c
                                )
                                setAllTaxCredits(updated)
                                updateTaxCreditsTotals(updated)
                              }}
                              className="h-8 sm:h-9 text-xs sm:text-sm"
                              placeholder="Type of payment"
                            />
                          ) : (
                            credit.type
                          )}
                        </td>
                        <td className="border border-border p-1.5 sm:p-2 text-right font-medium text-xs sm:text-sm">
                          {isEditing && credit.source === 'manual' ? (
                            <Input
                              type="number"
                              value={credit.amount}
                              onChange={(e) => {
                                const amount = parseFloat(e.target.value) || 0
                                const updated = allTaxCredits.map(c => 
                                  c.id === credit.id ? { ...c, amount } : c
                                )
                                setAllTaxCredits(updated)
                                updateTaxCreditsTotals(updated)
                              }}
                              className="h-8 sm:h-9 text-xs sm:text-sm text-right"
                              placeholder="0.00"
                            />
                          ) : (
                            formatCurrency(credit.amount)
                          )}
                        </td>
                        <td className="border border-border p-1.5 sm:p-2 text-center text-xs sm:text-sm">
                          {isEditing && credit.source === 'manual' ? (
                            <Input
                              type="number"
                              value={credit.taxYear}
                              onChange={(e) => {
                                const year = parseInt(e.target.value) || reportData.period.year
                                const updated = allTaxCredits.map(c => 
                                  c.id === credit.id ? { ...c, taxYear: year } : c
                                )
                                setAllTaxCredits(updated)
                              }}
                              className="h-8 sm:h-9 text-xs sm:text-sm text-center w-20"
                            />
                          ) : (
                            credit.taxYear
                          )}
                        </td>
                        <td className="border border-border p-1.5 sm:p-2 text-center text-xs sm:text-sm">
                          {isEditing ? (
                            <Checkbox
                              checked={credit.evidenceAttached}
                              onCheckedChange={(checked) => {
                                const updated = allTaxCredits.map(c => 
                                  c.id === credit.id ? { ...c, evidenceAttached: !!checked } : c
                                )
                                setAllTaxCredits(updated)
                              }}
                            />
                          ) : (
                            credit.evidenceAttached ? '☑' : '☐'
                          )}
                        </td>
                        <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">
                          {isEditing ? (
                            <Input
                              value={credit.notes}
                              onChange={(e) => {
                                const updated = allTaxCredits.map(c => 
                                  c.id === credit.id ? { ...c, notes: e.target.value } : c
                                )
                                setAllTaxCredits(updated)
                              }}
                              placeholder="Notes"
                              className="h-8 sm:h-9 text-xs sm:text-sm"
                            />
                          ) : (
                            credit.notes || ''
                          )}
                        </td>
                        {isEditing && (
                          <td className="border border-border p-1.5 sm:p-2 text-center">
                            {credit.source === 'manual' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updated = allTaxCredits.filter(c => c.id !== credit.id)
                                  setAllTaxCredits(updated)
                                  updateTaxCreditsTotals(updated)
                                }}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-destructive" />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </>
                )}
                <tr className="bg-muted font-bold">
                  <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">Total Tax Credits / Prepaid Tax</td>
                  <td className="border border-border p-1.5 sm:p-2 text-right text-xs sm:text-sm">{formatCurrency(taxCredits.total)}</td>
                  <td className="border border-border p-1.5 sm:p-2"></td>
                  <td className="border border-border p-1.5 sm:p-2"></td>
                  <td className="border border-border p-1.5 sm:p-2"></td>
                  {isEditing && <td className="border border-border p-1.5 sm:p-2"></td>}
                </tr>
              </tbody>
            </table>
            </div>
            </div>

        {/* Part E: Tax Computation */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 border-b-2 border-border pb-1.5 sm:pb-2 uppercase">Part E – Tax Computation</h2>
          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
            <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 border-b border-border">
              <span className="text-muted-foreground text-xs sm:text-sm break-words sm:break-normal">1. Total Gross Income (from Part B)</span>
              <span className="font-medium text-xs sm:text-sm whitespace-nowrap">{formatCurrency(reportData.tax.grossIncome)}</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 border-b border-border">
              <span className="text-muted-foreground text-xs sm:text-sm break-words sm:break-normal">2. Less: Total Allowable Deductions & Reliefs (from Part C)</span>
              <span className="font-medium text-red-600 text-xs sm:text-sm whitespace-nowrap">-{formatCurrency((Object.values(reliefAmounts).reduce((sum, amount) => sum + (amount || 0), 0)) + reportData.expenses.taxDeductibleExpenses)}</span>
          </div>
            <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 sm:py-3 border-t-2 border-border font-semibold text-xs sm:text-sm">
              <span>→ Net Taxable Income</span>
              <span className="whitespace-nowrap">{formatCurrency(reportData.tax.taxableIncome)}</span>
        </div>

            <div className="bg-muted/50 p-3 sm:p-4 rounded-lg mt-3 sm:mt-4">
              <strong className="block mb-2 sm:mb-3 text-xs sm:text-sm">3. Computed Tax (based on current PIT rates)</strong>
              <div className="space-y-2">
                {reportData.tax.taxBrackets.map((bracket, index) => (
                  <div key={index} className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      {formatCurrency(bracket.amount)} @ {bracket.rate}%
                    </span>
                    <span className="font-medium whitespace-nowrap">{formatCurrency(bracket.tax)}</span>
                  </div>
                ))}
                <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 pt-2 sm:pt-3 border-t border-border font-semibold text-xs sm:text-sm">
                  <span>→ Gross Tax Due</span>
                  <span className="whitespace-nowrap">{formatCurrency(reportData.tax.taxPayable)}</span>
                </div>
            </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 border-b border-border">
              <span className="text-muted-foreground text-xs sm:text-sm break-words sm:break-normal">4. Less: Tax Credits / Prepaid Tax (from Part D)</span>
              <span className="font-medium text-red-600 text-xs sm:text-sm whitespace-nowrap">-{formatCurrency(taxCredits.total)}</span>
            </div>
            {/* WHT Credits from Tax Classification (Gold+ feature) */}
            {hasGoldAccess && whtCredits > 0 && (
              <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 py-2 border-b border-border bg-green-50 dark:bg-green-950/20 px-2 rounded">
                <span className="text-muted-foreground text-xs sm:text-sm break-words sm:break-normal">Less: WHT Credits (from Tax Classification)</span>
                <span className="font-medium text-green-600 dark:text-green-400 text-xs sm:text-sm whitespace-nowrap">-{formatCurrency(whtCredits)}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 py-3 sm:py-4 border-t-4 border-border font-bold text-base sm:text-lg bg-primary/5 rounded-lg p-3 sm:p-4">
              <span className="text-xs sm:text-base">→ Net Tax Payable or Refund Due</span>
              <span className="text-primary text-sm sm:text-lg whitespace-nowrap">{formatCurrency(Math.max(0, (reportData.tax.taxPayable || 0) - taxCredits.total - whtCredits))}</span>
            </div>
          </div>
        </div>


        {/* Add Credit Dialog */}
        <Dialog open={showAddCredit} onOpenChange={setShowAddCredit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tax Credit</DialogTitle>
              <DialogDescription>
                Add a manual tax credit entry (e.g., PAYE, WHT, provisional payments, etc.)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="credit-type">Type of Payment</Label>
                <Select
                  value={newCredit.type}
                  onValueChange={(value) => setNewCredit(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger id="credit-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAYE withheld by employer">PAYE withheld by employer</SelectItem>
                    <SelectItem value="Withholding Tax (WHT) from clients/orders">Withholding Tax (WHT) from clients/orders</SelectItem>
                    <SelectItem value="Provisional tax payments / Installments">Provisional tax payments / Installments</SelectItem>
                    <SelectItem value="Other tax credits / overpayments from prior year">Other tax credits / overpayments from prior year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="credit-amount">Amount (₦)</Label>
                <Input
                  id="credit-amount"
                  type="text"
                  inputMode="decimal"
                  value={newCredit.amountDisplay || formatCurrencyInput(newCredit.amount)}
                  onChange={(e) => {
                    const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                    if (isValid) {
                      setNewCredit(prev => ({ 
                        ...prev, 
                        amount: rawValue,
                        amountDisplay: formatCurrencyInput(rawValue)
                      }))
                    } else if (e.target.value === '') {
                      setNewCredit(prev => ({ 
                        ...prev, 
                        amount: '',
                        amountDisplay: ''
                      }))
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="credit-year">Tax Year</Label>
                <Input
                  id="credit-year"
                  type="number"
                  value={newCredit.taxYear}
                  onChange={(e) => setNewCredit(prev => ({ ...prev, taxYear: e.target.value }))}
                  placeholder={reportData.period.year.toString()}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="credit-evidence"
                  checked={newCredit.evidenceAttached}
                  onCheckedChange={(checked) => setNewCredit(prev => ({ ...prev, evidenceAttached: !!checked }))}
                />
                <Label htmlFor="credit-evidence" className="cursor-pointer font-normal">
                  Evidence Attached
                </Label>
              </div>
              <div>
                <Label htmlFor="credit-notes">Notes (optional)</Label>
                <Input
                  id="credit-notes"
                  value={newCredit.notes}
                  onChange={(e) => setNewCredit(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or reference"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddCredit(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCredit}>
                  Add Credit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Part F: Declaration & Signature */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b-2 border-border pb-2 uppercase">Part F – Declaration & Signature</h2>
          <div className="border-2 border-border p-6 rounded-lg">
            <p className="text-sm mb-6 leading-relaxed">
              <strong>I hereby declare that the information given in this return is correct and complete to the best of my knowledge and belief. 
              I understand that false declaration may lead to penalties under the law.</strong>
          </p>
          <div className="grid grid-cols-2 gap-8 mt-6">
            <div>
                <div className="border-t-2 border-border pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Name: {reportData.userInfo.name}</p>
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Signature / Digital Signature:</p>
                    {isEditing ? (
                      <div className="space-y-2">
                        {declarationInfo.signatureUrl ? (
                          <div className="relative border border-border rounded p-2 bg-muted/30">
                            <img 
                              src={declarationInfo.signatureUrl} 
                              alt="Signature" 
                              className="max-h-20 object-contain"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => setDeclarationInfo(prev => ({ ...prev, signatureUrl: '' }))}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors block">
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleSignatureUpload(file)
                                }
                              }}
                              disabled={uploadingSignature || scanningSignature}
                            />
                            {uploadingSignature || scanningSignature ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {scanningSignature ? 'Processing...' : 'Uploading...'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Upload className="w-6 h-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Upload Signature</span>
                              </div>
                            )}
                          </label>
                        )}
                      </div>
                    ) : (
                      <div className="min-h-[60px] border border-border rounded p-2 bg-muted/30 flex items-center justify-center">
                        {declarationInfo.signatureUrl ? (
                          <img 
                            src={declarationInfo.signatureUrl} 
                            alt="Signature" 
                            className="max-h-20 object-contain"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">_________________</span>
                        )}
                      </div>
                    )}
                  </div>
              </div>
            </div>
            <div>
                <div className="border-t-2 border-border pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Date:</p>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={declarationInfo.signatureDate}
                      onChange={(e) => setDeclarationInfo(prev => ({ ...prev, signatureDate: e.target.value }))}
                      className="mt-1 text-xs"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {declarationInfo.signatureDate 
                        ? format(new Date(declarationInfo.signatureDate), 'dd / MM / yyyy')
                        : `__ / __ / ${reportData.period.year}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attachment Checklist */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b-2 border-border pb-2 uppercase">Attachment Checklist</h2>
          <div className="border-2 border-border p-6 rounded-lg">
            <p className="text-sm mb-4 text-muted-foreground">
              Please tick (✓) the documents attached with this return:
            </p>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-start gap-2">
                <Checkbox 
                  checked={attachments.receipts}
                  onCheckedChange={(checked) => setAttachments(prev => ({ ...prev, receipts: !!checked }))}
                  disabled={!isEditing}
                  className="mt-1" 
                />
                <span>Receipts for pension, NHF, insurance, reliefs</span>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox 
                  checked={attachments.invoices}
                  onCheckedChange={(checked) => setAttachments(prev => ({ ...prev, invoices: !!checked }))}
                  disabled={!isEditing}
                  className="mt-1" 
                />
                <span>Invoice records or business income evidence (for self-employed)</span>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox 
                  checked={attachments.bankStatements}
                  onCheckedChange={(checked) => setAttachments(prev => ({ ...prev, bankStatements: !!checked }))}
                  disabled={!isEditing}
                  className="mt-1" 
                />
                <span>Bank statements, rental receipts, dividend/interest slips, WHT certificates</span>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox 
                  checked={attachments.capitalAllowance}
                  onCheckedChange={(checked) => setAttachments(prev => ({ ...prev, capitalAllowance: !!checked }))}
                  disabled={!isEditing}
                  className="mt-1" 
                />
                <span>Capital allowance / depreciation schedules</span>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox 
                  checked={attachments.taxPayments}
                  onCheckedChange={(checked) => setAttachments(prev => ({ ...prev, taxPayments: !!checked }))}
                  disabled={!isEditing}
                  className="mt-1" 
                />
                <span>Proofs of WHT / earlier tax payments / provisional tax</span>
              </div>
            </div>
          </div>
        </div>

        {/* File Return Button at Bottom */}
        {showFileButton && reportId && !isEditing && (
          <div className="flex justify-end pt-6 border-t-2 border-border mt-6">
            {(() => {
              // Determine button text and icon based on filing status and method
              const isFiled = filingStatus === 'filed' || filingStatus === 'submitted' || filingStatus === 'acknowledged'
              
              let buttonText = "File Return"
              let ButtonIcon = FileCheck
              let buttonVariant: "default" | "outline" | "secondary" = "default"
              let isDisabled = false
              
              if (isFiled) {
                if (filingMethod === 'agent') {
                  if (filingStatus === 'acknowledged') {
                    // Agent has acknowledged receipt
                    buttonText = "Filed and Completed"
                    ButtonIcon = CheckCircle2
                    buttonVariant = "outline"
                    isDisabled = true
                  } else {
                    // Still awaiting agent (submitted but not yet acknowledged)
                    buttonText = "Awaiting Agent"
                    ButtonIcon = Clock
                    buttonVariant = "outline"
                    isDisabled = true
                  }
                } else if (filingMethod === 'direct') {
                  // Direct filing: show "Filed and Completed" when acknowledged or filed
                  buttonText = "Filed and Completed"
                  ButtonIcon = CheckCircle2
                  buttonVariant = "outline"
                  isDisabled = true
                } else if (filingMethod === 'email') {
                  // Email filing: show "Mail Sent, Pending Response"
                  buttonText = "Mail Sent, Pending Response"
                  ButtonIcon = Mail
                  buttonVariant = "outline"
                  isDisabled = true
                }
              }
              
              return (
                <Button
                  onClick={() => {
                    if (!isDisabled) {
                      router.push(`/dashboard/reports/file/${reportId}`)
                    }
                  }}
                  variant={buttonVariant}
                  disabled={isDisabled}
                  className="h-10 text-sm"
                >
                  <ButtonIcon className="w-4 h-4 mr-2" />
                  {buttonText}
                </Button>
              )
            })()}
          </div>
        )}
      </div>
    </Card>
  )
}
