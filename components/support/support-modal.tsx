"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Mail, MessageSquare, Send, Loader2, ExternalLink, HelpCircle } from "lucide-react"
import { toast } from "sonner"
import { auth } from "@/firebase/firebase"

interface SupportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SupportModal({ open, onOpenChange }: SupportModalProps) {
  const [supportForm, setSupportForm] = useState({
    subject: '',
    message: '',
    category: 'general'
  })
  const [isSendingSupport, setIsSendingSupport] = useState(false)

  const handleSendEmail = async () => {
    if (!supportForm.subject.trim() || !supportForm.message.trim()) {
      toast.error("Please fill in both subject and message")
      return
    }

    setIsSendingSupport(true)
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        toast.error("Please log in to send support request")
        return
      }

      const token = await currentUser.getIdToken()
      const response = await fetch("/api/support/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: supportForm.subject,
          message: supportForm.message,
          category: supportForm.category
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message || "Support request sent successfully!")
        setSupportForm({
          subject: '',
          message: '',
          category: 'general'
        })
        onOpenChange(false)
      } else {
        toast.error(data.error || "Failed to send support request")
      }
    } catch (error) {
      console.error("Error sending support request:", error)
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsSendingSupport(false)
    }
  }

  const handleWhatsAppClick = () => {
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '2348128543248'
    const whatsappMessage = encodeURIComponent(
      `Hello! I need support with OTax.\n\n` +
      `My email: ${auth.currentUser?.email || 'N/A'}\n` +
      `User ID: ${auth.currentUser?.uid || 'N/A'}\n\n` +
      `How can you help me?`
    )
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Get Support</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Contact our support team via email or WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Email Support Form */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold">Send us an Email</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="modal-support-category" className="text-xs sm:text-sm">Category</Label>
                <Select
                  value={supportForm.category}
                  onValueChange={(value) => setSupportForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="technical">Technical Issue</SelectItem>
                    <SelectItem value="billing">Billing & Subscription</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modal-support-subject" className="text-xs sm:text-sm">Subject</Label>
                <Input
                  id="modal-support-subject"
                  value={supportForm.subject}
                  onChange={(e) => setSupportForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of your issue"
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modal-support-message" className="text-xs sm:text-sm">Message</Label>
                <Textarea
                  id="modal-support-message"
                  value={supportForm.message}
                  onChange={(e) => setSupportForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Please provide details about your issue or question..."
                  rows={6}
                  className="text-xs sm:text-sm resize-none"
                />
              </div>

              <Button
                onClick={handleSendEmail}
                disabled={isSendingSupport || !supportForm.subject.trim() || !supportForm.message.trim()}
                className="w-full"
              >
                {isSendingSupport ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* WhatsApp Support */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-base font-semibold">Chat with us on WhatsApp</h3>
            </div>
            
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Get instant support by messaging us on WhatsApp. Our team typically responds within 24 hours.
              </p>
              
              <Button
                onClick={handleWhatsAppClick}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Open WhatsApp
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Additional Support Info */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Need Help?
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Check our FAQ section for common questions</li>
              <li>• Response time: We typically respond within 24-48 hours</li>
              <li>• For urgent billing issues, please use WhatsApp for faster response</li>
              <li>• Include your User ID when contacting support for faster assistance</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

