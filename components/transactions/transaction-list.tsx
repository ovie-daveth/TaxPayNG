"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, MoreVertical, Pencil, Trash2, Paperclip } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { Transaction } from "@/lib/types"
import { AddTransactionDialog } from "./add-transaction-dialog"
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

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
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
        <table className={`w-full min-w-[900px]  ${!sidebarCollapsed ? 'lg:min-w-[1050px] md:min-w-[700px]' : 'lg:min-w-[800px] md:min-w-[580px]'}`}>
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left py-3 md:py-4 lg:py-4 px-4 md:px-5 lg:px-6 text-xs md:text-sm lg:text-sm font-medium text-muted-foreground w-[140px] md:w-[160px]">Date</th>
              <th className="text-left py-3 md:py-4 lg:py-4 px-4 md:px-5 lg:px-6 text-xs md:text-sm lg:text-sm font-medium text-muted-foreground min-w-[180px] md:min-w-[200px] lg:min-w-[220px]">Description</th>
              <th className="text-left py-3 md:py-4 lg:py-4 px-4 md:px-5 lg:px-6 text-xs md:text-sm lg:text-sm font-medium text-muted-foreground w-[140px] md:w-[160px]">Category</th>
              <th className="text-left py-3 md:py-4 lg:py-4 px-4 md:px-5 lg:px-6 text-xs md:text-sm lg:text-sm font-medium text-muted-foreground hidden lg:table-cell w-[160px]">Payment Method</th>
              <th className="text-right py-3 md:py-4 lg:py-4 px-4 md:px-5 lg:px-6 text-xs md:text-sm lg:text-sm font-medium text-muted-foreground w-[140px] md:w-[160px]">Amount</th>
              <th className="text-center py-3 md:py-4 lg:py-4 px-3 md:px-4 lg:px-5 text-xs md:text-sm lg:text-sm font-medium text-muted-foreground hidden lg:table-cell w-[180px] md:w-[200px]">Status</th>
              <th className="text-right py-3 md:py-4 lg:py-4 px-4 md:px-5 lg:px-6 text-xs md:text-sm lg:text-sm font-medium text-muted-foreground w-[100px]">Actions</th>
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
                  <td className="py-3 md:py-4 lg:py-4 px-4 md:px-5 lg:px-6 text-xs md:text-sm lg:text-sm align-top">{formatDate(transaction.date)}</td>
                  <td className="py-3 md:py-4 lg:py-4 px-4 md:px-5 lg:px-6 align-top">
                    <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
                      <span className="text-xs md:text-sm lg:text-sm font-medium truncate">{transaction.description}</span>
                      {transaction.attachments && transaction.attachments.length > 0 && (
                        <button
                          onClick={() => handleViewImages(transaction)}
                          className="hover:bg-muted rounded p-1 md:p-1.5 transition-colors cursor-pointer flex-shrink-0"
                          title={`View ${transaction.attachments.length} receipt(s)`}
                        >
                          <Paperclip className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground hover:text-primary" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3 md:py-4 lg:py-4 px-4 md:px-5 lg:px-6 align-top">
                    <Badge variant="secondary" className="text-xs md:text-sm">
                      {transaction.category}
                    </Badge>
                  </td>
                  <td className="py-3 md:py-4 lg:py-4 px-4 md:px-5 lg:px-6 text-xs md:text-sm lg:text-sm text-muted-foreground hidden lg:table-cell align-top">{transaction.paymentMethod}</td>
                  <td className="py-3 md:py-4 lg:py-4 px-4 md:px-5 lg:px-6 text-right align-top">
                    <span
                      className={`text-xs md:text-sm lg:text-sm font-semibold whitespace-nowrap ${transaction.type === "income" ? "text-primary" : "text-destructive"}`}
                    >
                      {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="py-3 md:py-4 lg:py-4 px-3 md:px-4 lg:px-5 text-center hidden lg:table-cell align-top">
                    {transaction.taxDeductible ? (
                      <Badge variant="outline" className="text-xs md:text-sm">
                        Deductible
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs md:text-sm">
                        Non-deductible
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 md:py-4 lg:py-4 px-4 md:px-5 lg:px-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8">
                          <MoreVertical className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit(transaction)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive cursor-pointer"
                          onClick={() => handleDeleteClick(transaction.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
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
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(transaction.date)}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit(transaction)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive cursor-pointer"
                      onClick={() => handleDeleteClick(transaction.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {transaction.category}
                  </Badge>
                  {transaction.taxDeductible && (
                    <Badge variant="outline" className="text-xs">
                      Tax Deductible
                    </Badge>
                  )}
                </div>
                <span className={`font-semibold ${transaction.type === "income" ? "text-primary" : "text-destructive"}`}>
                  {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
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