"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { FileText, ExternalLink, CheckCircle } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { userService } from "@/lib/services"
import { toast } from "sonner"

export default function VerifyTINPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile, refetchProfile, loading } = useUserProfile()
  const [tin, setTIN] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

//   useEffect(() => {
//     // Only redirect if user already has a TIN and we're not loading
//     if (profile && profile.taxId && user && !loading) {
//       console.log("TIN already exists, redirecting to dashboard")
//       router.push("/dashboard")
//     }
//   }, [profile, user, router, loading])

  if (!user) {
    router.push("/login")
    return null
  }

  const handleGetTIN = () => {
    // Open FIRS portal in new tab
    window.open("https://tin.firs.gov.ng/", "_blank")
  }

  const handleVerifyTIN = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!tin.trim()) {
      toast.error('Please enter a TIN')
      return
    }

    setIsVerifying(true)

    try {
      // Mock API call to verify TIN
      // In production, replace with actual FIRS API call
      const mockVerifyTIN = async (tinNumber: string) => {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Mock: Accept TIN if it's 11 digits
        if (tinNumber.length === 11 && /^\d+$/.test(tinNumber)) {
          return { valid: true, data: { name: profile?.firstName + " " + profile?.lastName } }
        }
        return { valid: false, message: 'Invalid TIN format' }
      }

      const verificationResult = await mockVerifyTIN(tin)
      
      if (verificationResult.valid) {
        // Update user profile with TIN
        setIsLoading(true)
        const result = await userService.upsertProfile(user.uid, {
          taxId: tin
        })

        setIsLoading(false)

        if (result.success) {
          toast.success('TIN verified and saved successfully!')
          // Refetch profile to get updated data
          await refetchProfile()
          router.push("/dashboard")
        } else {
          toast.error('Failed to save TIN. Please try again.')
        }
      } else {
        toast.error(verificationResult.message || 'Invalid TIN. Please check and try again.')
      }
    } catch (error) {
      toast.error('An error occurred while verifying TIN. Please try again.')
      console.error('TIN verification error:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-2xl">
        <Card className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Verify Your TIN</h1>
            <p className="text-muted-foreground">
              Tax Identification Number (TIN) is required for tax management in Nigeria
            </p>
          </div>

          {/* TIN Input Form */}
          <form onSubmit={handleVerifyTIN} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tin">Tax Identification Number (TIN)</Label>
              <Input 
                id="tin" 
                type="text" 
                placeholder="Enter your 11-digit TIN" 
                value={tin}
                onChange={(e) => setTIN(e.target.value.replace(/\D/g, ''))}
                maxLength={11}
                required 
                disabled={isVerifying || isLoading}
              />
              <p className="text-xs text-muted-foreground">
                TIN is an 11-digit number issued by FIRS for tax purposes
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={isVerifying || isLoading || !tin}
            >
              {isVerifying ? "Verifying..." : isLoading ? "Saving..." : "Verify TIN"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Get TIN Section */}
          <div className="bg-muted/50 border border-border rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <ExternalLink className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Don't have a TIN yet?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You need to obtain a TIN from the Federal Inland Revenue Service (FIRS) before proceeding. 
                  Click the button below to visit the FIRS TIN portal.
                </p>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleGetTIN}
                  disabled={isVerifying || isLoading}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Get TIN from FIRS Portal
                </Button>
              </div>
            </div>
          </div>

          {/* Skip Option */}
          <div className="mt-6 text-center">
            <Button 
              variant="ghost" 
              type="button"
              onClick={() => router.push("/dashboard")}
              disabled={isVerifying || isLoading}
            >
              Skip for now
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              You can add your TIN later in settings
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

