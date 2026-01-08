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
import { ArrowLeft, Search, UserPlus, Calendar, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function AdminSignupsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [signups, setSignups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "month">("all")
  const [trialFilter, setTrialFilter] = useState<"all" | "active" | "expired" | "used">("all")

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) {
        router.push('/admin/login')
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, router])

  useEffect(() => {
    const fetchSignups = async () => {
      if (!user || !isAdmin) return

      try {
        setLoading(true)
        let signupsQuery = query(
          collection(db, "userProfiles"),
          orderBy("createdAt", "desc")
        )

        // Apply time filter
        if (timeFilter !== "all") {
          const now = new Date()
          let startDate: Date

          switch (timeFilter) {
            case "today":
              startDate = new Date(now.setHours(0, 0, 0, 0))
              break
            case "week":
              startDate = new Date(now.setDate(now.getDate() - 7))
              break
            case "month":
              startDate = new Date(now.setDate(now.getDate() - 30))
              break
            default:
              startDate = new Date(0)
          }

          signupsQuery = query(
            signupsQuery,
            where("createdAt", ">=", startDate.toISOString())
          )
        }

        const signupsSnapshot = await getDocs(signupsQuery)
        const signupsData = signupsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setSignups(signupsData)
      } catch (error) {
        console.error("Error fetching signups:", error)
        toast.error("Failed to load signups")
      } finally {
        setLoading(false)
      }
    }

    if (user && isAdmin) {
      fetchSignups()
    }
  }, [user, isAdmin, timeFilter])

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
      
      return format(date, 'MMM d, yyyy HH:mm')
    } catch (error) {
      console.error("Error formatting date:", error, dateValue)
      return 'N/A'
    }
  }

  // Get trial status
  const getTrialStatus = (profile: any) => {
    if (!profile.freeTrialUsed) {
      return { status: 'not_used', label: 'Not Used', variant: 'outline' as const }
    }

    if (profile.isSubscribe && profile.subscriptionExpiryDate) {
      const subscriptionExpiry = new Date(profile.subscriptionExpiryDate)
      if (subscriptionExpiry > new Date()) {
        return { status: 'subscribed', label: 'Subscribed', variant: 'default' as const }
      }
    }

    if (profile.freeTrialEndDate) {
      const trialEnd = new Date(profile.freeTrialEndDate)
      const now = new Date()
      
      if (trialEnd > now) {
        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return { 
          status: 'active', 
          label: `Active (${daysRemaining}d left)`, 
          variant: 'default' as const,
          daysRemaining 
        }
      } else {
        return { status: 'expired', label: 'Expired', variant: 'destructive' as const }
      }
    }

    return { status: 'unknown', label: 'Unknown', variant: 'outline' as const }
  }

  // Filter signups
  const filteredSignups = signups.filter((signup: any) => {
    // Search filter
    const matchesSearch = 
      signup.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      signup.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      signup.lastName?.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    // Trial filter
    if (trialFilter !== "all") {
      const trialStatus = getTrialStatus(signup)
      switch (trialFilter) {
        case "active":
          return trialStatus.status === 'active'
        case "expired":
          return trialStatus.status === 'expired'
        case "used":
          return signup.freeTrialUsed === true
        default:
          return true
      }
    }

    return true
  })

  // Calculate statistics
  const stats = {
    total: signups.length,
    today: signups.filter((s: any) => {
      const createdAt = s.createdAt ? new Date(s.createdAt) : null
      if (!createdAt) return false
      const today = new Date()
      return createdAt.toDateString() === today.toDateString()
    }).length,
    activeTrials: signups.filter((s: any) => getTrialStatus(s).status === 'active').length,
    expiredTrials: signups.filter((s: any) => getTrialStatus(s).status === 'expired').length,
    subscribed: signups.filter((s: any) => getTrialStatus(s).status === 'subscribed').length,
  }

  if (authLoading || adminLoading || loading) {
    return <AdminTableSkeleton />
  }

  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-50">
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
              <UserPlus className="w-8 h-8" />
              Signup Users
            </h1>
            <p className="text-muted-foreground">Monitor user signups and free trial status</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Signups</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Today</CardDescription>
              <CardTitle className="text-2xl">{stats.today}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Trials</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.activeTrials}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Expired Trials</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.expiredTrials}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Subscribed</CardDescription>
              <CardTitle className="text-2xl text-blue-600">{stats.subscribed}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={timeFilter} onValueChange={(value: any) => setTimeFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={trialFilter} onValueChange={(value: any) => setTrialFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Trial Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Trials</SelectItem>
              <SelectItem value="expired">Expired Trials</SelectItem>
              <SelectItem value="used">Trial Used</SelectItem>
            </SelectContent>
          </Select>
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
                    <th className="text-left p-4 font-semibold">Signup Date</th>
                    <th className="text-left p-4 font-semibold">Trial Start</th>
                    <th className="text-left p-4 font-semibold">Trial End</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSignups.map((signup: any) => {
                    const trialStatus = getTrialStatus(signup)
                    return (
                      <tr key={signup.id} className="border-b border-border hover:bg-muted/50">
                        <td className="p-4">
                          {signup.firstName} {signup.lastName}
                        </td>
                        <td className="p-4">{signup.email}</td>
                        <td className="p-4">
                          <Badge variant="outline">{signup.businessType || 'N/A'}</Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {formatDate(signup.createdAt)}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {signup.freeTrialStartDate ? formatDate(signup.freeTrialStartDate) : 'N/A'}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {signup.freeTrialEndDate ? (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {formatDate(signup.freeTrialEndDate)}
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td className="p-4">
                          <Badge variant={trialStatus.variant}>
                            {trialStatus.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {trialStatus.status === 'expired' && <XCircle className="w-3 h-3 mr-1" />}
                            {trialStatus.status === 'subscribed' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {trialStatus.label}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredSignups.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No signups found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

