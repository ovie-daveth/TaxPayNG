"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Edit, Trash2, ExternalLink, CheckCircle2, Clock, X, Calendar, DollarSign, Mail, Phone, Building2, User, Loader2, Upload, FileText } from "lucide-react"
import { BrandDeal, BrandDealStatus, BrandDealType, Transaction } from "@/lib/types"
import { format } from "date-fns"
import { formatCurrencyAmount, CurrencyCode, fetchExchangeRate } from "@/lib/utils/currency"
import { brandDealService } from "@/lib/services"
import { toast } from "sonner"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { transactionService } from "@/lib/services"
import { useTransactions } from "@/lib/hooks/useTransactions"
import { useAuth } from "@/lib/hooks/useAuth"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { useState, useEffect } from "react"

interface ViewBrandDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brandDeal: BrandDeal | null
  onEdit?: () => void
  onDelete?: (dealId: string) => void
  onUpdate?: () => void
}

export function ViewBrandDealDialog({
  open,
  onOpenChange,
  brandDeal,
  onEdit,
  onDelete,
  onUpdate
}: ViewBrandDealDialogProps) {
  const { profile } = useUserProfile()
  const { user } = useAuth()
  const { createTransaction } = useTransactions(user?.uid || null)
  const [updatingMilestone, setUpdatingMilestone] = useState<number | null>(null)
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false)
  const [isMarkingCompleted, setIsMarkingCompleted] = useState(false)
  const [currentDeal, setCurrentDeal] = useState<BrandDeal | null>(brandDeal)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  // Update currentDeal when brandDeal prop changes
  useEffect(() => {
    setCurrentDeal(brandDeal)
  }, [brandDeal])

  if (!currentDeal) return null

  const getStatusBadge = (status: BrandDealStatus) => {
    const variants: Record<BrandDealStatus, { variant: "default" | "secondary" | "destructive" | "outline", icon: any, label: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      in_progress: { variant: "outline", icon: Clock, label: "In Progress" },
      completed: { variant: "default", icon: CheckCircle2, label: "Completed" },
      cancelled: { variant: "destructive", icon: X, label: "Cancelled" }
    }
    const config = variants[status]
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const getTypeLabel = (type: BrandDealType) => {
    const labels: Record<BrandDealType, string> = {
      sponsorship: "Sponsorship",
      collaboration: "Collaboration",
      endorsement: "Endorsement",
      affiliate: "Affiliate",
      other: "Other"
    }
    return labels[type]
  }

  const handleMarkAsCompleted = () => {
    // Open modal to collect payment details before completing
    setPaymentDate(currentDeal?.endDate?.split('T')[0] || new Date().toISOString().split('T')[0])
    setReceiptFile(null)
    setShowCompletionModal(true)
  }

  const handleConfirmCompletion = async () => {
    if (!profile?.userId || !user?.uid || !currentDeal) return
    setIsMarkingCompleted(true)
    
    try {
      // Upload receipt if provided
      let receiptUrl: string | undefined = undefined
      if (receiptFile) {
        setUploadingReceipt(true)
        try {
          const uploadResult = await uploadToImageKit(
            receiptFile,
            "brand-deals/receipts",
            profile.userId
          )
          receiptUrl = uploadResult.url
        } catch (uploadError) {
          console.error("Error uploading receipt:", uploadError)
          toast.error("Failed to upload receipt. Continuing without it.")
        } finally {
          setUploadingReceipt(false)
        }
      }
      
      // Mark as completed
      const result = await brandDealService.markAsCompleted(currentDeal.id, profile.userId)
      if (result.success && result.data) {
        const completedDeal = result.data
        setCurrentDeal(completedDeal)
        toast.success("Brand deal marked as completed")
        
        // Automatically create transaction
        const transactionCurrency = (completedDeal.currency || 'NGN') as CurrencyCode
        // Use brand deal date (endDate or startDate) as transaction date
        const transactionDate = completedDeal.endDate || completedDeal.startDate || new Date().toISOString()
        // Use payment date as valueDate
        const valueDate = paymentDate
        
        // Calculate financial breakdown
        const grossAmount = completedDeal.amount
        const executionExpenses = completedDeal.executionExpenses || 0
        const whtAmount = completedDeal.whtAmount || 0
        const cashReceived = grossAmount
        const taxableIncome = cashReceived - executionExpenses
        
        const transactionAmount = completedDeal.netIncome !== undefined 
          ? completedDeal.netIncome 
          : (taxableIncome > 0 ? taxableIncome : cashReceived)
        
        // Calculate NGN equivalent
        let ngnEquivalent: number | undefined = undefined
        let exchangeRate: number | undefined = undefined
        
        if (transactionCurrency !== 'NGN') {
          if (completedDeal.netIncomeNgnEquivalent !== undefined && completedDeal.netIncomeNgnEquivalent !== null) {
            ngnEquivalent = completedDeal.netIncomeNgnEquivalent
            exchangeRate = transactionAmount > 0 ? ngnEquivalent / transactionAmount : completedDeal.exchangeRate
          } else if (completedDeal.ngnEquivalent !== undefined && completedDeal.ngnEquivalent !== null) {
            const grossNgn = completedDeal.ngnEquivalent
            const expensesNgn = executionExpenses > 0 && completedDeal.exchangeRate
              ? executionExpenses * completedDeal.exchangeRate
              : executionExpenses
            ngnEquivalent = grossNgn - expensesNgn
            exchangeRate = completedDeal.exchangeRate
          } else {
            try {
              exchangeRate = await fetchExchangeRate(transactionCurrency, 'NGN')
              ngnEquivalent = transactionAmount * exchangeRate
            } catch (error) {
              console.error('Error fetching exchange rate:', error)
            }
          }
        } else {
          ngnEquivalent = transactionAmount
          exchangeRate = 1
        }
        
        const transactionData = {
          entityId: completedDeal.entityId,
          type: 'income' as const,
          description: `${completedDeal.title} - ${completedDeal.brandName}${executionExpenses > 0 ? ` (Net: ${formatCurrencyAmount(transactionAmount, transactionCurrency)} after expenses)` : ''}`,
          amount: transactionAmount,
          currency: transactionCurrency,
          exchangeRate: exchangeRate,
          exchangeRateDate: exchangeRate ? transactionDate.split('T')[0] : undefined,
          ngnEquivalent: ngnEquivalent,
          date: transactionDate, // Brand deal date
          valueDate: valueDate, // Payment date (when money moved)
          transactionDate: transactionDate, // When transaction occurred
          category: completedDeal.dealType === 'sponsorship' ? 'Brand Sponsorship' : 'Brand Deal',
          paymentMethod: '',
          receiptUrl: receiptUrl,
          notes: `Brand deal: ${completedDeal.title}${executionExpenses > 0 || completedDeal.whtAmount ? `\nGross: ${formatCurrencyAmount(grossAmount, transactionCurrency)}${executionExpenses > 0 ? `\nExpenses: ${formatCurrencyAmount(executionExpenses, transactionCurrency)}` : ''}${completedDeal.whtAmount && completedDeal.whtAmount > 0 ? `\nWHT (Tax Credit): ${formatCurrencyAmount(completedDeal.whtAmount, transactionCurrency)} (Rate: ${completedDeal.whtRate || 0}%)${completedDeal.whtCertificateNumber ? `, Cert: ${completedDeal.whtCertificateNumber}` : ''}` : ''}\nNet Income: ${formatCurrencyAmount(transactionAmount, transactionCurrency)}` : ''}`,
          tags: completedDeal.tags || [],
          taxDeductible: false
        }

        const txResult = await createTransaction(transactionData)
        if (txResult.success && 'data' in txResult && txResult.data) {
          const transaction = (txResult as { success: true; data: Transaction }).data
          // Link the transaction to the brand deal
          const updateResult = await brandDealService.updateBrandDeal(completedDeal.id, profile.userId, {
            linkedTransactionId: transaction.id,
            paymentDate: valueDate
          })
          if (updateResult.success && updateResult.data) {
            setCurrentDeal(updateResult.data)
          }
          
          // Dispatch event to notify other components
          const event = new CustomEvent('transactionChanged', {
            detail: { type: 'created', transactionId: transaction.id }
          })
          window.dispatchEvent(event)
          
          toast.success("Transaction created automatically")
        }
        
        setShowCompletionModal(false)
        onUpdate?.()
      } else {
        toast.error(result.error || "Failed to update brand deal")
      }
    } catch (error) {
      console.error("Error marking as completed:", error)
      toast.error("Failed to update brand deal")
    } finally {
      setIsMarkingCompleted(false)
      setUploadingReceipt(false)
    }
  }

  const handleMarkMilestonePaid = async (milestoneIndex: number) => {
    if (!profile?.userId || !currentDeal) {
      toast.error("User not authenticated")
      return
    }

    setUpdatingMilestone(milestoneIndex)
    try {
      const result = await brandDealService.markMilestonePaid(
        currentDeal.id,
        profile.userId,
        milestoneIndex
      )
      if (result.success && result.data) {
        const updatedDeal = result.data
        setCurrentDeal(updatedDeal) // Update local state immediately
        toast.success("Milestone marked as paid")
        
        // Check if all milestones are now paid
        if (updatedDeal.paymentSchedule?.milestones) {
          const allMilestonesPaid = updatedDeal.paymentSchedule.milestones.every(
            milestone => milestone.paid === true
          )
          
          // If all milestones are paid and deal is not already completed, mark as completed
          if (allMilestonesPaid && updatedDeal.status !== "completed" && updatedDeal.status !== "cancelled") {
            const completeResult = await brandDealService.markAsCompleted(
              currentDeal.id,
              profile.userId
            )
            if (completeResult.success && completeResult.data) {
              setCurrentDeal(completeResult.data) // Update local state with completed deal
              toast.success("All milestones completed! Brand deal marked as completed.")
            }
          }
        }
        
        onUpdate?.()
      } else {
        toast.error(result.error || "Failed to update milestone")
      }
    } catch (error) {
      console.error("Error marking milestone as paid:", error)
      toast.error("Failed to update milestone")
    } finally {
      setUpdatingMilestone(null)
    }
  }

  const handleCreateTransaction = async () => {
    if (!profile?.userId || !user?.uid || !currentDeal) {
      toast.error("User not authenticated")
      return
    }

    setIsCreatingTransaction(true)
    try {
      // Create an income transaction for this brand deal
      // Ensure we preserve the exact currency from the brand deal
      const transactionCurrency = (currentDeal.currency || 'NGN') as CurrencyCode
      const transactionDate = currentDeal.paymentDate || currentDeal.endDate || new Date().toISOString()
      
      // Calculate financial breakdown
      const grossAmount = currentDeal.amount
      const executionExpenses = currentDeal.executionExpenses || 0
      const whtAmount = currentDeal.whtAmount || 0
      const cashReceived = grossAmount - whtAmount
      // Taxable income = cash received - expenses (this is what you pay tax on)
      const taxableIncome = cashReceived - executionExpenses
      
      // Use taxable income for transaction amount (this is the actual income to the creator)
      // Fallback to stored netIncome for backward compatibility
      const transactionAmount = currentDeal.netIncome !== undefined 
        ? currentDeal.netIncome 
        : (taxableIncome > 0 ? taxableIncome : cashReceived)
      
      // Calculate NGN equivalent if currency is not NGN
      // Use the brand deal's stored conversion data if available, otherwise calculate it
      let ngnEquivalent: number | undefined = undefined
      let exchangeRate: number | undefined = undefined
      
      if (transactionCurrency !== 'NGN') {
        // First, try to use the brand deal's stored net income NGN equivalent
        if (currentDeal.netIncomeNgnEquivalent !== undefined && currentDeal.netIncomeNgnEquivalent !== null) {
          ngnEquivalent = currentDeal.netIncomeNgnEquivalent
          // Calculate exchange rate from net income and its NGN equivalent
          exchangeRate = transactionAmount > 0 ? ngnEquivalent / transactionAmount : currentDeal.exchangeRate
        } else if (currentDeal.ngnEquivalent !== undefined && currentDeal.ngnEquivalent !== null) {
          // Fallback to gross amount NGN equivalent, but adjust for net income
          const grossNgn = currentDeal.ngnEquivalent
          const expensesNgn = executionExpenses > 0 && currentDeal.exchangeRate
            ? executionExpenses * currentDeal.exchangeRate
            : executionExpenses
          ngnEquivalent = grossNgn - expensesNgn
          exchangeRate = currentDeal.exchangeRate
        } else {
          // If not available, calculate it now
          try {
            exchangeRate = await fetchExchangeRate(transactionCurrency, 'NGN')
            ngnEquivalent = transactionAmount * exchangeRate
          } catch (error) {
            console.error('Error fetching exchange rate:', error)
            // Continue without conversion if rate fetch fails
          }
        }
      } else {
        // If currency is NGN, ngnEquivalent is the same as net income
        ngnEquivalent = transactionAmount
        exchangeRate = 1 // NGN to NGN is 1:1
      }
      
      const transactionData = {
        entityId: currentDeal.entityId,
        type: 'income' as const,
        description: `${currentDeal.title} - ${currentDeal.brandName}${executionExpenses > 0 ? ` (Net: ${formatCurrencyAmount(transactionAmount, transactionCurrency)} after expenses)` : ''}`,
        amount: transactionAmount, // Use net income instead of gross amount
        currency: transactionCurrency,
        exchangeRate: exchangeRate,
        exchangeRateDate: exchangeRate ? transactionDate.split('T')[0] : undefined,
        ngnEquivalent: ngnEquivalent,
        date: transactionDate,
        category: currentDeal.dealType === 'sponsorship' ? 'Brand Sponsorship' : 'Brand Deal',
        paymentMethod: '',
        notes: `Brand deal: ${currentDeal.title}${executionExpenses > 0 || currentDeal.whtAmount ? `\nGross: ${formatCurrencyAmount(grossAmount, transactionCurrency)}${executionExpenses > 0 ? `\nExpenses: ${formatCurrencyAmount(executionExpenses, transactionCurrency)}` : ''}${currentDeal.whtAmount && currentDeal.whtAmount > 0 ? `\nWHT (Tax Credit): ${formatCurrencyAmount(currentDeal.whtAmount, transactionCurrency)} (Rate: ${currentDeal.whtRate || 0}%)${currentDeal.whtCertificateNumber ? `, Cert: ${currentDeal.whtCertificateNumber}` : ''}` : ''}\nNet Income: ${formatCurrencyAmount(transactionAmount, transactionCurrency)}` : ''}`,
        tags: currentDeal.tags || [],
        taxDeductible: false
      }
      
      console.log('Creating transaction from brand deal:', {
        dealCurrency: currentDeal.currency,
        dealAmount: currentDeal.amount,
        transactionCurrency: transactionData.currency,
        transactionAmount: transactionData.amount,
        exchangeRate: transactionData.exchangeRate,
        ngnEquivalent: transactionData.ngnEquivalent
      })

      const result = await createTransaction(transactionData)
      if (result.success && 'data' in result && result.data) {
        // TypeScript narrowing: if success is true and data exists, it's ApiResponse<Transaction>
        const transaction = (result as { success: true; data: Transaction }).data
        // Link the transaction to the brand deal
        const updateResult = await brandDealService.updateBrandDeal(currentDeal.id, profile.userId, {
          linkedTransactionId: transaction.id,
          paymentDate: new Date().toISOString()
        })
        if (updateResult.success && updateResult.data) {
          setCurrentDeal(updateResult.data) // Update local state
        }
        
        // Dispatch event to notify other components (like transaction list) to refresh
        const event = new CustomEvent('transactionChanged', {
          detail: {
            action: 'created',
            transactionId: transaction.id
          }
        })
        window.dispatchEvent(event)
        
        toast.success("Transaction created and linked to brand deal")
        onUpdate?.()
      } else {
        toast.error('error' in result ? result.error || "Failed to create transaction" : "Failed to create transaction")
      }
    } catch (error) {
      console.error("Error creating transaction:", error)
      toast.error("Failed to create transaction")
    } finally {
      setIsCreatingTransaction(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{currentDeal.brandName}</DialogTitle>
            {getStatusBadge(currentDeal.status)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Title</p>
                <p className="text-sm font-medium">{currentDeal.title}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Deal Type</p>
                <Badge variant="outline">{getTypeLabel(currentDeal.dealType)}</Badge>
              </div>
              {currentDeal.description && (
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{currentDeal.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Brand Contact */}
          {currentDeal.brandContact && Object.values(currentDeal.brandContact).some(v => v) && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Brand Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentDeal.brandContact.name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Contact Name</p>
                      <p className="text-sm font-medium">{currentDeal.brandContact.name}</p>
                    </div>
                  </div>
                )}
                {currentDeal.brandContact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a href={`mailto:${currentDeal.brandContact.email}`} className="text-sm font-medium text-primary hover:underline">
                        {currentDeal.brandContact.email}
                      </a>
                    </div>
                  </div>
                )}
                {currentDeal.brandContact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <a href={`tel:${currentDeal.brandContact.phone}`} className="text-sm font-medium text-primary hover:underline">
                        {currentDeal.brandContact.phone}
                      </a>
                    </div>
                  </div>
                )}
                {currentDeal.brandContact.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Company</p>
                      <p className="text-sm font-medium">{currentDeal.brandContact.company}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Financial Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Financial Details</h3>
            
            {/* Financial Breakdown: Gross → WHT → Cash Received → Expenses → Taxable Income */}
            <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Gross Amount</p>
                  <p className="text-xl font-bold">
                    {formatCurrencyAmount(currentDeal.amount, currentDeal.currency as any)}
                  </p>
                  {currentDeal.ngnEquivalent !== undefined && currentDeal.currency !== 'NGN' && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {formatCurrencyAmount(currentDeal.ngnEquivalent, 'NGN')}
                    </p>
                  )}
                </div>
                
                {currentDeal.whtDeducted && currentDeal.whtAmount && currentDeal.whtAmount > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">WHT (Tax Credit)</p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrencyAmount(currentDeal.whtAmount, currentDeal.currency as any)}
                    </p>
                    {currentDeal.whtRate && (
                      <p className="text-xs text-muted-foreground">Rate: {currentDeal.whtRate}%</p>
                    )}
                    {currentDeal.whtCertificateNumber && (
                      <p className="text-xs text-muted-foreground">Cert: {currentDeal.whtCertificateNumber}</p>
                    )}
                  </div>
                )}
                
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Cash Received</p>
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrencyAmount(
                      currentDeal.amount - (currentDeal.whtAmount || 0),
                      currentDeal.currency as any
                    )}
                  </p>
                  {currentDeal.whtAmount && (
                    <p className="text-xs text-muted-foreground">Gross − WHT</p>
                  )}
                </div>
                
                {currentDeal.executionExpenses && currentDeal.executionExpenses > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Total Expenses</p>
                    <p className="text-xl font-bold text-orange-600">
                      {formatCurrencyAmount(currentDeal.executionExpenses, (currentDeal.executionExpensesCurrency || currentDeal.currency) as any)}
                    </p>
                  </div>
                )}
                
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Taxable Income</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrencyAmount(
                      (() => {
                        const cashReceived = currentDeal.amount - (currentDeal.whtAmount || 0)
                        const expenses = currentDeal.executionExpenses || 0
                        const calculatedTaxableIncome = cashReceived - expenses
                        return currentDeal.netIncome !== undefined 
                          ? currentDeal.netIncome 
                          : (calculatedTaxableIncome > 0 ? calculatedTaxableIncome : cashReceived)
                      })(),
                      currentDeal.currency as any
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Cash Received − Expenses (this is what you pay tax on)</p>
                  {(currentDeal.netIncomeNgnEquivalent !== undefined || (currentDeal.netIncome !== undefined && currentDeal.ngnEquivalent)) && currentDeal.currency !== 'NGN' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ {formatCurrencyAmount(
                        currentDeal.netIncomeNgnEquivalent || (currentDeal.netIncome ? currentDeal.netIncome * (currentDeal.exchangeRate || 1) : 0),
                        'NGN'
                      )}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Execution Expenses Details */}
              {currentDeal.executionExpensesDetails && currentDeal.executionExpensesDetails.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                    View expense details ({currentDeal.executionExpensesDetails.length} items)
                  </summary>
                  <div className="mt-2 space-y-2">
                    {currentDeal.executionExpensesDetails.map((expense, idx) => (
                      <div key={idx} className="text-xs p-2 bg-background rounded border">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{expense.description}</p>
                            <div className="flex gap-2 text-muted-foreground mt-1">
                              {expense.category && (
                                <span>• {expense.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                              )}
                              {expense.date && <span>• {format(new Date(expense.date), "MMM dd, yyyy")}</span>}
                            </div>
                          </div>
                          <span className="font-semibold ml-2">
                            {formatCurrencyAmount(expense.amount, currentDeal.currency as any)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentDeal.paymentTerms && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Payment Terms</p>
                  <p className="text-sm">{currentDeal.paymentTerms}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Schedule */}
          {currentDeal.paymentSchedule && currentDeal.paymentSchedule.type !== "single" && currentDeal.paymentSchedule.milestones && currentDeal.paymentSchedule.milestones.length > 0 && (
            <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Payment Milestones</p>
                <div className="space-y-2">
                  {currentDeal.paymentSchedule.milestones.map((milestone, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{milestone.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {format(new Date(milestone.dueDate), "MMM dd, yyyy")}
                        </p>
                        {milestone.paid && milestone.paidDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Paid: {format(new Date(milestone.paidDate), "MMM dd, yyyy")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold">
                          {formatCurrencyAmount(milestone.amount, currentDeal.currency as any)}
                        </span>
                        {milestone.paid ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Paid
                          </Badge>
                        ) : (
                          <>
                            <Badge variant="secondary">Pending</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkMilestonePaid(index)}
                              disabled={updatingMilestone === index}
                              className="h-7 text-xs"
                            >
                              {updatingMilestone === index ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Mark Paid
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="text-sm font-medium">{format(new Date(currentDeal.startDate), "MMM dd, yyyy")}</p>
                </div>
              </div>
              {currentDeal.endDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p className="text-sm font-medium">{format(new Date(currentDeal.endDate), "MMM dd, yyyy")}</p>
                  </div>
                </div>
              )}
              {currentDeal.deliveryDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery Date</p>
                    <p className="text-sm font-medium">{format(new Date(currentDeal.deliveryDate), "MMM dd, yyyy")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Details */}
          {(currentDeal.deliverables && currentDeal.deliverables.length > 0) || 
           (currentDeal.platform && currentDeal.platform.length > 0) || 
           currentDeal.contentRequirements ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Content Details</h3>
              {currentDeal.deliverables && currentDeal.deliverables.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Deliverables</p>
                  <div className="flex flex-wrap gap-2">
                    {currentDeal.deliverables.map((item, index) => (
                      <Badge key={index} variant="secondary">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {currentDeal.platform && currentDeal.platform.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Platforms</p>
                  <div className="flex flex-wrap gap-2">
                    {currentDeal.platform.map((item, index) => (
                      <Badge key={index} variant="outline">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {currentDeal.contentRequirements && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Content Requirements</p>
                  <p className="text-sm whitespace-pre-wrap">{currentDeal.contentRequirements}</p>
                </div>
              )}
            </div>
          ) : null}

          {/* Contract */}
          {(currentDeal.contractUrl || currentDeal.contractSigned) && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Contract</h3>
              <div className="space-y-2">
                {currentDeal.contractUrl && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={currentDeal.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View Contract
                    </a>
                  </div>
                )}
                {currentDeal.contractSigned && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Contract Signed</p>
                      {currentDeal.contractSignedDate && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(currentDeal.contractSignedDate), "MMM dd, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags and Notes */}
          {(currentDeal.tags && currentDeal.tags.length > 0) || currentDeal.notes ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Additional Information</h3>
              {currentDeal.tags && currentDeal.tags.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {currentDeal.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {currentDeal.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{currentDeal.notes}</p>
                </div>
              )}
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            {currentDeal.status !== "completed" && currentDeal.status !== "cancelled" && (
              <Button
                variant="outline"
                onClick={handleMarkAsCompleted}
                disabled={isMarkingCompleted}
                className="flex-1"
              >
                {isMarkingCompleted ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark as Completed
                  </>
                )}
              </Button>
            )}
          
            {onEdit && currentDeal.status !== "completed" && currentDeal.status !== "cancelled" && (
              <Button
                variant="outline"
                onClick={onEdit}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this brand deal?")) {
                    onDelete(currentDeal.id)
                    onOpenChange(false)
                  }
                }}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Completion Modal */}
    <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Complete Brand Deal
          </DialogTitle>
          <DialogDescription>
            Add payment details to complete this brand deal and create the transaction automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="payment-date">Payment Date *</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              When did the money actually arrive in your account?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-file">Payment Receipt (Optional)</Label>
            <Input
              id="receipt-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setReceiptFile(file)
                }
              }}
            />
            {receiptFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>{receiptFile.name} ({(receiptFile.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Upload payment confirmation, bank statement, or receipt
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              setShowCompletionModal(false)
              setReceiptFile(null)
            }}
            disabled={isMarkingCompleted || uploadingReceipt}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmCompletion}
            disabled={isMarkingCompleted || uploadingReceipt || !paymentDate}
          >
            {(isMarkingCompleted || uploadingReceipt) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadingReceipt ? "Uploading..." : "Processing..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete & Create Transaction
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

