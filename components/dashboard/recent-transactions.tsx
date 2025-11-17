"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/hooks/useAuth"
import { useTransactions } from "@/lib/hooks/useTransactions"
import type { Transaction } from "@/lib/types"
import { format } from "date-fns"

export function RecentTransactions() {
  const { user } = useAuth()
  const { getRecentTransactions } = useTransactions(user?.uid || null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "MMM d, yyyy")
    } catch {
      return dateString
    }
  }
  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Recent Transactions</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Your latest financial activity</p>
        </div>
        <Link href="/dashboard/transactions" className="self-start sm:self-auto">
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
            View All
          </Button>
        </Link>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No recent transactions
          </div>
        ) : (
          transactions.map((transaction) => (
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
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{formatDate(transaction.date)}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className={`font-semibold text-xs sm:text-sm whitespace-nowrap ${transaction.type === "income" ? "text-primary" : "text-destructive"}`}>
                  {transaction.type === "income" ? "+" : "-"}₦{Number(transaction.amount || 0).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
