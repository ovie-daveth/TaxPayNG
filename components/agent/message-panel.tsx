"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, User, MessageCircle, X } from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"

interface Message {
  id: string
  requestId: string
  userId: string
  userName: string
  message: string
  userType: 'agent' | 'client'
  createdAt: string
  read: boolean
}

interface MessageModalProps {
  requestId: string
  userType: 'agent' | 'client'
}

export function MessageModal({ requestId, userType }: MessageModalProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadMessages()
    }
  }, [isOpen])

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    // Poll for new messages when modal is closed
    if (!isOpen) {
      const interval = setInterval(() => {
        checkUnreadMessages()
      }, 30000) // Check every 30 seconds

      return () => clearInterval(interval)
    }
  }, [isOpen])

  const checkUnreadMessages = async () => {
    try {
      const response = await fetch(`/api/filing-requests/${requestId}/messages`)
      const result = await response.json()
      
      if (result.success && result.data) {
        const unread = result.data.filter(
          (msg: Message) => !msg.read && msg.userId !== user?.uid
        ).length
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error("Error checking unread messages:", error)
    }
  }

  const loadMessages = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/filing-requests/${requestId}/messages`)
      const result = await response.json()
      
      if (result.success) {
        setMessages(result.data || [])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Error loading messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.uid || !profile) return

    setSending(true)
    try {
      const userName = userType === 'agent' 
        ? `${profile.firstName} ${profile.lastName}`
        : `${profile.firstName} ${profile.lastName}`

      const response = await fetch(`/api/filing-requests/${requestId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          userName,
          message: newMessage.trim(),
          userType
        })
      })

      const result = await response.json()

      if (result.success) {
        setNewMessage("")
        await loadMessages()
      } else {
        toast.error(result.error || "Failed to send message")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-16 right-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all relative"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageCircle className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </>
          )}
        </Button>
      </div>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-5 duration-300">
          <Card className="shadow-2xl border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Messages</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Chat with {userType === 'agent' ? 'the client' : 'your agent'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8 h-[400px]">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="h-[400px] overflow-y-auto pr-2" ref={scrollAreaRef}>
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="font-medium">No messages yet</p>
                          <p className="text-sm mt-2">
                            Start a conversation with {userType === 'agent' ? 'the client' : 'your agent'}
                          </p>
                        </div>
                      ) : (
                        [...messages].reverse().map((message) => {
                          const isOwnMessage = message.userId === user?.uid
                          return (
                            <div
                              key={message.id}
                              className={`flex gap-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                            >
                              {!isOwnMessage && (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-primary" />
                                </div>
                              )}
                              <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                                <div className={`rounded-lg px-4 py-2 ${
                                  isOwnMessage
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}>
                                  <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span>{message.userName}</span>
                                  <span>•</span>
                                  <span>{format(new Date(message.createdAt), 'MMM dd, hh:mm a')}</span>
                                </div>
                              </div>
                              {isOwnMessage && (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-primary" />
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Textarea
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      rows={2}
                      className="resize-none"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!newMessage.trim() || sending} 
                      size="lg" 
                      className="h-12 self-end"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}