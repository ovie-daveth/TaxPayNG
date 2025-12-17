"use client"

import { useState, useEffect } from "react"
import { TaxCalculatorForm } from "@/components/tax-calculator/form/tax-calculator-form"
import { TaxRatesInfo } from "@/components/tax-calculator/tax-rates-info"
import { TaxCalculatorSkeleton } from "@/components/ui/skeletons"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaxBreakdownModalContent } from "@/app/demo/components/tax-breakdown-modal-content"

export default function TaxCalculatorPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [showTaxResults, setShowTaxResults] = useState(false)
  const [taxResult, setTaxResult] = useState<any | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  const handleCalculate = (result: any) => {
    setTaxResult(result)
    setShowTaxResults(true)
  }

  if (isLoading) {
    return (
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 max-w-7xl">
        <TaxCalculatorSkeleton />
      </main>
    )
  }

  return (
    <div className="">
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 max-w-7xl">
        <div className="md:grid md:grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-4 lg:gap-6">
          <div className="max-w-4xl mx-auto lg:mx-0 lg:max-w-none">
            <TaxCalculatorForm onCalculate={handleCalculate} />
          </div>
          <div className="hidden lg:block">
            <TaxRatesInfo />
          </div>
        </div>
      </main>

      <Dialog open={showTaxResults} onOpenChange={setShowTaxResults}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {taxResult && (
            <>
              <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border">
                <DialogTitle className="text-xl sm:text-2xl font-bold">Tax Calculation Results</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Detailed breakdown of your tax computation for the selected period.
                </DialogDescription>
              </DialogHeader>
              <div className="px-4 sm:px-6 py-4 sm:py-6">
                <TaxBreakdownModalContent result={taxResult} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
