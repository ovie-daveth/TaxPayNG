"use client"

import { useState, useEffect } from "react"
import { TaxCalculatorForm } from "@/components/tax-calculator/tax-calculator-form"
import { TaxBreakdown } from "@/components/tax-calculator/tax-breakdown"
import { TaxRatesInfo } from "@/components/tax-calculator/tax-rates-info"
import { TaxCalculatorSkeleton } from "@/components/ui/skeletons"

export default function TaxCalculatorPage() {
  const [taxResult, setTaxResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
          <main className="container mx-auto px-4 py-6 max-w-7xl">
            <TaxCalculatorSkeleton />
          </main>
    )
  }

  return (
    <div className="">
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
  )
}
