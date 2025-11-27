"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, FileText, Download, Loader2, Info, Calculator, Shield } from "lucide-react"
import { SelfAssessmentPreview } from "@/components/reports/self-assessment-preview"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { reportService, ReportData } from "@/lib/services"
import { toast } from "sonner"

export default function GenerateSelfAssessmentPage() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [showPreview, setShowPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [formData, setFormData] = useState({
    taxYear: new Date().getFullYear().toString(),
    period: 'annual' as 'annual' | 'q1' | 'q2' | 'q3' | 'q4',
    includeIncome: true,
    includeExpenses: true,
    includeTax: true,
    includeReliefs: true,
    includeDocuments: false
  })

  // Calculate period dates based on year and period
  const getPeriodDates = (year: number, period: string) => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-12
    
    if (period === 'annual') {
      // If current year, use today as end date; otherwise use Dec 31
      const endDate = year === currentYear 
        ? now.toISOString().split('T')[0] // Today's date
        : `${year}-12-31`
      return {
        startDate: `${year}-01-01`,
        endDate,
        periodType: 'annual' as const
      }
    }
    
    const quarters: { [key: string]: { start: string; end: string; endMonth: number } } = {
      q1: { start: `${year}-01-01`, end: `${year}-03-31`, endMonth: 3 },
      q2: { start: `${year}-04-01`, end: `${year}-06-30`, endMonth: 6 },
      q3: { start: `${year}-07-01`, end: `${year}-09-30`, endMonth: 9 },
      q4: { start: `${year}-10-01`, end: `${year}-12-31`, endMonth: 12 }
    }
    
    const quarter = quarters[period]
    // If current year and current quarter, use today as end date; otherwise use quarter end
    const endDate = (year === currentYear && currentMonth <= quarter.endMonth)
      ? now.toISOString().split('T')[0] // Today's date
      : quarter.end
    
    return {
      startDate: quarter.start,
      endDate,
      periodType: 'quarterly' as const,
      quarter: parseInt(period[1])
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid || !profile?.userId) {
      toast.error("Please log in to generate reports")
      return
    }

    setIsGenerating(true)
    try {
      const year = parseInt(formData.taxYear)
      const periodInfo = getPeriodDates(year, formData.period)
      
      const period = {
        startDate: periodInfo.startDate,
        endDate: periodInfo.endDate,
        year,
        quarter: periodInfo.quarter,
        periodType: periodInfo.periodType
      }

      // For self-assessment, use only transaction data (no invoices)
      const data = await reportService.generateReportData(
        profile.userId,
        period,
        false // includeInvoices = false (use only transactions)
      )

      // Generate report title
      const periodLabel = period.periodType === 'annual' 
        ? `Annual ${period.year}`
        : period.quarter 
        ? `Q${period.quarter} ${period.year}`
        : `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`

      const title = `Self-Assessment Filing - ${periodLabel}`

      // Save the report
      await reportService.saveReport(
        profile.userId,
        title,
        'Self-Assessment',
        data,
        'completed'
      )

      setReportData(data)
      setShowPreview(true)
      toast.success("Report generated and saved successfully")
    } catch (error) {
      console.error("Error generating report:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate report")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* <DashboardNav /> */}
        <main className="px-4 py-6 max-w-4xl mx-auto">
          {!showPreview ? (
            <div className="space-y-6">
              {/* Back Button */}
              <Link href="/dashboard/reports">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Reports
                </Button>
              </Link>

              {/* Header Section */}
              <Card className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-semibold mb-2">Generate Self-Assessment Tax Return</h1>
                    <p className="text-muted-foreground">
                      Create a comprehensive self-assessment tax return report for filing with the Federal Inland Revenue Service (FIRS) 
                      or Lagos Internal Revenue Service (LIRS). This report includes your income, expenses, reliefs, and calculated tax liability.
                    </p>
                  </div>
                </div>

                <Alert className="mt-4">
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    <strong>What is a Self-Assessment Tax Return?</strong> A self-assessment tax return is a document that taxpayers use to 
                    report their income, claim deductions and reliefs, and calculate their tax liability for a given tax year. 
                    In Nigeria, self-employed individuals, freelancers, and small business owners are required to file self-assessment returns 
                    annually with the tax authorities. This report helps you prepare and file your tax return accurately.
                  </AlertDescription>
                </Alert>
              </Card>

              {/* Configuration Form */}
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Report Configuration
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure your self-assessment filing details and select what to include in the report
                  </p>
                </div>

              <form
                className="space-y-6"
                onSubmit={handleGenerate}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax-year">Tax Year</Label>
                    <Select 
                      value={formData.taxYear}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, taxYear: value }))}
                    >
                      <SelectTrigger id="tax-year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period">Period</Label>
                    <Select 
                      value={formData.period}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, period: value as any }))}
                    >
                      <SelectTrigger id="period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="q1">Q1 (Jan-Mar)</SelectItem>
                        <SelectItem value="q2">Q2 (Apr-Jun)</SelectItem>
                        <SelectItem value="q3">Q3 (Jul-Sep)</SelectItem>
                        <SelectItem value="q4">Q4 (Oct-Dec)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="font-semibold mb-4">Include in Report</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-income" 
                        checked={formData.includeIncome}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeIncome: !!checked }))}
                      />
                      <Label htmlFor="include-income" className="cursor-pointer font-normal">
                        Income Statement (All transactions)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-expenses" 
                        checked={formData.includeExpenses}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeExpenses: !!checked }))}
                      />
                      <Label htmlFor="include-expenses" className="cursor-pointer font-normal">
                        Expense Breakdown
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-tax" 
                        checked={formData.includeTax}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeTax: !!checked }))}
                      />
                      <Label htmlFor="include-tax" className="cursor-pointer font-normal">
                        Tax Calculation Details
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-reliefs" 
                        checked={formData.includeReliefs}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeReliefs: !!checked }))}
                      />
                      <Label htmlFor="include-reliefs" className="cursor-pointer font-normal">
                        Reliefs and Deductions
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-documents"
                        checked={formData.includeDocuments}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeDocuments: !!checked }))}
                      />
                      <Label htmlFor="include-documents" className="cursor-pointer font-normal">
                        Supporting Documents (Receipts & Invoices)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Link href="/dashboard/reports" className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" className="flex-1" disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Self-Assessment
                      </>
                    )}
                  </Button>
                </div>
              </form>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Back Button */}
              <Link href="/dashboard/reports">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Reports
                </Button>
              </Link>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Report Preview</h2>
                    <p className="text-sm text-muted-foreground mt-1">Review your self-assessment filing</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowPreview(false)}>
                      Edit
                    </Button>
                    <Button>
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              </Card>
              {reportData ? (
                <SelfAssessmentPreview reportData={reportData} formData={formData} />
              ) : (
                <Card className="p-8">
                  <div className="text-center text-muted-foreground">
                    No report data available
                  </div>
                </Card>
              )}
            </div>
          )}
        </main>
    </div>
  )
}
