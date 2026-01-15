"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft, Info, FileText, TrendingUp } from "lucide-react"
import { IncomeStatementPreview } from "@/components/reports/income-statement-preview"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { reportService, ReportData } from "@/lib/services"
import { toast } from "sonner"
import { useBusiness } from "@/lib/contexts/business-context"

export default function GenerateIncomeStatementPage() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { hasAccess } = useSubscription()
  const { activeEntityId } = useBusiness()
  const [showPreview, setShowPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [formData, setFormData] = useState({
    taxYear: new Date().getFullYear().toString(),
    period: 'annual' as 'annual' | 'q1' | 'q2' | 'q3' | 'q4',
    includeInvoices: true,
    includeTransactions: true,
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

    // Check subscription
    // Allow access for active free trial users too
    if (!hasAccess()) {
      setShowSubscriptionModal(true)
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
        formData.includeInvoices,
        activeEntityId || undefined,
        profile.defaultEntityId
      )

      // Generate report title
      const periodLabel = period.periodType === 'annual' 
        ? `Annual ${period.year}`
        : period.quarter 
        ? `Q${period.quarter} ${period.year}`
        : `${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()}`

      const title = `Income Statement - ${periodLabel}`

      // Save the report as draft
      await reportService.saveReport(
        profile.userId,
        title,
        'Income Statement',
        data,
        'draft', // All reports are saved as draft initially
        activeEntityId || undefined
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
      <main className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 max-w-4xl mx-auto">
        {!showPreview ? (
          <div className="space-y-6">

            {/* Header Section */}
            <Card className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-primary/10 rounded-lg shrink-0">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">Generate Income Statement</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Create a comprehensive income statement report showing your total income, income by category, and income by source for the selected period.
                  </p>
                </div>
              </div>

              <Alert className="mt-3 sm:mt-4">
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  <strong>What is an Income Statement?</strong> An income statement is a financial report that shows your total income over a specific period. 
                  It helps you understand your revenue sources and track your financial performance. This report is useful for tax planning, 
                  business analysis, and financial decision-making.
                </AlertDescription>
              </Alert>
            </Card>

            {/* Configuration Form */}
            <Card className="p-3 sm:p-4 md:p-6">
            <div className="mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg md:text-xl font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  Report Configuration
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Select the period and data sources for your income statement
                </p>
            </div>

            <form
              className="space-y-6"
              onSubmit={handleGenerate}
            >
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4">
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

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <Link href="/dashboard-creator/reports" className="flex-1">
                  <Button type="button" variant="outline" className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isGenerating}
                  className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                      <span className="hidden sm:inline">Generating...</span>
                      <span className="sm:hidden">Generating</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                      <span className="hidden sm:inline">Generate Income Statement</span>
                      <span className="sm:hidden">Generate</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
          </div>
        ) : reportData ? (
          <IncomeStatementPreview
            reportData={reportData}
            formData={{
              includeInvoices: formData.includeInvoices,
              includeTransactions: formData.includeTransactions
            }}
            onBack={() => setShowPreview(false)}
          />
        ) : null}
      </main>
      {profile && profile.businessType !== 'consultant' && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile.businessType || 'freelancer'}
        />
      )}
    </div>
  )
}

