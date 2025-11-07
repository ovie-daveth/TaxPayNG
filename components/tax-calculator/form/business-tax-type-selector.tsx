"use client"

import { Card } from "@/components/ui/card"
import { Building2, Users, Receipt, FileText, TrendingUp } from "lucide-react"

interface BusinessTaxTypeSelectorProps {
  onSelectTaxType: (type: string) => void
}

export function BusinessTaxTypeSelector({ onSelectTaxType }: BusinessTaxTypeSelectorProps) {
  return (
    <Card className="p-6 border-2 border-primary/20">
      <div className="text-center mb-6">
        <Building2 className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">What would you like to calculate?</h3>
        <p className="text-sm text-muted-foreground">
          As a business owner, you can calculate different types of taxes
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          className="p-6 cursor-pointer hover:border-primary transition-colors"
          onClick={() => onSelectTaxType("paye")}
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Employee (PAYE)</h4>
              <p className="text-sm text-muted-foreground">
                Calculate PAYE tax for your employees
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-6 cursor-pointer hover:border-primary transition-colors"
          onClick={() => onSelectTaxType("cit")}
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Company Income Tax (CIT)</h4>
              <p className="text-sm text-muted-foreground">
                Calculate CIT (0% for small companies)
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-6 cursor-pointer hover:border-primary transition-colors"
          onClick={() => onSelectTaxType("development-levy")}
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Development Levy</h4>
              <p className="text-sm text-muted-foreground">
                Calculate levy on assessable profits (4% for 2025-2026)
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-6 cursor-pointer hover:border-primary transition-colors"
          onClick={() => onSelectTaxType("withholding-tax")}
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Withholding Tax</h4>
              <p className="text-sm text-muted-foreground">
                Calculate WHT on income & payments
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-6 cursor-pointer hover:border-primary transition-colors"
          onClick={() => onSelectTaxType("vat")}
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">VAT</h4>
              <p className="text-sm text-muted-foreground">
                Calculate VAT at 7.5% (if turnover ≥ ₦100M)
              </p>
            </div>
          </div>
        </Card>
      </div>
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Note:</strong> Small businesses (turnover &lt; ₦100M, assets &lt; ₦250M) are exempt from CIT, Development Levy, and VAT. 
          However, you still need to calculate PAYE for your employees.
        </p>
      </div>
    </Card>
  )
}

