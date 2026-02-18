# OTax SME Upgrade: From Tax-First OS to Full Accounting Engine

**Document purpose:** Strategic and technical plan for evolving OTax from a tax/compliance tool into a double-entry accounting system for SMEs.  
**Audience:** Product, engineering, and leadership.  
**Last updated:** February 2025.

**Phase 0 (foundation) is tracked in:** [docs/phase-0/](phase-0/README.md) — use that folder to work through 0.1–0.5 step by step.

---

## 1. Executive Summary

**Current state:** OTax is a **tax-first operating system** for SMEs — structured cash tracking with compliance (income/expense, invoicing, payroll, tax filing).

**Target state:** A **full bookkeeping and accounting engine** — double-entry general ledger, chart of accounts, AR/AP, bank reconciliation, financial statements, and audit trail. SMEs run their books inside OTax; the product becomes infrastructure, not just a tax app.

**Strategic choice:** This is not a feature set — it’s a **foundation rebuild**. The decision is whether to become **Nigeria’s QuickBooks** (full accounting) or remain the **Stripe of tax compliance** (focused, capital-efficient). Different wars, different capital, different moats.

---

## 2. Current State (What OTax Already Has)

| Capability | Status | Notes |
|------------|--------|--------|
| Income & expense tracking | ✅ | `transactions` (type: income/expense), categories, dates; single-entry |
| Tax filing & payment | ✅ | VAT, CIT, PAYE, WHT; reports, RRR, filing flows |
| Invoicing | ✅ | Outgoing/incoming, VAT/WHT, link to transactions; `invoiceService` |
| Payroll generation | ✅ | Employees, payroll runs, PAYE; `payrollService`, `dashboard-sme/payroll` |
| Multi-entity (businesses) | ✅ | `businessEntityService`, entity-scoped invoices |
| Tax classification (Gold+) | ✅ | Allowable/disallowable, VAT, WHT, capital assets |
| Reports (tax-focused) | ✅ | Income statement, expense report, tax summary, self-assessment |
| Data layer | Firebase/Firestore | `BaseService` pattern; no ledger, no double-entry |

**Gap in one sentence:** We have **organized cash tracking with compliance**; we do **not** have a **general ledger**, **chart of accounts**, or **double-entry** — so we cannot produce authoritative balance sheets, proper AR/AP aging, or bank reconciliation.

---

## 3. Target Capabilities (What “Full Accounting” Means)

### 3.1 Double-Entry and General Ledger (Core)

- **General Ledger (GL):** Master record of all transactions. Every invoice, expense, payroll entry, and tax payment **posts automatically** to ledger accounts (debit/credit pairs). No “phantom money”; books always balance.
- **Chart of Accounts (CoA):** Pre-defined and customizable account categories:
  - **Assets:** Cash, receivables, inventory (if applicable)
  - **Liabilities:** Loans, payables, taxes owed
  - **Equity**
  - **Revenue**
  - **Expenses**
- SMEs should get **templates** (e.g. “Standard SME”, “Trading”, “Services”); not build CoA from scratch.

### 3.2 Receivables and Payables

- **Accounts Receivable (AR):** Who owes the business; aging (30/60/90 days); link invoices → AR → cash when paid.
- **Accounts Payable (AP):** Who the business owes; aging; link bills/incoming invoices → AP → cash when paid.

### 3.3 Bank Reconciliation

- Match bank transactions (feeds) to ledger entries.
- Open banking / bank APIs become the main lever for automated matching and categorization.

### 3.4 Financial Statements (Auto-Generated)

- **Profit & Loss (P&L)** — already partially covered by “income statement”; must be driven from GL.
- **Balance Sheet** — assets, liabilities, equity; only possible with double-entry.
- **Cash Flow Statement** — operating, investing, financing; from GL + cash account movements.

Without these three, serious SMEs and investors will not treat OTax as “real accounting.”

### 3.5 Optional but High-Value (e.g. Trading SMEs)

- **Inventory:** COGS, stock valuation (e.g. FIFO), optional modules so we don’t overbuild for non-trading SMEs.

### 3.6 Compliance and Control

- **Audit trail:** Immutable transaction logs (who, what, when); important for Nigeria’s regulatory environment.
- **Role-based access control (RBAC):** Owner, accountant, staff — who can post, approve, view only.

### 3.7 Period and Closing

