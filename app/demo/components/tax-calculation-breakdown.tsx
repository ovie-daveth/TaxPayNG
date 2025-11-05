interface TaxCalculationBreakdownProps {
  calculation: any
  formatCurrency: (amount: number) => string
}

export function TaxCalculationBreakdown({ calculation, formatCurrency }: TaxCalculationBreakdownProps) {
  const hasReliefs = calculation.totalReliefs > 0
  const reliefs = calculation.reliefs

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm mb-3">Tax Calculation Breakdown</h4>
      
      {/* Income and Expenses */}
      <div className="space-y-2 border-b pb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Gross Income</span>
          <span className="font-medium">{formatCurrency(calculation.grossIncome)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Business Expenses</span>
          <span className="font-medium text-destructive">-{formatCurrency(calculation.businessExpenses)}</span>
        </div>
        <div className="flex items-center justify-between text-sm font-medium pt-1 border-t">
          <span>Adjusted Gross Income</span>
          <span>{formatCurrency(calculation.adjustedGrossIncome)}</span>
        </div>
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

      {/* Taxable Income */}
      <div className="space-y-2 border-b pb-3">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Taxable Income</span>
          <span>{formatCurrency(calculation.taxableIncome)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Effective Rate: {calculation.effectiveRate}%
        </p>
      </div>

      {/* Tax Brackets */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground mb-2">Tax by Bracket:</p>
        {calculation.taxBrackets.map((bracket: any, index: number) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              ₦{bracket.amount.toLocaleString()} × {bracket.rate}%
            </span>
            <span className="font-medium">{formatCurrency(Math.round(bracket.tax))}</span>
          </div>
        ))}
      </div>

      {/* Total Tax */}
      <div className="pt-3 border-t space-y-2">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Annual Tax Payable</span>
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

