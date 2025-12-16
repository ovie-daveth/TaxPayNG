"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useRouter } from "next/navigation"
import { auth } from "@/firebase/firebase"
import { toast } from "sonner"

interface OneTouchResubscribeButtonProps {
  className?: string
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export function OneTouchResubscribeButton({ 
  className = "",
  variant = "default",
  size = "default"
}: OneTouchResubscribeButtonProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const router = useRouter()
  const [isResubscribing, setIsResubscribing] = useState(false)

  const handleResubscribe = async () => {
    if (!user || !profile?.subscriptionType) {
      toast.error("Unable to resubscribe. Please select a plan.")
      return
    }

    setIsResubscribing(true)
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        router.push("/login")
        return
      }

      const token = await currentUser.getIdToken()

      // Initialize subscription payment for the same plan
      const response = await fetch("/api/subscription/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subscriptionType: profile.subscriptionType
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to initialize payment")
      }

      // Redirect to Paystack payment page
      if (data.data?.authorizationUrl) {
        window.location.href = data.data.authorizationUrl
      } else {
        throw new Error("Payment initialization failed - no authorization URL received")
      }
    } catch (error) {
      console.error("Resubscription error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to initialize payment")
      setIsResubscribing(false)
    }
  }

  if (!profile?.subscriptionType) {
    return null
  }

  return (
    <Button
      onClick={handleResubscribe}
      disabled={isResubscribing}
      variant={variant}
      size={size}
      className={className}
    >
      {isResubscribing ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          Resubscribe to {profile.subscriptionType}
        </>
      )}
    </Button>
  )
}

