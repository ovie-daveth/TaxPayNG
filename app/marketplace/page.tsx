"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { 
  Loader2, 
  Search,
  MapPin,
  Star,
  Users,
  Award,
  CheckCircle2,
  Building2,
  User as UserIcon,
  Filter,
  X,
  Sparkles,
  DollarSign
} from "lucide-react"
import { db } from "@/firebase/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { userService } from "@/lib/services"
import { cn } from "@/lib/utils"

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
      currency?: string
      type?: 'hourly' | 'consultancy'
    }
  }
  consultantCertification?: string
  consultantKycCompleted?: boolean
  kycDocuments?: {
    selfie?: string
  }
  createdAt: any
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
]

// Helper function to get initials
const getInitials = (firstName: string, lastName: string) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}

// Helper function to get profile picture
const getProfilePicture = (consultant: Consultant): string | null => {
  // Try selfie from KYC first
  if (consultant.kycDocuments?.selfie) {
    return consultant.kycDocuments.selfie
  }
  // Could also check Firebase Auth photoURL here if needed
  return null
}

export default function MarketplacePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [stateFilter, setStateFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("")

  useEffect(() => {
    // Wait for auth and profile to finish loading
    if (authLoading || profileLoading) {
      return
    }

    // If not logged in, redirect to login
    if (!user) {
      router.push('/login')
      return
    }

    // Only redirect consultants and admins - allow freelancers, creators, and SMEs
    // Make sure profile exists before checking businessType
    if (profile) {
      if (profile.businessType === 'consultant' || profile.role === 'admin') {
        router.push('/dashboard')
        return
      }
    }
    // If profile is null but user is logged in, allow access (profile might still be loading or being created)
  }, [user, profile, authLoading, profileLoading, router])

  useEffect(() => {
    if (user && profile && profile.businessType !== 'consultant') {
      fetchConsultants()
    }
  }, [user, profile, stateFilter])

  const fetchConsultants = async () => {
    try {
      setLoading(true)
      
      // Build query
      let consultantsQuery = query(
        collection(db, "userProfiles"),
        where("businessType", "==", "consultant"),
        where("consultantKycCompleted", "==", true)
      )

      const consultantsSnapshot = await getDocs(consultantsQuery)
      
      const consultantsData = consultantsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Consultant[]

      setConsultants(consultantsData)
    } catch (error) {
      console.error("Error fetching consultants:", error)
      toast.error("Failed to load consultants")
    } finally {
      setLoading(false)
    }
  }


  const filteredConsultants = consultants.filter((consultant) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesSearch = 
        consultant.firstName?.toLowerCase().includes(search) ||
        consultant.lastName?.toLowerCase().includes(search) ||
        consultant.email?.toLowerCase().includes(search) ||
        consultant.consultantPortfolio?.bio?.toLowerCase().includes(search) ||
        consultant.consultantPortfolio?.specializations?.some(s => s.toLowerCase().includes(search)) ||
        consultant.consultantPortfolio?.location?.toLowerCase().includes(search)
      
      if (!matchesSearch) return false
    }

    // State filter
    if (stateFilter !== "all") {
      if (!consultant.consultantStates || !consultant.consultantStates.includes(stateFilter)) {
        return false
      }
    }

    // Location filter
    if (locationFilter) {
      const location = consultant.consultantPortfolio?.location?.toLowerCase() || ""
      if (!location.includes(locationFilter.toLowerCase())) {
        return false
      }
    }

    return true
  })

  if (authLoading || profileLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading consultants...</p>
        </div>
      </div>
    )
  }

  // Only block if user is not logged in, or if profile exists and user is consultant/admin
  if (!user) {
    return null
  }
  
  // If profile exists and user is consultant or admin, they should have been redirected
  // But if they're still here, show nothing (redirect is in progress)
  if (profile && (profile.businessType === 'consultant' || profile.role === 'admin')) {
    return null
  }

  const hasSelectedConsultant = profile?.assignedConsultantId

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 max-w-7xl relative z-10">
          <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Find Your Perfect Tax Consultant</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Tax Consultant
              <span className="block text-primary mt-2">Marketplace</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with professional tax consultants who can help manage your tax filings and ensure compliance
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl">
        {hasSelectedConsultant && (
          <Card className="mb-6 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 animate-in fade-in slide-in-from-top-4 duration-500">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 rounded-full bg-green-600 text-white">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      You have selected {profile.assignedConsultantName} as your tax consultant
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Your consultant can now manage your tax filings. You can change your consultant at any time.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info("Changing consultant feature coming soon")
                  }}
                  className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300"
                >
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Search & Filters */}
        <Card className="mb-6 shadow-lg border-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search by name, specialization, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-base border-2 focus:border-primary transition-all"
                />
              </div>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-12 border-2">
                  <SelectValue placeholder="Filter by state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {NIGERIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative group">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                <Input
                  placeholder="Location (city)"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full sm:w-[200px] pl-10 h-12 border-2 focus:border-primary transition-all"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <p className="text-sm font-medium text-muted-foreground">
            <span className="text-2xl font-bold text-foreground">{filteredConsultants.length}</span>{" "}
            consultant{filteredConsultants.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Consultants Grid */}
        {filteredConsultants.length === 0 ? (
          <Card className="shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <UserIcon className="w-10 h-10 text-muted-foreground opacity-50" />
              </div>
              <p className="text-xl font-semibold mb-2">No consultants found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm || stateFilter !== "all" || locationFilter
                  ? "Try adjusting your search filters"
                  : "No consultants available at the moment"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConsultants.map((consultant, index) => {
              const isAssigned = profile?.assignedConsultantId === consultant.userId
              const profilePicture = getProfilePicture(consultant)
              const initials = getInitials(consultant.firstName, consultant.lastName)
              const rate = consultant.consultantPortfolio?.rate

              return (
                <Card
                  key={consultant.id}
                  className={cn(
                    "group relative overflow-hidden border-2 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] hover:border-primary/50 cursor-pointer",
                    "animate-in fade-in slide-in-from-bottom-4",
                    isAssigned && "ring-2 ring-green-500 ring-offset-2"
                  )}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animationFillMode: "both"
                  }}
                  onClick={() => router.push(`/marketplace/${consultant.id}`)}
                >
                  {/* Gradient Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-primary/3 group-hover:to-primary/5 transition-all duration-500 pointer-events-none" />
                  
                  <CardHeader className="relative z-10 pb-4">
                    <div className="flex items-start gap-4">
                      {/* Profile Picture */}
                      <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-background shadow-lg ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-500">
                          {profilePicture ? (
                            <img
                              src={profilePicture}
                              alt={`${consultant.firstName} ${consultant.lastName}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              onError={(e) => {
                                // Fallback to initials if image fails
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const parent = target.parentElement
                                if (parent) {
                                  const fallback = parent.querySelector('.initials-fallback') as HTMLElement
                                  if (fallback) fallback.style.display = 'flex'
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className={cn(
                              "initials-fallback w-full h-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-2xl",
                              profilePicture ? "hidden" : "flex"
                            )}
                          >
                            {initials}
                          </div>
                        </div>
                        {/* Online Status Indicator */}
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-4 border-background shadow-md" />
                      </div>

                      <div className="flex-1 min-w-0 pt-2">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-xl font-bold mb-1 group-hover:text-primary transition-colors duration-300">
                              {consultant.firstName} {consultant.lastName}
                            </CardTitle>
                            {consultant.consultantPortfolio?.location && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{consultant.consultantPortfolio.location}</span>
                              </div>
                            )}
                          </div>
                          {isAssigned && (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700 shadow-md animate-pulse">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="relative z-10 space-y-4">
                    {/* Bio */}
                    {consultant.consultantPortfolio?.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {consultant.consultantPortfolio.bio}
                      </p>
                    )}

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                      {consultant.consultantPortfolio?.clientCount !== undefined && (
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Users className="w-4 h-4" />
                            <span>Clients</span>
                          </div>
                          <p className="text-2xl font-bold text-foreground">{consultant.consultantPortfolio.clientCount}</p>
                        </div>
                      )}
                      {consultant.consultantPortfolio?.successRate !== undefined && (
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>Success Rate</span>
                          </div>
                          <p className="text-2xl font-bold text-foreground">{consultant.consultantPortfolio.successRate}%</p>
                        </div>
                      )}
                    </div>

                    {/* Rate Display */}
                    {rate && (
                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <DollarSign className="w-4 h-4" />
                          <span>Rate</span>
                        </div>
                        <p className="text-lg font-bold">
                          {rate.currency || 'NGN'} {rate.amount.toLocaleString()}
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            / {rate.type === 'hourly' ? 'hr' : 'consultancy'}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Specializations */}
                    {consultant.consultantPortfolio?.specializations && consultant.consultantPortfolio.specializations.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Specializations</p>
                        <div className="flex flex-wrap gap-2">
                          {consultant.consultantPortfolio.specializations.slice(0, 3).map((spec) => (
                            <Badge key={spec} variant="secondary" className="text-xs px-2.5 py-1 hover:bg-primary hover:text-primary-foreground transition-colors">
                              {spec}
                            </Badge>
                          ))}
                          {consultant.consultantPortfolio.specializations.length > 3 && (
                            <Badge variant="outline" className="text-xs px-2.5 py-1">
                              +{consultant.consultantPortfolio.specializations.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* States */}
                    {consultant.consultantStates && consultant.consultantStates.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">States Covered</p>
                        <div className="flex flex-wrap gap-2">
                          {consultant.consultantStates.slice(0, 3).map((state) => (
                            <Badge key={state} variant="outline" className="text-xs px-2.5 py-1">
                              {state}
                            </Badge>
                          ))}
                          {consultant.consultantStates.length > 3 && (
                            <Badge variant="outline" className="text-xs px-2.5 py-1">
                              +{consultant.consultantStates.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {consultant.consultantPortfolio?.certifications && consultant.consultantPortfolio.certifications.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Certifications</p>
                        <div className="flex flex-wrap gap-2">
                          {consultant.consultantPortfolio.certifications.slice(0, 2).map((cert, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs px-2.5 py-1">
                              <Award className="w-3 h-3 mr-1.5" />
                              {cert.name}
                            </Badge>
                          ))}
                          {consultant.consultantPortfolio.certifications.length > 2 && (
                            <Badge variant="outline" className="text-xs px-2.5 py-1">
                              +{consultant.consultantPortfolio.certifications.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      className={cn(
                        "w-full h-11 text-base font-semibold transition-all duration-300",
                        "hover:scale-105 hover:shadow-lg",
                        isAssigned && "bg-green-600 hover:bg-green-700"
                      )}
                      variant={isAssigned ? "default" : "default"}
                      disabled={isAssigned}
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/marketplace/${consultant.id}`)
                      }}
                    >
                      {isAssigned ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          View Profile
                        </>
                      ) : (
                        <>
                          <UserIcon className="w-5 h-5 mr-2" />
                          View Profile
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-in-from-bottom-4 {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-in {
          animation: fade-in 0.7s ease-out;
        }

        .fade-in {
          animation: fade-in 0.7s ease-out;
        }

        .slide-in-from-bottom-4 {
          animation: slide-in-from-bottom-4 0.7s ease-out;
        }

        .bg-grid-pattern {
          background-image: 
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  )
}
