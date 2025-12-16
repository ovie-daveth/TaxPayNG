"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { invoiceService } from "@/lib/services"
import { Invoice } from "@/lib/types"
import { useAuth } from "@/lib/hooks/useAuth"
import { getCurrencySymbol } from "@/lib/utils/currency"
import { format } from "date-fns"

export function IncompleteInvoices() {
  const { user } = useAuth()
  const [incompleteInvoices, setIncompleteInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    pendingRevenue: 0,
    pendingExpenses: 0,
    totalPending: 0,
    overdueCount: 0
  })

  useEffect(() => {
    if (!user?.uid) return

    const loadIncompleteInvoices = async () => {
      try {
        setLoading(true)
        // Get all invoices (no status filter)
        const allResult = await invoiceService.getUserInvoices(user.uid, {}, 1, 100)

        // Filter: Only include invoices where BOTH supplierPaymentStatus and clientPaymentStatus are not "paid"
        // Also exclude cancelled invoices
        const incomplete = allResult.data.filter(inv => {
          if (inv.status === 'cancelled') return false
          // Invoice is pending if both payment statuses are not "paid"
          const supplierNotPaid = inv.supplierPaymentStatus !== 'paid'
          const clientNotPaid = inv.clientPaymentStatus !== 'paid'
          return supplierNotPaid && clientNotPaid
        })
        
        setIncompleteInvoices(incomplete)

        // Calculate stats
        let pendingRevenue = 0
        let pendingExpenses = 0
        let overdueCount = 0

        incomplete.forEach(inv => {
          const amount = inv.total
          // Check if user is the sender (outgoing) or recipient (incoming)
          const isOutgoing = inv.recipientUserId !== user.uid
          if (isOutgoing) {
            pendingRevenue += amount
          } else {
            pendingExpenses += amount
          }
          if (inv.status === 'overdue') {
            overdueCount++
          }
        })

        setStats({
          pendingRevenue,
          pendingExpenses,
          totalPending: pendingRevenue + pendingExpenses,
          overdueCount
        })
      } catch (error) {
        console.error("Error loading incomplete invoices:", error)
      } finally {
        setLoading(false)
      }
    }

    loadIncompleteInvoices()
  }, [user])

  if (loading) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Incomplete Invoices</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (incompleteInvoices.length === 0) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Incomplete Invoices</CardTitle>
          <CardDescription className="text-xs sm:text-sm">All invoices are paid</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4">
            No pending invoices
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          Incomplete Invoices
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Pending payments not yet recorded in transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="space-y-0.5 sm:space-y-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Pending Revenue</p>
            <div className="flex items-center gap-1 sm:gap-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              <p className="text-xs sm:text-lg font-semibold text-green-600">
                {stats.pendingRevenue > 0 ? `₦${stats.pendingRevenue.toLocaleString()}` : '₦0'}
              </p>
            </div>
          </div>
          <div className="space-y-0.5 sm:space-y-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Pending Expenses</p>
            <div className="flex items-center gap-1 sm:gap-2">
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
              <p className="text-xs sm:text-lg font-semibold text-red-600">
                {stats.pendingExpenses > 0 ? `₦${stats.pendingExpenses.toLocaleString()}` : '₦0'}
              </p>
            </div>
          </div>
        </div>

        {stats.overdueCount > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-destructive/10 rounded-md">
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
            <p className="text-xs sm:text-sm text-destructive">
              {stats.overdueCount} overdue invoice{stats.overdueCount > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Invoice List */}
        <div className="space-y-1.5 sm:space-y-2 max-h-[300px] overflow-y-auto">
          {incompleteInvoices.slice(0, 5).map((invoice) => {
            const currencySymbol = getCurrencySymbol(invoice.currency as any)
            // Use naira icon for NGN, otherwise use currency symbol
            const displaySymbol = invoice.currency === 'NGN' ? '₦' : currencySymbol
            const isOverdue = invoice.status === 'overdue'
            const isOutgoing = invoice.recipientUserId !== user?.uid
            
            return (
              <div
                key={invoice.id}
                className={`p-2 sm:p-3 rounded-lg border ${
                  isOverdue ? 'border-destructive bg-destructive/5' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                      <p className="font-medium text-xs sm:text-sm truncate">
                        {invoice.invoiceType === 'incoming' ? 'Bill' : 'Invoice'} {invoice.invoiceNumber}
                      </p>
                      <Badge variant={isOverdue ? 'destructive' : 'outline'} className="text-[10px] sm:text-xs px-1 sm:px-2 py-0">
                        {isOverdue ? 'Overdue' : invoice.status === 'sent' ? (isOutgoing ? 'Sent' : 'Received') : invoice.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {isOutgoing ? invoice.client.name : invoice.supplier?.name || 'Unknown'}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Due: {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold text-xs sm:text-sm ${isOutgoing ? 'text-green-600' : 'text-red-600'}`}>
                      {isOutgoing ? '+' : '-'}{displaySymbol}{invoice.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {incompleteInvoices.length > 5 && (
          <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
            +{incompleteInvoices.length - 5} more invoice{incompleteInvoices.length - 5 > 1 ? 's' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

