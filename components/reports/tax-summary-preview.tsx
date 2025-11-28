"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ReportData } from "@/lib/services/reportService"
import { formatCurrencyAmount } from "@/lib/utils/currency"
import { format } from "date-fns"
import { Printer, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

interface TaxSummaryPreviewProps {
  reportData: ReportData
  onBack?: () => void
}

export function TaxSummaryPreview({ reportData, onBack }: TaxSummaryPreviewProps) {
  const formatCurrency = (amount: number) => formatCurrencyAmount(amount, 'NGN')
  
  const periodLabel = reportData.period.periodType === 'annual' 
    ? `Annual ${reportData.period.year}`
    : reportData.period.quarter 
    ? `Q${reportData.period.quarter} ${reportData.period.year}`
    : `${format(new Date(reportData.period.startDate), 'MMM dd')} - ${format(new Date(reportData.period.endDate), 'MMM dd, yyyy')}`

  const { income, expenses, tax } = reportData

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
  <title>Tax Summary Report - ${periodLabel}</title>
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
    .summary-box {
      padding: 15px;
      margin-bottom: 20px;
      border-left: 4px solid #3b82f6;
      background: #f0f9ff;
    }
    .summary-box.expenses {
      border-left-color: #ef4444;
      background: #fef2f2;
    }
    .summary-box.tax {
      border-left-color: #10b981;
      background: #f0fdf4;
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
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dotted #ccc;
    }
    .summary-label { font-size: 13px; }
    .summary-value { font-weight: bold; font-size: 13px; }
    .tax-breakdown {
      background: #f9fafb;
      padding: 15px;
      border-radius: 4px;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>TAX SUMMARY REPORT</h1>
    <p style="font-size: 12px; color: #666;">Period: ${periodLabel}</p>
  </div>

  <div class="summary-box">
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <span style="font-size: 16px; font-weight: bold;">Total Income</span>
      <span style="font-size: 18px; font-weight: bold; color: #3b82f6;">${formatCurrency(income.totalIncome)}</span>
    </div>
  </div>

  <div class="summary-box expenses">
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <span style="font-size: 16px; font-weight: bold;">Total Expenses</span>
      <span style="font-size: 18px; font-weight: bold; color: #ef4444;">${formatCurrency(expenses.totalExpenses)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 13px; color: #666;">
      <span>Tax Deductible</span>
      <span style="color: #059669;">${formatCurrency(expenses.taxDeductibleExpenses)}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Income Summary</div>
    <div class="summary-row">
      <span class="summary-label">Gross Income</span>
      <span class="summary-value">${formatCurrency(tax.grossIncome)}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Total Expenses</span>
      <span class="summary-value" style="color: #ef4444;">-${formatCurrency(expenses.totalExpenses)}</span>
    </div>
    <div class="summary-row" style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-top: 5px;">
      <span class="summary-label" style="font-weight: bold;">Net Income</span>
      <span class="summary-value" style="font-size: 15px;">${formatCurrency(tax.netIncome)}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Reliefs and Deductions</div>
    ${Object.entries(tax.reliefs)
      .filter(([key, value]) => value > 0 && key !== 'consolidatedRelief')
      .map(([key, value]) => {
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()
        return `
    <div class="summary-row">
      <span class="summary-label">${label}</span>
      <span class="summary-value" style="color: #059669;">-${formatCurrency(value)}</span>
    </div>
        `
      }).join('')}
    <div class="summary-row" style="border-bottom: 1px solid #000; padding-bottom: 10px; margin-top: 5px;">
      <span class="summary-label" style="font-weight: bold;">Total Reliefs</span>
      <span class="summary-value" style="color: #059669; font-size: 15px;">-${formatCurrency(tax.totalReliefs)}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Tax Calculation</div>
    <div class="summary-row">
      <span class="summary-label">Taxable Income</span>
      <span class="summary-value">${formatCurrency(tax.taxableIncome)}</span>
    </div>
    <div class="tax-breakdown">
      <div style="font-size: 12px; color: #666; margin-bottom: 10px;">Tax Brackets:</div>
      ${tax.taxBrackets.map(bracket => `
      <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px;">
        <span>${formatCurrency(bracket.amount)} @ ${bracket.rate}%</span>
        <span style="font-weight: bold;">${formatCurrency(bracket.tax)}</span>
      </div>
      `).join('')}
    </div>
    <div class="summary-row" style="border-top: 2px solid #000; padding-top: 10px; margin-top: 10px;">
      <span class="summary-label" style="font-size: 16px; font-weight: bold;">Total Tax Payable</span>
      <span class="summary-value" style="font-size: 18px; color: #10b981;">${formatCurrency(tax.taxPayable)}</span>
    </div>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 11px; color: #666;">
    <p>Generated on: ${format(new Date(reportData.generatedAt), 'MMM dd, yyyy')}</p>
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
            Print Summary
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Header */}
        <div className="text-center border-b border-border pb-6">
          <h1 className="text-2xl font-bold mb-2">TAX SUMMARY REPORT</h1>
          <p className="text-sm text-muted-foreground">Period: {periodLabel}</p>
        </div>

        {/* Total Income */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total Income</span>
            <span className="text-2xl font-bold text-blue-600">{formatCurrency(income.totalIncome)}</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
          <div className="flex justify-between items-center mb-3">
            <span className="text-lg font-semibold">Total Expenses</span>
            <span className="text-2xl font-bold text-red-600">{formatCurrency(expenses.totalExpenses)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Tax Deductible Expenses</span>
            <span className="font-semibold text-green-600">{formatCurrency(expenses.taxDeductibleExpenses)}</span>
          </div>
        </div>

        {/* Income Summary */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2">Income Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Gross Income</span>
              <span className="font-medium">{formatCurrency(tax.grossIncome)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Total Expenses</span>
              <span className="font-medium text-red-600">-{formatCurrency(expenses.totalExpenses)}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-border mt-2">
              <span className="font-semibold">Net Income</span>
              <span className="font-bold text-lg">{formatCurrency(tax.netIncome)}</span>
            </div>
          </div>
        </div>

        {/* Reliefs and Deductions */}
        {tax.totalReliefs > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2">Reliefs and Deductions</h2>
            <div className="space-y-2">
              {Object.entries(tax.reliefs)
                .filter(([key, value]) => value > 0 && key !== 'consolidatedRelief')
                .map(([key, value]) => {
                  const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()
                  return (
                    <div key={key} className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-green-600">-{formatCurrency(value)}</span>
                    </div>
                  )
                })}
              <div className="flex justify-between py-3 border-t-2 border-border mt-2">
                <span className="font-semibold">Total Reliefs</span>
                <span className="font-bold text-lg text-green-600">-{formatCurrency(tax.totalReliefs)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tax Calculation */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2">Tax Calculation</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Taxable Income</span>
              <span className="font-medium">{formatCurrency(tax.taxableIncome)}</span>
            </div>
            
            {tax.taxBrackets.length > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg mt-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Tax Brackets</h3>
                <div className="space-y-2">
                  {tax.taxBrackets.map((bracket, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatCurrency(bracket.amount)} @ {bracket.rate}%
                      </span>
                      <span className="font-medium">{formatCurrency(bracket.tax)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between py-4 border-t-2 border-border mt-4 bg-green-50 rounded-lg p-4">
              <span className="text-lg font-semibold">Total Tax Payable</span>
              <span className="text-2xl font-bold text-green-600">{formatCurrency(tax.taxPayable)}</span>
            </div>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="border-t border-border pt-6 text-sm text-muted-foreground">
          <p>Generated on: {format(new Date(reportData.generatedAt), 'MMM dd, yyyy')}</p>
        </div>
      </div>
    </Card>
  )
}

