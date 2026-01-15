"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Calculator, BarChart3, FileCheck, Plus } from "lucide-react"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"

const templates = [
  {
    id: "self-assessment",
    title: "Self-Assessment Filing",
    description: "Generate complete self-assessment report for LIRS/FIRS submission",
    icon: FileCheck,
    color: "bg-green-100 text-green-600",
    href: "/dashboard/reports/generate/self-assessment",
  },
  {
    id: "tax-assessment",
    title: "Tax Assessment (CIT)",
    description: "Generate company tax assessment for FIRS Company Income Tax (CIT) filing",
    icon: FileCheck,
    color: "bg-green-100 text-green-600",
    href: "/dashboard/reports/generate/tax-assessment",
  },
  {
    id: "income-statement",
    title: "Income Statement",
    description: "Detailed breakdown of all income sources and categories",
    icon: BarChart3,
    color: "bg-blue-100 text-blue-600",
    href: "/dashboard/reports/generate/income-statement",
  },
  {
    id: "expense-report",
    title: "Expense Report",
    description: "Comprehensive report of business expenses and deductions",
    icon: FileText,
    color: "bg-orange-100 text-orange-600",
    href: "/dashboard/reports/generate/expense-report",
  },
  {
    id: "tax-summary",
    title: "Tax Summary Report",
    description: "Annual or quarterly tax calculation summary with breakdowns",
    icon: Calculator,
    color: "bg-purple-100 text-purple-600",
    href: "/dashboard/reports/generate/tax-summary",
  },
]

export function ReportTemplates() {
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

  // Treat dashboard-sme routes as SME even if legacy profiles still have businessType like "small-business"
  const isSME = basePath === "/dashboard-sme" || profile?.businessType === "sme" || (profile?.businessType as unknown as string) === "small-business"
  const filteredTemplates = templates.filter((t) => {
    if (isSME) return t.id !== "self-assessment"
    return t.id !== "tax-assessment"
  })

  const resolvedTemplates = filteredTemplates.map(t => ({
    ...t,
    href: t.href.replace(/^\/dashboard/, basePath),
  }))

  const handleGenerateClick = (href: string) => {
    // Wait for subscription status to load
    if (subscriptionLoading) {
      return
    }
    // Check if user is subscribed - if not, show modal
    if (!hasAccess()) {
      setShowSubscriptionModal(true)
      return
    }
    // User is subscribed, navigate to report generation page
    router.push(href)
  }

  return (
    <>
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Generate New Report</h2>
          <p className="text-sm text-muted-foreground mt-1">Choose a report template to get started</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {resolvedTemplates.map((template) => {
            const Icon = template.icon
            return (
              <div
                key={template.id}
                className="border border-border rounded-lg p-4 hover:shadow-lg hover:border-primary transition-all cursor-pointer h-full"
                onClick={() => handleGenerateClick(template.href)}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${template.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-sm mb-2">{template.title}</h3>
                <p className="text-xs text-muted-foreground mb-4">{template.description}</p>
                <Button variant="ghost" size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              </div>
            )
          })}
        </div>
      </Card>
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
