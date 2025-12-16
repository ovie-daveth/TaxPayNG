"use client"

import type React from "react"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error("Please enter your email address")
      return
    }

    setIsLoading(true)
    const result = await resetPassword(email.trim())
    setIsLoading(false)

    if (result.success) {
      setIsSuccess(true)
      toast.success("Password reset email sent! Please check your inbox.")
    } else {
      toast.error(result.error || "Failed to send password reset email")
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

          {!isSuccess ? (
            <>
              <div className="text-center mb-8 sm:mb-10">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Forgot Password?
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  No worries! Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                      className="h-11 sm:h-12 text-base border-2 pl-10 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
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
                      Sending...
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <div className="mt-6 sm:mt-8 text-center">
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center space-y-6 sm:space-y-8">
              <div className="flex justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" />
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Check your email
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  We've sent a password reset link to
                </p>
                <p className="text-sm sm:text-base font-semibold text-foreground break-all">
                  {email}
                </p>
              </div>

              <div className="space-y-4 sm:space-y-5 pt-4">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder or try again.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSuccess(false)
                      setEmail("")
                    }}
                    className="flex-1 h-11 sm:h-12 text-sm sm:text-base"
                  >
                    Try another email
                  </Button>
                  <Button
                    onClick={() => {
                      setIsSuccess(false)
                      setEmail("")
                    }}
                    className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                  >
                    Resend email
                  </Button>
                </div>

                <Link 
                  href="/login" 
                  className="inline-flex items-center justify-center gap-2 text-sm sm:text-base text-primary hover:underline font-medium transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6 sm:mt-8 px-4">
          Remember your password?{" "}
          <Link href="/login" className="underline hover:text-foreground transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

