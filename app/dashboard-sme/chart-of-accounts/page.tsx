"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useBusiness } from "@/lib/contexts/business-context"
import { useCanUseGeneralLedger } from "@/lib/hooks/useCanUseGeneralLedger"
import { ledgerService } from "@/lib/services/ledgerService"
import type { Account } from "@/lib/types/ledger"
import { BookOpen, Loader2, RefreshCw } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

const TYPE_LABELS: Record<string, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  revenue: "Revenue",
  expense: "Expense",
}

export default function ChartOfAccountsPage() {
  const canUseGL = useCanUseGeneralLedger()
  const { activeEntityId, entities } = useBusiness()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [settingUp, setSettingUp] = useState(false)

  const loadAccounts = async () => {
    if (!activeEntityId) {
      setAccounts([])
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await ledgerService.getAccountsByEntity(activeEntityId)
    setLoading(false)
    if (res.success && res.data) {
      setAccounts(res.data)
    } else {
      setAccounts([])
    }
  }

  useEffect(() => {
    if (!canUseGL) return
    loadAccounts()
  }, [canUseGL, activeEntityId])

  const handleSetupCoA = async () => {
    if (!activeEntityId) {
      toast.error("Select a business first")
      return
    }
    setSettingUp(true)
    const res = await ledgerService.copyTemplateToEntity(activeEntityId)
    setSettingUp(false)
    if (res.success) {
      toast.success(res.data?.created ? `Created ${res.data.created} accounts` : "Chart of Accounts already set up")
      loadAccounts()
    } else {
      toast.error(res.error || "Failed to set up Chart of Accounts")
    }
  }

  if (!canUseGL) {
    return (
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6">
        <Card className="p-6">
          <p className="text-muted-foreground">
            Chart of Accounts is available for SME plans on PLATINUM (or Big Business). Upgrade your plan to use double-entry accounting.
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
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Chart of Accounts</h2>
              <Badge variant="secondary" className="text-[10px]">PLATINUM</Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Standard SME accounts for double-entry bookkeeping. Transactions automatically post here.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAccounts()}
              disabled={loading || !activeEntityId}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            {accounts.length === 0 && !loading && activeEntityId && (
              <Button
                size="sm"
                onClick={handleSetupCoA}
                disabled={settingUp}
              >
                {settingUp ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Set up Chart of Accounts
              </Button>
            )}
          </div>
        </div>

        {hasNoEntity ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Create and select a business in Settings → Businesses to use the Chart of Accounts.
          </p>
        ) : loading ? (
          <div className="mt-6 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading accounts…
          </div>
        ) : accounts.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No accounts yet. Click &quot;Set up Chart of Accounts&quot; to add the standard SME accounts.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-20">System</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm">{a.code}</TableCell>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[a.type] ?? a.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{a.isSystem ? "Yes" : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}
