"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { SidebarProvider, useSidebar } from "@/lib/contexts/sidebar-context"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { SubscriptionExpiryChecker } from "@/components/subscription/subscription-expiry-checker"
import { cn } from "@/lib/utils"

function LayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { sidebarCollapsed } = useSidebar()
  const { user, loading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])


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
    
    // Agent redirects - agents have their own pages, redirect them away from dashboard
    if (profile.businessType === 'agent') {
      // Only redirect if we're in the dashboard area (not already on agent pages)
      if (!currentPath.startsWith('/agent')) {
        // If KYC not completed, go to KYC page
        console.log("Agent KYC completed:", profile.agentKycCompleted)
        if (profile.agentKycCompleted !== true) {
          router.push('/agent/kyc')
          return
        }
        // If KYC completed, go to agent dashboard
        router.push('/agent/dashboard')
        return
      }
      // Already on agent pages, don't interfere
      return
    }
    
    if (profile.businessType === 'sme' && !currentPath.startsWith('/dashboard-sme')) {
      console.log("Redirecting SME to /dashboard-sme")
      router.push('/dashboard-sme')
      return
    }

    // Creator redirects - check first before freelancer checks
    if (profile.businessType === 'creator') {
      if (currentPath === '/dashboard' || currentPath === '/dashboard/') {
        console.log("Redirecting creator from /dashboard to /dashboard-creator")
        router.push('/dashboard-creator')
        return
      }
      if (currentPath.startsWith('/dashboard-sme')) {
        console.log("Redirecting creator from /dashboard-sme to /dashboard-creator")
        router.push('/dashboard-creator')
        return
      }
      if (!currentPath.startsWith('/dashboard-creator')) {
        console.log("Redirecting creator to /dashboard-creator")
        router.push('/dashboard-creator')
        return
      }
    }

    if (profile.businessType === 'freelancer' && currentPath.startsWith('/dashboard-sme')) {
      console.log("Redirecting freelancer from /dashboard-sme to /dashboard")
      router.push('/dashboard')
      return
    }

    if (profile.businessType === 'freelancer' && currentPath.startsWith('/dashboard-creator')) {
      console.log("Redirecting freelancer from /dashboard-creator to /dashboard")
      router.push('/dashboard')
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
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        <DashboardHeader />
        <div className="pt-8 pb-16 md:pt-0 md:pb-0">{children}</div>
        <SubscriptionExpiryChecker />
      </div>
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
