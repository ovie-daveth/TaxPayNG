"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, User, Briefcase, Calculator } from "lucide-react"

interface EmployeeItemProps {
  employee: {
    id: string
    name: string
    position: string
    monthlySalary: number
    transportAllowance?: number
    housingAllowance?: number
    pensionContribution?: number
    healthInsurance?: number
    housingFund?: number
    annualSalary: number
    annualGrossIncome: number
    taxCalculation?: any
  }
  isExpanded: boolean
  onToggle: () => void
  formatCurrency: (amount: number) => string
}

export function EmployeeItem({ employee, isExpanded, onToggle, formatCurrency }: EmployeeItemProps) {
  const {
    name,
    position,
    monthlySalary,
    transportAllowance = 0,
    housingAllowance = 0,
    pensionContribution = 0,
    healthInsurance = 0,
    housingFund = 0,
    annualSalary,
    annualGrossIncome,
    taxCalculation,
  } = employee

  const monthlyGrossIncome = monthlySalary + (housingAllowance || 0)
  const monthlyNetSalary = monthlyGrossIncome - (taxCalculation?.totalTax || 0) / 12
  const taxableIncome = taxCalculation?.taxableIncome || 0
  const totalReliefs = taxCalculation?.totalReliefs || 0

  return (
    <Card className="overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-base">{name}</h3>
                <Badge variant="secondary" className="text-[10px] sm:text-xs">
                  {position}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Monthly: {formatCurrency(monthlySalary)} • Annual: {formatCurrency(annualSalary)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
            <div className="text-right min-w-[90px]">
              <p className="text-[11px] sm:text-xs text-muted-foreground">Monthly PAYE</p>
              <p className="font-semibold text-accent text-sm sm:text-base">
                {formatCurrency((taxCalculation?.totalTax || 0) / 12)}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border p-4 bg-muted/30">
          <div className="grid gap-5 sm:gap-6 sm:grid-cols-2">
            {/* Salary Breakdown */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Salary Breakdown
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Basic Salary (Monthly):</span>
                  <span className="font-medium">{formatCurrency(monthlySalary)}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Basic Salary (Annual):</span>
                  <span className="font-medium">{formatCurrency(annualSalary)}</span>
                </div>
                {housingAllowance > 0 && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Housing Allowance (Monthly):</span>
                    <span className="font-medium">{formatCurrency(housingAllowance)}</span>
                  </div>
                )}
                {transportAllowance > 0 && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Transport Allowance (Monthly):</span>
                    <span className="font-medium">{formatCurrency(transportAllowance)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Gross Income (Monthly):</span>
                    <span className="font-semibold">{formatCurrency(monthlyGrossIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Gross Income (Annual):</span>
                    <span className="font-semibold">{formatCurrency(annualGrossIncome)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Calculation */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Tax Calculation
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Gross Income:</span>
                  <span className="font-medium">{formatCurrency(annualGrossIncome)}</span>
                </div>

                {totalReliefs > 0 && (
                  <>
                    <div className="pt-2 border-t border-border">
                      <p className="text-[11px] sm:text-xs font-medium text-muted-foreground mb-2">Reliefs & Deductions:</p>
                      {pensionContribution > 0 && (
                        <div className="flex items-center justify-between text-[11px] sm:text-xs">
                          <span className="text-muted-foreground">Pension (8%):</span>
                          <span>{formatCurrency(pensionContribution * 12)}</span>
                        </div>
                      )}
                      {healthInsurance > 0 && (
                        <div className="flex items-center justify-between text-[11px] sm:text-xs">
                          <span className="text-muted-foreground">Health Insurance:</span>
                          <span>{formatCurrency(healthInsurance * 12)}</span>
                        </div>
                      )}
                      {housingFund > 0 && (
                        <div className="flex items-center justify-between text-[11px] sm:text-xs">
                          <span className="text-muted-foreground">Housing Fund:</span>
                          <span>{formatCurrency(housingFund * 12)}</span>
                        </div>
                      )}
                      {transportAllowance > 0 && (
                        <div className="flex items-center justify-between text-[11px] sm:text-xs">
                          <span className="text-muted-foreground">Transport Allowance (Exempt):</span>
                          <span>{formatCurrency(Math.min(transportAllowance * 12, 360000))}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-border mt-1 text-xs">
                        <span className="text-muted-foreground">Total Reliefs:</span>
                        <span className="font-medium">{formatCurrency(totalReliefs)}</span>
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Taxable Income:</span>
                    <span className="font-semibold">{formatCurrency(taxableIncome)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Annual Tax (PAYE):</span>
                    <span className="font-semibold text-accent">
                      {formatCurrency(taxCalculation?.totalTax || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Monthly PAYE:</span>
                    <span className="font-semibold text-accent">
                      {formatCurrency((taxCalculation?.totalTax || 0) / 12)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Net Salary (Monthly):</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(monthlyNetSalary)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Net Salary (Annual):</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(annualGrossIncome - (taxCalculation?.totalTax || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

