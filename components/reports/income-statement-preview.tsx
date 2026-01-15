"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ReportData } from "@/lib/services/reportService"
import { formatCurrencyAmount } from "@/lib/utils/currency"
import { format } from "date-fns"
import { Printer, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { useState } from "react"

interface IncomeStatementPreviewProps {
  reportData: ReportData
  formData: {
    includeInvoices: boolean
    includeTransactions: boolean
  }
  onBack?: () => void
}

export function IncomeStatementPreview({ reportData, formData, onBack }: IncomeStatementPreviewProps) {
  const { profile } = useUserProfile()
  const { hasAccess } = useSubscription()
  const hasGoldAccess = hasAccess('GOLD')
  const formatCurrency = (amount: number) => formatCurrencyAmount(amount, 'NGN')
  const [incomeView, setIncomeView] = useState<'category' | 'source'>('category')
  
  const userName = profile?.firstName || profile?.lastName || profile?.email?.split('@')[0] || 'there'
  
  // Get WHT credits from tax classification (Gold+ feature)
  const whtCredits = reportData.taxClassification?.whtCredits || 0
  const whtCreditDetails = reportData.taxClassification?.whtCreditDetails || []
  
  const periodLabel = reportData.period.periodType === 'annual' 
    ? `Annual ${reportData.period.year}`
    : reportData.period.quarter 
    ? `Q${reportData.period.quarter} ${reportData.period.year}`
    : `${format(new Date(reportData.period.startDate), 'MMM dd')} - ${format(new Date(reportData.period.endDate), 'MMM dd, yyyy')}`

  const incomeData = reportData.income

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
    .total-income {
      font-size: 18px;
      font-weight: bold;
      padding: 15px;
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
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
    .income-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dotted #ccc;
    }
    .income-label { font-size: 13px; }
    .income-value { font-weight: bold; font-size: 13px; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left"></div>
    <div class="topbar-center">Income Statement - ${periodLabel}</div>
    <div class="topbar-right"><img class="logo" src="${logoUrl}" alt="OTax" /></div>
  </div>
  <div class="header">
    <h1>INCOME STATEMENT</h1>
    <p style="font-size: 12px; color: #666; margin: 6px 0 0;">Period: ${periodLabel}</p>
  </div>

  <div class="total-income">
    <div style="display: flex; justify-content: space-between;">
      <span>Total Income</span>
      <span>${formatCurrency(incomeData.totalIncome)}</span>
    </div>
  </div>

  ${incomeView === 'category' && Object.keys(incomeData.incomeByCategory).length > 0 ? `
  <div class="section">
    <div class="section-title">Income by Category</div>
    ${Object.entries(incomeData.incomeByCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount]) => `
      <div class="income-row">
        <span class="income-label">${category}</span>
        <span class="income-value">${formatCurrency(amount)}</span>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${incomeView === 'source' && Object.keys(incomeData.incomeBySource).length > 0 ? `
  <div class="section">
    <div class="section-title">Income by Source</div>
    ${Object.entries(incomeData.incomeBySource)
      .sort(([, a], [, b]) => b - a)
      .map(([source, amount]) => `
      <div class="income-row">
        <span class="income-label">${source}</span>
        <span class="income-value">${formatCurrency(amount)}</span>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 11px; color: #666;">
    <p>Total Transactions: ${incomeData.transactionCount}</p>
    <p>Total Invoices: ${incomeData.invoiceCount}</p>
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
          <span className="hidden sm:inline">Print Statement</span>
          <span className="sm:hidden">Print</span>
        </Button>
      </div>

      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <div className="text-center border-b border-border pb-3 sm:pb-4 md:pb-6">
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-1 sm:mb-2">Hey {userName}, your income statement</p>
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-2">INCOME STATEMENT</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Period: {periodLabel}</p>
        </div>

        {/* Income Breakdown */}
        <div className="space-y-3 sm:space-y-4">
          {/* Gross Income */}
          <div className="bg-muted/50 border-l-4 border-muted-foreground p-3 sm:p-4 rounded">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base font-semibold">Gross Income</span>
              <span className="text-base sm:text-lg font-bold">{formatCurrency(incomeData.grossIncome || incomeData.totalIncome)}</span>
            </div>
          </div>
          
          {/* Platform Fees (if applicable) */}
          {(incomeData.platformFees || 0) > 0 && (
            <div className="bg-muted/30 p-2 sm:p-3 rounded">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-muted-foreground">Platform Fees:</span>
                <span className="text-muted-foreground">-{formatCurrency(incomeData.platformFees || 0)}</span>
              </div>
            </div>
          )}
          
          {/* VAT Collected (if applicable) */}
          {(incomeData.vatCollected || 0) > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500 dark:border-blue-400 p-3 sm:p-4 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm sm:text-base font-semibold text-blue-700 dark:text-blue-300">VAT Collected</span>
                <span className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(incomeData.vatCollected || 0)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Amount to be remitted to government</p>
            </div>
          )}
          
          {/* Net Income After VAT (Taxable Income) */}
          <div className="bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500 dark:border-green-400 p-3 sm:p-4 md:p-6 rounded">
            <div className="flex justify-between items-center">
              <span className="text-sm sm:text-base md:text-lg font-semibold">Net Income (Taxable Income)</span>
              <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(incomeData.totalIncome)}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Gross Income - VAT Collected = {formatCurrency(incomeData.grossIncome || incomeData.totalIncome)} - {formatCurrency(incomeData.vatCollected || 0)} = {formatCurrency(incomeData.totalIncome)}
            </p>
          </div>
          
          {/* WHT Credits (if applicable) */}
          {(incomeData.whtDeducted || 0) > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-500 dark:border-orange-400 p-3 sm:p-4 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm sm:text-base font-semibold text-orange-700 dark:text-orange-300">WHT Deducted (Tax Credit)</span>
                <span className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(incomeData.whtDeducted || 0)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Can be used as credit against tax payable</p>
            </div>
          )}
        </div>

        {/* Income Breakdown - Toggle between Category and Source */}
        {(Object.keys(incomeData.incomeByCategory).length > 0 || Object.keys(incomeData.incomeBySource).length > 0) && (
          <div>
            <Tabs value={incomeView} onValueChange={(value) => setIncomeView(value as 'category' | 'source')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-3 sm:mb-4">
                <TabsTrigger value="category" className="text-xs sm:text-sm">
                  Income by Category
                </TabsTrigger>
                <TabsTrigger value="source" className="text-xs sm:text-sm">
                  Income by Source
                </TabsTrigger>
              </TabsList>

              <TabsContent value="category" className="mt-0">
                {Object.keys(incomeData.incomeByCategory).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(incomeData.incomeByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount]) => (
                        <div key={category} className="flex justify-between py-1.5 sm:py-2 border-b border-border">
                          <span className="text-xs sm:text-sm text-muted-foreground">{category}</span>
                          <span className="text-xs sm:text-sm font-medium">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs sm:text-sm text-muted-foreground">
                    No income by category available
                  </div>
                )}
              </TabsContent>

              <TabsContent value="source" className="mt-0">
                {Object.keys(incomeData.incomeBySource).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(incomeData.incomeBySource)
                      .sort(([, a], [, b]) => b - a)
                      .map(([source, amount]) => (
                        <div key={source} className="flex justify-between py-1.5 sm:py-2 border-b border-border">
                          <span className="text-xs sm:text-sm text-muted-foreground">{source}</span>
                          <span className="text-xs sm:text-sm font-medium">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs sm:text-sm text-muted-foreground">
                    No income by source available
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* WHT Credits (Gold+ feature) */}
        {hasGoldAccess && whtCredits > 0 && (
          <div>
            <h2 className="text-sm sm:text-base md:text-lg font-semibold mb-3 sm:mb-4 border-b border-border pb-2">
              Withholding Tax (WHT) Credits
            </h2>
            <div className="bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500 dark:border-green-400 p-3 sm:p-4 rounded mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm sm:text-base font-semibold">Total WHT Credits</span>
                <span className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(whtCredits)}</span>
              </div>
              {whtCreditDetails.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Breakdown:</p>
                  {whtCreditDetails.map((detail, index) => (
                    <div key={index} className="flex justify-between text-xs sm:text-sm py-1 border-b border-green-200 dark:border-green-800">
                      <span className="text-muted-foreground">{detail.description}</span>
                      <span className="font-medium">{formatCurrency(detail.whtAmount)} ({detail.whtRate}%)</span>
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
              <p className="font-medium">{incomeData.transactionCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Invoices</p>
              <p className="font-medium">{incomeData.invoiceCount}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

