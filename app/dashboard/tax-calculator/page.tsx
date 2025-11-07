"use client"

import { useState, useEffect } from "react"
import { TaxCalculatorForm } from "@/components/tax-calculator/form/tax-calculator-form"
import { TaxRatesInfo } from "@/components/tax-calculator/tax-rates-info"
import { TaxCalculatorSkeleton } from "@/components/ui/skeletons"

export default function TaxCalculatorPage() {
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
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
            <div className="max-w-4xl mx-auto lg:mx-0 lg:max-w-none">
              <TaxCalculatorForm onCalculate={() => {}} />
            </div>
            <div className="hidden lg:block">
              <TaxRatesInfo />
            </div>
          </div>
        </main>
    </div>
  )
}
