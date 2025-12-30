"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calculator, LayoutDashboard, Users, DollarSign, FileText, Settings, LogOut, ChevronLeft, ChevronRight, TrendingUp, Menu, Bell, User } from "lucide-react"
import OtaxLogo from "../OtaxLogo"
import { useState } from "react"
import { useSidebar } from "@/lib/contexts/sidebar-context"
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "sonner"
import { NotificationBell } from "../notifications/notification-bell"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useUserProfile } from "@/lib/contexts/user-profile-context"

const navItems = [
  { href: "/dashboard-sme", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard-sme/employees", label: "Employees", icon: Users },
  { href: "/dashboard-sme/payroll", label: "Payroll", icon: DollarSign },
  { href: "/dashboard-sme/paye", label: "PAYE Tax", icon: FileText },
  { href: "/dashboard-sme/reports", label: "Reports", icon: TrendingUp },
  { href: "/dashboard-sme/reminders", label: "Reminders", icon: Bell },
  { href: "/dashboard-sme/settings", label: "Settings", icon: Settings },
]

export function DashboardNavSME() {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarCollapsed, toggleSidebar } = useSidebar()
  const { logout } = useAuth()
  const { profile } = useUserProfile()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      toast.success('Logged out successfully!')
      router.push('/login')
    } else {
      toast.error(result.error || 'Failed to log out')
    }
  }

  // Items shown in bottom nav - only 4 items: Invoice, Transaction, Tax Calculator, Report
  // For SME, we'll use: Employees (as Invoice equivalent), PAYE (as Transaction equivalent), Tax Calculator, Reports
  const bottomNavItems = [
    "/dashboard-sme/employees",
    "/dashboard-sme/paye",
    "/dashboard-sme/tax-calculator",
    "/dashboard-sme/reports"
  ]

  // Items to show in the sidebar menu (all items except those in bottom nav)
  const menuNavItems = navItems.filter(item => {
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

        <nav className="flex-1 p-4 space-y-8">
          {navItems.map((item) => {
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

        <div className="p-4 border-t border-border">
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
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          <Link href="/dashboard-sme/employees" className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] rounded-lg transition-colors">
            <Users className={cn(
              "w-5 h-5",
              (pathname === "/dashboard-sme/employees" || pathname?.startsWith("/dashboard-sme/employees/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard-sme/employees" || pathname?.startsWith("/dashboard-sme/employees/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Employees
            </span>
          </Link>

          <Link href="/dashboard-sme/paye" className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] rounded-lg transition-colors">
            <FileText className={cn(
              "w-5 h-5",
              (pathname === "/dashboard-sme/paye" || pathname?.startsWith("/dashboard-sme/paye/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard-sme/paye" || pathname?.startsWith("/dashboard-sme/paye/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              PAYE
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

          <Link href="/dashboard-sme/payroll" className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] rounded-lg transition-colors">
            <DollarSign className={cn(
              "w-5 h-5",
              (pathname === "/dashboard-sme/payroll" || pathname?.startsWith("/dashboard-sme/payroll/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-[10px] font-medium",
              (pathname === "/dashboard-sme/payroll" || pathname?.startsWith("/dashboard-sme/payroll/")) 
                ? "text-primary" 
                : "text-muted-foreground"
            )}>
              Payroll
            </span>
          </Link>
        </div>
      </nav>

      {/* Mobile Menu Sheet - Slides from left, full screen */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="!w-full !max-w-full p-0">
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
        </SheetContent>
      </Sheet>
    </>
  )
}

