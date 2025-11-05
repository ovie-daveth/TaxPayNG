"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, FolderOpen } from "lucide-react"
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

export default function AdminDocumentsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [documents, setDocuments] = useState<any[]>([])
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
    const fetchDocuments = async () => {
      if (!user || !isAdmin) return

      try {
        setLoading(true)
        const documentsSnapshot = await getDocs(query(
          collection(db, "documents"),
          orderBy("uploadedAt", "desc")
        ))
        const documentsData = documentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setDocuments(documentsData)
      } catch (error) {
        console.error("Error fetching documents:", error)
        toast.error("Failed to load documents")
      } finally {
        setLoading(false)
      }
    }

    if (user && isAdmin) {
      fetchDocuments()
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

  const filteredDocuments = documents.filter((d: any) => 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.type?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold mb-2">Document Management</h1>
          <p className="text-muted-foreground">View all uploaded documents</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
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
                    <th className="text-left p-4 font-semibold">Type</th>
                    <th className="text-left p-4 font-semibold">File Type</th>
                    <th className="text-left p-4 font-semibold">Size</th>
                    <th className="text-left p-4 font-semibold">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((d: any) => (
                    <tr key={d.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4">{d.name || d.originalName || 'N/A'}</td>
                      <td className="p-4">
                        <Badge variant="outline">{d.type || 'N/A'}</Badge>
                      </td>
                      <td className="p-4">{d.fileType || 'N/A'}</td>
                      <td className="p-4 text-sm">
                        {d.size ? `${(d.size / 1024).toFixed(2)} KB` : 'N/A'}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(d.uploadedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDocuments.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No documents found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
