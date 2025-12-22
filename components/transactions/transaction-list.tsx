"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, MoreVertical, Pencil, Trash2, Paperclip, FileText, Tag, Eye } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { Transaction } from "@/lib/types"
import { AddTransactionDialog } from "./add-transaction-dialog"
import { ViewTransactionDialog } from "./view-transaction-dialog"
import { ImageViewerModal } from "@/components/ui/image-viewer-modal"
import { formatDate } from "@/lib/utils/date"
import { useTransactions } from "@/lib/hooks/useTransactions"
import { useAuth } from "@/lib/hooks/useAuth"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSidebar } from "@/lib/contexts/sidebar-context"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { toast } from "sonner"


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

  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { isSubscribed, loading: subscriptionLoading } = useSubscription()
  const { sidebarCollapsed } = useSidebar()
  const { createTransaction } = useTransactions(user?.uid || null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

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

  const handleSubmit = async (data: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
   console.log("Data from handleSubmit:", data)
    try {
      let result
      if (editingTransaction) {
        result = await onUpdateTransaction(editingTransaction.id, data)
        setEditingTransaction(null)
      } else {
        result = await createTransaction(data)
        console.log("Result from handleSubmit:", result)
      }

      if (result && result.success) {
        setIsAddDialogOpen(false)
        if (onRefresh) {
          onRefresh()
        }

        window.dispatchEvent(new CustomEvent('transactionChanged', {
          detail: {
            action: editingTransaction ? 'updated' : 'created',
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
            <Button onClick={() => {
              setEditingTransaction(null)
              setIsAddDialogOpen(true)
            }}>
              Add Transaction
            </Button>
          </div>
        </Card>

        <AddTransactionDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSubmit={handleSubmit}
          transaction={editingTransaction}
        />
        <SubscriptionRequiredModal
          open={showSubscriptionModal && (profile?.businessType !== 'agent' || !profile)}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile?.businessType || 'freelancer'}
        />
      </>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto w-full">
        <table className={`w-full ${!sidebarCollapsed ? (profile?.businessType === 'creator' ? 'min-w-[1400px]' : 'min-w-[1200px]') : (profile?.businessType === 'creator' ? 'min-w-[1300px]' : 'min-w-[1100px]')}`}>
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left py-2 md:py-3 px-3 md:px-4 text-[10px] md:text-xs font-medium text-muted-foreground w-[120px] md:w-[140px]">Date</th>
              <th className="text-left py-2 md:py-3 px-2 md:px-3 text-[10px] md:text-xs font-medium text-muted-foreground w-[120px] md:w-[150px]">Description</th>
              <th className="text-left py-2 md:py-3 px-2 md:px-3 text-[10px] md:text-xs font-medium text-muted-foreground w-[120px] md:w-[140px]">Category</th>
              <th className="text-left py-2 md:py-3 px-3 md:px-4 text-[10px] md:text-xs font-medium text-muted-foreground hidden xl:table-cell w-[120px]">Payment Method</th>
              <th className="text-right py-2 md:py-3 px-3 md:px-4 text-[10px] md:text-xs font-medium text-muted-foreground w-[120px] md:w-[140px]">Amount</th>
              <th className="text-center py-2 md:py-3 px-2 md:px-3 text-[10px] md:text-xs font-medium text-muted-foreground hidden lg:table-cell w-[140px] md:w-[160px]">
                {profile?.businessType === 'creator' ? 'Type' : 'Status'}
              </th>
              {profile?.businessType === 'creator' && (
                <th className="text-center py-2 md:py-3 px-2 md:px-3 text-[10px] md:text-xs font-medium text-muted-foreground hidden lg:table-cell w-[120px] md:w-[140px]">
                  Status
                </th>
              )}
              <th className="text-right py-2 md:py-3 px-3 md:px-4 text-[10px] md:text-xs font-medium text-muted-foreground w-[80px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => {
              const isHighlighted = highlightedTransactionId === transaction.id
              return (
                <tr
                  key={`${transaction.id}-${transaction.updatedAt || transaction.createdAt}`}
                  className={`border-b border-border last:border-0 hover:bg-muted/30 transition-all duration-500 ${isHighlighted
                      ? 'bg-primary/15 border-l-4 border-primary shadow-lg'
                      : ''
                    }`}
                  style={isHighlighted ? {
                    animation: 'highlightFade 3s ease-out forwards'
                  } : undefined}
                >
                  <td className="py-2 md:py-3 px-3 md:px-4 text-[10px] md:text-xs align-top">
                    {formatDate(transaction.transactionDate || transaction.valueDate || transaction.date)}
                  </td>
                  <td className="py-2 md:py-3 px-2 md:px-3 align-top">
                    <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                      <span className="text-[10px] md:text-xs font-medium truncate">{transaction.description}</span>
                      {transaction.attachments && transaction.attachments.length > 0 && (
                        <button
                          onClick={() => handleViewImages(transaction)}
                          className="hover:bg-muted rounded p-0.5 md:p-1 transition-colors cursor-pointer flex-shrink-0"
                          title={`View ${transaction.attachments.length} receipt(s)`}
                        >
                          <Paperclip className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground hover:text-primary" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-2 md:py-3 px-2 md:px-3 align-top">
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
                  <td className="py-2 md:py-3 px-3 md:px-4 text-[10px] md:text-xs text-muted-foreground hidden xl:table-cell align-top">{transaction.paymentMethod}</td>
                  <td className="py-2 md:py-3 px-3 md:px-4 text-right align-top">
                    <div className="flex flex-col items-end gap-0.5">
                      <span
                        className={`text-[10px] md:text-xs font-semibold whitespace-nowrap ${transaction.type === "income" ? "text-primary" : "text-destructive"}`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {/* Phase 2: Show netAmount if available for creators, otherwise show regular amount */}
                        {profile?.businessType === 'creator' && transaction.type === 'income' && transaction.netAmount !== undefined
                          ? formatCurrency(transaction.netAmount)
                          : formatCurrency(transaction.amount)}
                      </span>
                      {/* Phase 2: Show platform fees breakdown for creators */}
                      {profile?.businessType === 'creator' && transaction.type === 'income' && transaction.grossAmount && transaction.platformFees && (
                        <span className="text-[9px] text-muted-foreground">
                          Gross: {formatCurrency(transaction.grossAmount)} | Fees: -{formatCurrency(transaction.platformFees)}
                        </span>
                      )}
                      {transaction.currency && transaction.currency !== 'NGN' && (
                        <span className="text-[9px] text-muted-foreground">
                          {transaction.currency} {transaction.ngnEquivalent ? `(≈₦${formatCurrency(transaction.ngnEquivalent).replace('₦', '')})` : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 md:py-3 px-2 md:px-3 text-center hidden lg:table-cell">
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
                    <td className="py-2 md:py-3 px-2 md:px-3 text-center hidden lg:table-cell">
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
                  <td className="py-2 md:py-3 px-3 md:px-4 text-right">
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

      {/* Mobile View */}
      <div className="md:hidden divide-y divide-border">
        {transactions.map((transaction) => {
          const isHighlighted = highlightedTransactionId === transaction.id
          return (
            <div
              key={`mobile-${transaction.id}-${transaction.updatedAt || transaction.createdAt}`}
              className={`p-4 transition-all duration-500 ${isHighlighted
                  ? 'bg-primary/15 border-l-4 border-primary shadow-lg'
                  : ''
                }`}
              style={isHighlighted ? {
                animation: 'highlightFade 3s ease-out'
              } : undefined}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${transaction.type === "income" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                      }`}
                  >
                    {transaction.type === "income" ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{transaction.description}</p>
                      {transaction.attachments && transaction.attachments.length > 0 && (
                        <button
                          onClick={() => handleViewImages(transaction)}
                          className="hover:bg-muted rounded p-1 transition-colors"
                          title={`View ${transaction.attachments.length} receipt(s)`}
                        >
                          <Paperclip className="w-3 h-3 text-muted-foreground hover:text-primary" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(transaction.transactionDate || transaction.valueDate || transaction.date)}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
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
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant={getCategoryBadgeVariant(transaction.category, transaction.type)} 
                      className="text-xs font-medium"
                    >
                      {transaction.category}
                    </Badge>
                    {profile?.businessType === 'creator' ? (
                      // For creators: Show transaction nature (Business/Personal/Mixed)
                      transaction.transactionNature ? (
                        <Badge 
                          variant={transaction.transactionNature === 'business' ? 'default' : transaction.transactionNature === 'personal' ? 'secondary' : 'outline'} 
                          className="text-xs"
                        >
                          {transaction.transactionNature === 'business' ? 'Business' : transaction.transactionNature === 'personal' ? 'Personal' : 'Mixed'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Business
                        </Badge>
                      )
                    ) : (
                      // For freelancers: Show tax deductible status
                      <Badge 
                        variant={transaction.taxDeductible ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {transaction.taxDeductible ? 'Tax Deductible' : 'Non-deductible'}
                      </Badge>
                    )}
                    {profile?.businessType === 'creator' && (
                      // For creators: Show tax deductible status
                      (() => {
                        const isTaxDeductible = transaction.transactionNature === 'business' || 
                                                transaction.transactionNature === 'mixed' ||
                                                (!transaction.transactionNature && transaction.type === 'income')
                        return (
                          <Badge 
                            variant={isTaxDeductible ? 'default' : 'secondary'} 
                            className="text-xs"
                          >
                            {isTaxDeductible ? 'Tax Deductible' : 'Non-deductible'}
                          </Badge>
                        )
                      })()
                    )}
                  </div>
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
                </div>
                <div className="flex flex-col items-end">
                  <span className={`font-semibold text-sm ${transaction.type === "income" ? "text-primary" : "text-destructive"}`}>
                    {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                  </span>
                  {transaction.currency && transaction.currency !== 'NGN' && (
                    <span className="text-[10px] text-muted-foreground">
                      {transaction.currency}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

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

      {/* Image Viewer Modal */}
      <ImageViewerModal
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
        images={selectedImages}
        title={selectedTransactionTitle}
      />

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
        open={showSubscriptionModal && (profile?.businessType !== 'agent' || !profile)}
        onOpenChange={setShowSubscriptionModal}
        businessType={profile?.businessType || 'freelancer'}
      />
    </Card>
  )
}