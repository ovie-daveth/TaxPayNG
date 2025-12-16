"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calculator, Eye, EyeOff, MapPin } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useTheme } from "next-themes"
import Image from "next/image"
import { toast } from "sonner"
import { TokenInputDialog } from "@/components/waitlist/token-input-dialog"
import { sendSignupVerification } from "@/lib/utils/emailVerification"

const LogoImage = () => {
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

type SignupBusinessType = '' | 'freelancer' | 'creator' | 'sme' | 'large_corporation' | 'agent'
type AllowedBusinessType = Extract<SignupBusinessType, 'freelancer' | 'creator' | 'sme' | 'agent'>
type SignupPayload = {
  email: string
  password: string
  firstName: string
  lastName: string
  businessType: AllowedBusinessType
  agentStates?: string[]
  phone?: string
}

export default function SignupPage() {
  const router = useRouter()
  const { signUp, user, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showComingSoonModal, setShowComingSoonModal] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [formData, setFormData] = useState<{
    fullName: string
    email: string
    businessType: SignupBusinessType
    password: string
    confirmPassword: string
    phone: string
    agentStates: string[]
  }>({
    fullName: '',
    email: '',
    businessType: '',
    password: '',
    confirmPassword: '',
    phone: '',
    agentStates: []
  })
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [pendingEmail, setPendingEmail] = useState("")
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
  const pendingSignupDataRef = useRef<SignupPayload | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  // Redirect to login after successful signup (no auto-login)
  // For agents, redirect to agent KYC page after login
  useEffect(() => {
    if (signupSuccess && !loading && !user) {
      console.log("Signup successful, redirecting to /login")
      // Store that this is an agent signup for redirect after login
      if (formData.businessType === 'agent') {
        sessionStorage.setItem('agentSignup', 'true')
      }
      router.push("/login")
    }
  }, [signupSuccess, loading, user, router, formData.businessType])

  const isSME = formData.businessType === 'sme'
  const isCreator = formData.businessType === 'creator'
  const isAgent = formData.businessType === 'agent'
  const businessNameLabel = isSME ? 'Company Name' : isCreator ? 'Creator or Brand Name' : isAgent ? 'Full Name' : 'Full Name'
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
        ...(payload.businessType === 'agent' && {
          phone: payload.phone,
          agentStates: payload.agentStates
        })
      })

      console.log("result now", result)

      if (result?.success) {
        toast.success('Account created successfully! Please log in to continue.')
        setVerifiedEmail(payload.email.toLowerCase())
        setSignupSuccess(true)
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
    if (!['freelancer', 'creator', 'sme', 'agent'].includes(formData.businessType)) {
      toast.error('Please select a supported business type')
      return
    }

    // Validate agent-specific fields
    if (formData.businessType === 'agent') {
      if (!formData.phone || formData.phone.trim() === '') {
        toast.error('Phone number is required for agents')
        return
      }
      if (formData.agentStates.length === 0) {
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
      ...(formData.businessType === 'agent' && {
        phone: formData.phone.trim(),
        agentStates: formData.agentStates
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
                  <SelectItem value="freelancer">Freelancer</SelectItem>
                  <SelectItem value="creator">Creator / Influencer</SelectItem>
                  <SelectItem value="sme">Small Business</SelectItem>
                  <SelectItem value="agent">Tax Filing Agent</SelectItem>
                  <SelectItem value="large_corporation">Large Corporation</SelectItem>
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

            {/* Agent-specific fields */}
            {isAgent && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number *</Label>
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
                    Required for agent registration
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">States You Can Handle *</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                    Select all states where you can provide tax filing services
                  </p>
                  <div className="border-2 rounded-xl p-4 max-h-48 sm:max-h-56 overflow-y-auto space-y-2.5 bg-muted/30">
                    {NIGERIAN_STATES.map((state) => (
                      <div key={state} className="flex items-center space-x-2.5">
                        <Checkbox
                          id={`state-${state}`}
                          checked={formData.agentStates.includes(state)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({
                                ...prev,
                                agentStates: [...prev.agentStates, state]
                              }))
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                agentStates: prev.agentStates.filter(s => s !== state)
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
                  {formData.agentStates.length > 0 && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                      {formData.agentStates.length} state{formData.agentStates.length !== 1 ? 's' : ''} selected
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
      successMessage="Email verified! Completing your signup..."
      onVerified={handleTokenVerified}
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
