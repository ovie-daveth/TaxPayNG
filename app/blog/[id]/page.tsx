"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Clock, User, Share2, BookOpen, Tag, Edit, Heart, Eye, Loader2 } from "lucide-react"
import { BlogDetailSkeleton } from "@/components/ui/skeletons"
import Footer from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { BlogComments } from "@/components/blog/blog-comments"
import { db } from "@/firebase/firebase"
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { format } from "date-fns"
import { useAuth } from "@/lib/hooks/useAuth"
import { useEditor } from "@/lib/hooks/useEditor"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { SiteHeader } from "@/components/site-header"
import { toast } from "sonner"

interface BlogPost {
  id: string
  title: string
  excerpt: string
  author: string
  authorId?: string
  publishedAt: string
  readTime: string
  category: string
  content: string
  featuredImage?: string
  status?: string
  isPublished?: boolean
  views?: number
  likeCount?: number
  likedBy?: string[]
}

export default function BlogDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { isEditor } = useEditor()
  const { isAdmin } = useAdmin()
  const postId = params.id as string
  const [post, setPost] = useState<BlogPost | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [views, setViews] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [viewTracked, setViewTracked] = useState(false)

  // Fetch blog post from Firestore
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postRef = doc(db, "blogPosts", postId)
        const postSnap = await getDoc(postRef)

        if (postSnap.exists()) {
          const postData = {
            id: postSnap.id,
            ...postSnap.data()
          } as BlogPost
          
          // Only show published posts to non-admins/non-editors
          if ((postData.status !== "published" || !postData.isPublished) && !isAdmin && !isEditor) {
            setLoading(false)
            return
          }
          
          setPost(postData)
          setViews(postData.views || 0)
          setLikeCount(postData.likeCount || 0)
          setIsLiked(user ? (postData.likedBy || []).includes(user.uid) : false)

          // Track view (only once per page load)
          if (!viewTracked && postData.isPublished) {
            trackView(postId)
            setViewTracked(true)
          }

          // Fetch related posts - only show published posts
          if (postData.category) {
            const relatedQuery = query(
              collection(db, "blogPosts"),
              where("category", "==", postData.category),
              where("isPublished", "==", true),
              orderBy("publishedAt", "desc"),
              limit(4)
            )
            const relatedSnapshot = await getDocs(relatedQuery)
            const related = relatedSnapshot.docs
              .map((doc) => ({
                id: doc.id,
                ...doc.data()
              })) as BlogPost[]
            // Filter out current post and limit to 3
            setRelatedPosts(related.filter(p => p.id !== postId).slice(0, 3))
          }
        } 
      } catch (error) {
        console.error("Error fetching blog post:", error)
        // Fallback to static data
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId, isAdmin, isEditor, user, viewTracked])

  // Track view function
  const trackView = async (blogId: string) => {
    try {
      await fetch("/api/blog/track-view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blogId }),
      })
    } catch (error) {
      console.error("Error tracking view:", error)
    }
  }

  // Handle like toggle
  const handleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like posts")
      return
    }

    if (liking) return

    setLiking(true)
    try {
      const response = await fetch("/api/blog/toggle-like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blogId: postId,
          userId: user.uid,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsLiked(data.liked)
        setLikeCount(data.likeCount)
        // Update post state
        setPost((prev) => prev ? {
          ...prev,
          likeCount: data.likeCount,
          likedBy: data.liked 
            ? [...(prev.likedBy || []), user.uid]
            : (prev.likedBy || []).filter(id => id !== user.uid)
        } : null)
      } else {
        toast.error(data.error || "Failed to update like")
      }
    } catch (error) {
      console.error("Error toggling like:", error)
      toast.error("Failed to update like")
    } finally {
      setLiking(false)
    }
  }

  if (loading) {
    return <BlogDetailSkeleton />
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
          <Link href="/blog">
            <Button>Back to Blog</Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        })
      } catch (err) {
        console.log('Error sharing', err)
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard!')
      } catch (err) {
        toast.error('Failed to copy link')
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader
        logoHref="/"
        highlightHref="/blog"
        wrapperClassName="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50"
        containerClassName="py-5"
        navItems={[
          { label: "Features", href: "/#features" },
          { label: "Pricing", href: "/pricing" },
          { label: "Blog", href: "/blog" },
          { label: "FAQ", href: "/faq" },
        ]}
        cta={{
          href: "/#waitlist",
          label: "Join the Waitlist",
          mobileLabel: "Join",
          showOnMobile: true,
        }}
      />

      {/* Article Content */}
      <article className="container mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="max-w-6xl mx-auto flex gap-8">
          {/* Sticky Sidebar */}
          <aside className="hidden lg:block flex-shrink-0 w-16">
            <div className="sticky top-1/2 -translate-y-1/2 flex flex-col items-center gap-6">
              <button
                onClick={handleLike}
                disabled={liking}
                className="flex flex-col items-center gap-1 hover:opacity-70 transition-opacity disabled:opacity-50"
              >
                {liking ? (
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                ) : (
                  <Heart className={`w-6 h-6 ${isLiked ? "fill-current text-primary" : "text-muted-foreground"}`} />
                )}
                <span className="text-xs font-medium text-muted-foreground">{likeCount}</span>
              </button>
              
              <div className="flex flex-col items-center gap-1">
                <Eye className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{views.toLocaleString()}</span>
              </div>
              
              <button
                onClick={handleShare}
                className="flex flex-col items-center gap-1 hover:opacity-70 transition-opacity cursor-pointer"
              >
                <Share2 className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Share</span>
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 max-w-4xl">
          {/* Back Button */}
          {isEditor ? (
            <Link href="/editor/dashboard">
              <Button variant="ghost" className="mb-8 -ml-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/blog">
              <Button variant="ghost" className="mb-8 -ml-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          )}

          {/* Article Header */}
          <header className="mb-8">
            <div className="mb-6">
              <Badge className="mb-4">{post.category}</Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                {post.title}
              </h1>
            </div>
            
            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-8 pb-8 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(post.publishedAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.readTime}</span>
              </div>
              {/* Mobile: Show views, likes, share */}
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{views.toLocaleString()}</span>
                </div>
                <Button
                  variant={isLiked ? "default" : "outline"}
                  size="sm"
                  onClick={handleLike}
                  disabled={liking}
                  className="gap-2"
                >
                  {liking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                  )}
                  <span>{likeCount}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
              {/* Edit Button - Show for admins or editors who own the post */}
              {(isAdmin || (isEditor && post.authorId === user?.uid)) && (
                <Link href={`/blog/${postId}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </Link>
              )}
            </div>
          </header>

          {/* Featured Image */}
          <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl mb-12 overflow-hidden relative">
            {post.featuredImage ? (
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-blue-600/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-muted-foreground/30" />
                </div>
              </>
            )}
          </div>

          {/* Article Content */}
          <div 
            className="article-content mb-16"
            dangerouslySetInnerHTML={{ __html: post.content }}
            dir="ltr"
            style={{ direction: 'ltr', textAlign: 'left' }}
          />

          {/* Tags/Categories */}
          <div className="flex items-center gap-3 mb-12 pb-8 border-b border-border">
            <Tag className="w-5 h-5 text-muted-foreground" />
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{post.category}</Badge>
              <Badge variant="outline">Tax Guide</Badge>
              <Badge variant="outline">Nigeria</Badge>
            </div>
          </div>

          {/* Author Card */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-16">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">{post.author}</h3>
                <p className="text-muted-foreground mb-4">
                  Our expert team provides comprehensive tax guidance and insights to help Nigerian taxpayers navigate the complex world of tax compliance.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Tax Professionals</span>
                  <span>•</span>
                  <span>Based in Nigeria</span>
                </div>
              </div>
            </div>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <section className="mb-16">
              <h2 className="text-3xl font-bold mb-8">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    href={`/blog/${relatedPost.id}`}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group"
                  >
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/10 relative overflow-hidden">
                      {relatedPost.featuredImage ? (
                        <img
                          src={relatedPost.featuredImage}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-blue-600/20" />
                      )}
                      <Badge className="absolute top-4 left-4">{relatedPost.category}</Badge>
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-lg mb-3 group-hover:text-primary transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{format(new Date(relatedPost.publishedAt), "MMM d, yyyy")}</span>
                        <span>•</span>
                        <span>{relatedPost.readTime}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Comments Section */}
          <BlogComments blogId={post.id} />

          {/* Back to Blog CTA */}
          <div className="text-center mt-10">
            {isEditor ? (
              <Link href="/editor/dashboard">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/blog">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  View All Articles
                </Button>
              </Link>
            )}
          </div>
          </div>
        </div>
      </article>

      {/* Footer */}
      <Footer />
    </div>
  )
}
