"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Lock } from "lucide-react"
import { subscriptionService } from "@/lib/services/subscriptionService"
import { SubscriptionType, BusinessType } from "@/lib/types"
import { auth } from "@/firebase/firebase"
import { toast } from "sonner"

interface SubscriptionRequiredModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessType: BusinessType
}

export function SubscriptionRequiredModal({
  open,
  onOpenChange,
  businessType
}: SubscriptionRequiredModalProps) {
  const router = useRouter()
  const [processingSubscription, setProcessingSubscription] = useState<string | null>(null)

  const getAvailablePlans = (): SubscriptionType[] => {
    if (businessType === 'sme') {
      return ['Small Business', 'Big Business']
    } else {
      return ['PRO', 'GOLD', 'PLATINUM']
    }
  }

  const availablePlans = getAvailablePlans()

  const handleSubscribe = async (planType: SubscriptionType) => {
    if (!window) return

    setProcessingSubscription(planType)
    try {
      // Get auth token
      const currentUser = auth.currentUser
      if (!currentUser) {
        router.push("/login")
        setProcessingSubscription(null)
        return
      }

      const token = await currentUser.getIdToken()

      // Initialize subscription payment
      const response = await fetch("/api/subscription/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subscriptionType: planType
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to initialize subscription")
      }

      // Redirect to Paystack payment page
      if (data.data?.authorizationUrl) {
        window.location.href = data.data.authorizationUrl
      } else {
        throw new Error("Payment initialization failed - no authorization URL received")
      }
    } catch (error) {
      console.error("Subscription error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to initialize subscription")
    } finally {
      setProcessingSubscription(null)
    }
  }

  const handleViewPricing = () => {
    router.push("/pricing")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Subscription Required</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Subscribe to a plan to unlock all features and start managing your taxes effectively.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6">
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Why subscribe?</strong> Our subscription plans give you access to:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm text-muted-foreground">
              <li>Transaction tracking and management</li>
              <li>Tax calculations and reports</li>
              <li>Document storage and management</li>
              <li>Email and SMS reminders</li>
              <li>Priority support</li>
            </ul>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {availablePlans.map((planType) => {
              const plan = subscriptionService.getPlan(planType)
              if (!plan) return null

              const isProcessing = processingSubscription === planType

              return (
                <Card 
                  key={planType} 
                  className="relative flex flex-col hover:border-primary transition-all"
                >
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>
                      {businessType === 'sme' 
                        ? planType === 'Small Business' 
                          ? 'For businesses with annual turnover ≤ ₦50-100 million'
                          : 'For businesses with turnover above small business threshold'
                        : planType === 'PRO'
                          ? 'Perfect for tech freelancers and independent professionals'
                          : planType === 'GOLD'
                          ? 'Ideal for content creators and influencers'
                          : 'For established creators with complex tax situations'}
                    </CardDescription>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{plan.priceDisplay}</span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {plan.features.slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {plan.features.length > 5 && (
                        <li className="text-xs text-muted-foreground">
                          +{plan.features.length - 5} more features
                        </li>
                      )}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => handleSubscribe(planType)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Processing...
                        </>
                      ) : (
                        "Subscribe Now"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={handleViewPricing}>
            View All Plans & Pricing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

