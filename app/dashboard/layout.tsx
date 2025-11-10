"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
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
    if (!profile) return
    
    const currentPath = window.location.pathname
    console.log("Dashboard layout - businessType:", profile.businessType, "current path:", currentPath)
    
    if (profile.businessType === 'sme' && !currentPath.startsWith('/dashboard-sme')) {
      console.log("Redirecting SME to /dashboard-sme")
      router.push('/dashboard-sme')
      return
    }

    if (profile.businessType === 'creator' && !currentPath.startsWith('/dashboard-creator')) {
      console.log("Redirecting creator to /dashboard-creator")
      router.push('/dashboard-creator')
      return
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

    if (profile.businessType === 'creator' && currentPath.startsWith('/dashboard-sme')) {
      console.log("Redirecting creator from /dashboard-sme to /dashboard-creator")
      router.push('/dashboard-creator')
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
