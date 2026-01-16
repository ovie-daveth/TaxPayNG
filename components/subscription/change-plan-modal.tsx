"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2 } from "lucide-react"
import { subscriptionService, getPlanPriceDisplay } from "@/lib/services/subscriptionService"
import { SubscriptionType, BusinessType } from "@/lib/types"
import { MigrateToCreatorModal } from "./migrate-to-creator-modal"
import { MigrateToFreelancerModal } from "./migrate-to-freelancer-modal"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge as UIBadge } from "@/components/ui/badge"

interface ChangePlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: SubscriptionType | null
  businessType: BusinessType
  onSelectPlan: (planType: SubscriptionType, interval?: 'monthly' | 'yearly') => void | Promise<void>
  processingPlan?: string | null
  billingInterval?: 'monthly' | 'yearly'
  onBillingIntervalChange?: (interval: 'monthly' | 'yearly') => void
}

export function ChangePlanModal({
  open,
  onOpenChange,
  currentPlan,
  businessType,
  onSelectPlan,
  processingPlan,
  billingInterval: externalBillingInterval,
  onBillingIntervalChange
}: ChangePlanModalProps) {
  const router = useRouter()
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [showFreelancerMigrationModal, setShowFreelancerMigrationModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType | null>(null)
  const [internalBillingInterval, setInternalBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  
  // Use external billing interval if provided, otherwise use internal state
  const billingInterval = externalBillingInterval ?? internalBillingInterval
  const setBillingInterval = onBillingIntervalChange ?? setInternalBillingInterval

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

    // No migration needed, proceed with plan selection with billing interval
    await onSelectPlan(planType, billingInterval)
  }

  const handleMigrateAndSubscribe = async () => {
    if (!selectedPlan) return

    // Do NOT update businessType here. Proceed to payment; verify route will migrate on success.
    setShowMigrationModal(false)
    setShowFreelancerMigrationModal(false)
    onOpenChange(false)
    setTimeout(() => {
      onSelectPlan(selectedPlan, billingInterval)
    }, 200)
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

        {/* Billing Interval Toggle - Only show if user has existing subscription */}
        {currentPlan && (
          <div className="flex items-center justify-center gap-3 mt-4 mb-2">
            <Label htmlFor="billing-toggle-modal" className={`text-sm cursor-pointer ${billingInterval === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}`}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle-modal"
              checked={billingInterval === 'yearly'}
              onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')}
            />
            <Label htmlFor="billing-toggle-modal" className={`text-sm cursor-pointer ${billingInterval === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}`}>
              Yearly
            </Label>
            {billingInterval === 'yearly' && (
              <UIBadge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 text-xs font-semibold ml-2">
                Save 25%
              </UIBadge>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {availablePlans.map((planType) => {
            const plan = subscriptionService.getPlan(planType)
            if (!plan) return null

            const isCurrent = isCurrentPlan(planType)
            const upgrade = isUpgrade(planType)
            const isProcessing = processingPlan === planType
            const isBigBusiness = planType === 'Big Business' && businessType === 'sme'

            return (
              <Card 
                key={planType} 
                className={`relative flex flex-col ${
                  isCurrent 
                    ? 'border-primary shadow-lg scale-105' 
                    : isBigBusiness
                    ? 'opacity-75'
                    : 'hover:border-primary transition-all'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                    Current Plan
                  </div>
                )}
                {isBigBusiness && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-muted border border-border px-3 py-1 rounded-full text-xs font-medium">
                    Coming Soon
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-xl">
                      {planType === 'PRO' ? 'PRO' : planType === 'GOLD' ? 'GOLD' : planType === 'PLATINUM' ? 'PLATINUM' : plan.name}
                    </CardTitle>
                    {planType === 'PRO' && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium">
                        Basic
                      </span>
                    )}
                    {planType === 'GOLD' && (
                      <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full font-medium">
                        Advanced
                      </span>
                    )}
                    {planType === 'PLATINUM' && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium">
                        Individual Businesses
                      </span>
                    )}
                  </div>
                  <CardDescription>
                    {businessType === 'sme' 
                      ? planType === 'Small Business' 
                        ? 'For businesses with annual turnover ≤ ₦50-100 million'
                        : 'For businesses with turnover above small business threshold'
                      : planType === 'PRO'
                        ? 'Perfect for tech freelancers, VAs, copywriters, and independent professionals'
                        : planType === 'GOLD'
                        ? 'Ideal for content creators, influencers, and digital creators managing multiple income streams'
                        : 'For established creators, individuals with complex tax situations, business owner (not Limited Liability Company), and team collaborations'}
                  </CardDescription>
                  <div className="mt-4">
                    {billingInterval === 'monthly' ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{plan.monthlyPriceDisplay}</span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground line-through">
                          {(() => {
                            const grossYearly = (plan.monthlyPrice * 12) / 100
                            return `₦${grossYearly.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                          })()}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">
                            {getPlanPriceDisplay(plan, 'yearly')}
                          </span>
                          <UIBadge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 text-xs font-semibold">
                            25% OFF
                          </UIBadge>
                        </div>
                        <span className="text-sm text-muted-foreground">/year</span>
                      </div>
                    )}
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
                    disabled={isCurrent || isProcessing || isBigBusiness}
                    onClick={() => handlePlanSelect(planType)}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : isBigBusiness ? (
                      "Coming Soon"
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

