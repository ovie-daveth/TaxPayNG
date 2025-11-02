"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calculator } from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "sonner"

export default function SignupPage() {
  const router = useRouter()
  const { signUp, user, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showComingSoonModal, setShowComingSoonModal] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    businessType: '',
    password: '',
    confirmPassword: ''
  })

  // Redirect to waitlist during pre-launch
  useEffect(() => {
    router.push('/#waitlist')
  }, [router])

  // Redirect to login after successful signup (no auto-login)
  useEffect(() => {
    if (signupSuccess && !loading && !user) {
      console.log("Signup successful, redirecting to /login")
      router.push("/login")
    }
  }, [signupSuccess, loading, user, router])

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

    setIsLoading(true)

    // Split full name into first and last name
    const nameParts = formData.fullName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const result = await signUp({
      email: formData.email,
      password: formData.password,
      firstName,
      lastName,
      businessType: formData.businessType as 'freelancer' | 'sme'
    })

    setIsLoading(false)
    console.log("result now", result)
    if (result?.success) {
      toast.success('Account created successfully! Please log in to continue.')
      setSignupSuccess(true)
    } else {
      toast.error(result?.error || 'Failed to create account')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {/* <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-primary-foreground" />
            </div> */}
             <div className="w-8 h-8 bg-primary text-primary-foreground font-bold rounded-lg flex items-center justify-center">
              O
            </div>
            <span className="font-semibold text-2xl">OTax</span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Create your account</h1>
            <p className="text-sm text-muted-foreground">Start managing your taxes in minutes</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Business Type - First Field */}
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select 
                value={formData.businessType}
                onValueChange={(value) => {
                  if (value === 'large_corporation') {
                    setShowComingSoonModal(true)
                    // Revert to small business
                    setFormData(prev => ({ ...prev, businessType: 'sme' }))
                  } else {
                    setFormData(prev => ({ ...prev, businessType: value }))
                  }
                }}
              >
                <SelectTrigger id="businessType">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="freelancer">Freelancer</SelectItem>
                  <SelectItem value="sme">Small Business</SelectItem>
                  <SelectItem value="large_corporation">Large Corporation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">
                {formData.businessType === 'sme' ? 'Company Name' : 'Full Name'}
              </Label>
              <Input 
                id="fullName" 
                type="text" 
                placeholder={formData.businessType === 'sme' ? 'Acme Corporation Ltd' : 'John Doe'} 
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="••••••••" 
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required 
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      {/* Coming Soon Modal */}
      <Dialog open={showComingSoonModal} onOpenChange={setShowComingSoonModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coming Soon</DialogTitle>
            <DialogDescription>
              Large corporation features are currently under development. For now, we've set your account as a Small Business. You can manage your employees, payroll, and PAYE tax with our Small Business plan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowComingSoonModal(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
