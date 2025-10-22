"use client"

import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { Card } from "@/components/ui/card"
import { ReportTemplates } from "@/components/reports/report-templates"
import { RecentReports } from "@/components/reports/recent-reports"
import { FileText, TrendingUp } from "lucide-react"

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="flex-1 md:ml-64">
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 max-w-7xl">
            <div>
              <h1 className="text-2xl font-bold">Reports & Filings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Generate tax reports and self-assessment filings for LIRS/FIRS
              </p>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Reports Generated</p>
                    <p className="text-3xl font-bold">24</p>
                    <p className="text-xs text-green-600 mt-2">+3 this month</p>
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
                    <p className="text-3xl font-bold">8</p>
                    <p className="text-xs text-blue-600 mt-2">2 pending review</p>
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
    </div>
  )
}