- **Multi-period reporting:** Monthly, quarterly, yearly; period closing logic so prior periods are locked and reports are consistent.

---

## 4. Phased Implementation Plan

### Phase 0: Foundation and Decision (Pre-Build) 

| # | Task | Owner | Notes |
|---|------|--------|------|
| 0.1 | Formal go/no-go: “QuickBooks path” vs “tax compliance path” | Leadership | Capital, team, timeline |
| 0.2 | Engage (or designate) a **certified accountant** for GL/CoA design and validation | Product / Ops | Non-negotiable for correctness |
| 0.3 | Choose approach: **extend Firestore** vs **add dedicated DB** for ledger (e.g. Postgres for GL + Firestore for app data) | Engineering | Ledger has strict consistency and reporting needs |
| 0.4 | Document current transaction/invoice/payroll flows and map to future **journal entries** (which accounts debited/credited) | Engineering + Accountant | E.g. “Invoice paid” → Dr Cash, Cr AR; “Expense” → Dr Expense, Cr Cash |

**Deliverable:** Decision memo + high-level data model (ledger, accounts, journal entries).

---

### Phase 1: General Ledger and Chart of Accounts

**Goal:** Every financial event creates **journal entries** (double-entry); no more “naked” income/expense only.

| # | Task | Technical notes |
|---|------|-----------------|
| 1.1 | **Data model: Chart of Accounts** | New Firestore collection (or DB table): `accounts` — id, entityId, code, name, type (asset/liability/equity/revenue/expense), parentId (for hierarchy), isSystem (template), createdAt. |
| 1.2 | **CoA templates** | Seed “Standard SME” (and optionally “Trading”) CoA; allow copy-to-entity and light customization (new accounts, no delete of system accounts in use). |
| 1.3 | **Data model: General Ledger / Journal** | `journal_entries`: id, entityId, date, description, source (invoice|expense|payroll|tax|manual|adjustment), sourceId (ref to invoice/transaction/payroll run), lines[]: { accountId, debit, credit }, status (draft|posted), createdBy, createdAt. Ensure **sum(debit) = sum(credit)** at write time. |
| 1.4 | **Ledger write service** | `ledgerService`: createJournalEntry(), postEntry(), getEntriesByAccount(), getEntriesByEntityAndDateRange(). All writes go through this; no direct transaction creation for “money” without a journal. |
| 1.5 | **Map existing flows to journal entries** | When user adds expense → create expense transaction **and** post JE (Dr Expense, Cr Cash). When invoice is paid → post JE (Dr Cash, Cr AR). Payroll run → JEs for salary expense, PAYE liability, net pay (Cash). Tax payment → Dr Tax liability, Cr Cash. |
| 1.6 | **Backfill / migration strategy** | Decide: new entities get GL-only; existing entities get optional “migrate to GL” (generate opening JEs from current balances) or start GL from a chosen date. |

**Deliverable:** CoA in DB, ledger + journal model, `ledgerService`, and at least one end-to-end flow (e.g. expense or invoice payment) posting to GL. No UI required yet beyond internal tools if needed.

---

### Phase 2: Accounts Receivable and Payable

**Goal:** AR/AP are first-class; aging reports (30/60/90) and clear “who owes / whom we owe.”

| # | Task | Technical notes |
|---|------|-----------------|
| 2.1 | **AR model** | Link invoices (and optionally other sources) to AR account and sub-ledger: contactId, invoiceId, amount, dueDate, status (open|partial|paid), paidAmount, paidAt. |
| 2.2 | **AP model** | Similar: bills / incoming invoices → AP sub-ledger; contactId, amount, dueDate, status. |
| 2.3 | **Aging reports** | Query AR/AP by bucket: 0–30, 31–60, 61–90, 90+ days; expose via `reportService` or dedicated `arApService`. |
| 2.4 | **Payment application** | When user records “invoice paid” or “bill paid,” update AR/AP and post cash JEs (Dr Cash / Cr AR or Dr AP / Cr Cash). |
| 2.5 | **UI: AR/AP list and aging** | `dashboard-sme`: e.g. “Receivables” and “Payables” with aging; link to invoices/bills. |

**Deliverable:** AR/AP data and logic, aging reports, and SME dashboard views.

---

### Phase 3: Financial Statements from GL

**Goal:** P&L, Balance Sheet, and Cash Flow Statement generated **from ledger data**, not from ad-hoc transaction sums.

