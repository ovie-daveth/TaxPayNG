"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { format } from "date-fns"
import { 
  Users, 
  Loader2, 
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Mail,
  Phone,
  MessageSquare,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MapPin
} from "lucide-react"
import { db } from "@/firebase/firebase"
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore"

interface ConsultationRequest {
  id: string
  userId: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  status: 'pending' | 'accepted' | 'rejected'
  reason?: string
  requestDate: string
  location?: string
  acceptedAt?: string
  rejectedAt?: string
  rejectionReason?: string
}

export default function ConsultationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [consultations, setConsultations] = useState<ConsultationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationRequest | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (user && profile?.businessType === 'consultant') {
      loadConsultations()
    }
  }, [user, profile])

  const loadConsultations = async () => {
    try {
      setLoading(true)
      
      // Query userProfiles where assignedConsultantId matches current user
      const consultationsQuery = query(
        collection(db, 'userProfiles'),
        where('assignedConsultantId', '==', user?.uid)
      )

      const snapshot = await getDocs(consultationsQuery)
      
      const consultationRequests: ConsultationRequest[] = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          userId: data.userId || doc.id,
          clientName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown Client',
          clientEmail: data.email || '',
          clientPhone: data.phone || data.phoneNumber,
          status: data.consultationStatus || 'pending',
          reason: data.consultationReason,
          requestDate: data.consultantAssignedAt || data.createdAt || new Date().toISOString(),
          location: data.location || data.state,
          acceptedAt: data.consultationAcceptedAt,
          rejectedAt: data.consultationRejectedAt,
          rejectionReason: data.consultationRejectionReason
        }
      })

      // Sort by request date (most recent first)
      consultationRequests.sort((a, b) => 
        new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
      )

      setConsultations(consultationRequests)
    } catch (error) {
      console.error("Error loading consultations:", error)
      toast.error("Failed to load consultation requests")
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptConsultation = async (consultation: ConsultationRequest) => {
    try {
      setActionLoading(true)
      
      const userProfileRef = doc(db, 'userProfiles', consultation.id)
      await updateDoc(userProfileRef, {
        consultationStatus: 'accepted',
        consultationAcceptedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      })

      // Create notification for client
      await addDoc(collection(db, 'notifications'), {
        userId: consultation.userId,
        type: 'consultation_accepted',
        title: 'Consultation Request Accepted',
        message: `${profile?.firstName} ${profile?.lastName} has accepted your consultation request.`,
        read: false,
        createdAt: serverTimestamp()
      })

      toast.success("Consultation request accepted")
      await loadConsultations()
      setShowDetailsModal(false)
    } catch (error) {
      console.error("Error accepting consultation:", error)
      toast.error("Failed to accept consultation request")
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectConsultation = async () => {
    if (!selectedConsultation) return
    
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }

    try {
      setActionLoading(true)
      
      const userProfileRef = doc(db, 'userProfiles', selectedConsultation.id)
      await updateDoc(userProfileRef, {
        consultationStatus: 'rejected',
        consultationRejectedAt: new Date().toISOString(),
        consultationRejectionReason: rejectionReason,
        assignedConsultantId: null, // Remove consultant assignment
        updatedAt: serverTimestamp()
      })

      // Create notification for client
      await addDoc(collection(db, 'notifications'), {
        userId: selectedConsultation.userId,
        type: 'consultation_rejected',
        title: 'Consultation Request Declined',
        message: `Your consultation request has been declined. Reason: ${rejectionReason}`,
        read: false,
        createdAt: serverTimestamp()
      })

      toast.success("Consultation request rejected")
      await loadConsultations()
      setShowRejectModal(false)
      setShowDetailsModal(false)
      setRejectionReason("")
    } catch (error) {
      console.error("Error rejecting consultation:", error)
      toast.error("Failed to reject consultation request")
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: ConsultationRequest['status']) => {
    const config = {
      pending: { 
        variant: "secondary" as const, 
        icon: Clock,
        className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      },
      accepted: { 
        variant: "default" as const, 
        icon: CheckCircle2,
        className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      },
      rejected: { 
        variant: "destructive" as const, 
        icon: XCircle,
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }
    }
    
    const statusConfig = config[status]
    const Icon = statusConfig.icon
    
    return (
      <Badge variant={statusConfig.variant} className={statusConfig.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const filteredConsultations = consultations
    .filter(consultation => {
      if (!searchTerm) return true
      const search = searchTerm.toLowerCase()
      return (
        consultation.clientName.toLowerCase().includes(search) ||
        consultation.clientEmail.toLowerCase().includes(search) ||
        consultation.clientPhone?.toLowerCase().includes(search)
      )
    })
    .filter(consultation => {
      if (statusFilter === 'all') return true
      return consultation.status === statusFilter
    })

  const pendingCount = consultations.filter(c => c.status === 'pending').length
  const acceptedCount = consultations.filter(c => c.status === 'accepted').length
  const rejectedCount = consultations.filter(c => c.status === 'rejected').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-yellow-200 dark:border-yellow-900/30 bg-gradient-to-br from-yellow-50 to-transparent dark:from-yellow-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting your response
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 dark:border-green-900/30 bg-gradient-to-br from-green-50 to-transparent dark:from-green-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Accepted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acceptedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active consultations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Declined requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Consultations List */}
      <Card>
        <CardHeader>
          <CardTitle>Consultation Requests</CardTitle>
          <CardDescription>
            {filteredConsultations.length} request{filteredConsultations.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredConsultations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No consultation requests found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConsultations.map((consultation) => (
                <Card key={consultation.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(consultation.status)}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(consultation.requestDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        
                        <h3 className="font-semibold text-lg">{consultation.clientName}</h3>
                        
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{consultation.clientEmail}</span>
                          </div>
                          {consultation.clientPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{consultation.clientPhone}</span>
                            </div>
                          )}
                          {consultation.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{consultation.location}</span>
                            </div>
                          )}
                        </div>

                        {consultation.reason && (
                          <div className="flex items-start gap-2 text-sm bg-muted/50 p-2 rounded-md">
                            <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <p className="flex-1">{consultation.reason}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 md:w-auto w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedConsultation(consultation)
                            setShowDetailsModal(true)
                          }}
                          className="w-full"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>

                        {consultation.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => handleAcceptConsultation(consultation)}
                              disabled={actionLoading}
                            >
                              <ThumbsUp className="w-4 h-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => {
                                setSelectedConsultation(consultation)
                                setShowRejectModal(true)
                              }}
                              disabled={actionLoading}
                            >
                              <ThumbsDown className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Consultation Request Details</DialogTitle>
            <DialogDescription>
              Full information about this consultation request
            </DialogDescription>
          </DialogHeader>

          {selectedConsultation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedConsultation.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Request Date</Label>
                  <p className="mt-1 text-sm">{format(new Date(selectedConsultation.requestDate), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Client Name</Label>
                <p className="mt-1 font-semibold">{selectedConsultation.clientName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="mt-1 text-sm">{selectedConsultation.clientEmail}</p>
                </div>
                {selectedConsultation.clientPhone && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                    <p className="mt-1 text-sm">{selectedConsultation.clientPhone}</p>
                  </div>
                )}
              </div>

              {selectedConsultation.location && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                  <p className="mt-1 text-sm">{selectedConsultation.location}</p>
                </div>
              )}

              {selectedConsultation.reason && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Reason for Consultation</Label>
                  <p className="mt-1 text-sm bg-muted p-3 rounded-md">{selectedConsultation.reason}</p>
                </div>
              )}

              {selectedConsultation.status === 'accepted' && selectedConsultation.acceptedAt && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Accepted At</Label>
                  <p className="mt-1 text-sm text-green-600">{format(new Date(selectedConsultation.acceptedAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              )}

              {selectedConsultation.status === 'rejected' && (
                <>
                  {selectedConsultation.rejectedAt && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Rejected At</Label>
                      <p className="mt-1 text-sm text-red-600">{format(new Date(selectedConsultation.rejectedAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  )}
                  {selectedConsultation.rejectionReason && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Rejection Reason</Label>
                      <p className="mt-1 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-red-700 dark:text-red-400">
                        {selectedConsultation.rejectionReason}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
            {selectedConsultation?.status === 'pending' && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleAcceptConsultation(selectedConsultation)}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDetailsModal(false)
                    setShowRejectModal(true)
                  }}
                  disabled={actionLoading}
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Consultation Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this consultation request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., Currently at full capacity, Outside my area of expertise, etc."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false)
                setRejectionReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConsultation}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}