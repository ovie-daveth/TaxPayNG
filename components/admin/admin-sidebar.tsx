"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Receipt, 
  FolderOpen, 
  Bell, 
  Calculator, 
  BookOpen, 
  UserCheck,
  Building2,
  Menu,
  X,
  LogOut,
  DollarSign,
  ClipboardList,
  Shield,
  PhoneCall
} from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/firebase/firebase"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"
import { cn } from "@/lib/utils"
import OtaxLogo from "../OtaxLogo"

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/dashboard/users", label: "Users", icon: Users },
  { href: "/admin/dashboard/activity-logs", label: "Activity Logs", icon: Shield },
  { href: "/admin/dashboard/blog", label: "Blog Posts", icon: BookOpen },
  { href: "/admin/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/dashboard/documents", label: "Documents", icon: FolderOpen },
  { href: "/admin/dashboard/filing-requests", label: "Filing Requests", icon: ClipboardList },
  { href: "/admin/dashboard/cac-requests", label: "CAC Requests", icon: Building2 },
  { href: "/admin/dashboard/cac-officers", label: "CAC Officers", icon: PhoneCall },
  { href: "/admin/dashboard/reminders", label: "Reminders", icon: Bell },
  { href: "/admin/dashboard/tax-calculations", label: "Tax Calculations", icon: Calculator },
  { href: "/admin/dashboard/exchange-rates", label: "Exchange Rates", icon: DollarSign },
  { href: "/admin/dashboard/waitlist", label: "Waitlist", icon: UserCheck },
]

export function AdminSidebar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      toast.success("Logged out successfully")
      router.push("/blog")
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Failed to log out")
    }
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-background/80 backdrop-blur border"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-40 transition-transform duration-300",
          "lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg text-primary flex items-center gap-2"><OtaxLogo /> <span className="text-sm text-muted-foreground font-normal">Admin</span></h2>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              // For Dashboard, only match exact path (not sub-routes)
              // For other routes, match exact path or sub-routes
              const isActive = item.href === "/admin/dashboard"
                ? pathname === item.href || pathname === item.href + "/"
                : pathname === item.href || pathname?.startsWith(item.href + "/")
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors my-1",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* User info and actions */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-muted-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  )
}

