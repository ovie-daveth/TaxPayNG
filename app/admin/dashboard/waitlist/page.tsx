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
  const [selectedTemplate, setSelectedTemplate] = useState<WaitlistTemplateKey | "custom">("launchPreview")
  const [emailPreview, setEmailPreview] = useState<{ subject: string; body: string }>({ subject: "", body: "" })
  const [editableSubject, setEditableSubject] = useState("")
  const [editableBody, setEditableBody] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkTemplate, setBulkTemplate] = useState<WaitlistTemplateKey | "custom">("launchPreview")
  const [bulkEditableSubject, setBulkEditableSubject] = useState("")
  const [bulkEditableBody, setBulkEditableBody] = useState("")
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkUserTypeFilter, setBulkUserTypeFilter] = useState<"all" | "sme" | "freelancer" | "creator">("all")
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<null | { type: "sendEmail" | "markNotified" | "signUp"; payload: any }>(null)
  const [signingUpId, setSigningUpId] = useState<string | null>(null)

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
    if (selectedRecipient && selectedTemplate !== "custom") {
      const preview = buildWaitlistEmail(selectedTemplate as WaitlistTemplateKey, selectedRecipient)
      setEmailPreview(preview)
      setEditableSubject(preview.subject)
      setEditableBody(preview.body)
    } else if (selectedTemplate === "custom") {
      setEditableSubject("")
      setEditableBody("")
    }
  }, [selectedRecipient, selectedTemplate])

  const openEmailDialogWithRecipient = (recipient: any) => {
    setSelectedRecipient(recipient)
    setSelectedTemplate("launchPreview")
    const preview = buildWaitlistEmail("launchPreview", recipient)
    setEmailPreview(preview)
    setEditableSubject(preview.subject)
    setEditableBody(preview.body)
    setEmailDialogOpen(true)
  }

  const handleTemplateChange = (value: WaitlistTemplateKey | "custom") => {
    setSelectedTemplate(value)
    if (selectedRecipient && value !== "custom") {
      const preview = buildWaitlistEmail(value as WaitlistTemplateKey, selectedRecipient)
      setEmailPreview(preview)
      setEditableSubject(preview.subject)
      setEditableBody(preview.body)
    } else if (value === "custom") {
      setEditableSubject("")
      setEditableBody("")
    }
  }

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(editableBody)
      toast.success("Email content copied to clipboard")
    } catch (error) {
      toast.error("Failed to copy email content")
    }
  }

  const handleSendEmail = async () => {
    if (!user || sendingEmail || !selectedRecipient) return

    const recipientEmail = selectedRecipient.email || ""
    const recipientName = selectedRecipient.name || ""

    if (!recipientEmail) {
      toast.error("Recipient email is required")
      return
    }

    if (!editableSubject.trim() || !editableBody.trim()) {
      toast.error("Please fill in both subject and body")
      return
    }

    setSendingEmail(true)

    try {
      const currentUser = auth.currentUser
      const token = currentUser ? await currentUser.getIdToken() : undefined

      const isCustom = selectedTemplate === "custom"
      const response = await fetch("/api/admin/send-waitlist-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          waitlistId: selectedRecipient.id,
          recipientEmail,
          recipientName,
          templateKey: isCustom ? undefined : (selectedTemplate as WaitlistTemplateKey),
          customSubject: editableSubject.trim(),
          customBody: editableBody.trim(),
          isCustomEmail: isCustom,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email")
      }

      toast.success(data.message || "Email sent successfully")
      setEmailDialogOpen(false)
      setSelectedRecipient(null)
      setSelectedTemplate("launchPreview")
      setEditableSubject("")
      setEditableBody("")

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

  const handleSignUp = async (entry: any) => {
    if (!entry?.id || signingUpId === entry.id) return

    try {
      setSigningUpId(entry.id)

      const currentUser = auth.currentUser
      const token = currentUser ? await currentUser.getIdToken() : undefined

      const response = await fetch("/api/admin/signup-waitlist-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          waitlistId: entry.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sign up user")
      }

      toast.success(data.message || "User signed up successfully")
      
      // Update waitlist entry
      setWaitlist((prev) =>
        prev.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                signedUp: true,
                signedUpAt: new Date().toISOString(),
                userId: data.userId
              }
            : item
        )
      )
    } catch (error: any) {
      console.error("Sign up error:", error)
      toast.error(error.message || "Failed to sign up user")
    } finally {
      setSigningUpId(null)
    }
  }

  const handleSignUpClick = (entry: any) => {
    setConfirmDialogOpen(true)
    setPendingAction({ type: "signUp", payload: { entry } })
  }

  const handleBulkSend = async () => {
    if (bulkSending || waitlist.length === 0) return

    if (!bulkEditableSubject.trim() || !bulkEditableBody.trim()) {
      toast.error("Please fill in both subject and body")
      return
    }

    try {
      setBulkSending(true)

      const currentUser = auth.currentUser
      const token = currentUser ? await currentUser.getIdToken() : undefined

      // Filter waitlist by user type
      let filteredWaitlist = waitlist
      if (bulkUserTypeFilter !== "all") {
        filteredWaitlist = waitlist.filter((entry: any) => {
          const userType = entry.userType?.toString().toLowerCase().trim()
          return userType === bulkUserTypeFilter
        })
      }

      if (filteredWaitlist.length === 0) {
        toast.error(`No ${bulkUserTypeFilter === "all" ? "" : bulkUserTypeFilter} users found to send emails to`)
        setBulkSending(false)
        return
      }

      // Use bulk email API for faster parallel sending
      const waitlistIds = filteredWaitlist
        .filter(entry => entry.email)
        .map(entry => entry.id)

      if (waitlistIds.length === 0) {
        toast.error("No valid emails found to send")
        setBulkSending(false)
        return
      }

      // For custom emails, we need to send individually (or create a custom bulk endpoint)
      // For template emails, use the fast bulk API
      const isCustom = bulkTemplate === "custom"
      
      let results: Array<{ id: string; email?: string; success: boolean; error?: string }> = []

      if (isCustom) {
        // Custom emails - send in parallel batches (faster than sequential)
        const batchSize = 10
        const batches = []
        for (let i = 0; i < filteredWaitlist.length; i += batchSize) {
          batches.push(filteredWaitlist.slice(i, i + batchSize))
        }

        for (const batch of batches) {
          const batchPromises = batch.map(async (entry) => {
            if (!entry.email) {
              return { id: entry.id, success: false, error: "Email missing" }
            }

            try {
              const response = await fetch("/api/admin/send-waitlist-email", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                  waitlistId: entry.id,
                  recipientEmail: entry.email,
                  recipientName: entry.name,
                  customSubject: bulkEditableSubject.trim(),
                  customBody: bulkEditableBody.trim(),
                  isCustomEmail: true,
                })
              })

              const data = await response.json()
              return {
                id: entry.id,
                email: entry.email,
                success: response.ok,
                error: response.ok ? undefined : (data.error || "Failed to send")
              }
            } catch (error: any) {
              return {
                id: entry.id,
                email: entry.email,
                success: false,
                error: error.message || "Failed to send"
              }
            }
          })

          const batchResults = await Promise.all(batchPromises)
          results.push(...batchResults)
        }
      } else {
        // Template emails - use fast bulk API
        try {
          const response = await fetch("/api/admin/send-waitlist-bulk-emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              waitlistIds,
              templateKey: bulkTemplate as WaitlistTemplateKey
            })
          })

          const data = await response.json()

          if (response.ok && data.results) {
            results = data.results
            console.log(`✅ Bulk email sent via ${data.service || 'email service'}: ${data.successful} successful, ${data.failed} failed`)
          } else {
            throw new Error(data.error || "Failed to send bulk emails")
          }
        } catch (error: any) {
          console.error("Bulk email API error:", error)
          toast.error(error.message || "Failed to send bulk emails")
          setBulkSending(false)
          return
        }
      }

      const successes = results.filter((item) => item.success).length
      const failures = results.length - successes

      toast.success(`Bulk email complete: ${successes} sent${failures ? `, ${failures} failed` : ""}`)
      setBulkDialogOpen(false)
      setBulkTemplate("launchPreview")
      setBulkEditableSubject("")
      setBulkEditableBody("")
      setBulkUserTypeFilter("all")

      if (successes > 0) {
        setWaitlist((prev) =>
          prev.map((entry) => {
            const result = results.find((item: any) => item.id === entry.id)
            if (!result || !result.success) return entry
            return {
              ...entry,
              notified: true,
              status: bulkTemplate === "custom" ? "manualNotification" : (bulkTemplate as WaitlistTemplateKey),
              lastNotifiedAt: new Date().toISOString(),
              lastNotificationTemplate: bulkTemplate === "custom" ? undefined : (bulkTemplate as WaitlistTemplateKey)
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
           
            <Button 
              variant="outline" 
              onClick={() => {
                setBulkTemplate("launchPreview")
                setBulkUserTypeFilter("all")
                if (waitlist.length > 0 && waitlist[0].email) {
                  const preview = buildWaitlistEmail("launchPreview", waitlist[0])
                  setBulkEditableSubject(preview.subject)
                  setBulkEditableBody(preview.body)
                } else {
                  setBulkEditableSubject("")
                  setBulkEditableBody("")
                }
                setBulkDialogOpen(true)
              }}
            >
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
                    <th className="text-left p-4 font-semibold">Created</th>
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
                        {w.signedUp ? (
                          <Badge variant="default" className="bg-green-600">
                            <Check className="w-3 h-3 mr-1" />
                            Signed Up
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not Signed Up</Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {!w.signedUp && (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleSignUpClick(w)}
                              disabled={signingUpId === w.id}
                              title="Sign Up User"
                            >
                              {signingUpId === w.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Signing Up...
                                </>
                              ) : (
                                "Sign Up"
                              )}
                            </Button>
                          )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              {selectedRecipient 
                ? `Send an email to ${selectedRecipient.name || selectedRecipient.email}` 
                : "Send an email to a waitlist member"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Selection */}
            <div>
              <Label htmlFor="email-template">Email Template</Label>
              <Select 
                value={selectedTemplate} 
                onValueChange={(value: WaitlistTemplateKey | "custom") => handleTemplateChange(value)}
              >
                <SelectTrigger id="email-template" className="mt-1">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WAITLIST_EMAIL_TEMPLATES).map(([key, template]) => (
                    <SelectItem key={key} value={key as WaitlistTemplateKey}>
                      {template.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Template</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject - Always Editable */}
            <div>
              <Label htmlFor="email-subject">Subject *</Label>
              <Input
                id="email-subject"
                value={editableSubject}
                onChange={(e) => setEditableSubject(e.target.value)}
                placeholder="Enter email subject"
                className="mt-1"
              />
            </div>

            {/* Body - Always Editable */}
            <div>
              <Label htmlFor="email-body">Email Body *</Label>
              <Textarea
                id="email-body"
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
                placeholder="Enter your email content here..."
                rows={12}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-2">
                You can use placeholders: {"{{name}}"} for recipient name, {"{{siteLink}}"} for site URL
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
                  : pendingAction?.type === "signUp" && pendingAction.payload?.entry
                    ? `Sign up ${pendingAction.payload.entry.name || pendingAction.payload.entry.email}? A random password will be generated and sent to their email.`
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
                } else if (pendingAction?.type === "signUp" && pendingAction.payload?.entry) {
                  handleSignUp(pendingAction.payload.entry)
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Bulk Email</DialogTitle>
            <DialogDescription>
              Send an email to all waitlist members at once. This will send individual emails to each person.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* User Type Filter */}
            <div>
              <Label htmlFor="bulk-user-type">Send To</Label>
              <Select 
                value={bulkUserTypeFilter} 
                onValueChange={(value: "all" | "sme" | "freelancer" | "creator") => {
                  setBulkUserTypeFilter(value)
                }}
              >
                <SelectTrigger id="bulk-user-type" className="mt-1">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="sme">SMEs Only</SelectItem>
                  <SelectItem value="freelancer">Freelancers Only</SelectItem>
                  <SelectItem value="creator">Creators Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Template Selection */}
            <div>
              <Label htmlFor="bulk-template">Email Template</Label>
              <Select 
                value={bulkTemplate} 
                onValueChange={(value: WaitlistTemplateKey | "custom") => {
                  setBulkTemplate(value)
                  if (value !== "custom") {
                    // Load template preview for first recipient (if available)
                    const filtered = bulkUserTypeFilter === "all" 
                      ? waitlist 
                      : waitlist.filter((entry: any) => {
                          const userType = entry.userType?.toString().toLowerCase().trim()
                          return userType === bulkUserTypeFilter
                        })
                    if (filtered.length > 0 && filtered[0].email) {
                      const preview = buildWaitlistEmail(value as WaitlistTemplateKey, filtered[0])
                      setBulkEditableSubject(preview.subject)
                      setBulkEditableBody(preview.body)
                    }
                  } else {
                    setBulkEditableSubject("")
                    setBulkEditableBody("")
                  }
                }}
              >
                <SelectTrigger id="bulk-template" className="mt-1">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WAITLIST_EMAIL_TEMPLATES).map(([key, template]) => (
                    <SelectItem key={key} value={key as WaitlistTemplateKey}>
                      {template.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Template</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject - Always Editable */}
            <div>
              <Label htmlFor="bulk-subject">Subject *</Label>
              <Input
                id="bulk-subject"
                value={bulkEditableSubject}
                onChange={(e) => setBulkEditableSubject(e.target.value)}
                placeholder="Enter email subject"
                className="mt-1"
              />
            </div>

            {/* Body - Always Editable */}
            <div>
              <Label htmlFor="bulk-body">Email Body *</Label>
              <Textarea
                id="bulk-body"
                value={bulkEditableBody}
                onChange={(e) => setBulkEditableBody(e.target.value)}
                placeholder="Enter your email content here..."
                rows={10}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-2">
                You can use placeholders: {"{{name}}"} for recipient name, {"{{siteLink}}"} for site URL
              </p>
            </div>

            <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                Recipients
              </p>
              {(() => {
                const filtered = bulkUserTypeFilter === "all" 
                  ? waitlist 
                  : waitlist.filter((entry: any) => {
                      const userType = entry.userType?.toString().toLowerCase().trim()
                      return userType === bulkUserTypeFilter
                    })
                const count = filtered.length
                const typeLabel = bulkUserTypeFilter === "all" 
                  ? "all waitlist members" 
                  : bulkUserTypeFilter === "sme" 
                    ? "SMEs" 
                    : bulkUserTypeFilter === "freelancer" 
                      ? "Freelancers" 
                      : "Creators"
                return (
                  <p>
                    {count} {typeLabel} {count === 1 ? "has" : "have"} valid {count === 1 ? "email" : "emails"} and will receive this message.
                  </p>
                )
              })()}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkSend} 
              className="flex items-center gap-2" 
              disabled={bulkSending || (() => {
                const filtered = bulkUserTypeFilter === "all" 
                  ? waitlist 
                  : waitlist.filter((entry: any) => {
                      const userType = entry.userType?.toString().toLowerCase().trim()
                      return userType === bulkUserTypeFilter
                    })
                return filtered.length === 0
              })()}
            >
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
