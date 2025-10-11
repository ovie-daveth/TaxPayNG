import { Card } from "@/components/ui/card"
import { Info } from "lucide-react"

export function TaxRatesInfo() {
  return (
    <Card className="p-6 sticky top-6">
      <div className="flex items-start gap-2 mb-4">
        <Info className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h3 className="font-semibold">Nigerian Tax Rates (2025)</h3>
          <p className="text-xs text-muted-foreground mt-1">Personal Income Tax (PAYE) - New Law</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-900">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">First ₦800,000</span>
            <span className="text-sm font-semibold text-green-600">0% (Tax-Free)</span>
          </div>
          <p className="text-xs text-muted-foreground">Tax: ₦0</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">₦800,001 - ₦3,000,000</span>
            <span className="text-sm font-semibold text-primary">15%</span>
          </div>
          <p className="text-xs text-muted-foreground">Max tax: ₦330,000</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">₦3,000,001 - ₦12,000,000</span>
            <span className="text-sm font-semibold text-primary">18%</span>
          </div>
          <p className="text-xs text-muted-foreground">Max tax: ₦1,620,000</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">₦12,000,001 - ₦25,000,000</span>
            <span className="text-sm font-semibold text-primary">21%</span>
          </div>
          <p className="text-xs text-muted-foreground">Max tax: ₦2,730,000</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">₦25,000,001 - ₦50,000,000</span>
            <span className="text-sm font-semibold text-primary">23%</span>
          </div>
          <p className="text-xs text-muted-foreground">Max tax: ₦5,750,000</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Above ₦50,000,000</span>
            <span className="text-sm font-semibold text-primary">25%</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <h4 className="font-semibold text-sm mb-3">Common Reliefs & Deductions</h4>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Consolidated Relief: Higher of 1% of gross income or ₦200,000 + 20% of gross income</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Rent: Deductible business rent expense</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Pension: Up to 8% of annual income</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>NHF: 2.5% of annual income</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Life Insurance: Actual premium paid</span>
          </li>
        </ul>
      </div>
    </Card>
  )
}
