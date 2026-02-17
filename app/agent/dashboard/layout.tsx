"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AgentSidebar } from "@/components/agent/agent-sidebar"
import { AgentHeader } from "@/components/agent/agent-header"
import { SidebarProvider, useSidebar } from "@/lib/contexts/sidebar-context"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

function LayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { sidebarCollapsed } = useSidebar()
  const { user, loading } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  const router = useRouter()

 useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || profile?.businessType !== 'consultant') {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <AgentSidebar />
      <div className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        <AgentHeader sidebarCollapsed={sidebarCollapsed} />
        <main className={`container mx-auto px-3 sm:px-4 py-4 sm:pb-6 -mt-16 sm:-mt-0 ${sidebarCollapsed ? "md:px-6 lg:px-8" : "md:px-8 lg:px-12"}`}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AgentDashboardLayout({
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

