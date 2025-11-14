"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Receipt, BookOpen, UserCheck, BarChart3, FolderOpen, Bell, Calculator } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { toast } from "sonner"
import { db } from "@/firebase/firebase"
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore"
import { adminService } from "@/lib/services/adminService"
import { AdminDashboardSkeleton } from "@/components/ui/skeletons"
import { StatsOverview } from "@/components/admin/stats-overview"
import { DashboardCharts } from "@/components/admin/dashboard-charts"

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    totalBlogPosts: 0,
    totalWaitlist: 0,
    recentUsers: [] as any[],
    recentTransactions: [] as any[]
  })
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [allTransactions, setAllTransactions] = useState<any[]>([])
  const [allTaxCalculations, setAllTaxCalculations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Ensure admin document exists in Firestore (for security rules)
  useEffect(() => {
    const ensureAdminDocument = async () => {
      if (!user || !isAdmin) return
      
      try {
        console.log("🔍 Debug: Checking admin document for UID:", user.uid)
        console.log("🔍 Debug: User email:", user.email)
        
        // Verify admin role in userProfile (no separate admins collection)
        console.log("🔍 Debug: Checking userProfile for admin role...")
        
        // Also check userProfile for admin role
        const userProfileQuery = query(
          collection(db, "userProfiles"),
          where("userId", "==", user.uid)
        )
        const userProfileSnapshot = await getDocs(userProfileQuery)
        if (!userProfileSnapshot.empty) {
          const profileData = userProfileSnapshot.docs[0].data()
          console.log("🔍 Debug: UserProfile role:", profileData.role)
        }
        
      } catch (error) {
        console.error("❌ Debug: Error ensuring admin document:", error)
        console.error("❌ Debug: Error details:", JSON.stringify(error, null, 2))
      }
    }
    
    if (!authLoading && !adminLoading && user && isAdmin) {
      ensureAdminDocument()
    }
  }, [user, isAdmin, authLoading, adminLoading])

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        router.push('/admin/login')
        return
      }
      if (!isAdmin) {
        toast.error("Access denied. Admin privileges required.")
        router.push('/blog')
        return
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, router])

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !isAdmin) return

      try {
        setLoading(true)
        
        console.log("🔍 Debug: Starting to fetch stats...")
        console.log("🔍 Debug: Current user UID:", user.uid)

        // Ensure userProfile has admin role set
        console.log("🔍 Debug: Ensuring userProfile has admin role...")
        await adminService.setAdmin(user.email || "", user.uid)

        // Fetch user counts
        console.log("🔍 Debug: Attempting to fetch userProfiles...")
        const usersSnapshot = await getDocs(collection(db, "userProfiles"))
        console.log("🔍 Debug: Successfully fetched userProfiles, count:", usersSnapshot.size)
        const totalUsers = usersSnapshot.size

        // Fetch transaction counts
        console.log("🔍 Debug: Attempting to fetch transactions...")
        const transactionsSnapshot = await getDocs(collection(db, "transactions"))
        console.log("🔍 Debug: Successfully fetched transactions, count:", transactionsSnapshot.size)
        const totalTransactions = transactionsSnapshot.size

        // Fetch blog posts
        const blogPostsSnapshot = await getDocs(query(
          collection(db, "blogPosts"),
          orderBy("publishedAt", "desc")
        ))
        const totalBlogPosts = blogPostsSnapshot.size

        // Fetch waitlist
        const waitlistSnapshot = await getDocs(collection(db, "waitlist"))
        const totalWaitlist = waitlistSnapshot.size

        // Fetch recent users
        const recentUsersQuery = query(
          collection(db, "userProfiles"),
          orderBy("createdAt", "desc"),
          limit(5)
        )
        const recentUsersSnapshot = await getDocs(recentUsersQuery)
        const recentUsers = recentUsersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Fetch recent transactions
        const recentTransactionsQuery = query(
          collection(db, "transactions"),
          orderBy("createdAt", "desc"),
          limit(5)
        )
        const recentTransactionsSnapshot = await getDocs(recentTransactionsQuery)
        const recentTransactions = recentTransactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Fetch all users and transactions for charts
        const allUsersSnapshot = await getDocs(query(
          collection(db, "userProfiles"),
          orderBy("createdAt", "desc"),
          limit(20)
        ))
        const allUsersData = allUsersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Fetch ALL transactions (no limit) for accurate income/expense calculations
        const allTransactionsSnapshot = await getDocs(query(
          collection(db, "transactions"),
          orderBy("createdAt", "desc")
        ))
        const allTransactionsData = allTransactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Fetch tax calculations for tax categorization chart
        const taxCalculationsSnapshot = await getDocs(collection(db, "taxCalculations"))
        const allTaxCalculationsData = taxCalculationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        console.log("🔍 Debug: All stats fetched successfully!")
        
        setStats({
          totalUsers,
          totalTransactions,
          totalBlogPosts,
          totalWaitlist,
          recentUsers,
          recentTransactions
        })
        setAllUsers(allUsersData)
        setAllTransactions(allTransactionsData)
        setAllTaxCalculations(allTaxCalculationsData)
      } catch (error: any) {
        console.error("❌ Debug: Error fetching stats:", error)
        console.error("❌ Debug: Error code:", error?.code)
        console.error("❌ Debug: Error message:", error?.message)
        console.error("❌ Debug: Full error:", JSON.stringify(error, null, 2))
        
        // Check admin status when error occurs
        if (user) {
          const userProfileQuery = query(
            collection(db, "userProfiles"),
            where("userId", "==", user.uid)
          )
          const userProfileSnapshot = await getDocs(userProfileQuery)
          if (!userProfileSnapshot.empty) {
            const profileData = userProfileSnapshot.docs[0].data()
            console.error("❌ Debug: UserProfile role when error occurred:", profileData.role)
          }
        }
        
        toast.error("Failed to load dashboard stats")
      } finally {
        setLoading(false)
      }
    }

    if (user && isAdmin) {
      fetchStats()
    }
  }, [user, isAdmin])


  if (authLoading || adminLoading || loading) {
    return <AdminDashboardSkeleton />
  }

  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage all aspects of the platform</p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8">
          <StatsOverview stats={stats} />
        </div>

        {/* Charts */}
        <div className="mb-8">
          <DashboardCharts transactions={allTransactions} users={allUsers} taxCalculations={allTaxCalculations} />
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
              <CardDescription>View and manage all users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Recent Users</h4>
                  {stats.recentUsers.length > 0 ? (
                    <div className="space-y-2">
                      {stats.recentUsers.slice(0, 3).map((user: any) => (
                        <div key={user.id} className="text-sm p-2 bg-muted rounded">
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-muted-foreground text-xs">{user.email}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No users yet</p>
                  )}
                </div>
                <Link href="/admin/dashboard/users">
                  <Button className="w-full" variant="outline">
                    View All Users
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Blog Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Blog Management
              </CardTitle>
              <CardDescription>Manage blog posts and content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Posts: {stats.totalBlogPosts}</span>
                </div>
                <div className="flex gap-2">
                  <Link href="/admin/dashboard/create" className="flex-1">
                    <Button className="w-full">
                      Create New Post
                    </Button>
                  </Link>
                  <Link href="/admin/dashboard/blog" className="flex-1">
                    <Button className="w-full" variant="outline">
                      Manage Posts
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Transactions
              </CardTitle>
              <CardDescription>Monitor all user transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Recent Transactions</h4>
                  {stats.recentTransactions.length > 0 ? (
                    <div className="space-y-2">
                      {stats.recentTransactions.slice(0, 3).map((transaction: any) => (
                        <div key={transaction.id} className="text-sm p-2 bg-muted rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">{transaction.type}</span>
                            <span className="text-muted-foreground">
                              ₦{transaction.amount?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No transactions yet</p>
                  )}
                </div>
                <Link href="/admin/dashboard/transactions">
                  <Button className="w-full" variant="outline">
                    View All Transactions
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Waitlist Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Waitlist
              </CardTitle>
              <CardDescription>Manage waitlist signups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Signups: {stats.totalWaitlist}</span>
                </div>
                <Link href="/admin/dashboard/waitlist">
                  <Button className="w-full" variant="outline">
                    Manage Waitlist
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/admin/dashboard/documents">
                  <Button variant="outline" className="w-full">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Documents
                  </Button>
                </Link>
                <Link href="/admin/dashboard/reminders">
                  <Button variant="outline" className="w-full">
                    <Bell className="w-4 h-4 mr-2" />
                    Reminders
                  </Button>
                </Link>
                <Link href="/admin/dashboard/tax-calculations">
                  <Button variant="outline" className="w-full">
                    <Calculator className="w-4 h-4 mr-2" />
                    Tax Calculations
                  </Button>
                </Link>
                <Link href="/blog" target="_blank">
                  <Button variant="outline" className="w-full">
                    <BookOpen className="w-4 h-4 mr-2" />
                    View Blog
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}