"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Printer, FileText, Wallet, Loader2 } from "lucide-react"
import { formatCurrencyAmount } from "@/lib/utils/currency"
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "sonner"

interface TaxBreakdownProps {
  result: any
  calculationInputs?: {
    businessType?: string
    period?: string
    income?: number
    rentPaid?: number
    pensionContribution?: number
    healthInsurance?: number
    housingFund?: number
    lifeInsurance?: number
    charitableDonations?: number
    businessExpenses?: number
    dependents?: number
  }
}

export function TaxBreakdown({ result, calculationInputs }: TaxBreakdownProps) {
  const { user } = useAuth()
  const [isPrinting, setIsPrinting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // Determine the period - all calculations are done in annual amounts
  const period = result.period || "yearly"
  const isAnnual = period === "yearly"
  
  // Helper to format with period label
  const formatWithPeriod = (amount: number, showPeriod: boolean = true) => {
    const formatted = `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    return showPeriod ? `${formatted} ${isAnnual ? "(Annual)" : "(Monthly)"}` : formatted
  }

  // Calculate monthly equivalents for annual amounts
  const getMonthlyEquivalent = (annualAmount: number) => {
    return annualAmount / 12
  }

  const handlePrint = () => {
    setIsPrinting(true)
    try {
      // Create a print-friendly HTML version
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error("Please allow popups to print")
        setIsPrinting(false)
        return
      }

      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Tax Calculation Report</title>
            <style>
              @media print {
                body { margin: 0; }
                .no-print { display: none !important; }
              }
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
                background: white;
                color: #000;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #059669;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .header-left {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
              }
              .header img {
                height: 35px;
                margin-bottom: 5px;
              }
              .header-company {
                font-size: 11px;
                color: #6b7280;
                margin: 0;
              }
              .header-right {
                text-align: right;
              }
              .header h1 {
                color: #059669;
                margin: 0 0 5px 0;
                font-size: 24px;
              }
              .header-date {
                font-size: 12px;
                color: #6b7280;
                margin: 0;
              }
              .section {
                margin-bottom: 25px;
                page-break-inside: avoid;
              }
              .section-title {
                font-size: 16px;
                font-weight: bold;
                color: #059669;
                margin-bottom: 10px;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 5px;
              }
              .row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px dotted #e5e7eb;
              }
              .row-label {
                color: #6b7280;
              }
              .row-value {
                font-weight: 600;
                color: #000;
              }
              .highlight {
                background: #f0fdf4;
                padding: 15px;
                border-left: 4px solid #059669;
                margin: 15px 0;
              }
              .highlight-title {
                font-weight: bold;
                font-size: 14px;
                color: #059669;
                margin-bottom: 5px;
              }
              .highlight-value {
                font-size: 20px;
                font-weight: bold;
                color: #000;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-left">
                <img src="${window.location.origin}/logootax_bg.png" alt="OTax Logo" />
                <p class="header-company">OTax Digital Services Limited</p>
              </div>
              <div class="header-right">
                <h1>Tax Calculation Report</h1>
                <p class="header-date">Generated on: ${new Date().toLocaleDateString("en-NG")}</p>
              </div>
            </div>

            <div class="section">
              <div class="highlight">
                <div class="highlight-title">Monthly Set-Aside</div>
                <div class="highlight-value">₦${result.monthlySetAside.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Income Breakdown</div>
              ${result.incomeBreakdown && result.incomeBreakdown.length > 0 ? result.incomeBreakdown.map((source: any) => {
                const typeLabel = source.type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
                return `
                  <div class="row">
                    <span class="row-label">${typeLabel}</span>
                    <span class="row-value">₦${source.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                `
              }).join("") : ""}
              <div class="row">
                <span class="row-label"><strong>Gross Income (Annual)</strong></span>
                <span class="row-value"><strong>₦${result.grossIncome.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              </div>
              ${result.businessExpenses && result.businessExpenses > 0 ? `
                <div class="row">
                  <span class="row-label">Business Expenses (Annual)</span>
                  <span class="row-value" style="color: #dc2626;">-₦${result.businessExpenses.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ""}
              <div class="row">
                <span class="row-label"><strong>Adjusted Gross Income (Annual)</strong></span>
                <span class="row-value"><strong>₦${result.adjustedGrossIncome.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              </div>
            </div>

            ${result.businessExpensesBreakdown && result.businessExpensesBreakdown.length > 0 ? `
              <div class="section">
                <div class="section-title">Business Expenses Breakdown</div>
                ${result.businessExpensesBreakdown.map((expense: any) => {
                  const typeLabel = expense.type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
                  return `
                    <div class="row">
                      <span class="row-label">${typeLabel}</span>
                      <span class="row-value">₦${expense.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  `
                }).join("")}
              </div>
            ` : ""}

            <div class="section">
              <div class="section-title">Tax Reliefs & Deductions</div>
              ${result.reliefs.rentRelief > 0 ? `
                <div class="row">
                  <span class="row-label">Rent Relief (20%)</span>
                  <span class="row-value" style="color: #059669;">-₦${result.reliefs.rentRelief.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ""}
              ${result.reliefs.pension > 0 ? `
                <div class="row">
                  <span class="row-label">Pension Contribution</span>
                  <span class="row-value" style="color: #059669;">-₦${result.reliefs.pension.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ""}
              ${result.reliefs.healthInsurance > 0 ? `
                <div class="row">
                  <span class="row-label">Health Insurance</span>
                  <span class="row-value" style="color: #059669;">-₦${result.reliefs.healthInsurance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ""}
              ${result.reliefs.housingFund > 0 ? `
                <div class="row">
                  <span class="row-label">National Housing Fund (NHF)</span>
                  <span class="row-value" style="color: #059669;">-₦${result.reliefs.housingFund.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ""}
              ${result.reliefs.transportAllowance > 0 ? `
                <div class="row">
                  <span class="row-label">Transport Allowance Exemption</span>
                  <span class="row-value" style="color: #059669;">-₦${result.reliefs.transportAllowance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ""}
              ${result.reliefs.lifeInsurance > 0 ? `
                <div class="row">
                  <span class="row-label">Life Insurance</span>
                  <span class="row-value" style="color: #059669;">-₦${result.reliefs.lifeInsurance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ""}
              ${result.reliefs.charitable > 0 ? `
                <div class="row">
                  <span class="row-label">Charitable Donations</span>
                  <span class="row-value" style="color: #059669;">-₦${result.reliefs.charitable.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ""}
              <div class="row">
                <span class="row-label"><strong>Total Reliefs (Annual)</strong></span>
                <span class="row-value" style="color: #059669;"><strong>-₦${result.totalReliefs.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Tax Calculation</div>
              <div class="row">
                <span class="row-label">Taxable Income (Annual)</span>
                <span class="row-value">₦${result.taxableIncome.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              ${result.taxBrackets.map((bracket: any) => `
                <div class="row">
                  <span class="row-label">${bracket.rate === 0 ? "Tax-free" : `${bracket.rate}% on ₦${bracket.amount.toLocaleString("en-NG")}`}</span>
                  <span class="row-value">${bracket.rate === 0 ? "₦0" : `₦${bracket.tax.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
                </div>
              `).join("")}
              <div class="highlight">
                <div class="highlight-title">Total Tax Payable (Annual)</div>
                <div class="highlight-value">₦${result.totalTax.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            ${result.quarterlyPayments && result.quarterlyPayments.length > 0 ? `
              <div class="section">
                <div class="section-title">Quarterly Payment Schedule</div>
                ${result.quarterlyPayments.map((payment: any) => `
                  <div class="row">
                    <span class="row-label">${payment.quarter}</span>
                    <span class="row-value">₦${payment.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                `).join("")}
              </div>
            ` : ""}

            <div class="footer">
              <p>Generated by TaxPayNG</p>
            </div>
          </body>
        </html>
      `

      printWindow.document.write(printHTML)
      printWindow.document.close()
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          setIsPrinting(false)
        }, 250)
      }
    } catch (error) {
      console.error("Error printing:", error)
      toast.error("Failed to print. Please try again.")
      setIsPrinting(false)
    }
  }

  const handleSaveCalculation = async () => {
    if (!user) {
      toast.error("Please log in to save calculations")
      return
    }

    setIsSaving(true)
    try {
      const token = await user.getIdToken()
      
      // Prepare the data to save
      const saveData = {
        businessType: calculationInputs?.businessType || result.businessType || "freelancer",
        period: calculationInputs?.period || result.period || "yearly",
        income: calculationInputs?.income || result.grossIncome || 0,
        rentPaid: calculationInputs?.rentPaid || result.reliefs?.rentRelief ? (result.reliefs.rentRelief / 0.2) : 0,
        pensionContribution: calculationInputs?.pensionContribution || result.reliefs?.pension || 0,
        healthInsurance: calculationInputs?.healthInsurance || result.reliefs?.healthInsurance || 0,
        housingFund: calculationInputs?.housingFund || result.reliefs?.housingFund || 0,
        lifeInsurance: calculationInputs?.lifeInsurance || result.reliefs?.lifeInsurance || 0,
        charitableDonations: calculationInputs?.charitableDonations || result.reliefs?.charitable || 0,
        businessExpenses: calculationInputs?.businessExpenses || result.businessExpenses || 0,
        dependents: calculationInputs?.dependents || 0,
        result: result,
        incomeBreakdown: result.incomeBreakdown,
        businessExpensesBreakdown: result.businessExpensesBreakdown,
        creatorExpensesBreakdown: result.creatorExpensesBreakdown,
      }

      const response = await fetch("/api/tax-calculations/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(saveData),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Tax calculation saved successfully")
      } else {
        toast.error(data.error || "Failed to save calculation")
      }
    } catch (error) {
      console.error("Error saving calculation:", error)
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Tax Breakdown</h2>
          <p className="text-sm text-muted-foreground mt-1">
            All amounts shown are annual. Monthly equivalents are provided where applicable.
          </p>
        </div>
        <Badge variant="secondary">2025</Badge>
      </div>

      <div className="space-y-4">
        {/* Monthly Set-Aside Card */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border-2 border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Monthly Set-Aside</h3>
          </div>
          <p className="text-2xl font-bold text-primary">₦{result.monthlySetAside.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Save this amount each month for tax payments
            <span className="block mt-1 text-[10px]">
              (Annual tax: ₦{result.totalTax.toLocaleString()})
            </span>
          </p>
        </div>

        {/* Income Section */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">Income (Annual)</h3>
          <div className="space-y-2">
            {/* Income Breakdown by Source */}
            {result.incomeBreakdown && result.incomeBreakdown.length > 0 && (
              <div className="mb-3 pb-3 border-b border-border">
                <p className="text-xs text-muted-foreground mb-2">Income Sources (Annual):</p>
                <div className="space-y-1.5">
                  {result.incomeBreakdown.map((source: any, index: number) => {
                    // Get readable label for income type
                    const allTypes = [
                      { value: "salary", label: "Salary (PAYE)" },
                      { value: "bonus", label: "Bonus" },
                      { value: "allowance", label: "Allowances" },
                      { value: "freelance", label: "Freelance Work" },
                      { value: "consulting", label: "Consulting" },
                      { value: "contract", label: "Contract Work" },
                      { value: "sponsorship", label: "Brand Sponsorships" },
                      { value: "ad_revenue", label: "Ad Revenue" },
                      { value: "affiliate", label: "Affiliate Income" },
                      { value: "brand_deal", label: "Brand Deals" },
                      { value: "content_licensing", label: "Content Licensing" },
                      { value: "merchandise", label: "Merchandise Sales" },
                      { value: "subscription", label: "Subscription Revenue" },
                      { value: "courses", label: "Online Courses/Coaching" },
                      { value: "events", label: "Events & Speaking" },
                      { value: "business_income", label: "Business Income" },
                      { value: "sales", label: "Product/Service Sales" },
                      { value: "rental", label: "Rental Income" },
                      { value: "investment", label: "Investment Income" },
                      { value: "dividends", label: "Dividends" },
                      { value: "other", label: "Other Income" },
                    ]
                    const typeLabel = allTypes.find(t => t.value === source.type)?.label || source.type.replace(/_/g, " ")
                    const hasCurrencyConversion = source.originalCurrency && source.originalCurrency !== "NGN"
                    const monthlyAmount = getMonthlyEquivalent(source.amount)
                    
                    return (
                      <div key={index} className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {typeLabel}
                          </span>
                          <div className="flex flex-col items-end">
                            <span className="font-medium">₦{source.amount.toLocaleString()} (Annual)</span>
                            <span className="text-muted-foreground text-[10px]">
                              ≈ ₦{monthlyAmount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                            </span>
                            {hasCurrencyConversion && source.originalAmount && (
                              <span className="text-muted-foreground text-[10px]">
                                {formatCurrencyAmount(source.originalAmount, source.originalCurrency)} converted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gross Income (Annual)</span>
              <div className="flex flex-col items-end">
                <span className="font-medium">₦{result.grossIncome.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  ≈ ₦{getMonthlyEquivalent(result.grossIncome).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                </span>
              </div>
            </div>
            {result.businessExpenses > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Business Expenses (Annual)</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-red-600">-₦{result.businessExpenses.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.businessExpenses).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="font-medium">Adjusted Gross Income (Annual)</span>
              <div className="flex flex-col items-end">
                <span className="font-semibold">₦{result.adjustedGrossIncome.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  ≈ ₦{getMonthlyEquivalent(result.adjustedGrossIncome).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reliefs & Deductions */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">Tax Reliefs & Deductions (Annual)</h3>
          <div className="space-y-2">
            {result.reliefs.rentRelief > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rent Relief (20%)</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.rentRelief.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.rentRelief).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            {result.reliefs.pension > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pension Contribution</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.pension.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.pension).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            {result.reliefs.healthInsurance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Health Insurance</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.healthInsurance.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.healthInsurance).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            {result.reliefs.housingFund > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">National Housing Fund (NHF)</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.housingFund.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.housingFund).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            {result.reliefs.transportAllowance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Transport Allowance Exemption</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.transportAllowance.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.transportAllowance).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            {result.reliefs.lifeInsurance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Life Insurance</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.lifeInsurance.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.lifeInsurance).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            {result.reliefs.charitable > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Charitable Donations</span>
                <div className="flex flex-col items-end">
                  <span className="font-medium text-green-600">-₦{result.reliefs.charitable.toLocaleString()} (Annual)</span>
                  <span className="text-xs text-muted-foreground">
                    ≈ -₦{getMonthlyEquivalent(result.reliefs.charitable).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="font-medium">Total Reliefs (Annual)</span>
              <div className="flex flex-col items-end">
                <span className="font-semibold text-green-600">-₦{result.totalReliefs.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  ≈ -₦{getMonthlyEquivalent(result.totalReliefs).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Calculation */}
        <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary/20">
          <h3 className="font-semibold text-sm mb-3">Tax Calculation</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxable Income (Annual)</span>
              <div className="flex flex-col items-end">
                <span className="font-medium">₦{result.taxableIncome.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  ≈ ₦{getMonthlyEquivalent(result.taxableIncome).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                </span>
              </div>
            </div>
            {result.taxBrackets.map((bracket: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {bracket.rate === 0 ? "Tax-free" : `${bracket.rate}% on`} ₦{bracket.amount.toLocaleString()} (Annual)
                </span>
                <span className="font-medium">{bracket.rate === 0 ? "₦0" : `₦${bracket.tax.toLocaleString()}`}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t-2 border-primary/20">
              <div className="flex flex-col">
                <span className="font-semibold text-base">Total Tax Payable (Annual)</span>
                <span className="text-xs text-muted-foreground">≈ ₦{result.monthlySetAside.toLocaleString()}/month</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold text-xl text-primary">₦{result.totalTax.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  Monthly: ₦{result.monthlySetAside.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quarterly Breakdown */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">Quarterly Payment Schedule (Annual Total: ₦{result.totalTax.toLocaleString()})</h3>
          <div className="grid grid-cols-2 gap-3">
            {result.quarterlyPayments.map((payment: any, index: number) => (
              <div key={index} className="bg-background rounded p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{payment.quarter}</p>
                <p className="font-semibold">₦{payment.amount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Quarterly payment</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            💡 Each quarterly payment is 25% of your annual tax (₦{result.totalTax.toLocaleString()})
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-6 border-t border-border">
        <Button
          variant="outline"
          className="flex-1 bg-transparent"
          onClick={handlePrint}
          disabled={isPrinting}
        >
          {isPrinting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Preparing...
            </>
          ) : (
            <>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </>
          )}
        </Button>
        <Button
          className="flex-1"
          onClick={handleSaveCalculation}
          disabled={isSaving || !user}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Save Calculation
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
