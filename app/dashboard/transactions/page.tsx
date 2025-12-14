"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useTransactions } from "@/lib/hooks/useTransactions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Filter, Download } from "lucide-react"
import { TransactionList } from "@/components/transactions/transaction-list"
import { TransactionFilters } from "@/components/transactions/transaction-filters"
import { TransactionsSkeleton } from "@/components/ui/skeletons"
import { TransactionFilters as TransactionFiltersType } from "@/lib/types"

export default function TransactionsPage() {
  const { user } = useAuth()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<TransactionFiltersType>({})
  const [currentPage, setCurrentPage] = useState(1)
  
  const {
    transactions,
    loading,
    error,
    pagination,
    loadTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction
  } = useTransactions(user?.uid || null)

  useEffect(() => {
    if (user) {
      loadTransactions(currentPage, 20, filters)
    }
  }, [user, currentPage, filters, loadTransactions])

  // Listen for transaction changes from other components (e.g., dashboard header)
  useEffect(() => {
    const handleTransactionChanged = () => {
      if (user) {
        loadTransactions(currentPage, 20, filters)
      }
    }

    window.addEventListener('transactionChanged', handleTransactionChanged)
    
    return () => {
      window.removeEventListener('transactionChanged', handleTransactionChanged)
    }
  }, [user, currentPage, filters, loadTransactions])

  if (loading && transactions.length === 0) {
    return (
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 max-w-7xl">
        <TransactionsSkeleton />
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background">
        <main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 max-w-7xl">
          <div className="space-y-4 sm:space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search transactions..." 
                  className="pl-8 sm:pl-9 h-9 sm:h-10 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)} className="h-9 sm:h-10 text-xs sm:text-sm">
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Filters
              </Button>
           
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {/* Filters Panel */}
            {isFilterOpen && (
              <TransactionFilters 
                filters={filters}
                onFiltersChange={setFilters}
              />
            )}

            {/* Transaction List */}
            <TransactionList 
              transactions={transactions}
              loading={loading}
              onUpdateTransaction={updateTransaction}
              onDeleteTransaction={deleteTransaction}
              onRefresh={() => loadTransactions(currentPage, 20, filters)}
            />

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Showing {transactions.length} of {pagination.total} transactions
                </p>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={!pagination.hasPrev}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm h-8 sm:h-9"
                  >
                    Previous
                  </Button>
                  <span className="text-xs sm:text-sm px-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!pagination.hasNext}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm h-8 sm:h-9"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>

      {/* Add Transaction Dialog */}
        {/* <AddTransactionDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSubmit={createTransaction}
          transaction={null}
        /> */}
    </div>
  )
}
