"use client"

import { useState } from "react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, FileText, Download } from "lucide-react"
import Link from "next/link"
import { SelfAssessmentPreview } from "@/components/reports/self-assessment-preview"

export default function GenerateSelfAssessmentPage() {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="flex-1 md:ml-64">
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 max-w-7xl">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/reports">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Generate Self-Assessment Filing</h1>
                <p className="text-sm text-muted-foreground mt-1">Create LIRS/FIRS-ready self-assessment report</p>
              </div>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {!showPreview ? (
            <Card className="p-6 max-w-3xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Report Configuration</h2>
                <p className="text-sm text-muted-foreground mt-1">Configure your self-assessment filing details</p>
              </div>

              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault()
                  setShowPreview(true)
                }}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax-year">Tax Year</Label>
                    <Select defaultValue="2024">
                      <SelectTrigger id="tax-year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period">Period</Label>
                    <Select defaultValue="annual">
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

                <div className="space-y-2">
                  <Label htmlFor="tin">Tax Identification Number (TIN)</Label>
                  <Input id="tin" placeholder="Enter your TIN" />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Business Name</Label>
                    <Input id="business-name" placeholder="Your business name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-address">Business Address</Label>
                    <Input id="business-address" placeholder="Business address" />
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h3 className="font-semibold mb-4">Include in Report</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include-income" defaultChecked />
                      <Label htmlFor="include-income" className="cursor-pointer font-normal">
                        Income Statement (All transactions)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include-expenses" defaultChecked />
                      <Label htmlFor="include-expenses" className="cursor-pointer font-normal">
                        Expense Breakdown
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include-tax" defaultChecked />
                      <Label htmlFor="include-tax" className="cursor-pointer font-normal">
                        Tax Calculation Details
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include-reliefs" defaultChecked />
                      <Label htmlFor="include-reliefs" className="cursor-pointer font-normal">
                        Reliefs and Deductions
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include-documents" />
                      <Label htmlFor="include-documents" className="cursor-pointer font-normal">
                        Supporting Documents (Receipts & Invoices)
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Link href="/dashboard/reports" className="flex-1">
                    <Button type="button" variant="outline" className="w-full bg-transparent">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" className="flex-1">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <div className="space-y-6">
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
              <SelfAssessmentPreview />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
