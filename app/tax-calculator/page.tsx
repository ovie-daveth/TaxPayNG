"use client"

import { useState, useEffect } from "react"
import { TaxCalculatorForm } from "@/components/tax-calculator/form/tax-calculator-form"
import { TaxRatesInfo } from "@/components/tax-calculator/tax-rates-info"
import { TaxCalculatorSkeleton } from "@/components/ui/skeletons"
import { SiteHeader } from "@/components/site-header"
import Footer from "@/components/footer"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { TaxBreakdownModalContent } from "@/app/demo/components/tax-breakdown-modal-content"

export default function PublicTaxCalculatorPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [showTaxResults, setShowTaxResults] = useState(false)
  const [taxResult, setTaxResult] = useState<any>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader
          logoHref="/"
          highlightHref="/tax-calculator"
          navItems={[
            { label: "Features", href: "/#features" },
            { label: "Pricing", href: "/pricing" },
            { label: "Blog", href: "/blog" },
            { label: "FAQ", href: "/faq" },
          ]}
          cta={{
            href: "/#waitlist",
            label: "Join the Waitlist",
            mobileLabel: "Join",
            showOnMobile: true,
          }}
        />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <TaxCalculatorSkeleton />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader
        logoHref="/"
        highlightHref="/tax-calculator"
        navItems={[
          { label: "Features", href: "/#features" },
          { label: "Pricing", href: "/pricing" },
          { label: "Blog", href: "/blog" },
          { label: "FAQ", href: "/faq" },
        ]}
        cta={{
          href: "/#waitlist",
          label: "Join the Waitlist",
          mobileLabel: "Join",
          showOnMobile: true,
        }}
      />

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="mb-4 md:mb-8">
          <h1 className="text-lg md:text-4xl font-bold text-foreground mb-1.5 md:mb-2">
            Tax Calculator
          </h1>
          <p className="text-muted-foreground text-[11px] md:text-lg">
            Calculate your tax obligations based on Nigerian tax laws (LIRS/FIRS)
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
          <div className="max-w-4xl mx-auto lg:mx-0 lg:max-w-none">
            <TaxCalculatorForm 
              onCalculate={(result) => {
                setTaxResult(result)
                setShowTaxResults(true)
              }} 
            />
          </div>
          <div className="hidden lg:block">
            <TaxRatesInfo />
          </div>
        </div>
      </main>

      {/* Tax Results Modal */}
      <Dialog open={showTaxResults} onOpenChange={setShowTaxResults}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {taxResult && (
            <>
              <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border">
                <DialogTitle className="text-xl sm:text-2xl font-bold">Tax Calculation Results</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">Your detailed tax breakdown and payment schedule</DialogDescription>
              </DialogHeader>
              <div className="px-4 sm:px-6 py-4 sm:py-6">
                <TaxBreakdownModalContent result={taxResult} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}

