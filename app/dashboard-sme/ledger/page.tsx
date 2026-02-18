"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBusiness } from "@/lib/contexts/business-context"
import { useCanUseGeneralLedger } from "@/lib/hooks/useCanUseGeneralLedger"
import { ledgerService } from "@/lib/services/ledgerService"
import type { JournalEntry, Account } from "@/lib/types/ledger"
import { ScrollText, Loader2, RefreshCw } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

function formatDate(s: string) {
  if (!s) return "—"
  return s.slice(0, 10)
}

function formatAmount(n: number) {
  if (n === 0) return "—"
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(n)
}

export default function LedgerPage() {
  const canUseGL = useCanUseGeneralLedger()
  const { activeEntityId, entities } = useBusiness()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]))

  const loadEntries = async () => {
    if (!activeEntityId) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    const [entriesRes, accountsRes] = await Promise.all([
      ledgerService.getEntriesByEntityAndDateRange(activeEntityId, startDate, endDate),
      ledgerService.getAccountsByEntity(activeEntityId),
    ])
    setLoading(false)
    if (entriesRes.success && entriesRes.data) setEntries(entriesRes.data)
    else setEntries([])
    if (accountsRes.success && accountsRes.data) setAccounts(accountsRes.data)
    else setAccounts([])
  }

  useEffect(() => {
    if (!canUseGL) return
    loadEntries()
  }, [canUseGL, activeEntityId, startDate, endDate])

  if (!canUseGL) {
    return (
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6">
        <Card className="p-6">
          <p className="text-muted-foreground">
            General Ledger is available for SME plans on PLATINUM (or Big Business). Upgrade your plan to use double-entry accounting.
          </p>
        </Card>
      </div>
    )
  }

  const hasNoEntity = !activeEntityId || entities.length === 0

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6 overflow-x-hidden max-w-full">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">General Ledger</h2>
              <Badge variant="secondary" className="text-[10px]">PLATINUM</Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Posted journal entries from your transactions. Income and expenses post automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadEntries()}
              disabled={loading || !activeEntityId}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {hasNoEntity ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Create and select a business in Settings → Businesses to view the ledger.
          </p>
        ) : loading ? (
          <div className="mt-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading entries…
          </div>
        ) : entries.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No journal entries in this date range. Add income or expense transactions to see them here.
          </p>
        ) : (
          <div className="mt-6 space-y-6 overflow-x-auto">
            {entries.map((entry) => (
              <div key={entry.id} className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{formatDate(entry.date)}</span>
                  <Badge variant={entry.status === "posted" ? "default" : "secondary"} className="text-[10px]">
                    {entry.status}
                  </Badge>
                  <span className="text-muted-foreground">{entry.source}</span>
                  <span className="flex-1 truncate">{entry.description}</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right w-28">Debit</TableHead>
                      <TableHead className="text-right w-28">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.lines.map((line, i) => {
                      const acc = accountMap[line.accountId]
                      const label = acc ? `${acc.code} ${acc.name}` : line.accountId.slice(0, 8) + "…"
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{label}</TableCell>
                          <TableCell className="text-right">{line.debit > 0 ? formatAmount(line.debit) : "—"}</TableCell>
                          <TableCell className="text-right">{line.credit > 0 ? formatAmount(line.credit) : "—"}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
