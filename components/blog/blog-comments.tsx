"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, MessageSquare, Send, User as UserIcon } from "lucide-react"
import { db } from "@/firebase/firebase"
import { collection, addDoc, query, where, getDocs, orderBy, onSnapshot } from "firebase/firestore"
import { toast } from "sonner"
import { format } from "date-fns"
import { CommentTokenDialog } from "./comment-token-dialog"

interface Comment {
  id: string
  name: string
  email: string
  comment: string
  createdAt: string
  blogId: string
}

interface BlogCommentsProps {
  blogId: string | number
}

export function BlogComments({ blogId }: BlogCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [pendingEmail, setPendingEmail] = useState("")
  
  const [commentForm, setCommentForm] = useState({
    name: "",
    email: "",
    comment: ""
  })

  // Check if email exists in blogComments
  const checkEmailExists = async (email: string): Promise<boolean> => {
    if (!email || !email.includes("@")) return false
    
    try {
      const emailLower = email.toLowerCase().trim()
      const commentsQuery = query(
        collection(db, "blogComments"),
        where("email", "==", emailLower)
      )
      const commentsSnapshot = await getDocs(commentsQuery)
      
      return !commentsSnapshot.empty
    } catch (error) {
      console.error("Error checking email:", error)
      return false
    }
  }

  // Load comments
  useEffect(() => {
    const commentsRef = collection(db, "blogComments")
    const blogIdStr = blogId.toString()
    
    // Try with orderBy first, fallback without if index is missing
    let q = query(
      commentsRef,
      where("blogId", "==", blogIdStr),
      orderBy("createdAt", "desc")
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[]
      
      // Sort by date in case orderBy didn't work
      commentsData.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA // Descending order
      })
      
      setComments(commentsData)
      setLoading(false)
    }, (error) => {
      console.error("Error loading comments:", error)
      // Fallback: try without orderBy if index is missing
      const fallbackQuery = query(
        commentsRef,
        where("blogId", "==", blogIdStr)
      )
      
      const fallbackUnsubscribe = onSnapshot(fallbackQuery, (snapshot) => {
        const commentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Comment[]
        
        // Sort by date manually
        commentsData.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          return dateB - dateA // Descending order
        })
        
        setComments(commentsData)
        setLoading(false)
      }, (fallbackError) => {
        console.error("Error loading comments (fallback):", fallbackError)
        setLoading(false)
      })
      
      return () => fallbackUnsubscribe()
    })

    return () => unsubscribe()
  }, [blogId])

  // Handle comment submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!commentForm.name || !commentForm.email || !commentForm.comment.trim()) {
      toast.error("Please fill in all fields")
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(commentForm.email)) {
      toast.error("Please enter a valid email address")
      return
    }

    const emailLower = commentForm.email.toLowerCase().trim()

    // Check if email exists in blogComments
    setSubmitting(true)
    try {
      const emailExists = await checkEmailExists(emailLower)

      if (emailExists) {
        // Email exists, save comment directly
        const commentData = {
          blogId: blogId.toString(),
          name: commentForm.name.trim(),
          email: emailLower,
          comment: commentForm.comment.trim(),
          createdAt: new Date().toISOString()
        }
        
        await addDoc(collection(db, "blogComments"), commentData)
        toast.success("Comment posted successfully!")
        setCommentForm({ name: "", email: "", comment: "" })
      } else {
        // Email doesn't exist, send verification email
        const response = await fetch("/api/send-comment-verification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: emailLower,
            name: commentForm.name.trim(),
            comment: commentForm.comment.trim(),
            blogId: blogId.toString(),
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          toast.error(data.error || "Failed to send verification email")
          return
        }

        // If SMTP not configured, show token in toast
        if (data.smtpNotConfigured && data.token) {
          toast.info(
            `SMTP not configured. Use this code: ${data.token}`,
            { duration: 10000 }
          )
        }

        // Show token dialog
        setPendingEmail(emailLower)
        setShowTokenDialog(true)
        toast.success("Verification code sent to your email!")
      }
    } catch (error) {
      console.error("Error submitting comment:", error)
      toast.error("Failed to process comment. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle successful verification
  const handleVerified = () => {
    setCommentForm({ name: "", email: "", comment: "" })
    setShowTokenDialog(false)
    setPendingEmail("")
  }


  return (
    <div className="mt-16">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare className="w-6 h-6 text-primary" />
        <h2 className="text-3xl font-bold">Comments</h2>
        <span className="text-muted-foreground">({comments.length})</span>
      </div>

      {/* Comment Form */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-12">
        <h3 className="text-xl font-semibold mb-6">Leave a Comment</h3>
        <form onSubmit={handleCommentSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Input
                type="text"
                placeholder="Your Name"
                value={commentForm.name}
                onChange={(e) => setCommentForm(prev => ({ ...prev, name: e.target.value }))}
                required
                className="h-12"
                disabled={submitting}
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Your Email"
                value={commentForm.email}
                onChange={(e) => setCommentForm(prev => ({ ...prev, email: e.target.value }))}
                required
                className="h-12"
                disabled={submitting}
              />
            </div>
          </div>
          <div>
            <Textarea
              placeholder="Write your comment here..."
              value={commentForm.comment}
              onChange={(e) => setCommentForm(prev => ({ ...prev, comment: e.target.value }))}
              required
              rows={5}
              className="resize-none"
              disabled={submitting}
            />
          </div>
          <div className="flex items-center justify-end">
            <Button 
              type="submit" 
              size="lg"
              disabled={submitting}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Post Comment</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-2xl">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => {
            // Debug logging
            if (process.env.NODE_ENV === 'development') {
              console.log("Rendering comment:", comment)
            }
            return (
              <div key={comment.id} className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-lg">{comment.name}</h4>
                      <span className="text-sm text-muted-foreground">
                        {comment.createdAt ? format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a") : 'Recently'}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {comment.comment}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Comment Token Dialog */}
      <CommentTokenDialog
        open={showTokenDialog}
        onOpenChange={setShowTokenDialog}
        email={pendingEmail}
        onVerified={handleVerified}
      />
    </div>
  )
}
