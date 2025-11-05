"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  BookOpen, 
  Eye, 
  FileText, 
  TrendingUp, 
  Plus,
  Edit,
  Calendar,
  LogOut
} from "lucide-react"
import { EditorDashboardSkeleton } from "@/components/ui/skeletons"
import { useAuth } from "@/lib/hooks/useAuth"
import { useEditor } from "@/lib/hooks/useEditor"
import { toast } from "sonner"
import OtaxLogo from "@/components/OtaxLogo"
import { ThemeToggle } from "@/components/theme-toggle"
import { db } from "@/firebase/firebase"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { format } from "date-fns"

export default function EditorDashboard() {
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const { isEditor, loading: editorLoading } = useEditor()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalViews: 0,
    averageViews: 0
  })

  const handleLogout = async () => {
    try {
      const result = await logout()
      if (result.success) {
        toast.success("Logged out successfully")
        router.push("/blog")
      } else {
        toast.error(result.error || "Failed to log out")
      }
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Failed to log out")
    }
  }

  // Redirect if not editor
  useEffect(() => {
    if (!authLoading && !editorLoading) {
      if (!user) {
        router.push('/admin/login')
        return
      }
      if (!isEditor) {
        toast.error("Access denied. Editor privileges required.")
        router.push('/blog')
        return
      }
    }
  }, [user, isEditor, authLoading, editorLoading, router])

  // Fetch editor's blog posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!user || !isEditor) return

      try {
        setLoading(true)
        
        // Fetch all blog posts (we'll filter by author on client side)
        // In production, you might want to add an 'authorId' field to filter server-side
        const postsSnapshot = await getDocs(
          query(
            collection(db, "blogPosts"),
            orderBy("publishedAt", "desc")
          )
        )
        
        const allPosts = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Filter posts by authorId (preferred) or author name
        const userPosts = allPosts.filter((post: any) => 
          post.authorId === user.uid ||
          post.author?.toLowerCase().includes(user.email?.split('@')[0].toLowerCase() || '')
        )

        setPosts(userPosts)

        // Calculate stats
        const published = userPosts.filter((p: any) => p.status === 'published')
        const drafts = userPosts.filter((p: any) => p.status === 'draft')
        const totalViews = userPosts.reduce((sum: number, p: any) => sum + (p.views || 0), 0)
        const avgViews = published.length > 0 ? Math.round(totalViews / published.length) : 0

        setStats({
          totalPosts: userPosts.length,
          publishedPosts: published.length,
          draftPosts: drafts.length,
          totalViews,
          averageViews: avgViews
        })
      } catch (error) {
        console.error("Error fetching posts:", error)
        toast.error("Failed to load posts")
      } finally {
        setLoading(false)
      }
    }

    if (user && isEditor) {
      fetchPosts()
    }
  }, [user, isEditor])

  if (authLoading || editorLoading || loading) {
    return <EditorDashboardSkeleton />
  }

  if (!user || !isEditor) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <OtaxLogo />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/blog/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Button>
            </Link>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/blog">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Editor Dashboard</h1>
              <p className="text-muted-foreground">Manage your blog posts and track performance</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPosts}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.publishedPosts}</div>
              <p className="text-xs text-muted-foreground mt-1">Live posts</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.draftPosts}</div>
              <p className="text-xs text-muted-foreground mt-1">In progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">All posts</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Per post</p>
            </CardContent>
          </Card>
        </div>

        {/* Posts List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Blog Posts</CardTitle>
                <CardDescription>Manage and track your published content</CardDescription>
              </div>
              <Link href="/blog/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Post
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-4">Get started by creating your first blog post!</p>
                <Link href="/blog/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Post
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post: any) => (
                  <div
                    key={post.id}
                    className="border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{post.title}</h3>
                          <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                            {post.status}
                          </Badge>
                          <Badge variant="outline">{post.category}</Badge>
                        </div>
                        <p className="text-muted-foreground mb-3 line-clamp-2">{post.excerpt}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(post.publishedAt), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {post.views || 0} views
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {post.readTime}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Link href={`/blog/${post.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        <Link href={`/blog/${post.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

