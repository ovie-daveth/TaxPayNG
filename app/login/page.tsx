"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calculator, Eye, EyeOff } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useTheme } from "next-themes"
import Image from "next/image"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, signInWithGoogle, user, loading } = useAuth()
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

  useEffect(() => {
    console.log("Login redirect effect - user:", !!user, "loading:", loading, "profileLoading:", profileLoading, "profile:", !!profile)
    
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

    // If profile is still null after user is logged in, something might be wrong
    // But don't redirect in a loop - just return
    if (!profile) {
      console.log("Login redirect - profile is null, cannot redirect")
      return
    }

    console.log("Login redirect - profile loaded, businessType:", profile.businessType, "taxId:", !!profile.taxId, "createdAt:", profile.createdAt)

    // Check if user needs to select business type
    // This should ONLY happen for Google signups where:
    // 1. Profile was created very recently (within 30 seconds - indicates immediate Google signup)
    // 2. businessType is 'freelancer' (default for Google signups without selection)
    // 3. No taxId exists (user hasn't completed onboarding)
    // 
    // Email/password signups: User signs up → gets signed out → logs in later (minutes/hours later)
    // Google signups: User signs up → immediately logged in (within seconds)
    // So we only redirect VERY new profiles (30 seconds) to catch Google signups only
    if (profile.businessType === 'freelancer' && !profile.taxId) {
      // Check if user signed in with Google by checking provider data
      const isGoogleUser = user?.providerData?.some((provider: any) => provider.providerId === 'google.com') || false
      
      const createdAt = profile.createdAt ? new Date(profile.createdAt) : null
      const now = new Date()
      const profileAge = createdAt ? (now.getTime() - createdAt.getTime()) : Infinity
      const isVeryNewProfile = profileAge < 30000 // Created within last 30 seconds
      
      // Only redirect if: Google user AND very new profile
      // Email/password signups will have profileAge > 30 seconds (they sign up, get signed out, then log in later)
      if (isGoogleUser && isVeryNewProfile) {
        console.log("Redirecting to select-business-type - Google signup with freelancer type")
        router.push("/select-business-type")
        return
      } else {
        console.log("Skipping business type redirect - isGoogleUser:", isGoogleUser, "profileAge:", profileAge, "ms")
      }
    }
    
    // If businessType is null/undefined, redirect (shouldn't happen, but handle it)
    if (!profile.businessType) {
      console.log("Redirecting to select-business-type - profile missing businessType")
      router.push("/select-business-type")
      return
    }

    // Agent-specific redirects
    if (profile.businessType === 'agent') {
      // Only redirect if agentKycCompleted is explicitly true
      // undefined or false means they need to complete KYC
      console.log("Agent KYC completed:", profile.agentKycCompleted)
      if (profile.agentKycCompleted !== true) {
        router.push("/agent/kyc")
        return
      }
      router.push("/agent/dashboard")
      return
    }

    // Check if user needs to verify TIN or upload documents
    if (!profile.taxId) {
      console.log("Login redirect - no taxId, redirecting to verify-tin")
      router.push("/verify-tin")
      return
    }

    if (profile.businessType === 'sme' && !profile.businessDocuments) {
      console.log("Login redirect - SME without documents, redirecting to verify-tin")
      router.push("/verify-tin")
      return
    }

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

    console.log("Login redirect - default, redirecting to dashboard")
    router.push("/dashboard")
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
      // Don't redirect here - useEffect will handle it based on TIN verification status
    } else {
      // Check if this is a Google-only user FIRST, before any toast
      console.log('Login error:', result.error, 'isGoogleOnlyUser:', result.isGoogleOnlyUser)
      const isGoogleOnly = result.error === 'GOOGLE_ONLY_USER' || result.isGoogleOnlyUser === true
      console.log('isGoogleOnly check:', isGoogleOnly)
      
      if (isGoogleOnly) {
        console.log('Detected Google-only user, showing form message, NOT toast')
        setIsGoogleOnlyUser(true)
        // Don't show toast, show message in form instead
        return // Exit early to prevent any toast
      }
      
      // Only show toast for non-Google-only errors
      console.log('Not Google-only user, showing toast')
      setIsGoogleOnlyUser(false)
      toast.error(result.error || 'Failed to log in')
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      const result = await signInWithGoogle()
      if (result.success) {
        // Refetch profile to ensure it's loaded for redirect
        await refetchProfile()
        
        // Wait a moment for the profile state to update in the context
        // The useEffect will trigger when profile changes and handle the redirect
        setTimeout(() => {
          // Force another refetch to ensure profile is loaded
          refetchProfile().catch(console.error)
        }, 300)
        
        // Check if user needs to select business type
        if (result.needsBusinessTypeSelection) {
          toast.success('Signed in with Google! Please select your business type.')
          // Redirect will be handled by useEffect after profile loads
        } else {
          toast.success('Signed in with Google successfully!')
          // Redirect will be handled by useEffect after profile loads
        }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-md">
        <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl shadow-primary/5">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8 sm:mb-10">
            <Image
              src={isDark ? '/darklogo-bg.png' : '/logootax_bg.png'}
              alt="OTax Logo"
              width={120}
              height={40}
              className="h-10 sm:h-12 w-auto"
              priority
            />
          </div>

          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Welcome back
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
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
                className="h-11 sm:h-12 text-base border-2 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Link href="/forgot-password" className="text-xs sm:text-sm text-primary hover:underline font-medium transition-colors">
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
                    setIsGoogleOnlyUser(false) // Clear error when user types
                  }}
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
              {isGoogleOnlyUser && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
                  <p className="text-sm text-amber-900 dark:text-amber-100 font-medium">
                    You signed up with Google
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    You don't have a password set yet. Please continue signing in with Google. After logging in, you can set a password in your account settings to enable password login in the future.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGoogleSignIn}
                    className="w-full sm:w-auto text-xs sm:text-sm border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                  >
                    Continue with Google
                  </Button>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300" 
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
              className="w-full mt-4 h-11 sm:h-12 text-base sm:text-lg"
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

          <div className="mt-6 sm:mt-8 text-center">
            <span className="text-sm sm:text-base text-muted-foreground">Don't have an account? </span>
            <Link href="/signup" className="text-sm sm:text-base text-primary font-semibold hover:underline transition-colors">
              Sign up
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
    </div>
  )
}
