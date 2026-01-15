"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ReportData } from "@/lib/services/reportService"
import { formatCurrencyAmount } from "@/lib/utils/currency"
import { format } from "date-fns"
import { Printer, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"

interface ExpenseReportPreviewProps {
  reportData: ReportData
  onBack?: () => void
}

export function ExpenseReportPreview({ reportData, onBack }: ExpenseReportPreviewProps) {
  const { profile } = useUserProfile()
  const { hasAccess } = useSubscription()
  const hasGoldAccess = hasAccess('GOLD')
  const formatCurrency = (amount: number) => formatCurrencyAmount(amount, 'NGN')
  
  const userName = profile?.firstName || profile?.lastName || profile?.email?.split('@')[0] || 'there'
  
  // Get capital allowances from tax classification (Gold+ feature)
  const capitalAllowances = reportData.taxClassification?.capitalAllowances || 0
  const capitalAllowanceDetails = reportData.taxClassification?.capitalAllowanceDetails || []
  
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

    const logoUrl = `${window.location.origin}/logootax_bg.png`
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>-</title>
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
    .topbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      font-size: 11px;
      color: #666;
      margin-bottom: 14px;
    }
    .topbar-left { width: 170px; }
    .topbar-center { flex: 1; text-align: center; }
    .topbar-right { width: 170px; display: flex; justify-content: flex-end; }
    .logo { height: 22px; width: auto; }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header { text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
    img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
  <div class="topbar">
    <div class="topbar-left"></div>
    <div class="topbar-center">Expense Report - ${periodLabel}</div>
    <div class="topbar-right"><img class="logo" src="${logoUrl}" alt="OTax" /></div>
  </div>
  <div class="header">
    <h1>EXPENSE REPORT</h1>
    <p style="font-size: 12px; color: #666; margin: 6px 0 0;">Period: ${periodLabel}</p>
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
      }, 500)
    }
  }

  return (
    <Card className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Action Buttons */}
      <div className="flex flex-row gap-2 sm:gap-3 mb-4 sm:mb-6 justify-between items-center">
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            className="h-8 sm:h-10 text-xs sm:text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Back
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handlePrint}
          className="h-8 sm:h-10 text-xs sm:text-sm ml-auto"
        >
          <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          <span className="hidden sm:inline">Print Report</span>
          <span className="sm:hidden">Print</span>
        </Button>
      </div>

      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <div className="text-center border-b border-border pb-3 sm:pb-4 md:pb-6">
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-1 sm:mb-2">Hey {userName}, your expense report</p>
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-2">EXPENSE REPORT</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Period: {periodLabel}</p>
        </div>

        {/* Total Expenses */}
        <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 dark:border-red-400 p-3 sm:p-4 md:p-6 rounded">
          <div className="flex justify-between items-center mb-2 sm:mb-3">
            <span className="text-sm sm:text-base md:text-lg font-semibold">Total Expenses</span>
            <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(expenseData.totalExpenses)}</span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-muted-foreground">Tax Deductible Expenses</span>
            <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(expenseData.taxDeductibleExpenses)}</span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm mt-2">
            <span className="text-muted-foreground">Non-Deductible Expenses</span>
            <span className="font-semibold text-muted-foreground">
              {formatCurrency(expenseData.totalExpenses - expenseData.taxDeductibleExpenses)}
            </span>
          </div>
        </div>

        {/* Expenses by Category */}
        {Object.keys(expenseData.expensesByCategory).length > 0 && (
          <div>
            <h2 className="text-sm sm:text-base md:text-lg font-semibold mb-3 sm:mb-4 border-b border-border pb-2">Expenses by Category</h2>
            <div className="space-y-2">
              {Object.entries(expenseData.expensesByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => (
                  <div key={category} className="flex justify-between py-1.5 sm:py-2 border-b border-border">
                    <span className="text-xs sm:text-sm text-muted-foreground">{category}</span>
                    <span className="text-xs sm:text-sm font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Capital Allowances (Gold+ feature) */}
        {hasGoldAccess && capitalAllowances > 0 && (
          <div>
            <h2 className="text-sm sm:text-base md:text-lg font-semibold mb-3 sm:mb-4 border-b border-border pb-2">
              Capital Allowances
            </h2>
            <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 dark:border-blue-400 p-3 sm:p-4 rounded mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm sm:text-base font-semibold">Total Capital Allowances</span>
                <span className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(capitalAllowances)}</span>
              </div>
              {capitalAllowanceDetails.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Breakdown:</p>
                  {capitalAllowanceDetails.map((detail, index) => (
                    <div key={index} className="flex justify-between text-xs sm:text-sm py-1 border-b border-blue-200 dark:border-blue-800">
                      <span className="text-muted-foreground">{detail.description}</span>
                      <span className="font-medium">{formatCurrency(detail.allowanceAmount)} ({detail.allowanceRate}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="border-t border-border pt-4 sm:pt-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div>
              <p className="text-muted-foreground">Total Transactions</p>
              <p className="font-medium">{expenseData.transactionCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tax Deductible</p>
              <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(expenseData.taxDeductibleExpenses)}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

