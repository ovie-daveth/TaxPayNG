"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { useTransactions } from "@/lib/hooks/useTransactions"
import type { Transaction } from "@/lib/types"
import { format } from "date-fns"
import { ViewTransactionDialog } from "@/components/transactions/view-transaction-dialog"
import { formatCurrencyAmount } from "@/lib/utils/currency"
import { formatDate } from "@/lib/utils/date"

export function RecentTransactions() {
  const { user } = useAuth()
  const pathname = usePathname()
  const { getRecentTransactions } = useTransactions(user?.uid || null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null)

  // Determine the correct transactions route based on current pathname
  const getTransactionsRoute = () => {
    if (pathname?.startsWith('/dashboard-creator')) {
      return '/dashboard-creator/transactions'
    } else if (pathname?.startsWith('/dashboard-sme')) {
      return '/dashboard-sme/transactions'
    }
    return '/dashboard/transactions'
  }

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return
      
      setLoading(true)
      try {
        const recent = await getRecentTransactions(5)
        setTransactions(recent)
      } catch (error) {
        console.error("Error fetching recent transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()

    // Listen for transaction changes
    const handleTransactionChanged = () => {
      fetchTransactions()
    }

    window.addEventListener("transactionChanged", handleTransactionChanged)
    return () => {
      window.removeEventListener("transactionChanged", handleTransactionChanged)
    }
  }, [user, getRecentTransactions])

  const handleView = (transaction: Transaction) => {
    setViewingTransaction(transaction)
    setIsViewDialogOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return formatCurrencyAmount(amount, 'NGN')
  }
  return (
    <Card className="p-3 sm:p-5 md:p-6 overflow-hidden w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-5 md:mb-6">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold truncate">Recent Transactions</h3>
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5">Your latest financial activity</p>
        </div>
        <Link href={getTransactionsRoute()} className="self-start sm:self-auto flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-7 sm:h-8 text-[10px] sm:text-xs md:text-sm">
            View All
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No recent transactions
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-2">
              {transactions.map((transaction) => {
                const isIncome = transaction.type === 'income'
                return (
                  <div
                    key={transaction.id}
                    onClick={() => handleView(transaction)}
                    className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/50 bg-card w-full min-w-0"
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isIncome ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                      {isIncome ? (
                        <ArrowUpRight className="w-4 h-4 text-primary" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-start justify-between gap-1.5 min-w-0 w-full">
                        <div className="flex-1 min-w-0 overflow-hidden pr-1">
                          <p className="text-xs font-medium text-foreground truncate">
                            {(() => {
                              const desc = transaction.description || "No description"
                              // Truncate to 15 chars max on mobile
                              return desc.length > 15 ? desc.substring(0, 15) + '...' : desc
                            })()}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {formatDate(transaction.transactionDate || transaction.valueDate || transaction.date)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <p className={`text-xs font-semibold whitespace-nowrap ${isIncome ? 'text-primary' : 'text-foreground'}`}>
                            {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.ngnEquivalent !== undefined && transaction.ngnEquivalent !== null ? transaction.ngnEquivalent : transaction.amount))}
                          </p>
                          <span className="text-[10px] text-green-500 whitespace-nowrap">
                            Successful
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop List View */}
            <div className="hidden md:block">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center gap-3 sm:gap-4 py-2.5 sm:py-3 border-b border-border last:border-0">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      transaction.type === "income" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{transaction.description || "No description"}</p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] sm:text-xs">
                        {transaction.category || "Uncategorized"}
                      </Badge>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">{formatDate(transaction.transactionDate || transaction.valueDate || transaction.date)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className={`font-semibold text-xs sm:text-sm whitespace-nowrap ${transaction.type === "income" ? "text-primary" : "text-destructive"}`}>
                      {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.ngnEquivalent !== undefined && transaction.ngnEquivalent !== null ? transaction.ngnEquivalent : transaction.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* View Transaction Dialog */}
      <ViewTransactionDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        transaction={viewingTransaction}
        onEdit={() => {
          setIsViewDialogOpen(false)
          // Navigate to transactions page
          window.location.href = getTransactionsRoute()
        }}
      />
    </Card>
  )
}
