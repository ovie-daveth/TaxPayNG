"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminTableSkeleton } from "@/components/ui/skeletons"
import { format } from "date-fns"
import { formatNaira } from "@/lib/constants/cac"
import type { CacOfficer, CacRequest, CacRegistrationType } from "@/lib/types"
import { Building2, ExternalLink, Loader2, MessageCircle, Search, FileText, ClipboardCopy } from "lucide-react"

type AdminCacRequest = Omit<CacRequest, "id"> & { id: string; notes?: string; completedAt?: string }

function buildWhatsAppUrl(phoneRaw: string, text: string): string {
  const digits = String(phoneRaw || "").replace(/[^\d]/g, "")
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

function uploadKeyLabel(key: string): string {
  if (key === "ninSlips") return "NIN slips"
  if (key === "signatures") return "Signatures"
  if (key === "passportPhotos") return "Passport photos"

  // New LLC per-person upload keys:
  // llc_witness_ninSlips
  // llc_director_1_signatures
  // llc_shareholder_2_passportPhotos
  const m = key.match(/^llc_(witness|director|shareholder)(?:_(\d+))?_(ninSlips|signatures|passportPhotos)$/i)
  if (m) {
    const who = m[1].toLowerCase()
    const idx = m[2] ? ` ${m[2]}` : ""
    const field = m[3]
    const fieldLabel = field === "ninSlips" ? "NIN slips" : field === "signatures" ? "Signatures" : "Passport photos"
    const whoLabel = who === "witness" ? "LLC Witness" : who === "director" ? `LLC Director${idx}` : `LLC Shareholder${idx}`
    return `${whoLabel} - ${fieldLabel}`
  }

  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function toStatusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export default function AdminCacRequestsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AdminCacRequest[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [details, setDetails] = useState<{ open: boolean; request: AdminCacRequest | null }>({ open: false, request: null })
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState<string>("")
  const [notes, setNotes] = useState<string>("")

  const [officers, setOfficers] = useState<CacOfficer[]>([])
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>("")
  const [preparingMessage, setPreparingMessage] = useState(false)

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) router.push("/admin/login")
    }
  }, [user, isAdmin, authLoading, adminLoading, router])

  const fetchRows = async () => {
    if (!user) return
    try {
      setLoading(true)
      const token = await user.getIdToken()
      const url = statusFilter === "all" ? "/api/admin/cac-requests" : `/api/admin/cac-requests?status=${encodeURIComponent(statusFilter)}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load CAC requests")
      setRows(data.data || [])
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Failed to load CAC requests")
    } finally {
      setLoading(false)
    }
  }

  const fetchOfficers = async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/admin/cac-officers", { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load CAC officers")
      setOfficers(data.data || [])
    } catch (e: any) {
      console.error(e)
      // Don't block page if officers fail; modal will show empty list
      setOfficers([])
    }
  }

  useEffect(() => {
    if (user && isAdmin) fetchRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, statusFilter])

  useEffect(() => {
    if (user && isAdmin) fetchOfficers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin])

  const filtered = useMemo(() => {
    if (!searchTerm) return rows
    const s = searchTerm.toLowerCase()
    return rows.filter((r) => {
      const hay = [
        r.id,
        r.type,
        r.status,
        r.contactName,
        r.contactEmail,
        r.contactPhone,
        r.paystackReference || "",
      ]
        .join(" ")
        .toLowerCase()
      return hay.includes(s)
    })
  }, [rows, searchTerm])

  const statusBadge = (status: string) => {
    const variant =
      status === "paid" || status === "completed"
        ? "default"
        : status === "cancelled"
          ? "destructive"
          : status === "payment_pending"
            ? "secondary"
            : "outline"
    return <Badge variant={variant as any}>{toStatusLabel(status)}</Badge>
  }

  const openDetails = (r: AdminCacRequest) => {
    setDetails({ open: true, request: r })
    setNewStatus(r.status)
    setNotes(r.notes || "")
    setSelectedOfficerId((r as any)?.cacOfficerId || "")
  }

  const uploadEntries = (r: AdminCacRequest) => {
    const uploads = (r as any)?.uploads || {}
    const keys = Object.keys(uploads)
    return keys.map((k) => ({ key: k, files: uploads[k] || [] }))
  }

  const buildOfficerMessage = (r: AdminCacRequest): string => {
    const lines: string[] = []
    lines.push(`New CAC request`)
    lines.push(`Request ID: ${r.id}`)
    lines.push(`Type: ${r.type}`)
    lines.push(`Status: ${toStatusLabel(r.status)}`)
    lines.push(`Amount: ${formatNaira(Math.round((r.amountKobo || 0) / 100))}`)
    lines.push(`Paystack Ref: ${r.paystackReference || "N/A"}`)
    if ((r as any)?.profitSplit) {
      const ps = (r as any).profitSplit
      lines.push(`Platform fee: ₦${Number(ps.platformTakeNaira || 0).toLocaleString()} (₦${Number(ps.standardFeeNaira || 0).toLocaleString()} + ${Number(ps.platformPct || 0)}%)`)
      lines.push(`Officer take: ₦${Number(ps.officerTakeNaira || 0).toLocaleString()}`)
    }
    lines.push("")
    lines.push(`Customer:`)
    lines.push(`Name: ${r.contactName}`)
    lines.push(`Email: ${r.contactEmail}`)
    lines.push(`Phone: ${r.contactPhone}`)

    if ((r as any)?.submissionSummary?.pdfUrl) {
      lines.push("")
      lines.push(`Form summary (PDF): ${(r as any).submissionSummary.pdfUrl}`)
    }
    lines.push("")
    lines.push(`Documents:`)
    const entries = uploadEntries(r)
    if (!entries.length) {
      lines.push(`- None`)
    } else {
      for (const e of entries) {
        lines.push(`- ${uploadKeyLabel(e.key)}:`)
        for (const f of e.files) {
          if (f?.url) lines.push(`  ${f.url}`)
        }
      }
    }
    return lines.join("\n")
  }

  const selectedOfficer = useMemo(() => officers.find((o) => o.id === selectedOfficerId) || null, [officers, selectedOfficerId])

  const profitPreview = useMemo(() => {
    const r = details.request
    if (!r || !selectedOfficer) return null
    const amountNaira = Math.round((r.amountKobo || 0) / 100)
    const standardFee = Math.max(0, Number(selectedOfficer.profitSharing?.standardFeeNaira ?? 0))
    const type = r.type as CacRegistrationType
    const pct = Number(selectedOfficer.profitSharing?.platformPctByType?.[type] ?? selectedOfficer.profitSharing?.defaultPlatformPct ?? 0)
    const remainder = Math.max(0, amountNaira - standardFee)
    const platformTake = Math.min(amountNaira, standardFee + Math.round((remainder * Math.max(0, Math.min(100, pct))) / 100))
    const officerTake = Math.max(0, amountNaira - platformTake)
    return { amountNaira, standardFee, pct, platformTake, officerTake }
  }, [details.request, selectedOfficer])

  const prepareOfficerMessage = async () => {
    if (!user || !details.request) return null
    if (!selectedOfficerId) {
      toast.error("Please select a CAC officer")
      return null
    }

    setPreparingMessage(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/admin/cac-requests/${encodeURIComponent(details.request.id)}/prepare-officer-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ officerId: selectedOfficerId }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to prepare message")
      if (data?.data?.warning) {
        toast.message("Prepared WhatsApp message", { description: String(data.data.warning) })
      }
      const updatedReq = data.data.request as AdminCacRequest
      setDetails((p) => ({ ...p, request: updatedReq }))
      return updatedReq
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Failed to prepare message")
      return null
    } finally {
      setPreparingMessage(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!user || !details.request) return
    setUpdatingStatus(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/admin/cac-requests/${encodeURIComponent(details.request.id)}/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, notes }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to update status")
      toast.success("Status updated")
      setDetails({ open: false, request: null })
      await fetchRows()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Failed to update status")
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (authLoading || adminLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <AdminTableSkeleton />
      </div>
    )
  }

  if (!user || !isAdmin) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Building2 className="w-7 h-7" /> CAC Requests
        </h1>
        <p className="text-muted-foreground">View CAC registration submissions, documents, and message the CAC officer.</p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by request ID, contact, type, reference…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="payment_pending">Payment Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All CAC Requests</CardTitle>
          <CardDescription>
            {filtered.length} request{filtered.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No CAC requests found</p>
              <div className="mt-4">
                <Link href="/cac">
                  <Button variant="outline">View CAC public page</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Request</th>
                    <th className="text-left p-4 font-semibold">Type</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Customer</th>
                    <th className="text-left p-4 font-semibold">Amount</th>
                    <th className="text-left p-4 font-semibold">Created</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-mono text-xs">{r.id}</td>
                      <td className="p-4">{r.type}</td>
                      <td className="p-4">{statusBadge(r.status)}</td>
                      <td className="p-4">
                        <div className="font-medium">{r.contactName}</div>
                        <div className="text-xs text-muted-foreground">{r.contactEmail}</div>
                      </td>
                      <td className="p-4">{formatNaira(Math.round((r.amountKobo || 0) / 100))}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="p-4">
                        <Button variant="outline" size="sm" onClick={() => openDetails(r)}>
                          View
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

      <Dialog open={details.open} onOpenChange={(o) => (!o ? setDetails({ open: false, request: null }) : null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CAC Request details</DialogTitle>
            <DialogDescription>Review documents, message the CAC officer, and update status.</DialogDescription>
          </DialogHeader>

          {details.request ? (
            <div className="space-y-5">
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Request</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs font-mono break-all">{details.request.id}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Payment</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div>{statusBadge(details.request.status)}</div>
                    <div className="text-muted-foreground text-xs">Ref: {details.request.paystackReference || "—"}</div>
                    <div className="font-semibold">{formatNaira(Math.round((details.request.amountKobo || 0) / 100))}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div className="font-medium">{details.request.contactName}</div>
                    <div className="text-xs text-muted-foreground">{details.request.contactEmail}</div>
                    <div className="text-xs text-muted-foreground">{details.request.contactPhone}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">Uploaded documents</div>
                <div className="rounded-lg border p-3 space-y-3">
                  {uploadEntries(details.request).length === 0 ? (
                    <div className="text-sm text-muted-foreground">No uploads found on this request.</div>
                  ) : (
                    uploadEntries(details.request).map((e) => (
                      <div key={e.key} className="space-y-2">
                        <div className="text-sm font-medium">{uploadKeyLabel(e.key)}</div>
                        <div className="space-y-2">
                          {e.files.map((f: any, idx: number) => (
                            <div key={idx} className="flex items-start justify-between gap-3 min-w-0">
                              <div className="min-w-0">
                                <div className="text-xs font-medium truncate" title={f?.originalName || f?.name || ""}>
                                  {f?.originalName || f?.name || `File ${idx + 1}`}
                                </div>
                                {f?.url ? (
                                  <div className="text-[11px] text-muted-foreground font-mono truncate" title={f.url}>
                                    {f.url}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-muted-foreground">No URL</div>
                                )}
                              </div>
                              {f?.url ? (
                                <Button asChild variant="outline" size="sm" className="gap-2 shrink-0">
                                  <a href={f.url} target="_blank" rel="noreferrer">
                                    <ExternalLink className="w-4 h-4" /> Open
                                  </a>
                                </Button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CAC officer</Label>
                  <Select value={selectedOfficerId} onValueChange={setSelectedOfficerId}>
                    <SelectTrigger>
                      <SelectValue placeholder={officers.length ? "Select officer" : "No officers found"} />
                    </SelectTrigger>
                    <SelectContent>
                      {officers.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name} ({o.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {profitPreview ? (
                    <div className="text-xs text-muted-foreground">
                      Split preview: Platform takes ₦{profitPreview.platformTake.toLocaleString()} (₦{profitPreview.standardFee.toLocaleString()} +{" "}
                      {profitPreview.pct}%), officer takes ₦{profitPreview.officerTake.toLocaleString()}.
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Manage officers at <span className="font-mono">Admin → CAC Officers</span>.
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Update status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment_pending">Payment Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes…" />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={async () => {
                    const updated = await prepareOfficerMessage()
                    if (!updated) return
                    const msg = buildOfficerMessage(updated)
                    try {
                      await navigator.clipboard.writeText(msg)
                      toast.success("Message copied")
                    } catch {
                      toast.error("Failed to copy")
                    }
                  }}
                  disabled={preparingMessage}
                >
                  <ClipboardCopy className="w-4 h-4" /> Copy message
                </Button>

                <Button
                  className="gap-2"
                  disabled={!selectedOfficerId || preparingMessage}
                  onClick={async () => {
                    const updated = await prepareOfficerMessage()
                    if (!updated) return
                    const officerPhone = String((updated as any)?.cacOfficerPhone || "").trim()
                    if (!officerPhone) {
                      toast.error("Officer phone not set")
                      return
                    }
                    const msg = buildOfficerMessage(updated)
                    window.open(buildWhatsAppUrl(officerPhone, msg), "_blank", "noopener,noreferrer")
                  }}
                >
                  {preparingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} Open WhatsApp
                </Button>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetails({ open: false, request: null })}>
              Close
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updatingStatus || !details.request}>
              {updatingStatus ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                </>
              ) : (
                "Save status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


