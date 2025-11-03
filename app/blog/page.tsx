"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Calendar, Clock, User, Tag, Search, Plus } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import OtaxLogo from "@/components/OtaxLogo"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { db } from "@/firebase/firebase"
import { collection, query, where, getDocs, orderBy, onSnapshot } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { format } from "date-fns"

interface BlogPost {
  id: string
  title: string
  excerpt: string
  author: string
  publishedAt: string
  readTime: string
  category: string
  featuredImage?: string
  status: string
}

const categories = ["All", "Tax Guide", "For Freelancers", "For SMEs", "Tax Tips", "Technology"]

export default function BlogPage() {
  const { user } = useAuth()
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  // Fetch blog posts from Firestore
  useEffect(() => {
    const postsRef = collection(db, "blogPosts")
    const q = query(
      postsRef,
      where("status", "==", "published"),
      orderBy("publishedAt", "desc")
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as BlogPost[]
      setBlogPosts(posts)
      setLoading(false)
    }, (error) => {
      console.error("Error loading blog posts:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Filter posts
  const filteredPosts = blogPosts.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="px-[150px] mx-auto py-5 flex items-center justify-between">
          <Link href="/">
            <OtaxLogo />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/blog" className="text-sm font-medium text-foreground">
              Blog
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user && (
              <Link href="/blog/create">
                <Button variant="outline" size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Post
                </Button>
              </Link>
            )}
            <Link href="/#waitlist">
              <Button size="lg" className="">
                <span className="relative z-10">Join the Waitlist</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 md:pt-28 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Tax <span className="bg-gradient-to-r from-green-600 via-green-700 to-green-600 bg-clip-text text-transparent">Insights & Guides</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Expert advice, practical tips, and comprehensive guides to help you navigate Nigerian tax regulations with confidence.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto mb-12">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search articles..."
              className="pl-12 pr-4 h-12 text-base w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={category === selectedCategory ? "default" : "outline"}
                className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No blog posts found.</p>
              {user && (
                <Link href="/blog/create" className="mt-4 inline-block">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Post
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group"
                >
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/10 relative overflow-hidden">
                    {post.featuredImage ? (
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-blue-600/20" />
                    )}
                    <Badge className="absolute top-4 left-4">{post.category}</Badge>
                  </div>
                  <div className="p-6 md:p-8">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(post.publishedAt), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                    <h2 className="text-xl font-bold mb-4 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                      {post.title}
                    </h2>
                    <p className="text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{post.author}</span>
                      </div>
                      <Link
                        href={`/blog/${post.id}`}
                        className="text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-1.5 group/link"
                      >
                        Read More
                        <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-3xl p-12 md:p-16 text-center shadow-2xl border border-primary/50">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Stay Updated with Tax News
            </h2>
            <p className="text-xl mb-8 opacity-95">
              Get the latest tax tips, guides, and Nigerian tax regulation updates delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                className="h-12 text-base bg-background text-foreground"
              />
              <Button size="lg" variant="secondary" className="h-12 text-base">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/">
              <OtaxLogo />
            </Link>
            <p className="text-sm text-muted-foreground">© 2025 OTax. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
