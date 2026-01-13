"use client"

import React, { useState, useEffect } from "react"
import { PaymentReceipt } from "@/components/tax-payment/payment-receipt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "next/navigation"
import { SimplifiedPaymentForm } from "@/components/tax-payment/simplified-payment-form"
import { taxPaymentService, documentService, transactionService, userService } from "@/lib/services"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { toast } from "sonner"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CheckCircle2, XCircle, AlertCircle, Loader2, TrendingUp, ExternalLink } from "lucide-react"
import { calculatePeriodTaxes } from "@/lib/utils/tax-period-calculation"
import { formatCurrencyAmount } from "@/lib/utils/currency"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { PaymentPortalSelectorModal } from "@/components/payment/payment-portal-selector-modal"
import { isConsultant } from "@/lib/utils/businessTypeHelpers"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"

interface PaymentData {
  amount: number
  tips: string[]
  status: string
  transactionId: string
  method: string
  taxDuration: string
  timestamp: string
  rrr?: string
  tin?: string
  state?: string
}

interface PaymentFormData {
  period: 'monthly' | 'quarterly' | 'yearly'
  amount: number
  taxDuration: string
  calculatedAmount?: number
  pendingPeriods?: Array<{
    period: string
    amount: number
    taxDuration: string
  }>
  isManual: boolean
}

interface SystemCheck {
  name: string
  status: boolean
  message: string
  actionUrl?: string
  actionLabel?: string
  actionType?: 'profile' | 'tin' | 'kyc' // Type of action to determine which modal to open
}

