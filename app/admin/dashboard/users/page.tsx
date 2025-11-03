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
import { 
  ArrowLeft, 
  Users, 
  Search, 
  Loader2, 
  Trash2, 
  Ban, 
  CheckCircle, 
  AlertTriangle, 
  Mail,
  MoreVertical 
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { toast } from "sonner"
import OtaxLogo from "@/components/OtaxLogo"
import { ThemeToggle } from "@/components/theme-toggle"
import { db } from "@/firebase/firebase"
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { format } from "date-fns"
import { Timestamp } from "firebase/firestore"

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'delete' | 'disable' | 'enable' | 'warning' | 'mail' | null
    user: any | null
  }>({
    open: false,
    type: null,
    user: null
  })
  const [processing, setProcessing] = useState(false)

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

  const filteredUsers = users.filter((u: any) => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenDialog = (type: 'delete' | 'disable' | 'enable' | 'warning' | 'mail', user: any) => {
    setActionDialog({ open: true, type, user })
  }

  const handleCloseDialog = () => {
    setActionDialog({ open: false, type: null, user: null })
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
    
    // Open email client with pre-filled recipient
    const mailtoLink = `mailto:${actionDialog.user.email}?subject=Message from OTax Admin`
    window.location.href = mailtoLink
    toast.success("Opening email client...")
    handleCloseDialog()
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
      default:
        return null
    }
  }

  const dialogContent = getDialogContent()

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
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
          <Badge variant="outline">{users.length} users</Badge>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
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
                    <th className="text-left p-4 font-semibold">Business Type</th>
                    <th className="text-left p-4 font-semibold">Role</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Joined</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u: any) => (
                    <tr key={u.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="p-4">{u.email}</td>
                      <td className="p-4">
                        <Badge variant="outline">{u.businessType || 'N/A'}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
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
                        {formatDate(u.createdAt)}
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
                  ))}
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
    </div>
  )
}
