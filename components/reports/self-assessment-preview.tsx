import { Card } from "@/components/ui/card"

export function SelfAssessmentPreview() {
  return (
    <Card className="p-8 max-w-4xl mx-auto">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center border-b border-border pb-6">
          <h1 className="text-2xl font-bold mb-2">SELF-ASSESSMENT TAX RETURN</h1>
          <p className="text-sm text-muted-foreground">
            Federal Inland Revenue Service (FIRS) / Lagos Internal Revenue Service (LIRS)
          </p>
          <p className="text-sm font-medium mt-2">Tax Year: 2024 (Annual)</p>
        </div>

        {/* Taxpayer Information */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2">Taxpayer Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Full Name</p>
              <p className="font-medium">John Doe</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tax Identification Number</p>
              <p className="font-medium">12345678-0001</p>
            </div>
            <div>
              <p className="text-muted-foreground">Business Name</p>
              <p className="font-medium">JD Consulting Services</p>
            </div>
            <div>
              <p className="text-muted-foreground">Business Type</p>
              <p className="font-medium">Freelancer / Self-Employed</p>
            </div>
          </div>
        </div>

        {/* Income Summary */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2">Income Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Gross Income</span>
              <span className="font-medium">₦2,450,000.00</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Business Expenses</span>
              <span className="font-medium text-red-600">-₦890,000.00</span>
            </div>
            <div className="flex justify-between py-2 border-t border-border font-semibold">
              <span>Net Income</span>
              <span>₦1,560,000.00</span>
            </div>
          </div>
        </div>

        {/* Reliefs and Deductions */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2">Reliefs and Deductions</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Consolidated Relief Allowance</span>
              <span className="font-medium text-green-600">-₦512,000.00</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Pension Contribution (8%)</span>
              <span className="font-medium text-green-600">-₦124,800.00</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">NHF Contribution (2.5%)</span>
              <span className="font-medium text-green-600">-₦39,000.00</span>
            </div>
            <div className="flex justify-between py-2 border-t border-border font-semibold">
              <span>Total Reliefs</span>
              <span className="text-green-600">-₦675,800.00</span>
            </div>
          </div>
        </div>

        {/* Tax Calculation */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b border-border pb-2">Tax Calculation</h2>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Taxable Income</span>
              <span className="font-medium">₦884,200.00</span>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">First ₦300,000 @ 7%</span>
              <span>₦21,000.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next ₦300,000 @ 11%</span>
              <span>₦33,000.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next ₦284,200 @ 15%</span>
              <span>₦42,630.00</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-border font-bold text-base">
              <span>Total Tax Payable</span>
              <span className="text-primary">₦96,630.00</span>
            </div>
          </div>
        </div>

        {/* Declaration */}
        <div className="border-t border-border pt-6">
          <p className="text-xs text-muted-foreground mb-4">
            I declare that the information provided in this return is true, correct and complete to the best of my
            knowledge and belief.
          </p>
          <div className="grid grid-cols-2 gap-8 mt-6">
            <div>
              <div className="border-t border-border pt-2">
                <p className="text-xs text-muted-foreground">Signature</p>
              </div>
            </div>
            <div>
              <div className="border-t border-border pt-2">
                <p className="text-xs text-muted-foreground">Date</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
