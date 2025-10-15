import { Card } from "@/components/ui/card"
import { Info } from "lucide-react"

export function TaxRatesInfo() {
  return (
    <Card className="p-6 sticky top-6">
      <div className="flex items-start gap-2 mb-4">
        <Info className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h3 className="font-semibold">Nigerian Tax Rates (2026)</h3>
          <p className="text-xs text-muted-foreground mt-1">Nigeria Tax Act (2025) - Effective Jan 1, 2026</p>
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
        <h4 className="font-semibold text-sm mb-3">Tax-Free Threshold & Reliefs (2026 Reform)</h4>
        
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-900 mb-4">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">
            🚨 Major Change: CRA Abolished
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200">
            The Consolidated Relief Allowance (CRA) has been removed and replaced with specific, capped reliefs.
          </p>
        </div>

        <div className="mb-4 bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-900">
          <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">
            ✓ Tax-Free Income
          </p>
          <p className="text-xs text-green-800 dark:text-green-200">
            First ₦800,000 of annual income is completely tax-exempt
          </p>
        </div>

        <h5 className="font-semibold text-xs mb-2 text-foreground">Allowable Deductions:</h5>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span><strong>Rent Relief:</strong> 20% of rent paid (Max ₦500,000/year) - requires proof</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span><strong>Pension Contribution:</strong> Up to 8% of annual income (no fixed cap)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span><strong>Health Insurance:</strong> Actual premium paid (requires documentation)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span><strong>Life Insurance:</strong> Actual premium paid (requires documentation)</span>
          </li>
        </ul>
        
        <p className="text-xs text-muted-foreground mt-3 italic">
          Note: All reliefs require proper documentation for claims.
        </p>
      </div>
    </Card>
  )
}
