"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface TokenInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  onVerified: () => void
}

export function TokenInputDialog({ open, onOpenChange, email, onVerified }: TokenInputDialogProps) {
  const [token, setToken] = useState("")
  const [verifying, setVerifying] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token || token.length !== 6) {
      toast.error("Please enter a valid 6-digit code")
      return
    }

    setVerifying(true)
    try {
      const response = await fetch('/api/verify-waitlist-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Verification failed')
        return
      }

      toast.success("✅ Email verified! You're now on the waitlist!")
      setToken("")
      onVerified()
      onOpenChange(false)
    } catch (error) {
      console.error('Verification error:', error)
      toast.error('Failed to verify token. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    // This would trigger resending the token
    // For now, just show a message
    toast.info("Please use the code already sent to your email")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Verification Code</DialogTitle>
          <DialogDescription>
            We sent a 6-digit verification code to <strong>{email}</strong>
            <br />
            Please check your inbox and enter the code below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4 mt-4">
          <div>
            <Input
              type="text"
              placeholder="000000"
              value={token}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                setToken(value)
              }}
              maxLength={6}
              className="h-14 text-center text-2xl font-mono tracking-widest"
              disabled={verifying}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={verifying}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={verifying || token.length !== 6}
              className="flex-1"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              className="text-sm text-muted-foreground hover:text-foreground underline"
              disabled={verifying}
            >
              Didn't receive the code? Resend
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
