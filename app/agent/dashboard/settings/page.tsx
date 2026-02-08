"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { userService } from "@/lib/services"
import { toast } from "sonner"
import { 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Save,
  Bell,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  FileText,
  Camera,
  Upload,
  X
} from "lucide-react"
import { useRouter } from "next/navigation"
import { isConsultant } from "@/lib/utils/businessTypeHelpers"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { auth } from "@/firebase/firebase"

export default function ConsultantSettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()

  // Profile settings
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [bio, setBio] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [yearsOfExperience, setYearsOfExperience] = useState('')
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [marketingEmails, setMarketingEmails] = useState(false)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Profile picture
  const [profilePicture, setProfilePicture] = useState('')
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false)

  // Loading states
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Document modal state
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [documentUrl, setDocumentUrl] = useState('')
  const [documentTitle, setDocumentTitle] = useState('')

  useEffect(() => {
    // Wait for loading to complete
    if (authLoading || profileLoading) return

    // Redirect if no user
    if (!user) {
      router.push('/login')
      return
    }

    // Wait for profile to load before checking
    if (!profile) return

    // Check if user is a consultant
    if (!isConsultant(profile.businessType)) {
      router.push('/dashboard')
      return
    }

    // Load existing data only after all checks pass
    setFullName(profile.firstName + ' ' + profile.lastName || '')
    setEmail(user.email || '')
    setPhoneNumber(profile.phone || profile?.phoneNumber || '')
    setBusinessName(profile.consultantPortfolio?.businessName || '')
    setBusinessAddress(profile.consultantPortfolio?.location || '')
    setBio(profile.consultantPortfolio?.bio || '')
    setSpecialization(profile.consultantPortfolio?.specializations?.join(', ') || '')
    setYearsOfExperience(profile.consultantPortfolio?.experience || '')
    setProfilePicture(profile.profilePicture || '')
    
    // Load notification preferences
    setEmailNotifications(profile.preferences?.emailNotifications ?? true)
    setSmsNotifications(profile.preferences?.smsNotifications ?? false)
    setMarketingEmails(profile.preferences?.marketing ?? false)
  }, [user, profile, authLoading, profileLoading, router])

  const handleProfilePictureUpload = async (file: File) => {
    if (!user?.uid) return

    setUploadingProfilePicture(true)
    try {
      const result = await uploadToImageKit(file, 'profile-pictures')
      
      await userService.upsertProfile(user.uid, {
        profilePicture: result.url
      })
      
      setProfilePicture(result.url)
      await refetchProfile()
      toast.success("Profile picture updated successfully")
    } catch (error) {
      console.error("Error uploading profile picture:", error)
      toast.error("Failed to upload profile picture")
    } finally {
      setUploadingProfilePicture(false)
    }
  }

  const handleRemoveProfilePicture = async () => {
    if (!user?.uid) return

    try {
      await userService.upsertProfile(user.uid, {
        profilePicture: ''
      })
      
      setProfilePicture('')
      await refetchProfile()
      toast.success("Profile picture removed")
    } catch (error) {
      console.error("Error removing profile picture:", error)
      toast.error("Failed to remove profile picture")
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.uid) return

    if (!fullName.trim()) {
      toast.error("Full name is required")
      return
    }

    if (!phoneNumber.trim()) {
      toast.error("Phone number is required")
      return
    }

    setSavingProfile(true)
    try {
      await userService.upsertProfile(user.uid, {
         firstName: fullName.split(' ')[0],
        lastName: fullName.split(' ').slice(1).join(' '),
        phone: phoneNumber,
        phoneNumber: phoneNumber, // For backward compatibility
        consultantPortfolio: {
            location: businessName, // Store business name in location field
            bio,
            specializations: specialization.split(',').map(s => s.trim()),
            experience: yearsOfExperience
        }
      })

      await refetchProfile()
      toast.success("Profile updated successfully")
    } catch (error) {
      console.error("Error saving profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveNotifications = async () => {
    if (!user?.uid) return
    setSavingNotifications(true)
    try {
      await userService.upsertProfile(user.uid, {
        preferences: {
          currency: profile?.preferences?.currency || 'NGN',
          notifications: profile?.preferences?.notifications ?? true,
          theme: profile?.preferences?.theme || 'system',
          emailNotifications: emailNotifications,
          smsNotifications: smsNotifications,
          marketing: marketingEmails,
        }
      })

      await refetchProfile()
      toast.success("Notification preferences updated")
    } catch (error) {
      console.error("Error saving notifications:", error)
      toast.error("Failed to update notification preferences")
    } finally {
      setSavingNotifications(false)
    }
  }

  const handleChangePassword = async () => {
    if (!auth.currentUser) return

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required")
      return
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    setChangingPassword(true)
    try {
      // Re-authenticate user
      if (!auth.currentUser.email) {
        toast.error("User email not found")
        return
      }

      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      )
      
      await reauthenticateWithCredential(auth.currentUser, credential)
      
      // Update password
      await updatePassword(auth.currentUser, newPassword)
      
      // Clear fields
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      toast.success("Password changed successfully")
    } catch (error: any) {
      console.error("Error changing password:", error)
      
      if (error.code === 'auth/wrong-password') {
        toast.error("Current password is incorrect")
      } else if (error.code === 'auth/weak-password') {
        toast.error("New password is too weak")
      } else {
        toast.error("Failed to change password")
      }
    } finally {
      setChangingPassword(false)
    }
  }

  const handleViewDocument = (url: string, title: string) => {
    setDocumentUrl(url)
    setDocumentTitle(title)
    setShowDocumentModal(true)
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || !profile || !isConsultant(profile.businessType)) {
    return null
  }

  return (
    <div className="">
      <div className="container ">
        {/* KYC Status Alert */}
        {!profile.consultantKycCompleted && (
          <Alert className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
              <strong>KYC Verification Pending:</strong> Complete your KYC verification to access all consultant features.
              <Button
                variant="link"
                className="ml-2 h-auto p-0 text-amber-900 dark:text-amber-100"
                onClick={() => router.push('/agent/kyc')}
              >
                Complete KYC →
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {profile.consultantKycCompleted && (
          <Alert className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
            <AlertDescription className="text-sm text-green-800 dark:text-green-200">
              <strong>KYC Verified:</strong> Your account is fully verified and active.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Profile Picture
              </CardTitle>
              <CardDescription>
                Upload a professional profile picture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 bg-muted flex items-center justify-center">
                    {profilePicture ? (
                      <img 
                        src={profilePicture} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-16 h-16 text-muted-foreground" />
                    )}
                  </div>
                  {uploadingProfilePicture && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-3">
                  <label className="cursor-pointer">
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload New Picture
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleProfilePictureUpload(file)
                      }}
                      disabled={uploadingProfilePicture}
                    />
                  </label>
                  
                  {profilePicture && (
                    <Button
                      variant="outline"
                      onClick={handleRemoveProfilePicture}
                      disabled={uploadingProfilePicture}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove Picture
                    </Button>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal and professional details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+234 XXX XXX XXXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    placeholder="5"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName">Business/Firm Name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="ABC Tax Consultancy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessAddress">Business Address</Label>
                <Input
                  id="businessAddress"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="123 Business Street, Lagos, Nigeria"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Areas of Specialization</Label>
                <Input
                  id="specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g., Corporate Tax, VAT, Personal Income Tax"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell clients about your experience and expertise..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Brief description of your professional background and services
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  size="lg"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications" className="text-base">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about client activities and tax updates
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="smsNotifications" className="text-base">
                    SMS Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get important alerts via text message
                  </p>
                </div>
                <Switch
                  id="smsNotifications"
                  checked={smsNotifications}
                  onCheckedChange={setSmsNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketingEmails" className="text-base">
                    Marketing Emails
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about new features and promotions
                  </p>
                </div>
                <Switch
                  id="marketingEmails"
                  checked={marketingEmails}
                  onCheckedChange={setMarketingEmails}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveNotifications}
                  disabled={savingNotifications}
                  size="lg"
                >
                  {savingNotifications ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  size="lg"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Certification Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Certification & Documents
              </CardTitle>
              <CardDescription>
                Manage your professional certifications and KYC documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profile.consultantCertification && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">Tax Consultant Certification</p>
                        <p className="text-sm text-muted-foreground">Uploaded and verified</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocument(profile.consultantCertification!, 'Tax Consultant Certification')}
                    >
                      View
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">KYC Documents</p>
                      <p className="text-sm text-muted-foreground">
                        {profile.consultantKycCompleted ? 'Verified' : 'Pending verification'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/agent/kyc')}
                  >
                    {profile.consultantKycCompleted ? 'View' : 'Complete'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{documentTitle}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 h-[70vh] overflow-auto">
            {documentUrl && (
              <iframe
                src={documentUrl}
                className="w-full h-full border-0 rounded-lg"
                title={documentTitle}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}