| # | Task | Technical notes |
|---|------|-----------------|
| 3.1 | **P&L** | Aggregate revenue and expense accounts for period; reuse existing “income statement” UX but feed from GL. |
| 3.2 | **Balance Sheet** | Snapshot of assets, liabilities, equity at a date; sum account balances by type from ledger. |
| 3.3 | **Cash Flow Statement** | Operating (e.g. net income + non-cash, ± working capital), investing, financing; derive from GL and cash account movements. |
| 3.4 | **Report service refactor** | `reportService` (or new `financialStatementService`) reads from ledger/CoA; keep tax reports aligned (same numbers for tax and management reports). |

**Deliverable:** All three statements auto-generated from GL; visible in `dashboard-sme/reports` and export (PDF/Excel) where applicable.

---

### Phase 4: Bank Reconciliation

**Goal:** Match bank transactions to ledger entries; reconcile bank balance to GL cash.

| # | Task | Technical notes |
|---|------|-----------------|
| 4.1 | **Bank feed ingestion** | Integrate open banking or bank APIs (e.g. Nigeria open banking) to pull transactions; store in `bank_transactions` (or similar) with entityId, accountId, date, amount, counterparty, reference. |
| 4.2 | **Matching engine** | Rule-based and/or manual: link bank_transaction ↔ journal line (cash); status (matched|unmatched|ignored). |
| 4.3 | **Reconciliation UI** | Screen: show bank balance vs GL cash; list unmatched bank rows and unmatched GL cash entries; user matches or marks as reconciled. |
| 4.4 | **Reconciliation audit** | Store reconciliation events (which bank tx + which JE line, when, by whom) for audit. |

**Deliverable:** Bank feed (at least one provider), matching, and reconciliation screen for SMEs.

---

### Phase 5: Audit Trail and RBAC

**Goal:** Immutable audit log and clear roles so accountants and owners trust the system.

| # | Task | Technical notes |
|---|------|-----------------|
| 5.1 | **Audit log** | Append-only store: entityId, userId, action (create|update|delete|post), resource (journal_entry|invoice|payment), resourceId, oldValue (optional), newValue (optional), timestamp, IP. Firestore or separate store; consider retention policy. |
| 5.2 | **RBAC model** | Roles per entity: e.g. owner, accountant, staff. Permissions: view only, post transactions, approve/post JEs, manage users, full. |
| 5.3 | **Enforce in API and UI** | All ledger and AR/AP writes check role; audit log on sensitive actions. |
| 5.4 | **UI: Team / permissions** | `dashboard-sme/settings` or “Team”: invite, assign role, revoke. |

**Deliverable:** Audit trail for key actions; RBAC enforced; team management UI.

---

### Phase 6: Period Closing and Multi-Period Reporting

**Goal:** Monthly/quarterly/yearly books can be “closed”; reports by period are consistent and locked.

| # | Task | Technical notes |
|---|------|-----------------|
| 6.1 | **Period definition** | Entity-level: fiscal year end; periods = months (or quarters). Store in entity or settings. |
| 6.2 | **Closing process** | “Close period” = mark period as closed; no new JEs allowed in that period (or only via adjustment with special permission). Optional: auto-generate closing JEs (e.g. P&L → retained earnings). |
| 6.3 | **Reporting by period** | P&L, BS, CF by selected period; compare periods (e.g. this month vs last month). |
| 6.4 | **Reopen (optional)** | Super-user or owner can “reopen” a period for corrections; re-close after; audit log all reopen/close events. |

**Deliverable:** Period closing and multi-period financial reports.

---

### Phase 7 (Optional): Inventory and COGS

**Goal:** For trading SMEs: basic inventory and COGS (e.g. FIFO).

| # | Task | Technical notes |
|---|------|-----------------|
| 7.1 | **Inventory master** | Products/SKUs: name, unit, default COGS account; optional reorder level. |
| 7.2 | **Stock movements** | Purchase → increase inventory (Dr Inventory, Cr AP/Cash); Sale → decrease inventory + COGS (Dr COGS, Cr Inventory; Dr AR/Cash, Cr Revenue). |
| 7.3 | **Valuation** | FIFO (minimum); store lot/date and cost for FIFO calculation. |
| 7.4 | **Reports** | Inventory valuation report; COGS in P&L. |

