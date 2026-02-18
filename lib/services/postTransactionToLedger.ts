/**
 * Post a transaction to the General Ledger (SME + PLATINUM only).
 * Called from transactionService after creating an income/expense transaction.
 */

import type { Transaction } from '@/lib/types'
import type { UserProfile } from '@/lib/types'
import { ledgerService, canUseGeneralLedger } from './ledgerService'
import { businessEntityService } from './businessEntityService'
import { money } from '@/lib/utils/money'

function toDateString(val: string | undefined): string {
  if (!val) return new Date().toISOString().slice(0, 10)
  const d = val.slice(0, 10)
  return d.length === 10 ? d : new Date().toISOString().slice(0, 10)
}

/**
 * Resolve entityId for ledger: from transaction, or user's first/default business entity.
 */
async function resolveEntityId(userId: string, transactionEntityId?: string): Promise<string | null> {
  if (transactionEntityId) return transactionEntityId
  const res = await businessEntityService.getUserBusinessEntities(userId, 1, 1)
  const first = res.data?.[0]
  return first?.id ?? null
}

/**
 * Ensure Chart of Accounts exists for the entity; if not, copy template.
 */
async function ensureChartOfAccounts(entityId: string): Promise<boolean> {
  const res = await ledgerService.getAccountsByEntity(entityId)
  if (!res.success) return false
  if (res.data && res.data.length > 0) return true
  const copy = await ledgerService.copyTemplateToEntity(entityId)
  return copy.success
}

/**
 * Post an expense transaction to the GL: Dr Expense, Cr Cash.
 */
export async function postExpenseToLedger(
  userId: string,
  transaction: Transaction,
  profile: UserProfile
): Promise<void> {
  if (!canUseGeneralLedger(profile.businessType, profile.subscriptionType ?? null)) return
  const entityId = await resolveEntityId(userId, transaction.entityId)
  if (!entityId) return
  if (!(await ensureChartOfAccounts(entityId))) return
  const accountIds = await ledgerService.getDefaultAccountIds(entityId)
  if (!accountIds.success || !accountIds.data) return
  const cashId = accountIds.data.CASH
  const expenseId = accountIds.data.OPERATING_EXPENSES || accountIds.data.OTHER_EXPENSES
  if (!cashId || !expenseId) return
  const amount = money(transaction.amount)
  if (amount <= 0) return
  const date = toDateString(transaction.valueDate ?? transaction.transactionDate ?? transaction.date)
  const desc = `Expense: ${transaction.description || transaction.category}`.slice(0, 200)
  const create = await ledgerService.createJournalEntry({
    entityId,
    date,
    description: desc,
    source: 'expense',
    sourceId: transaction.id,
    createdBy: userId,
    lines: [
      { accountId: expenseId, debit: amount, credit: 0 },
      { accountId: cashId, debit: 0, credit: amount },
    ],
  })
  if (!create.success || !create.data) {
    console.error('postExpenseToLedger: create JE failed', create.error)
    return
  }
  await ledgerService.postEntry(create.data.id)
}

/**
 * Post an income transaction to the GL: Dr Cash, Cr Revenue.
 */
export async function postIncomeToLedger(
  userId: string,
  transaction: Transaction,
  profile: UserProfile
): Promise<void> {
  if (!canUseGeneralLedger(profile.businessType, profile.subscriptionType ?? null)) return
  const entityId = await resolveEntityId(userId, transaction.entityId)
  if (!entityId) return
  if (!(await ensureChartOfAccounts(entityId))) return
  const accountIds = await ledgerService.getDefaultAccountIds(entityId)
  if (!accountIds.success || !accountIds.data) return
  const cashId = accountIds.data.CASH
  const revenueId = accountIds.data.SALES_REVENUE || accountIds.data.SERVICE_REVENUE || accountIds.data.OTHER_INCOME
  if (!cashId || !revenueId) return
  const amount = money(transaction.amount)
  if (amount <= 0) return
  const date = toDateString(transaction.valueDate ?? transaction.transactionDate ?? transaction.date)
  const desc = `Income: ${transaction.description || transaction.category}`.slice(0, 200)
  const create = await ledgerService.createJournalEntry({
    entityId,
    date,
    description: desc,
    source: 'income',
    sourceId: transaction.id,
    createdBy: userId,
    lines: [
      { accountId: cashId, debit: amount, credit: 0 },
      { accountId: revenueId, debit: 0, credit: amount },
    ],
  })
  if (!create.success || !create.data) {
    console.error('postIncomeToLedger: create JE failed', create.error)
    return
  }
  await ledgerService.postEntry(create.data.id)
}
