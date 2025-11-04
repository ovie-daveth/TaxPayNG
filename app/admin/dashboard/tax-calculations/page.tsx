"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Calculator } from "lucide-react"
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

export default function AdminTaxCalculationsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [calculations, setCalculations] = useState<any[]>([])
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
    const fetchCalculations = async () => {
      if (!user || !isAdmin) return

      try {
        setLoading(true)
        const calculationsSnapshot = await getDocs(query(
          collection(db, "taxCalculations"),
          orderBy("createdAt", "desc")
        ))
        const calculationsData = calculationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setCalculations(calculationsData)
      } catch (error) {
        console.error("Error fetching tax calculations:", error)
        toast.error("Failed to load tax calculations")
      } finally {
        setLoading(false)
      }
    }

    if (user && isAdmin) {
      fetchCalculations()
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

  const filteredCalculations = calculations.filter((c: any) => 
    c.businessType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.period?.toLowerCase().includes(searchTerm.toLowerCase())
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

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Tax Calculations Management</h1>
          <p className="text-muted-foreground">View all tax calculations</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search calculations..."
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
                    <th className="text-left p-4 font-semibold">Business Type</th>
                    <th className="text-left p-4 font-semibold">Period</th>
                    <th className="text-left p-4 font-semibold">Income</th>
                    <th className="text-left p-4 font-semibold">Total Tax</th>
                    <th className="text-left p-4 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalculations.map((c: any) => (
                    <tr key={c.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4">
                        <Badge variant="outline">{c.businessType || 'N/A'}</Badge>
                      </td>
                      <td className="p-4">{c.period || 'N/A'}</td>
                      <td className="p-4 font-semibold">
                        ₦{(c.income || 0).toLocaleString()}
                      </td>
                      <td className="p-4 font-semibold text-primary">
                        ₦{(c.result?.totalTax || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCalculations.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No tax calculations found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