**Deliverable:** Inventory module (can be feature-flagged for “Trading” or selected entities only).

---

## 5. Dependencies and Ordering

```
Phase 0 (Decision + Design)
    ↓
Phase 1 (GL + CoA)  ← Foundation; everything else depends on this
    ↓
Phase 2 (AR/AP)     ← Depends on GL
Phase 3 (Statements)← Depends on GL
    ↓
Phase 4 (Bank rec)  ← Depends on GL + cash account
Phase 5 (Audit + RBAC) ← Can start in parallel after Phase 1; refine in 2–3
Phase 6 (Period close) ← Depends on GL and reporting
Phase 7 (Inventory)  ← Optional; after core GL is stable
```

---

## 6. Technical Considerations (OTax Codebase)

- **Data layer:** Currently Firebase/Firestore; `BaseService` pattern. Ledger and CoA may need stricter consistency — evaluate **Firestore transactions** for multi-document JE writes, or a **separate store** (e.g. Postgres) for GL with sync to Firestore for app features.
- **Existing services to extend or wrap:**  
  - `transactionService` → eventually all “money” moves create JEs via `ledgerService`.  
  - `invoiceService` → on payment, post Dr Cash / Cr AR; link invoice to AR.  
  - `payrollService` → each payroll run posts JEs (salary expense, tax liability, net pay).  
  - `reportService` → P&L, BS, CF from ledger; keep tax reports in sync.
- **SME surfaces:** `app/dashboard-sme/*` (transactions, invoices, payroll, reports, payment, settings). New screens: CoA management, AR/AP aging, reconciliation, team/permissions, period close.
- **Numeric reliability:** Use a **decimal library** (e.g. decimal.js) for all money and ledger math; avoid raw floats to prevent rounding/glitch errors.

---

## 7. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Ledger logic errors (wrong debits/credits) | Accountant-designed CoA and journal rules; automated tests for every journal scenario; reconciliation checks (sum debits = sum credits, balance sheet equation). |
| Performance (large GL) | Index by entityId, date, accountId; aggregate balances by account/period; consider materialized views or pre-aggregates for statements. |
| Scope creep | Stick to phases; ship Phase 1 and 2 before committing to bank rec and inventory. |
| Migration of existing users | Clear “start GL from date” or “opening balance”; no need to backfill all history if we support “prior to GL” as legacy view. |

---

## 8. Success Criteria (High Level)

- Every income, expense, invoice payment, payroll run, and tax payment **posts to the general ledger** with correct double-entry.
- **Balance Sheet** and **P&L** and **Cash Flow** are generated from the same ledger and match.
- **AR/AP aging** (30/60/90) is available and ties to invoices/bills and cash.
- **Audit trail** and **RBAC** are in place for key actions.
- **Period closing** is supported and reports are period-accurate.

---

## 9. Strategic Reminder

- **Building a true accounting engine is a foundation rebuild**, not a feature. It requires strong accounting logic, certified accountant input, careful data modeling, and high reliability.
- **Upside:** If SMEs run payroll, invoicing, taxes, reconciliation, and financial statements inside OTax, churn drops and the product becomes infrastructure.
- **Real question:** “Do you want to become Nigeria’s QuickBooks — or remain the Stripe of tax compliance?” This plan supports the former path; use it to size effort, capital, and team before committing.

---

## 10. Step-by-Step Implementation Checklist

Use this section to implement **one task at a time**. Complete each item before moving to the next. Check off as you go: `[ ]` → `[x]`.

---

### Phase 0: Foundation (do these first)

| Step | Task | Done | Deliverable |
|------|------|------|--------------|
| 0.1 | Get formal go/no-go decision (QuickBooks path vs tax-only) | [ ] | Decision memo |
| 0.2 | Engage a certified accountant for CoA and journal rules | [ ] | Accountant assigned + kickoff |
| 0.3 | Decide data store: Firestore only vs Firestore + Postgres for ledger | [ ] | Architecture decision doc |
| 0.4 | Document “journal entry map”: for each current flow (expense, invoice paid, payroll, tax payment), write which accounts are debited/credited and in what order | [ ] | Journal entry map doc |
| 0.5 | Add a decimal library (e.g. `decimal.js`) to the project and use it for all new money/ledger math | [ ] | Package added; shared `money` util if needed |

---

