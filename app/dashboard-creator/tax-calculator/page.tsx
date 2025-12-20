"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { TaxCalculatorForm } from "@/components/tax-calculator/form/tax-calculator-form"
import { TaxRatesInfo } from "@/components/tax-calculator/tax-rates-info"
import { TaxCalculatorSkeleton } from "@/components/ui/skeletons"
import { Sparkles, Camera } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaxBreakdownModalContent } from "@/app/demo/components/tax-breakdown-modal-content"

export default function CreatorTaxCalculatorPage() {
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
      <main className="px-4 sm:px-6 lg:px-8 py-6">
        <TaxCalculatorSkeleton />
      </main>
    )
  }

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Card className="relative overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 px-6 sm:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary">
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Tax Calculator for Creators
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Estimate PAYE, personal income tax, and deductibles for your creator business. Track sponsorships, ad
              revenue, affiliate payouts, and creator-specific expenses in one calculation designed for Nigeria’s 2025 tax rules.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1">
                <Camera className="w-3.5 h-3.5 text-primary" />
                Optimized for content income streams
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                Updated with 2025 personal reliefs
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">
        <div className="max-w-4xl mx-auto lg:mx-0 lg:max-w-none">
          <TaxCalculatorForm onCalculate={handleCalculate} defaultUserType="creator" lockUserType />
        </div>
        <div className="hidden lg:block">
          <TaxRatesInfo />
        </div>
      </div>

      <Dialog open={showTaxResults} onOpenChange={setShowTaxResults}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {taxResult && (
            <>
              <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border">
                <DialogTitle className="text-xl sm:text-2xl font-bold">Tax Calculation Results</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Detailed breakdown for your creator income and deductions.
                </DialogDescription>
              </DialogHeader>
              <div className="px-4 sm:px-6 py-4 sm:py-6">
                <TaxBreakdownModalContent result={taxResult} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}

