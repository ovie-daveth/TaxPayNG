"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { 
  Loader2, 
  ArrowLeft,
  MapPin,
  Star,
  Users,
  Award,
  CheckCircle2,
  User as UserIcon,
  Clock,
  DollarSign,
  MessageCircle,
  Briefcase,
  GraduationCap,
  Trophy
} from "lucide-react"
import { db } from "@/firebase/firebase"
import { doc, getDoc } from "firebase/firestore"
import { userService } from "@/lib/services"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface Consultant {
  id: string
  userId: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  consultantStates?: string[]
  consultantPortfolio?: {
    bio?: string
    experience?: string
    specializations?: string[]
    location?: string
    languages?: string[]
    certifications?: Array<{
      name: string
      issuer: string
      year?: number
      certificateUrl?: string
    }>
    achievements?: Array<{
      title: string
      description?: string
      year?: number
    }>
    clientCount?: number
    successRate?: number
    portfolioImages?: string[]
    rate?: {
      amount: number
      type: 'hourly' | 'per_consultancy'
      currency?: string
    }
  }
  consultantCertification?: string
  consultantKycCompleted?: boolean
  kycDocuments?: {
    selfie?: string
  }
  createdAt: any
}

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}

const getProfilePicture = (consultant: Consultant): string | null => {
  if (consultant.kycDocuments?.selfie) {
    return consultant.kycDocuments.selfie
  }
  return null
}

