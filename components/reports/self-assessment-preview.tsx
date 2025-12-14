"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ReportData } from "@/lib/services/reportService"
import { formatCurrencyAmount } from "@/lib/utils/currency"
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

  // Initialize personal info from reportData or user profile
  useEffect(() => {
    if (reportData.userInfo.address) {
      const addressParts = reportData.userInfo.address.split(',')
      setPersonalInfo(prev => ({
        ...prev,
        state: addressParts[1]?.trim() || '',
        contactEmail: user?.email || ''
      }))
    }
  }, [reportData, user])

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
    if (!newCredit.type || !newCredit.amount) {
      toast.error("Please fill in type and amount")
      return
    }

    const credit = {
      id: `manual-${Date.now()}`,
      type: newCredit.type,
      amount: parseFloat(newCredit.amount) || 0,
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
      toast.error("Failed to upload signature")
    } finally {
      setUploadingSignature(false)
      setScanningSignature(false)
    }
  }

  // Load saved personal info and attachments from metadata
  useEffect(() => {
    if ((reportData as any).metadata) {
      if ((reportData as any).metadata.personalInfo) {
        setPersonalInfo(prev => ({ ...prev, ...(reportData as any).metadata.personalInfo }))
      }
      if ((reportData as any).metadata.attachments) {
        setAttachments(prev => ({ ...prev, ...(reportData as any).metadata.attachments }))
      }
      if ((reportData as any).metadata.reliefEvidence) {
        setReliefEvidence(prev => ({ ...prev, ...(reportData as any).metadata.reliefEvidence }))
      }
      if ((reportData as any).metadata.reliefNotes) {
        setReliefNotes(prev => ({ ...prev, ...(reportData as any).metadata.reliefNotes }))
      }
      if ((reportData as any).metadata.manualTaxCredits) {
        // Manual credits will be loaded in loadTaxCredits
      }
      if ((reportData as any).metadata.declarationInfo) {
        setDeclarationInfo(prev => ({ 
          ...prev, 
          ...(reportData as any).metadata.declarationInfo,
          signatureDate: (reportData as any).metadata.declarationInfo.signatureDate || prev.signatureDate
        }))
      }
    }
  }, [])

  // Use useRef to track previous values and prevent infinite loops
  const prevMetadataRef = useRef<string>('')
  const isInitialMount = useRef(true)
  
  // Initialize prevMetadataRef with current metadata from reportData on mount
  useEffect(() => {
    if (isInitialMount.current) {
      const currentMetadata = {
        personalInfo: (reportData as any).metadata?.personalInfo || {},
        attachments: (reportData as any).metadata?.attachments || {},
        reliefEvidence: (reportData as any).metadata?.reliefEvidence || {},
        reliefNotes: (reportData as any).metadata?.reliefNotes || {},
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
    if (!onDataChange || isInitialMount.current) return
    
    // Create new metadata object
    const newMetadata = {
      personalInfo: { ...personalInfo },
      attachments: { ...attachments },
      reliefEvidence: { ...reliefEvidence },
      reliefNotes: { ...reliefNotes },
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
      prevMetadataRef.current = newMetadataStr
      const updated = { ...reportData }
      ;(updated as any).metadata = newMetadata
      onDataChange(updated)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalInfo, attachments, reliefEvidence, reliefNotes, allTaxCredits, declarationInfo])

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

        periodPayments.forEach(payment => {
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
  
  // For freelancers: all income is business income (break down by category)
  // For others: business income excludes employment income
  const businessIncomeCategories = isFreelancer
    ? Object.entries(reportData.income.incomeByCategory)
        .filter(([cat]) => !['Salary', 'Employment'].includes(cat))
        .map(([cat, amount]) => ({ category: cat, amount: amount as number }))
        .filter(item => item.amount > 0)
    : Object.entries(reportData.income.incomeByCategory)
        .filter(([cat]) => !['Salary', 'Employment', 'Rental', 'Investment', 'Dividend'].includes(cat))
        .map(([cat, amount]) => ({ category: cat, amount: amount as number }))
        .filter(item => item.amount > 0)
  
  const businessIncome = businessIncomeCategories.reduce((sum, item) => sum + item.amount, 0)
  
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
    
    ${!isFreelancer ? `
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
      <strong style="font-size: 11pt;">${isFreelancer ? '1.' : '2.'} Business / Self-Employment Income</strong>
      ${(() => {
        const categories = isFreelancer
          ? Object.entries(reportData.income.incomeByCategory)
              .filter(([cat]) => !['Salary', 'Employment'].includes(cat))
              .filter(([, amt]) => (amt as number) > 0)
          : Object.entries(reportData.income.incomeByCategory)
              .filter(([cat]) => !['Salary', 'Employment', 'Rental', 'Investment', 'Dividend'].includes(cat))
              .filter(([, amt]) => (amt as number) > 0)
        
        if (categories.length > 0) {
          return categories.map(([cat, amt]) => `
      <div class="amount-row">
        <span class="amount-label">${cat}</span>
        <span class="amount-value">${formatCurrency(amt as number)}</span>
      </div>
      `).join('')
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
    </div>

    ${(isCreator || !isFreelancer) ? `
    <div style="margin-bottom: 15px;">
      <strong style="font-size: 11pt;">${isFreelancer ? '2.' : '3.'} Other Income Sources</strong>
      <div class="amount-row">
        <span class="amount-label">Rental income</span>
        <span class="amount-value">${formatCurrency(reportData.income.incomeByCategory['Rental'] || 0)}</span>
      </div>
      <div class="amount-row">
        <span class="amount-label">Dividends / Interest / Investment returns</span>
        <span class="amount-value">${formatCurrency(reportData.income.incomeByCategory['Investment'] || reportData.income.incomeByCategory['Dividend'] || 0)}</span>
      </div>
      <div class="amount-row">
        <span class="amount-label">Royalties, commissions, digital earnings, foreign income, etc.</span>
        <span class="amount-value">${formatCurrency(otherIncome)}</span>
      </div>
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
      <span>${isFreelancer ? '2.' : '4.'} Total Gross Income (Sum of above)</span>
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
    <Card className="p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6 justify-between">
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <div className={onBack ? "flex gap-3" : "flex gap-3 ml-auto"}>
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
                >
                  <ButtonIcon className="w-4 h-4 mr-2" />
                  {buttonText}
                </Button>
              )
            })()
          )}
          <Button
            variant="outline"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Return
          </Button>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        {/* Cover Page Preview */}
        <div className="text-center border-2 border-border p-4 sm:p-6 md:p-8 rounded-lg bg-muted/20">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 uppercase">Personal Income Tax Return</h1>
          <h2 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6">Year of Assessment: {reportData.period.year}</h2>
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
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 border-b-2 border-border pb-2 uppercase">Part A – Personal & Employment Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div>
              <Label className="text-muted-foreground font-semibold">Full Name</Label>
              {isEditing ? (
                <Input 
                  value={reportData.userInfo.name}
                  onChange={(e) => updateReportData({
                    userInfo: { ...reportData.userInfo, name: e.target.value }
                  })}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{reportData.userInfo.name}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground font-semibold">TIN / NIN</Label>
              {isEditing ? (
                <Input 
                  value={reportData.userInfo.tin || ''}
                  onChange={(e) => updateReportData({
                    userInfo: { ...reportData.userInfo, tin: e.target.value }
                  })}
                  className="mt-1"
                  placeholder="Enter TIN/NIN"
                />
              ) : (
                <p className="font-medium">{reportData.userInfo.tin || 'N/A'}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground font-semibold">Date of Birth</Label>
              {isEditing ? (
                <Input 
                  type="date"
                  value={personalInfo.dateOfBirth}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium text-muted-foreground">{personalInfo.dateOfBirth || '_________________'}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground font-semibold">Gender</Label>
              {isEditing ? (
                <Select value={personalInfo.gender} onValueChange={(value) => setPersonalInfo(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-medium">{personalInfo.gender ? (personalInfo.gender === 'male' ? '☑ Male ☐ Female' : '☐ Male ☑ Female') : '☐ Male ☐ Female'}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground font-semibold">Marital Status</Label>
              {isEditing ? (
                <Select value={personalInfo.maritalStatus} onValueChange={(value) => setPersonalInfo(prev => ({ ...prev, maritalStatus: value }))}>
                  <SelectTrigger className="mt-1">
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
                <p className="font-medium">
                  {personalInfo.maritalStatus 
                    ? `☑ ${personalInfo.maritalStatus.charAt(0).toUpperCase() + personalInfo.maritalStatus.slice(1)}`
                    : '☐ Single ☐ Married ☐ Divorced ☐ Widowed'}
                </p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground font-semibold">State / LGA of Residence</Label>
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <Input 
                    value={personalInfo.state}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                  />
                  <Input 
                    value={personalInfo.lga}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, lga: e.target.value }))}
                    placeholder="LGA"
                  />
                </div>
              ) : (
                <p className="font-medium">{personalInfo.state && personalInfo.lga ? `${personalInfo.state} / ${personalInfo.lga}` : (reportData.userInfo.address?.split(',')[1]?.trim() || '_________________')}</p>
              )}
            </div>
            <div className="col-span-2">
              <Label className="text-muted-foreground font-semibold">Residential Address</Label>
              {isEditing ? (
                <Input 
                  value={reportData.userInfo.address || ''}
                  onChange={(e) => updateReportData({
                    userInfo: { ...reportData.userInfo, address: e.target.value }
                  })}
                  className="mt-1"
                  placeholder="Enter full address"
                />
              ) : (
                <p className="font-medium">{reportData.userInfo.address || '_________________'}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground font-semibold">Contact Phone</Label>
              {isEditing ? (
                <Input 
                  value={personalInfo.contactPhone}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, contactPhone: e.target.value }))}
                  className="mt-1"
                  placeholder="Phone number"
                />
              ) : (
                <p className="font-medium text-muted-foreground">{personalInfo.contactPhone || '_________________'}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground font-semibold">Contact Email</Label>
              {isEditing ? (
                <Input 
                  type="email"
                  value={personalInfo.contactEmail}
                  onChange={(e) => setPersonalInfo(prev => ({ ...prev, contactEmail: e.target.value }))}
                  className="mt-1"
                  placeholder="Email address"
                />
              ) : (
                <p className="font-medium text-muted-foreground">{personalInfo.contactEmail || '_________________'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Part B: Statement of Income */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 border-b-2 border-border pb-2 uppercase">Part B – Statement of Income (All Sources)</h2>
          
          {!isFreelancer && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">1. Employment Income (if any)</h3>
          <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Basic Salary</span>
                  <span className="font-medium">{formatCurrency(employmentIncome * 0.7)}</span>
            </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Allowances (Housing, Transport, Utility, Leave, Overtime, Bonuses, etc.)</span>
                  <span className="font-medium">{formatCurrency(employmentIncome * 0.3)}</span>
            </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Benefits in Kind (BIK)</span>
                  <span className="font-medium">₦0.00</span>
            </div>
                <div className="flex justify-between py-3 border-t-2 border-border font-semibold">
                  <span>Subtotal Employment Income</span>
                  <span>{formatCurrency(employmentIncome)}</span>
          </div>
        </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold mb-3">{isFreelancer ? '1.' : '2.'} Business / Self-Employment Income</h3>
          <div className="space-y-2 text-xs sm:text-sm">
              {businessIncomeCategories.length > 0 ? (
                <>
                  {businessIncomeCategories.map((item, index) => (
                    <div key={index} className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">{item.category}</span>
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
            </div>
                  ))}
                  <div className="flex justify-between py-3 border-t-2 border-border font-semibold">
                    <span>Subtotal Business Income</span>
                    <span>{formatCurrency(businessIncome)}</span>
            </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Gross receipts / revenue from business, freelance, services, gigs, etc.</span>
                    <span className="font-medium">{formatCurrency(businessIncome)}</span>
            </div>
                  <div className="flex justify-between py-3 border-t-2 border-border font-semibold">
                    <span>Subtotal Business Income</span>
                    <span>{formatCurrency(businessIncome)}</span>
            </div>
                </>
              )}
          </div>
        </div>

          {(isCreator || !isFreelancer) && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">{isFreelancer ? '2.' : '3.'} Other Income Sources</h3>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Rental income</span>
                  <span className="font-medium">{formatCurrency(reportData.income.incomeByCategory['Rental'] || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Dividends / Interest / Investment returns</span>
                  <span className="font-medium">{formatCurrency(reportData.income.incomeByCategory['Investment'] || reportData.income.incomeByCategory['Dividend'] || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Royalties, commissions, digital earnings, foreign income, etc.</span>
                  <span className="font-medium">{formatCurrency(otherIncome)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Capital gains (if applicable)</span>
                  <span className="font-medium">₦0.00</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Any other income</span>
                  <span className="font-medium">{formatCurrency(Object.entries(reportData.income.incomeByCategory).reduce((sum, [cat, amt]) => {
                    if (!['Salary', 'Employment', 'Invoice Income', 'Rental', 'Investment', 'Dividend'].includes(cat)) {
                      return sum + amt
                    }
                    return sum
                  }, 0))}</span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-border font-semibold">
                  <span>Subtotal Other Income</span>
                  <span>{formatCurrency((reportData.income.incomeByCategory['Rental'] || 0) + (reportData.income.incomeByCategory['Investment'] || reportData.income.incomeByCategory['Dividend'] || 0) + otherIncome)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between py-4 border-t-4 border-border font-bold text-lg bg-primary/5 rounded-lg p-4">
            <span>{isFreelancer ? '2.' : '4.'} Total Gross Income (Sum of above)</span>
            <span>{formatCurrency(reportData.income.totalIncome)}</span>
          </div>
        </div>

        {/* Part C: Deductible Expenses & Reliefs */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 border-b-2 border-border pb-2 uppercase">Part C – Deductible Expenses & Reliefs</h2>
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full min-w-[600px] border-collapse border border-border text-xs sm:text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-1.5 sm:p-2 text-left" style={{ width: '50%' }}>Deduction / Relief Type</th>
                  <th className="border border-border p-1.5 sm:p-2 text-right" style={{ width: '25%' }}>Amount (₦)</th>
                  <th className="border border-border p-1.5 sm:p-2 text-center" style={{ width: '12%' }}>Evidence Attached? (Y/N)</th>
                  <th className="border border-border p-1.5 sm:p-2 text-left" style={{ width: '13%' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {reportData.tax.reliefs.pensionContribution > 0 && (
                  <tr>
                    <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">Pension contribution / Retirement savings</td>
                    <td className="border border-border p-1.5 sm:p-2 text-right font-medium text-xs sm:text-sm">{formatCurrency(reportData.tax.reliefs.pensionContribution)}</td>
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
                          className="h-8 text-xs"
                        />
                      ) : (
                        reliefNotes.pensionContribution || ''
                      )}
                    </td>
                  </tr>
                )}
                {reportData.tax.reliefs.nhfContribution > 0 && (
                  <tr>
                    <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">National Housing Fund (NHF) contribution</td>
                    <td className="border border-border p-2 text-right font-medium">{formatCurrency(reportData.tax.reliefs.nhfContribution)}</td>
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
                          className="h-8 text-xs"
                        />
                      ) : (
                        reliefNotes.nhfContribution || ''
                      )}
                    </td>
                  </tr>
                )}
                {reportData.tax.reliefs.lifeInsurance > 0 && (
                  <tr>
                    <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">Life Insurance Premiums</td>
                    <td className="border border-border p-2 text-right font-medium">{formatCurrency(reportData.tax.reliefs.lifeInsurance)}</td>
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
                          className="h-8 text-xs"
                        />
                      ) : (
                        reliefNotes.lifeInsurance || ''
                      )}
                    </td>
                  </tr>
                )}
                {reportData.tax.reliefs.healthInsurance > 0 && (
                  <tr>
                    <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">Health Insurance / Medical contributions</td>
                    <td className="border border-border p-2 text-right font-medium">{formatCurrency(reportData.tax.reliefs.healthInsurance)}</td>
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
                          className="h-8 text-xs"
                        />
                      ) : (
                        reliefNotes.healthInsurance || ''
                      )}
                    </td>
                  </tr>
                )}
                {reportData.expenses.totalExpenses > 0 && (
                  <tr>
                    <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">Business expenses (if self-employed) – rent, utilities, materials, fuel, services, etc.</td>
                    <td className="border border-border p-2 text-right font-medium">{formatCurrency(reportData.expenses.totalExpenses)}</td>
                    <td className="border border-border p-2 text-center">
                      {isEditing ? (
                        <Checkbox 
                          checked={reliefEvidence.businessExpenses}
                          onCheckedChange={(checked) => setReliefEvidence(prev => ({ ...prev, businessExpenses: !!checked }))}
                        />
                      ) : (
                        reliefEvidence.businessExpenses ? '☑' : '☐'
                      )}
                    </td>
                    <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">
                      {isEditing ? (
                        <Input 
                          value={reliefNotes.businessExpenses}
                          onChange={(e) => setReliefNotes(prev => ({ ...prev, businessExpenses: e.target.value }))}
                          placeholder="Notes"
                          className="h-8 text-xs"
                        />
                      ) : (
                        reliefNotes.businessExpenses || ''
                      )}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="border border-border p-2">Depreciation / Capital Allowance on assets (if applicable)</td>
                  <td className="border border-border p-2 text-right font-medium">₦0.00</td>
                  <td className="border border-border p-2 text-center">
                    {isEditing ? (
                      <Checkbox 
                        checked={reliefEvidence.depreciation}
                        onCheckedChange={(checked) => setReliefEvidence(prev => ({ ...prev, depreciation: !!checked }))}
                      />
                    ) : (
                      reliefEvidence.depreciation ? '☑' : '☐'
                    )}
                  </td>
                  <td className="border border-border p-2">
                    {isEditing ? (
                      <Input 
                        value={reliefNotes.depreciation}
                        onChange={(e) => setReliefNotes(prev => ({ ...prev, depreciation: e.target.value }))}
                        placeholder="Notes"
                        className="h-8 text-xs"
                      />
                    ) : (
                      reliefNotes.depreciation || ''
                    )}
                  </td>
                </tr>
                {reportData.tax.reliefs.charitableDonations > 0 && (
                  <tr>
                    <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">Charitable Donations</td>
                    <td className="border border-border p-2 text-right font-medium">{formatCurrency(reportData.tax.reliefs.charitableDonations)}</td>
                    <td className="border border-border p-2 text-center">
                      {isEditing ? (
                        <Checkbox 
                          checked={reliefEvidence.charitableDonations}
                          onCheckedChange={(checked) => setReliefEvidence(prev => ({ ...prev, charitableDonations: !!checked }))}
                        />
                      ) : (
                        reliefEvidence.charitableDonations ? '☑' : '☐'
                      )}
                    </td>
                    <td className="border border-border p-1.5 sm:p-2 text-xs sm:text-sm">
                      {isEditing ? (
                        <Input 
                          value={reliefNotes.charitableDonations}
                          onChange={(e) => setReliefNotes(prev => ({ ...prev, charitableDonations: e.target.value }))}
                          placeholder="Notes"
                          className="h-8 text-xs"
                        />
                      ) : (
                        reliefNotes.charitableDonations || ''
                      )}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="border border-border p-2">Any other allowed relief or deduction</td>
                  <td className="border border-border p-2 text-right font-medium">₦0.00</td>
                  <td className="border border-border p-2 text-center">
                    {isEditing ? (
                      <Checkbox 
                        checked={reliefEvidence.otherRelief}
                        onCheckedChange={(checked) => setReliefEvidence(prev => ({ ...prev, otherRelief: !!checked }))}
                      />
                    ) : (
                      reliefEvidence.otherRelief ? '☑' : '☐'
                    )}
                  </td>
                  <td className="border border-border p-2">
                    {isEditing ? (
                      <Input 
                        value={reliefNotes.otherRelief}
                        onChange={(e) => setReliefNotes(prev => ({ ...prev, otherRelief: e.target.value }))}
                        placeholder="Notes"
                        className="h-8 text-xs"
                      />
                    ) : (
                      reliefNotes.otherRelief || ''
                    )}
                  </td>
                </tr>
                <tr className="bg-muted font-bold">
                  <td className="border border-border p-2">Total Allowable Deductions & Reliefs</td>
                  <td className="border border-border p-2 text-right">{formatCurrency(reportData.tax.totalReliefs + reportData.expenses.taxDeductibleExpenses)}</td>
                  <td className="border border-border p-2"></td>
                  <td className="border border-border p-2"></td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>

        {/* Part D: Tax Already Paid (Credits) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold border-b-2 border-border pb-2 uppercase">Part D – Tax Already Paid (Credits)</h2>
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddCredit(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Credit
              </Button>
            )}
            </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-2 text-left" style={{ width: '35%' }}>Type of Payment</th>
                  <th className="border border-border p-2 text-right" style={{ width: '20%' }}>Amount (₦)</th>
                  <th className="border border-border p-2 text-center" style={{ width: '15%' }}>Tax Year</th>
                  <th className="border border-border p-2 text-center" style={{ width: '10%' }}>Evidence Attached (Y/N)</th>
                  <th className="border border-border p-2 text-left" style={{ width: '15%' }}>Notes</th>
                  {isEditing && (
                    <th className="border border-border p-2 text-center" style={{ width: '5%' }}>Action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loadingCredits ? (
                  <tr>
                    <td colSpan={isEditing ? 6 : 5} className="border border-border p-4 text-center text-muted-foreground">
                      Loading tax credits...
                    </td>
                  </tr>
                ) : allTaxCredits.length === 0 ? (
                  <tr>
                    <td colSpan={isEditing ? 6 : 5} className="border border-border p-4 text-center text-muted-foreground italic">
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
                              className="h-8 text-xs"
                              placeholder="Type of payment"
                            />
                          ) : (
                            credit.type
                          )}
                        </td>
                        <td className="border border-border p-2 text-right font-medium">
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
                              className="h-8 text-xs text-right"
                              placeholder="0.00"
                            />
                          ) : (
                            formatCurrency(credit.amount)
                          )}
                        </td>
                        <td className="border border-border p-2 text-center">
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
                              className="h-8 text-xs text-center w-20"
                            />
                          ) : (
                            credit.taxYear
                          )}
                        </td>
                        <td className="border border-border p-2 text-center">
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
                              className="h-8 text-xs"
                            />
                          ) : (
                            credit.notes || ''
                          )}
                        </td>
                        {isEditing && (
                          <td className="border border-border p-2 text-center">
                            {credit.source === 'manual' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updated = allTaxCredits.filter(c => c.id !== credit.id)
                                  setAllTaxCredits(updated)
                                  updateTaxCreditsTotals(updated)
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </>
                )}
                <tr className="bg-muted font-bold">
                  <td className="border border-border p-2">Total Tax Credits / Prepaid Tax</td>
                  <td className="border border-border p-2 text-right">{formatCurrency(taxCredits.total)}</td>
                  <td className="border border-border p-2"></td>
                  <td className="border border-border p-2"></td>
                  <td className="border border-border p-2"></td>
                  {isEditing && <td className="border border-border p-2"></td>}
                </tr>
              </tbody>
            </table>
            </div>
            </div>

        {/* Part E: Tax Computation */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b-2 border-border pb-2 uppercase">Part E – Tax Computation</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">1. Total Gross Income (from Part B)</span>
              <span className="font-medium">{formatCurrency(reportData.tax.grossIncome)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">2. Less: Total Allowable Deductions & Reliefs (from Part C)</span>
              <span className="font-medium text-red-600">-{formatCurrency(reportData.tax.totalReliefs + reportData.expenses.taxDeductibleExpenses)}</span>
          </div>
            <div className="flex justify-between py-3 border-t-2 border-border font-semibold">
              <span>→ Net Taxable Income</span>
              <span>{formatCurrency(reportData.tax.taxableIncome)}</span>
        </div>

            <div className="bg-muted/50 p-4 rounded-lg mt-4">
              <strong className="block mb-3">3. Computed Tax (based on current PIT rates)</strong>
              <div className="space-y-2">
                {reportData.tax.taxBrackets.map((bracket, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatCurrency(bracket.amount)} @ {bracket.rate}%
                    </span>
                    <span className="font-medium">{formatCurrency(bracket.tax)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 border-t border-border font-semibold">
                  <span>→ Gross Tax Due</span>
                  <span>{formatCurrency(reportData.tax.taxPayable)}</span>
                </div>
            </div>
            </div>

            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">4. Less: Tax Credits / Prepaid Tax (from Part D)</span>
              <span className="font-medium text-red-600">-{formatCurrency(taxCredits.total)}</span>
            </div>
            <div className="flex justify-between py-4 border-t-4 border-border font-bold text-lg bg-primary/5 rounded-lg p-4">
              <span>→ Net Tax Payable or Refund Due</span>
              <span className="text-primary">{formatCurrency(Math.max(0, reportData.tax.taxPayable - taxCredits.total))}</span>
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
                  type="number"
                  value={newCredit.amount}
                  onChange={(e) => setNewCredit(prev => ({ ...prev, amount: e.target.value }))}
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
      </div>
    </Card>
  )
}
