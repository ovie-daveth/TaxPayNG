"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardNavSME } from "@/components/dashboard/dashboard-nav-sme"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { SettingsSkeleton } from "@/components/ui/skeletons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { userService, documentService } from "@/lib/services"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { User, Building2, CreditCard, Bell, Shield, Upload, X, CheckCircle2, Loader2, ExternalLink, HelpCircle, MessageSquare, Mail, Send } from "lucide-react"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { subscriptionService } from "@/lib/services/subscriptionService"
import { getAuth } from "firebase/auth"
import { auth } from "@/firebase/firebase"
import { reauthenticateWithCredential, updatePassword, EmailAuthProvider } from "firebase/auth"
import { ChangePlanModal } from "@/components/subscription/change-plan-modal"
import { MigrateToCreatorModal } from "@/components/subscription/migrate-to-creator-modal"
import { OneTouchResubscribeButton } from "@/components/subscription/one-touch-resubscribe-button"
import { SubscriptionType } from "@/lib/types"
import { useSidebar } from "@/lib/contexts/sidebar-context"

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  const { isSubscribed, subscriptionType, isExpired, isExpiringSoon, subscriptionExpiryDate } = useSubscription()
  const { sidebarCollapsed } = useSidebar()
  const [isSaving, setIsSaving] = useState(false)
  const [processingSubscription, setProcessingSubscription] = useState<string | null>(null)
  const [showChangePlanModal, setShowChangePlanModal] = useState(false)
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType | null>(null)
  const kycSectionRef = useRef<HTMLDivElement>(null)
  const [kycDocuments, setKycDocuments] = useState({
    id: '',
    passport: '',
    driverLicense: ''
  })
  const [kycDocumentFileIds, setKycDocumentFileIds] = useState({
    id: '',
    passport: '',
    driverLicense: ''
  })
  const [kycDocumentSizes, setKycDocumentSizes] = useState({
    id: 0,
    passport: 0,
    driverLicense: 0
  })
  const [uploadingKYC, setUploadingKYC] = useState({
    id: false,
    passport: false,
    driverLicense: false
  })
  const [deletingKYC, setDeletingKYC] = useState({
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
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'Nigeria',
      postalCode: ''
    }
  })
  const [notificationPreferences, setNotificationPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [supportForm, setSupportForm] = useState({
    subject: '',
    message: '',
    category: 'general'
  })
  const [isSendingSupport, setIsSendingSupport] = useState(false)
  const [businessDocuments, setBusinessDocuments] = useState({
    cac: '',
    taxCertificate: '',
    businessLicense: ''
  })
  const [businessDocumentFileIds, setBusinessDocumentFileIds] = useState({
    cac: '',
    taxCertificate: '',
    businessLicense: ''
  })
  const [businessDocumentSizes, setBusinessDocumentSizes] = useState({
    cac: 0,
    taxCertificate: 0,
    businessLicense: 0
  })
  const [uploadingBusinessDoc, setUploadingBusinessDoc] = useState({
    cac: false,
    taxCertificate: false,
    businessLicense: false
  })
  const [deletingBusinessDoc, setDeletingBusinessDoc] = useState({
    cac: false,
    taxCertificate: false,
    businessLicense: false
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

    // Load notification preferences
    // Check if emailNotifications is explicitly set, otherwise fall back to legacy notifications field, default to true
    const emailNotifications = profile.preferences?.emailNotifications !== undefined 
      ? profile.preferences.emailNotifications 
      : (profile.preferences?.notifications !== undefined ? profile.preferences.notifications : true)
    
    const smsNotifications = profile.preferences?.smsNotifications ?? false
    
    setNotificationPreferences({
      emailNotifications,
      smsNotifications
    })

    // Load KYC documents
    if (profile.kycDocuments) {
      setKycDocuments({
        id: profile.kycDocuments.id || '',
        passport: profile.kycDocuments.passport || '',
        driverLicense: profile.kycDocuments.driverLicense || ''
      })
    }

    // Load business documents
    if (profile.businessDocuments) {
      setBusinessDocuments({
        cac: profile.businessDocuments.cac || '',
        taxCertificate: profile.businessDocuments.taxCertificate || '',
        businessLicense: profile.businessDocuments.businessLicense || ''
      })
    }
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
      router.replace('/dashboard-sme/settings?tab=subscription', { scroll: false })
    }

    if (error) {
      toast.error(message || 'Subscription payment failed. Please try again.')
      // Clean URL
      router.replace('/dashboard-sme/settings?tab=subscription', { scroll: false })
    }
  }, [searchParams, router, refetchProfile])

  // Check if migration is needed (freelancer trying to subscribe to GOLD or PLATINUM)
  const needsMigration = (planType: SubscriptionType): boolean => {
    return profile?.businessType === 'freelancer' && (planType === 'GOLD' || planType === 'PLATINUM')
  }

  const handleMigrateAndSubscribe = async () => {
    if (!selectedPlan) return

    try {
      // Get auth token
      const currentUser = auth.currentUser
      if (!currentUser) {
        router.push("/login")
        return
      }

      const token = await currentUser.getIdToken()

      // Update business type to creator
      const updateResponse = await fetch("/api/user/update-business-type", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          businessType: 'creator'
        })
      })

      const updateData = await updateResponse.json()

      if (!updateResponse.ok || !updateData.success) {
        throw new Error(updateData.error || "Failed to update business type")
      }

      // Migration successful - proceed silently to payment
      // Close migration modal
      setShowMigrationModal(false)
      // Small delay to ensure modal closes, then proceed with subscription
      setTimeout(() => {
        handleSubscribeDirect(selectedPlan)
      }, 300)
    } catch (error) {
      console.error("Migration error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to migrate account")
    }
  }

  const handleSubscribeDirect = async (planType: SubscriptionType) => {
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

  const handleSubscribe = async (planType: SubscriptionType) => {
    // Check if migration is needed
    if (needsMigration(planType)) {
      setSelectedPlan(planType)
      setShowMigrationModal(true)
      return
    }

    // No migration needed, proceed with subscription
    await handleSubscribeDirect(planType)
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
      dateOfBirth: (profile as any).dateOfBirth || '',
      gender: (profile as any).gender || '',
      maritalStatus: (profile as any).maritalStatus || '',
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
    
    // Load KYC document fileIds and sizes from profile (if stored)
    // Note: For existing documents, fileIds might not be stored yet
    setKycDocumentFileIds({
      id: (profile.kycDocuments as any)?.idFileId || '',
      passport: (profile.kycDocuments as any)?.passportFileId || '',
      driverLicense: (profile.kycDocuments as any)?.driverLicenseFileId || ''
    })
    setKycDocumentSizes({
      id: (profile.kycDocuments as any)?.idSize || 0,
      passport: (profile.kycDocuments as any)?.passportSize || 0,
      driverLicense: (profile.kycDocuments as any)?.driverLicenseSize || 0
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
        <DashboardNavSME />
        <main className="flex-1 overflow-hidden">
          <div className="px-6 py-8 h-full overflow-y-auto hide-scrollbar">
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
          <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 h-full overflow-y-auto hide-scrollbar">
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Manage your account settings and preferences
            </p>
          </div>

          <Tabs defaultValue={searchParams.get('tab') || 'profile'} className="w-full">
            <TabsList className={`grid w-full mb-4 sm:mb-6 ${profile?.businessType === 'freelancer' ? 'grid-cols-4 md:grid-cols-5' : 'grid-cols-5 md:grid-cols-6'} gap-1 sm:gap-2`}>
              <TabsTrigger value="profile" className="flex items-center gap-1 sm:gap-2 cursor-pointer text-xs sm:text-sm">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              {profile?.businessType !== 'freelancer' && (
                <TabsTrigger value="business" className="flex items-center gap-1 sm:gap-2 cursor-pointer text-xs sm:text-sm">
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Business</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="subscription" className="flex items-center gap-1 sm:gap-2 cursor-pointer text-xs sm:text-sm">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Subscription</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1 sm:gap-2 cursor-pointer text-xs sm:text-sm">
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-1 sm:gap-2 cursor-pointer text-xs sm:text-sm">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="support" className="hidden md:flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Support</span>
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
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="firstName" className="text-xs sm:text-sm">First Name</Label>
                        <Input 
                          id="firstName" 
                          value={profileData.firstName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="lastName" className="text-xs sm:text-sm">Last Name</Label>
                        <Input 
                          id="lastName"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                  </div>
                </div>
                    <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                        <Input id="email" type="email" defaultValue={profile?.email || ""} disabled className="h-9 sm:h-10 text-xs sm:text-sm" />
                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="phone" className="text-xs sm:text-sm">Phone Number</Label>
                        <Input 
                          id="phone" 
                          value={profileData.phone}
                          onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                  </div>
                </div>
                    <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="tin" className="text-xs sm:text-sm">Tax Identification Number</Label>
                        <Input 
                          id="tin"
                          value={profileData.taxId}
                          onChange={(e) => setProfileData(prev => ({ ...prev, taxId: e.target.value }))}
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="dateOfBirth" className="text-xs sm:text-sm">Date of Birth</Label>
                        <Input 
                          id="dateOfBirth"
                          type="date"
                          value={profileData.dateOfBirth}
                          onChange={(e) => setProfileData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                  </div>
                </div>
                    <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="gender" className="text-xs sm:text-sm">Gender</Label>
                        <Select 
                          value={profileData.gender}
                          onValueChange={(value) => setProfileData(prev => ({ ...prev, gender: value }))}
                        >
                          <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="maritalStatus" className="text-xs sm:text-sm">Marital Status</Label>
                        <Select 
                          value={profileData.maritalStatus}
                          onValueChange={(value) => setProfileData(prev => ({ ...prev, maritalStatus: value }))}
                        >
                          <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                            <SelectValue placeholder="Select marital status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                          </SelectContent>
                        </Select>
                  </div>
                </div>
                    <Separator />
                    <div className="space-y-3 sm:space-y-4">
                      <h3 className="text-base sm:text-lg font-semibold">Address</h3>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="street" className="text-xs sm:text-sm">Street Address</Label>
                        <Input 
                          id="street"
                          value={profileData.address.street}
                          onChange={(e) => setProfileData(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, street: e.target.value }
                          }))}
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                        <div className="space-y-1.5 sm:space-y-2">
                          <Label htmlFor="city" className="text-xs sm:text-sm">City</Label>
                          <Input 
                            id="city"
                            value={profileData.address.city}
                            onChange={(e) => setProfileData(prev => ({ 
                              ...prev, 
                              address: { ...prev.address, city: e.target.value }
                            }))}
                            className="h-9 sm:h-10 text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                          <Label htmlFor="state" className="text-xs sm:text-sm">State</Label>
                          <Input 
                            id="state"
                            value={profileData.address.state}
                            onChange={(e) => setProfileData(prev => ({ 
                              ...prev, 
                              address: { ...prev.address, state: e.target.value }
                            }))}
                            className="h-9 sm:h-10 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                        <div className="space-y-1.5 sm:space-y-2">
                          <Label htmlFor="country" className="text-xs sm:text-sm">Country</Label>
                          <Input 
                            id="country"
                            value={profileData.address.country}
                            onChange={(e) => setProfileData(prev => ({ 
                              ...prev, 
                              address: { ...prev.address, country: e.target.value }
                            }))}
                            className="h-9 sm:h-10 text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                          <Label htmlFor="postalCode" className="text-xs sm:text-sm">Postal Code</Label>
                          <Input 
                            id="postalCode"
                            value={profileData.address.postalCode}
                            onChange={(e) => setProfileData(prev => ({ 
                              ...prev, 
                              address: { ...prev.address, postalCode: e.target.value }
                            }))}
                            className="h-9 sm:h-10 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <Separator />
                    {/* Business Documents Section - Only for SMEs */}
                    {profile?.businessType === 'sme' && (
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold">Business Documents</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            Upload your business documents for verification (CAC Certificate, Tax Clearance Certificate, or Business License)
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                          {/* CAC Certificate */}
                          <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">CAC Certificate</Label>
                            <div className="border-2 border-dashed rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center min-h-[100px] sm:min-h-[120px]">
                              {businessDocuments.cac ? (
                                <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full">
                                  <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                                  <p className="text-xs sm:text-sm text-muted-foreground text-center">Document uploaded</p>
                                  <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(businessDocuments.cac, '_blank')}
                                      className="h-7 sm:h-8 text-xs sm:text-sm"
                                    >
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        if (!user?.uid) return
                                        setDeletingBusinessDoc(prev => ({ ...prev, cac: true }))
                                        try {
                                          await userService.upsertProfile(user.uid, {
                                            businessDocuments: { ...businessDocuments, cac: undefined }
                                          })
                                          setBusinessDocuments(prev => ({ ...prev, cac: '' }))
                                          toast.success("CAC Certificate deleted")
                                          await refetchProfile()
                                        } catch (error) {
                                          toast.error("Failed to delete document")
                                        } finally {
                                          setDeletingBusinessDoc(prev => ({ ...prev, cac: false }))
                                        }
                                      }}
                                      disabled={deletingBusinessDoc.cac}
                                      className="h-7 sm:h-8 text-xs sm:text-sm"
                                    >
                                      {deletingBusinessDoc.cac ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center gap-1.5 sm:gap-2 w-full">
                                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                                  <span className="text-xs sm:text-sm text-muted-foreground text-center">Click to upload</span>
                                  <Input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0]
                                      if (!file || !user?.uid) return
                                      setUploadingBusinessDoc(prev => ({ ...prev, cac: true }))
                                      try {
                                        const result = await uploadToImageKit(file, 'business-documents', user.uid)
                                        await userService.upsertProfile(user.uid, {
                                          businessDocuments: { ...businessDocuments, cac: result.url }
                                        })
                                        setBusinessDocuments(prev => ({ ...prev, cac: result.url }))
                                        toast.success("CAC Certificate uploaded successfully")
                                        await refetchProfile()
                                        await documentService.uploadDocument(user.uid, {
                                          file,
                                          name: 'CAC Certificate',
                                          type: 'proof',
                                          imageKitUrl: result.url,
                                          imageKitFileId: result.fileId,
                                          fileSize: result.size
                                        })
                                      } catch (error) {
                                        console.error("Upload error:", error)
                                        toast.error(error instanceof Error ? error.message : "Failed to upload document")
                                      } finally {
                                        setUploadingBusinessDoc(prev => ({ ...prev, cac: false }))
                                        e.target.value = ''
                                      }
                                    }}
                                    disabled={uploadingBusinessDoc.cac}
                                  />
                                  {uploadingBusinessDoc.cac && <span className="text-xs text-muted-foreground">Uploading...</span>}
                                </label>
                              )}
                            </div>
                          </div>

                          {/* Tax Clearance Certificate */}
                          <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Tax Clearance Certificate</Label>
                            <div className="border-2 border-dashed rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center min-h-[100px] sm:min-h-[120px]">
                              {businessDocuments.taxCertificate ? (
                                <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full">
                                  <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                                  <p className="text-xs sm:text-sm text-muted-foreground text-center">Document uploaded</p>
                                  <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(businessDocuments.taxCertificate, '_blank')}
                                      className="h-7 sm:h-8 text-xs sm:text-sm"
                                    >
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        if (!user?.uid) return
                                        setDeletingBusinessDoc(prev => ({ ...prev, taxCertificate: true }))
                                        try {
                                          await userService.upsertProfile(user.uid, {
                                            businessDocuments: { ...businessDocuments, taxCertificate: undefined }
                                          })
                                          setBusinessDocuments(prev => ({ ...prev, taxCertificate: '' }))
                                          toast.success("Tax Clearance Certificate deleted")
                                          await refetchProfile()
                                        } catch (error) {
                                          toast.error("Failed to delete document")
                                        } finally {
                                          setDeletingBusinessDoc(prev => ({ ...prev, taxCertificate: false }))
                                        }
                                      }}
                                      disabled={deletingBusinessDoc.taxCertificate}
                                      className="h-7 sm:h-8 text-xs sm:text-sm"
                                    >
                                      {deletingBusinessDoc.taxCertificate ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center gap-1.5 sm:gap-2 w-full">
                                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                                  <span className="text-xs sm:text-sm text-muted-foreground text-center">Click to upload</span>
                                  <Input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0]
                                      if (!file || !user?.uid) return
                                      setUploadingBusinessDoc(prev => ({ ...prev, taxCertificate: true }))
                                      try {
                                        const result = await uploadToImageKit(file, 'business-documents', user.uid)
                                        await userService.upsertProfile(user.uid, {
                                          businessDocuments: { ...businessDocuments, taxCertificate: result.url }
                                        })
                                        setBusinessDocuments(prev => ({ ...prev, taxCertificate: result.url }))
                                        toast.success("Tax Clearance Certificate uploaded successfully")
                                        await refetchProfile()
                                        await documentService.uploadDocument(user.uid, {
                                          file,
                                          name: 'Tax Clearance Certificate',
                                          type: 'proof',
                                          imageKitUrl: result.url,
                                          imageKitFileId: result.fileId,
                                          fileSize: result.size
                                        })
                                      } catch (error) {
                                        console.error("Upload error:", error)
                                        toast.error(error instanceof Error ? error.message : "Failed to upload document")
                                      } finally {
                                        setUploadingBusinessDoc(prev => ({ ...prev, taxCertificate: false }))
                                        e.target.value = ''
                                      }
                                    }}
                                    disabled={uploadingBusinessDoc.taxCertificate}
                                  />
                                  {uploadingBusinessDoc.taxCertificate && <span className="text-xs text-muted-foreground">Uploading...</span>}
                                </label>
                              )}
                            </div>
                          </div>

                          {/* Business License */}
                          <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Business License</Label>
                            <div className="border-2 border-dashed rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center min-h-[100px] sm:min-h-[120px]">
                              {businessDocuments.businessLicense ? (
                                <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full">
                                  <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                                  <p className="text-xs sm:text-sm text-muted-foreground text-center">Document uploaded</p>
                                  <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(businessDocuments.businessLicense, '_blank')}
                                      className="h-7 sm:h-8 text-xs sm:text-sm"
                                    >
                                      View
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        if (!user?.uid) return
                                        setDeletingBusinessDoc(prev => ({ ...prev, businessLicense: true }))
                                        try {
                                          await userService.upsertProfile(user.uid, {
                                            businessDocuments: { ...businessDocuments, businessLicense: undefined }
                                          })
                                          setBusinessDocuments(prev => ({ ...prev, businessLicense: '' }))
                                          toast.success("Business License deleted")
                                          await refetchProfile()
                                        } catch (error) {
                                          toast.error("Failed to delete document")
                                        } finally {
                                          setDeletingBusinessDoc(prev => ({ ...prev, businessLicense: false }))
                                        }
                                      }}
                                      disabled={deletingBusinessDoc.businessLicense}
                                      className="h-7 sm:h-8 text-xs sm:text-sm"
                                    >
                                      {deletingBusinessDoc.businessLicense ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <label className="cursor-pointer flex flex-col items-center gap-1.5 sm:gap-2 w-full">
                                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                                  <span className="text-xs sm:text-sm text-muted-foreground text-center">Click to upload</span>
                                  <Input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0]
                                      if (!file || !user?.uid) return
                                      setUploadingBusinessDoc(prev => ({ ...prev, businessLicense: true }))
                                      try {
                                        const result = await uploadToImageKit(file, 'business-documents', user.uid)
                                        await userService.upsertProfile(user.uid, {
                                          businessDocuments: { ...businessDocuments, businessLicense: result.url }
                                        })
                                        setBusinessDocuments(prev => ({ ...prev, businessLicense: result.url }))
                                        toast.success("Business License uploaded successfully")
                                        await refetchProfile()
                                        await documentService.uploadDocument(user.uid, {
                                          file,
                                          name: 'Business License',
                                          type: 'proof',
                                          imageKitUrl: result.url,
                                          imageKitFileId: result.fileId,
                                          fileSize: result.size
                                        })
                                      } catch (error) {
                                        console.error("Upload error:", error)
                                        toast.error(error instanceof Error ? error.message : "Failed to upload document")
                                      } finally {
                                        setUploadingBusinessDoc(prev => ({ ...prev, businessLicense: false }))
                                        e.target.value = ''
                                      }
                                    }}
                                    disabled={uploadingBusinessDoc.businessLicense}
                                  />
                                  {uploadingBusinessDoc.businessLicense && <span className="text-xs text-muted-foreground">Uploading...</span>}
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <Separator />
                    <div ref={kycSectionRef} className="space-y-3 sm:space-y-4" id="kyc-section">
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold">KYC Documents</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Upload your identity documents for verification (ID, Passport, or Driver's License)
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                        {/* National ID */}
                        <div className="space-y-1.5 sm:space-y-2">
                          <Label className="text-xs sm:text-sm">National ID / Voter's Card</Label>
                          <div className="border-2 border-dashed rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center min-h-[100px] sm:min-h-[120px]">
                            {kycDocuments.id ? (
                              <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full">
                                <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                                <p className="text-xs sm:text-sm text-muted-foreground text-center">Document uploaded</p>
                                <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(kycDocuments.id, '_blank')}
                                    className="h-7 sm:h-8 text-xs sm:text-sm"
                                  >
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      console.log('🗑️ DELETE KYC ID DOCUMENT CLICKED')
                                      if (!user?.uid) {
                                        console.warn('No user ID')
                                        return
                                      }
                                      
                                      let fileId = kycDocumentFileIds.id
                                      let fileSize = kycDocumentSizes.id
                                      const documentUrl = kycDocuments.id
                                      
                                      console.log('🗑️ Delete info:', { fileId, fileSize, documentUrl })
                                      
                                      // If fileId is missing but we have a URL, try to get fileId from ImageKit
                                      if (!fileId && documentUrl && documentUrl.includes('imagekit.io')) {
                                        console.log('🗑️ fileId missing, attempting to get from ImageKit API')
                                        try {
                                          const token = await auth.currentUser?.getIdToken()
                                          if (token) {
                                            // Try to get fileId from ImageKit using URL
                                            const getFileResponse = await fetch(`/api/get-image-fileid?url=${encodeURIComponent(documentUrl)}`, {
                                              method: 'GET',
                                              headers: { 'Authorization': `Bearer ${token}` }
                                            })
                                            
                                            if (getFileResponse.ok) {
                                              const fileData = await getFileResponse.json()
                                              if (fileData.fileId) {
                                                fileId = fileData.fileId
                                                fileSize = fileData.size || fileSize
                                                console.log('🗑️ Retrieved fileId from ImageKit:', { fileId, fileSize })
                                              }
                                            }
                                          }
                                        } catch (getFileError) {
                                          console.warn('🗑️ Could not get fileId from ImageKit:', getFileError)
                                          // Continue with deletion attempt using URL-based approach
                                        }
                                      }
                                      
                                      setDeletingKYC(prev => ({ ...prev, id: true }))
                                      try {
                                        // Delete from ImageKit if fileId exists
                                        if (fileId) {
                                          console.log('🗑️ Deleting from ImageKit:', fileId)
                                          try {
                                            const token = await auth.currentUser?.getIdToken()
                                            if (token) {
                                              const deleteResponse = await fetch(`/api/delete-image?fileId=${encodeURIComponent(fileId)}`, {
                                                method: 'DELETE',
                                                headers: { 'Authorization': `Bearer ${token}` }
                                              })
                                              
                                              const deleteData = await deleteResponse.json().catch(() => ({ error: 'Unknown error' }))
                                              
                                              if (deleteResponse.ok && deleteData.success) {
                                                console.log('🗑️ ImageKit file deleted successfully')
                                              } else if (deleteData.networkError) {
                                                console.warn('🗑️ Network error deleting from ImageKit - file may still exist:', deleteData.error)
                                                toast.warning('Network error: File may still exist in storage. Please try again later.')
                                              } else {
                                                console.error('🗑️ ImageKit delete error:', deleteData.error)
                                                // Continue with profile update even if ImageKit deletion fails
                                              }
                                            }
                                          } catch (imagekitError) {
                                            console.error('🗑️ Error deleting from ImageKit:', imagekitError)
                                            // Continue with profile update even if ImageKit deletion fails
                                          }
                                        } else {
                                          console.warn('🗑️ Cannot delete from ImageKit: fileId is missing')
                                        }
                                        
                                        // Reduce storage if size is known
                                        if (fileSize > 0) {
                                          console.log('🗑️ Reducing storage by:', fileSize)
                                          try {
                                            const token = await auth.currentUser?.getIdToken()
                                            if (token) {
                                              await fetch('/api/user/update-storage', {
                                                method: 'POST',
                                                headers: {
                                                  'Content-Type': 'application/json',
                                                  'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify({ additionalBytes: -fileSize })
                                              })
                                              console.log('🗑️ Storage reduced successfully')
                                            }
                                          } catch (storageError) {
                                            console.error('🗑️ Error reducing storage:', storageError)
                                            // Continue even if storage update fails
                                          }
                                        } else {
                                          console.warn('🗑️ Cannot reduce storage: fileSize is unknown')
                                        }
                                        
                                        // Update profile to remove document
                                        await userService.upsertProfile(user.uid, {
                                          kycDocuments: { 
                                            ...kycDocuments, 
                                            id: '',
                                            idFileId: '',
                                            idSize: 0
                                          } as any
                                        })
                                        setKycDocuments(prev => ({ ...prev, id: '' }))
                                        setKycDocumentFileIds(prev => ({ ...prev, id: '' }))
                                        setKycDocumentSizes(prev => ({ ...prev, id: 0 }))
                                        
                                        toast.success("Document removed")
                                        await refetchProfile()
                                        console.log('🗑️ Document removal completed')
                                      } catch (error) {
                                        console.error('🗑️ Error removing document:', error)
                                        toast.error("Failed to remove document")
                                      } finally {
                                        setDeletingKYC(prev => ({ ...prev, id: false }))
                                      }
                                    }}
                                    disabled={deletingKYC.id}
                                    className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                                  >
                                    {deletingKYC.id ? (
                                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                    ) : (
                                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center gap-1.5 sm:gap-2 w-full">
                                <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                                <span className="text-xs sm:text-sm text-muted-foreground">Click to upload</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file || !user?.uid) {
                                      e.target.value = ''
                                      return
                                    }
                                    setUploadingKYC(prev => ({ ...prev, id: true }))
                                    try {
                                      // If replacing an existing document, we need to reduce storage for the old one
                                      // Note: Storage for new document is handled by the upload-image API route
                                      const oldUrl = kycDocuments.id
                                      
                                      // If replacing an existing document, get old fileId and size for deletion
                                      const oldFileId = kycDocumentFileIds.id
                                      const oldSize = kycDocumentSizes.id
                                      
                                      const result = await uploadToImageKit(file, 'kyc', user.uid)
                                      
                                      // Update profile with new document URL, fileId, and size
                                      await userService.upsertProfile(user.uid, {
                                        kycDocuments: { 
                                          ...kycDocuments, 
                                          id: result.url,
                                          idFileId: result.fileId,
                                          idSize: result.size
                                        } as any
                                      })
                                      setKycDocuments(prev => ({ ...prev, id: result.url }))
                                      setKycDocumentFileIds(prev => ({ ...prev, id: result.fileId || '' }))
                                      setKycDocumentSizes(prev => ({ ...prev, id: result.size || 0 }))
                                      
                                      // If replacing old document, delete it from ImageKit and reduce storage
                                      if (oldFileId && oldSize > 0) {
                                        try {
                                          const token = await auth.currentUser?.getIdToken()
                                          if (token) {
                                            await fetch(`/api/delete-image?fileId=${encodeURIComponent(oldFileId)}`, {
                                              method: 'DELETE',
                                              headers: { 'Authorization': `Bearer ${token}` }
                                            })
                                            await fetch('/api/user/update-storage', {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                              },
                                              body: JSON.stringify({ additionalBytes: -oldSize })
                                            })
                                          }
                                        } catch (deleteError) {
                                          console.error('Error deleting old document:', deleteError)
                                        }
                                      }
                                      
                                      toast.success("ID document uploaded successfully")
                                      await refetchProfile()
                                    } catch (error) {
                                      console.error("Upload error:", error)
                                      toast.error(error instanceof Error ? error.message : "Failed to upload document")
                                    } finally {
                                      setUploadingKYC(prev => ({ ...prev, id: false }))
                                      // Reset the input so the same file can be selected again if needed
                                      e.target.value = ''
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
                        <div className="space-y-1.5 sm:space-y-2">
                          <Label className="text-xs sm:text-sm">Passport</Label>
                          <div className="border-2 border-dashed rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center min-h-[100px] sm:min-h-[120px]">
                            {kycDocuments.passport ? (
                              <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full">
                                <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                                <p className="text-xs sm:text-sm text-muted-foreground text-center">Document uploaded</p>
                                <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(kycDocuments.passport, '_blank')}
                                    className="h-7 sm:h-8 text-xs sm:text-sm"
                                  >
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      console.log('🗑️ DELETE KYC PASSPORT CLICKED')
                                      if (!user?.uid) return
                                      
                                      let fileId = kycDocumentFileIds.passport
                                      let fileSize = kycDocumentSizes.passport
                                      const documentUrl = kycDocuments.passport
                                      
                                      // If fileId is missing but we have a URL, try to get fileId from ImageKit
                                      if (!fileId && documentUrl && documentUrl.includes('imagekit.io')) {
                                        try {
                                          const token = await auth.currentUser?.getIdToken()
                                          if (token) {
                                            const getFileResponse = await fetch(`/api/get-image-fileid?url=${encodeURIComponent(documentUrl)}`, {
                                              method: 'GET',
                                              headers: { 'Authorization': `Bearer ${token}` }
                                            })
                                            if (getFileResponse.ok) {
                                              const fileData = await getFileResponse.json()
                                              if (fileData.fileId) {
                                                fileId = fileData.fileId
                                                fileSize = fileData.size || fileSize
                                              }
                                            }
                                          }
                                        } catch (getFileError) {
                                          console.warn('Could not get fileId from ImageKit:', getFileError)
                                        }
                                      }
                                      
                                      setDeletingKYC(prev => ({ ...prev, passport: true }))
                                      try {
                                        // Delete from ImageKit if fileId exists
                                        if (fileId) {
                                          const token = await auth.currentUser?.getIdToken()
                                          if (token) {
                                            await fetch(`/api/delete-image?fileId=${encodeURIComponent(fileId)}`, {
                                              method: 'DELETE',
                                              headers: { 'Authorization': `Bearer ${token}` }
                                            })
                                          }
                                        }
                                        
                                        // Reduce storage if size is known
                                        if (fileSize > 0) {
                                          const token = await auth.currentUser?.getIdToken()
                                          if (token) {
                                            await fetch('/api/user/update-storage', {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                              },
                                              body: JSON.stringify({ additionalBytes: -fileSize })
                                            })
                                          }
                                        }
                                        
                                        await userService.upsertProfile(user.uid, {
                                          kycDocuments: { 
                                            ...kycDocuments, 
                                            passport: '',
                                            passportFileId: '',
                                            passportSize: 0
                                          } as any
                                        })
                                        setKycDocuments(prev => ({ ...prev, passport: '' }))
                                        setKycDocumentFileIds(prev => ({ ...prev, passport: '' }))
                                        setKycDocumentSizes(prev => ({ ...prev, passport: 0 }))
                                        toast.success("Document removed")
                                        await refetchProfile()
                                      } catch (error) {
                                        console.error('Error removing passport:', error)
                                        toast.error("Failed to remove document")
                                      } finally {
                                        setDeletingKYC(prev => ({ ...prev, passport: false }))
                                      }
                                    }}
                                    disabled={deletingKYC.passport}
                                    className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                                  >
                                    {deletingKYC.passport ? (
                                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                    ) : (
                                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center gap-1.5 sm:gap-2 w-full">
                                <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                                <span className="text-xs sm:text-sm text-muted-foreground">Click to upload</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file || !user?.uid) {
                                      e.target.value = ''
                                      return
                                    }
                                    setUploadingKYC(prev => ({ ...prev, passport: true }))
                                    try {
                                      // If replacing an existing document, get old fileId and size for deletion
                                      const oldFileId = kycDocumentFileIds.passport
                                      const oldSize = kycDocumentSizes.passport
                                      
                                      const result = await uploadToImageKit(file, 'kyc', user.uid)
                                      
                                      // Update profile with new document URL, fileId, and size
                                      await userService.upsertProfile(user.uid, {
                                        kycDocuments: { 
                                          ...kycDocuments, 
                                          passport: result.url,
                                          passportFileId: result.fileId,
                                          passportSize: result.size
                                        } as any
                                      })
                                      setKycDocuments(prev => ({ ...prev, passport: result.url }))
                                      setKycDocumentFileIds(prev => ({ ...prev, passport: result.fileId || '' }))
                                      setKycDocumentSizes(prev => ({ ...prev, passport: result.size || 0 }))
                                      
                                      // If replacing old document, delete it from ImageKit and reduce storage
                                      if (oldFileId && oldSize > 0) {
                                        try {
                                          const token = await auth.currentUser?.getIdToken()
                                          if (token) {
                                            await fetch(`/api/delete-image?fileId=${encodeURIComponent(oldFileId)}`, {
                                              method: 'DELETE',
                                              headers: { 'Authorization': `Bearer ${token}` }
                                            })
                                            await fetch('/api/user/update-storage', {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                              },
                                              body: JSON.stringify({ additionalBytes: -oldSize })
                                            })
                                          }
                                        } catch (deleteError) {
                                          console.error('Error deleting old document:', deleteError)
                                        }
                                      }
                                      
                                      toast.success("Passport uploaded successfully")
                                      await refetchProfile()
                                    } catch (error) {
                                      console.error("Upload error:", error)
                                      toast.error(error instanceof Error ? error.message : "Failed to upload document")
                                    } finally {
                                      setUploadingKYC(prev => ({ ...prev, passport: false }))
                                      // Reset the input so the same file can be selected again if needed
                                      e.target.value = ''
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
                        <div className="space-y-1.5 sm:space-y-2">
                          <Label className="text-xs sm:text-sm">Driver's License</Label>
                          <div className="border-2 border-dashed rounded-lg p-3 sm:p-4 flex flex-col items-center justify-center min-h-[100px] sm:min-h-[120px]">
                            {kycDocuments.driverLicense ? (
                              <div className="flex flex-col items-center gap-1.5 sm:gap-2 w-full">
                                <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                                <p className="text-xs sm:text-sm text-muted-foreground text-center">Document uploaded</p>
                                <div className="flex gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(kycDocuments.driverLicense, '_blank')}
                                    className="h-7 sm:h-8 text-xs sm:text-sm"
                                  >
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      console.log('🗑️ DELETE KYC DRIVER LICENSE CLICKED')
                                      if (!user?.uid) return
                                      
                                      let fileId = kycDocumentFileIds.driverLicense
                                      let fileSize = kycDocumentSizes.driverLicense
                                      const documentUrl = kycDocuments.driverLicense
                                      
                                      // If fileId is missing but we have a URL, try to get fileId from ImageKit
                                      if (!fileId && documentUrl && documentUrl.includes('imagekit.io')) {
                                        try {
                                          const token = await auth.currentUser?.getIdToken()
                                          if (token) {
                                            const getFileResponse = await fetch(`/api/get-image-fileid?url=${encodeURIComponent(documentUrl)}`, {
                                              method: 'GET',
                                              headers: { 'Authorization': `Bearer ${token}` }
                                            })
                                            if (getFileResponse.ok) {
                                              const fileData = await getFileResponse.json()
                                              if (fileData.fileId) {
                                                fileId = fileData.fileId
                                                fileSize = fileData.size || fileSize
                                              }
                                            }
                                          }
                                        } catch (getFileError) {
                                          console.warn('Could not get fileId from ImageKit:', getFileError)
                                        }
                                      }
                                      
                                      setDeletingKYC(prev => ({ ...prev, driverLicense: true }))
                                      try {
                                        // Delete from ImageKit if fileId exists
                                        if (fileId) {
                                          const token = await auth.currentUser?.getIdToken()
                                          if (token) {
                                            await fetch(`/api/delete-image?fileId=${encodeURIComponent(fileId)}`, {
                                              method: 'DELETE',
                                              headers: { 'Authorization': `Bearer ${token}` }
                                            })
                                          }
                                        }
                                        
                                        // Reduce storage if size is known
                                        if (fileSize > 0) {
                                          const token = await auth.currentUser?.getIdToken()
                                          if (token) {
                                            await fetch('/api/user/update-storage', {
                                              method: 'POST',
                                              headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                              },
                                              body: JSON.stringify({ additionalBytes: -fileSize })
                                            })
                                          }
                                        }
                                        
                                        await userService.upsertProfile(user.uid, {
                                          kycDocuments: { 
                                            ...kycDocuments, 
                                            driverLicense: '',
                                            driverLicenseFileId: '',
                                            driverLicenseSize: 0
                                          } as any
                                        })
                                        setKycDocuments(prev => ({ ...prev, driverLicense: '' }))
                                        setKycDocumentFileIds(prev => ({ ...prev, driverLicense: '' }))
                                        setKycDocumentSizes(prev => ({ ...prev, driverLicense: 0 }))
                                        toast.success("Document removed")
                                        await refetchProfile()
                                      } catch (error) {
                                        console.error('Error removing driver license:', error)
                                        toast.error("Failed to remove document")
                                      } finally {
                                        setDeletingKYC(prev => ({ ...prev, driverLicense: false }))
                                      }
                                    }}
                                    disabled={deletingKYC.driverLicense}
                                    className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                                  >
                                    {deletingKYC.driverLicense ? (
                                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                    ) : (
                                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <label className="cursor-pointer flex flex-col items-center gap-1.5 sm:gap-2 w-full">
                                <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                                <span className="text-xs sm:text-sm text-muted-foreground">Click to upload</span>
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0]
                                    if (!file || !user?.uid) {
                                      e.target.value = ''
                                      return
                                    }
                                    setUploadingKYC(prev => ({ ...prev, driverLicense: true }))
                                    try {
                                      const result = await uploadToImageKit(file, 'kyc', user.uid)
                                      await userService.upsertProfile(user.uid, {
                                        kycDocuments: { ...kycDocuments, driverLicense: result.url }
                                      })
                                      setKycDocuments(prev => ({ ...prev, driverLicense: result.url }))
                                      toast.success("Driver's License uploaded successfully")
                                      await refetchProfile()
                                    } catch (error) {
                                      console.error("Upload error:", error)
                                      toast.error(error instanceof Error ? error.message : "Failed to upload document")
                                    } finally {
                                      setUploadingKYC(prev => ({ ...prev, driverLicense: false }))
                                      // Reset the input so the same file can be selected again if needed
                                      e.target.value = ''
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
                              dateOfBirth: profileData.dateOfBirth || undefined,
                              gender: profileData.gender || undefined,
                              maritalStatus: profileData.maritalStatus || undefined,
                              address: {
                                street: profileData.address.street,
                                city: profileData.address.city,
                                state: profileData.address.state,
                                country: profileData.address.country,
                                postalCode: profileData.address.postalCode
                              }
                            } as any)
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
                        className="h-9 sm:h-10 md:h-11 text-xs sm:text-sm md:text-base w-full sm:w-auto"
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
                    <div className="space-y-4 sm:space-y-5 md:space-y-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="business-name" className="text-xs sm:text-sm">Business Name</Label>
                        <Input id="business-name" placeholder="Enter your business name" className="h-9 sm:h-10 text-xs sm:text-sm" />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="business-type" className="text-xs sm:text-sm">Business Type</Label>
                        <Select defaultValue={profile?.businessType || "freelancer"}>
                    <SelectTrigger id="business-type" className="h-9 sm:h-10 text-xs sm:text-sm">
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
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="business-address" className="text-xs sm:text-sm">Business Address</Label>
                        <Input id="business-address" placeholder="Enter your business address" className="h-9 sm:h-10 text-xs sm:text-sm" />
                      </div>
                      <div className="flex justify-end">
                        <Button size="lg" className="h-9 sm:h-10 md:h-11 text-xs sm:text-sm md:text-base w-full sm:w-auto">Save Changes</Button>
                </div>
              </div>
            </Card>
                </TabsContent>
              )}

              {/* Subscription Tab */}
              <TabsContent value="subscription" className="mt-0">
                <Card className="p-4 sm:p-6 md:p-8">
                  <div className="mb-4 sm:mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
                      <div>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">Subscription & Limits</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          Manage your subscription plan and view usage limits
                        </p>
                      </div>
                      <Badge variant={isSubscribed && !isExpired ? "default" : isExpired ? "destructive" : "secondary"} className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 w-fit">
                        {isExpired ? "Expired" : isSubscribed ? `Subscribed - ${subscriptionType}` : "Not Subscribed"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {/* Show warning banner if subscription is expiring soon or expired (2 days before through 2 days after) */}
                    {isExpiringSoon && subscriptionType && subscriptionExpiryDate && (
                      <div className={`p-4 sm:p-5 md:p-6 border rounded-lg ${
                        isExpired 
                          ? 'border-red-500/20 bg-red-500/10' 
                          : 'border-amber-500/20 bg-amber-500/10'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                          <div className="flex-1">
                            <h3 className={`text-base sm:text-lg font-semibold mb-1 ${
                              isExpired 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              {isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon'}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {isExpired 
                                ? `Your subscription expired on ${new Date(subscriptionExpiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Please renew to continue using all features.`
                                : `Your subscription will expire on ${new Date(subscriptionExpiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Renew now to avoid interruption.`}
                            </p>
                          </div>
                          <OneTouchResubscribeButton
                            variant="default"
                            size="default"
                            className="w-full sm:w-auto text-xs sm:text-sm h-9 sm:h-10 shrink-0"
                          />
                        </div>
                      </div>
                    )}
                    {(!isSubscribed || isExpired) ? (
                      <div className="space-y-3 sm:space-y-4">
                        <div className="p-4 sm:p-5 md:p-6 border rounded-lg bg-muted/50">
                          <h3 className="text-base sm:text-lg font-semibold mb-2">Choose a Subscription Plan</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                            Select a plan to unlock all features and start managing your taxes efficiently.
                          </p>
                          <div className={`grid gap-3 sm:gap-4 ${!sidebarCollapsed ? 'grid-cols-1 md:grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
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
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-semibold">
                                {profile.transactionCount || 0} / {userService.getTransactionLimit(profile.subscriptionType || null) === Infinity ? '∞' : userService.getTransactionLimit(profile.subscriptionType || null)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (!user?.uid) return
                                  setIsSaving(true)
                                  try {
                                    const result = await userService.syncTransactionCount(user.uid)
                                    if (result.success) {
                                      toast.success(result.message || 'Transaction count synced successfully')
                                      await refetchProfile()
                                    } else {
                                      toast.error(result.error || 'Failed to sync transaction count')
                                    }
                                  } catch (error) {
                                    console.error('Error syncing transaction count:', error)
                                    toast.error('Failed to sync transaction count')
                                  } finally {
                                    setIsSaving(false)
                                  }
                                }}
                                disabled={isSaving}
                                className="h-6 w-6 p-0"
                                title="Sync transaction count"
                              >
                                <Loader2 className={`h-3 w-3 ${isSaving ? 'animate-spin' : ''}`} />
                              </Button>
                            </div>
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
                  <div className="space-y-4 sm:space-y-5 md:space-y-6">
                    <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-4">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <Label className="text-sm sm:text-base">Email Notifications</Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">Receive email alerts for reminders and deadlines</p>
                      </div>
                      <Switch 
                        checked={notificationPreferences.emailNotifications}
                        onCheckedChange={async (checked) => {
                          setNotificationPreferences(prev => ({ ...prev, emailNotifications: checked }))
                          
                          // Auto-save on toggle
                          if (!user?.uid) {
                            toast.error("User not authenticated")
                            return
                          }
                          
                          try {
                            const result = await userService.updatePreferences(user.uid, {
                              currency: profile?.preferences?.currency || 'NGN',
                              theme: profile?.preferences?.theme || 'system',
                              notifications: checked || notificationPreferences.smsNotifications, // Legacy field
                              emailNotifications: checked,
                              smsNotifications: notificationPreferences.smsNotifications
                            })
                            
                            if (result.success) {
                              toast.success(`Email notifications ${checked ? 'enabled' : 'disabled'}`)
                              refetchProfile()
                            } else {
                              toast.error(result.error || "Failed to save preferences")
                              // Revert on error
                              setNotificationPreferences(prev => ({ ...prev, emailNotifications: !checked }))
                            }
                          } catch (error) {
                            console.error("Error saving preferences:", error)
                            toast.error("Failed to save notification preferences")
                            // Revert on error
                            setNotificationPreferences(prev => ({ ...prev, emailNotifications: !checked }))
                          }
                        }}
                        className="flex-shrink-0" 
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-4 bg-muted/20">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <Label className="text-sm sm:text-base">SMS Notifications</Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Coming soon — SMS alerts for reminders and deadlines.
                        </p>
                      </div>
                      <Switch 
                        checked={false}
                        disabled
                        className="flex-shrink-0" 
                      />
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
                  <div className="space-y-4 sm:space-y-5 md:space-y-6 max-w-2xl">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="current-password" className="text-xs sm:text-sm">Current Password</Label>
                      <Input 
                        id="current-password" 
                        type="password" 
                        placeholder="Enter your current password" 
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        disabled={isUpdatingPassword}
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="new-password" className="text-xs sm:text-sm">New Password</Label>
                      <Input 
                        id="new-password" 
                        type="password" 
                        placeholder="Enter your new password (min. 6 characters)" 
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        disabled={isUpdatingPassword}
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="confirm-password" className="text-xs sm:text-sm">Confirm New Password</Label>
                      <Input 
                        id="confirm-password" 
                        type="password" 
                        placeholder="Confirm your new password" 
                        className="h-9 sm:h-10 text-xs sm:text-sm"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        disabled={isUpdatingPassword}
                      />
                      {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                        <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                      )}
                    </div>
                    <div className="flex justify-end pt-2 sm:pt-4">
                      <Button 
                        size="lg" 
                        className="h-9 sm:h-10 md:h-11 text-xs sm:text-sm md:text-base w-full sm:w-auto"
                        onClick={async () => {
                          if (!user?.email) {
                            toast.error("User not authenticated")
                            return
                          }

                          // Validation
                          if (!passwordData.currentPassword) {
                            toast.error("Please enter your current password")
                            return
                          }

                          if (!passwordData.newPassword) {
                            toast.error("Please enter a new password")
                            return
                          }

                          if (passwordData.newPassword.length < 6) {
                            toast.error("Password must be at least 6 characters long")
                            return
                          }

                          if (passwordData.newPassword !== passwordData.confirmPassword) {
                            toast.error("Passwords do not match")
                            return
                          }

                          if (passwordData.currentPassword === passwordData.newPassword) {
                            toast.error("New password must be different from current password")
                            return
                          }

                          setIsUpdatingPassword(true)
                          try {
                            const currentUser = auth.currentUser
                            if (!currentUser || !currentUser.email) {
                              toast.error("User not authenticated")
                              return
                            }

                            // Reauthenticate user with current password
                            const credential = EmailAuthProvider.credential(
                              currentUser.email,
                              passwordData.currentPassword
                            )
                            
                            await reauthenticateWithCredential(currentUser, credential)

                            // Update password
                            await updatePassword(currentUser, passwordData.newPassword)

                            toast.success("Password updated successfully!")
                            
                            // Clear form
                            setPasswordData({
                              currentPassword: '',
                              newPassword: '',
                              confirmPassword: ''
                            })
                          } catch (error: any) {
                            console.error("Error updating password:", error)
                            
                            let errorMessage = "Failed to update password"
                            if (error.code === 'auth/wrong-password') {
                              errorMessage = "Current password is incorrect"
                            } else if (error.code === 'auth/weak-password') {
                              errorMessage = "Password is too weak. Please choose a stronger password"
                            } else if (error.code === 'auth/requires-recent-login') {
                              errorMessage = "Please log out and log back in before changing your password"
                            } else if (error.message) {
                              errorMessage = error.message
                            }
                            
                            toast.error(errorMessage)
                          } finally {
                            setIsUpdatingPassword(false)
                          }
                        }}
                        disabled={isUpdatingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword}
                      >
                        {isUpdatingPassword ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Update Password"
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Support Tab */}
              <TabsContent value="support" className="mt-0">
                <Card className="p-4 sm:p-6 md:p-8">
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">Get Support</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Contact our support team via email or WhatsApp
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Email Support Form */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Mail className="w-5 h-5 text-primary" />
                        <h3 className="text-base sm:text-lg font-semibold">Send us an Email</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1.5 sm:space-y-2">
                          <Label htmlFor="support-category" className="text-xs sm:text-sm">Category</Label>
                          <Select
                            value={supportForm.category}
                            onValueChange={(value) => setSupportForm(prev => ({ ...prev, category: value }))}
                          >
                            <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General Inquiry</SelectItem>
                              <SelectItem value="technical">Technical Issue</SelectItem>
                              <SelectItem value="billing">Billing & Subscription</SelectItem>
                              <SelectItem value="feature">Feature Request</SelectItem>
                              <SelectItem value="bug">Bug Report</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5 sm:space-y-2">
                          <Label htmlFor="support-subject" className="text-xs sm:text-sm">Subject</Label>
                          <Input
                            id="support-subject"
                            value={supportForm.subject}
                            onChange={(e) => setSupportForm(prev => ({ ...prev, subject: e.target.value }))}
                            placeholder="Brief description of your issue"
                            className="h-9 sm:h-10 text-xs sm:text-sm"
                          />
                        </div>

                        <div className="space-y-1.5 sm:space-y-2">
                          <Label htmlFor="support-message" className="text-xs sm:text-sm">Message</Label>
                          <Textarea
                            id="support-message"
                            value={supportForm.message}
                            onChange={(e) => setSupportForm(prev => ({ ...prev, message: e.target.value }))}
                            placeholder="Please provide details about your issue or question..."
                            rows={6}
                            className="text-xs sm:text-sm resize-none"
                          />
                        </div>

                        <Button
                          onClick={async () => {
                            if (!supportForm.subject.trim() || !supportForm.message.trim()) {
                              toast.error("Please fill in both subject and message")
                              return
                            }

                            setIsSendingSupport(true)
                            try {
                              const currentUser = auth.currentUser
                              if (!currentUser) {
                                toast.error("Please log in to send support request")
                                return
                              }

                              const token = await currentUser.getIdToken()
                              const response = await fetch("/api/support/send-email", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                  subject: supportForm.subject,
                                  message: supportForm.message,
                                  category: supportForm.category
                                })
                              })

                              const data = await response.json()

                              if (data.success) {
                                toast.success(data.message || "Support request sent successfully!")
                                setSupportForm({
                                  subject: '',
                                  message: '',
                                  category: 'general'
                                })
                              } else {
                                toast.error(data.error || "Failed to send support request")
                              }
                            } catch (error) {
                              console.error("Error sending support request:", error)
                              toast.error("An error occurred. Please try again.")
                            } finally {
                              setIsSendingSupport(false)
                            }
                          }}
                          disabled={isSendingSupport || !supportForm.subject.trim() || !supportForm.message.trim()}
                          className="w-full sm:w-auto"
                        >
                          {isSendingSupport ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send Email
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* WhatsApp Support */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <h3 className="text-base sm:text-lg font-semibold">Chat with us on WhatsApp</h3>
                      </div>
                      
                      <div className="bg-muted/50 border border-border rounded-lg p-4 sm:p-6">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                          Get instant support by messaging us on WhatsApp. Our team typically responds within 24 hours.
                        </p>
                        
                        <Button
                          onClick={() => {
                            // Get WhatsApp number from environment or use default
                            const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '2348128543248'
                            const subscriptionInfo = subscriptionType ? `Subscription: ${subscriptionType}` : 'Subscription: None'
                            const whatsappMessage = encodeURIComponent(
                              `Hello! I need support with OTax.\n\n` +
                              `My email: ${user?.email || 'N/A'}\n` +
                              `User ID: ${user?.uid || 'N/A'}\n` +
                              `${subscriptionInfo}\n\n` +
                              `How can you help me?`
                            )
                            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
                            window.open(whatsappUrl, '_blank')
                          }}
                          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Open WhatsApp
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>

                    {/* Additional Support Info */}
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 sm:p-6">
                      <h4 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        Need Help?
                      </h4>
                      <ul className="text-xs sm:text-sm text-muted-foreground space-y-1.5">
                        <li>• Check our FAQ section for common questions</li>
                        <li>• Response time: We typically respond within 24-48 hours</li>
                        <li>• For urgent billing issues, please use WhatsApp for faster response</li>
                        <li>• Include your User ID when contacting support for faster assistance</li>
                      </ul>
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

      {/* Migration modal */}
      {selectedPlan && (
        <MigrateToCreatorModal
          open={showMigrationModal}
          onOpenChange={(isOpen) => {
            setShowMigrationModal(isOpen)
            if (!isOpen) {
              setSelectedPlan(null)
            }
          }}
          planType={selectedPlan}
          onConfirm={handleMigrateAndSubscribe}
        />
      )}

    </>
  )
}


