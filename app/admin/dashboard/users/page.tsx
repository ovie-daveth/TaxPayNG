"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminTableSkeleton } from "@/components/ui/skeletons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { adminService } from "@/lib/services/adminService"
import { toast } from "sonner"
import OtaxLogo from "@/components/OtaxLogo"
import { ThemeToggle } from "@/components/theme-toggle"
import { db } from "@/firebase/firebase"
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { format } from "date-fns"
import { Timestamp } from "firebase/firestore"
import { AlertTriangle, ArrowLeft, Ban, CheckCircle, Loader2, Mail, MoreVertical, Search, Send, Copy, Trash2, UserCog, Calendar, Clock, Crown, Gift } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { buildUserEmail, USER_EMAIL_TEMPLATES, USER_SITE_LINK, type UserTemplateKey } from "@/lib/emails/user-templates"
import { auth } from "@/firebase/firebase"

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'delete' | 'disable' | 'enable' | 'warning' | 'mail' | 'assignRole' | null
    user: any | null
  }>({
    open: false,
    type: null,
    user: null
  })
  const [selectedRole, setSelectedRole] = useState<string>('user')
  const [processing, setProcessing] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<UserTemplateKey | "custom">("welcome")
  const [emailPreview, setEmailPreview] = useState<{ subject: string; body: string }>({ subject: "", body: "" })
  const [editableSubject, setEditableSubject] = useState("")
  const [editableBody, setEditableBody] = useState("")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkTemplate, setBulkTemplate] = useState<UserTemplateKey | "custom">("welcome")
  const [bulkEditableSubject, setBulkEditableSubject] = useState("")
  const [bulkEditableBody, setBulkEditableBody] = useState("")
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkBusinessTypeFilter, setBulkBusinessTypeFilter] = useState<"all" | string>("all")
  const [subscriptionFilter, setSubscriptionFilter] = useState<"all" | "active" | "expired" | "none">("all")
  const [trialFilter, setTrialFilter] = useState<"all" | "active" | "expired" | "not_used">("all")

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) {
        router.push('/admin/login')
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, router])

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user || !isAdmin) return

      try {
        setLoading(true)
        const usersSnapshot = await getDocs(query(
          collection(db, "userProfiles"),
          orderBy("createdAt", "desc")
        ))
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setUsers(usersData)
      } catch (error) {
        console.error("Error fetching users:", error)
        toast.error("Failed to load users")
      } finally {
        setLoading(false)
      }
    }

    if (user && isAdmin) {
      fetchUsers()
    }
  }, [user, isAdmin])

  // Helper function to safely format dates
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return 'N/A'
    
    try {
      let date: Date | null = null
      
      // Handle Firestore Timestamp
      if (dateValue instanceof Timestamp || (dateValue?.toDate && typeof dateValue.toDate === 'function')) {
        date = dateValue.toDate()
      }
      // Handle Date objects
      else if (dateValue instanceof Date) {
        date = dateValue
      }
      // Handle ISO strings or number timestamps
      else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        date = new Date(dateValue)
      }
      
      // Validate date
      if (!date || isNaN(date.getTime())) {
        return 'N/A'
      }
      
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      console.error("Error formatting date:", error, dateValue)
      return 'N/A'
    }
  }

  // Helper function to get subscription status
  const getSubscriptionStatus = (user: any) => {
    if (user.isSubscribe && user.subscriptionExpiryDate) {
      const expiryDate = new Date(user.subscriptionExpiryDate)
      const now = new Date()
      
      if (expiryDate > now) {
        const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
          status: 'active',
          label: user.subscriptionType || 'Subscribed',
          variant: 'default' as const,
          daysRemaining,
          expiryDate
        }
      } else {
        return {
          status: 'expired',
          label: 'Expired',
          variant: 'destructive' as const,
          expiryDate
        }
      }
    }
    
    return {
      status: 'none',
      label: 'Not Subscribed',
      variant: 'outline' as const
    }
  }

  // Helper function to get free trial status
  const getFreeTrialStatus = (user: any) => {
    if (!user.freeTrialUsed) {
      return {
        status: 'not_used',
        label: 'Not Used',
        variant: 'outline' as const
      }
    }

    // If user has active subscription, they're not in free trial
    if (user.isSubscribe && user.subscriptionExpiryDate) {
      const subscriptionExpiry = new Date(user.subscriptionExpiryDate)
      if (subscriptionExpiry > new Date()) {
        return {
          status: 'subscribed',
          label: 'Subscribed',
          variant: 'default' as const
        }
      }
    }

    if (user.freeTrialEndDate) {
      const trialEnd = new Date(user.freeTrialEndDate)
      const now = new Date()
      
      if (trialEnd > now) {
        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
          status: 'active',
          label: `Active (${daysRemaining}d)`,
          variant: 'default' as const,
          daysRemaining,
          endDate: trialEnd
        }
      } else {
        return {
          status: 'expired',
          label: 'Expired',
          variant: 'destructive' as const,
          endDate: trialEnd
        }
      }
    }

    return {
      status: 'unknown',
      label: 'Unknown',
      variant: 'outline' as const
    }
  }

  const filteredUsers = users.filter((u: any) => {
    // Search filter
    const matchesSearch = 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    // Subscription filter
    if (subscriptionFilter !== "all") {
      const subscriptionStatus = getSubscriptionStatus(u)
      if (subscriptionFilter === "active" && subscriptionStatus.status !== "active") return false
      if (subscriptionFilter === "expired" && subscriptionStatus.status !== "expired") return false
      if (subscriptionFilter === "none" && subscriptionStatus.status !== "none") return false
    }

    // Trial filter
    if (trialFilter !== "all") {
      const trialStatus = getFreeTrialStatus(u)
      if (trialFilter === "active" && trialStatus.status !== "active") return false
      if (trialFilter === "expired" && trialStatus.status !== "expired") return false
      if (trialFilter === "not_used" && trialStatus.status !== "not_used") return false
    }

    return true
  })

  // Get unique business types for filter
  const businessTypes = Array.from(new Set(users.map((u: any) => u.businessType).filter(Boolean)))

  useEffect(() => {
    if (selectedRecipient && selectedTemplate !== "custom") {
      const preview = buildUserEmail(selectedTemplate as UserTemplateKey, selectedRecipient)
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
    setSelectedTemplate("welcome")
    const preview = buildUserEmail("welcome", recipient)
    setEmailPreview(preview)
    setEditableSubject(preview.subject)
    setEditableBody(preview.body)
    setEmailDialogOpen(true)
  }

  const handleTemplateChange = (value: UserTemplateKey | "custom") => {
    setSelectedTemplate(value)
    if (selectedRecipient && value !== "custom") {
      const preview = buildUserEmail(value as UserTemplateKey, selectedRecipient)
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
    const recipientName = selectedRecipient.name || `${selectedRecipient.firstName || ''} ${selectedRecipient.lastName || ''}`.trim() || ""

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
      const response = await fetch("/api/admin/send-user-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userId: selectedRecipient.userId,
          recipientEmail,
          recipientName,
          recipientFirstName: selectedRecipient.firstName,
          recipientLastName: selectedRecipient.lastName,
          templateKey: isCustom ? undefined : (selectedTemplate as UserTemplateKey),
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
      setSelectedTemplate("welcome")
      setEditableSubject("")
      setEditableBody("")

      if (data.updatedUser) {
        setUsers((prev) => prev.map((u) => u.id === data.updatedUser.id ? data.updatedUser : u))
      }
    } catch (error: any) {
      console.error("Send email error:", error)
      toast.error(error.message || "Failed to send email")
    } finally {
      setSendingEmail(false)
    }
  }

  const handleBulkSend = async () => {
    if (bulkSending || users.length === 0) return

    if (!bulkEditableSubject.trim() || !bulkEditableBody.trim()) {
      toast.error("Please fill in both subject and body")
      return
    }

    try {
      setBulkSending(true)

      const currentUser = auth.currentUser
      const token = currentUser ? await currentUser.getIdToken() : undefined

      // Filter users by business type
      let filteredUsers = users
      if (bulkBusinessTypeFilter !== "all") {
        filteredUsers = users.filter((u: any) => {
          const businessType = u.businessType?.toString().toLowerCase().trim()
          return businessType === bulkBusinessTypeFilter.toLowerCase()
        })
      }

      if (filteredUsers.length === 0) {
        toast.error(`No ${bulkBusinessTypeFilter === "all" ? "" : bulkBusinessTypeFilter} users found to send emails to`)
        setBulkSending(false)
        return
      }

      // Use bulk email API for faster parallel sending
      const userIds = filteredUsers
        .filter(u => u.email && u.userId)
        .map(u => u.userId)

      if (userIds.length === 0) {
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
        for (let i = 0; i < filteredUsers.length; i += batchSize) {
          batches.push(filteredUsers.slice(i, i + batchSize))
        }

        for (const batch of batches) {
          const batchPromises = batch.map(async (u) => {
            if (!u.email) {
              return { id: u.userId, success: false, error: "Email missing" }
            }

            try {
              const response = await fetch("/api/admin/send-user-email", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                  userId: u.userId,
                  recipientEmail: u.email,
                  recipientName: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || undefined,
                  recipientFirstName: u.firstName,
                  recipientLastName: u.lastName,
                  customSubject: bulkEditableSubject.trim(),
                  customBody: bulkEditableBody.trim(),
                  isCustomEmail: true,
                })
              })

              const data = await response.json()
              return {
                id: u.userId,
                email: u.email,
                success: response.ok,
                error: response.ok ? undefined : (data.error || "Failed to send")
              }
            } catch (error: any) {
              return {
                id: u.userId,
                email: u.email,
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
          const response = await fetch("/api/admin/send-user-bulk-emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              userIds,
              templateKey: bulkTemplate as UserTemplateKey
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
      setBulkTemplate("welcome")
      setBulkEditableSubject("")
      setBulkEditableBody("")
      setBulkBusinessTypeFilter("all")
    } catch (error: any) {
      console.error("Bulk send error:", error)
      toast.error(error.message || "Failed to send bulk emails")
    } finally {
      setBulkSending(false)
    }
  }

  const handleOpenDialog = (type: 'delete' | 'disable' | 'enable' | 'warning' | 'mail' | 'assignRole', user: any) => {
    setActionDialog({ open: true, type, user })
    if (type === 'assignRole') {
      setSelectedRole(user.role || 'user')
    }
  }

  const handleCloseDialog = () => {
    setActionDialog({ open: false, type: null, user: null })
    setSelectedRole('user')
  }

  const handleDeleteUser = async () => {
    if (!actionDialog.user) return
    
    try {
      setProcessing(true)
      await deleteDoc(doc(db, "userProfiles", actionDialog.user.id))
      
      // Update local state
      setUsers(users.filter((u: any) => u.id !== actionDialog.user.id))
      toast.success("User deleted successfully")
      handleCloseDialog()
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast.error("Failed to delete user: " + (error.message || "Unknown error"))
    } finally {
      setProcessing(false)
    }
  }

  const handleDisableUser = async () => {
    if (!actionDialog.user) return
    
    try {
      setProcessing(true)
      await updateDoc(doc(db, "userProfiles", actionDialog.user.id), {
        disabled: true,
        disabledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      // Update local state
      setUsers(users.map((u: any) => 
        u.id === actionDialog.user.id 
          ? { ...u, disabled: true, disabledAt: new Date().toISOString() }
          : u
      ))
      toast.success("User disabled successfully")
      handleCloseDialog()
    } catch (error: any) {
      console.error("Error disabling user:", error)
      toast.error("Failed to disable user: " + (error.message || "Unknown error"))
    } finally {
      setProcessing(false)
    }
  }

  const handleEnableUser = async () => {
    if (!actionDialog.user) return
    
    try {
      setProcessing(true)
      const updateData: any = {
        disabled: false,
        enabledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await updateDoc(doc(db, "userProfiles", actionDialog.user.id), updateData)
      
      // Update local state
      setUsers(users.map((u: any) => 
        u.id === actionDialog.user.id 
          ? { ...u, disabled: false, enabledAt: new Date().toISOString() }
          : u
      ))
      toast.success("User enabled successfully")
      handleCloseDialog()
    } catch (error: any) {
      console.error("Error enabling user:", error)
      toast.error("Failed to enable user: " + (error.message || "Unknown error"))
    } finally {
      setProcessing(false)
    }
  }

  const handleSendWarning = async () => {
    if (!actionDialog.user) return
    
    try {
      setProcessing(true)
      // Store warning in user profile
      await updateDoc(doc(db, "userProfiles", actionDialog.user.id), {
        warnings: [...(actionDialog.user.warnings || []), {
          message: "Administrative warning issued",
          issuedAt: new Date().toISOString(),
          issuedBy: user?.email || 'Admin'
        }],
        updatedAt: new Date().toISOString()
      })
      
      // Update local state
      setUsers(users.map((u: any) => 
        u.id === actionDialog.user.id 
          ? { 
              ...u, 
              warnings: [...(u.warnings || []), {
                message: "Administrative warning issued",
                issuedAt: new Date().toISOString(),
                issuedBy: user?.email || 'Admin'
              }]
            }
          : u
      ))
      toast.success("Warning sent to user")
      handleCloseDialog()
    } catch (error: any) {
      console.error("Error sending warning:", error)
      toast.error("Failed to send warning: " + (error.message || "Unknown error"))
    } finally {
      setProcessing(false)
    }
  }

  const handleSendMail = () => {
    if (!actionDialog.user) return
    
    // Open email dialog instead of mailto
    openEmailDialogWithRecipient(actionDialog.user)
    handleCloseDialog()
  }

  const handleAssignRole = async () => {
    if (!actionDialog.user) return
    
    try {
      setProcessing(true)
      const userEmail = actionDialog.user.email
      const userId = actionDialog.user.userId

      if (!userId) {
        toast.error("User ID not found")
        return
      }

      // Update role based on selection
      if (selectedRole === 'admin') {
        await adminService.setAdmin(userEmail, userId)
      } else if (selectedRole === 'editor') {
        await adminService.setEditor(userEmail, userId)
      } else {
        // Set to 'user' role by updating directly
        await updateDoc(doc(db, "userProfiles", actionDialog.user.id), {
          role: 'user',
          updatedAt: new Date().toISOString()
        })
      }
      
      // Update local state
      setUsers(users.map((u: any) => 
        u.id === actionDialog.user.id 
          ? { ...u, role: selectedRole }
          : u
      ))
      
      toast.success(`Role updated to ${selectedRole} successfully`)
      handleCloseDialog()
    } catch (error: any) {
      console.error("Error assigning role:", error)
      toast.error("Failed to assign role: " + (error.message || "Unknown error"))
    } finally {
      setProcessing(false)
    }
  }

  const getDialogContent = () => {
    if (!actionDialog.user || !actionDialog.type) return null

    const userName = `${actionDialog.user.firstName || ''} ${actionDialog.user.lastName || ''}`.trim() || actionDialog.user.email

    switch (actionDialog.type) {
      case 'delete':
        return {
          title: "Delete User",
          description: `Are you sure you want to delete ${userName}? This action cannot be undone and will permanently remove the user's profile.`,
          actionText: "Delete",
          actionButtonVariant: "destructive" as const
        }
      case 'disable':
        return {
          title: "Disable User",
          description: `Are you sure you want to disable ${userName}? The user will not be able to access their account until re-enabled.`,
          actionText: "Disable",
          actionButtonVariant: "default" as const
        }
      case 'enable':
        return {
          title: "Enable User",
          description: `Are you sure you want to enable ${userName}? The user will regain access to their account.`,
          actionText: "Enable",
          actionButtonVariant: "default" as const
        }
      case 'warning':
        return {
          title: "Send Warning",
          description: `Are you sure you want to send an administrative warning to ${userName}? This will be recorded in their profile.`,
          actionText: "Send Warning",
          actionButtonVariant: "default" as const
        }
      case 'mail':
        return {
          title: "Send Email",
          description: `Open your email client to send a message to ${userName} (${actionDialog.user.email})?`,
          actionText: "Open Email",
          actionButtonVariant: "default" as const
        }
      case 'assignRole':
        return {
          title: "Assign Role",
          description: `Select a role for ${userName}. Current role: ${actionDialog.user.role || 'user'}`,
          actionText: "Save Role",
          actionButtonVariant: "default" as const
        }
      default:
        return null
    }
  }

  const dialogContent = getDialogContent()

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
            <h1 className="text-3xl font-bold mb-2">User Management</h1>
            <p className="text-muted-foreground">Manage all registered users</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setBulkTemplate("welcome")
                setBulkBusinessTypeFilter("all")
                if (users.length > 0 && users[0].email) {
                  const preview = buildUserEmail("welcome", users[0])
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
            <Badge variant="outline">{users.length} users</Badge>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={subscriptionFilter} onValueChange={(value: any) => setSubscriptionFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Subscription Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subscriptions</SelectItem>
                <SelectItem value="active">Active Subscriptions</SelectItem>
                <SelectItem value="expired">Expired Subscriptions</SelectItem>
                <SelectItem value="none">Not Subscribed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={trialFilter} onValueChange={(value: any) => setTrialFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Free Trial Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trials</SelectItem>
                <SelectItem value="active">Active Trials</SelectItem>
                <SelectItem value="expired">Expired Trials</SelectItem>
                <SelectItem value="not_used">Trial Not Used</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bulkBusinessTypeFilter} onValueChange={(value: string) => setBulkBusinessTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Business Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Business Types</SelectItem>
                {businessTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    <th className="text-left p-4 font-semibold">Business Type</th>
                    <th className="text-left p-4 font-semibold">Role</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Joined</th>
                    <th className="text-left p-4 font-semibold">Subscription</th>
                    <th className="text-left p-4 font-semibold">Free Trial</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u: any) => {
                    const subscriptionStatus = getSubscriptionStatus(u)
                    const trialStatus = getFreeTrialStatus(u)
                    
                    return (
                      <tr key={u.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-4">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="p-4">{u.email}</td>
                        <td className="p-4">
                          <Badge variant="outline">{u.businessType || 'N/A'}</Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant={
                            u.role === 'admin' ? 'default' : 
                            u.role === 'editor' ? 'secondary' : 
                            'outline'
                          }>
                            {u.role || 'user'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {u.disabled ? (
                            <Badge variant="destructive">Disabled</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {formatDate(u.createdAt)}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <Badge variant={subscriptionStatus.variant} className="flex items-center gap-1 w-fit">
                              {subscriptionStatus.status === 'active' && <Crown className="w-3 h-3" />}
                              {subscriptionStatus.label}
                            </Badge>
                            {subscriptionStatus.status === 'active' && subscriptionStatus.expiryDate && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                Expires: {formatDate(subscriptionStatus.expiryDate)}
                                {subscriptionStatus.daysRemaining !== undefined && (
                                  <span className="ml-1">({subscriptionStatus.daysRemaining}d left)</span>
                                )}
                              </div>
                            )}
                            {subscriptionStatus.status === 'expired' && subscriptionStatus.expiryDate && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                Expired: {formatDate(subscriptionStatus.expiryDate)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <Badge variant={trialStatus.variant} className="flex items-center gap-1 w-fit">
                              {trialStatus.status === 'active' && <Gift className="w-3 h-3" />}
                              {trialStatus.label}
                            </Badge>
                            {trialStatus.status === 'active' && trialStatus.endDate && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                Ends: {formatDate(trialStatus.endDate)}
                              </div>
                            )}
                            {trialStatus.status === 'expired' && trialStatus.endDate && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                Ended: {formatDate(trialStatus.endDate)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {u.disabled ? (
                                <DropdownMenuItem onClick={() => handleOpenDialog('enable', u)}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Enable User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleOpenDialog('disable', u)}>
                                  <Ban className="mr-2 h-4 w-4" />
                                  Disable User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleOpenDialog('warning', u)}>
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Send Warning
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenDialog('mail', u)}>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenDialog('assignRole', u)}>
                                <UserCog className="mr-2 h-4 w-4" />
                                Assign Role
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleOpenDialog('delete', u)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No users found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      {dialogContent && (
        <Dialog open={actionDialog.open} onOpenChange={(open) => {
          if (!open && !processing) {
            handleCloseDialog()
          }
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{dialogContent.title}</DialogTitle>
              <DialogDescription>
                {dialogContent.description}
              </DialogDescription>
            </DialogHeader>
            {actionDialog.type === 'assignRole' && (
              <div className="py-4">
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="editor">Editor (Blogger)</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  • <strong>User:</strong> Standard user with no special permissions<br/>
                  • <strong>Editor:</strong> Can create and edit blog posts, but cannot access admin dashboard<br/>
                  • <strong>Admin:</strong> Full access to all admin features
                </p>
              </div>
            )}
            <DialogFooter className="flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  switch (actionDialog.type) {
                    case 'delete':
                      handleDeleteUser()
                      break
                    case 'disable':
                      handleDisableUser()
                      break
                    case 'enable':
                      handleEnableUser()
                      break
                    case 'warning':
                      handleSendWarning()
                      break
                    case 'mail':
                      handleSendMail()
                      break
                    case 'assignRole':
                      handleAssignRole()
                      break
                  }
                }}
                disabled={processing}
                variant={actionDialog.type === 'delete' ? 'destructive' : 'default'}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  dialogContent.actionText
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              {selectedRecipient 
                ? `Send an email to ${selectedRecipient.firstName || selectedRecipient.name || selectedRecipient.email}` 
                : "Send an email to a user"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Selection */}
            <div>
              <Label htmlFor="email-template">Email Template</Label>
              <Select 
                value={selectedTemplate} 
                onValueChange={(value: UserTemplateKey | "custom") => handleTemplateChange(value)}
              >
                <SelectTrigger id="email-template" className="mt-1">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(USER_EMAIL_TEMPLATES).map(([key, template]) => (
                    <SelectItem key={key} value={key as UserTemplateKey}>
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

      {/* Bulk Email Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Bulk Email</DialogTitle>
            <DialogDescription>
              Send an email to all users at once. This will send individual emails to each person.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Business Type Filter */}
            <div>
              <Label htmlFor="bulk-business-type">Send To</Label>
              <Select 
                value={bulkBusinessTypeFilter} 
                onValueChange={(value: string) => {
                  setBulkBusinessTypeFilter(value)
                }}
              >
                <SelectTrigger id="bulk-business-type" className="mt-1">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {businessTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type} Only
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Selection */}
            <div>
              <Label htmlFor="bulk-template">Email Template</Label>
              <Select 
                value={bulkTemplate} 
                onValueChange={(value: UserTemplateKey | "custom") => {
                  setBulkTemplate(value)
                  if (value !== "custom") {
                    // Load template preview for first recipient (if available)
                    const filtered = bulkBusinessTypeFilter === "all" 
                      ? users 
                      : users.filter((u: any) => {
                          const businessType = u.businessType?.toString().toLowerCase().trim()
                          return businessType === bulkBusinessTypeFilter.toLowerCase()
                        })
                    if (filtered.length > 0 && filtered[0].email) {
                      const preview = buildUserEmail(value as UserTemplateKey, filtered[0])
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
                  {Object.entries(USER_EMAIL_TEMPLATES).map(([key, template]) => (
                    <SelectItem key={key} value={key as UserTemplateKey}>
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
                const filtered = bulkBusinessTypeFilter === "all" 
                  ? users 
                  : users.filter((u: any) => {
                      const businessType = u.businessType?.toString().toLowerCase().trim()
                      return businessType === bulkBusinessTypeFilter.toLowerCase()
                    })
                const count = filtered.filter((u: any) => u.email && u.userId).length
                const typeLabel = bulkBusinessTypeFilter === "all" 
                  ? "all users" 
                  : `${bulkBusinessTypeFilter} users`
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
                const filtered = bulkBusinessTypeFilter === "all" 
                  ? users 
                  : users.filter((u: any) => {
                      const businessType = u.businessType?.toString().toLowerCase().trim()
                      return businessType === bulkBusinessTypeFilter.toLowerCase()
                    })
                return filtered.filter((u: any) => u.email && u.userId).length === 0
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
