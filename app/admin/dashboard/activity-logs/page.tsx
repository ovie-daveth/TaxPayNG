"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AdminTableSkeleton } from "@/components/ui/skeletons"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { toast } from "sonner"
import OtaxLogo from "@/components/OtaxLogo"
import { ThemeToggle } from "@/components/theme-toggle"
import { db } from "@/firebase/firebase"
import { collection, getDocs, query, orderBy, where, limit } from "firebase/firestore"
import { format } from "date-fns"
import { Timestamp } from "firebase/firestore"
import { ArrowLeft, Search, FileText, AlertTriangle, Shield, Clock, User, Filter } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function AdminActivityLogsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [selectedLog, setSelectedLog] = useState<any | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) {
        router.push('/admin/login')
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, router])

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user || !isAdmin) return

      try {
        setLoading(true)
        const logsQuery = query(
          collection(db, "securityLogs"),
          orderBy("timestamp", "desc"),
          limit(1000) // Limit to recent 1000 logs
        )

        const logsSnapshot = await getDocs(logsQuery)
        const logsData = logsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setLogs(logsData)
      } catch (error) {
        console.error("Error fetching activity logs:", error)
        toast.error("Failed to load activity logs")
      } finally {
        setLoading(false)
      }
    }

    if (user && isAdmin) {
      fetchLogs()
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
      
      if (!date || isNaN(date.getTime())) {
        return 'N/A'
      }
      
      return format(date, 'MMM d, yyyy HH:mm:ss')
    } catch (error) {
      console.error("Error formatting date:", error, dateValue)
      return 'N/A'
    }
  }

  // Get severity badge variant
  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'outline'
      default:
        return 'outline'
    }
  }

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trial_manipulation':
        return <AlertTriangle className="w-4 h-4" />
      case 'account_proliferation':
        return <User className="w-4 h-4" />
      case 'time_mismatch':
        return <Clock className="w-4 h-4" />
      case 'suspicious_access':
        return <Shield className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  // Filter logs
  const filteredLogs = logs.filter((log: any) => {
    // Search filter
    const matchesSearch = 
      log.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.type?.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    // Type filter
    if (typeFilter !== "all" && log.type !== typeFilter) {
      return false
    }

    // Severity filter
    if (severityFilter !== "all" && log.severity !== severityFilter) {
      return false
    }

    return true
  })

  // Calculate statistics
  const stats = {
    total: logs.length,
    critical: logs.filter((l: any) => l.severity === 'critical').length,
    high: logs.filter((l: any) => l.severity === 'high').length,
    trialManipulation: logs.filter((l: any) => l.type === 'trial_manipulation').length,
    accountProliferation: logs.filter((l: any) => l.type === 'account_proliferation').length,
    timeMismatch: logs.filter((l: any) => l.type === 'time_mismatch').length,
  }

  const handleViewDetails = (log: any) => {
    setSelectedLog(log)
    setDialogOpen(true)
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
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Shield className="w-8 h-8" />
              User Activity Logs
            </h1>
            <p className="text-muted-foreground">Monitor security events and user activities</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Logs</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Critical</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.critical}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>High Severity</CardDescription>
              <CardTitle className="text-2xl text-orange-600">{stats.high}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Trial Manipulation</CardDescription>
              <CardTitle className="text-2xl">{stats.trialManipulation}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Account Proliferation</CardDescription>
              <CardTitle className="text-2xl">{stats.accountProliferation}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Time Mismatch</CardDescription>
              <CardTitle className="text-2xl">{stats.timeMismatch}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="trial_manipulation">Trial Manipulation</SelectItem>
              <SelectItem value="account_proliferation">Account Proliferation</SelectItem>
              <SelectItem value="time_mismatch">Time Mismatch</SelectItem>
              <SelectItem value="suspicious_access">Suspicious Access</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-semibold">Type</th>
                    <th className="text-left p-4 font-semibold">Severity</th>
                    <th className="text-left p-4 font-semibold">User ID</th>
                    <th className="text-left p-4 font-semibold">Description</th>
                    <th className="text-left p-4 font-semibold">Timestamp</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log: any) => (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(log.type)}
                          <span className="capitalize">{log.type?.replace('_', ' ') || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={getSeverityVariant(log.severity)}>
                          {log.severity || 'N/A'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.userId ? log.userId.substring(0, 8) + '...' : 'N/A'}
                        </code>
                      </td>
                      <td className="p-4 text-sm">
                        <div className="max-w-md truncate">
                          {log.description || 'No description'}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(log)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLogs.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No logs found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>
              Detailed information about this security event
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Type</label>
                <p className="text-sm text-muted-foreground capitalize">
                  {selectedLog.type?.replace('_', ' ') || 'Unknown'}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold">Severity</label>
                <div className="mt-1">
                  <Badge variant={getSeverityVariant(selectedLog.severity)}>
                    {selectedLog.severity || 'N/A'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold">User ID</label>
                <p className="text-sm text-muted-foreground font-mono">
                  {selectedLog.userId || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold">Description</label>
                <p className="text-sm text-muted-foreground">
                  {selectedLog.description || 'No description'}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold">Timestamp</label>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedLog.timestamp)}
                </p>
              </div>
              {selectedLog.metadata && (
                <div>
                  <label className="text-sm font-semibold">Metadata</label>
                  <pre className="text-xs bg-muted p-3 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