### Phase 1: General Ledger and Chart of Accounts

**Scope:** SME + PLATINUM (or Big Business) only. Gate with `canUseGeneralLedger()` or `useCanUseGeneralLedger()`.

| Step | Task | Done | Deliverable |
|------|------|------|--------------|
| 1.1 | Define TypeScript types: `Account` (id, entityId, code, name, type, parentId, isSystem, createdAt) and `JournalEntry` / `JournalLine` (id, entityId, date, description, source, sourceId, lines[], status, createdBy, createdAt) | [x] | `lib/types/ledger.ts` |
| 1.2 | Create Firestore collection (or tables) for `accounts` and `journal_entries`; add indexes (entityId, date, accountId) | [x] | `firestore.indexes.json` |
| 1.3 | Implement `ledgerService`: `createAccount()`, `getAccountsByEntity()`, `createJournalEntry()` with validation that sum(debit) = sum(credit), `postEntry()`, `getEntriesByAccount()`, `getEntriesByEntityAndDateRange()` | [x] | `lib/services/ledgerService.ts` |
| 1.4 | Create “Standard SME” CoA template (asset, liability, equity, revenue, expense accounts) as seed data; add script or admin action to copy template to an entity | [x] | `lib/data/chart-of-accounts.ts` + `ledgerService.copyTemplateToEntity` |
| 1.5 | When user creates an **expense** transaction: after saving transaction, call `ledgerService` to post JE (Dr Expense account, Cr Cash). Use a default Cash and Expense account from entity’s CoA | [ ] | Expense flow posts to GL |
| 1.6 | When user creates an **income** transaction: post JE (Dr Cash, Cr Revenue) | [ ] | Income flow posts to GL |
| 1.7 | Add unit/integration tests: create JE with unbalanced lines → reject; create valid JE → stored and retrievable; balance per account correct | [ ] | Tests in place |
| 1.8 | Document migration approach: “New entities get GL from day one; existing entities can start GL from date X with opening balance” (implement opening balance in a later step if needed) | [ ] | Migration doc updated |

---

### Phase 2: Accounts Receivable and Payable

| Step | Task | Done | Deliverable |
|------|------|------|--------------|
| 2.1 | Define types: `Receivable` and `Payable` (contactId, invoiceId/billId, amount, dueDate, status, paidAmount, paidAt, entityId) and create Firestore collections | [ ] | Types + collections |
| 2.2 | When an **outgoing invoice** is created: create AR record (open) and post JE (Dr AR, Cr Revenue; Dr AR VAT if applicable) | [ ] | Invoice creation → AR + JE |
| 2.3 | When invoice is **marked paid**: update AR (paid), post JE (Dr Cash, Cr AR) | [ ] | Invoice payment → cash JE |
| 2.4 | When an **incoming invoice/bill** is recorded: create AP record and post JE (Dr Expense/Inventory, Cr AP) | [ ] | Bill → AP + JE |
| 2.5 | When bill is **paid**: update AP, post JE (Dr AP, Cr Cash) | [ ] | Bill payment → cash JE |
| 2.6 | Implement aging: `getReceivablesAging(entityId)` and `getPayablesAging(entityId)` returning buckets 0–30, 31–60, 61–90, 90+ | [ ] | `arApService` or in `reportService` |
| 2.7 | Add SME UI: Receivables page (list + aging) and Payables page (list + aging), linked from dashboard-sme nav | [ ] | `app/dashboard-sme/receivables/page.tsx`, `payables/page.tsx` |

---

### Phase 3: Financial Statements from GL

| Step | Task | Done | Deliverable |
|------|------|------|--------------|
| 3.1 | Implement `getAccountBalancesAsOf(entityId, date)` from journal entries (sum debits - sum credits per account) | [ ] | Function in `ledgerService` or `financialStatementService` |
| 3.2 | Build P&L from GL: aggregate revenue and expense account balances for date range; reuse existing income-statement UI, switch data source to GL | [ ] | P&L from GL |
| 3.3 | Build Balance Sheet: assets, liabilities, equity as of a given date from account balances | [ ] | Balance Sheet report |
| 3.4 | Build Cash Flow Statement: operating (from P&L + working capital changes), investing, financing from cash account and other GL movements | [ ] | Cash Flow report |
| 3.5 | Refactor `reportService` (or add `financialStatementService`) so tax reports and management reports use same GL numbers where applicable | [ ] | Single source of truth for numbers |

