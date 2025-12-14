"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardNavSME } from "@/components/dashboard/dashboard-nav-sme"
import { SidebarProvider, useSidebar } from "@/lib/contexts/sidebar-context"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
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
    if (!profile || profileLoading) return
    
    // Redirect freelancers to their dashboard if they somehow access SME dashboard
    if (profile.businessType === 'freelancer' && window.location.pathname.startsWith('/dashboard-sme')) {
      router.push('/dashboard')
      return
    }

    if (profile.businessType === 'creator') {
      router.push('/dashboard-creator')
      return
    }
    
    // Check if user has verified TIN - if not, redirect to verify-tin
    if (!profile.taxId) {
      console.log("No TIN found for SME, redirecting to /verify-tin")
      router.push('/verify-tin')
      return
    }
    
    // For SMEs, also check if they have uploaded business documents
    if (!profile.businessDocuments) {
      console.log("No business documents found for SME, redirecting to /verify-tin")
      router.push('/verify-tin')
    }
  }, [profile, profileLoading, router])

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
    <div className="min-h-screen bg-background">
      <DashboardNavSME />
      <div className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        <DashboardHeader />
        <div>{children}</div>
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

