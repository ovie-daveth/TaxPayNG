"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { ReportTemplates } from "@/components/reports/report-templates"
import { RecentReports } from "@/components/reports/recent-reports"
import { FileText, TrendingUp, Loader2, Plus, ChevronDown } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { reportService } from "@/lib/services"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePathname, useRouter } from "next/navigation"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { useBusiness } from "@/lib/contexts/business-context"

const reportTemplates = [
  {
    id: "self-assessment",
    title: "Self-Assessment Filing",
    href: "/dashboard/reports/generate/self-assessment",
  },
  {
    id: "tax-assessment",
    title: "Tax Assessment (CIT)",
    href: "/dashboard/reports/generate/tax-assessment",
  },
  {
    id: "income-statement",
    title: "Income Statement",
    href: "/dashboard/reports/generate/income-statement",
  },
  {
    id: "expense-report",
    title: "Expense Report",
    href: "/dashboard/reports/generate/expense-report",
  },
  {
    id: "tax-summary",
    title: "Tax Summary Report",
    href: "/dashboard/reports/generate/tax-summary",
  },
]

function MobileReportDropdown() {
  const router = useRouter()
  const pathname = usePathname()
  const { profile } = useUserProfile()
  const { hasAccess, loading: subscriptionLoading } = useSubscription()
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  const basePath = pathname?.startsWith("/dashboard-creator")
    ? "/dashboard-creator"
    : pathname?.startsWith("/dashboard-sme")
      ? "/dashboard-sme"
      : "/dashboard"

  const isSME = profile?.businessType === "sme"
  const filteredTemplates = reportTemplates.filter((t) => {
    if (isSME) return t.id !== "self-assessment"
    return t.id !== "tax-assessment"
  })

  const resolvedTemplates = filteredTemplates.map(t => ({
    ...t,
    href: t.href.replace(/^\/dashboard/, basePath),
  }))

  const handleGenerateClick = (href: string) => {
    if (subscriptionLoading) {
      return
    }
    // Allow access for active free trial users too
    if (!hasAccess()) {
      setShowSubscriptionModal(true)
      return
    }
    router.push(href)
  }

  return (
    <>
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full" size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Create New Report
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[calc(100vw-2rem)]">
            {resolvedTemplates.map((template) => (
              <DropdownMenuItem
                key={template.id}
                onClick={() => handleGenerateClick(template.href)}
                className="p-3"
              >
                <span className="text-sm">{template.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {profile && profile.businessType !== 'consultant' && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile.businessType || 'freelancer'}
        />
      )}
    </>
  )
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { activeEntityId } = useBusiness()
  const [stats, setStats] = useState({
    totalReports: 0,
    reportsThisMonth: 0,
    submittedFilings: 0,
    pendingReview: 0,
    loading: true
  })

  useEffect(() => {
    if (profile?.userId) {
      loadStats()
    }
  }, [profile?.userId, activeEntityId])

  const loadStats = async () => {
    if (!profile?.userId) return

    try {
      // Fallback: some older profiles may not have defaultEntityId set yet.
      // When an entity is active, treat missing-entity reports as legacy default for that active entity.
      const defaultEntityIdForLegacy = profile.defaultEntityId || activeEntityId || undefined
      const reports = await reportService.getUserReports(profile.userId, activeEntityId || undefined, defaultEntityIdForLegacy)
      
      // Calculate stats
      const totalReports = reports.length
      
      // Reports generated this month
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const reportsThisMonth = reports.filter(report => {
        const reportDate = new Date(report.generatedAt || report.createdAt)
        return reportDate >= startOfMonth
      }).length
      
      // Submitted filings (status === 'submitted' or 'completed', or filingStatus indicates it was filed)
      // Use Set to deduplicate by report ID to avoid counting the same filing twice
      const submittedReportIds = new Set<string>()
      reports.forEach(report => {
        if (
          report.status === 'submitted' || 
          report.status === 'completed' ||
          report.filingStatus === 'submitted' ||
          report.filingStatus === 'acknowledged' ||
          report.filingStatus === 'filed'
        ) {
          submittedReportIds.add(report.id)
        }
      })
      const submittedFilings = submittedReportIds.size
      
      // Pending review (submitted but not yet completed - only count unique report IDs)
      const pendingReportIds = new Set<string>()
      reports.forEach(report => {
        // Count as pending if submitted but not completed
        if (
          (report.status === 'submitted' || report.filingStatus === 'submitted') &&
          report.status !== 'completed' &&
          report.filingStatus !== 'acknowledged' &&
          report.filingStatus !== 'filed'
        ) {
          pendingReportIds.add(report.id)
        }
      })
      const pendingReview = pendingReportIds.size

      setStats({
        totalReports,
        reportsThisMonth,
        submittedFilings,
        pendingReview,
        loading: false
      })
    } catch (error) {
      console.error("Error loading report stats:", error)
      setStats(prev => ({ ...prev, loading: false }))
    }
  }

  return (
    <div className="min-h-screen bg-background">

        <main className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 w-full">
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              <Card className="p-3 sm:p-4 md:p-5 lg:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Reports Generated</p>
                    {stats.loading ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-lg sm:text-2xl md:text-3xl font-bold">{stats.totalReports}</p>
                        {stats.reportsThisMonth > 0 && (
                          <p className="text-xs text-green-600 mt-1 sm:mt-2">+{stats.reportsThisMonth} this month</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 ml-1">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                </div>
              </Card>
              <Card className="p-3 sm:p-4 md:p-5 lg:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Filings Submitted</p>
                    {stats.loading ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-lg sm:text-2xl md:text-3xl font-bold">{stats.submittedFilings}</p>
                        {stats.pendingReview > 0 && (
                          <p className="text-xs text-blue-600 mt-1 sm:mt-2">{stats.pendingReview} pending review</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 ml-1">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Report Templates - Hidden on mobile, shown on desktop */}
            <div className="hidden sm:block">
              <ReportTemplates />
            </div>

            {/* Mobile: Dropdown button for report templates */}
            <MobileReportDropdown />

            {/* Recent Reports */}
            <RecentReports />
          </div>
        </main>
    </div>
  )
}
