"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calculator, LayoutDashboard, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight, Receipt, FileText, Bell, IdCardIcon, FileCheck, BarChart3, MessageSquare, Plus } from "lucide-react"
import OtaxLogo from "../OtaxLogo"
import { useState, useEffect } from "react"
import { useSidebar } from "@/lib/contexts/sidebar-context"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { User } from "lucide-react"
import { ThemeToggle } from "../theme-toggle"
import { NotificationBell } from "../notifications/notification-bell"
import { AddTransactionDialog } from "../transactions/add-transaction-dialog"
import { useTransactions } from "@/lib/hooks/useTransactions"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { SubscriptionRequiredModal } from "../subscription/subscription-required-modal"

const navItems = [
  { href: "/dashboard-creator", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard-creator/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard-creator/invoices", label: "Invoices", icon: FileCheck },
  { href: "/dashboard-creator/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard-creator/filing-requests", label: "Filing Requests", icon: MessageSquare },
  { href: "/dashboard-creator/tax-calculator", label: "Tax Calculator", icon: Calculator },
  { href: "/dashboard-creator/payment", label: "Payment", icon: IdCardIcon },
  { href: "/dashboard-creator/documents", label: "Documents", icon: FileText },
  { href: "/dashboard-creator/reminders", label: "Reminders", icon: Bell },
  { href: "/dashboard-creator/settings", label: "Settings", icon: Settings },
]

export function DashboardNavCreator() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { sidebarCollapsed, toggleSidebar } = useSidebar()
  const { logout, user } = useAuth()
  const { profile } = useUserProfile()
  const [hasFilingRequests, setHasFilingRequests] = useState(false)
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  
  const { isSubscribed, isExpired, loading: subscriptionLoading } = useSubscription()
  const { createTransaction } = useTransactions(user?.uid || null)
  
  const checkSubscription = (action: () => void) => {
    // Wait for subscription status to load
    if (subscriptionLoading) {
      return
    }
    // Check if user is subscribed or expired - if not, show modal
    if (!isSubscribed || isExpired) {
      setShowSubscriptionModal(true)
      return
    }
    // User is subscribed and not expired, proceed with action
    action()
  }
  
  // Get page info for mobile add button
  const getMobileAddButton = () => {
    switch (pathname) {
      case "/dashboard-creator":
        return { icon: Plus, action: () => router.push("/dashboard-creator/payment"), show: true }
      case "/dashboard-creator/transactions":
        return { icon: Plus, action: () => checkSubscription(() => setIsAddTransactionDialogOpen(true)), show: true }
      case "/dashboard-creator/invoices":
        return { icon: Plus, action: () => {
          const event = new CustomEvent('createInvoice')
          window.dispatchEvent(event)
        }, show: true }
      case "/dashboard-creator/documents":
        return { icon: Plus, action: () => {}, show: true }
      case "/dashboard-creator/reminders":
        return { icon: Plus, action: () => {}, show: true }
      case "/dashboard-creator/reports":
        return { icon: Plus, action: () => router.push("/dashboard-creator/reports/generate/self-assessment"), show: true }
      case "/dashboard-creator/payment":
        return { icon: Plus, action: () => router.push("/dashboard-creator/payment/add"), show: true }
      default:
        return { icon: Plus, action: () => {}, show: false }
    }
  }
  
  const mobileAddButton = getMobileAddButton()
  const AddButtonIcon = mobileAddButton.icon

  useEffect(() => {
    const checkFilingRequests = async () => {
      if (!user?.uid) {
        setHasFilingRequests(false)
        return
      }

      try {
        const response = await fetch(`/api/filing-requests?userId=${user.uid}`)
        const result = await response.json()
        if (result.success && result.data && result.data.length > 0) {
          setHasFilingRequests(true)
        } else {
          setHasFilingRequests(false)
        }
      } catch (error) {
        console.error("Error checking filing requests:", error)
        setHasFilingRequests(false)
      }
    }

    checkFilingRequests()
  }, [user?.uid])

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      toast.success('Logged out successfully!')
      router.push('/login')
    } else {
      toast.error(result.error || 'Failed to log out')
    }
  }

  // Filter nav items based on whether user has filing requests
  const filteredNavItems = navItems.filter(item => {
    if (item.href === "/dashboard-creator/filing-requests") {
      return hasFilingRequests
    }
    return true
  })

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex fixed left-0 top-0 h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link href="/dashboard-creator" className={cn(
            "flex items-center gap-2 transition-all duration-300",
            sidebarCollapsed && "justify-center"
          )}>
            {!sidebarCollapsed && (
              <>
                <OtaxLogo />
                <span className="font-semibold text-lg whitespace-nowrap">- Creators</span>
              </>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 hover:bg-muted"
            onClick={toggleSidebar}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-8">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            // For Dashboard, only match exact path (not sub-routes)
            // For other routes, match exact path or sub-routes
            const isActive = item.href === "/dashboard-creator"
              ? pathname === item.href || pathname === item.href + "/"
              : pathname === item.href || pathname?.startsWith(item.href + "/")
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 my-5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    sidebarCollapsed && "justify-center px-2"
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="whitespace-nowrap transition-opacity duration-300">
                      {item.label}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-3">
          {/* User Info */}
          {profile && (
            <div className={cn(
              "flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-200",
              sidebarCollapsed ? "justify-center" : "justify-start"
            )}>
              <div className={cn(
                "flex-shrink-0 rounded-full bg-primary/10 p-1.5 flex items-center justify-center",
                sidebarCollapsed ? "w-8 h-8" : "w-9 h-9"
              )}>
                <User className={cn(
                  "text-primary",
                  sidebarCollapsed ? "w-4 h-4" : "w-5 h-5"
                )} />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {profile.firstName && profile.lastName 
                      ? `${profile.firstName} ${profile.lastName}`
                      : profile.firstName || profile.lastName || profile.email?.split('@')[0] || 'User'
                    }
                  </p>
                  {profile.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.email}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Logout Button */}
          <Button 
            variant="ghost" 
            className={cn(
              "w-full text-muted-foreground transition-all duration-200",
              sidebarCollapsed ? "justify-center px-2" : "justify-start"
            )} 
            size="sm"
            title={sidebarCollapsed ? "Log out" : undefined}
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="ml-2 whitespace-nowrap transition-opacity duration-300">
                Log out
              </span>
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-3 sm:p-4">
          <Link href="/dashboard-creator" className="flex items-center gap-2">
            <OtaxLogo />
          </Link>
          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <ThemeToggle />
            {mobileAddButton.show && (
              <Button 
                variant="default"
                size="icon"
                onClick={mobileAddButton.action}
                className="h-8 w-8 p-0"
              >
                <AddButtonIcon className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="h-10 w-10">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="border-t border-border p-4 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              // For Dashboard, only match exact path (not sub-routes)
              // For other routes, match exact path or sub-routes
              const isActive = item.href === "/dashboard-creator"
                ? pathname === item.href || pathname === item.href + "/"
                : pathname === item.href || pathname?.startsWith(item.href + "/")
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </div>
                </Link>
              )
            })}
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground mt-4" 
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </nav>
        )}
      </header>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog 
        open={isAddTransactionDialogOpen} 
        onOpenChange={setIsAddTransactionDialogOpen}
        onSubmit={createTransaction}
        transaction={null}
      />
      
      {/* Subscription Required Modal */}
      {(profile?.businessType !== 'agent' || !profile) && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile?.businessType || 'creator'}
        />
      )}
    </>
  )
}

