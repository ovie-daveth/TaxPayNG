"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, X, Receipt, Info, Calculator } from "lucide-react"
import { toast } from "sonner"
import { VAT_EXEMPT_SUPPLIES, VAT_ZERO_RATED_SUPPLIES, getVATSupplyStatus, type VATSupplyStatus } from "@/lib/tax/vat-config"
import { calculateVAT, type VATSupply, type VATInputEntry } from "@/lib/tax/vat-calculator"
import { formatCurrencyInput, handleCurrencyInputChange } from "@/lib/utils/currency"

interface VATFormProps {
  period: "monthly" | "quarterly" | "yearly"
  annualTurnover: string
  onAnnualTurnoverChange: (value: string) => void
  onCalculate: (result: ReturnType<typeof calculateVAT>) => void
  showExplanations?: boolean
}

// Internal state type for form (amounts as strings)
interface VATSupplyForm {
  id: string
  description: string
  amount: string
  status: VATSupplyStatus
}

interface VATInputEntryForm {
  id: string
  description: string
  amount: string
  category: "services" | "capital-assets" | "overheads"
  eligibleForCredit: boolean
}

export function VATForm({ period, annualTurnover, onAnnualTurnoverChange, onCalculate, showExplanations = true }: VATFormProps) {
  const [supplies, setSupplies] = useState<VATSupplyForm[]>([
    { id: Date.now().toString(), description: "", amount: "", status: "taxable" }
  ])
  
  const [inputVATEntries, setInputVATEntries] = useState<VATInputEntryForm[]>([
    { id: Date.now().toString(), description: "", amount: "", category: "services", eligibleForCredit: true }
  ])

  const handleAddSupply = () => {
    setSupplies([{
      id: Date.now().toString(),
      description: "",
      amount: "",
      status: "taxable"
    }, ...supplies])
  }

  const handleRemoveSupply = (id: string) => {
    setSupplies(supplies.filter(s => s.id !== id))
  }

  const handleSupplyChange = (id: string, field: keyof VATSupplyForm, value: any) => {
    setSupplies(supplies.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value }
        // Auto-detect status based on description - always re-check when description changes
        if (field === "description") {
          const detectedStatus = getVATSupplyStatus(value)
          updated.status = detectedStatus
        }
        return updated
      }
      return s
    }))
  }

  const handleAddInputVAT = () => {
    setInputVATEntries([{
      id: Date.now().toString(),
      description: "",
      amount: "",
      category: "services",
      eligibleForCredit: true
    }, ...inputVATEntries])
  }

  const handleRemoveInputVAT = (id: string) => {
    setInputVATEntries(inputVATEntries.filter(e => e.id !== id))
  }

  const handleInputVATChange = (id: string, field: keyof VATInputEntryForm, value: any) => {
    setInputVATEntries(inputVATEntries.map(e => {
      if (e.id === id) {
        return { ...e, [field]: value }
      }
      return e
    }))
  }

  const handleSubmit = () => {
    const turnover = Number.parseFloat(annualTurnover) || 0
    
    // Convert to annual for status check
    let annualTurnoverForCheck = turnover
    if (period === "monthly") {
      annualTurnoverForCheck = turnover * 12
    } else if (period === "quarterly") {
      annualTurnoverForCheck = turnover * 4
    }

    // Filter out empty supplies and input VAT entries
    const validSupplies: VATSupply[] = supplies
      .filter(s => s.description && s.amount && Number.parseFloat(s.amount) > 0)
      .map(s => ({ 
        id: s.id,
        description: s.description, 
        amount: Number.parseFloat(s.amount) || 0,
        status: s.status
      }))
    
    const validInputVAT: VATInputEntry[] = inputVATEntries
      .filter(e => e.description && e.amount && Number.parseFloat(e.amount) > 0)
      .map(e => ({ 
        id: e.id,
        description: e.description,
        amount: Number.parseFloat(e.amount) || 0,
        category: e.category,
        eligibleForCredit: e.eligibleForCredit
      }))

    if (validSupplies.length === 0) {
      toast.error("Please add at least one supply entry with description and amount")
      return
    }
    
    // Validate input VAT entries
    const incompleteInputVAT = inputVATEntries.some(e => 
      (e.description && !e.amount) || (e.amount && !e.description)
    )
    if (incompleteInputVAT) {
      toast.error("Please complete all input VAT entries (Description and Amount required)")
      return
    }

    const result = calculateVAT({
      annualTurnover: annualTurnoverForCheck,
      supplies: validSupplies,
      inputVATEntries: validInputVAT,
      period,
    })

    onCalculate(result)
  }

  const getSupplyStatusBadgeColor = (status: VATSupplyStatus) => {
    switch (status) {
      case "exempt":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      case "zero-rated":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
      case "taxable":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
        <h3 className="text-base sm:text-lg font-semibold">VAT Information</h3>
      </div>

      {/* Annual Turnover */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="vatTurnover" className="text-xs sm:text-sm">Annual Turnover (₦)</Label>
        <Input
          id="vatTurnover"
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
          className="h-9 sm:h-10 text-xs sm:text-sm"
        />
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          {period === "monthly" ? "Monthly turnover (will be annualized for exemption check)" : period === "quarterly" ? "Quarterly turnover (will be annualized for exemption check)" : "Annual turnover"} - Used to determine VAT registration requirement
        </p>
      </div>

      {/* Supplies Section */}
      <div className="border-t border-border pt-3 sm:pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-base sm:text-lg font-semibold">Taxable Supplies</h4>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Add all supplies (goods/services) for {period === "monthly" ? "this month" : period === "quarterly" ? "this quarter" : "the year"}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleAddSupply} className="self-start sm:self-auto shrink-0">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="text-xs sm:text-sm">Add Supply</span>
          </Button>
        </div>

        {supplies.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">
            No supplies added. Click "Add Supply" to start.
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {supplies.map((supply, index) => (
              <Card key={supply.id} className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <h5 className="text-sm sm:text-base font-medium">Supply #{supplies.length - index}</h5>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSupply(supply.id)}
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2 sm:col-span-2">
                    <Label className="text-xs sm:text-sm">Description</Label>
                    <Input
                      type="text"
                      placeholder="e.g., Software services, Bread, Medical equipment"
                      value={supply.description}
                      onChange={(e) => handleSupplyChange(supply.id, "description", e.target.value)}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Description helps auto-detect if supply is exempt or zero-rated
                    </p>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Amount (₦)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formatCurrencyInput(supply.amount)}
                      onChange={(e) => {
                        const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                        if (isValid) {
                          handleSupplyChange(supply.id, "amount", rawValue)
                        }
                      }}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">VAT Status</Label>
                    <Select
                      value={supply.status}
                      onValueChange={(value: VATSupplyStatus) => handleSupplyChange(supply.id, "status", value)}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="taxable" className="text-xs sm:text-sm">Taxable (7.5%)</SelectItem>
                        <SelectItem value="exempt" className="text-xs sm:text-sm">Exempt</SelectItem>
                        <SelectItem value="zero-rated" className="text-xs sm:text-sm">Zero-Rated (0%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className={`text-[10px] sm:text-xs px-2 py-1 rounded ${getSupplyStatusBadgeColor(supply.status)}`}>
                      {supply.status === "taxable" ? "7.5% VAT applies" : supply.status === "exempt" ? "No VAT" : "0% VAT"}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Input VAT Section */}
      <div className="border-t border-border pt-3 sm:pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-base sm:text-lg font-semibold">Input VAT (VAT Paid on Purchases)</h4>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Add VAT paid on purchases for {period === "monthly" ? "this month" : period === "quarterly" ? "this quarter" : "the year"}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleAddInputVAT} className="self-start sm:self-auto shrink-0">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="text-xs sm:text-sm">Add Input VAT</span>
          </Button>
        </div>

        {inputVATEntries.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">
            No input VAT entries added. Click "Add Input VAT" to start.
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {inputVATEntries.map((entry, index) => (
              <Card key={entry.id} className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <h5 className="text-sm sm:text-base font-medium">Input VAT #{inputVATEntries.length - index}</h5>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveInputVAT(entry.id)}
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2 sm:col-span-2">
                    <Label className="text-xs sm:text-sm">Description</Label>
                    <Input
                      type="text"
                      placeholder="e.g., Office rent, Equipment purchase, Professional services"
                      value={entry.description}
                      onChange={(e) => handleInputVATChange(entry.id, "description", e.target.value)}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">VAT Amount (₦)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formatCurrencyInput(entry.amount)}
                      onChange={(e) => {
                        const { isValid, rawValue } = handleCurrencyInputChange(e.target.value)
                        if (isValid) {
                          handleInputVATChange(entry.id, "amount", rawValue)
                        }
                      }}
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Category</Label>
                    <Select
                      value={entry.category}
                      onValueChange={(value: "services" | "capital-assets" | "overheads" | "goods") => handleInputVATChange(entry.id, "category", value)}
                    >
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="goods" className="text-xs sm:text-sm">Goods/Raw Materials</SelectItem>
                        <SelectItem value="services" className="text-xs sm:text-sm">Services</SelectItem>
                        <SelectItem value="capital-assets" className="text-xs sm:text-sm">Capital Assets</SelectItem>
                        <SelectItem value="overheads" className="text-xs sm:text-sm">Overheads</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 sm:col-span-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`eligible-${entry.id}`}
                        checked={entry.eligibleForCredit}
                        onCheckedChange={(checked) => handleInputVATChange(entry.id, "eligibleForCredit", checked === true)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`eligible-${entry.id}`} className="text-xs sm:text-sm cursor-pointer">
                        Eligible for Input VAT Credit
                      </Label>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Input VAT on goods, services, capital assets, and overheads used for making taxable supplies can be claimed as credit against your Output VAT. <strong>Note:</strong> Input VAT does NOT reduce your CIT liability; CIT is calculated separately on profit.
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Info Box - Toggleable on mobile */}
      <div className={`space-y-3 ${showExplanations ? 'block' : 'hidden md:block'}`}>
        <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 min-w-0 flex-1">
              <p className="font-semibold mb-1.5 sm:mb-2">VAT Exemptions:</p>
              <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 text-[11px] sm:text-xs leading-relaxed">
                <li>Basic food items (bread, milk, etc.)</li>
                <li>Medical and pharmaceutical products</li>
                <li>Books and educational materials</li>
                <li>Agricultural products</li>
                <li>Exports of goods and services</li>
                <li>Financial services</li>
                <li>Residential rent</li>
                <li>Public transportation</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 min-w-0 flex-1">
              <p className="font-semibold mb-1">Important: Input VAT vs CIT</p>
              <p className="text-[11px] sm:text-xs leading-relaxed">
                • <strong>Input VAT</strong> (VAT paid on purchases) can be claimed as a <strong>credit against Output VAT</strong> only. It reduces the Net VAT you pay.<br/>
                • <strong>Input VAT does NOT reduce CIT</strong>. CIT (Company Income Tax) is calculated separately on your assessable profit, and input VAT is not deductible for CIT purposes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <Button type="button" onClick={handleSubmit} className="w-full" size="lg">
        <Calculator className="w-4 h-4 sm:mr-2" />
        <span className="hidden sm:inline">Calculate VAT</span>
        <span className="sm:hidden">Calculate</span>
      </Button>
    </div>
  )
}

