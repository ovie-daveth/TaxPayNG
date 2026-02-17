"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardNavSME } from "@/components/dashboard/dashboard-nav-sme"
import { SidebarProvider, useSidebar } from "@/lib/contexts/sidebar-context"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { SubscriptionExpiryChecker } from "@/components/subscription/subscription-expiry-checker"
import { FreeTrialWarningModal } from "@/components/subscription/free-trial-warning-modal"
import { FreeTrialBlockedModal } from "@/components/subscription/free-trial-blocked-modal"
import { FreeTrialBanner } from "@/components/subscription/free-trial-banner"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { FloatingSupportButton } from "@/components/support/floating-support-button"
import { cn } from "@/lib/utils"

function LayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { sidebarCollapsed } = useSidebar()
  const { user, loading } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  const { freeTrialStatus, isBlocked, loading: subscriptionLoading } = useSubscription()
  const router = useRouter()
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [hasShownWarning, setHasShownWarning] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }

    if (!loading && profile) {
      refetchProfile().catch((error) => {
        console.error("Error refetching profile:", error)
      })

      setTimeout(() => {
        refetchProfile().catch((error) => {
        router.push("/login")
        console.error("Error refetching profile on timeout:", error)
      })
      }, 300)
    }
  }, [user, loading, router, profile])

  // Check free trial status and show modals
  useEffect(() => {
    if (subscriptionLoading || profileLoading || !profile) {
      return
    }

    // If blocked, show blocked modal (it will prevent closing)
    if (isBlocked) {
      return
    }

    // Show warning on day 6 (1 day remaining) - only once per session
    if (freeTrialStatus.isExpiringSoon && freeTrialStatus.daysRemaining === 1 && !hasShownWarning) {
      setShowWarningModal(true)
      setHasShownWarning(true)
    }
  }, [freeTrialStatus, isBlocked, subscriptionLoading, profileLoading, profile, hasShownWarning])


  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user || (profile && profile.businessType !== 'sme')) {
    return null
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <DashboardNavSME />
      <div className={cn(
        "flex-1 transition-all duration-300 ease-in-out overflow-x-hidden",
        sidebarCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        <FreeTrialBanner />
        <DashboardHeader />
        <div className="pt-8 pb-16 md:pt-0 md:pb-0 overflow-x-hidden">{children}</div>
        <SubscriptionExpiryChecker />
        <FloatingSupportButton />
      </div>
      
      {/* Free Trial Modals */}
      {freeTrialStatus.isExpiringSoon && freeTrialStatus.daysRemaining === 1 && (
        <FreeTrialWarningModal
          open={showWarningModal}
          onOpenChange={setShowWarningModal}
          daysRemaining={freeTrialStatus.daysRemaining}
        />
      )}
      
      {isBlocked && (
        <FreeTrialBlockedModal
          open={true}
          onOpenChange={() => {}} // Prevent closing
          businessType={profile?.businessType || 'sme'}
          onOpenSubscription={() => setShowSubscriptionModal(true)}
        />
      )}
      
      {profile && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile.businessType || 'sme'}
        />
      )}
    </div>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  )
}

