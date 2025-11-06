"use client"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, X } from "lucide-react"
import { formatCurrencyInput, handleCurrencyInputChange } from "@/lib/utils/currency"

interface WHTPaymentEntry {
  id: string
  paymentType: string
  amount: string
  recipientType: "resident" | "non-resident"
  hasTIN: boolean
  recipientIsSmallCompany: boolean
}

interface WHTIncomeEntry {
  id: string
  paymentType: string
  amount: string
  payerType: "resident" | "non-resident"
}

interface WithholdingTaxSectionProps {
  period: "monthly" | "quarterly" | "yearly"
  annualTurnover: string
  totalFixedAssets: string
  whtPaymentsMade: WHTPaymentEntry[]
  whtIncomeReceived: WHTIncomeEntry[]
  onAnnualTurnoverChange: (value: string) => void
  onTotalFixedAssetsChange: (value: string) => void
  onAddPayment: () => void
  onRemovePayment: (id: string) => void
  onUpdatePayment: (index: number, field: keyof WHTPaymentEntry, value: any) => void
  onAddIncome: () => void
  onRemoveIncome: (id: string) => void
  onUpdateIncome: (index: number, field: keyof WHTIncomeEntry, value: any) => void
  whtPaymentTypes: Array<{ value: string; label: string }>
}

export function WithholdingTaxSection({
  period,
  annualTurnover,
  totalFixedAssets,
  whtPaymentsMade,
  whtIncomeReceived,
  onAnnualTurnoverChange,
  onTotalFixedAssetsChange,
  onAddPayment,
  onRemovePayment,
  onUpdatePayment,
  onAddIncome,
  onRemoveIncome,
  onUpdateIncome,
  whtPaymentTypes,
}: WithholdingTaxSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Withholding Tax Information</h3>
      </div>
      
      {/* Small Company Check */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="annualTurnover">Annual Turnover (₦)</Label>
          <Input
            id="annualTurnover"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={formatCurrencyInput(annualTurnover)}
            onChange={(e) => {
              const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
              if (isValid) {
                onAnnualTurnoverChange(rawValue)
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            {period === "monthly" ? "Monthly turnover (will be annualized for calculation)" : period === "quarterly" ? "Quarterly turnover (will be annualized for calculation)" : "Annual turnover"} - Used to determine small company status
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalFixedAssets">Total Fixed Assets (₦)</Label>
          <Input
            id="totalFixedAssets"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={formatCurrencyInput(totalFixedAssets)}
            onChange={(e) => {
              const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
              if (isValid) {
                onTotalFixedAssetsChange(rawValue)
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            To determine if you qualify as small company
          </p>
        </div>
      </div>
      
      {/* Payments Made Section */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold">Payments Made (Where You Deduct WHT)</h4>
            <p className="text-sm text-muted-foreground">
              Add payments you made where you need to deduct and remit WHT for {period === "monthly" ? "this month" : period === "quarterly" ? "this quarter" : "the year"}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAddPayment}>
            + Add Payment
          </Button>
        </div>
        
        {whtPaymentsMade.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No payments added. Click "Add Payment" to start.
          </div>
        ) : (
          <div className="space-y-4">
            {whtPaymentsMade.map((payment, index) => (
              <Card key={payment.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h5 className="font-medium">Payment #{whtPaymentsMade.length - index}</h5>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemovePayment(payment.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select
                      value={payment.paymentType}
                      onValueChange={(value) => onUpdatePayment(index, "paymentType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {whtPaymentTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₦)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formatCurrencyInput(payment.amount)}
                      onChange={(e) => {
                        const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                        if (isValid) {
                          onUpdatePayment(index, "amount", rawValue)
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Recipient Type</Label>
                    <Select
                      value={payment.recipientType}
                      onValueChange={(value: "resident" | "non-resident") => onUpdatePayment(index, "recipientType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resident">Resident</SelectItem>
                        <SelectItem value="non-resident">Non-Resident</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recipient Has TIN</Label>
                    <Select
                      value={payment.hasTIN ? "yes" : "no"}
                      onValueChange={(value) => onUpdatePayment(index, "hasTIN", value === "yes")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No (Double Rate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`recipient-small-${payment.id}`}
                        checked={payment.recipientIsSmallCompany}
                        onCheckedChange={(checked) => onUpdatePayment(index, "recipientIsSmallCompany", checked === true)}
                      />
                      <Label htmlFor={`recipient-small-${payment.id}`} className="text-sm cursor-pointer">
                        Recipient is Small Company (Turnover ≤ ₦100M, Assets ≤ ₦250M)
                      </Label>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Income Received Section */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold">Income Received (Where WHT Was Deducted)</h4>
            <p className="text-sm text-muted-foreground">
              Add income you received where WHT was deducted from your payment for {period === "monthly" ? "this month" : period === "quarterly" ? "this quarter" : "the year"}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAddIncome}>
            + Add Income
          </Button>
        </div>
        
        {whtIncomeReceived.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No income entries added. Click "Add Income" to start.
          </div>
        ) : (
          <div className="space-y-4">
            {whtIncomeReceived.map((income, index) => (
              <Card key={income.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h5 className="font-medium">Income #{whtIncomeReceived.length - index}</h5>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveIncome(income.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select
                      value={income.paymentType}
                      onValueChange={(value) => onUpdateIncome(index, "paymentType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {whtPaymentTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount Received (₦)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formatCurrencyInput(income.amount)}
                      onChange={(e) => {
                        const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                        if (isValid) {
                          onUpdateIncome(index, "amount", rawValue)
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payer Type</Label>
                    <Select
                      value={income.payerType}
                      onValueChange={(value: "resident" | "non-resident") => onUpdateIncome(index, "payerType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resident">Resident</SelectItem>
                        <SelectItem value="non-resident">Non-Resident</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
        <p className="text-sm text-green-700 dark:text-green-300 mb-2">
          <strong>Small Company Exemption:</strong> Turnover ≤ ₦100M AND Assets ≤ ₦250M → <strong>Fully Exempt</strong> from withholding tax on both income received and payments made
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>⚠️ No TIN Penalty:</strong> If recipient does not have a valid TIN, you must apply <strong>double the standard rate</strong>
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          <strong>Filing Deadline:</strong> WHT must be remitted by the <strong>21st day of the month following deduction</strong>
        </p>
      </div>
    </div>
  )
}

