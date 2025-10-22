import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, FileText, Wallet } from "lucide-react"

interface TaxBreakdownProps {
  result: any
}

export function TaxBreakdown({ result }: TaxBreakdownProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Tax Breakdown</h2>
          <p className="text-sm text-muted-foreground mt-1">Detailed calculation results</p>
        </div>
        <Badge variant="secondary">2025</Badge>
      </div>

      <div className="space-y-4">
        {/* Monthly Set-Aside Card */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border-2 border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Monthly Set-Aside</h3>
          </div>
          <p className="text-2xl font-bold text-primary">₦{result.monthlySetAside.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Save this amount each month for tax payments</p>
        </div>

        {/* Income Section */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">Income</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gross Income</span>
              <span className="font-medium">₦{result.grossIncome.toLocaleString()}</span>
            </div>
            {result.businessExpenses > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Business Expenses</span>
                <span className="font-medium text-red-600">-₦{result.businessExpenses.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="font-medium">Adjusted Gross Income</span>
              <span className="font-semibold">₦{result.adjustedGrossIncome.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Reliefs & Deductions */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">Tax Reliefs & Deductions</h3>
          <div className="space-y-2">
            {result.reliefs.rentRelief > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rent Relief (20%)</span>
                <span className="font-medium text-green-600">-₦{result.reliefs.rentRelief.toLocaleString()}</span>
              </div>
            )}
            {result.reliefs.pension > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pension Contribution</span>
                <span className="font-medium text-green-600">-₦{result.reliefs.pension.toLocaleString()}</span>
              </div>
            )}
            {result.reliefs.healthInsurance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Health Insurance</span>
                <span className="font-medium text-green-600">-₦{result.reliefs.healthInsurance.toLocaleString()}</span>
              </div>
            )}
            {result.reliefs.lifeInsurance > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Life Insurance</span>
                <span className="font-medium text-green-600">-₦{result.reliefs.lifeInsurance.toLocaleString()}</span>
              </div>
            )}
            {result.reliefs.charitable > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Charitable Donations</span>
                <span className="font-medium text-green-600">-₦{result.reliefs.charitable.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="font-medium">Total Reliefs</span>
              <span className="font-semibold text-green-600">-₦{result.totalReliefs.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Tax Calculation */}
        <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary/20">
          <h3 className="font-semibold text-sm mb-3">Tax Calculation</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Taxable Income</span>
              <span className="font-medium">₦{result.taxableIncome.toLocaleString()}</span>
            </div>
            {result.taxBrackets.map((bracket: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {bracket.rate === 0 ? "Tax-free" : `${bracket.rate}% on`} ₦{bracket.amount.toLocaleString()}
                </span>
                <span className="font-medium">{bracket.rate === 0 ? "₦0" : `₦${bracket.tax.toLocaleString()}`}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t-2 border-primary/20">
              <span className="font-semibold text-base">Total Tax Payable</span>
              <span className="font-bold text-xl text-primary">₦{result.totalTax.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Quarterly Breakdown */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3">Quarterly Payment Schedule</h3>
          <div className="grid grid-cols-2 gap-3">
            {result.quarterlyPayments.map((payment: any, index: number) => (
              <div key={index} className="bg-background rounded p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{payment.quarter}</p>
                <p className="font-semibold">₦{payment.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-6 border-t border-border">
        <Button variant="outline" className="flex-1 bg-transparent">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
        <Button className="flex-1">
          <FileText className="w-4 h-4 mr-2" />
          Save Calculation
        </Button>
      </div>
    </Card>
  )
}
