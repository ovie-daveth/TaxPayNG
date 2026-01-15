"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft, Info, FileCheck2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { reportService, ReportData } from "@/lib/services"
import { toast } from "sonner"
import { useBusiness } from "@/lib/contexts/business-context"
import { TaxAssessmentPreview } from "@/components/reports/tax-assessment-preview"

export default function GenerateTaxAssessmentPage() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { hasAccess } = useSubscription()
  const { activeEntityId } = useBusiness()
  const [showPreview, setShowPreview] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  const [formData, setFormData] = useState({
    taxYear: String(currentYear),
    returningCurrency: "NGN" as "NGN" | "USD" | "GBP" | "EUR" | "CFA",
  })

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid || !profile?.userId) {
      toast.error("Please log in to generate reports")
      return
    }

    // SMEs only
    const isSME = profile.businessType === "sme" 
    if (!isSME) {
      toast.error("Tax Assessment is only available for SME (CIT) accounts")
      return
    }

    // Access check (free trial or subscribed)
    if (!hasAccess()) {
      setShowSubscriptionModal(true)
      return
    }

    setIsGenerating(true)
    try {
      const year = parseInt(formData.taxYear)
      const period = {
        startDate: new Date(year, 0, 1).toISOString().split("T")[0],
        endDate: new Date(year, 11, 31).toISOString().split("T")[0],
        year,
        periodType: "annual" as const,
      }

      // Use reportService generator which already computes CIT for SMEs
      const data = await reportService.generateReportData(
        profile.userId,
        period,
        false, // includeInvoices = false for now (transactions are the source of truth)
        activeEntityId || undefined,
        profile.defaultEntityId
      )

      const title = `Tax Assessment (CIT) - Annual ${year}`

      await reportService.saveReport(
        profile.userId,
        title,
        "Tax Assessment",
        data,
        "draft",
        activeEntityId || undefined
      )

      setReportData(data)
      setShowPreview(true)
      toast.success("Tax assessment generated and saved successfully")
    } catch (error) {
      console.error("Error generating tax assessment:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate tax assessment")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6  mx-auto">
        {!showPreview ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Link href="/dashboard/reports">
                <Button variant="outline" size="sm" className="h-8 sm:h-10 text-xs sm:text-sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
            </div>

            <Card className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-green-100 text-green-700 rounded-lg shrink-0">
                  <FileCheck2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">Generate Tax Assessment (CIT)</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    For SMEs, we generate a company tax assessment used to compute Company Income Tax (CIT) for filing on TaxProMax.
                  </p>
                </div>
              </div>

              <Alert className="mt-4">
                <Info className="w-4 h-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  This report is tailored for <strong>Company Income Tax (CIT)</strong>. It outputs a TaxProMax-style assessment summary and schedules based on your yearly transactions.
                </AlertDescription>
              </Alert>
            </Card>

            <Card className="p-3 sm:p-4 md:p-6">
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tax Year</Label>
                  <Select value={formData.taxYear} onValueChange={(v) => setFormData((p) => ({ ...p, taxYear: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={String(y)} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Returning Currency</Label>
                  <Select
                    value={formData.returningCurrency}
                    onValueChange={(v) => setFormData((p) => ({ ...p, returningCurrency: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NGN">NGN</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="CFA">CFA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Tax Assessment"
                  )}
                </Button>
              </form>
            </Card>
          </div>
        ) : (
          reportData && (
            <TaxAssessmentPreview
              reportData={reportData}
              returningCurrency={formData.returningCurrency}
              onBack={() => setShowPreview(false)}
            />
          )
        )}

        {profile && profile.businessType !== "consultant" && (
          <SubscriptionRequiredModal
            open={showSubscriptionModal}
            onOpenChange={setShowSubscriptionModal}
            businessType={profile.businessType || "freelancer"}
          />
        )}
      </main>
    </div>
  )
}


