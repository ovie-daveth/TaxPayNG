"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { userService } from "@/lib/services"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { BusinessType } from "@/lib/types"
import { Loader2 } from "lucide-react"
import Image from "next/image"
import { useTheme } from "next-themes"

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

export default function SelectBusinessTypePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  const [isSaving, setIsSaving] = useState(false)
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType | null>(null)

  // Redirect if already has business type set and taxId
  useEffect(() => {
    if (authLoading || profileLoading) {
      return
    }

    if (!user) {
      router.push("/login")
      return
    }

    if (profile && ((profile.businessType && profile.businessType !== 'freelancer') || (profile?.businessType === 'freelancer' && profile?.taxId))) {
      // User already has a business type set (and possibly TIN), redirect to appropriate dashboard
      if (profile.businessType === 'agent') {
        if (profile.agentKycCompleted !== true) {
          router.push("/agent/kyc")
          return
        }
        router.push("/agent/dashboard")
        return
      }

      if (!profile.taxId) {
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
    }
  }, [user, profile, authLoading, profileLoading, router])

  const handleSelectBusinessType = async (businessType: BusinessType) => {
    if (!user) {
      toast.error("User not authenticated")
      return
    }

    setSelectedBusinessType(businessType)
    setIsSaving(true)

    try {
      // Update profile with selected business type
      const updateData: any = {
        businessType: businessType,
        updatedAt: new Date().toISOString()
      }

      // Add agent-specific fields if businessType is agent
      if (businessType === 'agent') {
        updateData.agentKycCompleted = false
        updateData.role = 'agent'
      }

      const result = await userService.upsertProfile(user.uid, updateData)

      if (result && result.success) {
        // Create default reminders for the user
        try {
          const { createDefaultReminders } = await import('@/lib/utils/defaultReminders')
          await createDefaultReminders(user.uid, businessType)
        } catch (reminderError) {
          console.error('Error creating default reminders:', reminderError)
          // Don't fail if reminders fail
        }

        // Refetch profile to get updated data
        await refetchProfile()

        toast.success('Business type selected successfully!')
        
        // Redirect to verify-tin page
        router.push("/verify-tin")
      } else {
        toast.error(result?.error || 'Failed to update business type')
        setSelectedBusinessType(null)
      }
    } catch (error) {
      console.error('Error updating business type:', error)
      toast.error('Failed to update business type')
      setSelectedBusinessType(null)
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <LogoImage />
        </div>

        <Card className="p-6 sm:p-8">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold">Select Your Business Type</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Please select your business type to continue
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => handleSelectBusinessType('freelancer')}
                disabled={isSaving}
              >
                <div className="text-left">
                  <div className="font-semibold">Freelancer</div>
                  <div className="text-sm text-muted-foreground">Individual contractor or consultant</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => handleSelectBusinessType('creator')}
                disabled={isSaving}
              >
                <div className="text-left">
                  <div className="font-semibold">Content Creator</div>
                  <div className="text-sm text-muted-foreground">YouTuber, influencer, or content creator</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => handleSelectBusinessType('sme')}
                disabled={isSaving}
              >
                <div className="text-left">
                  <div className="font-semibold">Small/Medium Business</div>
                  <div className="text-sm text-muted-foreground">Small or medium-sized enterprise</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => handleSelectBusinessType('agent')}
                disabled={isSaving}
              >
                <div className="text-left">
                  <div className="font-semibold">Tax Filing Agent</div>
                  <div className="text-sm text-muted-foreground">Professional tax agent assisting clients</div>
                </div>
              </Button>
            </div>

            {isSaving && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

