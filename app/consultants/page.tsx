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
import { 
  Loader2, 
  MessageCircle,
  User as UserIcon,
  ArrowRight,
  Search
} from "lucide-react"
import { db } from "@/firebase/firebase"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface Consultant {
  userId: string
  firstName: string
  lastName: string
  kycDocuments?: {
    selfie?: string
  }
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

export default function ConsultantsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [consultant, setConsultant] = useState<Consultant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || profileLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (!profile?.assignedConsultantId) {
      router.push('/marketplace')
      return
    }
  }, [user, profile, authLoading, profileLoading, router])

  useEffect(() => {
    if (profile?.assignedConsultantId) {
      fetchConsultant()
    }
  }, [profile?.assignedConsultantId])

  const fetchConsultant = async () => {
    if (!profile?.assignedConsultantId) return

    try {
      setLoading(true)
      
      // Find consultant profile by userId
      const consultantQuery = query(
        collection(db, 'userProfiles'),
        where('userId', '==', profile.assignedConsultantId),
        limit(1)
      )

      const consultantSnapshot = await getDocs(consultantQuery)

      if (consultantSnapshot.empty) {
        toast.error("Consultant not found")
        return
      }

      const consultantDoc = consultantSnapshot.docs[0]
      const data = consultantDoc.data()
      
      setConsultant({
        userId: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        kycDocuments: data.kycDocuments
      } as Consultant)
    } catch (error) {
      console.error("Error fetching consultant:", error)
      toast.error("Failed to load consultant")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile?.assignedConsultantId) {
    return null
  }

  if (!consultant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Consultant not found</p>
            <Button onClick={() => router.push('/marketplace')} className="mt-4">
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const profilePicture = getProfilePicture(consultant)
  const initials = getInitials(consultant.firstName, consultant.lastName)
  const consultantName = `${consultant.firstName} ${consultant.lastName}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">My Consultant</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your relationship with your tax consultant
          </p>
        </div>

        {/* Consultant Card */}
        <Card className="shadow-lg border-2 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Profile Picture */}
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-background shadow-xl ring-4 ring-primary/20">
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt={consultantName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-3xl">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-background shadow-md" />
              </div>

              {/* Consultant Info */}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">{consultantName}</h2>
                <p className="text-muted-foreground mb-4">
                  Your assigned tax consultant
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
                  <Button
                    onClick={() => router.push(`/consultants/chat`)}
                    className="w-full sm:w-auto"
                    size="lg"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Start Conversation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/marketplace/${profile.assignedConsultantId}`)}
                    className="w-full sm:w-auto"
                    size="lg"
                  >
                    View Profile
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/consultants/chat')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Messages</h3>
                  <p className="text-sm text-muted-foreground">Chat with your consultant</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/marketplace/${profile.assignedConsultantId}`)}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <UserIcon className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Profile</h3>
                  <p className="text-sm text-muted-foreground">View consultant details</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/marketplace')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <ArrowRight className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Browse More</h3>
                  <p className="text-sm text-muted-foreground">Find other consultants</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