export default function ConsultantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const consultantId = params?.consultantId as string
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [loading, setLoading] = useState(true)
  const [assigningConsultant, setAssigningConsultant] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    if (authLoading || profileLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (profile && (profile.businessType === 'consultant' || profile.role === 'admin')) {
      router.push('/dashboard')
      return
    }
  }, [user, profile, authLoading, profileLoading, router])

  useEffect(() => {
    if (consultantId) {
      fetchConsultant()
    }
  }, [consultantId])

  const fetchConsultant = async () => {
    try {
      setLoading(true)
      const consultantDoc = await getDoc(doc(db, "userProfiles", consultantId))
      
      if (!consultantDoc.exists()) {
        toast.error("Consultant not found")
        router.push('/marketplace')
        return
      }

      const data = consultantDoc.data()
      if (data.businessType !== 'consultant' || !data.consultantKycCompleted) {
        toast.error("Consultant not available")
        router.push('/marketplace')
        return
      }

      setConsultant({
        id: consultantDoc.id,
        ...data
      } as Consultant)
    } catch (error) {
      console.error("Error fetching consultant:", error)
      toast.error("Failed to load consultant")
      router.push('/marketplace')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectConsultant = async () => {
    if (!user?.uid || !consultant) {
      toast.error("Please log in to select a consultant")
      return
    }

    setAssigningConsultant(true)

    try {
      const consultantName = `${consultant.firstName} ${consultant.lastName}`
      
      await userService.upsertProfile(user.uid, {
        assignedConsultantId: consultant.userId,
        assignedConsultantName: consultantName,
        assignedAt: new Date().toISOString()
      })

      // Create a conversation/chat between user and consultant
      // This will be handled by the messaging system
      
      setShowSuccessModal(true)
      await refetchProfile()
    } catch (error) {
      console.error("Error assigning consultant:", error)
      toast.error("Failed to select consultant. Please try again.")
    } finally {
      setAssigningConsultant(false)
    }
  }

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!consultant) {
    return null
  }

  const isAssigned = profile?.assignedConsultantId === consultant.userId
  const profilePicture = getProfilePicture(consultant)
  const initials = getInitials(consultant.firstName, consultant.lastName)
  const rate = consultant.consultantPortfolio?.rate

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-5xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/marketplace')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Button>

        {/* Profile Header */}
        <Card className="mb-6 shadow-lg border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Profile Picture */}
              <div className="relative flex-shrink-0">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-xl ring-4 ring-primary/20">
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt={`${consultant.firstName} ${consultant.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-4xl">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-background shadow-md" />
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                      {consultant.firstName} {consultant.lastName}
                    </h1>
                    {consultant.consultantPortfolio?.location && (
                      <div className="flex items-center gap-2 text-muted-foreground mb-4">
                        <MapPin className="w-5 h-5" />
                        <span className="text-lg">{consultant.consultantPortfolio.location}</span>
                      </div>
                    )}
                  </div>
                  {isAssigned && (
                    <Badge variant="default" className="bg-green-600 text-lg px-4 py-2">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Your Consultant
                    </Badge>
                  )}
                </div>

                {/* Rate */}
                {rate && (
                  <div className="flex items-center gap-2 mb-4 p-4 bg-muted/50 rounded-lg">
                    <DollarSign className="w-6 h-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Consultation Rate</p>
                      <p className="text-2xl font-bold">
                        {rate.currency || 'NGN'} {rate.amount.toLocaleString()}
                        <span className="text-base font-normal text-muted-foreground ml-2">
                          / {rate.type === 'hourly' ? 'hour' : 'consultancy'}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {consultant.consultantPortfolio?.clientCount !== undefined && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Users className="w-4 h-4" />
                        <span>Clients</span>
                      </div>
                      <p className="text-2xl font-bold">{consultant.consultantPortfolio.clientCount}</p>
                    </div>
                  )}
                  {consultant.consultantPortfolio?.successRate !== undefined && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>Success Rate</span>
                      </div>
                      <p className="text-2xl font-bold">{consultant.consultantPortfolio.successRate}%</p>
                    </div>
                  )}
                  {consultant.consultantPortfolio?.experience && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Briefcase className="w-4 h-4" />
                        <span>Experience</span>
                      </div>
                      <p className="text-lg font-semibold">{consultant.consultantPortfolio.experience}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        {consultant.consultantPortfolio?.bio && (
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                About
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed text-muted-foreground whitespace-pre-line">
                {consultant.consultantPortfolio.bio}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Specializations */}
            {consultant.consultantPortfolio?.specializations && consultant.consultantPortfolio.specializations.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Specializations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {consultant.consultantPortfolio.specializations.map((spec) => (
                      <Badge key={spec} variant="secondary" className="text-sm px-3 py-1.5">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* States Covered */}
            {consultant.consultantStates && consultant.consultantStates.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    States Covered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {consultant.consultantStates.map((state) => (
                      <Badge key={state} variant="outline" className="text-sm px-3 py-1.5">
                        {state}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {consultant.consultantPortfolio?.certifications && consultant.consultantPortfolio.certifications.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {consultant.consultantPortfolio.certifications.map((cert, idx) => (
                      <div key={idx} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-lg">{cert.name}</p>
                            <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                            {cert.year && (
                              <p className="text-xs text-muted-foreground mt-1">{cert.year}</p>
                            )}
                          </div>
                          <Award className="w-6 h-6 text-primary flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Achievements */}
            {consultant.consultantPortfolio?.achievements && consultant.consultantPortfolio.achievements.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {consultant.consultantPortfolio.achievements.map((ach, idx) => (
                      <div key={idx} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <p className="font-semibold text-lg">{ach.title}</p>
                        {ach.description && (
                          <p className="text-sm text-muted-foreground mt-1">{ach.description}</p>
                        )}
                        {ach.year && (
                          <p className="text-xs text-muted-foreground mt-2">{ach.year}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Languages */}
            {consultant.consultantPortfolio?.languages && consultant.consultantPortfolio.languages.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Languages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {consultant.consultantPortfolio.languages.map((lang) => (
                      <Badge key={lang} variant="outline" className="text-sm px-3 py-1.5">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Action Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6 shadow-xl border-2">
              <CardHeader>
                <CardTitle>Ready to Get Started?</CardTitle>
                <CardDescription>
                  Select this consultant to begin managing your tax filings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {rate && (
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Consultation Rate</p>
                    <p className="text-2xl font-bold">
                      {rate.currency || 'NGN'} {rate.amount.toLocaleString()}
                      <span className="text-base font-normal text-muted-foreground ml-1">
                        / {rate.type === 'hourly' ? 'hour' : 'consultancy'}
                      </span>
                    </p>
                  </div>
                )}

                <Button
                  className="w-full h-12 text-base font-semibold"
                  variant={isAssigned ? "outline" : "default"}
                  disabled={isAssigned || assigningConsultant}
                  onClick={handleSelectConsultant}
                >
                  {assigningConsultant ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Selecting...
                    </>
                  ) : isAssigned ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Already Selected
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Select Consultant
                    </>
                  )}
                </Button>

                {isAssigned && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => router.push('/consultants')}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message Consultant
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-center text-2xl">Consultant Selected!</DialogTitle>
            <DialogDescription className="text-center text-base">
              {consultant.firstName} {consultant.lastName} has been notified of your consultation request.
              You can now start conversing with your consultant.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessModal(false)
                router.push('/marketplace')
              }}
              className="w-full sm:w-auto"
            >
              Back to Marketplace
            </Button>
            <Button
              onClick={() => {
                setShowSuccessModal(false)
                router.push('/consultants')
              }}
              className="w-full sm:w-auto"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message Consultant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

