import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calculator } from "lucide-react"
import Link from "next/link"

export function TaxSummary() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Tax Summary</h3>
        <p className="text-sm text-muted-foreground">Q1 2025</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <span className="text-sm text-muted-foreground">Taxable Income</span>
          <span className="font-semibold">₦1,560,000</span>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <span className="text-sm text-muted-foreground">Tax Relief</span>
          <span className="font-semibold text-green-600">-₦200,000</span>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <span className="text-sm text-muted-foreground">Deductions</span>
          <span className="font-semibold text-green-600">-₦50,000</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="text-sm font-medium">Tax Payable</span>
          <span className="text-xl font-bold">₦234,000</span>
        </div>
      </div>

      <Link href="/dashboard/tax-calculator" className="block mt-6">
        <Button className="w-full bg-transparent" variant="outline">
          <Calculator className="w-4 h-4 mr-2" />
          Calculate Tax
        </Button>
      </Link>
    </Card>
  )
}