export default function PaymentPage() {
  const router = useRouter()
  const pathname = usePathname()
  const basePath = pathname?.startsWith("/dashboard-creator")
    ? "/dashboard-creator"
    : pathname?.startsWith("/dashboard-sme")
      ? "/dashboard-sme"
      : "/dashboard"
  const { user } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  const { isSubscribedOnly, loading: subscriptionLoading } = useSubscription()
  const [localProfile, setLocalProfile] = useState(profile) // Local profile state to avoid refresh
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [processing, setProcessing] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [showPortalSelector, setShowPortalSelector] = useState(false)
  const [showNrsPayModal, setShowNrsPayModal] = useState(false)
  const [recordingNrsPayment, setRecordingNrsPayment] = useState(false)
  const [showReceiptUploadModal, setShowReceiptUploadModal] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([])
  const [allChecksPassed, setAllChecksPassed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [outstandingTaxes, setOutstandingTaxes] = useState<Array<{
    period: string
    taxDuration: string
    amount: number
    periodType: 'monthly' | 'quarterly' | 'yearly'
  }>>([])
  const [loadingOutstanding, setLoadingOutstanding] = useState(false)
  const [hasCheckedOutstanding, setHasCheckedOutstanding] = useState(false)
  
  // Modals for updating requirements
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showTINModal, setShowTINModal] = useState(false)
  const [showKYCModal, setShowKYCModal] = useState(false)
  const [showNrsTaxIdModal, setShowNrsTaxIdModal] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingTIN, setSavingTIN] = useState(false)
  const [uploadingKYC, setUploadingKYC] = useState(false)

  const NRS_PORTAL_URL = "https://selfservice.nrs.gov.ng/"
  const NRS_TAX_ID_URL = "https://taxid.nrs.gov.ng/"

  // Check subscription on mount
  useEffect(() => {
    if (subscriptionLoading || profileLoading) return
    
    if (!isSubscribedOnly()) {
      setShowSubscriptionModal(true)
    }
  }, [isSubscribedOnly, subscriptionLoading, profileLoading])

  // Mock payment processing
  const processPayment = async (amount: number, method: string): Promise<PaymentData> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
    const tips = [
      "Keep this receipt for your records",
      "File your tax returns on time to avoid penalties",
      "Consider consulting a tax professional for complex situations",
      "Maintain records of all deductions and expenses",
      "Set reminders for upcoming tax deadlines"
    ]
    
    return {
      amount,
      tips,
      status: "Success",
      transactionId,
      method: method.charAt(0).toUpperCase() + method.slice(1),
      taxDuration: "", // Will be set by caller
      timestamp: new Date().toISOString()
    }
  }

  // Update local profile when profile changes (but only on initial load)
  // We don't want to sync after we've made local updates to prevent refresh
  useEffect(() => {
    // Only sync on initial load when localProfile is null
    // After that, we manage localProfile ourselves to avoid refresh
    if (profile && !localProfile) {
      setLocalProfile(profile)
    }
  }, [profile]) // Only depend on profile, not localProfile to avoid loops

  const performSystemChecks = async (profileToCheck?: any) => {
    const profileToUse = profileToCheck || localProfile || profile
    if (!profileToUse || !user?.uid) return

    setChecking(true)
    const checks: SystemCheck[] = []

    // 1. Check if profile is complete
    const isProfileComplete = !!(
      profileToUse.firstName &&
      profileToUse.lastName &&
      profileToUse.address &&
      profileToUse.address.street &&
      profileToUse.address.city &&
      profileToUse.address.state &&
      profileToUse.phone
    )
    
    checks.push({
      name: "Profile Complete",
      status: isProfileComplete,
      message: isProfileComplete 
        ? "Your profile information is complete"
        : "Please complete your profile information (name, address, phone)",
      actionLabel: !isProfileComplete ? "Complete Profile" : undefined,
      actionType: !isProfileComplete ? 'profile' : undefined
    })

    // 2. Check if TIN is verified
    const taxId = profileToUse.taxId
    const isTINVerified = !!(taxId && typeof taxId === 'string' && taxId.trim().length > 0)
    checks.push({
      name: "Tax ID Verified",
      status: isTINVerified,
      message: isTINVerified
        ? "Your Tax Identification Number is verified"
        : "Please verify your Tax Identification Number (Tax ID)",
      actionLabel: !isTINVerified ? "Add Tax ID" : undefined,
      actionType: !isTINVerified ? 'tin' : undefined
    })

    // 3. Check if KYC is uploaded (check for identity documents in profile)
    try {
      const hasKYCDocuments = !!(
        profileToUse.kycDocuments?.id || 
        profileToUse.kycDocuments?.passport || 
        profileToUse.kycDocuments?.driverLicense
      )
      
      checks.push({
        name: "KYC Documents",
        status: hasKYCDocuments,
        message: hasKYCDocuments
          ? "KYC documents are uploaded"
          : "Please upload your identity documents (ID, Passport, or Driver's License)",
        actionLabel: !hasKYCDocuments ? "Upload Documents" : undefined,
        actionType: !hasKYCDocuments ? 'kyc' : undefined
      })
    } catch (error) {
      console.error("Error checking KYC documents:", error)
      checks.push({
        name: "KYC Documents",
        status: false,
        message: "Unable to verify KYC documents",
        actionLabel: "Upload Documents",
        actionType: 'kyc'
      })
    }

    setSystemChecks(checks)
    const passed = checks.every(check => check.status)
    setAllChecksPassed(passed)
    setChecking(false)
  }

  const handlePaymentFormContinue = async (data: PaymentFormData) => {
    // Store payment data
    setPaymentFormData(data)
    
    // Store in localStorage for the generate-rrr page
    if (typeof window !== 'undefined') {
      localStorage.setItem('payment_amount', data.amount.toString())
      localStorage.setItem('payment_period', data.period)
      localStorage.setItem('payment_taxDuration', data.taxDuration)
      if (data.calculatedAmount) {
        localStorage.setItem('payment_calculatedAmount', data.calculatedAmount.toString())
      }
    }
    
    // Reset outstanding taxes state when period changes
    setOutstandingTaxes([])
    setHasCheckedOutstanding(false)
    
    // Immediately show validation phase (better UX)
    setShowValidation(true)
    
    // Load outstanding taxes and perform system checks in the background
    // These will show loading states in the validation phase
    Promise.all([
      loadOutstandingTaxes(data.period),
      performSystemChecks()
    ]).catch(error => {
      console.error('Error loading validation data:', error)
    })
  }

  const handleProceedToPay = () => {
    if (allChecksPassed) {
      // Show portal selector to choose between NRC and state IRS
      setShowPortalSelector(true)
    } else {
      toast.error("Please complete all required checks before proceeding")
    }
  }

  const handleSelectNRC = () => {
    setShowPortalSelector(false)
    setShowNrsPayModal(true)
  }

  const handleSelectStateIRS = (irsUrl: string) => {
    setShowPortalSelector(false)
    // Open state IRS portal in new tab
    window.open(irsUrl, "_blank")
    // Show receipt upload modal after a brief delay
    setTimeout(() => {
      setShowReceiptUploadModal(true)
    }, 500)
  }

  const openReceiptUploadForNrsPayment = () => {
    if (!user?.uid) return toast.error("Not signed in")
    if (!paymentFormData) return toast.error("Payment details not found. Please go back and try again.")

    // Require receipt upload before we record the payment in OTax
    setShowNrsPayModal(false)
    setShowReceiptUploadModal(true)
  }

  const uploadReceiptAndRecordNrsPayment = async () => {
    if (!user?.uid) return toast.error("Not signed in")
    if (!paymentFormData) return toast.error("Payment details not found. Please go back and try again.")
    if (!receiptFile) return toast.error("Please upload your payment receipt to continue.")

    setUploadingReceipt(true)
    setRecordingNrsPayment(true)
    try {
      const { isDuplicate } = await checkDuplicatePayment(paymentFormData.period, paymentFormData.taxDuration)
      if (isDuplicate) {
        toast.message("This payment already exists in OTax for the selected period.")
        setShowReceiptUploadModal(false)
        router.push(`${basePath}/payment`)
        return
      }

      const uploadResult = await uploadToImageKit(receiptFile, "payment-receipts", user.uid)
      const docRes = await documentService.uploadDocument(user.uid, {
        file: receiptFile,
        name: `Payment Receipt - ${paymentFormData.taxDuration}`,
        type: "receipt",
        imageKitUrl: uploadResult.url,
        imageKitFileId: uploadResult.fileId,
        fileSize: uploadResult.size,
        linkedTransaction: `NRS-${paymentFormData.period}-${paymentFormData.taxDuration}`,
        notes: `Manual confirmation: Paid on NRS portal (${paymentFormData.period} / ${paymentFormData.taxDuration})`
      })

      if (!docRes.success || !docRes.data) {
        throw new Error(docRes.error || "Failed to save receipt document")
      }

      const transactionId = `NRS-${Date.now()}`
      const saveResult = await taxPaymentService.createPayment(user.uid, {
        transactionId,
        amount: paymentFormData.amount,
        period: paymentFormData.period,
        taxDuration: paymentFormData.taxDuration,
        paymentMethod: "firs",
        status: "completed",
        receiptUrl: docRes.data.url,
        notes: `Manual confirmation: Paid on NRS portal (${paymentFormData.period} / ${paymentFormData.taxDuration})`
      })

      if (!saveResult.success) {
        throw new Error(saveResult.error || "Failed to record payment")
      }

      toast.success("Payment recorded")
      setShowReceiptUploadModal(false)
      setReceiptFile(null)
      router.push(`${basePath}/payment`)
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : "Failed to upload receipt / record payment")
    } finally {
      setUploadingReceipt(false)
      setRecordingNrsPayment(false)
    }
  }

  const handlePay = async (amount: number, method: string, period: string, taxDuration: string, taxCalculation?: any, rrr?: string, tin?: string, state?: string) => {
    setProcessing(true)
    
    try {
      // Simulate payment processing based on method
      let paymentResult: PaymentData
      
      if (method === "firs") {
        // Open FIRS in new tab
        const confirmProceed = window.confirm(
          "You will be redirected to the FIRS official payment portal. Continue?"
        )
        if (!confirmProceed) {
          setProcessing(false)
          return
        }
        window.open("https://firs.gov.ng", "_blank")
        // Still process as success for demo
        paymentResult = await processPayment(amount, method)
      } else {
        // Mock payment for other gateways
        paymentResult = await processPayment(amount, method)
      }
      
      // Save payment to Firebase
      if (user?.uid) {
        try {
          console.log('Attempting to save payment to Firebase...')
          console.log('Payment data:', { 
            transactionId: paymentResult.transactionId, 
            amount: paymentResult.amount, 
            period,
            method 
          })
          
          const saveResult = await taxPaymentService.createPayment(user.uid, {
            transactionId: paymentResult.transactionId,
            amount: paymentResult.amount,
            period: period as 'monthly' | 'quarterly' | 'yearly',
            taxDuration: taxDuration,
            paymentMethod: method as 'remitta' | 'interswitch' | 'paystack' | 'firs',
            status: 'completed',
            taxCalculation: taxCalculation,
            notes: 'Payment completed successfully'
          })
          
          console.log('Save result:', saveResult)
          
          if (!saveResult.success) {
            console.error('Failed to save payment to Firebase:', saveResult.error)
            toast.error(`Payment completed but failed to save record: ${saveResult.error}`)
          } else {
            toast.success('Payment saved successfully')
          }
        } catch (error) {
          console.error('Error saving payment to Firebase:', error)
          toast.error('Payment completed but failed to save record. Please check console for details.')
        }
      } else {
        console.error('User not found, cannot save payment')
        toast.error('Payment completed but user not authenticated')
      }
      
      // Add taxDuration and RRR details to paymentResult
      paymentResult.taxDuration = taxDuration
      if (rrr) paymentResult.rrr = rrr
      if (tin) paymentResult.tin = tin
      if (state) paymentResult.state = state
      
      setPaymentData(paymentResult)
      setShowReceipt(true)
      setProcessing(false)
    } catch (error) {
      console.error("Payment processing error:", error)
      toast.error("Payment failed. Please try again.")
      setProcessing(false)
    }
  }

  const handleCloseReceipt = () => {
    // Clear any remaining localStorage data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tax_payment_step')
      localStorage.removeItem('tax_payment_period')
      localStorage.removeItem('tax_payment_amount')
      localStorage.removeItem('tax_payment_method')
      localStorage.removeItem('tax_payment_calculated')
      localStorage.removeItem('tax_payment_calculated_full')
      localStorage.removeItem('tax_payment_tab')
      localStorage.removeItem('tax_payment_tax_duration')
    }
    
    setShowReceipt(false)
    router.push("/dashboard")
  }

  // Helper function to extract year from taxDuration
  const extractYear = (taxDuration: string): number | null => {
    const yearMatch = taxDuration.match(/\b(20\d{2})\b/)
    return yearMatch ? parseInt(yearMatch[1]) : null
  }

  // Helper function to extract month index (0-11) from taxDuration
  const extractMonthIndex = (taxDuration: string): number | null => {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                        'july', 'august', 'september', 'october', 'november', 'december']
    const lower = taxDuration.toLowerCase()
    for (let i = 0; i < monthNames.length; i++) {
      if (lower.includes(monthNames[i])) {
        return i
      }
    }
    return null
  }

  // Helper function to extract quarter number (1-4) from taxDuration
  const extractQuarter = (taxDuration: string): number | null => {
    // Try "Q1", "Q2", etc.
    const qMatch = taxDuration.match(/Q(\d+)/i)
    if (qMatch) {
      return parseInt(qMatch[1])
    }
    // Try "Jan-Mar", "Apr-Jun", etc.
    if (taxDuration.includes('Jan-Mar')) return 1
    if (taxDuration.includes('Apr-Jun')) return 2
    if (taxDuration.includes('Jul-Sep')) return 3
    if (taxDuration.includes('Oct-Dec')) return 4
    return null
  }

  // Helper function to check if a payment matches a tax period
  const paymentMatchesPeriod = (
    payment: any,
    calculatedTaxDuration: string,
    calculatedPeriod: 'monthly' | 'quarterly' | 'yearly'
  ): boolean => {
    // First check if period matches
    if (payment.period !== calculatedPeriod) return false
    
    const paymentDuration = payment.taxDuration || ''
    const calculatedDuration = calculatedTaxDuration || ''
    
    // Try exact match first (case-insensitive, trimmed)
    if (paymentDuration.trim().toLowerCase() === calculatedDuration.trim().toLowerCase()) {
      return true
    }
    
    // Extract year from both
    const paymentYear = extractYear(paymentDuration)
    const calculatedYear = extractYear(calculatedDuration)
    
    if (!paymentYear || !calculatedYear || paymentYear !== calculatedYear) {
      return false
    }
    
    // For monthly: match by month name and year
    if (calculatedPeriod === 'monthly') {
      const paymentMonth = extractMonthIndex(paymentDuration)
      const calculatedMonth = extractMonthIndex(calculatedDuration)
      return paymentMonth !== null && calculatedMonth !== null && paymentMonth === calculatedMonth
    }
    
    // For quarterly: match by quarter number and year
    if (calculatedPeriod === 'quarterly') {
      const paymentQ = extractQuarter(paymentDuration)
      const calculatedQ = extractQuarter(calculatedDuration)
      return paymentQ !== null && calculatedQ !== null && paymentQ === calculatedQ
    }
    
    // For yearly: match by year only
    if (calculatedPeriod === 'yearly') {
      return paymentYear === calculatedYear
    }
    
    return false
  }

  // Calculate outstanding tax payments for a specific period type
  const loadOutstandingTaxes = async (periodType: 'monthly' | 'quarterly' | 'yearly') => {
    if (!user?.uid || !profile?.userId || !profile?.businessType) return

    setLoadingOutstanding(true)
    try {
      const currentYear = new Date().getFullYear()
      const yearsToCheck = [currentYear, currentYear - 1]
      
      // Get all completed payments
      const payments = await taxPaymentService.getUserPaymentsSimple(user.uid)
      const completedPayments = payments.filter(p => p.status === 'completed')
      
      console.log('Completed payments:', completedPayments.map(p => ({
        taxDuration: p.taxDuration,
        period: p.period,
        amount: p.amount
      })))
      
      // Calculate outstanding taxes for the selected period type only
      const outstanding: Array<{
        period: string
        taxDuration: string
        amount: number
        periodType: 'monthly' | 'quarterly' | 'yearly'
      }> = []

      // Check outstanding for the selected period type
      for (const year of yearsToCheck) {
        const periodTaxes = await calculatePeriodTaxes(
          user.uid,
          periodType,
          year,
          profile.businessType as 'freelancer' | 'creator' | 'small-business' | 'sme'
        )

        for (const periodTax of periodTaxes) {
          // Check if payment exists for this taxDuration using flexible matching
          const hasPayment = completedPayments.some(
            p => paymentMatchesPeriod(p, periodTax.taxDuration, periodType)
          )

          if (!hasPayment && periodTax.amount > 0) {
            outstanding.push({
              period: periodTax.period,
              taxDuration: periodTax.taxDuration,
              amount: periodTax.amount,
              periodType: periodType
            })
          }
        }
      }

      console.log('Outstanding taxes after matching:', outstanding)

      // Sort by amount (highest first) and then by period
      outstanding.sort((a, b) => {
        if (b.amount !== a.amount) return b.amount - a.amount
        return a.taxDuration.localeCompare(b.taxDuration)
      })

      setOutstandingTaxes(outstanding)
      setHasCheckedOutstanding(true)
    } catch (error) {
      console.error('Error loading outstanding taxes:', error)
      toast.error('Failed to load outstanding tax information')
      setHasCheckedOutstanding(true) // Mark as checked even on error
    } finally {
      setLoadingOutstanding(false)
    }
  }

  // Outstanding taxes check is now done after period selection in handlePaymentFormContinue

  // Handler to save profile updates
  const handleSaveProfile = async (profileData: {
    firstName: string
    lastName: string
    phone: string
    address: {
      street: string
      city: string
      state: string
      country: string
      postalCode: string
    }
  }) => {
    if (!user?.uid) return
    
    setSavingProfile(true)
    try {
      const result = await userService.upsertProfile(user.uid, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        address: profileData.address,
        updatedAt: new Date().toISOString()
      })
      
      if (result.success) {
        // Update local profile state immediately
        const updatedProfile = {
          ...(localProfile || profile || {}),
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
          address: profileData.address,
          updatedAt: new Date().toISOString()
        }
        setLocalProfile(updatedProfile as any)
        
        toast.success('Profile updated successfully')
        setShowProfileModal(false)
        
        // Re-run checks with updated profile (no page refresh, no refetch)
        performSystemChecks(updatedProfile).catch(console.error)
      } else {
        toast.error(result.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  // Handler to save TIN
  const handleSaveTIN = async (taxId: string) => {
    if (!user?.uid) return
    
    setSavingTIN(true)
    try {
      // Check if Tax ID is already taken by another user
      const isTaken = await userService.isTaxIdTaken(taxId, user.uid)
      if (isTaken) {
        toast.error('This Tax ID has already been registered by another user.')
        return
      }

      const result = await userService.upsertProfile(user.uid, {
        taxId: taxId.trim(),
        updatedAt: new Date().toISOString()
      })
      
      if (result.success) {
        // Update local profile state immediately
        const updatedProfile = {
          ...(localProfile || profile || {}),
          taxId: taxId.trim(),
          updatedAt: new Date().toISOString()
        }
        setLocalProfile(updatedProfile as any)
        
        toast.success('Tax ID saved successfully')
        setShowTINModal(false)
        
        // Re-run checks with updated profile (no page refresh, no refetch)
        performSystemChecks(updatedProfile).catch(console.error)
      } else {
        toast.error(result.error || 'Failed to save Tax ID')
      }
    } catch (error) {
      console.error('Error saving TIN:', error)
      toast.error('Failed to save Tax ID')
    } finally {
      setSavingTIN(false)
    }
  }

  // Handler to upload KYC document
  const handleUploadKYC = async (file: File) => {
    if (!user?.uid) return
    
    setUploadingKYC(true)
    try {
      const result = await uploadToImageKit(file, 'kyc', user.uid)
      
      // Get current KYC documents
      const currentKyc = (localProfile || profile)?.kycDocuments || (profile?.kycDocuments as any) || {}
      
      // Update profile with new document URL
      const updateResult = await userService.upsertProfile(user.uid, {
        kycDocuments: {
          id: result.url,
          idFileId: result.fileId,
          idSize: result.size,
          proofOfAddress: (currentKyc as any).proofOfAddress,
          proofOfAddressFileId: (currentKyc as any).proofOfAddressFileId,
          proofOfAddressSize: (currentKyc as any).proofOfAddressSize
        } as any,
        updatedAt: new Date().toISOString()
      })
      
      if (updateResult.success) {
        // Update local profile state immediately
        const updatedProfile = {
          ...(localProfile || profile || {}),
          kycDocuments: {
            id: result.url,
            idFileId: result.fileId,
            idSize: result.size,
            proofOfAddress: (currentKyc as any).proofOfAddress,
            proofOfAddressFileId: (currentKyc as any).proofOfAddressFileId,
            proofOfAddressSize: (currentKyc as any).proofOfAddressSize
          },
          updatedAt: new Date().toISOString()
        }
        setLocalProfile(updatedProfile as any)
        
        // Re-run checks with updated profile (no page refresh)
        await performSystemChecks(updatedProfile)
        
        toast.success('KYC document uploaded successfully')
        setShowKYCModal(false)
        
        // No refetch - we're using localProfile to avoid page refresh
      } else {
        toast.error(updateResult.error || 'Failed to upload document')
      }
    } catch (error) {
      console.error('Error uploading KYC:', error)
      toast.error('Failed to upload document')
    } finally {
      setUploadingKYC(false)
    }
  }

  // Check for duplicate payment
  const checkDuplicatePayment = async (period: string, taxDuration: string): Promise<{ isDuplicate: boolean; payment?: any }> => {
    if (!user?.uid) {
      return { isDuplicate: false }
    }

    try {
      // Get all payments for this user using simple query (no index required)
      const payments = await taxPaymentService.getUserPaymentsSimple(user.uid)
      
      if (payments && payments.length > 0) {
        // Check if any payment exists with the same period and taxDuration
        const duplicate = payments.find(payment => 
          payment.period === period && 
          payment.taxDuration === taxDuration &&
          payment.status === 'completed'
        )
        
        if (duplicate) {
          return { isDuplicate: true, payment: duplicate }
        }
      }
      
      return { isDuplicate: false }
    } catch (error) {
      console.error('Error checking duplicate payment:', error)
      return { isDuplicate: false }
    }
  }

  // Don't render content if user is not subscribed (show modal instead)
  if (!subscriptionLoading && !profileLoading && !isSubscribedOnly()) {
    return (
      <>
        {profile && !isConsultant(profile.businessType) && (
          <SubscriptionRequiredModal
            open={showSubscriptionModal}
            onOpenChange={(open) => {
              setShowSubscriptionModal(open)
              if (!open) {
                router.push(`${basePath}/payment`)
              }
            }}
            businessType={profile.businessType || 'freelancer'}
          />
        )}
      </>
    )
  }

  return (
    <>
      {/* Payment Portal Selector Modal */}
      <PaymentPortalSelectorModal
        open={showPortalSelector}
        onOpenChange={setShowPortalSelector}
        userState={profile?.address?.state}
        onSelectNRC={handleSelectNRC}
        onSelectStateIRS={handleSelectStateIRS}
        taxAmount={paymentFormData?.amount}
        taxDescription={`${paymentFormData?.period.charAt(0).toUpperCase()}${paymentFormData?.period.slice(1)} Tax Payment`}
        taxDuration={paymentFormData?.taxDuration}
        period={paymentFormData?.period}
      />

      {/* NRS Pay Modal (replaces in-app RRR generation) */}
      <Dialog open={showNrsPayModal} onOpenChange={setShowNrsPayModal}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-3xl p-0 overflow-hidden sm:rounded-lg h-[92dvh] sm:h-auto">
          <div className="p-4 border-b">
            <DialogHeader>
              <DialogTitle>Proceed to Pay on NRS Portal</DialogTitle>
              <DialogDescription>
                Complete your tax payment on the NRS portal. When you’re done, come back and confirm so OTax can record it.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(92dvh-140px)] sm:max-h-[70vh]">
            {paymentFormData && (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">{formatCurrencyAmount(paymentFormData.amount, "NGN")}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-medium capitalize">{paymentFormData.period}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Tax Duration</span>
                  <span className="font-medium">{paymentFormData.taxDuration}</span>
                </div>
              </div>
            )}

            <div className="rounded-lg border overflow-hidden">
              <iframe
                title="NRS Self Service Portal"
                src={NRS_PORTAL_URL}
                className="w-full h-[55dvh] sm:h-[70vh] bg-background"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t flex-col sm:flex-row gap-2 sm:gap-3 sticky bottom-0 bg-background">
            <Button
              variant="outline"
              onClick={() => setShowNrsPayModal(false)}
              disabled={recordingNrsPayment}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            <Button
              onClick={openReceiptUploadForNrsPayment}
              disabled={recordingNrsPayment}
              className="w-full sm:w-auto"
            >
              {recordingNrsPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                "Payment made"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Required Receipt Upload (before recording manual payment) */}
      <Dialog open={showReceiptUploadModal} onOpenChange={(open) => {
        // Don't allow closing if we're uploading/recording
        if (!open && (uploadingReceipt || recordingNrsPayment)) return
        setShowReceiptUploadModal(open)
      }}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg p-0 overflow-hidden sm:rounded-lg">
          <div className="p-4 border-b">
            <DialogHeader>
              <DialogTitle>Upload payment receipt</DialogTitle>
              <DialogDescription>
                Receipt upload is required before OTax can mark this as a completed payment.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-4 space-y-3">
            {paymentFormData && (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">{formatCurrencyAmount(paymentFormData.amount, "NGN")}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-medium capitalize">{paymentFormData.period}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Tax Duration</span>
                  <span className="font-medium">{paymentFormData.taxDuration}</span>
                </div>
              </div>
            )}

            <div className="rounded-lg border p-3 bg-background">
              <p className="text-sm font-medium">Receipt file</p>
              <p className="text-xs text-muted-foreground mt-1">Accepted: PDF or image</p>
              <div className="mt-2">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  disabled={uploadingReceipt || recordingNrsPayment}
                />
              </div>
              {receiptFile && (
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  Selected: <span className="font-medium text-foreground">{receiptFile.name}</span>
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t flex-col sm:flex-row gap-2 sm:gap-3 bg-background">
            <Button
              variant="outline"
              onClick={() => {
                setShowReceiptUploadModal(false)
                setShowNrsPayModal(true)
              }}
              disabled={uploadingReceipt || recordingNrsPayment}
              className="w-full sm:w-auto"
            >
              Back
            </Button>
            <Button
              onClick={uploadReceiptAndRecordNrsPayment}
              disabled={uploadingReceipt || recordingNrsPayment || !receiptFile}
              className="w-full sm:w-auto"
            >
              {(uploadingReceipt || recordingNrsPayment) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload & Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      {showReceipt && paymentData && (
        <PaymentReceipt 
          paymentData={paymentData} 
          onDownload={() => {}} 
          onClose={handleCloseReceipt}
        />
      )}

      {/* Main Content */}
      <div className=" px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        {showValidation ? (
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold">System Checks</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  Please ensure all requirements are met before making payment
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                {checking || profileLoading ? (
                  <div className="flex items-center justify-center py-4 sm:py-6 md:py-8">
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 animate-spin text-primary" />
                    <span className="ml-2 text-xs sm:text-sm text-muted-foreground">Checking requirements...</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
                    {systemChecks.filter(check => !check.status).length > 0 ? (
                      <>
                        <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-2.5 sm:p-3 md:p-4">
                          <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-amber-600 dark:text-amber-400" />
                          <AlertTitle className="text-xs sm:text-sm md:text-base text-amber-800 dark:text-amber-200 font-medium">
                            Action Required
                          </AlertTitle>
                          <AlertDescription className="text-[11px] sm:text-xs md:text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Please complete the following requirements before generating RRR
                          </AlertDescription>
                        </Alert>

                        <Accordion type="single" collapsible className="w-full">
                          {systemChecks
                            .filter(check => !check.status)
                            .map((check, index) => (
                              <AccordionItem key={index} value={`check-${index}`}>
                                <AccordionTrigger className="hover:no-underline px-2 sm:px-3 md:px-4 py-2.5 sm:py-3">
                                  <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 w-full">
                                    <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span className="font-medium text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                                      {check.name}
                                    </span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-2 sm:px-3 md:px-4 pb-2.5 sm:pb-3">
                                  <div className="pl-5 sm:pl-6 md:pl-8 space-y-2 sm:space-y-2.5 md:space-y-3">
                                    <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed">{check.message}</p>
                                    {check.actionLabel && check.actionType && (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 sm:h-9 text-[11px] sm:text-xs md:text-sm"
                                        onClick={() => {
                                          if (check.actionType === 'profile') {
                                            setShowProfileModal(true)
                                          } else if (check.actionType === 'tin') {
                                            setShowTINModal(true)
                                          } else if (check.actionType === 'kyc') {
                                            setShowKYCModal(true)
                                          }
                                        }}
                                      >
                                        {check.actionLabel}
                                      </Button>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                        </Accordion>
                      </>
                    ) : (
                      <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-2.5 sm:p-3 md:p-4">
                        <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
                        <AlertTitle className="text-xs sm:text-sm md:text-base text-green-800 dark:text-green-200 font-medium">
                          All Checks Passed
                        </AlertTitle>
                        <AlertDescription className="text-[11px] sm:text-xs md:text-sm text-green-700 dark:text-green-300 mt-1">
                          You're ready to proceed to payment
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2.5 md:gap-3 pt-2.5 sm:pt-3 md:pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowValidation(false)}
                        className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleProceedToPay}
                        disabled={!allChecksPassed}
                        className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
                      >
                        Proceed to Pay
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Back Button */}
            <div className="mb-1 sm:mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`${basePath}/payment`)}
                className="h-8 text-xs sm:text-sm -ml-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
            <Card className="p-3 sm:p-4 md:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 sm:mb-1.5 md:mb-2">Pay Your Tax</h1>
                  <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed">
                    Select your payment period and we'll calculate the amount based on your transactions, or enter it manually.
                  </p>
                </div>
              </div>
            </Card>

            <SimplifiedPaymentForm 
              onContinue={handlePaymentFormContinue}
              outstandingTaxes={outstandingTaxes}
              loadingOutstanding={loadingOutstanding}
              hasCheckedOutstanding={hasCheckedOutstanding}
            />
          </div>
        )}
      </div>

      {/* Subscription Required Modal */}
      {profile && !isConsultant(profile.businessType) && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={(open) => {
            setShowSubscriptionModal(open)
            if (!open && !isSubscribedOnly()) {
              // Redirect back if modal is closed and user is not subscribed
              router.push(`${basePath}/payment`)
            }
          }}
          businessType={profile.businessType || 'freelancer'}
        />
      )}

      {/* Profile Update Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
            <DialogDescription>
              Please fill in all required information to proceed with payment
            </DialogDescription>
          </DialogHeader>
          <ProfileUpdateForm
            profile={profile}
            onSave={handleSaveProfile}
            onCancel={() => setShowProfileModal(false)}
            saving={savingProfile}
          />
        </DialogContent>
      </Dialog>

      {/* Tax ID Update Modal */}
      <Dialog open={showTINModal} onOpenChange={setShowTINModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Tax Identification Number</DialogTitle>
            <DialogDescription>
              Please enter your Tax Identification Number (Tax ID) to proceed
            </DialogDescription>
          </DialogHeader>
          <TINUpdateForm
            currentTIN={profile?.taxId || ''}
            onSave={handleSaveTIN}
            onCancel={() => setShowTINModal(false)}
            saving={savingTIN}
            onOpenNrsModal={() => setShowNrsTaxIdModal(true)}
          />
        </DialogContent>
      </Dialog>

      {/* NRS Tax ID Portal Modal */}
      <Dialog open={showNrsTaxIdModal} onOpenChange={setShowNrsTaxIdModal}>
        <DialogContent className="max-w-full w-full h-[90vh] p-0 sm:max-w-4xl sm:h-[85vh] flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b">
            <DialogTitle className="text-base sm:text-lg">NRS Tax ID Portal</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Complete your Tax ID registration or verification in the portal below. You can close this window when done.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 relative min-h-0">
            <iframe
              src={NRS_TAX_ID_URL}
              className="w-full h-full border-0"
              title="NRS Tax ID Portal"
              allow="fullscreen"
            />
          </div>
          <div className="px-4 sm:px-6 py-3 border-t flex justify-end">
            <Button type="button" onClick={() => setShowNrsTaxIdModal(false)} className="h-9 sm:h-10 text-xs sm:text-sm">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* KYC Upload Modal */}
      <Dialog open={showKYCModal} onOpenChange={setShowKYCModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload KYC Document</DialogTitle>
            <DialogDescription>
              Please upload a valid identity document (ID, Passport, or Driver's License)
            </DialogDescription>
          </DialogHeader>
          <KYCUploadForm
            onUpload={handleUploadKYC}
            onCancel={() => setShowKYCModal(false)}
            uploading={uploadingKYC}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

// Profile Update Form Component
function ProfileUpdateForm({ 
  profile, 
  onSave, 
  onCancel, 
  saving 
}: { 
  profile: any
  onSave: (data: any) => void
  onCancel: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    phone: profile?.phone || '',
    address: {
      street: profile?.address?.street || '',
      city: profile?.address?.city || '',
      state: profile?.address?.state || '',
      country: profile?.address?.country || 'Nigeria',
      postalCode: profile?.address?.postalCode || ''
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.firstName || !formData.lastName || !formData.phone || 
        !formData.address.street || !formData.address.city || !formData.address.state) {
      toast.error('Please fill in all required fields')
      return
    }
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="street">Street Address *</Label>
        <Input
          id="street"
          value={formData.address.street}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            address: { ...prev.address, street: e.target.value }
          }))}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.address.city}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              address: { ...prev.address, city: e.target.value }
            }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            value={formData.address.state}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              address: { ...prev.address, state: e.target.value }
            }))}
            required
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Tax ID Update Form Component
function TINUpdateForm({ 
  currentTIN, 
  onSave, 
  onCancel, 
  saving,
  onOpenNrsModal
}: { 
  currentTIN: string
  onSave: (tin: string) => void
  onCancel: () => void
  saving: boolean
  onOpenNrsModal: () => void
}) {
  const [taxId, setTaxId] = useState(currentTIN)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taxId.trim()) {
      toast.error('Please enter a Tax ID')
      return
    }
    onSave(taxId.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="taxId">Tax Identification Number (Tax ID) *</Label>
        <Input
          id="taxId"
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
          placeholder="Enter your Tax ID"
          required
        />
        <p className="text-xs text-muted-foreground">
          Your Tax Identification Number from the Nigerian tax authority
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onOpenNrsModal}
          className="flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Get Tax ID from NRS Portal
        </Button>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

// KYC Upload Form Component
function KYCUploadForm({ 
  onUpload, 
  onCancel, 
  uploading 
}: { 
  onUpload: (file: File) => void
  onCancel: () => void
  uploading: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Please upload a valid image (JPEG, PNG) or PDF file')
        return
      }
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please select a file to upload')
      return
    }
    onUpload(file)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="kycFile">Identity Document *</Label>
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            id="kycFile"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          {file ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                disabled={uploading}
              >
                Remove
              </Button>
            </div>
          ) : (
            <label htmlFor="kycFile" className="cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ID, Passport, or Driver's License (PDF, PNG, JPG - Max 10MB)
              </p>
            </label>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button type="submit" disabled={uploading || !file}>
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

