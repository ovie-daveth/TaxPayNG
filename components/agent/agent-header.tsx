"use client"

import { usePathname, useRouter } from "next/navigation"
import { NotificationBell } from "../notifications/notification-bell"
import { ThemeToggle } from "../theme-toggle"
import { useUserProfile } from "@/lib/contexts/user-profile-context"
import { useEffect, useState } from "react"
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  FileText, 
  DollarSign, 
  MessageSquare,
  Settings,
  Plus,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function AgentHeader({sidebarCollapsed}: {sidebarCollapsed: boolean}) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, loading: profileLoading } = useUserProfile()
  const [showFab, setShowFab] = useState(false)
  
  useEffect(() => {
    if (!profileLoading && profile?.businessType !== 'consultant') {
      console.warn("User profile indicates business type is not consultant. This header is intended for consultants.")
    }
  }, [profile, profileLoading])
  
const AgentHeaderTitleMap: Record<string, { title: string; description: string }> = {
  "/agent/dashboard": {
    title: "Dashboard",
    description: `Welcome back, ${profile?.firstName} ${profile?.lastName}. Manage your clients and their tax filings.`
  },
  "/agent/dashboard/portfolio": {
    title: "Portfolio",
    description: "Update your professional portfolio to attract clients in the marketplace"
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

  // Bottom nav items
  const bottomNavItems = [
    { href: "/agent/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/agent/dashboard/portfolio", label: "Portfolio", icon: Briefcase },
    { href: "/consultant/dashboard/clients", label: "Clients", icon: Users },
    { href: "/consultant/dashboard/requests", label: "Requests", icon: FileText },
    { href: "/consultant/dashboard/settings", label: "Settings", icon: Settings },
  ]

  // Floating action items
  const fabItems = [
    { href: "/agent/dashboard/consultations", label: "Consultations", icon: MessageSquare },
    { href: "/consultant/dashboard/payments", label: "Payments", icon: DollarSign },
  ]
  
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
    <>
      {/* Top Header */}
      <div className="border-b border-border bg-card mb-4 sm:mb-6">
        <div className={`container mx-auto px-3 sm:px-4 lg:px-8 py-2 sm:py-3 md:py-4 flex items-center justify-between`}>
          <div className="mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{headerData.title}</h1>
            <p className="text-sm sm:text-base text-muted-foreground hidden sm:block">
              {headerData.description}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <nav className="flex items-center justify-around h-16">
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "fill-current")} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-16" />

      {/* Floating Action Buttons (Bottom Right) */}
      <div className="sm:hidden fixed bottom-32 md:bottom-6 right-4 md:right-6 z-40 flex flex-col-reverse gap-3">
        {/* Expanded Menu Items */}
        {showFab && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
            {fabItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href)
                    setShowFab(false)
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-card text-foreground border border-border hover:bg-muted"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm pr-2">{item.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Main FAB Toggle Button */}
        <Button
          size="icon"
          onClick={() => setShowFab(!showFab)}
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all hover:scale-110",
            showFab && "rotate-45"
          )}
        >
          {showFab ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </Button>
      </div>
    </>
  )
}

