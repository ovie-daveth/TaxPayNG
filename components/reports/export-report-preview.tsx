"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ReportData } from "@/lib/services/reportService"
import { formatCurrencyAmount } from "@/lib/utils/currency"
import { format } from "date-fns"
import { Download, ArrowLeft, Loader2 } from "lucide-react"
import { Transaction } from "@/lib/types"
import { formatDate } from "@/lib/utils/date"

interface ExportReportPreviewProps {
  reportData: ReportData
  onBack?: () => void
  onExport: () => Promise<void>
  isExporting: boolean
}

export function ExportReportPreview({ reportData, onBack, onExport, isExporting }: ExportReportPreviewProps) {
  const formatCurrency = (amount: number, currency: string = 'NGN') => formatCurrencyAmount(amount, currency as any)
  
  const periodLabel = reportData.period.periodType === 'annual' 
    ? `Annual ${reportData.period.year}`
    : reportData.period.quarter 
    ? `Q${reportData.period.quarter} ${reportData.period.year}`
    : `${format(new Date(reportData.period.startDate), 'MMM dd')} - ${format(new Date(reportData.period.endDate), 'MMM dd, yyyy')}`

  // Combine all transactions from income and expenses
  const allTransactions = [
    ...(reportData.income.transactions || []),
    ...(reportData.expenses.transactions || [])
  ]
  
  // Remove duplicates based on transaction ID
  const uniqueTransactions = Array.from(
    new Map(allTransactions.map(t => [t.id, t])).values()
  )
  
  // Sort by createdAt descending (newest first)
  // Helper function to extract timestamp (handles Firestore Timestamps, ISO strings, and server timestamps)
  const getCreatedAtTime = (createdAt: any): number => {
    if (!createdAt) return 0
    
    // If it's already an ISO string, parse it
    if (typeof createdAt === 'string') {
      const parsed = new Date(createdAt).getTime()
      return isNaN(parsed) ? 0 : parsed
    }
    
    // Handle Firestore Timestamp object with toDate method
    if (createdAt && typeof createdAt === 'object' && typeof createdAt.toDate === 'function') {
      return createdAt.toDate().getTime()
    }
    
    // Handle Firestore Timestamp object with seconds property
    if (createdAt && typeof createdAt === 'object' && createdAt.seconds !== undefined) {
      return createdAt.seconds * 1000 + (createdAt.nanoseconds || 0) / 1000000
    }
    
    // Handle server timestamp placeholder (_methodName: "serverTimestamp")
    if (createdAt && typeof createdAt === 'object' && createdAt._methodName === 'serverTimestamp') {
      // Use current time for server timestamps (they're the newest)
      return Date.now()
    }
    
    // Try to parse as date
    try {
      const parsed = new Date(createdAt).getTime()
      return isNaN(parsed) ? 0 : parsed
    } catch {
      return 0
    }
  }
  
  const sortedTransactions = uniqueTransactions.sort((a, b) => {
    // For sorting, prioritize valueDate (when money moved), then transactionDate, then date
    const dateA = (a.valueDate ? new Date(a.valueDate).getTime() : 0) ||
                  (a.transactionDate ? new Date(a.transactionDate).getTime() : 0) ||
                  (a.date ? new Date(a.date).getTime() : 0) ||
                  getCreatedAtTime(a.createdAt)
    const dateB = (b.valueDate ? new Date(b.valueDate).getTime() : 0) ||
                  (b.transactionDate ? new Date(b.transactionDate).getTime() : 0) ||
                  (b.date ? new Date(b.date).getTime() : 0) ||
                  getCreatedAtTime(b.createdAt)
    return dateB - dateA
  })

  const getAmount = (transaction: Transaction) => {
    if (transaction.currency && transaction.currency !== 'NGN' && transaction.ngnEquivalent) {
      return transaction.ngnEquivalent
    }
    return typeof transaction.amount === 'number' 
      ? transaction.amount 
      : Number(String(transaction.amount).replace(/[\u20A6,]/g, '').trim()) || 0
  }

  const getDisplayAmount = (transaction: Transaction) => {
    const amount = getAmount(transaction)
    const currency = transaction.currency || 'NGN'
    return formatCurrency(amount, currency)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Expense Report</h3>
          <p className="text-sm text-muted-foreground">Period: {periodLabel}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Total Transactions: {sortedTransactions.length}
          </p>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button onClick={onExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 text-sm font-semibold">Date</th>
                <th className="text-left p-2 text-sm font-semibold">Description</th>
                <th className="text-left p-2 text-sm font-semibold">Category</th>
                <th className="text-right p-2 text-sm font-semibold">Type</th>
                <th className="text-right p-2 text-sm font-semibold">Amount</th>
                <th className="text-left p-2 text-sm font-semibold">Payment Method</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-muted-foreground">
                    No transactions found for this period
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 text-sm">
                      {formatDate(transaction.transactionDate || transaction.valueDate || transaction.date || transaction.createdAt)}
                    </td>
                    <td className="p-2 text-sm max-w-xs truncate" title={transaction.description || ''}>
                      {transaction.description || '-'}
                    </td>
                    <td className="p-2 text-sm">
                      {transaction.category || '-'}
                    </td>
                    <td className="p-2 text-sm text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {transaction.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className={`p-2 text-sm text-right font-medium ${
                      transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{getDisplayAmount(transaction)}
                    </td>
                    <td className="p-2 text-sm">
                      {transaction.paymentMethod || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

