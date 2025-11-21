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

        // Filter out paid and cancelled invoices
        const incomplete = allResult.data.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
        
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
        <CardHeader>
          <CardTitle>Incomplete Invoices</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (incompleteInvoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Incomplete Invoices</CardTitle>
          <CardDescription>All invoices are paid</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending invoices
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Incomplete Invoices
        </CardTitle>
        <CardDescription>
          Pending payments not yet recorded in transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pending Revenue</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-lg font-semibold text-green-600">
                {stats.pendingRevenue > 0 ? `NGN ${stats.pendingRevenue.toLocaleString()}` : 'NGN 0'}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pending Expenses</p>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <p className="text-lg font-semibold text-red-600">
                {stats.pendingExpenses > 0 ? `NGN ${stats.pendingExpenses.toLocaleString()}` : 'NGN 0'}
              </p>
            </div>
          </div>
        </div>

        {stats.overdueCount > 0 && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <p className="text-sm text-destructive">
              {stats.overdueCount} overdue invoice{stats.overdueCount > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Invoice List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {incompleteInvoices.slice(0, 5).map((invoice) => {
            const currencySymbol = getCurrencySymbol(invoice.currency as any)
            const isOverdue = invoice.status === 'overdue'
            const isOutgoing = invoice.recipientUserId !== user?.uid
            
            return (
              <div
                key={invoice.id}
                className={`p-3 rounded-lg border ${
                  isOverdue ? 'border-destructive bg-destructive/5' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">
                        {invoice.invoiceType === 'incoming' ? 'Bill' : 'Invoice'} {invoice.invoiceNumber}
                      </p>
                      <Badge variant={isOverdue ? 'destructive' : 'outline'} className="text-xs">
                        {isOverdue ? 'Overdue' : invoice.status === 'sent' ? (isOutgoing ? 'Sent' : 'Received') : invoice.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isOutgoing ? invoice.client.name : invoice.supplier?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due: {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${isOutgoing ? 'text-green-600' : 'text-red-600'}`}>
                      {isOutgoing ? '+' : '-'}{currencySymbol}{invoice.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {incompleteInvoices.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            +{incompleteInvoices.length - 5} more invoice{incompleteInvoices.length - 5 > 1 ? 's' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

