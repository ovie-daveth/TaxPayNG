"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
// ScrollArea not available, using div with overflow
import { Loader2, Send, User } from "lucide-react"
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

interface MessagePanelProps {
  requestId: string
  userType: 'agent' | 'client'
}

export function MessagePanel({ requestId, userType }: MessagePanelProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/filing-requests/${requestId}/messages`)
      const result = await response.json()
      
      if (result.success) {
        setMessages(result.data || [])
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[400px] overflow-y-auto pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No messages yet</p>
                <p className="text-sm mt-2">Start a conversation with {userType === 'agent' ? 'the client' : 'your agent'}</p>
              </div>
            ) : (
              messages.map((message) => {
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
                        <p className="text-sm">{message.message}</p>
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
        <div className="flex gap-2">
          <Textarea
            placeholder={`Type a message to ${userType === 'agent' ? 'the client' : 'your agent'}...`}
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
          <Button onClick={sendMessage} disabled={!newMessage.trim() || sending} size="icon" className="h-auto">
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

