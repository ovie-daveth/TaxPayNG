"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2 } from "lucide-react"
import { subscriptionService } from "@/lib/services/subscriptionService"
import { SubscriptionType, BusinessType } from "@/lib/types"
import { MigrateToCreatorModal } from "./migrate-to-creator-modal"
import { MigrateToFreelancerModal } from "./migrate-to-freelancer-modal"
import { auth } from "@/firebase/firebase"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ChangePlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: SubscriptionType | null
  businessType: BusinessType
  onSelectPlan: (planType: SubscriptionType) => void | Promise<void>
  processingPlan?: string | null
}

export function ChangePlanModal({
  open,
  onOpenChange,
  currentPlan,
  businessType,
  onSelectPlan,
  processingPlan
}: ChangePlanModalProps) {
  const router = useRouter()
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [showFreelancerMigrationModal, setShowFreelancerMigrationModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType | null>(null)

  // Get plans based on business type
  const getAvailablePlans = (): SubscriptionType[] => {
    if (businessType === 'sme') {
      return ['Small Business', 'Big Business']
    } else {
      // For freelancers, creators, and individuals
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

  const handlePlanSelect = async (planType: SubscriptionType) => {
    // Check if migration is needed
    if (needsMigration(planType)) {
      setSelectedPlan(planType)
      // Show appropriate migration modal based on direction
      if (businessType === 'creator' && planType === 'PRO') {
        setShowFreelancerMigrationModal(true)
      } else if (businessType === 'freelancer' && (planType === 'GOLD' || planType === 'PLATINUM')) {
        setShowMigrationModal(true)
      }
      return
    }

    // No migration needed, proceed with plan selection
    await onSelectPlan(planType)
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
      // Close migration modals
      setShowMigrationModal(false)
      setShowFreelancerMigrationModal(false)
      // Close change plan modal
      onOpenChange(false)
      // Small delay to ensure modals close, then proceed with plan selection
      setTimeout(() => {
        onSelectPlan(selectedPlan)
      }, 300)
    } catch (error) {
      console.error("Migration error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to migrate account")
    }
  }

  const isCurrentPlan = (planType: SubscriptionType) => {
    return currentPlan === planType
  }

  const getPlanHierarchy = (planType: SubscriptionType): number => {
    if (!planType) return 0
    const hierarchy: Record<Exclude<SubscriptionType, null>, number> = {
      'PRO': 1,
      'GOLD': 2,
      'PLATINUM': 3,
      'Small Business': 2,
      'Big Business': 4
    }
    return hierarchy[planType] || 0
  }

  const isUpgrade = (planType: SubscriptionType): boolean => {
    if (!currentPlan) return true
    return getPlanHierarchy(planType) > getPlanHierarchy(currentPlan)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change Subscription Plan</DialogTitle>
          <DialogDescription>
            {currentPlan 
              ? `You're currently on the ${currentPlan} plan. Choose a new plan below.`
              : 'Select a subscription plan to unlock all features.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {availablePlans.map((planType) => {
            const plan = subscriptionService.getPlan(planType)
            if (!plan) return null

            const isCurrent = isCurrentPlan(planType)
            const upgrade = isUpgrade(planType)
            const isProcessing = processingPlan === planType

            return (
              <Card 
                key={planType} 
                className={`relative flex flex-col ${
                  isCurrent 
                    ? 'border-primary shadow-lg scale-105' 
                    : 'hover:border-primary transition-all'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                    Current Plan
                  </div>
                )}
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
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || isProcessing}
                    onClick={() => handlePlanSelect(planType)}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : upgrade ? (
                      "Upgrade"
                    ) : (
                      "Downgrade"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> When you change plans, your subscription will be updated immediately. 
            {currentPlan && (
              <span className="block mt-1">
                Upgrades take effect immediately. Downgrades take effect at the end of your current billing cycle.
              </span>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>

    {/* Migration modal - Creator (for freelancer -> creator) */}
    {selectedPlan && businessType === 'freelancer' && (
      <MigrateToCreatorModal
        open={showMigrationModal}
        onOpenChange={(isOpen) => {
          setShowMigrationModal(isOpen)
          if (!isOpen) {
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
          setShowFreelancerMigrationModal(isOpen)
          if (!isOpen) {
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

