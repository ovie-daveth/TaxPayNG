"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { SidebarProvider, useSidebar } from "@/lib/contexts/sidebar-context"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { SubscriptionExpiryChecker } from "@/components/subscription/subscription-expiry-checker"
import { FreeTrialWarningModal } from "@/components/subscription/free-trial-warning-modal"
import { FreeTrialBlockedModal } from "@/components/subscription/free-trial-blocked-modal"
import { FreeTrialBanner } from "@/components/subscription/free-trial-banner"
import { cn } from "@/lib/utils"
import { FloatingSupportButton } from "@/components/support/floating-support-button"

function LayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { sidebarCollapsed } = useSidebar()
  const { user, loading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const { freeTrialStatus, isBlocked, loading: subscriptionLoading } = useSubscription()
  const router = useRouter()
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [hasShownWarning, setHasShownWarning] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

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


  useEffect(() => {
    // Wait for profile to load
    if (profileLoading) {
      return
    }

    // If profile is null, don't redirect (might still be loading)
    if (!profile) {
      return
    }
    
    const currentPath = window.location.pathname
    // Preserve query parameters (especially invoiceId for invoice notifications)
    const searchParams = new URLSearchParams(window.location.search)
    const queryString = searchParams.toString()
    const querySuffix = queryString ? `?${queryString}` : ''
    
    // Tax Consultant redirects - consultants have their own pages, redirect them away from dashboard
    if (profile.businessType === 'consultant') {
      // Only redirect if we're in the dashboard area (not already on consultant pages)
      if (!currentPath.startsWith('/consultant')) {
        // If KYC not completed, go to KYC page
        console.log("Consultant KYC completed:", profile.consultantKycCompleted)
        if (profile.consultantKycCompleted !== true) {
          router.push('/consultant/kyc' + querySuffix)
          return
        }
        // If KYC completed, go to consultant dashboard
        router.push('/consultant/dashboard' + querySuffix)
        return
      }
      // Already on agent pages, don't interfere
      return
    }
    
    if (profile.businessType === 'sme' && !currentPath.startsWith('/dashboard-sme')) {
      console.log("Redirecting SME to /dashboard-sme")
      // Preserve the path and query params when redirecting
      const targetPath = currentPath.replace('/dashboard', '/dashboard-sme')
      router.push(targetPath + querySuffix)
      return
    }

    // Creator redirects - check first before freelancer checks
    if (profile.businessType === 'creator') {
      if (currentPath === '/dashboard' || currentPath === '/dashboard/') {
        console.log("Redirecting creator from /dashboard to /dashboard-creator")
        router.push('/dashboard-creator' + querySuffix)
        return
      }
      if (currentPath.startsWith('/dashboard-sme')) {
        console.log("Redirecting creator from /dashboard-sme to /dashboard-creator")
        const targetPath = currentPath.replace('/dashboard-sme', '/dashboard-creator')
        router.push(targetPath + querySuffix)
        return
      }
      if (!currentPath.startsWith('/dashboard-creator')) {
        console.log("Redirecting creator to /dashboard-creator")
        const targetPath = currentPath.replace('/dashboard', '/dashboard-creator')
        router.push(targetPath + querySuffix)
        return
      }
    }

    if (profile.businessType === 'freelancer' && currentPath.startsWith('/dashboard-sme')) {
      console.log("Redirecting freelancer from /dashboard-sme to /dashboard")
      const targetPath = currentPath.replace('/dashboard-sme', '/dashboard')
      router.push(targetPath + querySuffix)
      return
    }

    if (profile.businessType === 'freelancer' && currentPath.startsWith('/dashboard-creator')) {
      console.log("Redirecting freelancer from /dashboard-creator to /dashboard")
      const targetPath = currentPath.replace('/dashboard-creator', '/dashboard')
      router.push(targetPath + querySuffix)
      return
    }
  }, [profile, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <DashboardNav />
      <div className={cn(
        "flex-1 transition-all duration-300 ease-in-out overflow-x-hidden",
        sidebarCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        <FreeTrialBanner />
        <DashboardHeader />
        <div className="pt-8 pb-16 md:pt-0 md:pb-0 -mt-7 md:-mt-0 overflow-x-hidden">{children}</div>
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
