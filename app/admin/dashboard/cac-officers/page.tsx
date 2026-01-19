"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import type { CacOfficer } from "@/lib/types"
import { Loader2, PhoneCall, Plus, Save } from "lucide-react"

type OfficerRow = CacOfficer

const DEFAULT_STANDARD_FEE = 10_000
const DEFAULT_BUSINESS_NAME_PCT = 5
const DEFAULT_OTHER_PCT = 8

function onlyDigitsPhone(phone: string): string {
  return String(phone || "").replace(/[^\d+]/g, "")
}

export default function AdminCacOfficersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<OfficerRow[]>([])
  const [includeInactive, setIncludeInactive] = useState(false)

  const [edit, setEdit] = useState<{ open: boolean; officer: OfficerRow | null }>({ open: false, officer: null })
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    isActive: true,
    standardFeeNaira: DEFAULT_STANDARD_FEE,
    businessNamePlatformPct: DEFAULT_BUSINESS_NAME_PCT,
    otherPlatformPct: DEFAULT_OTHER_PCT,
  })

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) router.push("/admin/login")
    }
  }, [user, isAdmin, authLoading, adminLoading, router])

  const fetchOfficers = async () => {
    if (!user) return
    try {
      setLoading(true)
      const token = await user.getIdToken()
      const res = await fetch(`/api/admin/cac-officers?includeInactive=${includeInactive ? "true" : "false"}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load CAC officers")
      setRows(data.data || [])
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Failed to load CAC officers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && isAdmin) fetchOfficers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, includeInactive])

  const openCreate = () => {
    setForm({
      name: "",
      phone: "",
      email: "",
      isActive: true,
      standardFeeNaira: DEFAULT_STANDARD_FEE,
      businessNamePlatformPct: DEFAULT_BUSINESS_NAME_PCT,
      otherPlatformPct: DEFAULT_OTHER_PCT,
    })
    setEdit({ open: true, officer: null })
  }

  const openEdit = (o: OfficerRow) => {
    setForm({
      name: o.name || "",
      phone: o.phone || "",
      email: o.email || "",
      isActive: !!o.isActive,
      standardFeeNaira: Number(o.profitSharing?.standardFeeNaira ?? DEFAULT_STANDARD_FEE),
      businessNamePlatformPct: Number(o.profitSharing?.platformPctByType?.BUSINESS_NAME ?? DEFAULT_BUSINESS_NAME_PCT),
      otherPlatformPct: Number(o.profitSharing?.defaultPlatformPct ?? DEFAULT_OTHER_PCT),
    })
    setEdit({ open: true, officer: o })
  }

  const profitNote = useMemo(() => {
    const bn = Number(form.businessNamePlatformPct || 0)
    const other = Number(form.otherPlatformPct || 0)
    return `Platform takes ₦${form.standardFeeNaira.toLocaleString()} + ${bn}% (Business Name) / ${other}% (LLC & Trustees) of the remainder.`
  }, [form.businessNamePlatformPct, form.otherPlatformPct, form.standardFeeNaira])

  const saveOfficer = async () => {
    if (!user) return
    const name = String(form.name || "").trim()
    const phone = onlyDigitsPhone(form.phone)
    if (!name) return toast.error("Officer name is required")
    if (!phone) return toast.error("Officer phone is required")

    const payload = {
      name,
      phone,
      email: String(form.email || "").trim() || undefined,
      isActive: !!form.isActive,
      profitSharing: {
        standardFeeNaira: Number(form.standardFeeNaira),
        platformPctByType: { BUSINESS_NAME: Number(form.businessNamePlatformPct) },
        defaultPlatformPct: Number(form.otherPlatformPct),
      },
    }

    setSaving(true)
    try {
      const token = await user.getIdToken()
      const isUpdate = !!edit.officer?.id
      const url = isUpdate ? `/api/admin/cac-officers/${encodeURIComponent(edit.officer!.id)}` : "/api/admin/cac-officers"
      const method = isUpdate ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to save officer")
      toast.success(isUpdate ? "Officer updated" : "Officer created")
      setEdit({ open: false, officer: null })
      await fetchOfficers()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Failed to save officer")
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || adminLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (!user || !isAdmin) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <PhoneCall className="w-7 h-7" /> CAC Officers
          </h1>
          <p className="text-muted-foreground">Manage CAC officers used in WhatsApp assignment and profit sharing.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
            <span className="text-sm text-muted-foreground">Include inactive</span>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add officer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Officers</CardTitle>
          <CardDescription>{rows.length} officer{rows.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No officers yet. Click “Add officer”.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold">Phone</th>
                    <th className="text-left p-4 font-semibold">Active</th>
                    <th className="text-left p-4 font-semibold">Profit sharing</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">{o.name}</td>
                      <td className="p-4 text-sm text-muted-foreground">{o.phone}</td>
                      <td className="p-4 text-sm">{o.isActive ? "Yes" : "No"}</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        ₦{Number(o.profitSharing?.standardFeeNaira ?? DEFAULT_STANDARD_FEE).toLocaleString()} +{" "}
                        {Number(o.profitSharing?.platformPctByType?.BUSINESS_NAME ?? DEFAULT_BUSINESS_NAME_PCT)}% /{" "}
                        {Number(o.profitSharing?.defaultPlatformPct ?? DEFAULT_OTHER_PCT)}%
                      </td>
                      <td className="p-4">
                        <Button variant="outline" size="sm" onClick={() => openEdit(o)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={edit.open} onOpenChange={(o) => (!o ? setEdit({ open: false, officer: null }) : null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{edit.officer ? "Edit CAC officer" : "Add CAC officer"}</DialogTitle>
            <DialogDescription>Set WhatsApp number and profit sharing rules.</DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Officer A" />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+234…" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Email (optional)</Label>
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="officer@example.com" />
            </div>

            <div className="space-y-2">
              <Label>Platform standard fee (₦)</Label>
              <Input
                type="number"
                value={form.standardFeeNaira}
                onChange={(e) => setForm((p) => ({ ...p, standardFeeNaira: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Platform % (Business Name)</Label>
              <Input
                type="number"
                value={form.businessNamePlatformPct}
                onChange={(e) => setForm((p) => ({ ...p, businessNamePlatformPct: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Platform % (LLC & Trustees)</Label>
              <Input
                type="number"
                value={form.otherPlatformPct}
                onChange={(e) => setForm((p) => ({ ...p, otherPlatformPct: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Active</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))} />
                <span className="text-sm text-muted-foreground">{form.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3 text-sm bg-muted/30">
            <span className="font-medium">Note:</span> {profitNote}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEdit({ open: false, officer: null })}>
              Cancel
            </Button>
            <Button onClick={saveOfficer} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


