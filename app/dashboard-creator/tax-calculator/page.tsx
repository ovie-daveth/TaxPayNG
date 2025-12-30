"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { TaxCalculatorForm } from "@/components/tax-calculator/form/tax-calculator-form"
import { TaxRatesInfo } from "@/components/tax-calculator/tax-rates-info"
import { TaxCalculatorSkeleton } from "@/components/ui/skeletons"
import { Sparkles, Camera, History, Printer, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TaxBreakdown } from "@/components/tax-calculator/tax-breakdown"
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "sonner"
import { format } from "date-fns"

export default function CreatorTaxCalculatorPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [showTaxResults, setShowTaxResults] = useState(false)
  const [taxResult, setTaxResult] = useState<any | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [calculations, setCalculations] = useState<any[]>([])
  const [loadingCalculations, setLoadingCalculations] = useState(false)
  const [selectedCalculation, setSelectedCalculation] = useState<any | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  const handleCalculate = (result: any) => {
    setTaxResult(result)
    setShowTaxResults(true)
  }

  const fetchCalculations = async () => {
    if (!user) {
      toast.error("Please log in to view calculations")
      return
    }

    setLoadingCalculations(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/tax-calculations/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setCalculations(data.data || [])
      } else {
        toast.error(data.error || "Failed to load calculations")
      }
    } catch (error) {
      console.error("Error fetching calculations:", error)
      toast.error("Failed to load calculations")
    } finally {
      setLoadingCalculations(false)
    }
  }

  const handleViewHistory = () => {
    setShowHistory(true)
    fetchCalculations()
  }

  const handleViewCalculation = (calculation: any) => {
    // Prepare the result object with all necessary data
    const resultData = {
      ...calculation.result,
      period: calculation.period,
      businessType: calculation.businessType,
      incomeBreakdown: calculation.incomeBreakdown,
      businessExpensesBreakdown: calculation.businessExpensesBreakdown,
      creatorExpensesBreakdown: calculation.creatorExpensesBreakdown,
    }
    setSelectedCalculation({ ...calculation, result: resultData })
    setTaxResult(resultData)
    setShowHistory(false)
    setShowTaxResults(true)
  }

  const handlePrintCalculation = (calculation: any) => {
    // Use the same print logic from TaxBreakdown
    const result = calculation.result || {}
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error("Please allow popups to print")
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
              <p class="header-date">Generated on: ${new Date(calculation.createdAt).toLocaleDateString("en-NG")}</p>
            </div>
          </div>

          <div class="section">
            <div class="highlight">
              <div class="highlight-title">Monthly Set-Aside</div>
              <div class="highlight-value">₦${(result.monthlySetAside || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
              <span class="row-value"><strong>₦${(result.grossIncome || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
            ${result.businessExpenses && result.businessExpenses > 0 ? `
              <div class="row">
                <span class="row-label">Business Expenses (Annual)</span>
                <span class="row-value" style="color: #dc2626;">-₦${result.businessExpenses.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ""}
            <div class="row">
              <span class="row-label"><strong>Adjusted Gross Income (Annual)</strong></span>
              <span class="row-value"><strong>₦${(result.adjustedGrossIncome || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Tax Reliefs & Deductions</div>
            ${result.reliefs?.rentRelief > 0 ? `
              <div class="row">
                <span class="row-label">Rent Relief (20%)</span>
                <span class="row-value" style="color: #059669;">-₦${result.reliefs.rentRelief.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ""}
            ${result.reliefs?.pension > 0 ? `
              <div class="row">
                <span class="row-label">Pension Contribution</span>
                <span class="row-value" style="color: #059669;">-₦${result.reliefs.pension.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ""}
            ${result.reliefs?.healthInsurance > 0 ? `
              <div class="row">
                <span class="row-label">Health Insurance</span>
                <span class="row-value" style="color: #059669;">-₦${result.reliefs.healthInsurance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ""}
            ${result.reliefs?.housingFund > 0 ? `
              <div class="row">
                <span class="row-label">National Housing Fund (NHF)</span>
                <span class="row-value" style="color: #059669;">-₦${result.reliefs.housingFund.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ""}
            ${result.reliefs?.transportAllowance > 0 ? `
              <div class="row">
                <span class="row-label">Transport Allowance Exemption</span>
                <span class="row-value" style="color: #059669;">-₦${result.reliefs.transportAllowance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ""}
            ${result.reliefs?.lifeInsurance > 0 ? `
              <div class="row">
                <span class="row-label">Life Insurance</span>
                <span class="row-value" style="color: #059669;">-₦${result.reliefs.lifeInsurance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ""}
            ${result.reliefs?.charitable > 0 ? `
              <div class="row">
                <span class="row-label">Charitable Donations</span>
                <span class="row-value" style="color: #059669;">-₦${result.reliefs.charitable.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ""}
            <div class="row">
              <span class="row-label"><strong>Total Reliefs (Annual)</strong></span>
              <span class="row-value" style="color: #059669;"><strong>-₦${(result.totalReliefs || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Tax Calculation</div>
            <div class="row">
              <span class="row-label">Taxable Income (Annual)</span>
              <span class="row-value">₦${(result.taxableIncome || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            ${result.taxBrackets?.map((bracket: any) => `
              <div class="row">
                <span class="row-label">${bracket.rate === 0 ? "Tax-free" : `${bracket.rate}% on ₦${bracket.amount.toLocaleString("en-NG")}`}</span>
                <span class="row-value">${bracket.rate === 0 ? "₦0" : `₦${bracket.tax.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
              </div>
            `).join("") || ""}
            <div class="highlight">
              <div class="highlight-title">Total Tax Payable (Annual)</div>
              <div class="highlight-value">₦${(result.totalTax || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  if (isLoading) {
    return (
      <main className="px-4 sm:px-6 lg:px-8 py-6">
        <TaxCalculatorSkeleton />
      </main>
    )
  }

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Card className="hidden md:block relative overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 px-6 sm:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary">
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Tax Calculator for Creators
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Estimate PAYE, personal income tax, and deductibles for your creator business. Track sponsorships, ad
              revenue, affiliate payouts, and creator-specific expenses in one calculation designed for Nigeria's 2025 tax rules.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1">
                <Camera className="w-3.5 h-3.5 text-primary" />
                Optimized for content income streams
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                Updated with 2025 personal reliefs
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">
        <div className="max-w-4xl mx-auto lg:mx-0 lg:max-w-none">
          <TaxCalculatorForm onCalculate={handleCalculate} onViewHistory={handleViewHistory} defaultUserType="creator" lockUserType />
        </div>
        <div className="hidden lg:block">
          <TaxRatesInfo />
        </div>
      </div>

      <Dialog 
        open={showTaxResults} 
        onOpenChange={(open) => {
          setShowTaxResults(open)
          if (!open) {
            setSelectedCalculation(null)
            setTaxResult(null)
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-3 sm:px-4 md:px-6 pt-2 sm:pt-3 md:pt-4 pb-1.5 sm:pb-2 md:pb-3 border-b border-border">
            <DialogTitle className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">Tax Calculation Results</DialogTitle>
            {(taxResult || selectedCalculation?.result) && (
              <DialogDescription className="text-[10px] sm:text-xs md:text-sm">
                Detailed breakdown of your tax computation for the selected period.
                {selectedCalculation && (
                  <span className="block mt-0.5 sm:mt-1 text-[9px] sm:text-xs">
                    Calculated on: {format(new Date(selectedCalculation.createdAt), "dd MMM yyyy 'at' HH:mm")}
                  </span>
                )}
              </DialogDescription>
            )}
          </DialogHeader>
          {(taxResult || selectedCalculation?.result) && (
            <div className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6">
              <TaxBreakdown result={taxResult || selectedCalculation?.result} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader className="px-0 sm:px-0">
            <DialogTitle className="text-base sm:text-lg">Previous Tax Calculations</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              View and print your previously saved tax calculations
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 sm:mt-4">
            {loadingCalculations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              </div>
            ) : calculations.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm px-2">
                No previous calculations found. Calculate and save your first tax calculation to see it here.
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {calculations.map((calculation) => (
                  <div
                    key={calculation.id}
                    className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <span className="font-semibold text-xs sm:text-sm capitalize">{calculation.businessType}</span>
                          <span className="text-muted-foreground hidden sm:inline">•</span>
                          <span className="text-xs sm:text-sm text-muted-foreground capitalize">{calculation.period}</span>
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                          {format(new Date(calculation.createdAt), "dd MMM yyyy 'at' HH:mm")}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                          <span className="break-words">
                            <span className="text-muted-foreground">Income: </span>
                            <span className="font-medium">₦{(calculation.income || 0).toLocaleString()}</span>
                          </span>
                          <span className="break-words">
                            <span className="text-muted-foreground">Tax: </span>
                            <span className="font-medium text-primary">
                              ₦{(calculation.result?.totalTax || 0).toLocaleString()}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:ml-4 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCalculation(calculation)}
                          className="flex-1 sm:flex-initial text-xs sm:text-sm h-8 sm:h-9"
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintCalculation(calculation)}
                          className="px-2 sm:px-3 h-8 sm:h-9"
                        >
                          <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

