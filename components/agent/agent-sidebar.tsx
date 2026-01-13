"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, 
  ClipboardList, 
  Wallet, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  User,
  Briefcase
} from "lucide-react"
import { useState } from "react"
import { useSidebar } from "@/lib/contexts/sidebar-context"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import OtaxLogo from "../OtaxLogo"

const navItems = [
  { href: "/consultant/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/consultant/dashboard/clients", label: "Clients", icon: User },
  { href: "/consultant/dashboard/requests", label: "Filing Requests", icon: ClipboardList },
  { href: "/consultant/dashboard/payments", label: "Payments", icon: Wallet },
  { href: "/consultant/dashboard/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/consultant/dashboard/settings", label: "Settings", icon: Settings },
]

export function AgentSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { sidebarCollapsed, toggleSidebar } = useSidebar()
  const { logout, user } = useAuth()
  const { profile } = useUserProfile()

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      toast.success('Logged out successfully!')
      router.push('/login')
    } else {
      toast.error(result.error || 'Failed to log out')
    }
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex fixed left-0 top-0 h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out z-50",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link href="/consultant/dashboard" className={cn(
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
          {navItems.map((item) => {
            const Icon = item.icon
            // For Dashboard, only match exact path (not sub-routes)
            // For other routes, match exact path or sub-routes
            let isActive = false
            if (item.href === "/consultant/dashboard") {
              // Dashboard: only match exact path, not sub-routes
              isActive = pathname === item.href || pathname === item.href + "/"
            } else {
              // Other routes: match exact path or sub-routes
              isActive = pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false)
            }
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
          {!sidebarCollapsed && profile && (
            <div className="px-3 py-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium truncate">
                  {profile.firstName} {profile.lastName}
                </p>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {profile.email}
              </p>
            </div>
          )}

          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-muted-foreground hover:text-foreground",
              sidebarCollapsed && "justify-center px-2"
            )}
            onClick={handleLogout}
            title={sidebarCollapsed ? "Logout" : undefined}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-card"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 h-screen w-64 flex flex-col border-r border-border bg-card z-50">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <OtaxLogo />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                // For Dashboard, only match exact path (not sub-routes)
                // For other routes, match exact path or sub-routes
                let isActive = false
                if (item.href === "/consultant/dashboard") {
                  // Dashboard: only match exact path, not sub-routes
                  isActive = pathname === item.href || pathname === item.href + "/"
                } else {
                  // Other routes: match exact path or sub-routes
                  isActive = pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false)
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                )
              })}
            </nav>

            <div className="p-4 border-t border-border space-y-3">
              {profile && (
                <div className="px-3 py-2 rounded-lg bg-muted/50 mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {profile.firstName} {profile.lastName}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                </div>
              )}

              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </Button>
            </div>
          </aside>
        </>
      )}
    </>
  )
}

