"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calculator, LayoutDashboard, Settings, LogOut, ChevronLeft, ChevronRight, Receipt, FileText, Bell, IdCardIcon, FileCheck, BarChart3, MessageSquare, Plus, Menu, Handshake, X, Store } from "lucide-react"
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
import { AddReminderDialog } from "../reminders/add-reminder-dialog"
import { useTransactions } from "@/lib/hooks/useTransactions"
import { useReminders } from "@/lib/hooks/useReminders"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { SubscriptionRequiredModal } from "../subscription/subscription-required-modal"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { BusinessSwitcher } from "@/components/business/business-switcher"

const navItems = [
  { href: "/dashboard-creator", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard-creator/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard-creator/invoices", label: "Invoices", icon: FileCheck },
  { href: "/dashboard-creator/brand-deals", label: "Brand Deals", icon: Handshake },
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
  const { sidebarCollapsed, toggleSidebar } = useSidebar()
  const { logout, user } = useAuth()
  const { profile } = useUserProfile()
  const [hasFilingRequests, setHasFilingRequests] = useState(false)
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState(false)
  const [isAddReminderDialogOpen, setIsAddReminderDialogOpen] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const { hasAccess, isSubscribedOnly, loading: subscriptionLoading } = useSubscription()
  const { createTransaction } = useTransactions(user?.uid || null)
  const { createReminder } = useReminders(user?.uid || null)
  
  const checkSubscription = (action: () => void) => {
    // Wait for subscription status to load
    if (subscriptionLoading) {
      return
    }
    // Check if user has access (free trial or subscribed) - if not, show modal
    if (!hasAccess()) {
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
      case "/dashboard-creator/brand-deals":
        return { icon: Handshake, action: () => {
          const event = new CustomEvent('createBrandDeal')
          window.dispatchEvent(event)
        }, show: true }
      case "/dashboard-creator/documents":
        return { icon: Plus, action: () => {}, show: true }
      case "/dashboard-creator/reminders":
        return { icon: Plus, action: () => checkSubscription(() => setIsAddReminderDialogOpen(true)), show: true }
      case "/dashboard-creator/reports":
        return { icon: Plus, action: () => router.push("/dashboard-creator/reports/generate/self-assessment"), show: true }
      case "/dashboard-creator/payment":
        return { 
          icon: Plus, 
          action: () => {
            if (subscriptionLoading) return
            if (!isSubscribedOnly()) {
              setShowSubscriptionModal(true)
              return
            }
            router.push("/dashboard-creator/payment/add")
          }, 
          show: true 
        }
      default:
        return { icon: Plus, action: () => {}, show: false }
    }
  }
  
  const mobileAddButton = getMobileAddButton()
  const AddButtonIcon = mobileAddButton.icon

  // Close the mobile menu whenever navigation occurs (e.g., when BusinessSwitcher "Manage" navigates)
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

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

  // Filter nav items - filing requests is always visible
  const filteredNavItems = navItems

  // Items shown in bottom nav - 5 items: Dashboard, Invoice, Tax Calculator, Transaction, Report
  const bottomNavItems = [
    "/dashboard-creator",
    "/dashboard-creator/invoices",
    "/dashboard-creator/tax-calculator",
    "/dashboard-creator/transactions",
    "/dashboard-creator/reports"
  ]

  // Items to show in the sidebar menu (all items except those in bottom nav)
  const menuNavItems = filteredNavItems.filter(item => {
    return !bottomNavItems.includes(item.href)
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
          {/* Business Switcher - visible on mobile and tablet view, hidden on desktop */}
          <div className="block md:block lg:hidden mb-2">
            <BusinessSwitcher />
          </div>
          
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

      {/* Mobile Header - Headless: Menu icon left, Add button right */}
      <header className="md:hidden sticky top-0 z-50 bg-background">
        <div className="flex items-center justify-between px-3 py-1">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Business switcher lives in the header; removed from sidebar/menu for creators */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                toast.message("Marketplace is coming soon", {
                  description: "We’re working on it. Please check back shortly."
                })
              }}
              className="h-8 w-8 opacity-60 cursor-not-allowed"
              title="Marketplace (Coming Soon)"
            >
              <Store className="w-4 h-4" />
            </Button>
            <NotificationBell />
            {mobileAddButton.show && (
              <Button 
                variant="default"
                size="icon"
                onClick={mobileAddButton.action}
                className="h-8 w-8"
              >
                <AddButtonIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation - 5 items: Dashboard, Invoice, Tax Calculator, Transaction, Report */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          <Link href="/dashboard-creator" className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-colors",
            (pathname === "/dashboard-creator" || pathname === "/dashboard-creator/") 
              ? "min-w-[70px] -mt-4" 
              : "rounded-lg"
          )}>
            {(pathname === "/dashboard-creator" || pathname === "/dashboard-creator/") ? (
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg">
                <LayoutDashboard className="w-6 h-6" />
              </div>
            ) : (
              <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard-creator" || pathname === "/dashboard-creator/") 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Dashboard
            </span>
          </Link>

          <Link href="/dashboard-creator/invoices" className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-colors",
            (pathname === "/dashboard-creator/invoices" || pathname?.startsWith("/dashboard-creator/invoices/")) 
              ? "min-w-[70px] -mt-4" 
              : "rounded-lg"
          )}>
            {(pathname === "/dashboard-creator/invoices" || pathname?.startsWith("/dashboard-creator/invoices/")) ? (
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg">
                <FileCheck className="w-6 h-6" />
              </div>
            ) : (
              <FileCheck className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard-creator/invoices" || pathname?.startsWith("/dashboard-creator/invoices/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Invoices
            </span>
          </Link>

          {/* Tax Calculator - Center, Round, Bigger when active */}
          <Link href="/dashboard-creator/tax-calculator" className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors",
            (pathname === "/dashboard-creator/tax-calculator" || pathname?.startsWith("/dashboard-creator/tax-calculator/")) 
              ? "min-w-[70px] -mt-4" 
              : "min-w-[60px] rounded-lg"
          )}>
            {(pathname === "/dashboard-creator/tax-calculator" || pathname?.startsWith("/dashboard-creator/tax-calculator/")) ? (
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg">
                <Calculator className="w-6 h-6" />
              </div>
            ) : (
              <Calculator className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard-creator/tax-calculator" || pathname?.startsWith("/dashboard-creator/tax-calculator/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Calculator
            </span>
          </Link>

          <Link href="/dashboard-creator/transactions" className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-colors",
            (pathname === "/dashboard-creator/transactions" || pathname?.startsWith("/dashboard-creator/transactions/")) 
              ? "min-w-[70px] -mt-4" 
              : "rounded-lg"
          )}>
            {(pathname === "/dashboard-creator/transactions" || pathname?.startsWith("/dashboard-creator/transactions/")) ? (
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg">
                <Receipt className="w-6 h-6" />
              </div>
            ) : (
              <Receipt className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard-creator/transactions" || pathname?.startsWith("/dashboard-creator/transactions/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Transactions
            </span>
          </Link>

          <Link href="/dashboard-creator/reports" className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-colors",
            (pathname === "/dashboard-creator/reports" || pathname?.startsWith("/dashboard-creator/reports/")) 
              ? "min-w-[70px] -mt-4" 
              : "rounded-lg"
          )}>
            {(pathname === "/dashboard-creator/reports" || pathname?.startsWith("/dashboard-creator/reports/")) ? (
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg">
                <BarChart3 className="w-6 h-6" />
              </div>
            ) : (
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard-creator/reports" || pathname?.startsWith("/dashboard-creator/reports/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Reports
            </span>
          </Link>
        </div>
      </nav>

      {/* Mobile Menu Sheet - Slides from left, full screen */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="!w-full !max-w-full p-0 flex flex-col [&>button[class*='absolute'][class*='right-4'][class*='top-4']]:hidden">
          <SheetHeader>
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          </SheetHeader>
          {/* Custom Close Button - Larger and positioned lower */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute right-4 top-8 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-auto w-auto p-2"
          >
            <X className="h-12 w-12" />
            <span className="sr-only">Close</span>
          </Button>
          {/* User Profile Section */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-foreground truncate">
                  {profile?.firstName && profile?.lastName 
                    ? `${profile.firstName} ${profile.lastName}`
                    : profile?.firstName || profile?.lastName || profile?.email?.split('@')[0] || 'User'
                  }
                </p>
                {profile?.email && (
                  <p className="text-sm text-muted-foreground truncate">
                    {profile.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuNavItems.map((item) => {
              const Icon = item.icon
              const isActive = item.href === "/dashboard-creator"
                ? pathname === item.href || pathname === item.href + "/"
                : pathname === item.href || pathname?.startsWith(item.href + "/")
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 rounded-lg text-base font-bold transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-primary hover:bg-primary/10"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isActive ? "text-white" : "text-black dark:text-white"
                  )} strokeWidth={2.5} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Bottom Section - Business Switcher and Logout */}
          <div className="p-4 border-t border-border space-y-3">
            {/* Business Switcher - at bottom of sidebar, before logout */}
            <div className="w-full">
              <BusinessSwitcher className="w-full" triggerClassName="w-full" />
            </div>
            
            {/* Logout Button */}
            <Button
              variant="ghost"
              onClick={() => {
                setIsMobileMenuOpen(false)
                handleLogout()
              }}
              className="w-full justify-start gap-4 px-4 py-3 text-base font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
              Log out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog 
        open={isAddTransactionDialogOpen} 
        onOpenChange={setIsAddTransactionDialogOpen}
        onSubmit={createTransaction}
        transaction={null}
      />
      
      {/* Add Reminder Dialog */}
      <AddReminderDialog 
        open={isAddReminderDialogOpen} 
        onOpenChange={setIsAddReminderDialogOpen}
        onSubmit={createReminder}
      />

      {/* Subscription Required Modal */}
      {(profile?.businessType !== 'consultant' || !profile) && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile?.businessType || 'creator'}
        />
      )}
    </>
  )
}

