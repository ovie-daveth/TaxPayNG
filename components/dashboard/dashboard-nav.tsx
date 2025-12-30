"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calculator, LayoutDashboard, Receipt, FileText, Bell, Settings, LogOut, ChevronLeft, ChevronRight, IdCardIcon, FileCheck, BarChart3, MessageSquare, Plus, Menu } from "lucide-react"
import { useState, useEffect } from "react"
import { useSidebar } from "@/lib/contexts/sidebar-context"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import OtaxLogo from "../OtaxLogo"
import { User } from "lucide-react"
import { ThemeToggle } from "../theme-toggle"
import { NotificationBell } from "../notifications/notification-bell"
import { AddTransactionDialog } from "../transactions/add-transaction-dialog"
import { useTransactions } from "@/lib/hooks/useTransactions"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { SubscriptionRequiredModal } from "../subscription/subscription-required-modal"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileCheck },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/filing-requests", label: "Filing Requests", icon: MessageSquare },
  { href: "/dashboard/tax-calculator", label: "Tax Calculator", icon: Calculator },
  { href: "/dashboard/payment", label: "Payment", icon: IdCardIcon },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/reminders", label: "Reminders", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarCollapsed, toggleSidebar } = useSidebar()
  const { logout, user } = useAuth()
  const { profile } = useUserProfile()
  const [hasFilingRequests, setHasFilingRequests] = useState(false)
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const { isSubscribed, isExpired, loading: subscriptionLoading } = useSubscription()
  const { createTransaction } = useTransactions(user?.uid || null)
  
  // Get page info for mobile add button
  const getMobileAddButton = () => {
    switch (pathname) {
      case "/dashboard":
        return { icon: Plus, action: () => router.push("/dashboard/payment"), show: true }
      case "/dashboard/transactions":
        return { icon: Plus, action: () => checkSubscription(() => setIsAddTransactionDialogOpen(true)), show: true }
      case "/dashboard/invoices":
        return { icon: Plus, action: () => {
          const event = new CustomEvent('createInvoice')
          window.dispatchEvent(event)
        }, show: true }
      case "/dashboard/documents":
        return { icon: Plus, action: () => {}, show: true }
      case "/dashboard/reminders":
        return { icon: Plus, action: () => {}, show: true }
      case "/dashboard/reports":
        return { icon: Plus, action: () => router.push("/dashboard/reports/generate/self-assessment"), show: true }
      case "/dashboard/payment":
        return { icon: Plus, action: () => router.push("/dashboard/payment/add"), show: true }
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

  // Filter nav items based on whether user has filing requests
  const filteredNavItems = navItems.filter(item => {
    if (item.href === "/dashboard/filing-requests") {
      return hasFilingRequests
    }
    return true
  })

  // Items shown in bottom nav - 5 items: Dashboard, Invoice, Tax Calculator, Transaction, Report
  const bottomNavItems = [
    "/dashboard",
    "/dashboard/invoices",
    "/dashboard/tax-calculator",
    "/dashboard/transactions",
    "/dashboard/reports"
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
          <Link href="/dashboard" className={cn(
            "flex items-center gap-2 transition-all duration-300",
            sidebarCollapsed && "justify-center"
          )}>
            {!sidebarCollapsed && (
             <OtaxLogo />
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
            const isActive = item.href === "/dashboard"
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
          <Link href="/dashboard" className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-colors",
            (pathname === "/dashboard" || pathname === "/dashboard/") 
              ? "min-w-[70px] -mt-4" 
              : "rounded-lg"
          )}>
            {(pathname === "/dashboard" || pathname === "/dashboard/") ? (
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg">
                <LayoutDashboard className="w-6 h-6" />
              </div>
            ) : (
              <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard" || pathname === "/dashboard/") 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Dashboard
            </span>
          </Link>

          <Link href="/dashboard/invoices" className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-colors",
            (pathname === "/dashboard/invoices" || pathname?.startsWith("/dashboard/invoices/")) 
              ? "min-w-[70px] -mt-4" 
              : "rounded-lg"
          )}>
            {(pathname === "/dashboard/invoices" || pathname?.startsWith("/dashboard/invoices/")) ? (
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg">
                <FileCheck className="w-6 h-6" />
              </div>
            ) : (
              <FileCheck className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard/invoices" || pathname?.startsWith("/dashboard/invoices/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Invoices
            </span>
          </Link>

          {/* Tax Calculator - Center, Round, Bigger when active */}
          <Link href="/dashboard/tax-calculator" className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors",
            (pathname === "/dashboard/tax-calculator" || pathname?.startsWith("/dashboard/tax-calculator/")) 
              ? "min-w-[70px] -mt-4" 
              : "min-w-[60px] rounded-lg"
          )}>
            {(pathname === "/dashboard/tax-calculator" || pathname?.startsWith("/dashboard/tax-calculator/")) ? (
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg">
                <Calculator className="w-6 h-6" />
              </div>
            ) : (
              <Calculator className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard/tax-calculator" || pathname?.startsWith("/dashboard/tax-calculator/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Calculator
            </span>
          </Link>

          <Link href="/dashboard/transactions" className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-colors",
            (pathname === "/dashboard/transactions" || pathname?.startsWith("/dashboard/transactions/")) 
              ? "min-w-[70px] -mt-4" 
              : "rounded-lg"
          )}>
            {(pathname === "/dashboard/transactions" || pathname?.startsWith("/dashboard/transactions/")) ? (
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg">
                <Receipt className="w-6 h-6" />
              </div>
            ) : (
              <Receipt className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard/transactions" || pathname?.startsWith("/dashboard/transactions/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Transactions
            </span>
          </Link>

          <Link href="/dashboard/reports" className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] transition-colors",
            (pathname === "/dashboard/reports" || pathname?.startsWith("/dashboard/reports/")) 
              ? "min-w-[70px] -mt-4" 
              : "rounded-lg"
          )}>
            {(pathname === "/dashboard/reports" || pathname?.startsWith("/dashboard/reports/")) ? (
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg">
                <BarChart3 className="w-6 h-6" />
              </div>
            ) : (
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard/reports" || pathname?.startsWith("/dashboard/reports/")) 
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
        <SheetContent side="left" className="!w-full !max-w-full p-0 flex flex-col">
          <SheetHeader>
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          </SheetHeader>
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
              const isActive = item.href === "/dashboard"
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

          {/* Logout Button */}
          <div className="p-4 border-t border-border">
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
      
      {/* Subscription Required Modal */}
      {(profile?.businessType !== 'agent' || !profile) && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile?.businessType || 'freelancer'}
        />
      )}
    </>
  )
}
