"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useTheme } from "next-themes"
import Image from "next/image"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { GoogleBusinessTypeDialog } from "@/components/auth/google-business-type-dialog"
import { AuthLayoutSide } from "@/components/auth/auth-layout-side"
import { LandingReveal } from "@/components/landing-reveal"
import type { BusinessType } from "@/lib/types"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, signInWithGoogle, completeGoogleProfile, linkGoogleToEmailAccount, user, loading } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleOnlyUser, setIsGoogleOnlyUser] = useState(false)
  const [showLinkAccountDialog, setShowLinkAccountDialog] = useState(false)
  const [linkAccountEmail, setLinkAccountEmail] = useState('')
  const [linkAccountPassword, setLinkAccountPassword] = useState('')
  const [linkAccountCredential, setLinkAccountCredential] = useState<any>(null)
  const [isLinkingAccount, setIsLinkingAccount] = useState(false)
  const [showLinkPassword, setShowLinkPassword] = useState(false)
  const [showGoogleBusinessTypeDialog, setShowGoogleBusinessTypeDialog] = useState(false)

  useEffect(() => {
    // Wait for loading to complete
    if (loading || profileLoading) {
      console.log("Login redirect - still loading, waiting...")
      return
    }

    // If user is not logged in, don't redirect
    if (!user) {
      console.log("Login redirect - no user, not redirecting")
      return
    }

    // If user is logged in but profile is null, wait a bit more and try to refetch
    if (user && !profile) {
      console.log("Login page - user logged in but profile is null, waiting...")
      // Try to refetch the profile
      refetchProfile().catch(console.error)
      // Set a timeout to retry after a short delay
      const timeout = setTimeout(() => {
        console.log("Login redirect - profile still null after wait, checking again...")
        // Try refetching again
        refetchProfile().catch(console.error)
      }, 1000)
      return () => clearTimeout(timeout)
    }

    if (!profile) {
      console.log("Login redirect - profile is null, cannot redirect")
      return
    }

    // Tax Consultant-specific redirects
    if (profile?.businessType === 'consultant') {

      if (profile.consultantKycCompleted !== true) {
        router.push("/consultant/kyc")
        return
      }
      router.push("/consultant/dashboard")
      return
    }

    // Check if user needs to verify TIN or upload documents
    if (!profile.taxId ||!profile.businessDocuments) {
      console.log("Login redirect - no taxId, redirecting to verify-tin")
      router.push("/verify-tin")
      return
    }

    // if (profile.businessType === 'sme' && !profile.businessDocuments) {
    //   // console.log("Login redirect - SME without documents, redirecting to verify-tin")
    //   router.push("/verify-tin")
    //   return
    // }

    if (profile.businessType === 'creator') {
      console.log("Login redirect - creator, redirecting to dashboard-creator")
      router.push("/dashboard-creator")
      return
    }

    if (profile.businessType === 'sme') {
      console.log("Login redirect - SME, redirecting to dashboard-sme")
      router.push("/dashboard-sme")
      return
    }
    // router.push("/dashboard")
  }, [user, loading, profile, profileLoading, router, refetchProfile])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setIsGoogleOnlyUser(false) // Reset Google-only user state

    const result = await signIn({
      email: formData.email,
      password: formData.password
    })

    setIsLoading(false)

    if (result.success) {
      setIsGoogleOnlyUser(false)
      toast.success('Logged in successfully!')
      // Refetch profile to ensure it's loaded for redirect
      await refetchProfile()
    } else {
      const isGoogleOnly = result.error === 'GOOGLE_ONLY_USER' || result.isGoogleOnlyUser === true
      if (isGoogleOnly) {
        setIsGoogleOnlyUser(true)
        return 
      }
      setIsGoogleOnlyUser(false)
      toast.error(result.error || 'Failed to log in')
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      const result = await signInWithGoogle()
      if (result.success) {
        await refetchProfile()

        setTimeout(() => {
          // Force another refetch to ensure profile is loaded
          refetchProfile().catch(console.error)
        }, 300) 
        toast.success('Signed in with Google successfully!')

      } else if (result.error === 'MISSING_PROFILE') {
        // Auth user exists but profile doesn't. Complete onboarding via modal.
        setShowGoogleBusinessTypeDialog(true)
      } else if (result.error === 'ACCOUNT_LINKING_REQUIRED' && result.needsPassword && result.email && result.credential) {
        // Account exists with email/password - show dialog to link accounts
        setLinkAccountEmail(result.email)
        setLinkAccountCredential(result.credential)
        setShowLinkAccountDialog(true)
      } else {
        toast.error(result.error || 'Failed to sign in with Google')
      }
    } catch (error) {
      console.error('Google sign in error:', error)
      toast.error('Failed to sign in with Google')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleGoogleBusinessTypeSelected = async (businessType: BusinessType) => {
    setShowGoogleBusinessTypeDialog(false)
    setIsGoogleLoading(true)
    try {
      const res = await completeGoogleProfile(businessType)
      if (!res.success) {
        toast.error(res.error || "Failed to complete signup")
        return
      }
      await refetchProfile()
      toast.success("Welcome! Your account is ready.")
      // Redirect is handled by useEffect once profile loads.
    } catch (e) {
      console.error(e)
      toast.error("Failed to complete signup")
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleLinkAccount = async () => {
    if (!linkAccountPassword || !linkAccountCredential) {
      toast.error('Please enter your password')
      return
    }

    setIsLinkingAccount(true)
    try {
      const result = await linkGoogleToEmailAccount(linkAccountEmail, linkAccountPassword, linkAccountCredential)
      
      if (result.success) {
        toast.success(result.message || 'Accounts linked successfully!')
        setShowLinkAccountDialog(false)
        setLinkAccountPassword('')
        setLinkAccountCredential(null)
        
        // Refetch profile to ensure it's loaded for redirect
        await refetchProfile()
        
        setTimeout(() => {
          refetchProfile().catch(console.error)
        }, 300)
      } else {
        toast.error(result.error || 'Failed to link accounts')
      }
    } catch (error) {
      console.error('Account linking error:', error)
      toast.error('Failed to link accounts')
    } finally {
      setIsLinkingAccount(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <AuthLayoutSide />

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
        <div className="w-full max-w-md">
          <LandingReveal className="bg-card border border-border rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-lg">
            {/* Logo - show on mobile only above form; on lg logo is on left */}
            <div className="lg:hidden flex justify-center mb-6">
              <Image
                src={isDark ? "/darklogo-bg.png" : "/logootax_bg.png"}
                alt="OTax Logo"
                width={120}
                height={40}
                className="h-10 sm:h-12 w-auto"
                priority
              />
            </div>

            <div className="mb-8 sm:mb-10">
              <h1 className="landing-hero-line text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-foreground">
                Welcome back
              </h1>
              <p className="landing-hero-line text-sm sm:text-base text-muted-foreground">
                Log in to your account to continue
              </p>
            </div>

            <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="h-11 sm:h-12 text-base border-2 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Link href="/forgot-password" className="text-xs sm:text-sm text-primary hover:underline font-medium transition-colors duration-300">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, password: e.target.value }))
                      setIsGoogleOnlyUser(false)
                    }}
                    required
                    className="h-11 sm:h-12 text-base border-2 pr-12 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground hover:text-primary transition-colors duration-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {isGoogleOnlyUser && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
                    <p className="text-sm text-amber-900 dark:text-amber-100 font-medium">
                      You signed up with Google
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      You don't have a password set yet. Please continue signing in with Google.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGoogleSignIn}
                      className="w-full sm:w-auto text-xs sm:text-sm border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all duration-300"
                    >
                      Continue with Google
                    </Button>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] rounded-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Logging in...
                  </span>
                ) : (
                  "Log in"
                )}
              </Button>
            </form>

            <div className="mt-6 sm:mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full mt-4 h-11 sm:h-12 text-base sm:text-lg rounded-lg transition-all duration-300 hover:border-primary/50"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
              >
                {isGoogleLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Signing in...
                  </span>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </div>

            <div className="mt-6 sm:mt-8 text-center">
              <span className="text-sm sm:text-base text-muted-foreground">Don't have an account? </span>
              <Link href="/signup" className="text-sm sm:text-base text-primary font-semibold hover:underline transition-colors duration-300">
                Sign up
              </Link>
            </div>
          </LandingReveal>

          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6 sm:mt-8 px-4">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
          </p>

          <div className="lg:hidden mt-6 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>

      {/* Account Linking Dialog */}
      <Dialog open={showLinkAccountDialog} onOpenChange={setShowLinkAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Your Accounts</DialogTitle>
            <DialogDescription>
              An account with this email already exists. Enter your password to link your Google account so you can sign in with either method.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="link-email">Email</Label>
              <Input
                id="link-email"
                type="email"
                value={linkAccountEmail}
                disabled
                className="mt-1 bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="link-password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="link-password"
                  type={showLinkPassword ? "text" : "password"}
                  value={linkAccountPassword}
                  onChange={(e) => setLinkAccountPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pr-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && linkAccountPassword) {
                      handleLinkAccount()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowLinkPassword(!showLinkPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showLinkPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowLinkAccountDialog(false)
                setLinkAccountPassword('')
                setLinkAccountCredential(null)
              }}
              disabled={isLinkingAccount}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkAccount}
              disabled={isLinkingAccount || !linkAccountPassword}
            >
              {isLinkingAccount ? 'Linking...' : 'Link Accounts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GoogleBusinessTypeDialog
        open={showGoogleBusinessTypeDialog}
        onOpenChange={setShowGoogleBusinessTypeDialog}
        onSelect={handleGoogleBusinessTypeSelected}
      />
    </div>
  )
}
