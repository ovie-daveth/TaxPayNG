"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Search, Mail, Send, Copy, Loader2, Check, AlertTriangle } from "lucide-react"
import { AdminTableSkeleton } from "@/components/ui/skeletons"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { toast } from "sonner"
import OtaxLogo from "@/components/OtaxLogo"
import { ThemeToggle } from "@/components/theme-toggle"
import { db } from "@/firebase/firebase"
import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore"
import { format } from "date-fns"
import { Timestamp } from "firebase/firestore"
import { buildWaitlistEmail, WAITLIST_EMAIL_TEMPLATES, WAITLIST_SITE_LINK, type WaitlistTemplateKey } from "@/lib/emails/waitlist-templates"
import { auth } from "@/firebase/firebase"

export default function AdminWaitlistPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [waitlist, setWaitlist] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<WaitlistTemplateKey>("launchPreview")
  const [emailPreview, setEmailPreview] = useState<{ subject: string; body: string }>({ subject: "", body: "" })
  const [sendingEmail, setSendingEmail] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkTemplate, setBulkTemplate] = useState<WaitlistTemplateKey>("launchPreview")
  const [bulkSending, setBulkSending] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<null | { type: "sendEmail" | "markNotified"; payload: any }>(null)

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) {
        router.push('/admin/login')
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, router])

  useEffect(() => {
    const fetchWaitlist = async () => {
      if (!user || !isAdmin) return

      try {
        setLoading(true)
        const waitlistSnapshot = await getDocs(query(
          collection(db, "waitlist"),
          orderBy("createdAt", "desc")
        ))
        const waitlistData = waitlistSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setWaitlist(waitlistData)
      } catch (error) {
        console.error("Error fetching waitlist:", error)
        toast.error("Failed to load waitlist")
      } finally {
        setLoading(false)
      }
    }

    if (user && isAdmin) {
      fetchWaitlist()
    }
  }, [user, isAdmin])

  // Helper function to safely format dates
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return 'N/A'
    try {
      let date: Date | null = null
      if (dateValue instanceof Timestamp || (dateValue?.toDate && typeof dateValue.toDate === 'function')) {
        date = dateValue.toDate()
      } else if (dateValue instanceof Date) {
        date = dateValue
      } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        date = new Date(dateValue)
      }
      if (!date || isNaN(date.getTime())) return 'N/A'
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      return 'N/A'
    }
  }

  const formatUserType = (userType?: string): string => {
    const normalized = userType?.toString().toLowerCase()
    switch (normalized) {
      case "creator":
        return "Creator"
      case "sme":
        return "SME"
      case "freelancer":
        return "Freelancer"
      default:
        return "Freelancer"
    }
  }

  const formatStatus = (status?: string): { label: string; variant: "default" | "secondary" | "outline" } => {
    switch (status) {
      case "launchPreview":
        return { label: "Launch Preview Sent", variant: "default" }
      case "importantUpdate":
        return { label: "Update Sent", variant: "default" }
      case "weAreLive":
        return { label: "We Are Live Sent", variant: "default" }
      case "manualNotification":
        return { label: "Manually Notified", variant: "outline" }
      case "notified":
        return { label: "Notified", variant: "default" }
      case "pending":
      case undefined:
      case null:
        return { label: "Pending", variant: "secondary" }
      default:
        return { label: status ?? "Pending", variant: "secondary" }
    }
  }

  const filteredWaitlist = waitlist.filter((w: any) => 
    w.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    if (selectedRecipient) {
      setEmailPreview(buildWaitlistEmail(selectedTemplate, selectedRecipient))
    }
  }, [selectedRecipient, selectedTemplate])

  const openEmailDialogWithRecipient = (recipient: any) => {
    setSelectedRecipient(recipient)
    setSelectedTemplate("launchPreview")
    setEmailPreview(buildWaitlistEmail("launchPreview", recipient))
    setEmailDialogOpen(true)
  }

  const handleTemplateChange = (value: WaitlistTemplateKey) => {
    setSelectedTemplate(value)
    if (selectedRecipient) {
      setEmailPreview(buildWaitlistEmail(value, selectedRecipient))
    }
  }

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(emailPreview.body)
      toast.success("Email content copied to clipboard")
    } catch (error) {
      toast.error("Failed to copy email content")
    }
  }

  const handleSendEmail = async () => {
    if (!selectedRecipient || !user || sendingEmail) return

    setSendingEmail(true)

    try {
      const currentUser = auth.currentUser
      const token = currentUser ? await currentUser.getIdToken() : undefined

      const response = await fetch("/api/admin/send-waitlist-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          waitlistId: selectedRecipient.id,
          recipientEmail: selectedRecipient.email,
          recipientName: selectedRecipient.name,
          templateKey: selectedTemplate,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email")
      }

      toast.success(data.message || "Email sent successfully")
      setEmailDialogOpen(false)
      setSelectedRecipient(null)

      if (data.updatedWaitlist) {
        setWaitlist((prev) => prev.map((entry) => entry.id === data.updatedWaitlist.id ? data.updatedWaitlist : entry))
      }
    } catch (error: any) {
      console.error("Send email error:", error)
      toast.error(error.message || "Failed to send email")
    } finally {
      setSendingEmail(false)
    }
  }

  const markNotified = async (entry: any) => {
    if (!entry?.id || markingId === entry.id) return

    try {
      setMarkingId(entry.id)

      const waitlistRef = doc(db, "waitlist", entry.id)
      const timestamp = new Date().toISOString()
      await updateDoc(waitlistRef, {
        notified: true,
        status: "manualNotification",
        manuallyNotifiedAt: timestamp,
        updatedAt: timestamp
      })

      toast.success(`${entry.email} marked as notified`)

      setWaitlist((prev) =>
        prev.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                notified: true,
                status: "manualNotification",
                manuallyNotifiedAt: timestamp,
                updatedAt: timestamp
              }
            : item
        )
      )
    } catch (error: any) {
      console.error("Mark notified error:", error)
      toast.error(error.message || "Failed to update status")
    } finally {
      setMarkingId(null)
    }
  }

  const handleMarkNotified = (entry: any) => {
    setConfirmDialogOpen(true)
    setPendingAction({ type: "markNotified", payload: { entry } })
  }

  const handleBulkSend = async () => {
    if (bulkSending || waitlist.length === 0) return

    try {
      setBulkSending(true)

      const currentUser = auth.currentUser
      const token = currentUser ? await currentUser.getIdToken() : undefined

      const response = await fetch("/api/admin/send-waitlist-bulk-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          waitlistIds: waitlist.map((entry) => entry.id),
          templateKey: bulkTemplate
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send bulk emails")
      }

      const successes = data.results?.filter((item: any) => item.success).length ?? 0
      const failures = data.results?.length ? data.results.length - successes : 0

      toast.success(`Bulk email complete: ${successes} sent${failures ? `, ${failures} failed` : ""}`)
      setBulkDialogOpen(false)

      if (successes > 0) {
        setWaitlist((prev) =>
          prev.map((entry) => {
            const result = data.results?.find((item: any) => item.id === entry.id)
            if (!result || !result.success) return entry
            return {
              ...entry,
              notified: true,
              status: bulkTemplate,
              lastNotifiedAt: new Date().toISOString(),
              lastNotificationTemplate: bulkTemplate
            }
          })
        )
      }
    } catch (error: any) {
      console.error("Bulk send error:", error)
      toast.error(error.message || "Failed to send bulk emails")
    } finally {
      setBulkSending(false)
    }
  }

  if (authLoading || adminLoading || loading) {
    return <AdminTableSkeleton />
  }

  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <OtaxLogo />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/admin/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Link href="/admin/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Waitlist Management</h1>
            <p className="text-muted-foreground">Manage waitlist signups</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
              Send Bulk Email
            </Button>
            <Badge variant="outline">{waitlist.length} signups</Badge>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search waitlist..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold">Email</th>
                    <th className="text-left p-4 font-semibold">Phone</th>
                    <th className="text-left p-4 font-semibold">User Type</th>
                    <th className="text-left p-4 font-semibold">Platform Expectations</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Signed Up</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWaitlist.map((w: any) => (
                    <tr key={w.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4 text-sm font-semibold">{w.name}</td>
                      <td className="p-4 text-sm leading-tight">{w.email}</td>
                      <td className="p-4 text-sm leading-tight">{w.phone || 'N/A'}</td>
                      <td className="p-4">
                        <Badge variant="outline">{formatUserType(w.userType)}</Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground max-w-[250px]">
                        {w.platformExpectations?.trim() ? w.platformExpectations : '—'}
                      </td>
                      <td className="p-4">
                        <Badge variant={formatStatus(w.status).variant}>
                          {formatStatus(w.status).label}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(w.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => {
                              setPendingAction({ type: "sendEmail", payload: { recipient: w } })
                              setConfirmDialogOpen(true)
                            }}
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleMarkNotified(w)}
                            title="Mark as Notified"
                            disabled={markingId === w.id}
                          >
                            {markingId === w.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredWaitlist.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No waitlist entries found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Send Waitlist Email</DialogTitle>
            <DialogDescription>
              {selectedRecipient ? `Send an update to ${selectedRecipient.name || selectedRecipient.email}.` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email-template">Email Template</Label>
              <Select value={selectedTemplate} onValueChange={(value: WaitlistTemplateKey) => handleTemplateChange(value)}>
                <SelectTrigger id="email-template" className="mt-1">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WAITLIST_EMAIL_TEMPLATES).map(([key, template]) => (
                    <SelectItem key={key} value={key as WaitlistTemplateKey}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input id="email-subject" value={emailPreview.subject} readOnly className="mt-1" />
            </div>

            <div>
              <Label htmlFor="email-body">Email Preview</Label>
              <Textarea
                id="email-body"
                value={emailPreview.body}
                readOnly
                rows={12}
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                This email will include the link to our site:{" "}
                <a href={WAITLIST_SITE_LINK} target="_blank" rel="noreferrer" className="underline">
                  {WAITLIST_SITE_LINK}
                </a>
              </p>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between mt-4">
            <Button variant="outline" onClick={handleCopyBody} className="flex items-center gap-2">
              <Copy className="w-4 h-4" />
              Copy Content
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setEmailDialogOpen(false)
                  setSelectedRecipient(null)
                  setSendingEmail(false)
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSendEmail} className="flex items-center gap-2" disabled={sendingEmail}>
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          setConfirmDialogOpen(open)
          if (!open) {
            setPendingAction(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirm Action
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.type === "sendEmail" && pendingAction.payload?.recipient
                ? `Send an email to ${pendingAction.payload.recipient.name || pendingAction.payload.recipient.email}?`
                : pendingAction?.type === "markNotified" && pendingAction.payload?.entry
                  ? `Mark ${pendingAction.payload.entry.email} as notified?`
                  : "Are you sure you want to proceed with this action?"}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmDialogOpen(false)
                setPendingAction(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pendingAction?.type === "sendEmail" && pendingAction.payload?.recipient) {
                  openEmailDialogWithRecipient(pendingAction.payload.recipient)
                } else if (pendingAction?.type === "markNotified" && pendingAction.payload?.entry) {
                  markNotified(pendingAction.payload.entry)
                }
                setConfirmDialogOpen(false)
                setPendingAction(null)
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Bulk Waitlist Email</DialogTitle>
            <DialogDescription>
              Choose a template and notify all waitlist members in one go. This will send individual emails to each person.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="bulk-template">Email Template</Label>
              <Select value={bulkTemplate} onValueChange={(value: WaitlistTemplateKey) => setBulkTemplate(value)}>
                <SelectTrigger id="bulk-template" className="mt-1">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WAITLIST_EMAIL_TEMPLATES).map(([key, template]) => (
                    <SelectItem key={key} value={key as WaitlistTemplateKey}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                Recipients
              </p>
              <p>All {waitlist.length} waitlist members with valid emails will receive this message.</p>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkSend} className="flex items-center gap-2" disabled={bulkSending || waitlist.length === 0}>
              {bulkSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Bulk Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
