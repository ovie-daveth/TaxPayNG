"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, MessageSquare, Send, User as UserIcon } from "lucide-react"
import { db } from "@/firebase/firebase"
import { collection, addDoc, query, where, getDocs, orderBy, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore"
import { toast } from "sonner"
import { format } from "date-fns"

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
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [isOnWaitlist, setIsOnWaitlist] = useState(false)
  const [checkingWaitlist, setCheckingWaitlist] = useState(false)
  
  const [commentForm, setCommentForm] = useState({
    name: "",
    email: "",
    comment: ""
  })
  
  const [waitlistForm, setWaitlistForm] = useState({
    name: "",
    email: "",
    phone: ""
  })
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false)
  const [isWaitlistSubmitted, setIsWaitlistSubmitted] = useState(false)

  // Check if email is on waitlist
  const checkWaitlistStatus = async (email: string) => {
    if (!email || !email.includes("@")) return false
    
    setCheckingWaitlist(true)
    try {
      const emailLower = email.toLowerCase().trim()
      
      // Try checking by document ID first (if waitlist uses email as document ID)
      const waitlistDocById = await getDoc(doc(db, "waitlist", emailLower))
      if (waitlistDocById.exists()) {
        console.log("Email found in waitlist by document ID")
        return true
      }
      
      // Also check by querying email field (in case waitlist uses auto-generated IDs)
      const waitlistQuery = query(
        collection(db, "waitlist"),
        where("email", "==", emailLower)
      )
      const waitlistSnapshot = await getDocs(waitlistQuery)
      
      if (!waitlistSnapshot.empty) {
        console.log("Email found in waitlist by query")
        return true
      }
      
      console.log("Email NOT found in waitlist")
      return false
    } catch (error) {
      console.error("Error checking waitlist:", error)
      return false
    } finally {
      setCheckingWaitlist(false)
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

    // Check if user is on waitlist
    const emailLower = commentForm.email.toLowerCase().trim()
    const onWaitlist = await checkWaitlistStatus(emailLower)
    
    console.log("Waitlist check result for", emailLower, ":", onWaitlist)

    // Only show modal if NOT on waitlist
    if (!onWaitlist) {
      console.log("User not on waitlist, showing modal")
      setUserEmail(emailLower)
      setWaitlistForm({
        name: commentForm.name,
        email: commentForm.email,
        phone: ""
      })
      setShowWaitlistModal(true)
      return
    }
    
    // If on waitlist, proceed directly to comment submission
    console.log("User is on waitlist, proceeding with comment submission")

    // Submit comment
    setSubmitting(true)
    try {
      const commentData = {
        blogId: blogId.toString(),
        name: commentForm.name.trim(),
        email: emailLower,
        comment: commentForm.comment.trim(),
        createdAt: new Date().toISOString()
      }
      
      console.log("Submitting comment:", commentData)
      const docRef = await addDoc(collection(db, "blogComments"), commentData)
      console.log("Comment submitted with ID:", docRef.id)

      toast.success("Comment posted successfully!")
      setCommentForm({ name: "", email: "", comment: "" })
    } catch (error) {
      console.error("Error submitting comment:", error)
      toast.error("Failed to post comment. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle waitlist submission
  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingWaitlist(true)

    try {
      if (!waitlistForm.name || !waitlistForm.email) {
        toast.error("Please fill in your name and email")
        setIsSubmittingWaitlist(false)
        return
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(waitlistForm.email)) {
        toast.error("Please enter a valid email address")
        setIsSubmittingWaitlist(false)
        return
      }

      if (waitlistForm.phone && waitlistForm.phone.trim() !== "") {
        const phoneRegex = /^(\+234|0)?[789][01]\d{8}$/
        if (!phoneRegex.test(waitlistForm.phone.replace(/\s/g, ""))) {
          toast.error("Please enter a valid Nigerian phone number")
          setIsSubmittingWaitlist(false)
          return
        }
      }

      const emailLower = waitlistForm.email.toLowerCase().trim()
      const waitlistDoc = await getDoc(doc(db, "waitlist", emailLower))
      
      if (waitlistDoc.exists()) {
        toast.error("That email is already on the waitlist!")
        setIsSubmittingWaitlist(false)
        return
      }

      await setDoc(doc(db, "waitlist", emailLower), {
        name: waitlistForm.name.trim(),
        email: emailLower,
        phone: waitlistForm.phone ? waitlistForm.phone.replace(/\s/g, "") : "",
        createdAt: new Date().toISOString(),
        status: "pending",
        notified: false
      })

      setIsWaitlistSubmitted(true)
      setIsOnWaitlist(true)
      toast.success("🎉 You're on the waitlist! You can now comment.")
      
      // Auto-submit comment after joining waitlist
      setTimeout(async () => {
        try {
          const commentData = {
            blogId: blogId.toString(),
            name: waitlistForm.name.trim(),
            email: emailLower,
            comment: commentForm.comment.trim(),
            createdAt: new Date().toISOString()
          }
          
          console.log("Auto-submitting comment after waitlist:", commentData)
          const docRef = await addDoc(collection(db, "blogComments"), commentData)
          console.log("Comment submitted with ID:", docRef.id)
          
          toast.success("Comment posted successfully!")
          setCommentForm({ name: "", email: "", comment: "" })
          setShowWaitlistModal(false)
          setIsWaitlistSubmitted(false)
        } catch (error) {
          console.error("Error submitting comment:", error)
          toast.error("Failed to post comment. Please try again.")
        }
      }, 1500)
    } catch (error) {
      console.error("Error submitting waitlist:", error)
      toast.error("Oops! Something went wrong. Please try again.")
    } finally {
      setIsSubmittingWaitlist(false)
    }
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
                disabled={submitting || checkingWaitlist}
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
                disabled={submitting || checkingWaitlist}
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
              disabled={submitting || checkingWaitlist}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              * You must be on the waitlist to comment
            </p>
            <Button 
              type="submit" 
              size="lg"
              disabled={submitting || checkingWaitlist}
              className="gap-2"
            >
              {submitting || checkingWaitlist ? (
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

      {/* Waitlist Modal */}
      <Dialog open={showWaitlistModal} onOpenChange={setShowWaitlistModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Join the Waitlist to Comment</DialogTitle>
            <DialogDescription>
              You need to be on our waitlist to post comments. Join now to share your thoughts!
            </DialogDescription>
          </DialogHeader>

          {isWaitlistSubmitted ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">You're on the waitlist!</h3>
              <p className="text-muted-foreground">
                Your comment will be posted automatically...
              </p>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-4 mt-4">
              <div>
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={waitlistForm.name}
                  onChange={(e) => setWaitlistForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="h-12"
                  disabled={isSubmittingWaitlist}
                />
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={waitlistForm.email}
                  onChange={(e) => setWaitlistForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="h-12"
                  disabled={isSubmittingWaitlist}
                />
              </div>
              <div>
                <Input
                  type="tel"
                  placeholder="Phone Number (Optional)"
                  value={waitlistForm.phone}
                  onChange={(e) => setWaitlistForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="h-12"
                  disabled={isSubmittingWaitlist}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                🔒 We respect your privacy. We'll only contact you when we launch or have important updates.
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowWaitlistModal(false)}
                  disabled={isSubmittingWaitlist}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingWaitlist}
                  className="flex-1"
                >
                  {isSubmittingWaitlist ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join Waitlist & Comment"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
