"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
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
  FileText, 
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Search,
  ArrowRight
} from "lucide-react"
import { FilingRequest } from "@/lib/types"

export default function FilingRequestsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [requests, setRequests] = useState<FilingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (user?.uid) {
      loadFilingRequests()
    }
  }, [user?.uid])

  const loadFilingRequests = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      const response = await fetch(`/api/filing-requests?userId=${user.uid}`)
      const result = await response.json()

      if (result.success) {
        setRequests(result.data || [])
      } else {
        toast.error("Failed to load filing requests")
      }
    } catch (error) {
      console.error("Error loading filing requests:", error)
      toast.error("Failed to load filing requests")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: FilingRequest['status']) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      assigned: { variant: "default", icon: User },
      in_progress: { variant: "default", icon: Loader2 },
      completed: { variant: "default", icon: CheckCircle2 },
      cancelled: { variant: "destructive", icon: Clock },
    }
    
    const config = variants[status] || variants.pending
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 text-xs sm:text-sm">
        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    )
  }

  const filteredRequests = requests.filter(request => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      request.id.toLowerCase().includes(search) ||
      request.state.toLowerCase().includes(search) ||
      request.rrr.toLowerCase().includes(search) ||
      request.assignedAgentName?.toLowerCase().includes(search) ||
      request.status.toLowerCase().includes(search)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
          <main className="mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-muted-foreground" />
            </div>
          </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
        <main className="mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
          <div className="space-y-4 sm:space-y-6">
        
      {/* Search */}
      <Card className="p-3 sm:p-4 md:p-5 lg:p-6">
        <div className="relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <Input
            placeholder="Search by request ID, state, RRR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
          />
        </div>
      </Card>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <Card className="p-3 sm:p-4 md:p-5 lg:p-6">
          <div className="text-center py-6 sm:py-8 md:py-10 lg:py-12">
            <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-sm sm:text-base md:text-lg font-medium mb-2">
              {searchTerm ? "No matching requests found" : "No filing requests yet"}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground px-2">
              {searchTerm 
                ? "Try adjusting your search terms"
                : "When you file a tax return via an agent, your requests will appear here"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1 space-y-2 sm:space-y-3 md:space-y-4 w-full min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
                      {getStatusBadge(request.status)}
                      <code className="text-xs font-mono text-muted-foreground break-all sm:break-normal">
                        {request.id.substring(0, 12)}...
                      </code>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs sm:text-sm truncate">
                          <span className="text-muted-foreground">State: </span>
                          {request.state}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs sm:text-sm truncate">
                          <span className="text-muted-foreground">RRR: </span>
                          <code className="font-mono text-xs break-all">{request.rrr}</code>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-muted-foreground truncate">
                          {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>

                    {request.assignedAgentName && (
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs sm:text-sm truncate">
                          <span className="text-muted-foreground">Agent: </span>
                          {request.assignedAgentName}
                        </span>
                      </div>
                    )}

                    {request.notes && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Latest Note:</p>
                        <p className="text-xs sm:text-sm line-clamp-2 break-words">{request.notes}</p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => router.push(`/dashboard/filing-requests/${request.id}`)}
                    className="ml-0 sm:ml-4 w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm flex-shrink-0"
                  >
                    <span className="hidden sm:inline">View Details</span>
                    <span className="sm:hidden">View</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
          </div>
        </main>
    </div>
  )
}

