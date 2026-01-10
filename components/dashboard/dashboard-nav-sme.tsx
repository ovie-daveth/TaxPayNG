"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calculator, LayoutDashboard, Users, DollarSign, FileText, Settings, LogOut, ChevronLeft, ChevronRight, TrendingUp, Menu, Bell, User, Receipt, FileCheck, IdCardIcon, MessageSquare, Plus, X } from "lucide-react"
import OtaxLogo from "../OtaxLogo"
import { useState, useEffect } from "react"
import { useSidebar } from "@/lib/contexts/sidebar-context"
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "sonner"
import { NotificationBell } from "../notifications/notification-bell"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useUserProfile } from "@/lib/contexts/user-profile-context"
import { BusinessSwitcher } from "@/components/business/business-switcher"

const navItems = [
  { href: "/dashboard-sme", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard-sme/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard-sme/invoices", label: "Invoices", icon: FileCheck },
  { href: "/dashboard-sme/reports", label: "Reports", icon: TrendingUp },
  { href: "/dashboard-sme/filing-requests", label: "Filing Requests", icon: MessageSquare },
  { href: "/dashboard-sme/payment", label: "Payment", icon: IdCardIcon },
  { href: "/dashboard-sme/documents", label: "Documents", icon: FileText },
  { href: "/dashboard-sme/employees", label: "Employees", icon: Users },
  { href: "/dashboard-sme/payroll", label: "Payroll", icon: DollarSign },
  { href: "/dashboard-sme/paye", label: "PAYE Tax", icon: FileText },
  { href: "/dashboard-sme/reminders", label: "Reminders", icon: Bell },
  { href: "/dashboard-sme/settings", label: "Settings", icon: Settings },
]

export function DashboardNavSME() {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarCollapsed, toggleSidebar } = useSidebar()
  const { logout, user } = useAuth()
  const { profile } = useUserProfile()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [hasFilingRequests, setHasFilingRequests] = useState(false)
  
  // Get page info for mobile add button
  const getMobileAddButton = () => {
    switch (pathname) {
      case "/dashboard-sme/transactions":
        return { icon: Plus, action: () => {
          const event = new CustomEvent('createTransaction')
          window.dispatchEvent(event)
        }, show: true }
      case "/dashboard-sme/invoices":
        return { icon: Plus, action: () => {
          const event = new CustomEvent('createInvoice')
          window.dispatchEvent(event)
        }, show: true }
      case "/dashboard-sme/payment":
        return { icon: Plus, action: () => router.push("/dashboard-sme/payment/add"), show: true }
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
    if (item.href === "/dashboard-sme/filing-requests") {
      return hasFilingRequests
    }
    return true
  })

  // Items shown in bottom nav - we keep high-frequency modules for SMEs
  const bottomNavItems = [
    "/dashboard-sme/invoices",
    "/dashboard-sme/tax-calculator",
    "/dashboard-sme/transactions",
    "/dashboard-sme/reports"
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
          <Link href="/dashboard-sme" className={cn(
            "flex items-center gap-2 transition-all duration-300",
            sidebarCollapsed && "justify-center"
          )}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Calculator className="w-5 h-5 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-semibold text-lg whitespace-nowrap">OTax Business</span>
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

        <nav className="flex-1 px-4 space-y-8 overflow-y-auto overflow-x-hidden">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
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
              "w-full text-muted-foreground hover:text-foreground transition-all duration-200",
              sidebarCollapsed ? "justify-center px-2" : "justify-start"
            )} 
            size="lg"
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

      {/* Mobile Header - Headless: Menu icon left */}
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

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          <Link href="/dashboard-sme/invoices" className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] rounded-lg transition-colors">
            <FileCheck className={cn(
              "w-5 h-5",
              (pathname === "/dashboard-sme/invoices" || pathname?.startsWith("/dashboard-sme/invoices/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard-sme/invoices" || pathname?.startsWith("/dashboard-sme/invoices/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Invoices
            </span>
          </Link>

          <Link href="/dashboard-sme/transactions" className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] rounded-lg transition-colors">
            <Receipt className={cn(
              "w-5 h-5",
              (pathname === "/dashboard-sme/transactions" || pathname?.startsWith("/dashboard-sme/transactions/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard-sme/transactions" || pathname?.startsWith("/dashboard-sme/transactions/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Transactions
            </span>
          </Link>

          {/* Tax Calculator - Center, Round, Bigger */}
          <Link href="/dashboard-sme/tax-calculator" className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[70px] -mt-4">
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg",
              (pathname === "/dashboard-sme/tax-calculator" || pathname?.startsWith("/dashboard-sme/tax-calculator/")) 
                ? "bg-primary text-primary-foreground" 
                : "bg-primary/10 text-primary"
            )}>
              <Calculator className="w-7 h-7" />
            </div>
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard-sme/tax-calculator" || pathname?.startsWith("/dashboard-sme/tax-calculator/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Calculator
            </span>
          </Link>

          <Link href="/dashboard-sme/reports" className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] rounded-lg transition-colors">
            <TrendingUp className={cn(
              "w-5 h-5",
              (pathname === "/dashboard-sme/reports" || pathname?.startsWith("/dashboard-sme/reports/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard-sme/reports" || pathname?.startsWith("/dashboard-sme/reports/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Reports
            </span>
          </Link>

          <Link href="/dashboard-sme/payment" className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] rounded-lg transition-colors">
            <IdCardIcon className={cn(
              "w-5 h-5",
              (pathname === "/dashboard-sme/payment" || pathname?.startsWith("/dashboard-sme/payment/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard-sme/payment" || pathname?.startsWith("/dashboard-sme/payment/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Payment
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
              const isActive = item.href === "/dashboard-sme"
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
    </>
  )
}

