"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Phone, ShieldCheck } from "lucide-react"

interface PhoneVerificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  phoneNumber: string
  onVerified: () => void
}

export function PhoneVerificationDialog({
  open,
  onOpenChange,
  phoneNumber,
  onVerified
}: PhoneVerificationDialogProps) {
  const [otp, setOtp] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [otpSent, setOtpSent] = useState(false)

  // Send OTP when dialog opens
  useEffect(() => {
    if (open && !otpSent) {
      sendOTP()
    }
  }, [open])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const sendOTP = async () => {
    setIsSending(true)
    try {
      const response = await fetch('/api/send-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send OTP')
      }

      toast.success('Verification code sent to your phone!')
      setOtpSent(true)
      setCountdown(60) // 60 second cooldown
    } catch (error) {
      console.error('Error sending OTP:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send verification code')
    } finally {
      setIsSending(false)
    }
  }

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch('/api/verify-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code')
      }

      toast.success('Phone number verified successfully!')
      onVerified()
      onOpenChange(false)
    } catch (error) {
      console.error('Error verifying OTP:', error)
      toast.error(error instanceof Error ? error.message : 'Invalid verification code')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = () => {
    if (countdown > 0) return
    sendOTP()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Phone className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl sm:text-2xl">
            Verify Your Phone Number
          </DialogTitle>
          <DialogDescription className="text-center text-sm sm:text-base">
            We've sent a 6-digit verification code to
            <br />
            <span className="font-semibold text-foreground">{phoneNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-sm font-medium">
              Verification Code
            </Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replaceAll(/\D/g, ''))}
              className="h-12 text-center text-2xl tracking-widest font-mono"
              disabled={isVerifying}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && otp.length === 6) {
                  verifyOTP()
                }
              }}
            />
          </div>

          <Button
            onClick={verifyOTP}
            disabled={isVerifying || otp.length !== 6}
            className="w-full h-12 text-base font-semibold"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Verify Phone Number
              </>
            )}
          </Button>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            <Button
              variant="ghost"
              onClick={handleResend}
              disabled={countdown > 0 || isSending}
              className="text-sm font-medium"
            >
              {(() => {
                if (isSending) {
                  return (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Sending...
                    </>
                  )
                }
                return countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'
              })()}
            </Button>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-xs sm:text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Your phone number is used for account security and important notifications. 
              We'll never share it with third parties.
            </span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
