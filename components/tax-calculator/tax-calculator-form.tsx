"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calculator, Info } from "lucide-react"
import { calculateNigerianTax } from "@/lib/tax-calculator"

interface TaxCalculatorFormProps {
  onCalculate: (result: any) => void
  onInputsSaved?: (inputs: any) => void
}

export function TaxCalculatorForm({ onCalculate }: TaxCalculatorFormProps) {
  const [formData, setFormData] = useState({
    businessType: "freelancer",
    period: "yearly" as "monthly" | "quarterly" | "yearly",
    income: "",
    rentPaid: "",
    pensionContribution: "",
    healthInsurance: "",
    lifeInsurance: "",
    charitableDonations: "",
    businessExpenses: "",
    dependents: "0",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = calculateNigerianTax({
      businessType: formData.businessType,
      period: formData.period,
      income: Number.parseFloat(formData.income) || 0,
      rentPaid: Number.parseFloat(formData.rentPaid) || 0,
      pensionContribution: Number.parseFloat(formData.pensionContribution) || 0,
      healthInsurance: Number.parseFloat(formData.healthInsurance) || 0,
      lifeInsurance: Number.parseFloat(formData.lifeInsurance) || 0,
      charitableDonations: Number.parseFloat(formData.charitableDonations) || 0,
      businessExpenses: Number.parseFloat(formData.businessExpenses) || 0,
      dependents: Number.parseInt(formData.dependents) || 0,
    })
    onCalculate(result)
  }

  const getPeriodLabel = () => {
    switch (formData.period) {
      case "monthly":
        return "Monthly"
      case "quarterly":
        return "Quarterly"
      case "yearly":
        return "Annual"
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Calculate Your Tax</h2>
        <p className="text-sm text-muted-foreground mt-1">Enter your income and tax-deductible expenses</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="businessType">Business Type</Label>
            <Select
              value={formData.businessType}
              onValueChange={(value) => setFormData({ ...formData, businessType: value })}
            >
              <SelectTrigger id="businessType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="freelancer">Freelancer / Self-Employed</SelectItem>
                <SelectItem value="sme">Small & Medium Enterprise</SelectItem>
                <SelectItem value="individual">Individual (PAYE)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Calculation Period</Label>
            <Select
              value={formData.period}
              onValueChange={(value: "monthly" | "quarterly" | "yearly") => setFormData({ ...formData, period: value })}
            >
              <SelectTrigger id="period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="income">{getPeriodLabel()} Income (₦)</Label>
          <Input
            id="income"
            type="number"
            placeholder="0.00"
            value={formData.income}
            onChange={(e) => setFormData({ ...formData, income: e.target.value })}
            required
          />
          <p className="text-xs text-muted-foreground">Your total gross income for the period</p>
        </div>

        <div className="border-t border-border pt-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold">Tax-Deductible Expenses</h3>
            <Info className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              💡 Enter your expenses for the selected period ({getPeriodLabel().toLowerCase()})
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              The calculator will automatically convert them to annual amounts for tax calculation
            </p>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Only expenses that qualify for tax relief under Nigerian tax law
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rentPaid">{getPeriodLabel()} Rent Paid (₦)</Label>
              <Input
                id="rentPaid"
                type="number"
                placeholder="0.00"
                value={formData.rentPaid}
                onChange={(e) => setFormData({ ...formData, rentPaid: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">20% of rent paid is deductible (max ₦500,000/year)</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pensionContribution">{getPeriodLabel()} Pension Contributions (₦)</Label>
                <Input
                  id="pensionContribution"
                  type="number"
                  placeholder="0.00"
                  value={formData.pensionContribution}
                  onChange={(e) => setFormData({ ...formData, pensionContribution: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Up to 8% of annual income</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="healthInsurance">{getPeriodLabel()} Health Insurance (₦)</Label>
                <Input
                  id="healthInsurance"
                  type="number"
                  placeholder="0.00"
                  value={formData.healthInsurance}
                  onChange={(e) => setFormData({ ...formData, healthInsurance: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">NHIS or private HMO premiums</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lifeInsurance">{getPeriodLabel()} Life Insurance (₦)</Label>
                <Input
                  id="lifeInsurance"
                  type="number"
                  placeholder="0.00"
                  value={formData.lifeInsurance}
                  onChange={(e) => setFormData({ ...formData, lifeInsurance: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Premium payments for life insurance</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="charitableDonations">{getPeriodLabel()} Charitable Donations (₦)</Label>
                <Input
                  id="charitableDonations"
                  type="number"
                  placeholder="0.00"
                  value={formData.charitableDonations}
                  onChange={(e) => setFormData({ ...formData, charitableDonations: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">To approved NGOs (max 10% of annual income)</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessExpenses">{getPeriodLabel()} Business Expenses (₦)</Label>
              <Input
                id="businessExpenses"
                type="number"
                placeholder="0.00"
                value={formData.businessExpenses}
                onChange={(e) => setFormData({ ...formData, businessExpenses: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Costs wholly, exclusively, and necessarily incurred in producing income
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dependents">Number of Dependents</Label>
          <Select
            value={formData.dependents}
            onValueChange={(value) => setFormData({ ...formData, dependents: value })}
          >
            <SelectTrigger id="dependents">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0</SelectItem>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full" size="lg">
          <Calculator className="w-4 h-4 mr-2" />
          Calculate Tax
        </Button>
      </form>
    </Card>
  )
}
