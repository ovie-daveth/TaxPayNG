"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Calendar, Clock, User, Tag, Search } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import OtaxLogo from "@/components/OtaxLogo"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const blogPosts = [
  {
    id: 1,
    title: "Understanding Nigerian Tax Laws: A Complete Guide for 2026",
    excerpt: "Navigate the latest Nigerian tax regulations with confidence. Learn about LIRS and NRS compliance, deductions, and how to maximize your tax savings.",
    author: "OTax Team",
    date: "January 15, 2026",
    readTime: "8 min read",
    category: "Tax Guide",
    image: "/placeholder.svg"
  },
  {
    id: 2,
    title: "10 Essential Tax Deductions Every Nigerian Freelancer Should Know",
    excerpt: "Discover the deductions and reliefs available to freelancers in Nigeria. From home office expenses to professional development costs, maximize your savings.",
    author: "OTax Team",
    date: "January 10, 2026",
    readTime: "6 min read",
    category: "For Freelancers",
    image: "/placeholder.svg"
  },
  {
    id: 3,
    title: "SME Tax Compliance: Everything You Need to Know",
    excerpt: "Small and medium enterprises in Nigeria have unique tax obligations. Learn how to stay compliant while optimizing your business tax strategy.",
    author: "OTax Team",
    date: "January 5, 2026",
    readTime: "10 min read",
    category: "For SMEs",
    image: "/placeholder.svg"
  },
  {
    id: 4,
    title: "How to Prepare for Tax Season: A Step-by-Step Checklist",
    excerpt: "Tax season doesn't have to be stressful. Follow our comprehensive checklist to prepare your documents, organize receipts, and file on time.",
    author: "OTax Team",
    date: "December 28, 2025",
    readTime: "7 min read",
    category: "Tax Tips",
    image: "/placeholder.svg"
  },
  {
    id: 5,
    title: "Digital Tax Filing: The Future of Tax Management in Nigeria",
    excerpt: "Explore how digital solutions are transforming tax management in Nigeria. Learn about e-filing, digital receipts, and automated compliance.",
    author: "OTax Team",
    date: "December 20, 2025",
    readTime: "5 min read",
    category: "Technology",
    image: "/placeholder.svg"
  },
  {
    id: 6,
    title: "Common Tax Mistakes to Avoid: Lessons from Real Cases",
    excerpt: "Learn from common tax filing mistakes and how to avoid them. Real examples from Nigerian taxpayers and practical solutions.",
    author: "OTax Team",
    date: "December 15, 2025",
    readTime: "9 min read",
    category: "Tax Tips",
    image: "/placeholder.svg"
  }
]

const categories = ["All", "Tax Guide", "For Freelancers", "For SMEs", "Tax Tips", "Technology"]

export default function BlogPage() {
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
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={category === "All" ? "default" : "outline"}
                className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group"
              >
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-blue-600/20" />
                  <Badge className="absolute top-4 left-4">{post.category}</Badge>
                </div>
                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-5">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{post.date}</span>
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
