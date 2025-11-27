"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { IncomeStatementPreview } from "@/components/reports/income-statement-preview"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { reportService, ReportData } from "@/lib/services"
import { toast } from "sonner"

export default function GenerateIncomeStatementPage() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [showPreview, setShowPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [formData, setFormData] = useState({
    taxYear: new Date().getFullYear().toString(),
    period: 'annual' as 'annual' | 'q1' | 'q2' | 'q3' | 'q4',
    includeInvoices: true,
    includeTransactions: true,
  })

  // Calculate period dates based on year and period
  const getPeriodDates = (year: number, period: string) => {
    if (period === 'annual') {
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        periodType: 'annual' as const
      }
    }
    
    const quarters: { [key: string]: { start: string; end: string } } = {
      q1: { start: `${year}-01-01`, end: `${year}-03-31` },
      q2: { start: `${year}-04-01`, end: `${year}-06-30` },
      q3: { start: `${year}-07-01`, end: `${year}-09-30` },
      q4: { start: `${year}-10-01`, end: `${year}-12-31` }
    }
    
    const quarter = quarters[period]
    return {
      startDate: quarter.start,
      endDate: quarter.end,
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

      const data = await reportService.generateReportData(
        profile.userId,
        period,
        formData.includeInvoices
      )

      // Generate report title
      const periodLabel = period.periodType === 'annual' 
        ? `Annual ${period.year}`
        : period.quarter 
        ? `Q${period.quarter} ${period.year}`
        : `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`

      const title = `Income Statement - ${periodLabel}`

      // Save the report
      await reportService.saveReport(
        profile.userId,
        title,
        'Income Statement',
        data,
        'completed'
      )

      setReportData(data)
      setShowPreview(true)
      toast.success("Income statement generated and saved successfully")
    } catch (error) {
      console.error("Error generating income statement:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate income statement")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 py-6">
        {!showPreview ? (
          <Card className="p-6 max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Income Statement Configuration</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure your income statement details</p>
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
                      <SelectItem value="q1">Q1 (Jan - Mar)</SelectItem>
                      <SelectItem value="q2">Q2 (Apr - Jun)</SelectItem>
                      <SelectItem value="q3">Q3 (Jul - Sep)</SelectItem>
                      <SelectItem value="q4">Q4 (Oct - Dec)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Include in Report</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-transactions"
                      checked={formData.includeTransactions}
                      onChange={(e) => setFormData(prev => ({ ...prev, includeTransactions: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Label htmlFor="include-transactions" className="font-normal cursor-pointer">
                      Include Income Transactions
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-invoices"
                      checked={formData.includeInvoices}
                      onChange={(e) => setFormData(prev => ({ ...prev, includeInvoices: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Label htmlFor="include-invoices" className="font-normal cursor-pointer">
                      Include Invoice Income
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Income Statement"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        ) : reportData ? (
          <IncomeStatementPreview
            reportData={reportData}
            formData={formData}
            onBack={() => setShowPreview(false)}
          />
        ) : null}
      </main>
    </div>
  )
}
