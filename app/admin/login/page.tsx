"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Lock, BookOpen, LayoutDashboard } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { useEditor } from "@/lib/hooks/useEditor"
import { toast } from "sonner"
import OtaxLogo from "@/components/OtaxLogo"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AdminLoginPage() {
  const router = useRouter()
  const { signIn, user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const { isEditor, loading: editorLoading } = useEditor()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'editor' | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && !adminLoading && !editorLoading && user) {
      if (isAdmin) {
        setUserRole('admin')
        setIsLoggedIn(true)
      } else if (isEditor) {
        setUserRole('editor')
        setIsLoggedIn(true)
      }
    }
  }, [user, isAdmin, isEditor, authLoading, adminLoading, editorLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await signIn({
      email: formData.email,
      password: formData.password
    })

    setIsLoading(false)

    if (result.success) {
      // Wait for auth state to update, then check admin/editor status
      setTimeout(async () => {
        const { auth } = await import("@/firebase/firebase")
        const { onAuthStateChanged } = await import("firebase/auth")
        
        onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            // Check if user is admin or editor
            const { adminService } = await import("@/lib/services/adminService")
            const isAdminUser = await adminService.isAdmin(currentUser.email || formData.email, currentUser.uid)
            const isEditorUser = await adminService.isEditor(currentUser.email || formData.email, currentUser.uid)
            
            if (isAdminUser) {
              // Ensure admin role is set in userProfile
              await adminService.setAdmin(currentUser.email || formData.email, currentUser.uid)
              await adminService.updateLastLogin(currentUser.email || formData.email, currentUser.uid)
              toast.success('Admin login successful!')
              setUserRole('admin')
              setIsLoggedIn(true)
            } else if (isEditorUser) {
              toast.success('Editor login successful!')
              setUserRole('editor')
              setIsLoggedIn(true)
            } else {
              toast.error('Access denied. Admin or Editor privileges required.')
              // Sign out the user if they're not admin or editor
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
            <h1 className="text-3xl font-bold">Admin/Editor Login</h1>
            <p className="text-muted-foreground">
              {isLoggedIn 
                ? `Welcome back, ${userRole === 'admin' ? 'Admin' : 'Editor'}!`
                : "Sign in to access the dashboard"
              }
            </p>
          </div>

          {isLoggedIn ? (
            <div className="space-y-4">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  You're logged in as <strong>{userRole === 'admin' ? 'Admin' : 'Editor'}</strong>
                </p>
                <div className="flex flex-col gap-3">
                  <Link href="/blog/create" className="w-full">
                    <Button className="w-full h-12" size="lg">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Create Blog Post
                    </Button>
                  </Link>
                  {userRole === 'admin' ? (
                    <Link href="/admin/dashboard" className="w-full">
                      <Button className="w-full h-12" variant="outline" size="lg">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Go to Admin Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/editor/dashboard" className="w-full">
                      <Button className="w-full h-12" variant="outline" size="lg">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Go to Editor Dashboard
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : (
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
          )}
          
          {!isLoggedIn && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Admin or Editor access only</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
