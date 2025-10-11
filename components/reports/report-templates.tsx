"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Calculator, BarChart3, FileCheck, Plus } from "lucide-react"
import Link from "next/link"

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
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Generate New Report</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose a report template to get started</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map((template) => {
          const Icon = template.icon
          return (
            <Link key={template.id} href={template.href}>
              <div className="border border-border rounded-lg p-4 hover:shadow-lg hover:border-primary transition-all cursor-pointer h-full">
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
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
