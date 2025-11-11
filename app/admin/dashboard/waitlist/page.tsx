"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search } from "lucide-react"
import { AdminTableSkeleton } from "@/components/ui/skeletons"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { toast } from "sonner"
import OtaxLogo from "@/components/OtaxLogo"
import { ThemeToggle } from "@/components/theme-toggle"
import { db } from "@/firebase/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { format } from "date-fns"
import { Timestamp } from "firebase/firestore"

export default function AdminWaitlistPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [waitlist, setWaitlist] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

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

  const filteredWaitlist = waitlist.filter((w: any) => 
    w.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <Badge variant="outline">{waitlist.length} signups</Badge>
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
                  </tr>
                </thead>
                <tbody>
                  {filteredWaitlist.map((w: any) => (
                    <tr key={w.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4">{w.name}</td>
                      <td className="p-4">{w.email}</td>
                      <td className="p-4">{w.phone || 'N/A'}</td>
                      <td className="p-4">
                        <Badge variant="outline">{formatUserType(w.userType)}</Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground max-w-[250px]">
                        {w.platformExpectations?.trim() ? w.platformExpectations : '—'}
                      </td>
                      <td className="p-4">
                        <Badge variant={w.status === 'notified' ? 'default' : 'secondary'}>
                          {w.status || 'pending'}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(w.createdAt)}
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
    </div>
  )
}
