"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { SettingsSkeleton } from "@/components/ui/skeletons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { userService } from "@/lib/services"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { User, Building2, CreditCard, Bell, Shield, Upload, X, CheckCircle2, Loader2, ExternalLink } from "lucide-react"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { subscriptionService } from "@/lib/services/subscriptionService"
import { getAuth } from "firebase/auth"
import { auth } from "@/firebase/firebase"
import { ChangePlanModal } from "@/components/subscription/change-plan-modal"
import { SubscriptionType } from "@/lib/types"

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  const { isSubscribed, subscriptionType } = useSubscription()
  const [isSaving, setIsSaving] = useState(false)
  const [processingSubscription, setProcessingSubscription] = useState<string | null>(null)
  const [showChangePlanModal, setShowChangePlanModal] = useState(false)
  const kycSectionRef = useRef<HTMLDivElement>(null)
  const [kycDocuments, setKycDocuments] = useState({
    id: '',
    passport: '',
    driverLicense: ''
  })
  const [uploadingKYC, setUploadingKYC] = useState({
    id: false,
    passport: false,
    driverLicense: false
  })
  const [subscriptionData, setSubscriptionData] = useState({
    isSubscribe: false,
    subscriptionType: null as string | null,
  })
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    taxId: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'Nigeria',
      postalCode: ''
    }
  })

  // Loading state: show skeleton while auth or profile is loading
  const isLoading = authLoading || profileLoading

  useEffect(() => {
    if (profileLoading || !profile) {
      return
    }

    setSubscriptionData({
      isSubscribe: profile.isSubscribe ?? false,
      subscriptionType: profile.subscriptionType || null,
    })
  }, [profile, profileLoading])

  // Handle subscription payment success/error from URL params
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const plan = searchParams.get('plan')
    const message = searchParams.get('message')

    if (success === 'true' && plan) {
      toast.success(`Successfully subscribed to ${plan} plan!`)
      refetchProfile()
      // Clean URL
      router.replace('/dashboard/settings?tab=subscription', { scroll: false })
    }

    if (error) {
      toast.error(message || 'Subscription payment failed. Please try again.')
      // Clean URL
      router.replace('/dashboard/settings?tab=subscription', { scroll: false })
    }
  }, [searchParams, router, refetchProfile])

  const handleSubscribe = async (planType: SubscriptionType) => {
    if (!user?.uid) {
      toast.error("User not authenticated")
      return
    }

    if (!planType) {
      toast.error("Please select a valid plan")
      return
    }

    setProcessingSubscription(planType)
    try {
      // Get auth token
      const currentUser = auth.currentUser
      if (!currentUser) {
        toast.error("Please log in to subscribe")
        return
      }

      const token = await currentUser.getIdToken()

      // Initialize subscription payment
      const response = await fetch("/api/subscription/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subscriptionType: planType
        })
      })

      const data = await response.json()

      if (!data.success) {
        toast.error(data.error || "Failed to initialize payment")
        return
      }

      // Redirect to Paystack payment page
      if (data.data?.authorizationUrl) {
        window.location.href = data.data.authorizationUrl
      } else {
        toast.error("Payment initialization failed")
      }
    } catch (error) {
      console.error("Error subscribing:", error)
      toast.error("An error occurred. Please try again.")
    } finally {
      setProcessingSubscription(null)
    }
  }

  useEffect(() => {
    if (profileLoading || !profile) {
      return
    }
    
    // Parse firstName and lastName - explicitly check for truthy values
    let firstName = (profile.firstName && String(profile.firstName).trim()) || ''
    let lastName = (profile.lastName && String(profile.lastName).trim()) || ''
    
    // If firstName/lastName don't exist but user has displayName, try to extract from displayName
    if ((!firstName || !lastName) && user?.displayName) {
      const nameParts = String(user.displayName).trim().split(/\s+/)
      if (!firstName && nameParts[0]) firstName = nameParts[0]
      if (!lastName && nameParts.length > 1) lastName = nameParts.slice(1).join(' ')
    }
    
    setProfileData({
      firstName,
      lastName,
      phone: profile.phone || '',
      taxId: profile.taxId || '',
      address: {
        street: profile.address?.street || '',
        city: profile.address?.city || '',
        state: profile.address?.state || '',
        country: profile.address?.country || 'Nigeria',
        postalCode: profile.address?.postalCode || ''
      }
    })

    // Load KYC documents from profile
    setKycDocuments({
      id: profile.kycDocuments?.id || '',
      passport: profile.kycDocuments?.passport || '',
      driverLicense: profile.kycDocuments?.driverLicense || ''
    })
  }, [profile, profileLoading, user?.uid, user?.displayName])

  // Handle URL params to scroll to KYC section
  useEffect(() => {
    const tab = searchParams.get('tab')
    const section = searchParams.get('section')
    
    if (tab === 'profile' && section === 'kyc' && kycSectionRef.current) {
      // Small delay to ensure the tab is rendered
      setTimeout(() => {
        kycSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <DashboardNav />
        <main className="flex-1 overflow-hidden">
          <div className="container mx-auto px-6 py-8 max-w-7xl h-full overflow-y-auto hide-scrollbar">
            <SettingsSkeleton />
          </div>
        </main>
      </div>
    )
  }

  return (
    <>
      <div className="h-screen flex flex-col overflow-hidden">
        <main className="flex-1 overflow-hidden">
          <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-7xl h-full overflow-y-auto hide-scrollbar">
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Manage your account settings and preferences
            </p>
          </div>

          <Tabs defaultValue={searchParams.get('tab') || 'profile'} className="w-full">
            <TabsList className={`grid w-full mb-4 sm:mb-6 ${profile?.businessType === 'freelancer' ? 'grid-cols-4' : 'grid-cols-5'} gap-1 sm:gap-2`}>
              <TabsTrigger value="profile" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              {profile?.businessType !== 'freelancer' && (
                <TabsTrigger value="business" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Business</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="subscription" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Subscription</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>

            <div className="space-y-6">
              {/* Profile Tab */}
              <TabsContent value="profile" className="mt-0">
                <Card className="p-4 sm:p-6 md:p-8">
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">Profile Information</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Update your personal information and contact details
                    </p>
                  </div>
          <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName" 
                          value={profileData.firstName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                        />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                        />
                  </div>
                </div>
                    <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={profile?.email || ""} disabled />
                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                        <Input 
                          id="phone" 
                          value={profileData.phone}
                          onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        />
                  </div>
                </div>
                    <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tin">Tax Identification Number</Label>
                        <Input 
                          id="tin"
                          value={profileData.taxId}
                          onChange={(e) => setProfileData(prev => ({ ...prev, taxId: e.target.value }))}
                        />
                  </div>
                </div>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Address</h3>
                      <div className="space-y-2">
                        <Label htmlFor="street">Street Address</Label>
                        <Input 
                          id="street"
                          value={profileData.address.street}
                          onChange={(e) => setProfileData(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, street: e.target.value }
                          }))}
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input 
                            id="city"
                            value={profileData.address.city}
                            onChange={(e) => setProfileData(prev => ({ 
                              ...prev, 
                              address: { ...prev.address, city: e.target.value }
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input 
                            id="state"
                            value={profileData.address.state}
                            onChange={(e) => setProfileData(prev => ({ 
                              ...prev, 
                              address: { ...prev.address, state: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Input 
                            id="country"
                            value={profileData.address.country}
                            onChange={(e) => setProfileData(prev => ({ 
                              ...prev, 
                              address: { ...prev.address, country: e.target.value }
                            }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="postalCode">Postal Code</Label>
                          <Input 
                            id="postalCode"
                            value={profileData.address.postalCode}
                            onChange={(e) => setProfileData(prev => ({ 
                              ...prev, 
                              address: { ...prev.address, postalCode: e.target.value }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div ref={kycSectionRef} className="space-y-4" id="kyc-section">
                      <div>
                        <h3 className="text-lg font-semibold">KYC Documents</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Upload your identity documents for verification (ID, Passport, or Driver's License)
                        </p>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        {/* National ID */}
                        <div className="space-y-2">
                          <Label>National ID / Voter's Card</Label>
                          <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[120px]">
                            {kycDocuments.id ? (
                              <div className="flex flex-col items-center gap-2 w-full">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                                <p className="text-sm text-muted-foreground text-center">Document uploaded</p>
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(kycDocuments.id, '_blank')}
                                  >
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      if (!user?.uid) return
                                      setUploadingKYC(prev => ({ ...prev, id: true }))
                                      try {
                                        await userService.upsertProfile(user.uid, {
                                          kycDocuments: { ...kycDocuments, id: '' }
                                        })
                                        setKycDocuments(prev => ({ ...prev, id: '' }))
                                        toast.success("Document removed")
                                        await refetchProfile()
                                      } catch (error) {
                                        toast.error("Failed to remove document")
                                      } finally {
                                        setUploadingKYC(prev => ({ ...prev, id: false }))
                                      }
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center gap-2 w-full">
                                <Upload className="w-6 h-6 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Click to upload</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file || !user?.uid) return
                                    setUploadingKYC(prev => ({ ...prev, id: true }))
                                    try {
                                      const result = await uploadToImageKit(file, 'kyc')
                                      await userService.upsertProfile(user.uid, {
                                        kycDocuments: { ...kycDocuments, id: result.url }
                                      })
                                      setKycDocuments(prev => ({ ...prev, id: result.url }))
                                      toast.success("ID document uploaded successfully")
                                      await refetchProfile()
                                    } catch (error) {
                                      toast.error("Failed to upload document")
                                    } finally {
                                      setUploadingKYC(prev => ({ ...prev, id: false }))
                                    }
                                  }}
                                  disabled={uploadingKYC.id}
                                />
                                {uploadingKYC.id && <span className="text-xs text-muted-foreground">Uploading...</span>}
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Passport */}
                        <div className="space-y-2">
                          <Label>Passport</Label>
                          <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[120px]">
                            {kycDocuments.passport ? (
                              <div className="flex flex-col items-center gap-2 w-full">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                                <p className="text-sm text-muted-foreground text-center">Document uploaded</p>
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(kycDocuments.passport, '_blank')}
                                  >
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      if (!user?.uid) return
                                      setUploadingKYC(prev => ({ ...prev, passport: true }))
                                      try {
                                        await userService.upsertProfile(user.uid, {
                                          kycDocuments: { ...kycDocuments, passport: '' }
                                        })
                                        setKycDocuments(prev => ({ ...prev, passport: '' }))
                                        toast.success("Document removed")
                                        await refetchProfile()
                                      } catch (error) {
                                        toast.error("Failed to remove document")
                                      } finally {
                                        setUploadingKYC(prev => ({ ...prev, passport: false }))
                                      }
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center gap-2 w-full">
                                <Upload className="w-6 h-6 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Click to upload</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file || !user?.uid) return
                                    setUploadingKYC(prev => ({ ...prev, passport: true }))
                                    try {
                                      const result = await uploadToImageKit(file, 'kyc')
                                      await userService.upsertProfile(user.uid, {
                                        kycDocuments: { ...kycDocuments, passport: result.url }
                                      })
                                      setKycDocuments(prev => ({ ...prev, passport: result.url }))
                                      toast.success("Passport uploaded successfully")
                                      await refetchProfile()
                                    } catch (error) {
                                      toast.error("Failed to upload document")
                                    } finally {
                                      setUploadingKYC(prev => ({ ...prev, passport: false }))
                                    }
                                  }}
                                  disabled={uploadingKYC.passport}
                                />
                                {uploadingKYC.passport && <span className="text-xs text-muted-foreground">Uploading...</span>}
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Driver's License */}
                        <div className="space-y-2">
                          <Label>Driver's License</Label>
                          <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[120px]">
                            {kycDocuments.driverLicense ? (
                              <div className="flex flex-col items-center gap-2 w-full">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                                <p className="text-sm text-muted-foreground text-center">Document uploaded</p>
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(kycDocuments.driverLicense, '_blank')}
                                  >
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      if (!user?.uid) return
                                      setUploadingKYC(prev => ({ ...prev, driverLicense: true }))
                                      try {
                                        await userService.upsertProfile(user.uid, {
                                          kycDocuments: { ...kycDocuments, driverLicense: '' }
                                        })
                                        setKycDocuments(prev => ({ ...prev, driverLicense: '' }))
                                        toast.success("Document removed")
                                        await refetchProfile()
                                      } catch (error) {
                                        toast.error("Failed to remove document")
                                      } finally {
                                        setUploadingKYC(prev => ({ ...prev, driverLicense: false }))
                                      }
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center gap-2 w-full">
                                <Upload className="w-6 h-6 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Click to upload</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file || !user?.uid) return
                                    setUploadingKYC(prev => ({ ...prev, driverLicense: true }))
                                    try {
                                      const result = await uploadToImageKit(file, 'kyc')
                                      await userService.upsertProfile(user.uid, {
                                        kycDocuments: { ...kycDocuments, driverLicense: result.url }
                                      })
                                      setKycDocuments(prev => ({ ...prev, driverLicense: result.url }))
                                      toast.success("Driver's License uploaded successfully")
                                      await refetchProfile()
                                    } catch (error) {
                                      toast.error("Failed to upload document")
                                    } finally {
                                      setUploadingKYC(prev => ({ ...prev, driverLicense: false }))
                                    }
                                  }}
                                  disabled={uploadingKYC.driverLicense}
                                />
                                {uploadingKYC.driverLicense && <span className="text-xs text-muted-foreground">Uploading...</span>}
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        size="lg"
                        onClick={async () => {
                          if (!user?.uid) {
                            toast.error("User not authenticated")
                            return
                          }
                          setIsSaving(true)
                          try {
                            const result = await userService.upsertProfile(user.uid, {
                              firstName: profileData.firstName,
                              lastName: profileData.lastName,
                              phone: profileData.phone,
                              taxId: profileData.taxId || undefined,
                              address: {
                                street: profileData.address.street,
                                city: profileData.address.city,
                                state: profileData.address.state,
                                country: profileData.address.country,
                                postalCode: profileData.address.postalCode
                              }
                            })
                            if (result.success) {
                              toast.success("Profile updated successfully")
                              await refetchProfile()
                            } else {
                              toast.error(result.error || "Failed to update profile")
                            }
                          } catch (error) {
                            toast.error("Failed to update profile")
                            console.error(error)
                          } finally {
                            setIsSaving(false)
                          }
                        }}
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
              </div>
            </Card>
              </TabsContent>

              {/* Business Tab - Only show if not freelancer */}
              {profile?.businessType !== 'freelancer' && (
                <TabsContent value="business" className="mt-0">
                  <Card className="p-4 sm:p-6 md:p-8">
                    <div className="mb-4 sm:mb-6">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">Business Information</h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Manage your business details and type
                      </p>
                    </div>
                    <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                        <Input id="business-name" placeholder="Enter your business name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-type">Business Type</Label>
                        <Select defaultValue={profile?.businessType || "freelancer"}>
                    <SelectTrigger id="business-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freelancer">Freelancer / Self-Employed</SelectItem>
                  <SelectItem value="creator">Creator / Influencer</SelectItem>
                      <SelectItem value="sme">Small & Medium Enterprise</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-address">Business Address</Label>
                        <Input id="business-address" placeholder="Enter your business address" />
                      </div>
                      <div className="flex justify-end">
                        <Button size="lg">Save Changes</Button>
                </div>
              </div>
            </Card>
                </TabsContent>
              )}

              {/* Subscription Tab */}
              <TabsContent value="subscription" className="mt-0">
                <Card className="p-4 sm:p-6 md:p-8">
                  <div className="mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">Subscription & Limits</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Manage your subscription plan and view usage limits
                        </p>
                      </div>
                      <Badge variant={isSubscribed ? "default" : "secondary"} className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 w-fit">
                        {isSubscribed ? `Subscribed - ${subscriptionType}` : "Not Subscribed"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {!isSubscribed ? (
                      <div className="space-y-3 sm:space-y-4">
                        <div className="p-4 sm:p-5 md:p-6 border rounded-lg bg-muted/50">
                          <h3 className="text-base sm:text-lg font-semibold mb-2">Choose a Subscription Plan</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                            Select a plan to unlock all features and start managing your taxes efficiently.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {(() => {
                              // Get plans based on business type
                              const availablePlans = profile?.businessType === 'sme' 
                                ? (['Small Business', 'Big Business'] as const)
                                : (['PRO', 'GOLD', 'PLATINUM'] as const)
                              
                              return availablePlans.map((planType) => {
                                const plan = subscriptionService.getPlan(planType)
                                if (!plan) return null
                                return (
                                  <Card key={planType} className="p-3 sm:p-4">
                                    <div className="space-y-2">
                                      <h4 className="text-sm sm:text-base font-semibold">{plan.name}</h4>
                                      <p className="text-xl sm:text-2xl font-bold">{plan.priceDisplay}</p>
                                      <p className="text-xs text-muted-foreground">per month</p>
                                      <Button
                                        className="w-full mt-3 sm:mt-4 text-xs sm:text-sm h-9 sm:h-10"
                                        onClick={() => handleSubscribe(planType)}
                                        disabled={processingSubscription === planType}
                                      >
                                        {processingSubscription === planType ? (
                                          <>
                                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 animate-spin" />
                                            Processing...
                                          </>
                                        ) : (
                                          "Subscribe"
                                        )}
                                      </Button>
                                    </div>
                                  </Card>
                                )
                              })
                            })()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        <div className="p-4 sm:p-5 md:p-6 border rounded-lg bg-muted/50">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <div>
                              <h3 className="text-base sm:text-lg font-semibold">Current Plan</h3>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {subscriptionType} - {subscriptionService.getPlan(subscriptionType)?.priceDisplay}/month
                              </p>
                            </div>
                            <Badge variant="default" className="w-fit">Active</Badge>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setShowChangePlanModal(true)}
                            className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10"
                          >
                            Change Plan
                          </Button>
                        </div>
                      </div>
                    )}

                    {profile && (
                      <>
                        <Separator />
                        
                        {/* Transaction Count */}
                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <Label className="text-sm sm:text-base">Monthly Transactions</Label>
                            <span className="text-xs sm:text-sm font-semibold">
                              {profile.transactionCount || 0} / {userService.getTransactionLimit(profile.subscriptionType || null) === Infinity ? '∞' : userService.getTransactionLimit(profile.subscriptionType || null)}
                            </span>
                          </div>
                          {userService.getTransactionLimit(profile.subscriptionType || null) !== Infinity && (
                            <Progress 
                              value={((profile.transactionCount || 0) / userService.getTransactionLimit(profile.subscriptionType || null)) * 100} 
                              className="h-2 sm:h-3"
                            />
                          )}
                          <p className="text-xs text-muted-foreground">
                            Resets on the 1st of each month
                          </p>
                        </div>
                        
                        <Separator />
                        
                        {/* Storage Usage */}
                        <div className="space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <Label className="text-sm sm:text-base">Storage Usage</Label>
                            <span className="text-xs sm:text-sm font-semibold">
                              {((profile.storageUsed || 0) / (1024 * 1024)).toFixed(2)} MB / {((profile.storageLimit || 500 * 1024 * 1024) / (1024 * 1024)).toFixed(0)} MB
                            </span>
                          </div>
                          <Progress 
                            value={((profile.storageUsed || 0) / (profile.storageLimit || 500 * 1024 * 1024)) * 100} 
                            className="h-2 sm:h-3"
                          />
                          <p className="text-xs text-muted-foreground">
                            {((profile.storageLimit || 500 * 1024 * 1024) - (profile.storageUsed || 0)) / (1024 * 1024) > 0 
                              ? `${(((profile.storageLimit || 500 * 1024 * 1024) - (profile.storageUsed || 0)) / (1024 * 1024)).toFixed(2)} MB remaining`
                              : 'Storage limit reached'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="mt-0">
                <Card className="p-4 sm:p-6 md:p-8">
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">Notification Preferences</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Configure how and when you receive notifications
                    </p>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                        <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive email alerts for reminders and deadlines</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                        <Label className="text-base">Tax Deadline Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get notified about upcoming tax deadlines</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                        <Label className="text-base">Transaction Alerts</Label>
                    <p className="text-sm text-muted-foreground">Notifications for new transactions</p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                        <Label className="text-base">Weekly Summary</Label>
                    <p className="text-sm text-muted-foreground">Receive weekly financial summary reports</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                    <div className="flex justify-end pt-4">
                      <Button size="lg">Save Preferences</Button>
                    </div>
              </div>
            </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="mt-0">
                <Card className="p-4 sm:p-6 md:p-8">
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">Security</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Update your password and manage security settings
                    </p>
                  </div>
                  <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type="password" placeholder="Enter your current password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" placeholder="Enter your new password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" placeholder="Confirm your new password" />
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button size="lg">Update Password</Button>
                </div>
              </div>
            </Card>
              </TabsContent>
            </div>
          </Tabs>
          </div>
        </main>
      </div>

      {/* Change Plan Modal */}
      <ChangePlanModal
        open={showChangePlanModal}
        onOpenChange={setShowChangePlanModal}
        currentPlan={subscriptionType}
        businessType={profile?.businessType || 'freelancer'}
        onSelectPlan={handleSubscribe}
        processingPlan={processingSubscription}
      />
    </>
  )
}
