# Analytics Insights Overview

The analytics insights panel surfaces actionable guidance for freelancers and creators by blending their income, expense, and relief data from Firestore with quarter-over-quarter trends. This document explains what data the feature relies on, how insights are computed, and how the UI adapts across dashboards.

## Goals

- turn raw transaction entries (income / expense / relief) into simple, motivational statements
- highlight growth and cost signals (income momentum, tooling spend, profitability, relief usage)
- keep insights trustworthy by grounding them in quarterly and monthly calculations
- support the demo experience with curated sample insights

## Data Sources

All runtime insights pull from Firestore via `transactionService.getTransactionsForPeriod(...)`.

| Field | Source | Notes |
| ----- | ------ | ----- |
| Income totals | `transaction.type === 'income'` | rolled up by month and quarter |
| Expense totals | `transaction.type === 'expense'` | includes category-based tooling analysis |
| Relief totals | `transaction.type === 'relief'` | treated as additional tax relief beyond calculator estimates |
| Historical comparisons | last 6 months | quarters computed using calendar quarter boundaries |

When Firestore is unavailable (demo mode or error), a small set of curated mock insights is shown instead.

## Key Modules

- `components/dashboard/analytics-insights.tsx` – client component that fetches data, computes insights, and renders cards.
- `lib/services/transactionService.ts` – exposes the helper `getTransactionsForPeriod` for date-bounded transaction fetches.
- `components/dashboard/income-expense-chart.tsx` – shares the same period-based transaction aggregation for chart context.
- `app/dashboard/page.tsx` and `app/dashboard-creator/page.tsx` – render the analytics card for freelancers and creators respectively (demo mode uses mock data via props).

## Insight Logic

1. **Fetch transactions** for the signed-in user across the last six months.
2. **Split quarters**:
   - current quarter: transactions whose `date >= currentQuarterStart`
   - previous quarter: `date >= previousQuarterStart && date < currentQuarterStart`
3. **Aggregate totals**:
   - income (per quarter, average per month)
   - expenses (total and % of income)
   - tooling spend (expense categories containing keywords like `software`, `subscription`, etc.)
   - relief total (manual tax relief transactions)
4. **Derive metrics**:
   - income growth vs previous quarter
   - tooling spend ratio vs income
   - net cash (income minus expenses)
   - expense ratio, relief coverage
5. **Build insights**:
   - positive, warning, or info tone depending on metrics
   - actionable tip text (`action`) encourages next steps
   - fallback insight prompts the user to add income if none exists

## UI Behavior

- Renders inside a `Card` with 2-column responsive grid.
- Each insight card includes:
  - tone badge & icon (`TrendingUp`, `AlertTriangle`, `ShieldCheck`)
  - headline metric (e.g., `▲ 22.1% vs last quarter`)
  - friendly explanation
  - optional action link (`Run a tool-by-tool ROI review`)
- Loading state shows skeletons until data finishes loading.
- Demo mode passes `useMockData` to ensure consistent preview content.

## Customization Tips

- To adjust tool detection, edit the `TOOL_KEYWORDS` array.
- To change quarter depth or lookback horizon, tweak `MONTHS_TO_ANALYZE` or the quarter boundaries.
- Additional insight types can be added in the `buildInsights(...)` function.
- The component accepts a `businessType` prop (`freelancer` or `creator`) to tailor thresholds or messaging.

## Validation Checklist

- Income and expense insights update after creating or editing transactions.
- Relief insight appears whenever at least one relief transaction exists in the current quarter.
- When no income is logged, users see a prompt to add transactions.
- Demo dashboard continues to show mock insights.

This design keeps analytics approachable and results-driven, helping users understand their tax data and act on it with confidence.

