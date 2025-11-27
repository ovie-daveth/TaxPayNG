"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ReportData } from "@/lib/services/reportService"
import { formatCurrencyAmount } from "@/lib/utils/currency"
import { format } from "date-fns"
import { Printer } from "lucide-react"
import { toast } from "sonner"

interface SelfAssessmentPreviewProps {
  reportData: ReportData
  formData: {
    includeIncome: boolean
    includeExpenses: boolean
    includeTax: boolean
    includeReliefs: boolean
  }
}

export function SelfAssessmentPreview({ reportData, formData }: SelfAssessmentPreviewProps) {
  const formatCurrency = (amount: number) => formatCurrencyAmount(amount, 'NGN')
  
  const periodLabel = reportData.period.periodType === 'annual' 
    ? `Annual ${reportData.period.year}`
    : reportData.period.quarter 
    ? `Q${reportData.period.quarter} ${reportData.period.year}`
    : `${format(new Date(reportData.period.startDate), 'MMM dd')} - ${format(new Date(reportData.period.endDate), 'MMM dd, yyyy')}`

  const handlePrint = () => {
    // Create a print window with the assessment content
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
  <title>Self-Assessment Tax Return - ${periodLabel}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 20mm;
      }
      body {
        margin: 0;
      }
      .no-print {
        display: none !important;
      }
    }
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
      background: white;
      color: #000;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
    }
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .section-title {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 15px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    .info-item {
      margin-bottom: 10px;
    }
    .info-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 3px;
    }
    .info-value {
      font-weight: bold;
      font-size: 14px;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dotted #ccc;
    }
    .amount-label {
      font-size: 13px;
    }
    .amount-value {
      font-weight: bold;
      font-size: 13px;
    }
    .total-row {
      border-top: 2px solid #000;
      padding-top: 10px;
      margin-top: 10px;
      font-weight: bold;
      font-size: 14px;
    }
    .declaration {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      font-size: 11px;
      color: #666;
    }
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 30px;
    }
    .signature-line {
      border-top: 1px solid #000;
      padding-top: 5px;
      font-size: 11px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>SELF-ASSESSMENT TAX RETURN</h1>
    <p style="font-size: 12px; color: #666;">Federal Inland Revenue Service (FIRS) / Lagos Internal Revenue Service (LIRS)</p>
    <p style="font-weight: bold; margin-top: 10px;">Tax Year: ${periodLabel}</p>
  </div>

  <div class="section">
    <div class="section-title">Taxpayer Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Full Name</div>
        <div class="info-value">${reportData.userInfo.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Tax Identification Number</div>
        <div class="info-value">${reportData.userInfo.tin || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Business Name</div>
        <div class="info-value">${reportData.userInfo.businessName || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Business Type</div>
        <div class="info-value">${reportData.userInfo.businessType || 'N/A'}</div>
      </div>
      ${reportData.userInfo.address ? `
      <div class="info-item" style="grid-column: 1 / -1;">
        <div class="info-label">Business Address</div>
        <div class="info-value">${reportData.userInfo.address}</div>
      </div>
      ` : ''}
    </div>
  </div>

  ${formData.includeIncome ? `
  <div class="section">
    <div class="section-title">Income Summary</div>
    <div class="amount-row">
      <span class="amount-label">Gross Income</span>
      <span class="amount-value">${formatCurrency(reportData.tax.grossIncome)}</span>
    </div>
    ${formData.includeExpenses ? `
    <div class="amount-row">
      <span class="amount-label">Business Expenses</span>
      <span class="amount-value" style="color: #dc2626;">-${formatCurrency(reportData.expenses.totalExpenses)}</span>
    </div>
    ` : ''}
    <div class="amount-row total-row">
      <span>Net Income</span>
      <span>${formatCurrency(reportData.tax.netIncome)}</span>
    </div>
  </div>
  ` : ''}

  ${formData.includeReliefs ? `
  <div class="section">
    <div class="section-title">Reliefs and Deductions</div>
    ${reportData.tax.reliefs.pensionContribution > 0 ? `
    <div class="amount-row">
      <span class="amount-label">Pension Contribution</span>
      <span class="amount-value" style="color: #059669;">-${formatCurrency(reportData.tax.reliefs.pensionContribution)}</span>
    </div>
    ` : ''}
    ${reportData.tax.reliefs.nhfContribution > 0 ? `
    <div class="amount-row">
      <span class="amount-label">NHF Contribution</span>
      <span class="amount-value" style="color: #059669;">-${formatCurrency(reportData.tax.reliefs.nhfContribution)}</span>
    </div>
    ` : ''}
    ${reportData.tax.reliefs.healthInsurance > 0 ? `
    <div class="amount-row">
      <span class="amount-label">Health Insurance (NHIS)</span>
      <span class="amount-value" style="color: #059669;">-${formatCurrency(reportData.tax.reliefs.healthInsurance)}</span>
    </div>
    ` : ''}
    ${reportData.tax.reliefs.lifeInsurance > 0 ? `
    <div class="amount-row">
      <span class="amount-label">Life Insurance</span>
      <span class="amount-value" style="color: #059669;">-${formatCurrency(reportData.tax.reliefs.lifeInsurance)}</span>
    </div>
    ` : ''}
    ${reportData.tax.reliefs.charitableDonations > 0 ? `
    <div class="amount-row">
      <span class="amount-label">Charitable Donations</span>
      <span class="amount-value" style="color: #059669;">-${formatCurrency(reportData.tax.reliefs.charitableDonations)}</span>
    </div>
    ` : ''}
    <div class="amount-row total-row">
      <span>Total Reliefs</span>
      <span style="color: #059669;">-${formatCurrency(reportData.tax.totalReliefs)}</span>
    </div>
  </div>
  ` : ''}

  ${formData.includeTax ? `
  <div class="section">
    <div class="section-title">Tax Calculation</div>
    <div class="amount-row">
      <span class="amount-label">Taxable Income</span>
      <span class="amount-value">${formatCurrency(reportData.tax.taxableIncome)}</span>
    </div>
    ${reportData.tax.taxBrackets.map((bracket, index) => `
    <div class="amount-row">
      <span class="amount-label">${formatCurrency(bracket.amount)} @ ${bracket.rate}%</span>
      <span class="amount-value">${formatCurrency(bracket.tax)}</span>
    </div>
    `).join('')}
    <div class="amount-row total-row">
      <span>Total Tax Payable</span>
      <span>${formatCurrency(reportData.tax.taxPayable)}</span>
    </div>
  </div>
  ` : ''}

  <div class="declaration">
    <p>I declare that the information provided in this return is true, correct and complete to the best of my knowledge and belief.</p>
    <div class="signature-section">
      <div class="signature-line">Signature</div>
      <div class="signature-line">Date</div>
    </div>
  </div>
</body>
</html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  return (
    <Card className="p-8 max-w-4xl mx-auto">
      {/* Action Buttons */}
      <div className="flex gap-3 mb-6 justify-end">
        <Button
          variant="outline"
          onClick={handlePrint}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Assessment
        </Button>
      </div>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center border-b border-border pb-6">
          <h1 className="text-2xl font-bold mb-2">SELF-ASSESSMENT TAX RETURN</h1>
          <p className="text-sm text-muted-foreground">
            Federal Inland Revenue Service (FIRS) / Lagos Internal Revenue Service (LIRS)
          </p>
          <p className="text-sm font-medium mt-2">Tax Year: {periodLabel}</p>
        </div>

        {/* Taxpayer Information */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2">Taxpayer Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Full Name</p>
              <p className="font-medium">{reportData.userInfo.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tax Identification Number</p>
              <p className="font-medium">{reportData.userInfo.tin || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Business Name</p>
              <p className="font-medium">{reportData.userInfo.businessName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Business Type</p>
              <p className="font-medium">{reportData.userInfo.businessType || 'N/A'}</p>
            </div>
            {reportData.userInfo.address && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Business Address</p>
                <p className="font-medium">{reportData.userInfo.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Income Summary */}
        {formData.includeIncome && (
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2">Income Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Gross Income</span>
                <span className="font-medium">{formatCurrency(reportData.tax.grossIncome)}</span>
            </div>
              {formData.includeExpenses && (
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Business Expenses</span>
                  <span className="font-medium text-red-600">-{formatCurrency(reportData.expenses.totalExpenses)}</span>
            </div>
              )}
            <div className="flex justify-between py-2 border-t border-border font-semibold">
              <span>Net Income</span>
                <span>{formatCurrency(reportData.tax.netIncome)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Reliefs and Deductions */}
        {formData.includeReliefs && (
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2">Reliefs and Deductions</h2>
          <div className="space-y-2 text-sm">
              {reportData.tax.reliefs.pensionContribution > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Pension Contribution</span>
                  <span className="font-medium text-green-600">-{formatCurrency(reportData.tax.reliefs.pensionContribution)}</span>
                </div>
              )}
              {reportData.tax.reliefs.nhfContribution > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">NHF Contribution</span>
                  <span className="font-medium text-green-600">-{formatCurrency(reportData.tax.reliefs.nhfContribution)}</span>
                </div>
              )}
              {reportData.tax.reliefs.healthInsurance > 0 && (
            <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Health Insurance (NHIS)</span>
                  <span className="font-medium text-green-600">-{formatCurrency(reportData.tax.reliefs.healthInsurance)}</span>
            </div>
              )}
              {reportData.tax.reliefs.lifeInsurance > 0 && (
            <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Life Insurance</span>
                  <span className="font-medium text-green-600">-{formatCurrency(reportData.tax.reliefs.lifeInsurance)}</span>
            </div>
              )}
              {reportData.tax.reliefs.charitableDonations > 0 && (
            <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Charitable Donations</span>
                  <span className="font-medium text-green-600">-{formatCurrency(reportData.tax.reliefs.charitableDonations)}</span>
            </div>
              )}
            <div className="flex justify-between py-2 border-t border-border font-semibold">
              <span>Total Reliefs</span>
                <span className="text-green-600">-{formatCurrency(reportData.tax.totalReliefs)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tax Calculation */}
        {formData.includeTax && (
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2">Tax Calculation</h2>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Taxable Income</span>
                <span className="font-medium">{formatCurrency(reportData.tax.taxableIncome)}</span>
              </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              {reportData.tax.taxBrackets.map((bracket, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {formatCurrency(bracket.amount)} @ {bracket.rate}%
                  </span>
                  <span>{formatCurrency(bracket.tax)}</span>
            </div>
              ))}
            <div className="flex justify-between pt-3 border-t border-border font-bold text-base">
              <span>Total Tax Payable</span>
                <span className="text-primary">{formatCurrency(reportData.tax.taxPayable)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Declaration */}
        <div className="border-t border-border pt-6">
          <p className="text-xs text-muted-foreground mb-4">
            I declare that the information provided in this return is true, correct and complete to the best of my
            knowledge and belief.
          </p>
          <div className="grid grid-cols-2 gap-8 mt-6">
            <div>
              <div className="border-t border-border pt-2">
                <p className="text-xs text-muted-foreground">Signature</p>
              </div>
            </div>
            <div>
              <div className="border-t border-border pt-2">
                <p className="text-xs text-muted-foreground">Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
