/**
 * Standard SME Chart of Accounts template.
 * Phase 1.4 — seed data for General Ledger (SME + PLATINUM).
 * Copy to an entity via ledgerService.copyTemplateToEntity(entityId).
 */

import type { AccountType } from '@/lib/types/ledger'

export interface ChartOfAccountsTemplateItem {
  code: string
  name: string
  type: AccountType
  parentCode?: string
}

/** Standard SME CoA: Assets, Liabilities, Equity, Revenue, Expenses. */
export const STANDARD_SME_CHART_OF_ACCOUNTS: ChartOfAccountsTemplateItem[] = [
  // Assets (1xxx)
  { code: '1000', name: 'Cash and Bank', type: 'asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', parentCode: '1000' },
  { code: '1200', name: 'Inventory', type: 'asset' },
  { code: '1300', name: 'Prepaid Expenses', type: 'asset' },
  { code: '1400', name: 'Other Current Assets', type: 'asset' },
  { code: '1500', name: 'Fixed Assets', type: 'asset' },
  // Liabilities (2xxx)
  { code: '2000', name: 'Accounts Payable', type: 'liability' },
  { code: '2100', name: 'Tax Payable', type: 'liability' },
  { code: '2200', name: 'PAYE Payable', type: 'liability' },
  { code: '2300', name: 'VAT Payable', type: 'liability' },
  { code: '2400', name: 'Other Current Liabilities', type: 'liability' },
  { code: '2500', name: 'Loans and Borrowings', type: 'liability' },
  // Equity (3xxx)
  { code: '3000', name: 'Owner\'s Equity', type: 'equity' },
  { code: '3100', name: 'Retained Earnings', type: 'equity', parentCode: '3000' },
  // Revenue (4xxx)
  { code: '4000', name: 'Sales Revenue', type: 'revenue' },
  { code: '4100', name: 'Service Revenue', type: 'revenue' },
  { code: '4200', name: 'Other Income', type: 'revenue' },
  // Expenses (5xxx)
  { code: '5000', name: 'Cost of Sales', type: 'expense' },
  { code: '5100', name: 'Operating Expenses', type: 'expense' },
  { code: '5200', name: 'Salaries and Wages', type: 'expense' },
  { code: '5300', name: 'Rent', type: 'expense' },
  { code: '5400', name: 'Utilities', type: 'expense' },
  { code: '5500', name: 'Office and Admin', type: 'expense' },
  { code: '5600', name: 'Tax Expense', type: 'expense' },
  { code: '5700', name: 'Other Expenses', type: 'expense' },
]

/** Default account codes for common use (for posting JEs). */
export const DEFAULT_ACCOUNT_CODES = {
  CASH: '1000',
  ACCOUNTS_RECEIVABLE: '1100',
  ACCOUNTS_PAYABLE: '2000',
  TAX_PAYABLE: '2100',
  VAT_PAYABLE: '2300',
  PAYE_PAYABLE: '2200',
  OWNERS_EQUITY: '3000',
  RETAINED_EARNINGS: '3100',
  SALES_REVENUE: '4000',
  SERVICE_REVENUE: '4100',
  OTHER_INCOME: '4200',
  OPERATING_EXPENSES: '5100',
  SALARIES_WAGES: '5200',
  TAX_EXPENSE: '5600',
  OTHER_EXPENSES: '5700',
} as const
