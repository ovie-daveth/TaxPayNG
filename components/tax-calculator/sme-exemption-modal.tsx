"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, X } from "lucide-react"

interface SMEExemptionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: () => void
}

export function SMEExemptionModal({ open, onOpenChange, onContinue }: SMEExemptionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Small Business Tax Exemptions</DialogTitle>
          <DialogDescription>
            Understanding why small businesses are exempt from certain taxes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Small Company Definition */}
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              Small Company Definition
            </h3>
            <p className="text-sm mb-3">
              To qualify as a small company, you must meet <strong>BOTH</strong> conditions:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Annual turnover ≤ <strong>₦100 million</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Total fixed assets ≤ <strong>₦250 million</strong></span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              <strong>Note:</strong> Both conditions must be met simultaneously. If you exceed either threshold, you lose small company status.
            </p>
          </div>

          {/* Tax Exemptions */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Tax Exemptions for Small Companies</h3>
            
            <div className="space-y-3">
              {/* Company Income Tax */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Company Income Tax (CIT)</h4>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    0% Rate
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Small companies pay <strong>0% CIT</strong> (normally 30% for large companies)
                </p>
              </div>

              {/* Development Levy */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Development Levy</h4>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    Exempt
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Small companies are <strong>fully exempt</strong> from the 4% development levy charged on assessable profits
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  The development levy supports national infrastructure including education, technology, and security funds.
                </p>
              </div>

              {/* Withholding Tax */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Withholding Tax</h4>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    Exempt
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Small companies are exempt from withholding tax:
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-4">
                  <li>• On income received from customers</li>
                  <li>• On payments made to suppliers</li>
                </ul>
              </div>

              {/* VAT */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Value Added Tax (VAT)</h4>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    Exempt if Turnover &lt; ₦100M
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Small companies with turnover &lt; ₦100 million:
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-4">
                  <li>• No need to register for VAT</li>
                  <li>• No VAT to charge, collect, or remit</li>
                  <li>• Completely exempt from VAT obligations</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Note:</strong> If turnover ≥ ₦100 million, you must register and charge VAT at 7.5%
                </p>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-2">Important Notes</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>To maintain exemption, ensure annual turnover stays below ₦100 million and total fixed assets remain below ₦250 million</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>You still need to file annual returns and comply with PAYE for employees</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">•</span>
                <span>Even if exempt from CIT, you must maintain proper books of account</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onContinue}>
            Continue to Calculator
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

