"use client"

import { usePathname } from "next/navigation"
import { NotificationBell } from "../notifications/notification-bell"
import { ThemeToggle } from "../theme-toggle"
import { useUserProfile } from "@/lib/contexts/user-profile-context"
import { useEffect } from "react"

export function AgentHeader({sidebarCollapsed}: {sidebarCollapsed: boolean}) {
  const pathname = usePathname()
  const { profile, loading: profileLoading } = useUserProfile()
  
  useEffect(() => {
    if (!profileLoading && profile?.businessType !== 'consultant') {
      console.warn("User profile indicates business type is not consultant. This header is intended for consultants.")
    }
  }, [profile, profileLoading])
  
const AgentHeaderTitleMap: Record<string, { title: string; description: string }> = {
  "/agent/dashboard": {
    title: "Dashboard",
    description: `Welcome back, ${profile?.firstName} {profile?.lastName}. Manage your clients and their tax filings.`
  },
  "/agent/dashboard/portfolio": {
    title: "Portfolio",
    description: " Update your professional portfolio to attract clients in the marketplace"
  },
  "/consultant/dashboard/settings": {
    title: "Settings",
    description: "Manage your account settings and preferences"
  },
  "/consultant/dashboard/clients": {
    title: "Clients Management",
    description: "Manage clients who have selected you as their tax consultant"
  },
  "/consultant/dashboard/requests": {
    title: "Filing Requests",
    description: "Manage tax filing requests from your clients"
  },
  "/consultant/dashboard/payments": {
    title: "Payments",
    description: "View your earnings and payment history"
  },
  "/agent/dashboard/consultations": {
  title: "Consultations",
  description: "Manage consultation requests from clients"
},
}
  
  // Get the header data, checking for exact match or finding the closest match
  const getHeaderData = () => {
    // First try exact match
    if (AgentHeaderTitleMap[pathname]) {
      return AgentHeaderTitleMap[pathname]
    }
    
    // Try to find matching route by checking if pathname starts with any key
    const matchingKey = Object.keys(AgentHeaderTitleMap).find(key => 
      pathname === key || pathname.startsWith(key + '/')
    )
    
    if (matchingKey) {
      return AgentHeaderTitleMap[matchingKey]
    }
    
    // Default fallback
    return {
      title: "Dashboard",
      description: "Welcome to your consultant dashboard"
    }
  }
  
  const headerData = getHeaderData()

  return (
    <div className="border-b border-border bg-card mb-4 sm:mb-6">
      <div className={`container mx-auto px-3 sm:px-4 lg:px-8 py-2 sm:py-3 md:py-4 flex items-center justify-between`}>
        <div className="mb-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{headerData.title}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {headerData.description}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}

