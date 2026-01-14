interface TaxCalculationBreakdownProps {
  calculation: any
  formatCurrency: (amount: number) => string
}

export function TaxCalculationBreakdown({ calculation, formatCurrency }: TaxCalculationBreakdownProps) {
  const hasReliefs = calculation.totalReliefs > 0
  const reliefs = calculation.reliefs
  const isCIT = calculation.isCIT || false // Check if this is CIT calculation

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm mb-3">
        {isCIT ? "CIT (Company Income Tax) Calculation Breakdown" : "Tax Calculation Breakdown"}
      </h4>
      
      {/* Income and Expenses / Revenue and Expenses for CIT */}
      <div className="space-y-2 border-b pb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{isCIT ? "Revenue" : "Gross Income"}</span>
          <span className="font-medium">{formatCurrency(calculation.grossIncome)}</span>
        </div>
        {calculation.vatOutput > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Less: Output VAT (paid separately)</span>
            <span className="font-medium text-destructive">-{formatCurrency(calculation.vatOutput)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{isCIT ? "Operating Expenses" : "Business Expenses"}</span>
          <span className="font-medium text-destructive">-{formatCurrency(calculation.businessExpenses)}</span>
        </div>
        {(calculation.capitalAllowances > 0 || calculation.capitalAllowancesTotal > 0) && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Capital Allowances (Depreciation)</span>
            <span className="font-medium text-destructive">-{formatCurrency(calculation.capitalAllowances || calculation.capitalAllowancesTotal || 0)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm font-medium pt-1 border-t">
          <span>{isCIT ? "Profit Before Tax" : "Adjusted Gross Income"}</span>
          <span>{formatCurrency(calculation.adjustedGrossIncome || calculation.profitBeforeTax || 0)}</span>
        </div>
        {isCIT && calculation.totalDeductions > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Less: Other Deductions</span>
            <span className="font-medium text-destructive">-{formatCurrency(calculation.totalDeductions)}</span>
          </div>
        )}
      </div>

      {/* Reliefs */}
      {hasReliefs && (
        <div className="space-y-2 border-b pb-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Tax Reliefs:</p>
          {reliefs.rentRelief > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Rent Relief (20%)</span>
              <span className="text-primary">-{formatCurrency(reliefs.rentRelief)}</span>
            </div>
          )}
          {reliefs.pension > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Pension Contribution</span>
              <span className="text-primary">-{formatCurrency(reliefs.pension)}</span>
            </div>
          )}
          {reliefs.healthInsurance > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Health Insurance</span>
              <span className="text-primary">-{formatCurrency(reliefs.healthInsurance)}</span>
            </div>
          )}
          {reliefs.housingFund > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Housing Fund</span>
              <span className="text-primary">-{formatCurrency(reliefs.housingFund)}</span>
            </div>
          )}
          {reliefs.lifeInsurance > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Life Insurance</span>
              <span className="text-primary">-{formatCurrency(reliefs.lifeInsurance)}</span>
            </div>
          )}
          {reliefs.charitable > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Charitable Donations</span>
              <span className="text-primary">-{formatCurrency(reliefs.charitable)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm font-medium pt-1 border-t">
            <span>Total Reliefs</span>
            <span className="text-primary">-{formatCurrency(calculation.totalReliefs)}</span>
          </div>
        </div>
      )}

      {/* Taxable Income / Taxable Profit */}
      <div className="space-y-2 border-b pb-3">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>{isCIT ? "Taxable Profit" : "Taxable Income"}</span>
          <span>{formatCurrency(calculation.taxableIncome)}</span>
        </div>
        {isCIT ? (
          <div className="space-y-1">
            {calculation.isSmallCompany ? (
              <p className="text-xs text-green-600 font-medium">
                Small Company (0% CIT) • Turnover ≤ ₦100M & Assets ≤ ₦250M
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  CIT Rate: <span className="font-medium text-foreground">{calculation.citRate}%</span>
                </p>
                {calculation.isLargeMultinational && calculation.effectiveTaxRate !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Effective Tax Rate: <span className="font-medium text-foreground">{calculation.effectiveTaxRate}%</span>
                    {calculation.originalETR !== undefined && calculation.originalETR < 15 && (
                      <span className="text-xs text-amber-600 ml-2">
                        (Top-up applied: {formatCurrency(calculation.topUpTax || 0)})
                      </span>
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Effective Rate: {calculation.effectiveRate}%
          </p>
        )}
      </div>

      {/* Tax Brackets (for PIT) or CIT Calculation (for CIT) */}
      {isCIT ? (
        <div className="space-y-2 border-b pb-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">CIT Calculation:</p>
          {calculation.isSmallCompany ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Small Company Exempt</span>
              <span className="font-medium text-green-600">0% CIT</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {formatCurrency(calculation.taxableIncome)} × {calculation.citRate}%
              </span>
              <span className="font-medium">{formatCurrency(calculation.totalTax)}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Tax by Bracket:</p>
          {calculation.taxBrackets && calculation.taxBrackets.length > 0 ? (
            calculation.taxBrackets.map((bracket: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  ₦{bracket.amount.toLocaleString()} × {bracket.rate}%
                </span>
                <span className="font-medium">{formatCurrency(Math.round(bracket.tax))}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No tax brackets</p>
          )}
        </div>
      )}

      {/* WHT Credits */}
      {calculation.whtCredits > 0 && (
        <div className="space-y-2 border-b pb-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Tax Credits:</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Withholding Tax (WHT) Credits</span>
            <span className="font-medium text-green-600">-{formatCurrency(calculation.whtCredits)}</span>
          </div>
        </div>
      )}

      {/* Total Tax */}
      <div className="pt-3 border-t space-y-2">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Gross Tax Payable</span>
          <span className="text-accent">{formatCurrency((calculation.totalTax || 0) + (calculation.whtCredits || 0))}</span>
        </div>
        {calculation.whtCredits > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Less: WHT Credits</span>
            <span className="text-green-600">-{formatCurrency(calculation.whtCredits)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t">
          <span>Net Tax Payable</span>
          <span className="text-accent">{formatCurrency(calculation.totalTax)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Quarterly Payment</span>
          <span>{formatCurrency(Math.round(calculation.totalTax / 4))}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Monthly Set Aside</span>
          <span>{formatCurrency(Math.round(calculation.monthlySetAside))}</span>
        </div>
      </div>
    </div>
  )
}

