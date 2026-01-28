"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, MoreVertical, Pencil, Trash2, Paperclip, FileText, Tag, Eye, Receipt } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { Transaction } from "@/lib/types"
import { AddTransactionDialog } from "./add-transaction-dialog"
import { AddSMETransactionDialog } from "./add-sme-transaction-dialog"
import { ViewTransactionDialog } from "./view-transaction-dialog"
import { ImageViewerModal } from "@/components/ui/image-viewer-modal"
import { formatDate } from "@/lib/utils/date"
import { useTransactions } from "@/lib/hooks/useTransactions"
import { useAuth } from "@/lib/hooks/useAuth"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSidebar } from "@/lib/contexts/sidebar-context"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { isConsultant } from "@/lib/utils/businessTypeHelpers"


interface TransactionListProps {
  transactions: Transaction[]
  loading: boolean
  onUpdateTransaction: (id: string, data: Partial<Transaction>) => Promise<any>
  onDeleteTransaction: (id: string) => Promise<any>
  onRefresh?: () => void
}

export function TransactionList({
  transactions,
  loading,
  onUpdateTransaction,
  onDeleteTransaction,
  onRefresh
}: TransactionListProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [selectedTransactionTitle, setSelectedTransactionTitle] = useState('')
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [highlightedTransactionId, setHighlightedTransactionId] = useState<string | null>(null)
  const [vatBreakdownTransaction, setVatBreakdownTransaction] = useState<Transaction | null>(null)
  const [isVatDialogOpen, setIsVatDialogOpen] = useState(false)

  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { loading: subscriptionLoading, hasAccess } = useSubscription()
  const { sidebarCollapsed } = useSidebar()
  const { createTransaction } = useTransactions(user?.uid || null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  // Check if a transaction is incomplete (missing important information)
  const isTransactionIncomplete = (transaction: Transaction): boolean => {
    // Check for missing required fields
    if (!transaction.description || !transaction.category || !transaction.amount) {
      return true
    }
    
    // For creators, check if transaction nature is missing
    if (profile?.businessType === 'creator' && !transaction.transactionNature) {
      return true
    }
    
    return false
  }

  // Listen for newly created transactions to highlight them
  useEffect(() => {
    const handleTransactionChanged = (event: CustomEvent) => {
      const { action, transactionId } = event.detail || {}

      // Only highlight newly created transactions
      if (action === 'created' && transactionId) {
        setHighlightedTransactionId(transactionId)

        // Remove highlight after 3 seconds
        setTimeout(() => {
          setHighlightedTransactionId(null)
        }, 3000)
      }
    }

    window.addEventListener('transactionChanged', handleTransactionChanged as EventListener)

    return () => {
      window.removeEventListener('transactionChanged', handleTransactionChanged as EventListener)
    }
  }, [])

  console.log("Transactions:", transactions)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Get category badge color based on category type (for creators)
  const getCategoryBadgeVariant = (category: string, type: Transaction['type']) => {
    if (type === 'income') {
      // Income categories - use primary colors
      const incomeCategories = [
        'Brand Sponsorship', 'Brand Deal', 'Ad Revenue', 'Affiliate Income',
        'Content Licensing', 'Merchandise Sales', 'Subscription Revenue',
        'Online Courses', 'Events & Speaking', 'Platform Payout'
      ]
      if (incomeCategories.some(cat => category.includes(cat) || cat.includes(category))) {
        return 'default' // Primary color
      }
    } else {
      // Expense categories - use secondary colors
      const expenseCategories = [
        'Equipment', 'Software & Subscriptions', 'Studio Rent', 'Co-working Space',
        'Editing Services', 'Marketing & Promotion', 'Travel for Content'
      ]
      if (expenseCategories.some(cat => category.includes(cat) || cat.includes(category))) {
        return 'secondary'
      }
    }
    return 'outline' // Default for custom categories
  }

  const handleView = (transaction: Transaction) => {
    // If transaction failed to save, open edit modal instead
    if ((transaction as any)._saveError) {
      handleEdit(transaction)
      return
    }
    setViewingTransaction(transaction)
    setIsViewDialogOpen(true)
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsViewDialogOpen(false) // Close view dialog if open
    setIsAddDialogOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  const handleVatBreakdownClick = (transaction: Transaction) => {
    setVatBreakdownTransaction(transaction)
    setIsVatDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete || isDeleting) return

    const deletedTransactionId = transactionToDelete
    console.log('Starting delete operation for:', deletedTransactionId)
    setIsDeleting(true)

    try {
      const result = await onDeleteTransaction(deletedTransactionId)
      console.log('Delete result:', result)

      if (result && result.success) {
        console.log('Delete successful')

        // Close dialog immediately
        setIsDeleteDialogOpen(false)

        // Clean up state and refresh
        setTimeout(() => {
          setTransactionToDelete(null)
          setIsDeleting(false)

          if (onRefresh) {
            onRefresh()
          }

          window.dispatchEvent(new CustomEvent('transactionChanged', {
            detail: {
              action: 'deleted',
              transactionId: deletedTransactionId
            }
          }))
        }, 100)
      } else {
        console.error('Delete operation failed:', result)
        setIsDeleting(false)
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      setIsDeleting(false)
    }
  }

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false)
    // Delay cleanup to allow dialog to close smoothly
    setTimeout(() => {
      setTransactionToDelete(null)
      setIsDeleting(false)
    }, 200)
  }

  const handleViewImages = (transaction: Transaction) => {
    if (transaction.attachments && transaction.attachments.length > 0) {
      setSelectedImages(transaction.attachments)
      setSelectedTransactionTitle(`${transaction.description} - Receipts`)
      setIsImageViewerOpen(true)
    }
  }

  const handleAddTransaction = () => {
    if (!hasAccess() && profile && profile.businessType !== 'consultant') {
      setShowSubscriptionModal(true)
      return
    }

    setEditingTransaction(null)
    setIsAddDialogOpen(true)
  }

  const handleSubmit = async (data: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
   console.log("Data from handleSubmit:", data)
    try {
      let result
      // If editing a failed transaction (has _tempId), treat it as a new transaction
      // Otherwise, if it has a real ID, update it
      if (editingTransaction && !(editingTransaction as any)._tempId && editingTransaction.id && !editingTransaction.id.startsWith('temp-')) {
        result = await onUpdateTransaction(editingTransaction.id, data)
        setEditingTransaction(null)
      } else {
        // New transaction or retrying failed transaction
        result = await createTransaction(data)
        console.log("Result from handleSubmit:", result)
        
        // If this was a retry of a failed transaction, rely on onRefresh to update the list
        setEditingTransaction(null)
      }

      if (result && result.success) {
        setIsAddDialogOpen(false)
        if (onRefresh) {
          onRefresh()
        }

        window.dispatchEvent(new CustomEvent('transactionChanged', {
          detail: {
            action: (editingTransaction && !(editingTransaction as any)._tempId) ? 'updated' : 'created',
            transactionId: result.data?.id
          }
        }))
      }

      return result // Return the result so add-transaction-dialog can read it
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      return { success: false, error: 'Failed to save transaction' }
    }
  }

  if (loading && transactions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4 mx-auto"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (transactions.length === 0) {
    return (
      <>
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium mb-2">No transactions found</p>
            <p className="text-sm mb-4">Start by adding your first transaction</p>
            <Button onClick={handleAddTransaction}>
              Add Transaction
            </Button>
          </div>
        </Card>

        {profile?.businessType === 'sme' ? (
          <AddSMETransactionDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSubmit={handleSubmit}
            transaction={editingTransaction}
          />
        ) : (
          <AddTransactionDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSubmit={handleSubmit}
            transaction={editingTransaction}
          />
        )}
        <SubscriptionRequiredModal
          open={showSubscriptionModal && (profile?.businessType !== 'consultant' || !profile)}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile?.businessType || 'freelancer'}
        />
      </>
    )
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-2">
        {transactions.map((transaction) => {
          const isHighlighted = highlightedTransactionId === transaction.id
          const isIncome = transaction.type === 'income'
          return (
            <div
              key={`${transaction.id}-${transaction.updatedAt || transaction.createdAt}`}
              onClick={() => handleView(transaction)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
                isHighlighted ? 'bg-primary/10 ring-2 ring-primary' : 
                (transaction as any)._saveError ? 'bg-destructive/5 ring-1 ring-destructive/30' : 
                'bg-card'
              }`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isIncome ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                {isIncome ? (
                  <ArrowUpRight className="w-5 h-5 text-primary" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-destructive" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{transaction.description}</p>
                      {(transaction as any)._isSaving && (
                        <Badge variant="outline" className="text-xs animate-pulse">
                          Saving...
                        </Badge>
                      )}
                      {(transaction as any)._saveError && (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <p className="text-xs text-muted-foreground">
                        Created: {transaction.createdAt ? formatDate(transaction.createdAt) : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Transaction: {formatDate(transaction.transactionDate || transaction.valueDate || transaction.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 -mr-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-40"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleView(transaction)
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(transaction)
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(transaction.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <p className={`text-sm font-semibold ${isIncome ? 'text-primary' : 'text-foreground'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.ngnEquivalent !== undefined && transaction.ngnEquivalent !== null ? transaction.ngnEquivalent : transaction.amount))}
                    </p>
                    <span className="text-xs text-green-500">
                      Successful
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block overflow-hidden border-0 shadow-none md:border md:shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className={`w-full ${!sidebarCollapsed ? (profile?.businessType === 'creator' ? 'min-w-[1500px]' : 'min-w-[1300px]') : (profile?.businessType === 'creator' ? 'min-w-[1400px]' : 'min-w-[1200px]')}`}>
            <thead className="bg-muted/50 border-b-0 md:border-b border-border">
            <tr>
              <th className="text-left py-1.5 md:py-2 px-2 md:px-3 text-[10px] md:text-xs font-medium text-muted-foreground w-[50px] md:w-[120px]">Date Created</th>
              <th className="text-left py-1.5 md:py-2 px-2 md:px-3 text-[10px] md:text-xs font-medium text-muted-foreground w-[50px] md:w-[120px]">Transaction Date</th>
              <th className="text-left py-1.5 md:py-2 px-1 md:px-2 text-[10px] md:text-xs font-medium text-muted-foreground w-[20px] md:w-[130px]">Description</th>
              <th className="text-left py-1.5 md:py-2 px-1 md:px-2 text-[10px] md:text-xs font-medium text-muted-foreground w-[20px] md:w-[120px]">Category</th>
              <th className="text-left py-1.5 md:py-2 px-2 md:px-3 text-[10px] md:text-xs font-medium text-muted-foreground w-[50px] md:w-[120px]">Payment Method</th>
              <th className="text-left py-1.5 md:py-2 px-2 md:px-3 text-[10px] md:text-xs font-medium text-muted-foreground w-[50px] md:w-[120px]">Amount</th>
              <th className="text-center py-1.5 md:py-2 px-1.5 md:px-2 text-[10px] md:text-xs font-medium text-muted-foreground w-[50px] md:w-[140px]">
                {profile?.businessType === 'creator' ? 'Type' : 'Status'}
              </th>
              {profile?.businessType === 'creator' && (
                <th className="text-center py-1.5 md:py-2 px-1.5 md:px-2 text-[10px] md:text-xs font-medium text-muted-foreground w-[100px] md:w-[120px]">
                  Status
                </th>
              )}
              <th className="text-right py-1.5 md:py-2 px-2 md:px-3 text-[10px] md:text-xs font-medium text-muted-foreground w-[70px] md:w-[80px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => {
              const isHighlighted = highlightedTransactionId === transaction.id
              return (
                <tr
                  key={`${transaction.id}-${transaction.updatedAt || transaction.createdAt}`}
                  className={`border-b-0 md:border-b border-border last:border-0 hover:bg-muted/30 transition-all duration-500 ${isHighlighted
                      ? 'bg-primary/15 md:border-l-4 border-primary md:shadow-lg'
                      : ''
                    }`}
                  style={isHighlighted ? {
                    animation: 'highlightFade 3s ease-out forwards'
                  } : undefined}
                >
                  <td className="py-1.5 md:py-2 px-2 md:px-3 text-[10px] md:text-xs align-middle">
                    {transaction.createdAt ? formatDate(transaction.createdAt) : '-'}
                  </td>
                  <td className="py-1.5 md:py-2 px-2 md:px-3 text-[10px] md:text-xs align-middle">
                    {formatDate(transaction.transactionDate || transaction.valueDate || transaction.date)}
                  </td>
                  <td className="py-1.5 md:py-2 px-1 md:px-2 align-middle max-w-[100px] md:max-w-[150px] lg:max-w-[200px]">
                    <div className="flex items-center gap-1 md:gap-2 min-w-0 w-full">
                      <span className="text-[10px] md:text-xs font-medium truncate w-full">{transaction.description}</span>
                      {(transaction as any)._isSaving && (
                        <Badge variant="outline" className="text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 animate-pulse flex-shrink-0">
                          Saving...
                        </Badge>
                      )}
                      {(transaction as any)._saveError && (
                        <Badge variant="destructive" className="text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 flex-shrink-0">
                          Error
                        </Badge>
                      )}
                      {transaction.attachments && transaction.attachments.length > 0 && (
                        <button
                          onClick={() => handleViewImages(transaction)}
                          className="hover:bg-muted rounded p-0.5 md:p-1 transition-colors cursor-pointer flex-shrink-0"
                          title={`View ${transaction.attachments.length} receipt(s)`}
                        >
                          <Paperclip className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground hover:text-primary" />
                        </button>
                      )}
                      {isTransactionIncomplete(transaction) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 flex-shrink-0">
                                Incomplete
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">This transaction is missing some information. Click to edit and complete it.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 md:py-2 px-1 md:px-2">
                    <div className="flex flex-col gap-1">
                      <Badge 
                        variant={getCategoryBadgeVariant(transaction.category, transaction.type)} 
                        className="text-[10px] md:text-xs px-2 md:px-2.5 py-0.5 md:py-1 w-fit font-medium"
                      >
                        {transaction.category}
                      </Badge>
                      {transaction.tags && transaction.tags.length > 0 && (() => {
                        // Filter out tags that conflict with transaction nature/status
                        const excludedTags = ['personal', 'business', 'mixed', 'deductible', 'non-deductible', 'tax deductible']
                        const filteredTags = transaction.tags.filter(tag => 
                          !excludedTags.some(excluded => tag.toLowerCase() === excluded.toLowerCase())
                        )
                        return filteredTags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Tag className="w-3 h-3 text-muted-foreground" />
                            {filteredTags.slice(0, 2).map((tag, idx) => (
                              <span key={idx} className="text-[10px] text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                            {filteredTags.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{filteredTags.length - 2}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                      {transaction.linkedInvoiceId && (
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-primary" />
                          <span className="text-[10px] text-primary">Linked to invoice</span>
                        </div>
                      )}
                      {/* Phase 2: Platform info for creators */}
                      {profile?.businessType === 'creator' && transaction.type === 'income' && transaction.platform && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            {transaction.platform.name}
                            {transaction.platform.accountId && ` (${transaction.platform.accountId})`}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 md:py-2 px-2 md:px-3 text-[10px] md:text-xs text-muted-foreground align-middle">{transaction.paymentMethod}</td>
                  <td className="py-1.5 md:py-2 px-2 md:px-3 text-left align-top">
                    <div className="flex flex-col items-start gap-1.5">
                      <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-start gap-0.5 cursor-help">
                              <span
                                className={`text-[10px] md:text-xs font-semibold whitespace-nowrap ${transaction.type === "income" ? "text-primary" : "text-destructive"}`}
                              >
                                {transaction.type === "income" ? "+" : "-"}
                                {/* Phase 2: Show netAmount if available for creators, otherwise show regular amount */}
                                {(() => {
                                  // Use ngnEquivalent if available, otherwise use amount
                                  const baseAmount = transaction.ngnEquivalent !== undefined && transaction.ngnEquivalent !== null 
                                    ? transaction.ngnEquivalent 
                                    : transaction.amount
                                  // For creators, show netAmount if available, otherwise use baseAmount
                                  if (profile?.businessType === 'creator' && transaction.type === 'income' && transaction.netAmount !== undefined) {
                                    // If netAmount is based on foreign currency, we need to convert it
                                    // For now, use netAmount directly (assuming it's already in the correct currency)
                                    return formatCurrency(transaction.netAmount)
                                  }
                                  return formatCurrency(baseAmount)
                                })()}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <div className="space-y-1.5 text-xs">
                              <div className="font-semibold mb-2">Amount Breakdown</div>
                              {(() => {
                                const originalAmount = transaction.amount
                                let currentAmount = originalAmount
                                const breakdown: string[] = []
                                
                                // Original amount
                                breakdown.push(`Original: ${formatCurrency(originalAmount)}`)
                                
                                // Platform fees (for creators)
                                if (profile?.businessType === 'creator' && transaction.type === 'income' && transaction.grossAmount && transaction.platformFees) {
                                  breakdown.push(`Gross: ${formatCurrency(transaction.grossAmount)}`)
                                  breakdown.push(`Platform Fees: -${formatCurrency(transaction.platformFees)}`)
                                  currentAmount = transaction.netAmount !== undefined ? transaction.netAmount : (transaction.grossAmount - transaction.platformFees)
                                  breakdown.push(`After Fees: ${formatCurrency(currentAmount)}`)
                                }
                                
                                // VAT deduction (for income)
                                if (transaction.type === 'income' && transaction.taxClassification?.vatApplicable && transaction.taxClassification?.vatRate) {
                                  const vatAmount = currentAmount * (transaction.taxClassification.vatRate / 100)
                                  const afterVat = currentAmount * (1 - transaction.taxClassification.vatRate / 100)
                                  breakdown.push(`VAT ${transaction.taxClassification.vatRate}%: -${formatCurrency(vatAmount)}`)
                                  currentAmount = afterVat
                                  breakdown.push(`After VAT: ${formatCurrency(afterVat)}`)
                                }
                                
                                // WHT Credit (for expenses)
                                if (transaction.type === 'expense' && transaction.taxClassification?.whtCreditable) {
                                  const whtAmount = transaction.taxClassification.whtAmount !== undefined
                                    ? transaction.taxClassification.whtAmount
                                    : transaction.taxClassification.whtRate
                                      ? currentAmount * (transaction.taxClassification.whtRate / 100)
                                      : 0
                                  if (whtAmount > 0) {
                                    breakdown.push(`WHT Credit ${transaction.taxClassification.whtRate ? `${transaction.taxClassification.whtRate}%` : ''}: +${formatCurrency(whtAmount)}`)
                                    breakdown.push(`(Tax credit available to reduce tax liability)`)
                                  }
                                }
                                
                                // Capital Allowance (for expenses)
                                if (transaction.type === 'expense' && transaction.taxClassification?.isCapitalAsset && transaction.taxClassification?.capitalAllowanceRate) {
                                  const annual = transaction.taxClassification.capitalAllowanceRate || 0
                                  const initial =
                                    transaction.taxClassification.initialAllowanceRate ??
                                    Math.min(50, Math.max(0, annual * 2))
                                  breakdown.push(`Capital Allowance: Initial ${initial}% (first year), Annual ${annual}% (reducing balance)`)
                                  breakdown.push(`(Claimed during Self-Assessment filing; year-based amount, not a fixed % of this transaction)`)
                                }
                                
                                // Business percentage (for mixed transactions - both income and expense)
                                if (transaction.transactionNature === 'mixed' && transaction.businessPercentage !== undefined) {
                                  const businessAmount = currentAmount * (transaction.businessPercentage / 100)
                                  breakdown.push(`Business ${transaction.businessPercentage}%: ${formatCurrency(businessAmount)}`)
                                  breakdown.push(`Personal ${100 - transaction.businessPercentage}%: ${formatCurrency(currentAmount - businessAmount)} (excluded)`)
                                  currentAmount = businessAmount
                                } else if (transaction.transactionNature === 'personal') {
                                  breakdown.push(`Personal transaction: ${formatCurrency(currentAmount)} (excluded)`)
                                  currentAmount = 0
                                }
                                
                                // Final taxable amount
                                breakdown.push(`Final Taxable: ${formatCurrency(currentAmount)}`)
                                
                                return breakdown.map((line, idx) => (
                                  <div key={idx} className={line.startsWith('Final') ? 'font-semibold pt-1 border-t' : ''}>
                                    {line}
                                  </div>
                                ))
                              })()}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                       {/* VAT Indicator */}
                       {transaction.taxClassification?.vatApplicable && transaction.taxClassification?.vatRate && (
                        <button
                          onClick={() => handleVatBreakdownClick(transaction)}
                          className="hover:bg-muted rounded p-1 transition-colors cursor-pointer flex-shrink-0"
                          title="View VAT breakdown"
                        >
                          <Receipt className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-600 dark:text-amber-400" />
                        </button>
                      )}
                      </div>
                      <div className="flex flex-col items-start gap-0.5">
                        {/* VAT Calculation Display for Income Transactions */}
                        {transaction.type === 'income' && transaction.taxClassification?.vatApplicable && transaction.taxClassification?.vatRate && (
                          <div className="text-[9px] text-amber-700 dark:text-amber-300 space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span>VAT {transaction.taxClassification.vatRate}%:</span>
                              <span className="font-medium">
                                -{formatCurrency(transaction.amount * (transaction.taxClassification.vatRate / 100))}
                              </span>
                            </div>
                            <div className="text-muted-foreground font-bold text-[10px]">
                              Taxable: {formatCurrency(transaction.amount * (1 - transaction.taxClassification.vatRate / 100))}
                            </div>
                          </div>
                        )}
                        {/* WHT Credit Display for Expense Transactions */}
                        {transaction.type === 'expense' && transaction.taxClassification?.whtCreditable && (
                          <div className="text-[9px] text-green-700 dark:text-green-300 space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span>WHT Credit {transaction.taxClassification.whtRate ? `${transaction.taxClassification.whtRate}%` : ''}:</span>
                              <span className="font-medium">
                                +{formatCurrency(
                                  transaction.taxClassification.whtAmount !== undefined
                                    ? transaction.taxClassification.whtAmount
                                    : transaction.taxClassification.whtRate
                                      ? transaction.amount * (transaction.taxClassification.whtRate / 100)
                                      : 0
                                )}
                              </span>
                            </div>
                            <div className="text-muted-foreground font-bold text-[10px]">
                              Tax Credit Available
                            </div>
                          </div>
                        )}
                        {/* Capital Allowance Display for Expense Transactions */}
                        {transaction.type === 'expense' && transaction.taxClassification?.isCapitalAsset && transaction.taxClassification?.capitalAllowanceRate && (
                          <div className="text-[9px] text-blue-700 dark:text-blue-300 space-y-0.5">
                            <div className="flex items-center gap-1">
                              {(() => {
                                const annual = transaction.taxClassification!.capitalAllowanceRate || 0
                                const initial =
                                  transaction.taxClassification!.initialAllowanceRate ??
                                  Math.min(50, Math.max(0, annual * 2))
                                return <span>Capital Allowance: Initial {initial}%, Annual {annual}%</span>
                              })()}
                            </div>
                            <div className="text-muted-foreground font-bold text-[10px]">
                              Claimed in Self-Assessment
                            </div>
                          </div>
                        )}
                        {/* Phase 2: Show platform fees breakdown for creators */}
                        {profile?.businessType === 'creator' && transaction.type === 'income' && transaction.grossAmount && transaction.platformFees && (
                          <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground font-bold">
                            <span>Gross: {formatCurrency(transaction.grossAmount)}</span>
                            <span>Fees: -{formatCurrency(transaction.platformFees)}</span>
                          </div>
                        )}
                      
                      </div>
                    </div>
                  </td>
                  <td className="py-1.5 md:py-2 px-1.5 md:px-2 text-center">
                    <div className="flex items-center justify-center">
                      {profile?.businessType === 'creator' ? (
                        // For creators: Show transaction nature (Business/Personal/Mixed)
                        transaction.transactionNature ? (
                          <Badge 
                            variant={transaction.transactionNature === 'business' ? 'default' : transaction.transactionNature === 'personal' ? 'secondary' : 'outline'} 
                            className="text-[10px] md:text-xs px-2 md:px-2.5 py-0.5 md:py-1"
                          >
                            {transaction.transactionNature === 'business' ? 'Business' : transaction.transactionNature === 'personal' ? 'Personal' : transaction.transactionNature === 'mixed' && transaction.businessPercentage !== undefined ? `Mixed (${transaction.businessPercentage}%)` : 'Mixed'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] md:text-xs px-2 md:px-2.5 py-0.5 md:py-1">
                            Business
                          </Badge>
                        )
                      ) : (
                        // For freelancers: Show tax deductible status
                        <Badge 
                          variant={transaction.taxDeductible ? 'default' : 'secondary'} 
                          className="text-[10px] md:text-xs px-2 md:px-2.5 py-0.5 md:py-1"
                        >
                          {transaction.taxDeductible ? 'Tax Deductible' : 'Non-deductible'}
                        </Badge>
                      )}
                    </div>
                  </td>
                  {profile?.businessType === 'creator' && (
                    <td className="py-1.5 md:py-2 px-1.5 md:px-2 text-center">
                      <div className="flex items-center justify-center">
                        {(() => {
                          // Determine if transaction is tax deductible
                          // Business transactions (income or expense) are tax deductible
                          // Personal transactions are non-deductible
                          // Mixed transactions are tax deductible (have business component)
                          const isTaxDeductible = transaction.transactionNature === 'business' || 
                                                  transaction.transactionNature === 'mixed' ||
                                                  (!transaction.transactionNature && transaction.type === 'income') // Default income is tax deductible
                          
                          return (
                            <Badge 
                              variant={isTaxDeductible ? 'default' : 'secondary'} 
                              className="text-[10px] md:text-xs px-2 md:px-2.5 py-0.5 md:py-1"
                            >
                              {isTaxDeductible ? 'Tax Deductible' : 'Non-deductible'}
                            </Badge>
                          )
                        })()}
                      </div>
                    </td>
                  )}
                  <td className="py-1.5 md:py-2 px-2 md:px-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8">
                          <MoreVertical className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="group cursor-pointer" onClick={() => handleView(transaction)}>
                          <Eye className="w-4 h-4 mr-2 text-foreground group-hover:text-foreground dark:group-hover:text-gray-100" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem className="group cursor-pointer" onClick={() => handleEdit(transaction)}>
                          <Pencil className="w-4 h-4 mr-2 text-foreground group-hover:text-foreground dark:group-hover:text-gray-100" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive group cursor-pointer"
                          onClick={() => handleDeleteClick(transaction.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2 text-destructive group-hover:text-destructive dark:group-hover:text-red-400" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </Card>

      {/* View Transaction Dialog */}
      <ViewTransactionDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        transaction={viewingTransaction}
        onEdit={() => {
          if (viewingTransaction) {
            setEditingTransaction(viewingTransaction)
            setIsViewDialogOpen(false)
            setIsAddDialogOpen(true)
          }
        }}
      />

      {/* Add Transaction Dialog */}
      {profile?.businessType === 'sme' ? (
        <AddSMETransactionDialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (!open) {
              setEditingTransaction(null)
            }
          }}
          onSubmit={handleSubmit}
          transaction={editingTransaction || null}
        />
      ) : (
        <AddTransactionDialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open)
            if (!open) {
              setEditingTransaction(null)
            }
          }}
          onSubmit={handleSubmit}
          transaction={editingTransaction || null}
        />
      )}

      {/* Image Viewer Modal */}
      <ImageViewerModal
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
        images={selectedImages}
        title={selectedTransactionTitle}
      />

      {/* VAT Breakdown Dialog */}
      <Dialog open={isVatDialogOpen} onOpenChange={setIsVatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>VAT Breakdown</DialogTitle>
            <DialogDescription>
              VAT details for this transaction
            </DialogDescription>
          </DialogHeader>
          {vatBreakdownTransaction && vatBreakdownTransaction.taxClassification?.vatApplicable && vatBreakdownTransaction.taxClassification?.vatRate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Transaction Amount:</span>
                  <span className="text-sm font-medium">{formatCurrency(vatBreakdownTransaction.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">VAT Rate:</span>
                  <span className="text-sm font-medium">{vatBreakdownTransaction.taxClassification.vatRate}%</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">VAT Amount (to remit):</span>
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(vatBreakdownTransaction.amount * (vatBreakdownTransaction.taxClassification.vatRate / 100))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-muted-foreground">Taxable Income (after VAT):</span>
                    <span className="text-sm font-semibold text-primary">
                      {formatCurrency(vatBreakdownTransaction.amount * (1 - vatBreakdownTransaction.taxClassification.vatRate / 100))}
                    </span>
                  </div>
                </div>
                {vatBreakdownTransaction.type === 'income' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md mt-4">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>Note:</strong> For income with VAT, {vatBreakdownTransaction.taxClassification.vatRate}% of the transaction amount ({formatCurrency(vatBreakdownTransaction.amount * (vatBreakdownTransaction.taxClassification.vatRate / 100))}) must be remitted to the government. This VAT amount is excluded from your taxable income to avoid double payment.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteDialogOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
      />
      <SubscriptionRequiredModal
        open={showSubscriptionModal && (!isConsultant(profile?.businessType) || !profile)}
        onOpenChange={setShowSubscriptionModal}
        businessType={profile?.businessType || 'freelancer'}
      />
    </>
  )
}