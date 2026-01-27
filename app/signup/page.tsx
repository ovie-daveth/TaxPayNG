"use client"

import type React from "react"
import { Suspense } from "react"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calculator, Eye, EyeOff, MapPin } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useTheme } from "next-themes"
import Image from "next/image"
import { toast } from "sonner"
import { TokenInputDialog } from "@/components/waitlist/token-input-dialog"
import { sendSignupVerification } from "@/lib/utils/emailVerification"
import { Separator } from "@/components/ui/separator"
import { BusinessType } from "@/lib/types"
import { GoogleBusinessTypeDialog } from "@/components/auth/google-business-type-dialog"
import { PhoneVerificationDialog } from "@/components/auth/phone-verification-dialog"

function LogoImage(): React.JSX.Element {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return (
      <Image
        src="/logootax_bg.png"
        alt="OTax Logo"
        width={120}
        height={40}
        className="h-10 sm:h-12 w-auto"
        priority
      />
    )
  }
  
  const isDark = resolvedTheme === 'dark' || theme === 'dark'
  
  return (
    <Image
      src={isDark ? '/darklogo-bg.png' : '/logootax_bg.png'}
      alt="OTax Logo"
      width={120}
      height={40}
      className="h-10 sm:h-12 w-auto"
      priority
    />
  )
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"
]

type SignupBusinessType = '' | 'freelancer' | 'creator' | 'sme' | 'large_corporation' | 'consultant'
type AllowedBusinessType = Extract<SignupBusinessType, 'freelancer' | 'creator' | 'sme' | 'consultant'>
type SignupPayload = {
  email: string
  password: string
  firstName: string
  lastName: string
  businessType: AllowedBusinessType
  consultantStates?: string[]
  phone?: string
}

function SignupPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, signUpWithGoogle, user, loading } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showComingSoonModal, setShowComingSoonModal] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null)
  const [showGoogleBusinessTypeDialog, setShowGoogleBusinessTypeDialog] = useState(false)
  const [formData, setFormData] = useState<{
    fullName: string
    email: string
    businessType: SignupBusinessType
    password: string
    confirmPassword: string
    phone: string
    consultantStates: string[]
  }>({
    fullName: '',
    email: '',
    businessType: '',
    password: '',
    confirmPassword: '',
    phone: '',
    consultantStates: []
  })
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [pendingEmail, setPendingEmail] = useState("")
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
  const pendingSignupDataRef = useRef<SignupPayload | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showPhoneVerification, setShowPhoneVerification] = useState(false)
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null)

  const handleGoogleSignUp = async () => {
    // Separate flow: Google signup uses popup to select business type
    setShowGoogleBusinessTypeDialog(true)
  }

  const handleGoogleBusinessTypeSelected = async (businessType: BusinessType) => {
    setShowGoogleBusinessTypeDialog(false)
    setIsGoogleLoading(true)
    try {
      const result = await signUpWithGoogle(businessType)
      if (!result.success) {
        if (result.error === "ACCOUNT_EXISTS") {
          toast.error("An account with this Google email already exists. Please log in instead.")
          router.push("/login")
          return
        }
        toast.error(result.error || "Failed to sign up with Google")
        return
      }

      toast.success(result.isNewUser ? "Account created successfully with Google!" : "Signed in with Google successfully!")
      await refetchProfile()
      setSignupSuccess(true)
    } catch (e) {
      console.error("Google signup error:", e)
      toast.error("Failed to sign up with Google")
    } finally {
      setIsGoogleLoading(false)
    }
  }
  
  // Check for invoiceId in URL params
  useEffect(() => {
    const invoiceId = searchParams?.get('invoiceId')
    const email = searchParams?.get('email')
    if (invoiceId) {
      setPendingInvoiceId(invoiceId)
    }
    if (email && !formData.email) {
      setFormData(prev => ({ ...prev, email: decodeURIComponent(email) }))
    }
  }, [searchParams])

  // Redirect to login after successful signup (no auto-login) - for email/password signup
  // For tax consultants, redirect to consultant KYC page after login
  useEffect(() => {
    if (signupSuccess && !loading && !user) {
      console.log("Signup successful, redirecting to /login")
      // Store that this is a consultant signup for redirect after login
      if (formData.businessType === 'consultant') {
        sessionStorage.setItem('consultantSignup', 'true')
      }
      router.push("/login")
    }
  }, [signupSuccess, loading, user, router, formData.businessType])

  // Redirect after Google signup (user is already logged in)
  useEffect(() => {
    console.log("Signup redirect effect - user:", !!user, "loading:", loading, "profileLoading:", profileLoading, "profile:", !!profile, "signupSuccess:", signupSuccess)
    
    // Wait for profile to load
    if (loading || profileLoading || !user) {
      console.log("Signup redirect - still loading or no user, waiting...")
      return
    }

    // Only redirect if this was a Google signup (user is logged in but we're still on signup page)
    if (!user || !signupSuccess) {
      console.log("Signup redirect - no user or not signup success, not redirecting")
      return
    }

    // If profile is null, wait a bit more and try to refetch
    if (!profile) {
      console.log("Signup redirect - profile is null, refetching...")
      refetchProfile().catch(console.error)
      // Set a timeout to retry after a short delay
      const timeout = setTimeout(() => {
        console.log("Signup redirect - profile still null after wait, refetching again...")
        refetchProfile().catch(console.error)
      }, 1000)
      return () => clearTimeout(timeout)
    }

    console.log("Signup redirect - profile loaded, businessType:", profile.businessType, "taxId:", !!profile.taxId)

    // Tax Consultant-specific redirects
    if (profile.businessType === 'consultant') {
      if (profile.consultantKycCompleted !== true) {
        router.push("/consultant/kyc")
        return
      }
      router.push("/consultant/dashboard")
      return
    }

    // Check if user needs to verify TIN or upload documents
    if (!profile.taxId) {
      router.push("/verify-tin")
      return
    }

    if (profile.businessType === 'sme' && !profile.businessDocuments) {
      router.push("/verify-tin")
      return
    }

    // Redirect based on business type
    if (profile.businessType === 'creator') {
      router.push("/dashboard-creator")
      return
    }

    if (profile.businessType === 'sme') {
      router.push("/dashboard-sme")
      return
    }

    // Default to freelancer dashboard
    console.log("Signup redirect - default, redirecting to dashboard")
    router.push("/dashboard")
  }, [user, profile, loading, profileLoading, signupSuccess, router, refetchProfile])

  const isSME = formData.businessType === 'sme'
  const isCreator = formData.businessType === 'creator'
  const isConsultant = formData.businessType === 'consultant'
  const businessNameLabel = isSME ? 'Company Name' : isCreator ? 'Creator or Brand Name' : isConsultant ? 'Full Name' : 'Full Name'
  const businessNamePlaceholder = isSME
    ? 'Acme Corporation Ltd'
    : isCreator
      ? 'Jane Creator Studios'
      : 'John Doe'

  const completeSignup = async (payload: SignupPayload) => {
    try {
      setIsLoading(true)
      const result = await signUp({
        email: payload.email,
        password: payload.password,
        firstName: payload.firstName,
        lastName: payload.lastName,
        businessType: payload.businessType,
        phone: payload.phone,
        ...(payload.businessType === 'consultant' && {
          consultantStates: payload.consultantStates
        })
      })

      console.log("result now", result)

      if (result?.success) {
        // Link invoice if invoiceId was in URL
        if (pendingInvoiceId && 'userId' in result && result.userId) {
          try {
            const linkResponse = await fetch('/api/invoices/link-to-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                invoiceId: pendingInvoiceId,
                userId: result.userId,
                email: payload.email.toLowerCase()
              })
            })
            
            if (linkResponse.ok) {
              // Store invoiceId for redirect after login
              sessionStorage.setItem('pendingInvoiceId', pendingInvoiceId)
            }
          } catch (error) {
            console.error('Error linking invoice:', error)
            // Don't fail signup if invoice linking fails
          }
        }
        
        toast.success('Account created successfully!')
        setVerifiedEmail(payload.email.toLowerCase())
        
        // Show phone verification dialog
        setShowPhoneVerification(true)
      } else {
        toast.error(result?.error || 'Failed to create account')
      }
    } catch (error) {
      console.error("Signup completion error:", error)
      toast.error('Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneVerified = () => {
    setVerifiedPhone(formData.phone)
    toast.success('Phone verified! Please log in to continue.')
    setSignupSuccess(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    // Validate business type is selected
    if (!formData.businessType) {
      toast.error('Please select a business type')
      return
    }

    // Validate supported business type
    if (!['freelancer', 'creator', 'sme', 'consultant'].includes(formData.businessType)) {
      toast.error('Please select a supported business type')
      return
    }

    // Validate phone number (required for all users)
    if (!formData.phone || formData.phone.trim() === '') {
      toast.error('Phone number is required')
      return
    }

    // Validate consultant-specific fields
    if (formData.businessType === 'consultant') {
      if (formData.consultantStates.length === 0) {
        toast.error('Please select at least one state you can handle')
        return
      }
    }

    // Split full name into first and last name
    const trimmedFullName = formData.fullName.trim()
    const nameParts = trimmedFullName.split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const businessType = formData.businessType as AllowedBusinessType
    const trimmedEmail = formData.email.trim().toLowerCase()

    if (trimmedEmail !== formData.email) {
      setFormData(prev => ({ ...prev, email: trimmedEmail }))
    }

    const payload: SignupPayload = {
      email: trimmedEmail,
      password: formData.password,
      firstName,
      lastName,
      businessType,
      phone: formData.phone.trim(),
      ...(formData.businessType === 'consultant' && {
        consultantStates: formData.consultantStates
      })
    }

    // If email already verified in this session for the same address, proceed directly
    if (verifiedEmail && verifiedEmail === trimmedEmail) {
      pendingSignupDataRef.current = null
      await completeSignup(payload)
      return
    }

    setIsLoading(true)
    const verificationToast = toast.loading("Sending verification code...")

    try {
      const verificationResult = await sendSignupVerification(
        trimmedEmail,
        trimmedFullName || firstName || 'there',
        businessType
      )

      toast.dismiss(verificationToast)

      if (!verificationResult.success) {
        toast.error(verificationResult.error || 'Failed to send verification email')
        return
      }

      pendingSignupDataRef.current = payload

      if (verificationResult.alreadyVerified) {
        const verified = (verificationResult.email ?? trimmedEmail).toLowerCase()
        setVerifiedEmail(verified)
        toast.success('Email already verified. Completing signup...')
        pendingSignupDataRef.current = null
        await completeSignup(payload)
        return
      }

      const emailForDialog = (verificationResult.email ?? trimmedEmail).toLowerCase()
      setPendingEmail(emailForDialog)
      setShowVerificationDialog(true)
      toast.success('Verification code sent! Please check your email.')
    } catch (error) {
      toast.dismiss(verificationToast)
      console.error('Error sending signup verification:', error)
      toast.error('Failed to send verification email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTokenVerified = async () => {
    const payload = pendingSignupDataRef.current

    if (!payload) {
      toast.error('Verification session expired. Please try again.')
      return
    }

    pendingSignupDataRef.current = null
    setVerifiedEmail(payload.email.toLowerCase())
    setPendingEmail('')
    await completeSignup(payload)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-md">
        <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl shadow-primary/5">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8 sm:mb-10">
            <LogoImage />
          </div>

          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Create your account
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Start managing your taxes in minutes
            </p>
          </div>

          <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
            {/* Business Type - First Field */}
            <div className="space-y-2">
              <Label htmlFor="businessType" className="text-sm font-medium">Business Type</Label>
              <Select 
                value={formData.businessType}
                onValueChange={(value) => {
                  if (value === 'large_corporation') {
                    setShowComingSoonModal(true)
                    // Revert to small business
                    setFormData(prev => ({ ...prev, businessType: 'sme' }))
                    return
                  }
                  setFormData(prev => ({ ...prev, businessType: value as AllowedBusinessType }))
                }}
              >
                <SelectTrigger id="businessType" className="h-11 sm:h-12 text-base border-2">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="freelancer">Freelancer/Self-Employed</SelectItem>
                  <SelectItem value="creator">Creator / Influencer</SelectItem>
                  <SelectItem value="sme">Small Business</SelectItem>
                  {/* <SelectItem value="consultant">Tax Consultant</SelectItem> */}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">
                {businessNameLabel}
              </Label>
              <Input 
                id="fullName" 
                type="text" 
                placeholder={businessNamePlaceholder} 
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                required 
                className="h-11 sm:h-12 text-base border-2 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required 
                className="h-11 sm:h-12 text-base border-2 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Phone Number Field - Required for all users */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="08012345678" 
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required 
                className="h-11 sm:h-12 text-base border-2 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                You'll need to verify this number after signup
              </p>
            </div>

            {/* Tax Consultant-specific fields */}
            {isConsultant && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">States You Can Handle *</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                    Select all states where you can provide tax consultation services
                  </p>
                  <div className="border-2 rounded-xl p-4 max-h-48 sm:max-h-56 overflow-y-auto space-y-2.5 bg-muted/30">
                    {NIGERIAN_STATES.map((state) => (
                      <div key={state} className="flex items-center space-x-2.5">
                        <Checkbox
                          id={`state-${state}`}
                          checked={formData.consultantStates.includes(state)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({
                                ...prev,
                                consultantStates: [...prev.consultantStates, state]
                              }))
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                consultantStates: prev.consultantStates.filter(s => s !== state)
                              }))
                            }
                          }}
                        />
                        <Label
                          htmlFor={`state-${state}`}
                          className="text-sm font-normal cursor-pointer flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          {state}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.consultantStates.length > 0 && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                      {formData.consultantStates.length} state{formData.consultantStates.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative group">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required 
                  className="h-11 sm:h-12 text-base border-2 pr-12 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground hover:text-primary transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <div className="relative group">
                <Input 
                  id="confirmPassword" 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required 
                  className="h-11 sm:h-12 text-base border-2 pr-12 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground hover:text-primary transition-colors"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300" 
              size="lg" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Creating Account...
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 sm:mt-8 text-center">
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 sm:h-12 text-base sm:text-lg"
                onClick={handleGoogleSignUp}
                disabled={isLoading || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Continuing...
                  </span>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </div>

            <span className="text-sm sm:text-base text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="text-sm sm:text-base text-primary font-semibold hover:underline transition-colors">
              Log in
            </Link>
          </div>
        </div>

        <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6 sm:mt-8 px-4">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
        </p>
      </div>

    <TokenInputDialog
      open={showVerificationDialog}
      onOpenChange={setShowVerificationDialog}
      email={pendingEmail || formData.email.trim()}
      verifyEndpoint="/api/verify-signup-token"
      resendEndpoint="/api/send-signup-verification"
      resendBody={() => ({
        email: (pendingEmail || formData.email).trim(),
        name: (formData.fullName.trim() || "there"),
        businessType: formData.businessType || "freelancer",
      })}
      successMessage="Email verified! Completing your signup..."
      onVerified={handleTokenVerified}
    />

      <GoogleBusinessTypeDialog
        open={showGoogleBusinessTypeDialog}
        onOpenChange={setShowGoogleBusinessTypeDialog}
        onSelect={handleGoogleBusinessTypeSelected}
      />

      <PhoneVerificationDialog
        open={showPhoneVerification}
        onOpenChange={setShowPhoneVerification}
        phoneNumber={formData.phone}
        onVerified={handlePhoneVerified}
      />

      {/* Coming Soon Modal */}
      <Dialog open={showComingSoonModal} onOpenChange={setShowComingSoonModal}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Coming Soon</DialogTitle>
            <DialogDescription className="text-sm sm:text-base mt-2">
              Large corporation features are currently under development. For now, we've set your account as a Small Business. You can manage your employees, payroll, and PAYE tax with our Small Business plan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-6">
            <Button onClick={() => setShowComingSoonModal(false)} className="h-10 sm:h-11 text-sm sm:text-base">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <SignupPageContent />
    </Suspense>
  )
}
