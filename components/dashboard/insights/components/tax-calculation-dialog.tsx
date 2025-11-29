"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { CalculationDetailsType } from "../utils/tax-calculation"

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`

interface TaxCalculationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calculationDetails: CalculationDetailsType | null
}

export function TaxCalculationDialog({
  open,
  onOpenChange,
  calculationDetails,
}: TaxCalculationDialogProps) {
  if (!calculationDetails) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tax Calculation Breakdown</DialogTitle>
          <DialogDescription>
            How we calculated your projected annual tax based on your year-to-date data.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-4 text-sm">
          {calculationDetails.periodType === "quarter" ? (
            <>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Year-to-Date (Actual)</h4>
                  <div className="space-y-1 text-muted-foreground pl-4">
                    <p>• Income: {formatCurrency(calculationDetails.ytdIncome)}</p>
                    <p>• Expenses: {formatCurrency(calculationDetails.ytdExpenses)}</p>
                    <p>• Reliefs: {formatCurrency(calculationDetails.ytdReliefs)}</p>
                    <p>• Quarters completed: {calculationDetails.quartersElapsed}</p>
                    {calculationDetails.monthsInCurrentQuarter > 0 && (
                      <p>• Months in current quarter: {calculationDetails.monthsInCurrentQuarter} of 3</p>
                    )}
                  </div>
                </div>

                    {calculationDetails.monthsRemainingInQuarter > 0 && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Current Quarter Projection</h4>
                        <div className="space-y-1 text-muted-foreground pl-4">
                          <p>• Average monthly income (current quarter): {formatCurrency(calculationDetails.avgMonthlyIncomeInQuarter)}</p>
                          <p>• Average monthly expenses (current quarter): {formatCurrency(calculationDetails.avgMonthlyExpensesInQuarter)}</p>
                          <p>• Average monthly reliefs (current quarter): {formatCurrency(calculationDetails.avgMonthlyReliefsInQuarter)}</p>
                          <p className="text-xs mt-2">
                            Based on {calculationDetails.monthsInCurrentQuarter} month(s) in current quarter
                          </p>
                          <p className="mt-2">• Average monthly (year-to-date): Income: {formatCurrency(calculationDetails.ytdIncome / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter))}, Expenses: {formatCurrency(calculationDetails.ytdExpenses / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter))}, Reliefs: {formatCurrency(calculationDetails.ytdReliefs / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter))}</p>
                          <p className="text-xs">
                            Based on {calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter} total months elapsed (YTD)
                          </p>
                          <p className="mt-2">• Months remaining in quarter: {calculationDetails.monthsRemainingInQuarter}</p>
                          <p>
                            • Projected for remaining months (using YTD average): {formatCurrency((calculationDetails.ytdIncome / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * calculationDetails.monthsRemainingInQuarter)} income, {formatCurrency((calculationDetails.ytdExpenses / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * calculationDetails.monthsRemainingInQuarter)} expenses, {formatCurrency((calculationDetails.ytdReliefs / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * calculationDetails.monthsRemainingInQuarter)} reliefs
                          </p>
                        </div>
                      </div>
                    )}

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Average per Quarter</h4>
                  <div className="space-y-1 text-muted-foreground pl-4">
                    {calculationDetails.quartersElapsed > 0 ? (
                      <>
                        <p>• Income from completed quarters: {formatCurrency(calculationDetails.ytdIncome - (calculationDetails.avgMonthlyIncomeInQuarter * calculationDetails.monthsInCurrentQuarter))}</p>
                        <p className="text-xs">
                          Calculated as: YTD ({formatCurrency(calculationDetails.ytdIncome)}) - Current quarter ({formatCurrency(calculationDetails.avgMonthlyIncomeInQuarter * calculationDetails.monthsInCurrentQuarter)})
                        </p>
                        <p>• Average income: {formatCurrency(calculationDetails.avgQuarterlyIncome)}</p>
                        <p>• Average expenses: {formatCurrency(calculationDetails.avgQuarterlyExpenses)}</p>
                        <p>• Average reliefs: {formatCurrency(calculationDetails.avgQuarterlyReliefs)}</p>
                        <p className="text-xs mt-2">
                          Formula: ₦{formatCurrency(calculationDetails.ytdIncome - (calculationDetails.avgMonthlyIncomeInQuarter * calculationDetails.monthsInCurrentQuarter)).replace('₦', '')} ÷ {calculationDetails.quartersElapsed} completed quarter(s) = {formatCurrency(calculationDetails.avgQuarterlyIncome)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p>• Average income: {formatCurrency(calculationDetails.avgQuarterlyIncome)}</p>
                        <p>• Average expenses: {formatCurrency(calculationDetails.avgQuarterlyExpenses)}</p>
                        <p>• Average reliefs: {formatCurrency(calculationDetails.avgQuarterlyReliefs)}</p>
                        <p className="text-xs mt-2">
                          Based on current quarter average
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {calculationDetails.quartersRemaining > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Projection for Remaining Quarters</h4>
                    <div className="space-y-1 text-muted-foreground pl-4">
                      <p>• Quarters remaining: {calculationDetails.quartersRemaining}</p>
                      <p className="text-xs">
                        Using YTD average per month × 3 months per quarter
                      </p>
                      <p>
                        • Projected income: {formatCurrency((calculationDetails.ytdIncome / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * 3)} × {calculationDetails.quartersRemaining} = {formatCurrency((calculationDetails.ytdIncome / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * 3 * calculationDetails.quartersRemaining)}
                      </p>
                      <p>
                        • Projected expenses: {formatCurrency((calculationDetails.ytdExpenses / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * 3)} × {calculationDetails.quartersRemaining} = {formatCurrency((calculationDetails.ytdExpenses / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * 3 * calculationDetails.quartersRemaining)}
                      </p>
                      <p>
                        • Projected reliefs: {formatCurrency((calculationDetails.ytdReliefs / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * 3)} × {calculationDetails.quartersRemaining} = {formatCurrency((calculationDetails.ytdReliefs / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * 3 * calculationDetails.quartersRemaining)}
                      </p>
                    </div>
                  </div>
                )}

                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Projected Annual Totals</h4>
                      <div className="space-y-1 text-muted-foreground pl-4">
                        <p>
                          • Annual income: {formatCurrency(calculationDetails.ytdIncome)} + {formatCurrency((calculationDetails.ytdIncome / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * calculationDetails.monthsRemainingInQuarter)} + {formatCurrency((calculationDetails.ytdIncome / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * 3 * calculationDetails.quartersRemaining)} = {formatCurrency(calculationDetails.projectedAnnualIncome)}
                        </p>
                        <p>
                          • Annual expenses: {formatCurrency(calculationDetails.ytdExpenses)} + {formatCurrency((calculationDetails.ytdExpenses / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * calculationDetails.monthsRemainingInQuarter)} + {formatCurrency((calculationDetails.ytdExpenses / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * 3 * calculationDetails.quartersRemaining)} = {formatCurrency(calculationDetails.projectedAnnualExpenses)}
                        </p>
                        <p>
                          • Annual reliefs: {formatCurrency(calculationDetails.ytdReliefs)} + {formatCurrency((calculationDetails.ytdReliefs / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * calculationDetails.monthsRemainingInQuarter)} + {formatCurrency((calculationDetails.ytdReliefs / (calculationDetails.quartersElapsed * 3 + calculationDetails.monthsInCurrentQuarter)) * 3 * calculationDetails.quartersRemaining)} = {formatCurrency(calculationDetails.projectedAnnualReliefs)}
                        </p>
                        <p className="text-xs mt-2">
                          Formula: YTD + (YTD average/month × Remaining months) + (Average/quarter × Remaining quarters)
                        </p>
                      </div>
                    </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Annual Totals (Actual)</h4>
                <div className="space-y-1 text-muted-foreground pl-4">
                  <p>• Income: {formatCurrency(calculationDetails.projectedAnnualIncome)}</p>
                  <p>• Expenses: {formatCurrency(calculationDetails.projectedAnnualExpenses)}</p>
                  <p>• Reliefs: {formatCurrency(calculationDetails.projectedAnnualReliefs)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-3 mt-3">
            <h4 className="font-semibold text-foreground mb-2">Tax Calculation</h4>
            <div className="space-y-1 text-muted-foreground pl-4">
              <p>
                • Taxable income: {formatCurrency(calculationDetails.projectedAnnualIncome)} - {formatCurrency(calculationDetails.projectedAnnualExpenses)} - {formatCurrency(calculationDetails.projectedAnnualReliefs)} = {formatCurrency(calculationDetails.projectedTaxableIncome)}
              </p>
              {calculationDetails.projectedTaxableIncome <= 1200000 ? (
                <p className="text-emerald-600 dark:text-emerald-400">
                  • Status: Below ₦1,200,000 threshold - Completely tax exempt
                </p>
              ) : calculationDetails.projectedTaxableIncome <= 800000 ? (
                <p className="text-emerald-600 dark:text-emerald-400">
                  • Status: Below ₦800,000 taxable threshold - No tax due
                </p>
              ) : (
                <>
                  <p>• Estimated tax: {formatCurrency(calculationDetails.estimatedTax)}</p>
                  <p>• Effective rate: {calculationDetails.effectiveRate.toFixed(1)}%</p>
                  {calculationDetails.periodType === "quarter" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      • Note: Quarterly tax should be calculated based on actual income in that quarter, not annual tax ÷ 4
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2 border-t">
            Note: Projections are estimates based on your year-to-date performance. Actual tax may vary based on your full-year results.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

