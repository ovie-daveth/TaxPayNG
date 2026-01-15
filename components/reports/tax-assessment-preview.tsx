"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ReportData } from "@/lib/services/reportService"
import { formatCurrencyAmount } from "@/lib/utils/currency"
import { format } from "date-fns"
import { ArrowLeft, Printer } from "lucide-react"
import { toast } from "sonner"
import { useUserProfile } from "@/lib/hooks/useUserProfile"

interface TaxAssessmentPreviewProps {
  reportData: ReportData
  returningCurrency: "NGN" | "USD" | "GBP" | "EUR" | "CFA"
  onBack?: () => void
}

export function TaxAssessmentPreview({ reportData, returningCurrency, onBack }: TaxAssessmentPreviewProps) {
  const { profile } = useUserProfile()
  const fmt = (amount: number) => formatCurrencyAmount(amount, returningCurrency)

  const year = reportData.period.year
  const periodLabel = `Annual ${year}`

  const companyName = reportData.userInfo.businessName || profile?.businessName || "Company"
  const tin = reportData.userInfo.tin || profile?.taxId || profile?.tin || ""

  // From reportService (SME => CIT mapping)
  const revenue = reportData.tax.grossIncome || 0
  const operatingExpenses = reportData.tax.totalExpenses || 0
  const profitBeforeTax = reportData.tax.profitBeforeTax ?? reportData.tax.adjustedGrossIncome ?? (revenue - operatingExpenses)
  const capitalAllowances = reportData.tax.capitalAllowancesTotal ?? reportData.tax.capitalAllowances ?? 0
  const totalDeductions = reportData.tax.totalDeductions ?? reportData.tax.totalReliefs ?? 0
  const taxableProfit = reportData.tax.taxableIncome || 0
  const citRate = reportData.tax.citRate ?? (reportData.tax.isSmallCompany ? 0 : 30)
  const citPayable = reportData.tax.taxPayable || 0

  const logoUrl = typeof window !== "undefined" ? `${window.location.origin}/logootax_bg.png` : "/logootax_bg.png"

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=800,height=600")
    if (!printWindow) {
      toast.error("Please allow popups to print")
      return
    }

    const printGeneratedAt = format(new Date(), "M/d/yy, h:mm a")
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OTax</title>
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
      color: #111827;
    }
    .topbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 10px;
    }
    .topbar-left { width: 170px; }
    .topbar-center { flex: 1; text-align: center; }
    .topbar-right { width: 170px; display: flex; justify-content: flex-end; }
    .logo { height: 22px; width: auto; }
    img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header {
      text-align: center;
      border-bottom: 2px solid #111827;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.08em; }
    .header .sub { margin-top: 6px; font-size: 12px; color: #6b7280; }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 18px;
      font-size: 12px;
      margin-bottom: 14px;
    }
    .meta .label { color: #6b7280; font-size: 11px; }
    .meta .value { font-weight: 700; }
    .box {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      margin: 12px 0;
    }
    .box-title {
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 8px;
      color: #111827;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 6px 0;
      border-bottom: 1px dotted #d1d5db;
      font-size: 12px;
    }
    .row:last-child { border-bottom: none; }
    .row .k { color: #374151; }
    .row .v { font-weight: 800; }
    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      background: #eef2ff;
      color: #3730a3;
      font-weight: 700;
    }
    .note {
      margin-top: 10px;
      font-size: 10.5px;
      color: #6b7280;
      line-height: 1.4;
    }
    .schedule-list {
      font-size: 11.5px;
      color: #374151;
      line-height: 1.55;
      margin: 6px 0 0;
      padding-left: 16px;
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">${printGeneratedAt}</div>
    <div class="topbar-center">Tax Assessment (CIT) - ${periodLabel}</div>
    <div class="topbar-right"><img class="logo" src="${logoUrl}" alt="OTax" /></div>
  </div>

  <div class="header">
    <h1>COMPANY INCOME TAX (CIT) ASSESSMENT</h1>
    <div class="sub">TaxProMax-style assessment summary for filing</div>
  </div>

  <div class="meta">
    <div>
      <div class="label">Company Name</div>
      <div class="value">${companyName}</div>
    </div>
    <div>
      <div class="label">Tax Year</div>
      <div class="value">${year}</div>
    </div>
    <div>
      <div class="label">TIN</div>
      <div class="value">${tin || "—"}</div>
    </div>
    <div>
      <div class="label">Returning Currency</div>
      <div class="value">${returningCurrency}</div>
    </div>
  </div>

  <div class="box">
    <div class="box-title">Core Computation</div>
    <div class="row"><span class="k">Revenue (Schedule: Revenue)</span><span class="v">${fmt(revenue)}</span></div>
    <div class="row"><span class="k">Operating Expenses (Schedule: Operating Expenses)</span><span class="v">${fmt(operatingExpenses)}</span></div>
    <div class="row"><span class="k">Profit Before Tax</span><span class="v">${fmt(profitBeforeTax)}</span></div>
    <div class="row"><span class="k">Capital Allowance (Schedule: Capital Allowance)</span><span class="v">${fmt(capitalAllowances)}</span></div>
    <div class="row"><span class="k">Total Deductions</span><span class="v">${fmt(totalDeductions)}</span></div>
    <div class="row"><span class="k">Taxable Profit</span><span class="v">${fmt(taxableProfit)}</span></div>
  </div>

  <div class="box">
    <div class="box-title">CIT Result</div>
    <div class="row"><span class="k">CIT Rate</span><span class="v">${citRate}% ${reportData.tax.isSmallCompany ? `<span class="pill">Small Company (0%)</span>` : ""}</span></div>
    <div class="row"><span class="k">Company Income Tax Payable</span><span class="v">${fmt(citPayable)}</span></div>
  </div>

  <div class="box">
    <div class="box-title">TaxProMax Schedules (high-level)</div>
    <ul class="schedule-list">
      <li>Revenue</li>
      <li>Non-Current Assets</li>
      <li>Current Asset</li>
      <li>Cost of Sales</li>
      <li>Other Income</li>
      <li>Operating Expenses</li>
      <li>Current Liabilities</li>
      <li>Long Term Liabilities</li>
      <li>Ownership/Capital Structure</li>
      <li>Reserve</li>
      <li>Profit Adjustment</li>
      <li>Balancing Adjustment</li>
      <li>Loss Relieved</li>
      <li>Capital Allowance</li>
    </ul>
    <div class="note">
      Note: This printout provides a filing-ready assessment summary and schedule headings per FIRS TaxProMax user guide.
      Detailed schedule line-items (assets, liabilities, reserves, adjustments) will be added in the next iteration when we capture those inputs in OTax.
    </div>
  </div>
</body>
</html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.onload = () => setTimeout(() => printWindow.print(), 500)
  }

  return (
    <Card className="p-3 sm:p-4 md:p-6 lg:p-8 w-full mx-auto">
      <div className="flex flex-row gap-2 sm:gap-3 mb-4 sm:mb-6 justify-between items-center">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="h-8 sm:h-10 text-xs sm:text-sm">
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Back
          </Button>
        )}
        <Button variant="outline" onClick={handlePrint} className="h-8 sm:h-10 text-xs sm:text-sm ml-auto">
          <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          <span className="hidden sm:inline">Print Assessment</span>
          <span className="sm:hidden">Print</span>
        </Button>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <div className="text-center border-b border-border pb-3 sm:pb-4">
          <h1 className="text-base sm:text-lg md:text-xl font-bold mb-1">Tax Assessment (CIT)</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Period: {periodLabel} • Returning Currency: {returningCurrency}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded border">
            <div className="text-xs text-muted-foreground">Company</div>
            <div className="font-semibold">{companyName}</div>
            <div className="text-xs text-muted-foreground mt-2">TIN</div>
            <div className="font-medium">{tin || "—"}</div>
          </div>
          <div className="p-3 rounded border">
            <div className="text-xs text-muted-foreground">CIT Rate</div>
            <div className="font-semibold">{citRate}%</div>
            <div className="text-xs text-muted-foreground mt-2">CIT Payable</div>
            <div className="font-semibold">{fmt(citPayable)}</div>
          </div>
        </div>

        <div className="p-3 rounded border space-y-2">
          <div className="font-semibold text-sm">Core Computation</div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Revenue</span>
            <span className="font-medium">{fmt(revenue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Operating Expenses</span>
            <span className="font-medium">{fmt(operatingExpenses)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Profit Before Tax</span>
            <span className="font-medium">{fmt(profitBeforeTax)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Capital Allowance</span>
            <span className="font-medium">{fmt(capitalAllowances)}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-muted-foreground font-semibold">Taxable Profit</span>
            <span className="font-semibold">{fmt(taxableProfit)}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}


