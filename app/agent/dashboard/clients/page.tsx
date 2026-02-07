"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { format } from "date-fns"
import { 
  Loader2, 
  Search,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  FileText,
  TrendingUp,
  Users
} from "lucide-react"
import { db } from "@/firebase/firebase"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { Timestamp } from "firebase/firestore"
import Link from "next/link"

interface Client {
  id: string
  userId: string
  email: string
  firstName: string
  lastName: string
  businessType?: string
  taxId?: string
  phone?: string
  assignedConsultantId?: string
  assignedConsultantName?: string
  assignedAt?: string
  createdAt: any
  updatedAt: any
}

export default function ConsultantClientsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (authLoading || profileLoading) {
      return
    }

    if (!user) {
      router.push('/login')
      return
    }

    if (!profile) {
      return
    }

    if (profile.businessType !== 'consultant') {
      router.push('/dashboard')
      return
    }

    if (profile.consultantKycCompleted !== true) {
      router.push('/consultant/kyc')
      return
    }
  }, [user, profile, authLoading, profileLoading, router])

  useEffect(() => {
    if (user && profile?.businessType === 'consultant' && profile?.consultantKycCompleted) {
      fetchClients()
    }
  }, [user, profile])

  const fetchClients = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      // Only fetch users who have assigned this consultant as their tax consultant
      try {
        const clientsSnapshot = await getDocs(query(
          collection(db, "userProfiles"),
          where("assignedConsultantId", "==", user.uid),
          orderBy("createdAt", "desc")
        ))
        
        const clientsData = clientsSnapshot.docs
          .filter(doc => {
            const data = doc.data()
            // Filter out consultants and admins (extra safety check)
            return data.businessType !== 'consultant' && data.role !== 'admin'
          })
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Client[]

        setClients(clientsData)
      } catch (queryError: any) {
        // If index doesn't exist, try without orderBy
        if (queryError.code === 'failed-precondition') {
          console.warn("Firestore index missing, fetching without orderBy")
          const clientsSnapshot = await getDocs(query(
            collection(db, "userProfiles"),
            where("assignedConsultantId", "==", user.uid)
          ))
          
          const clientsData = clientsSnapshot.docs
            .filter(doc => {
              const data = doc.data()
              return data.businessType !== 'consultant' && data.role !== 'admin'
            })
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as Client[]
          
          // Sort manually by createdAt
          clientsData.sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() || new Date(a.createdAt || 0)
            const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt || 0)
            return bDate.getTime() - aDate.getTime()
          })
          
          setClients(clientsData)
        } else {
          throw queryError
        }
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
      toast.error("Failed to load clients")
    } finally {
      setLoading(false)
    }
  }

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
      
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      return 'N/A'
    }
  }

  const filteredClients = clients.filter((client) => {
    const search = searchTerm.toLowerCase()
    return (
      client.email?.toLowerCase().includes(search) ||
      client.firstName?.toLowerCase().includes(search) ||
      client.lastName?.toLowerCase().includes(search) ||
      client.taxId?.toLowerCase().includes(search)
    )
  })

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || profile?.businessType !== 'consultant') {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All clients
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Businesses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.filter(c => c.businessType === 'sme' || c.businessType === 'creator').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              SME & Creators
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Individuals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.filter(c => c.businessType === 'freelancer').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Freelancers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              With TIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.filter(c => c.taxId).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tax ID registered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search clients by name, email, or TIN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clients Table/Cards */}
      <Card>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">Client Name</th>
                  <th className="text-left p-4 font-semibold text-sm">Email</th>
                  <th className="text-left p-4 font-semibold text-sm">Phone</th>
                  <th className="text-left p-4 font-semibold text-sm">Business Type</th>
                  <th className="text-left p-4 font-semibold text-sm">TIN</th>
                  <th className="text-left p-4 font-semibold text-sm">Joined</th>
                  <th className="text-left p-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {client.businessType === 'sme' || client.businessType === 'creator' ? (
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-sm">
                          {client.firstName} {client.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[200px]">{client.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {client.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{client.phone}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-xs">
                        {client.businessType || 'N/A'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {client.taxId ? (
                        <Badge variant="default" className="bg-green-600 text-xs">
                          {client.taxId}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Not Registered</Badge>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(client.createdAt)}
                      </div>
                    </td>
                    <td className="p-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          router.push(`/consultant/dashboard/clients/${client.userId}`)
                        }}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="md:hidden">
            <div className="divide-y divide-border">
              {filteredClients.map((client) => (
                <div key={client.id} className="p-4 hover:bg-muted/50">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {client.businessType === 'sme' || client.businessType === 'creator' ? (
                          <Building2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {client.firstName} {client.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs ml-2">
                        {client.businessType || 'N/A'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {client.phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(client.createdAt)}
                      </div>
                    </div>

                    {client.taxId && (
                      <div>
                        <Badge variant="default" className="bg-green-600 text-xs">
                          TIN: {client.taxId}
                        </Badge>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        router.push(`/consultant/dashboard/clients/${client.userId}`)
                      }}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Manage Taxes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {filteredClients.length === 0 && (
            <div className="p-6 sm:p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <Users className="w-12 h-12 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-base sm:text-lg font-medium text-foreground">
                    {searchTerm ? "No clients found matching your search" : "No clients yet"}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-md px-4">
                    {searchTerm 
                      ? "Try adjusting your search terms" 
                      : "Clients will appear here once they select you as their tax consultant from the marketplace. The marketplace feature will be available soon."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

