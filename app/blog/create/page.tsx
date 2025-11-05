"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Loader2, X, FileText } from "lucide-react"
import { BlogFormSkeleton } from "@/components/ui/skeletons"
import { RichTextEditor } from "@/components/blog/rich-text-editor"
import { db } from "@/firebase/firebase"
import { collection, addDoc } from "firebase/firestore"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/theme-toggle"
import OtaxLogo from "@/components/OtaxLogo"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { useEditor } from "@/lib/hooks/useEditor"
import { useUserProfile } from "@/lib/hooks/useUserProfile"

const categories = ["Tax Guide", "For Freelancers", "For SMEs", "Tax Tips", "Technology"]

export default function CreateBlogPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const { isEditor, loading: editorLoading } = useEditor()
  const { profile, loading: profileLoading } = useUserProfile()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    category: "",
    author: profile?.firstName && profile?.lastName 
      ? `${profile.firstName} ${profile.lastName}`
      : user?.email?.split('@')[0] || "OTax Team",
    content: "",
    featuredImage: "",
  })

  // Update author when profile loads
  useEffect(() => {
    if (profile && !isAdmin) {
      const authorName = profile.firstName && profile.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : user?.email?.split('@')[0] || "OTax Team"
      setFormData(prev => ({ ...prev, author: authorName }))
    }
  }, [profile, user, isAdmin])

  // Redirect logic: Admins go to admin dashboard, editors stay here, others redirect to blog
  useEffect(() => {
    if (!loading && !adminLoading && !editorLoading) {
      if (!user) {
        router.push("/blog")
        return
      }
      
      // If admin, redirect to admin dashboard create page
      if (isAdmin) {
        router.push("/admin/dashboard/create")
        return
      }
      
      // If not editor or admin, redirect to blog
      if (!isEditor) {
        toast.error("Editor or admin access required to create blog posts")
        router.push("/blog")
      }
    }
  }, [user, isAdmin, isEditor, loading, adminLoading, editorLoading, router])

  const handleSubmit = async (e: React.FormEvent, isPublished: boolean = true) => {
    e.preventDefault()

    // Check editor or admin access
    if (!user || (!isEditor && !isAdmin)) {
      toast.error("Editor or admin access required to create blog posts")
      router.push("/blog")
      return
    }

    // Validation
    if (!formData.title.trim()) {
      toast.error("Please enter a title")
      return
    }

    if (!formData.excerpt.trim()) {
      toast.error("Please enter an excerpt")
      return
    }

    if (!formData.category) {
      toast.error("Please select a category")
      return
    }

    if (!formData.content.trim() || formData.content === "<p></p>") {
      toast.error("Please write some content")
      return
    }

    setIsSubmitting(true)

    try {
      const blogData = {
        title: formData.title.trim(),
        excerpt: formData.excerpt.trim(),
        category: formData.category,
        author: formData.author,
        authorId: user.uid, // Store author ID for tracking
        content: formData.content,
        featuredImage: formData.featuredImage || "/placeholder.svg",
        createdAt: new Date().toISOString(),
        publishedAt: isPublished ? new Date().toISOString() : null,
        readTime: calculateReadTime(formData.content),
        status: isPublished ? "published" : "draft",
        isPublished: isPublished, // Add isPublished flag
        views: 0,
      }

      await addDoc(collection(db, "blogPosts"), blogData)

      toast.success(isPublished ? "Blog post published successfully!" : "Draft saved successfully!")
      
      // Redirect based on role
      if (isAdmin) {
        router.push("/admin/dashboard/blog")
      } else if (isEditor) {
        router.push("/editor/dashboard")
      } else {
        router.push("/blog")
      }
    } catch (error) {
      console.error("Error creating blog post:", error)
      toast.error("Failed to save blog post. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveDraft = async (e: React.FormEvent) => {
    await handleSubmit(e, false)
  }

  const calculateReadTime = (content: string): string => {
    // Remove HTML tags and calculate word count
    const text = content.replace(/<[^>]*>/g, "").trim()
    const words = text.split(/\s+/).length
    const minutes = Math.ceil(words / 200) // Average reading speed: 200 words per minute
    return `${minutes} min read`
  }

  const handleImageUpload = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size must be less than 10MB")
        return
      }

      try {
        toast.loading("Uploading featured image...")
        const { uploadToImageKit } = await import("@/lib/utils/imagekit")
        const result = await uploadToImageKit(file, 'blog/featured')
        
        setFormData(prev => ({ ...prev, featuredImage: result.url }))
        toast.dismiss()
        toast.success("Featured image uploaded!")
      } catch (error) {
        toast.dismiss()
        toast.error("Failed to upload image. Please try again.")
        console.error("Image upload error:", error)
      }
    }
    input.click()
  }

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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link href="/blog">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </Link>

        {loading || adminLoading || editorLoading ? (
          <BlogFormSkeleton />
        ) : !user || (!isAdmin && !isEditor) ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <p className="text-muted-foreground">Editor or admin access required to create blog posts.</p>
            <Link href="/admin/login">
              <Button>Go to Admin/Editor Login</Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-4xl font-bold mb-8">Create New Blog Post</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-base font-semibold mb-2">
              Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter blog post title..."
              className="h-12 text-base"
              required
            />
          </div>

          {/* Excerpt */}
          <div>
            <Label htmlFor="excerpt" className="text-base font-semibold mb-2">
              Excerpt *
            </Label>
            <Input
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Write a short description of your blog post..."
              className="h-12 text-base"
              required
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category" className="text-base font-semibold mb-2">
              Category *
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              required
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Featured Image */}
          <div>
            <Label className="text-base font-semibold mb-2 block">
              Featured Image
            </Label>
            {formData.featuredImage ? (
              <div className="relative">
                <img
                  src={formData.featuredImage}
                  alt="Featured"
                  className="w-full h-64 object-cover rounded-lg border border-border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setFormData(prev => ({ ...prev, featuredImage: "" }))}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleImageUpload}
                className="w-full h-32 border-dashed"
              >
                Upload Featured Image
              </Button>
            )}
          </div>

          {/* Content Editor */}
          <div>
            <Label className="text-base font-semibold mb-2 block">
              Content *
            </Label>
            <RichTextEditor
              content={formData.content}
              onChange={(content) => setFormData(prev => ({ ...prev, content }))}
              placeholder="Start writing your blog post..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t border-border">
            <Link href="/blog">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button 
              type="button" 
              onClick={handleSaveDraft} 
              disabled={isSubmitting} 
              variant="outline" 
              size="lg" 
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Save as Draft
                </>
              )}
            </Button>
            <Button type="submit" disabled={isSubmitting} size="lg" className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Publish Post
                </>
              )}
            </Button>
          </div>
        </form>
          </>
        )}
      </div>
    </div>
  )
}
