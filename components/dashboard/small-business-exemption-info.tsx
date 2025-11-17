import { CheckCircle2 } from "lucide-react"

export function SmallBusinessExemptionInfo() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <h4 className="font-semibold text-sm">Tax Exempt - Small Company Status</h4>
      </div>
      
      <div className="space-y-3">
        <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            ✅ You qualify for complete tax exemption under Nigeria Tax Act 2025
          </p>
          <p className="text-xs text-green-800 dark:text-green-200">
            Small companies with turnover ≤ ₦100M and assets ≤ ₦250M are exempt from Company Income Tax.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Tax Exemptions Include:</p>
          
          <div className="space-y-1.5">
            <div className="flex items-start gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong>Company Income Tax (CIT)</strong> — 0% rate (normally 30%)
              </span>
            </div>
            
            <div className="flex items-start gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong>Development Levy</strong> — 4% levy exempted
              </span>
            </div>
            
            <div className="flex items-start gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong>Withholding Tax</strong> — Exempt on both income received and payments made
              </span>
            </div>
            
            <div className="flex items-start gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong>VAT</strong> — Exempt if turnover &lt; ₦100M (no need to register or charge VAT)
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">
            <strong>Note:</strong> To maintain this exemption, ensure your annual turnover stays below ₦100 million and total fixed assets remain below ₦250 million.
          </p>
          <p className="text-xs text-muted-foreground">
            You still need to file annual returns and comply with PAYE for employees, but you won't pay Company Income Tax.
          </p>
        </div>
      </div>
    </div>
  )
}