---

### Phase 4: Bank Reconciliation

| Step | Task | Done | Deliverable |
|------|------|------|--------------|
| 4.1 | Define `BankTransaction` and `BankAccount` types; create collection for bank transactions (entityId, accountId, date, amount, counterparty, reference, externalId) | [ ] | Types + collection |
| 4.2 | Integrate one bank feed (e.g. open banking API): fetch and store transactions; schedule or webhook for updates | [ ] | Bank feed ingestion |
| 4.3 | Implement matching: link bank_transaction to journal line (cash); status matched/unmatched/ignored; store in `reconciliation_matches` or on the bank tx | [ ] | Matching logic |
| 4.4 | Build Reconciliation UI: bank balance vs GL cash; list unmatched bank rows and unmatched GL cash entries; allow user to match or mark reconciled | [ ] | `app/dashboard-sme/reconciliation/page.tsx` |
| 4.5 | Audit: log reconciliation events (who matched what, when) | [ ] | Reconciliation audit log |

---

### Phase 5: Audit Trail and RBAC

| Step | Task | Done | Deliverable |
|------|------|------|--------------|
| 5.1 | Create append-only `audit_log` collection: entityId, userId, action, resource, resourceId, oldValue, newValue, timestamp, IP | [ ] | Audit log collection + write helper |
| 5.2 | Call audit log on: create/update/delete journal entry, post entry, invoice paid, payroll run, role change | [ ] | Audit writes in place |
| 5.3 | Define RBAC: roles (owner, accountant, staff) and permissions per entity; store `entity_members` (userId, entityId, role) | [ ] | RBAC model + storage |
| 5.4 | Enforce role in API: ledger and AR/AP writes check user’s role for that entity | [ ] | API enforcement |
| 5.5 | Add Team UI: invite member, assign role, revoke (e.g. under `dashboard-sme/settings` or `team`) | [ ] | Team management page |

---

### Phase 6: Period Closing and Multi-Period Reporting

| Step | Task | Done | Deliverable |
|------|------|------|--------------|
| 6.1 | Add entity setting: fiscal year end (e.g. Dec 31); derive period list (months or quarters) | [ ] | Period definition |
| 6.2 | Add `period_closed` (or similar) per entity per period; when closed, reject new JEs in that period (or allow only with “reopen” permission) | [ ] | Close period logic |
| 6.3 | Optional: auto-generate closing JE (e.g. net income → retained earnings) when period is closed | [ ] | Closing JE |
| 6.4 | Reporting UI: select period; show P&L, BS, CF for that period; optional comparison (this period vs previous) | [ ] | Period selector in reports |
| 6.5 | Reopen: allow owner (or super-user) to reopen closed period; audit log reopen/close | [ ] | Reopen flow + audit |

---

### Phase 7 (Optional): Inventory and COGS

| Step | Task | Done | Deliverable |
|------|------|------|--------------|
| 7.1 | Define Product/SKU and inventory movement types; create collections; add Inventory and COGS accounts to CoA template for “Trading” | [ ] | Inventory data model |
| 7.2 | Purchase flow: Dr Inventory, Cr AP/Cash; Sale flow: Dr COGS, Cr Inventory; Dr AR/Cash, Cr Revenue | [ ] | Stock movements post to GL |
| 7.3 | Implement FIFO valuation for COGS and inventory balance | [ ] | FIFO logic |
| 7.4 | Inventory valuation report and COGS in P&L; feature-flag for trading entities | [ ] | Reports + flag |

---

### Quick reference: implementation order

```
0.1 → 0.2 → 0.3 → 0.4 → 0.5
  → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8
  → 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7
  → 3.1 → 3.2 → 3.3 → 3.4 → 3.5
  → 4.1 → 4.2 → 4.3 → 4.4 → 4.5
  → 5.1 → 5.2 → 5.3 → 5.4 → 5.5
  → 6.1 → 6.2 → 6.3 → 6.4 → 6.5
  → (optional) 7.1 → 7.2 → 7.3 → 7.4
```

You can do **5.1–5.3** in parallel with **2.x** once Phase 1 is done; the checklist above keeps a simple one-by-one order. Adjust order as needed for your team.

---

*End of plan. Next step: Phase 0.1 — get go/no-go decision, then 0.2 (accountant).*
