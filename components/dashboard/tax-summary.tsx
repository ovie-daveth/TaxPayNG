import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calculator } from "lucide-react"
import Link from "next/link"

export function TaxSummary() {
  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="mb-4 sm:mb-5 md:mb-6">
        <h3 className="text-base sm:text-lg font-semibold">Tax Summary</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Q1 2025</p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between py-2.5 sm:py-3 border-b border-border">
          <span className="text-xs sm:text-sm text-muted-foreground">Taxable Income</span>
          <span className="font-semibold text-xs sm:text-sm">₦1,560,000</span>
        </div>
        <div className="flex items-center justify-between py-2.5 sm:py-3 border-b border-border">
          <span className="text-xs sm:text-sm text-muted-foreground">Tax Relief</span>
          <span className="font-semibold text-xs sm:text-sm text-primary">-₦200,000</span>
        </div>
        <div className="flex items-center justify-between py-2.5 sm:py-3 border-b border-border">
          <span className="text-xs sm:text-sm text-muted-foreground">Deductions</span>
          <span className="font-semibold text-xs sm:text-sm text-primary">-₦50,000</span>
        </div>
        <div className="flex items-center justify-between py-2.5 sm:py-3">
          <span className="text-xs sm:text-sm font-medium">Tax Payable</span>
          <span className="text-lg sm:text-xl font-bold">₦234,000</span>
        </div>
      </div>

      <Link href="/dashboard/tax-calculator" className="block mt-4 sm:mt-5 md:mt-6">
        <Button className="w-full bg-transparent text-xs sm:text-sm" variant="outline" size="sm">
          <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          Calculate Tax
        </Button>
      </Link>
    </Card>
  )
}
