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
import { MigrateToCreatorModal } from "./migrate-to-creator-modal"
import { MigrateToFreelancerModal } from "./migrate-to-freelancer-modal"

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
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [showFreelancerMigrationModal, setShowFreelancerMigrationModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType | null>(null)

  const getAvailablePlans = (): SubscriptionType[] => {
    if (businessType === 'sme') {
      return ['Small Business', 'Big Business']
    } else {
      return ['PRO', 'GOLD', 'PLATINUM']
    }
  }

  const availablePlans = getAvailablePlans()

  // Check if migration is needed
  // - Freelancer trying to subscribe to GOLD or PLATINUM (needs to migrate to creator)
  // - Creator trying to subscribe to PRO (needs to migrate to freelancer)
  const needsMigration = (planType: SubscriptionType): boolean => {
    if (businessType === 'freelancer' && (planType === 'GOLD' || planType === 'PLATINUM')) {
      return true
    }
    if (businessType === 'creator' && planType === 'PRO') {
      return true
    }
    return false
  }

  const handleSubscribe = async (planType: SubscriptionType) => {
    console.log('=== handleSubscribe START ===', { planType, businessType, window: typeof window })
    
    if (typeof window === 'undefined') {
      console.log('Window is undefined, returning')
      return
    }

    console.log('handleSubscribe called:', { planType, businessType, needsMigration: needsMigration(planType) })

    // Check if migration is needed
    if (needsMigration(planType)) {
      console.log('Migration needed - showing migration modal')
      console.log('Setting selectedPlan to:', planType)
      setSelectedPlan(planType)
      // Show appropriate migration modal based on direction
      setTimeout(() => {
        if (businessType === 'creator' && planType === 'PRO') {
          console.log('Setting showFreelancerMigrationModal to true')
          setShowFreelancerMigrationModal(true)
        } else if (businessType === 'freelancer' && (planType === 'GOLD' || planType === 'PLATINUM')) {
          console.log('Setting showMigrationModal to true')
          setShowMigrationModal(true)
        }
      }, 0)
      return
    }

    // Proceed with subscription only if no migration needed
    console.log('No migration needed - proceeding with subscription')
    await proceedWithSubscription(planType)
  }

  const handleMigrateAndSubscribe = async () => {
    if (!selectedPlan) return

    try {
      // Get auth token
      const currentUser = auth.currentUser
      if (!currentUser) {
        router.push("/login")
        return
      }

      const token = await currentUser.getIdToken()

      // Determine target business type based on plan
      let targetBusinessType: string
      if (businessType === 'freelancer' && (selectedPlan === 'GOLD' || selectedPlan === 'PLATINUM')) {
        targetBusinessType = 'creator'
      } else if (businessType === 'creator' && selectedPlan === 'PRO') {
        targetBusinessType = 'freelancer'
      } else {
        throw new Error("Invalid migration path")
      }

      // Update business type
      const updateResponse = await fetch("/api/user/update-business-type", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          businessType: targetBusinessType
        })
      })

      const updateData = await updateResponse.json()

      if (!updateResponse.ok || !updateData.success) {
        throw new Error(updateData.error || "Failed to update business type")
      }

      // Migration successful - proceed silently to payment
      // Close migration modals first
      setShowMigrationModal(false)
      setShowFreelancerMigrationModal(false)
      // Close subscription modal
      onOpenChange(false)
      // Small delay to ensure modals close, then proceed with subscription
      setTimeout(() => {
        proceedWithSubscription(selectedPlan)
      }, 300)
    } catch (error) {
      console.error("Migration error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to migrate account")
      throw error
    }
  }

  const proceedWithSubscription = async (planType: SubscriptionType) => {
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
    <>
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Don't allow closing if migration modal is showing
      if (!isOpen && (showMigrationModal || showFreelancerMigrationModal)) {
        return
      }
      onOpenChange(isOpen)
    }}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-5xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader className="p-0">
          <div className="flex flex-col items-center text-center">
            <DialogTitle className="text-base sm:text-xl md:text-2xl flex items-center gap-2 justify-center">
              Subscription Required
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">
              Subscribe to a plan to unlock all features and start managing your taxes effectively.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-4 sm:mt-6">
          <div className="bg-muted/50 border border-border rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <p className="text-xs sm:text-sm text-muted-foreground">
              <strong className="text-foreground">Why subscribe?</strong> Our subscription plans give you access to:
            </p>
            <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
              <li>Transaction tracking and management</li>
              <li>Tax calculations and reports</li>
              <li>Document storage and management</li>
              <li>Email and SMS reminders</li>
              <li>Priority support</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {availablePlans.map((planType) => {
              const plan = subscriptionService.getPlan(planType)
              if (!plan) return null

              const isProcessing = processingSubscription === planType

              return (
                <Card 
                  key={planType} 
                  className="relative flex flex-col hover:border-primary transition-all"
                >
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-base sm:text-lg md:text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1 sm:mt-2">
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
                    <div className="mt-3 sm:mt-4">
                      <div className="flex items-baseline gap-1.5 sm:gap-2">
                        <span className="text-xl sm:text-2xl md:text-3xl font-bold">{plan.priceDisplay}</span>
                        <span className="text-xs sm:text-sm text-muted-foreground">/month</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-3 sm:p-6 pt-0">
                    <ul className="space-y-1.5 sm:space-y-2">
                      {plan.features.slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {plan.features.length > 5 && (
                        <li className="text-[10px] sm:text-xs text-muted-foreground">
                          +{plan.features.length - 5} more features
                        </li>
                      )}
                    </ul>
                  </CardContent>
                  <CardFooter className="p-3 sm:p-6 pt-0">
                    <Button
                      className="w-full h-8 sm:h-10 text-xs sm:text-sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('=== BUTTON CLICKED ===', planType)
                        handleSubscribe(planType).catch(err => {
                          console.error('Error in handleSubscribe:', err)
                        })
                      }}
                      disabled={isProcessing || (businessType === 'sme' && planType === 'Big Business')}
                    >
                      {businessType === 'sme' && planType === 'Big Business' ? (
                        "Coming Soon"
                      ) : isProcessing ? (
                        <>
                          <span className="animate-spin mr-1.5 sm:mr-2">⏳</span>
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

        <div className="mt-4 sm:mt-6 flex justify-center">
          <Button variant="outline" onClick={handleViewPricing} className="h-8 sm:h-10 text-xs sm:text-sm">
            View All Plans & Pricing
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Migration modal - Creator (for freelancer -> creator) */}
    {selectedPlan && businessType === 'freelancer' && (
      <MigrateToCreatorModal
        open={showMigrationModal}
        onOpenChange={(isOpen) => {
          console.log('Migration modal onOpenChange:', isOpen, 'selectedPlan:', selectedPlan)
          setShowMigrationModal(isOpen)
          if (!isOpen) {
            // If migration modal is cancelled, clear selected plan
            // Subscription modal will reopen automatically because open prop is still true
            setSelectedPlan(null)
          }
        }}
        planType={selectedPlan}
        onConfirm={handleMigrateAndSubscribe}
      />
    )}

    {/* Migration modal - Freelancer (for creator -> freelancer) */}
    {selectedPlan && businessType === 'creator' && (
      <MigrateToFreelancerModal
        open={showFreelancerMigrationModal}
        onOpenChange={(isOpen) => {
          console.log('Freelancer migration modal onOpenChange:', isOpen, 'selectedPlan:', selectedPlan)
          setShowFreelancerMigrationModal(isOpen)
          if (!isOpen) {
            // If migration modal is cancelled, clear selected plan
            // Subscription modal will reopen automatically because open prop is still true
            setSelectedPlan(null)
          }
        }}
        planType={selectedPlan}
        onConfirm={handleMigrateAndSubscribe}
      />
    )}
    </>
  )
}

