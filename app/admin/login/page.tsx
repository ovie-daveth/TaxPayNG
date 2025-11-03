"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Lock } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { toast } from "sonner"
import OtaxLogo from "@/components/OtaxLogo"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AdminLoginPage() {
  const router = useRouter()
  const { signIn, user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  // Redirect if already logged in as admin
  useEffect(() => {
    if (!authLoading && !adminLoading && user && isAdmin) {
      router.push('/admin/dashboard')
    }
  }, [user, isAdmin, authLoading, adminLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await signIn({
      email: formData.email,
      password: formData.password
    })

    setIsLoading(false)

    if (result.success) {
      // Wait for auth state to update, then check admin status
      setTimeout(async () => {
        const { auth } = await import("@/firebase/firebase")
        const { onAuthStateChanged } = await import("firebase/auth")
        
        onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            // Check if user is admin
            const { adminService } = await import("@/lib/services/adminService")
            const isAdminUser = await adminService.isAdmin(currentUser.email || formData.email, currentUser.uid)
            
            if (isAdminUser) {
              // Ensure admin role is set in userProfile
              await adminService.setAdmin(currentUser.email || formData.email, currentUser.uid)
              await adminService.updateLastLogin(currentUser.email || formData.email, currentUser.uid)
              toast.success('Admin login successful!')
              router.push('/admin/dashboard')
            } else {
              toast.error('Access denied. Admin privileges required.')
              // Sign out the user if they're not admin
              const { signOut } = await import("firebase/auth")
              await signOut(auth)
            }
          }
        })
      }, 500)
    } else {
      toast.error(result.error || 'Failed to log in')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="px-[150px] mx-auto py-5 flex items-center justify-between">
          <Link href="/">
            <OtaxLogo />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/blog">
              <Button variant="ghost">Back to Blog</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                <Lock className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">Admin Login</h1>
            <p className="text-muted-foreground">
              Sign in to access the admin dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            <p>Admin access only</p>
          </div>
        </div>
      </div>
    </div>
  )
}
