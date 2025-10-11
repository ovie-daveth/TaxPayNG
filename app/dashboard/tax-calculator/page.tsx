"use client"

import { useState } from "react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { TaxCalculatorForm } from "@/components/tax-calculator/tax-calculator-form"
import { TaxBreakdown } from "@/components/tax-calculator/tax-breakdown"
import { TaxRatesInfo } from "@/components/tax-calculator/tax-rates-info"

export default function TaxCalculatorPage() {
  const [taxResult, setTaxResult] = useState<any>(null)

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="flex-1 md:ml-64">
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 max-w-7xl">
            <div>
              <h1 className="text-2xl font-bold">Tax Calculator</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Calculate your tax obligations based on Nigerian tax laws (LIRS/FIRS)
              </p>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <TaxCalculatorForm onCalculate={setTaxResult} />
              {taxResult && <TaxBreakdown result={taxResult} />}
            </div>
            <div>
              <TaxRatesInfo />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
