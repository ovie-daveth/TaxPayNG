"use client"

import { useState, useEffect } from "react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card } from "@/components/ui/card"
import { ReportTemplates } from "@/components/reports/report-templates"
import { RecentReports } from "@/components/reports/recent-reports"
import { FileText, TrendingUp, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { reportService } from "@/lib/services"

export default function ReportsPage() {
  const { user } = useAuth()
  const { profile } = useUserProfile()
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
  }, [profile?.userId])

  const loadStats = async () => {
    if (!profile?.userId) return

    try {
      const reports = await reportService.getUserReports(profile.userId)
      
      // Calculate stats
      const totalReports = reports.length
      
      // Reports generated this month
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const reportsThisMonth = reports.filter(report => {
        const reportDate = new Date(report.generatedAt || report.createdAt)
        return reportDate >= startOfMonth
      }).length
      
      // Submitted filings (status === 'submitted')
      const submittedFilings = reports.filter(report => report.status === 'submitted').length
      
      // Pending review (submitted but not yet processed - for now, we'll use submitted as pending)
      const pendingReview = submittedFilings

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
      <DashboardNav />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Reports Generated</p>
                    {stats.loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-3xl font-bold">{stats.totalReports}</p>
                        {stats.reportsThisMonth > 0 && (
                          <p className="text-xs text-green-600 mt-2">+{stats.reportsThisMonth} this month</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Filings Submitted</p>
                    {stats.loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-3xl font-bold">{stats.submittedFilings}</p>
                        {stats.pendingReview > 0 && (
                          <p className="text-xs text-blue-600 mt-2">{stats.pendingReview} pending review</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Report Templates */}
            <ReportTemplates />

            {/* Recent Reports */}
            <RecentReports />
          </div>
        </main>
    </div>
  )
}
