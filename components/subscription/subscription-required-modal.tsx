"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Lock } from "lucide-react"
import { subscriptionService } from "@/lib/services/subscriptionService"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { SubscriptionType, BusinessType } from "@/lib/types"
import { auth } from "@/firebase/firebase"
import { toast } from "sonner"
import { MigrateToCreatorModal } from "./migrate-to-creator-modal"
import { MigrateToFreelancerModal } from "./migrate-to-freelancer-modal"
import { usePricingConfig } from "@/lib/hooks/usePricingConfig"
import { DEFAULT_YEARLY_DISCOUNT_PERCENT } from "@/lib/constants/pricing"

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
  const { pricingConfig } = usePricingConfig()
  const [processingSubscription, setProcessingSubscription] = useState<string | null>(null)
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [showFreelancerMigrationModal, setShowFreelancerMigrationModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType | null>(null)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')

  const yearlyDiscountPercent = pricingConfig?.yearlyDiscountPercent ?? DEFAULT_YEARLY_DISCOUNT_PERCENT
  const format = (priceInKobo: number) => {
    const priceInNaira = priceInKobo / 100
    return `₦${priceInNaira.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }
  const getPlanWithOverrides = (planType: SubscriptionType) => {
    const base = subscriptionService.getPlan(planType)
    if (!base) return null
    const overrideMonthly = pricingConfig?.plans?.[planType as any]?.monthlyPrice
    const monthlyPrice = typeof overrideMonthly === "number" && overrideMonthly > 0 ? overrideMonthly : base.monthlyPrice
    const yearlyPrice = Math.round(12 * monthlyPrice * (1 - yearlyDiscountPercent / 100))
    return {
      ...base,
      monthlyPrice,
      yearlyPrice,
      monthlyPriceDisplay: format(monthlyPrice),
      yearlyPriceDisplay: format(yearlyPrice)
    }
  }

  const getAvailablePlans = (): SubscriptionType[] => {
    if (businessType === 'sme') {
      return ['Small Business', 'Big Business']
    } else {
      return ['PRO', 'GOLD', 'PLATINUM']
    }
  }

  const availablePlans = getAvailablePlans()

  // Migration should happen ONLY after successful payment (in /api/subscription/verify).
  // We still show an informational modal before payment when switching between
  // Freelancer <-> Creator plan families.
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
    // Do NOT update businessType here. Proceed to payment; verify route will migrate on success.
    setShowMigrationModal(false)
    setShowFreelancerMigrationModal(false)
    onOpenChange(false)
    setTimeout(() => {
      proceedWithSubscription(selectedPlan)
    }, 200)
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
          subscriptionType: planType,
          interval: billingInterval
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
          {/* Billing Interval Toggle */}
          <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6 p-3 sm:p-4 bg-background rounded-lg border">
            <Label htmlFor="billing-toggle-modal-sub" className={`text-sm cursor-pointer ${billingInterval === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}`}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle-modal-sub"
              checked={billingInterval === 'yearly'}
              onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')}
            />
            <Label htmlFor="billing-toggle-modal-sub" className={`text-sm cursor-pointer ${billingInterval === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}`}>
              Yearly
            </Label>
            {billingInterval === 'yearly' && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 text-xs font-semibold ml-2">
                Save {yearlyDiscountPercent}%
              </Badge>
            )}
          </div>

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
              const plan = getPlanWithOverrides(planType)
              if (!plan) return null

              const isProcessing = processingSubscription === planType
              const isBigBusiness = planType === 'Big Business' && businessType === 'sme'

              return (
                <Card 
                  key={planType} 
                  className={`relative flex flex-col ${isBigBusiness ? 'opacity-75' : 'hover:border-primary transition-all'}`}
                >
                  {isBigBusiness && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-muted border border-border px-3 py-1 rounded-full text-xs font-medium">
                      Coming Soon
                    </div>
                  )}
                  <CardHeader className="p-3 sm:p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-base sm:text-lg md:text-xl">
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
                    <CardDescription className="text-xs sm:text-sm mt-1 sm:mt-2">
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
                    <div className="mt-3 sm:mt-4">
                      {billingInterval === 'monthly' ? (
                        <div className="flex items-baseline gap-1.5 sm:gap-2">
                          <span className="text-xl sm:text-2xl md:text-3xl font-bold">{plan.monthlyPriceDisplay}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground">/month</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-xs sm:text-sm font-medium text-muted-foreground line-through">
                            {(() => {
                              const grossYearly = (plan.monthlyPrice * 12) / 100
                              return `₦${grossYearly.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            })()}
                          </span>
                          <div className="flex items-baseline gap-1.5 sm:gap-2">
                            <span className="text-xl sm:text-2xl md:text-3xl font-bold">
                              {plan.yearlyPriceDisplay}
                            </span>
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 text-xs font-semibold">
                              {yearlyDiscountPercent}% OFF
                            </Badge>
                          </div>
                          <span className="text-xs sm:text-sm text-muted-foreground">/year</span>
                        </div>
                      )}
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
                      disabled={isProcessing || isBigBusiness}
                    >
                      {isBigBusiness ? (
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

