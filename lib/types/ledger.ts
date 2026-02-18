/**
 * General Ledger and Chart of Accounts types.
 * Phase 1 — SME full accounting (SME + PLATINUM only).
 */

/** Account type for double-entry (Chart of Accounts) */
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

/** Ledger account (Chart of Accounts) */
export interface Account {
  id: string
  /** Business entity this account belongs to (or userId for single-entity SME) */
  entityId: string
  /** Account code (e.g. 1000, 2000, 4000) */
  code: string
  name: string
  type: AccountType
  /** Parent account id for hierarchy (optional) */
  parentId?: string
  /** From template — do not delete if in use */
  isSystem?: boolean
  createdAt: string
  updatedAt: string
}

/** Source of a journal entry (for audit and reporting) */
export type JournalEntrySource =
  | 'manual'
  | 'expense'
  | 'income'
  | 'invoice'
  | 'invoice_payment'
  | 'payroll'
  | 'tax_payment'
  | 'adjustment'
  | 'opening_balance'

/** Status of a journal entry */
export type JournalEntryStatus = 'draft' | 'posted'

/** A single line in a journal entry (one account, debit or credit) */
export interface JournalLine {
  accountId: string
  /** Debit amount (0 if this line is credit) */
  debit: number
  /** Credit amount (0 if this line is debit) */
  credit: number
  /** Optional memo for this line */
  memo?: string
}

/** Journal entry (double-entry: sum of debits = sum of credits) */
export interface JournalEntry {
  id: string
  entityId: string
  /** Transaction date (YYYY-MM-DD) */
  date: string
  description: string
  source: JournalEntrySource
  /** Id of source record (e.g. transaction id, invoice id) */
  sourceId?: string
  lines: JournalLine[]
  status: JournalEntryStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** Input to create a new account */
export type CreateAccountInput = Omit<Account, 'id' | 'createdAt' | 'updatedAt'>

/** Input to create a new journal entry (lines must balance) */
export interface CreateJournalEntryInput {
  entityId: string
  date: string
  description: string
  source: JournalEntrySource
  sourceId?: string
  lines: JournalLine[]
  createdBy: string
}
