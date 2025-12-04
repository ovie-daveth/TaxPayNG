"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ReportData } from "@/lib/services/reportService"
import { formatCurrencyAmount } from "@/lib/utils/currency"
import { format } from "date-fns"
import { Printer, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

interface ExpenseReportPreviewProps {
  reportData: ReportData
  onBack?: () => void
}

export function ExpenseReportPreview({ reportData, onBack }: ExpenseReportPreviewProps) {
  const formatCurrency = (amount: number) => formatCurrencyAmount(amount, 'NGN')
  
  const periodLabel = reportData.period.periodType === 'annual' 
    ? `Annual ${reportData.period.year}`
    : reportData.period.quarter 
    ? `Q${reportData.period.quarter} ${reportData.period.year}`
    : `${format(new Date(reportData.period.startDate), 'MMM dd')} - ${format(new Date(reportData.period.endDate), 'MMM dd, yyyy')}`

  const expenseData = reportData.expenses

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      toast.error("Please allow popups to print")
      return
    }

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Expense Report - ${periodLabel}</title>
  <style>
    @media print {
      @page { size: A4; margin: 20mm; }
      body { margin: 0; }
    }
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
    .total-expense {
      font-size: 18px;
      font-weight: bold;
      padding: 15px;
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      margin-bottom: 25px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 15px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
    }
    .expense-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dotted #ccc;
    }
    .expense-label { font-size: 13px; }
    .expense-value { font-weight: bold; font-size: 13px; }
    .tax-deductible {
      color: #059669;
      font-size: 11px;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>EXPENSE REPORT</h1>
    <p style="font-size: 12px; color: #666;">Period: ${periodLabel}</p>
  </div>

  <div class="total-expense">
    <div style="display: flex; justify-content: space-between;">
      <span>Total Expenses</span>
      <span>${formatCurrency(expenseData.totalExpenses)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 14px; color: #666;">
      <span>Tax Deductible Expenses</span>
      <span style="color: #059669;">${formatCurrency(expenseData.taxDeductibleExpenses)}</span>
    </div>
  </div>

  ${Object.keys(expenseData.expensesByCategory).length > 0 ? `
  <div class="section">
    <div class="section-title">Expenses by Category</div>
    ${Object.entries(expenseData.expensesByCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount]) => `
      <div class="expense-row">
        <span class="expense-label">${category}</span>
        <span class="expense-value">${formatCurrency(amount)}</span>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 11px; color: #666;">
    <p>Total Transactions: ${expenseData.transactionCount}</p>
    <p>Tax Deductible: ${formatCurrency(expenseData.taxDeductibleExpenses)}</p>
    <p>Non-Deductible: ${formatCurrency(expenseData.totalExpenses - expenseData.taxDeductibleExpenses)}</p>
  </div>
</body>
</html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  return (
    <Card className="p-8 max-w-4xl mx-auto">
      {/* Action Buttons */}
      <div className="flex gap-3 mb-6 justify-between">
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <div className={onBack ? "flex gap-3" : "flex gap-3 ml-auto"}>
          <Button
            variant="outline"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Header */}
        <div className="text-center border-b border-border pb-6">
          <h1 className="text-2xl font-bold mb-2">EXPENSE REPORT</h1>
          <p className="text-sm text-muted-foreground">Period: {periodLabel}</p>
        </div>

        {/* Total Expenses */}
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
          <div className="flex justify-between items-center mb-3">
            <span className="text-lg font-semibold">Total Expenses</span>
            <span className="text-2xl font-bold text-red-600">{formatCurrency(expenseData.totalExpenses)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Tax Deductible Expenses</span>
            <span className="font-semibold text-green-600">{formatCurrency(expenseData.taxDeductibleExpenses)}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-2">
            <span className="text-muted-foreground">Non-Deductible Expenses</span>
            <span className="font-semibold text-muted-foreground">
              {formatCurrency(expenseData.totalExpenses - expenseData.taxDeductibleExpenses)}
            </span>
          </div>
        </div>

        {/* Expenses by Category */}
        {Object.keys(expenseData.expensesByCategory).length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2">Expenses by Category</h2>
            <div className="space-y-2">
              {Object.entries(expenseData.expensesByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => (
                  <div key={category} className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">{category}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="border-t border-border pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Transactions</p>
              <p className="font-medium">{expenseData.transactionCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tax Deductible</p>
              <p className="font-medium text-green-600">{formatCurrency(expenseData.taxDeductibleExpenses)}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

