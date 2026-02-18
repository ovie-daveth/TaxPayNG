/**
 * General Ledger service — Chart of Accounts and Journal Entries.
 * SME + PLATINUM only. Use canUseGeneralLedger() to gate access.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import type {
  Account,
  JournalEntry,
  JournalLine,
  CreateJournalEntryInput,
  JournalEntryStatus,
} from '@/lib/types/ledger'
import type { ApiResponse } from '@/lib/types'
import { sum, eq } from '@/lib/utils/money'
import {
  STANDARD_SME_CHART_OF_ACCOUNTS,
  DEFAULT_ACCOUNT_CODES,
} from '@/lib/data/chart-of-accounts'

const ACCOUNTS_COLLECTION = 'accounts'
const JOURNAL_ENTRIES_COLLECTION = 'journal_entries'

function toIso(t: Timestamp | string | undefined): string {
  if (!t) return new Date().toISOString()
  if (typeof t === 'string') return t
  if (t && typeof t === 'object' && 'toDate' in t && typeof (t as Timestamp).toDate === 'function')
    return (t as Timestamp).toDate().toISOString()
  if (t && typeof t === 'object' && 'seconds' in t)
    return new Date((t as { seconds: number }).seconds * 1000).toISOString()
  return new Date().toISOString()
}

function mapAccountDoc(docSnap: any): Account {
  const d = docSnap.data()
  return {
    id: docSnap.id,
    entityId: d.entityId,
    code: d.code,
    name: d.name,
    type: d.type,
    parentId: d.parentId,
    isSystem: d.isSystem,
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
  }
}

function mapJournalEntryDoc(docSnap: any): JournalEntry {
  const d = docSnap.data()
  return {
    id: docSnap.id,
    entityId: d.entityId,
    date: typeof d.date === 'string' ? d.date : d.date?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? '',
    description: d.description,
    source: d.source,
    sourceId: d.sourceId,
    lines: Array.isArray(d.lines) ? d.lines.map((l: any) => ({
      accountId: l.accountId,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      memo: l.memo,
    })) : [],
    status: d.status || 'draft',
    createdBy: d.createdBy,
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
  }
}

export class LedgerService {
  /** Create an account (for custom accounts or template copy). */
  async createAccount(data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Account>> {
    try {
      const now = new Date().toISOString()
      const payload = {
        entityId: data.entityId,
        code: data.code,
        name: data.name,
        type: data.type,
        ...(data.parentId != null && { parentId: data.parentId }),
        ...(data.isSystem != null && { isSystem: data.isSystem }),
        createdAt: now,
        updatedAt: now,
      }
      const ref = await addDoc(collection(db, ACCOUNTS_COLLECTION), payload)
      const created = await this.getAccountById(ref.id)
      if (!created.data) throw new Error('Failed to load created account')
      return { success: true, data: created.data }
    } catch (error) {
      console.error('LedgerService.createAccount:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async getAccountById(id: string): Promise<ApiResponse<Account>> {
    try {
      const ref = doc(db, ACCOUNTS_COLLECTION, id)
      const snap = await getDoc(ref)
      if (!snap.exists()) return { success: false, error: 'Account not found' }
      return { success: true, data: mapAccountDoc(snap) }
    } catch (error) {
      console.error('LedgerService.getAccountById:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /** Get all accounts for an entity (Chart of Accounts). */
  async getAccountsByEntity(entityId: string): Promise<ApiResponse<Account[]>> {
    try {
      const q = query(
        collection(db, ACCOUNTS_COLLECTION),
        where('entityId', '==', entityId)
      )
      const snapshot = await getDocs(q)
      const accounts = snapshot.docs.map(mapAccountDoc).sort((a, b) => a.code.localeCompare(b.code))
      return { success: true, data: accounts }
    } catch (error) {
      console.error('LedgerService.getAccountsByEntity:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create a journal entry. Lines must balance (sum debits = sum credits).
   * Created as draft; call postEntry() to post.
   */
  async createJournalEntry(input: CreateJournalEntryInput): Promise<ApiResponse<JournalEntry>> {
    try {
      const totalDebit = sum(input.lines.map((l) => l.debit))
      const totalCredit = sum(input.lines.map((l) => l.credit))
      if (!eq(totalDebit, totalCredit)) {
        return {
          success: false,
          error: 'Journal entry must balance: sum(debits) must equal sum(credits)',
        }
      }
      const now = new Date().toISOString()
      const payload = {
        entityId: input.entityId,
        date: input.date,
        description: input.description,
        source: input.source,
        ...(input.sourceId != null && { sourceId: input.sourceId }),
        lines: input.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          ...(l.memo != null && { memo: l.memo }),
        })),
        status: 'draft' as JournalEntryStatus,
        createdBy: input.createdBy,
        createdAt: now,
        updatedAt: now,
      }
      const ref = await addDoc(collection(db, JOURNAL_ENTRIES_COLLECTION), payload)
      const created = await this.getJournalEntryById(ref.id)
      if (!created.data) throw new Error('Failed to load created journal entry')
      return { success: true, data: created.data }
    } catch (error) {
      console.error('LedgerService.createJournalEntry:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /** Post a draft journal entry (set status to posted). */
  async postEntry(entryId: string): Promise<ApiResponse<JournalEntry>> {
    try {
      const existing = await this.getJournalEntryById(entryId)
      if (!existing.data) return { success: false, error: existing.error ?? 'Entry not found' }
      if (existing.data.status === 'posted') {
        return { success: true, data: existing.data }
      }
      const now = new Date().toISOString()
      const ref = doc(db, JOURNAL_ENTRIES_COLLECTION, entryId)
      await updateDoc(ref, { status: 'posted', updatedAt: now })
      const updated = await this.getJournalEntryById(entryId)
      return updated.data ? { success: true, data: updated.data } : { success: false, error: 'Failed to load updated entry' }
    } catch (error) {
      console.error('LedgerService.postEntry:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async getJournalEntryById(id: string): Promise<ApiResponse<JournalEntry>> {
    try {
      const ref = doc(db, JOURNAL_ENTRIES_COLLECTION, id)
      const snap = await getDoc(ref)
      if (!snap.exists()) return { success: false, error: 'Journal entry not found' }
      return { success: true, data: mapJournalEntryDoc(snap) }
    } catch (error) {
      console.error('LedgerService.getJournalEntryById:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /** Get journal entries that touch an account (for ledger view). Fetches by entity then filters in memory. */
  async getEntriesByAccount(
    entityId: string,
    accountId: string,
    options?: { limitCount?: number }
  ): Promise<ApiResponse<JournalEntry[]>> {
    try {
      const q = query(
        collection(db, JOURNAL_ENTRIES_COLLECTION),
        where('entityId', '==', entityId),
        where('status', '==', 'posted'),
        orderBy('date', 'asc'),
        orderBy('createdAt', 'asc')
      )
      const snapshot = await getDocs(q)
      const entries = snapshot.docs.map(mapJournalEntryDoc)
      const filtered = entries.filter((e) => e.lines.some((l) => l.accountId === accountId))
      const limited =
        options?.limitCount != null ? filtered.slice(-options.limitCount) : filtered
      return { success: true, data: limited }
    } catch (error) {
      console.error('LedgerService.getEntriesByAccount:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /** Get journal entries for an entity in a date range. */
  async getEntriesByEntityAndDateRange(
    entityId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<JournalEntry[]>> {
    try {
      const q = query(
        collection(db, JOURNAL_ENTRIES_COLLECTION),
        where('entityId', '==', entityId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc'),
        orderBy('createdAt', 'asc')
      )
      const snapshot = await getDocs(q)
      const entries = snapshot.docs.map(mapJournalEntryDoc)
      return { success: true, data: entries }
    } catch (error) {
      console.error('LedgerService.getEntriesByEntityAndDateRange:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Copy the Standard SME Chart of Accounts to an entity.
   * Idempotent: if the entity already has accounts, returns success with existing count.
   */
  async copyTemplateToEntity(entityId: string): Promise<ApiResponse<{ created: number; total: number }>> {
    try {
      const existing = await this.getAccountsByEntity(entityId)
      if (!existing.success) return { success: false, error: existing.error }
      if (existing.data && existing.data.length > 0) {
        return { success: true, data: { created: 0, total: existing.data.length } }
      }
      const codeToId: Record<string, string> = {}
      let created = 0
      for (const item of STANDARD_SME_CHART_OF_ACCOUNTS) {
        const parentId = item.parentCode ? codeToId[item.parentCode] : undefined
        const result = await this.createAccount({
          entityId,
          code: item.code,
          name: item.name,
          type: item.type,
          parentId,
          isSystem: true,
        })
        if (!result.success || !result.data) return { success: false, error: result.error }
        codeToId[item.code] = result.data.id
        created += 1
      }
      return { success: true, data: { created, total: created } }
    } catch (error) {
      console.error('LedgerService.copyTemplateToEntity:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /** Get default account IDs for an entity (by code). Use after copyTemplateToEntity. */
  async getDefaultAccountIds(entityId: string): Promise<ApiResponse<Record<string, string>>> {
    const res = await this.getAccountsByEntity(entityId)
    if (!res.success || !res.data) return { success: false, error: res.error ?? 'Failed to load accounts' }
    const byCode: Record<string, string> = {}
    for (const a of res.data) byCode[a.code] = a.id
    const out: Record<string, string> = {}
    for (const [key, code] of Object.entries(DEFAULT_ACCOUNT_CODES)) {
      if (byCode[code]) out[key] = byCode[code]
    }
    return { success: true, data: out }
  }
}

export const ledgerService = new LedgerService()

/**
 * Whether the user can use General Ledger / full accounting.
 * Rule: subscriptionType must be PLATINUM, Small Business, or Big Business.
 */
export function canUseGeneralLedger(
  _businessType: string | undefined,
  subscriptionType: string | null | undefined
): boolean {
  const allowedPlans = ['PLATINUM', 'Small Business', 'Big Business']
  return subscriptionType != null && allowedPlans.includes(subscriptionType)
}
