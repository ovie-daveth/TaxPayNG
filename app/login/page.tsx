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
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, user, loading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    // Wait for loading to complete
    if (loading || profileLoading) {
      return
    }

    // If user is logged in but profile is null, wait a bit more
    if (user && !profile) {
      console.log("Login page - user logged in but profile is null, waiting...")
      return
    }

    // If user is not logged in, don't redirect
    if (!user) {
      return
    }

    // If profile is still null after user is logged in, something might be wrong
    // But don't redirect in a loop - just return
    if (!profile) {
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
      router.push("/verify-tin")
      return
    }

    if (profile.businessType === 'sme' && !profile.businessDocuments) {
      router.push("/verify-tin")
      return
    }

    if (profile.businessType === 'creator') {
      router.push("/dashboard-creator")
      return
    }

    if (profile.businessType === 'sme') {
      router.push("/dashboard-sme")
      return
    }

    router.push("/dashboard")
  }, [user, loading, profile, profileLoading, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await signIn({
      email: formData.email,
      password: formData.password
    })

    setIsLoading(false)

    if (result.success) {
      toast.success('Logged in successfully!')
      // Don't redirect here - useEffect will handle it based on TIN verification status
    } else {
      toast.error(result.error || 'Failed to log in')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-md">
        <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl shadow-primary/5">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-8 sm:mb-10">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl shadow-lg shadow-primary/25">
              O
            </div>
            <span className="font-bold text-2xl sm:text-3xl bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">OTax</span>
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
