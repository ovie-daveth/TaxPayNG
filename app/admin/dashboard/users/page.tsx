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
import { AlertTriangle, ArrowLeft, Ban, CheckCircle, Loader2, Mail, MoreVertical, Search, Send, Copy, Trash2, UserCog, Calendar, Clock, Crown, Gift, Users, UserCheck, UserX, TrendingUp, Plus } from "lucide-react"
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
    type: 'delete' | 'disable' | 'enable' | 'warning' | 'mail' | 'assignRole' | 'extendTrial' | null
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
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "year">("all")
  const [extendTrialDialogOpen, setExtendTrialDialogOpen] = useState(false)
  const [extendTrialUser, setExtendTrialUser] = useState<any | null>(null)
  const [extendTrialDays, setExtendTrialDays] = useState<string>("7")
  const [extendingTrial, setExtendingTrial] = useState(false)
  const [bulkExtendTrialDialogOpen, setBulkExtendTrialDialogOpen] = useState(false)
  const [bulkExtendTrialDays, setBulkExtendTrialDays] = useState<string>("7")
  const [bulkExtendingTrial, setBulkExtendingTrial] = useState(false)
  const [bulkExtendBusinessTypeFilter, setBulkExtendBusinessTypeFilter] = useState<"all" | string>("all")
  const [bulkExtendTrialStatusFilter, setBulkExtendTrialStatusFilter] = useState<"all" | "active" | "expired" | "ending_soon" | "not_used">("all")

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
        // NOTE: createdAt is historically inconsistent in Firestore (string vs Timestamp).
        // We fetch unsorted and sort reliably in-memory.
        const usersSnapshot = await getDocs(collection(db, "userProfiles"))

        const usersData = usersSnapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))

        const toMillis = (v: any): number => {
          if (!v) return 0
          // Firestore Timestamp
          if (v instanceof Timestamp || (v?.toDate && typeof v.toDate === "function")) {
            return v.toDate().getTime()
          }
          if (typeof v === "string" || typeof v === "number") {
            const dt = new Date(v)
            return isNaN(dt.getTime()) ? 0 : dt.getTime()
          }
          if (typeof v === "object" && v.seconds !== undefined) {
            return Number(v.seconds) * 1000
          }
          return 0
        }

        usersData.sort((a: any, b: any) => toMillis(b.createdAt) - toMillis(a.createdAt))
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

  const refreshUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "userProfiles"))
      const usersData = usersSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }))
      const toMillis = (v: any): number => {
        if (!v) return 0
        if (v instanceof Timestamp || (v?.toDate && typeof v.toDate === "function")) {
          return v.toDate().getTime()
        }
        if (typeof v === "string" || typeof v === "number") {
          const dt = new Date(v)
          return isNaN(dt.getTime()) ? 0 : dt.getTime()
        }
        if (typeof v === "object" && v.seconds !== undefined) {
          return Number(v.seconds) * 1000
        }
        return 0
      }
      usersData.sort((a: any, b: any) => toMillis(b.createdAt) - toMillis(a.createdAt))
      setUsers(usersData)
    } catch (e) {
      console.error("Error refreshing users:", e)
    }
  }

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

    // Business type filter
    if (bulkBusinessTypeFilter !== "all") {
      const businessType = u.businessType?.toString().toLowerCase().trim()
      if (businessType !== bulkBusinessTypeFilter.toLowerCase()) return false
    }

    // Date filter (based on createdAt)
    if (dateFilter !== "all" && u.createdAt) {
      const userDate = new Date(u.createdAt)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - userDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (dateFilter === "today" && daysDiff !== 0) return false
      if (dateFilter === "week" && daysDiff > 7) return false
      if (dateFilter === "month" && daysDiff > 30) return false
      if (dateFilter === "year" && daysDiff > 365) return false
    }

    return true
  })

  // Get unique business types for filter
  const businessTypes = Array.from(new Set(users.map((u: any) => u.businessType).filter(Boolean)))

  // Calculate user statistics
  const stats = {
    total: users.length,
    onFreeTrial: users.filter((u: any) => {
      const trialStatus = getFreeTrialStatus(u)
      return trialStatus.status === 'active'
    }).length,
    subscribed: users.filter((u: any) => {
      const subStatus = getSubscriptionStatus(u)
      return subStatus.status === 'active'
    }).length,
    expiredTrial: users.filter((u: any) => {
      const trialStatus = getFreeTrialStatus(u)
      return trialStatus.status === 'expired'
    }).length,
    notUsedTrial: users.filter((u: any) => {
      const trialStatus = getFreeTrialStatus(u)
      return trialStatus.status === 'not_used'
    }).length,
    expiredSubscription: users.filter((u: any) => {
      const subStatus = getSubscriptionStatus(u)
      return subStatus.status === 'expired'
    }).length,
    noSubscription: users.filter((u: any) => {
      const subStatus = getSubscriptionStatus(u)
      return subStatus.status === 'none'
    }).length
  }

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

      // Filter users by business type, subscription status, and trial status
      let filteredUsers = users.filter((u: any) => {
        // Apply business type filter
        if (bulkBusinessTypeFilter !== "all") {
          const businessType = u.businessType?.toString().toLowerCase().trim()
          if (businessType !== bulkBusinessTypeFilter.toLowerCase()) return false
        }
        
        // Apply subscription filter
        if (subscriptionFilter !== "all") {
          const now = new Date()
          const hasActiveSubscription = u.subscriptionEndDate && new Date(u.subscriptionEndDate) > now
          const hasExpiredSubscription = u.subscriptionEndDate && new Date(u.subscriptionEndDate) <= now
          
          if (subscriptionFilter === "active" && !hasActiveSubscription) return false
          if (subscriptionFilter === "expired" && !hasExpiredSubscription) return false
          if (subscriptionFilter === "none" && u.subscriptionEndDate) return false
        }
        
        // Apply trial filter
        if (trialFilter !== "all") {
          const now = new Date()
          const hasActiveTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) > now
          const hasExpiredTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) <= now
          
          if (trialFilter === "active" && !hasActiveTrial) return false
          if (trialFilter === "expired" && !hasExpiredTrial) return false
          if (trialFilter === "not_used" && u.freeTrialEndDate) return false
        }
        
        return true
      })

      if (filteredUsers.length === 0) {
        const filters = []
        if (bulkBusinessTypeFilter !== "all") filters.push(bulkBusinessTypeFilter)
        if (subscriptionFilter !== "all") filters.push(`${subscriptionFilter} subscription`)
        if (trialFilter !== "all") filters.push(`${trialFilter} trial`)
        
        const filterLabel = filters.length > 0 ? ` with ${filters.join(", ")}` : ""
        toast.error(`No users${filterLabel} found to send emails to`)
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
      setSubscriptionFilter("all")
      setTrialFilter("all")
    } catch (error: any) {
      console.error("Bulk send error:", error)
      toast.error(error.message || "Failed to send bulk emails")
    } finally {
      setBulkSending(false)
    }
  }

  const handleOpenDialog = (type: 'delete' | 'disable' | 'enable' | 'warning' | 'mail' | 'assignRole' | 'extendTrial', user: any) => {
    // Handle extendTrial separately with its own dialog
    if (type === 'extendTrial') {
      setExtendTrialUser(user)
      setExtendTrialDialogOpen(true)
    } else {
      setActionDialog({ open: true, type, user })
      if (type === 'assignRole') {
        setSelectedRole(user.role || 'user')
      }
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

  const handleExtendTrial = async () => {
    if (!extendTrialUser || !extendTrialDays) return

    const days = parseInt(extendTrialDays)
    if (isNaN(days) || days <= 0) {
      toast.error("Please enter a valid number of days")
      return
    }

    setExtendingTrial(true)
    try {
      const currentUser = auth.currentUser
      const token = currentUser ? await currentUser.getIdToken() : undefined

      const response = await fetch("/api/admin/extend-free-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userIds: [extendTrialUser.userId],
          daysToAdd: days
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to extend free trial")
      }

      toast.success(`Free trial extended by ${days} day(s)`)
      setExtendTrialDialogOpen(false)
      setExtendTrialUser(null)
      setExtendTrialDays("7")

      // Refresh users list
      await refreshUsers()
    } catch (error: any) {
      console.error("Extend trial error:", error)
      toast.error(error.message || "Failed to extend free trial")
    } finally {
      setExtendingTrial(false)
    }
  }

  const handleBulkExtendTrial = async () => {
    if (!bulkExtendTrialDays) return

    const days = parseInt(bulkExtendTrialDays)
    if (isNaN(days) || days <= 0) {
      toast.error("Please enter a valid number of days")
      return
    }

    setBulkExtendingTrial(true)
    try {
      const currentUser = auth.currentUser
      const token = currentUser ? await currentUser.getIdToken() : undefined

      // Filter users by business type and trial status
      const eligibleUsers = users.filter((u: any) => {
        // Apply business type filter
        if (bulkExtendBusinessTypeFilter !== "all") {
          const businessType = u.businessType?.toString().toLowerCase().trim()
          if (businessType !== bulkExtendBusinessTypeFilter.toLowerCase()) return false
        }
        
        // Apply trial status filter
        if (bulkExtendTrialStatusFilter !== "all") {
          const now = new Date()
          const hasActiveTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) > now
          const hasExpiredTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) <= now
          const trialEndDate = u.freeTrialEndDate ? new Date(u.freeTrialEndDate) : null
          const daysRemaining = trialEndDate && hasActiveTrial 
            ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : 0
          
          if (bulkExtendTrialStatusFilter === "active" && !hasActiveTrial) return false
          if (bulkExtendTrialStatusFilter === "expired" && !hasExpiredTrial) return false
          if (bulkExtendTrialStatusFilter === "ending_soon" && (!hasActiveTrial || daysRemaining > 3)) return false
          if (bulkExtendTrialStatusFilter === "not_used" && u.freeTrialEndDate) return false
        }
        
        return true
      })

      const userIds = eligibleUsers
        .filter((u: any) => u.userId)
        .map((u: any) => u.userId)

      if (userIds.length === 0) {
        const filters = []
        if (bulkExtendBusinessTypeFilter !== "all") filters.push(bulkExtendBusinessTypeFilter)
        if (bulkExtendTrialStatusFilter !== "all") {
          const statusLabels = {
            "active": "active trial",
            "expired": "expired trial",
            "ending_soon": "trial ending soon",
            "not_used": "trial not used"
          }
          filters.push(statusLabels[bulkExtendTrialStatusFilter])
        }
        const filterLabel = filters.length > 0 ? ` with ${filters.join(", ")}` : ""
        toast.error(`No users${filterLabel} found to extend trial for`)
        setBulkExtendingTrial(false)
        return
      }

      const response = await fetch("/api/admin/extend-free-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userIds,
          daysToAdd: days
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to extend free trial")
      }

      toast.success(`Free trial extended by ${days} day(s) for ${data.summary?.successful || 0} user(s)`)
      setBulkExtendTrialDialogOpen(false)
      setBulkExtendTrialDays("7")
      setBulkExtendBusinessTypeFilter("all")
      setBulkExtendTrialStatusFilter("all")

      // Refresh users list
      await refreshUsers()
    } catch (error: any) {
      console.error("Bulk extend trial error:", error)
      toast.error(error.message || "Failed to extend free trial")
    } finally {
      setBulkExtendingTrial(false)
    }
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
              onClick={() => setBulkExtendTrialDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Extend Free Trial (Bulk)
            </Button>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Free Trial</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.onFreeTrial}</div>
              <p className="text-xs text-muted-foreground">Active free trials</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscribed</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.subscribed}</div>
              <p className="text-xs text-muted-foreground">Active subscriptions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Not Used</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.notUsedTrial}</div>
              <p className="text-xs text-muted-foreground">Haven't started trial</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired Trial</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.expiredTrial}</div>
              <p className="text-xs text-muted-foreground">Trial expired</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired Subscription</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.expiredSubscription}</div>
              <p className="text-xs text-muted-foreground">Subscription expired</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Subscription</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.noSubscription}</div>
              <p className="text-xs text-muted-foreground">Never subscribed</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 space-y-4 flex items-center gap-5 justify-between">
          <div className="relative w-1/3 -mb-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Date Registered" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-[130%]">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold">Email</th>
                    <th className="text-left p-4 font-semibold">Phone</th>
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
                        <td className="p-4 text-sm text-muted-foreground">
                          {u.phone || u.phoneNumber || 'N/A'}
                        </td>
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
                              <DropdownMenuItem onClick={() => handleOpenDialog('extendTrial', u)}>
                                <Gift className="mr-2 h-4 w-4" />
                                Extend Free Trial
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
              <Label htmlFor="bulk-business-type">Business Type</Label>
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
                  <SelectItem value="all">All Business Types</SelectItem>
                  {businessTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type} Only
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subscription Status Filter */}
            <div>
              <Label htmlFor="bulk-subscription-status">Subscription Status</Label>
              <Select 
                value={subscriptionFilter} 
                onValueChange={(value: "all" | "active" | "expired" | "none") => {
                  setSubscriptionFilter(value)
                }}
              >
                <SelectTrigger id="bulk-subscription-status" className="mt-1">
                  <SelectValue placeholder="Select subscription status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscription Status</SelectItem>
                  <SelectItem value="active">Active Subscription Only</SelectItem>
                  <SelectItem value="expired">Expired Subscription Only</SelectItem>
                  <SelectItem value="none">No Subscription Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trial Status Filter */}
            <div>
              <Label htmlFor="bulk-trial-status">Trial Status</Label>
              <Select 
                value={trialFilter} 
                onValueChange={(value: "all" | "active" | "expired" | "not_used") => {
                  setTrialFilter(value)
                }}
              >
                <SelectTrigger id="bulk-trial-status" className="mt-1">
                  <SelectValue placeholder="Select trial status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trial Status</SelectItem>
                  <SelectItem value="active">Active Trial Only</SelectItem>
                  <SelectItem value="expired">Expired Trial Only</SelectItem>
                  <SelectItem value="not_used">No Trial Used Only</SelectItem>
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
                    const filtered = users.filter((u: any) => {
                      // Apply business type filter
                      if (bulkBusinessTypeFilter !== "all") {
                        const businessType = u.businessType?.toString().toLowerCase().trim()
                        if (businessType !== bulkBusinessTypeFilter.toLowerCase()) return false
                      }
                      
                      // Apply subscription filter
                      if (subscriptionFilter !== "all") {
                        const now = new Date()
                        const hasActiveSubscription = u.subscriptionEndDate && new Date(u.subscriptionEndDate) > now
                        const hasExpiredSubscription = u.subscriptionEndDate && new Date(u.subscriptionEndDate) <= now
                        
                        if (subscriptionFilter === "active" && !hasActiveSubscription) return false
                        if (subscriptionFilter === "expired" && !hasExpiredSubscription) return false
                        if (subscriptionFilter === "none" && u.subscriptionEndDate) return false
                      }
                      
                      // Apply trial filter
                      if (trialFilter !== "all") {
                        const now = new Date()
                        const hasActiveTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) > now
                        const hasExpiredTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) <= now
                        
                        if (trialFilter === "active" && !hasActiveTrial) return false
                        if (trialFilter === "expired" && !hasExpiredTrial) return false
                        if (trialFilter === "not_used" && u.freeTrialEndDate) return false
                      }
                      
                      return true
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
                const filtered = users.filter((u: any) => {
                  // Apply business type filter
                  if (bulkBusinessTypeFilter !== "all") {
                    const businessType = u.businessType?.toString().toLowerCase().trim()
                    if (businessType !== bulkBusinessTypeFilter.toLowerCase()) return false
                  }
                  
                  // Apply subscription filter
                  if (subscriptionFilter !== "all") {
                    const now = new Date()
                    const hasActiveSubscription = u.subscriptionEndDate && new Date(u.subscriptionEndDate) > now
                    const hasExpiredSubscription = u.subscriptionEndDate && new Date(u.subscriptionEndDate) <= now
                    
                    if (subscriptionFilter === "active" && !hasActiveSubscription) return false
                    if (subscriptionFilter === "expired" && !hasExpiredSubscription) return false
                    if (subscriptionFilter === "none" && u.subscriptionEndDate) return false
                  }
                  
                  // Apply trial filter
                  if (trialFilter !== "all") {
                    const now = new Date()
                    const hasActiveTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) > now
                    const hasExpiredTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) <= now
                    
                    if (trialFilter === "active" && !hasActiveTrial) return false
                    if (trialFilter === "expired" && !hasExpiredTrial) return false
                    if (trialFilter === "not_used" && u.freeTrialEndDate) return false
                  }
                  
                  return true
                })
                
                const count = filtered.filter((u: any) => u.email && u.userId).length
                
                // Build filter label
                const filters = []
                if (bulkBusinessTypeFilter !== "all") filters.push(bulkBusinessTypeFilter)
                if (subscriptionFilter !== "all") filters.push(`${subscriptionFilter} subscription`)
                if (trialFilter !== "all") filters.push(`${trialFilter} trial`)
                
                const filterLabel = filters.length > 0 
                  ? filters.join(", ") 
                  : "all users"
                
                return (
                  <p>
                    {count} {filterLabel} {count === 1 ? "has" : "have"} valid {count === 1 ? "email" : "emails"} and will receive this message.
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
                const filtered = users.filter((u: any) => {
                  // Apply business type filter
                  if (bulkBusinessTypeFilter !== "all") {
                    const businessType = u.businessType?.toString().toLowerCase().trim()
                    if (businessType !== bulkBusinessTypeFilter.toLowerCase()) return false
                  }
                  
                  // Apply subscription filter
                  if (subscriptionFilter !== "all") {
                    const now = new Date()
                    const hasActiveSubscription = u.subscriptionEndDate && new Date(u.subscriptionEndDate) > now
                    const hasExpiredSubscription = u.subscriptionEndDate && new Date(u.subscriptionEndDate) <= now
                    
                    if (subscriptionFilter === "active" && !hasActiveSubscription) return false
                    if (subscriptionFilter === "expired" && !hasExpiredSubscription) return false
                    if (subscriptionFilter === "none" && u.subscriptionEndDate) return false
                  }
                  
                  // Apply trial filter
                  if (trialFilter !== "all") {
                    const now = new Date()
                    const hasActiveTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) > now
                    const hasExpiredTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) <= now
                    
                    if (trialFilter === "active" && !hasActiveTrial) return false
                    if (trialFilter === "expired" && !hasExpiredTrial) return false
                    if (trialFilter === "not_used" && u.freeTrialEndDate) return false
                  }
                  
                  return true
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

      {/* Extend Free Trial Dialog (Individual) */}
      <Dialog open={extendTrialDialogOpen} onOpenChange={setExtendTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Free Trial</DialogTitle>
            <DialogDescription>
              Extend the free trial for {extendTrialUser ? `${extendTrialUser.firstName || ''} ${extendTrialUser.lastName || ''}`.trim() || extendTrialUser.email : 'this user'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="trialDays">Days to Add</Label>
              <Input
                id="trialDays"
                type="number"
                min="1"
                value={extendTrialDays}
                onChange={(e) => setExtendTrialDays(e.target.value)}
                placeholder="7"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the number of days to add to the free trial period
              </p>
            </div>
            {extendTrialUser?.freeTrialEndDate && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Current Trial End Date:</p>
                <p className="text-sm text-muted-foreground">{formatDate(extendTrialUser.freeTrialEndDate)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setExtendTrialDialogOpen(false)
              setExtendTrialUser(null)
              setExtendTrialDays("7")
            }}>
              Cancel
            </Button>
            <Button onClick={handleExtendTrial} disabled={extendingTrial}>
              {extendingTrial ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extending...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Extend Trial
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Free Trial Dialog (Bulk) */}
      <Dialog open={bulkExtendTrialDialogOpen} onOpenChange={setBulkExtendTrialDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Extend Free Trial (Bulk)</DialogTitle>
            <DialogDescription>
              Extend the free trial for selected users based on filters
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Business Type Filter */}
            <div>
              <Label htmlFor="bulk-extend-business-type">Business Type</Label>
              <Select 
                value={bulkExtendBusinessTypeFilter} 
                onValueChange={(value: string) => setBulkExtendBusinessTypeFilter(value)}
              >
                <SelectTrigger id="bulk-extend-business-type" className="mt-1">
                  <SelectValue placeholder="Select business type" />
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

            {/* Trial Status Filter */}
            <div>
              <Label htmlFor="bulk-extend-trial-status">Trial Status</Label>
              <Select 
                value={bulkExtendTrialStatusFilter} 
                onValueChange={(value: any) => setBulkExtendTrialStatusFilter(value)}
              >
                <SelectTrigger id="bulk-extend-trial-status" className="mt-1">
                  <SelectValue placeholder="Select trial status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trial Status</SelectItem>
                  <SelectItem value="active">Active Trial Only</SelectItem>
                  <SelectItem value="expired">Expired Trial Only</SelectItem>
                  <SelectItem value="ending_soon">Trial Ending Soon (≤3 days)</SelectItem>
                  <SelectItem value="not_used">Trial Not Used Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bulkTrialDays">Days to Add</Label>
              <Input
                id="bulkTrialDays"
                type="number"
                min="1"
                value={bulkExtendTrialDays}
                onChange={(e) => setBulkExtendTrialDays(e.target.value)}
                placeholder="7"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the number of days to add to the free trial period
              </p>
            </div>
            
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-2">Users Affected:</p>
              {(() => {
                const now = new Date()
                const eligible = users.filter((u: any) => {
                  // Apply business type filter
                  if (bulkExtendBusinessTypeFilter !== "all") {
                    const businessType = u.businessType?.toString().toLowerCase().trim()
                    if (businessType !== bulkExtendBusinessTypeFilter.toLowerCase()) return false
                  }
                  
                  // Apply trial status filter
                  if (bulkExtendTrialStatusFilter !== "all") {
                    const hasActiveTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) > now
                    const hasExpiredTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) <= now
                    const trialEndDate = u.freeTrialEndDate ? new Date(u.freeTrialEndDate) : null
                    const daysRemaining = trialEndDate && hasActiveTrial 
                      ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                      : 0
                    
                    if (bulkExtendTrialStatusFilter === "active" && !hasActiveTrial) return false
                    if (bulkExtendTrialStatusFilter === "expired" && !hasExpiredTrial) return false
                    if (bulkExtendTrialStatusFilter === "ending_soon" && (!hasActiveTrial || daysRemaining > 3)) return false
                    if (bulkExtendTrialStatusFilter === "not_used" && u.freeTrialEndDate) return false
                  }
                  
                  return true
                })
                
                const count = eligible.filter((u: any) => u.userId).length
                const filters = []
                if (bulkExtendBusinessTypeFilter !== "all") filters.push(bulkExtendBusinessTypeFilter)
                if (bulkExtendTrialStatusFilter !== "all") {
                  const statusLabels = {
                    "active": "active trial",
                    "expired": "expired trial",
                    "ending_soon": "trial ending soon (≤3 days)",
                    "not_used": "trial not used"
                  }
                  filters.push(statusLabels[bulkExtendTrialStatusFilter])
                }
                const filterLabel = filters.length > 0 ? ` (${filters.join(", ")})` : ""
                
                return (
                  <p className="text-sm text-muted-foreground">
                    {count} user(s){filterLabel} will have their trial extended by {bulkExtendTrialDays || "0"} day(s)
                  </p>
                )
              })()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBulkExtendTrialDialogOpen(false)
              setBulkExtendTrialDays("7")
              setBulkExtendBusinessTypeFilter("all")
              setBulkExtendTrialStatusFilter("all")
            }}>
              Cancel
            </Button>
            <Button onClick={handleBulkExtendTrial} disabled={bulkExtendingTrial || (() => {
              const now = new Date()
              const eligible = users.filter((u: any) => {
                if (bulkExtendBusinessTypeFilter !== "all") {
                  const businessType = u.businessType?.toString().toLowerCase().trim()
                  if (businessType !== bulkExtendBusinessTypeFilter.toLowerCase()) return false
                }
                
                if (bulkExtendTrialStatusFilter !== "all") {
                  const hasActiveTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) > now
                  const hasExpiredTrial = u.freeTrialEndDate && new Date(u.freeTrialEndDate) <= now
                  const trialEndDate = u.freeTrialEndDate ? new Date(u.freeTrialEndDate) : null
                  const daysRemaining = trialEndDate && hasActiveTrial 
                    ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : 0
                  
                  if (bulkExtendTrialStatusFilter === "active" && !hasActiveTrial) return false
                  if (bulkExtendTrialStatusFilter === "expired" && !hasExpiredTrial) return false
                  if (bulkExtendTrialStatusFilter === "ending_soon" && (!hasActiveTrial || daysRemaining > 3)) return false
                  if (bulkExtendTrialStatusFilter === "not_used" && u.freeTrialEndDate) return false
                }
                
                return true
              })
              return eligible.filter((u: any) => u.userId).length === 0
            })()}>
              {bulkExtendingTrial ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extending...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Extend Trial for All
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
