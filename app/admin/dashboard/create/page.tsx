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

const categories = ["Tax Guide", "For Freelancers", "For SMEs", "Tax Tips", "Technology"]

export default function AdminCreateBlogPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    category: "",
    author: "OTax Team",
    content: "",
    featuredImage: "",
  })

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !adminLoading) {
      if (!user || !isAdmin) {
        toast.error("Admin access required to create blog posts")
        router.push("/admin/login")
      }
    }
  }, [user, isAdmin, loading, adminLoading, router])

  const handleSubmit = async (e: React.FormEvent, isPublished: boolean = true) => {
    e.preventDefault()

    if (!user || !isAdmin) {
      toast.error("Admin access required")
      return
    }

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
      router.push("/admin/dashboard/blog")
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
    const text = content.replace(/<[^>]*>/g, "").trim()
    const words = text.split(/\s+/).length
    const minutes = Math.ceil(words / 200)
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

  if (loading || adminLoading) {
    return <BlogFormSkeleton />
  }

  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <OtaxLogo />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/admin/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link href="/admin/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Create New Blog Post</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="flex justify-end gap-4 pt-6 border-t border-border">
            <Link href="/admin/dashboard">
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
      </div>
    </div>
  )
}
