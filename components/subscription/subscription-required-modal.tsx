"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Lock, ChevronDown, ChevronUp } from "lucide-react"
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
  const [expandedPlans, setExpandedPlans] = useState<Set<SubscriptionType>>(new Set())

  const yearlyDiscountPercent = pricingConfig?.yearlyDiscountPercent ?? DEFAULT_YEARLY_DISCOUNT_PERCENT
  
  const format = (priceInKobo: number) => {
    const priceInNaira = priceInKobo / 100
    return `₦${priceInNaira.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }
  
  const getPlanWithOverrides = (planType: SubscriptionType) => {
    const base = subscriptionService.getPlan(planType)
    if (!base) return null
    const overrideMonthly = pricingConfig?.plans?.[planType as any]?.monthlyPrice
    const overrideNameRaw = pricingConfig?.plans?.[planType as any]?.displayName
    const overrideName = typeof overrideNameRaw === "string" ? overrideNameRaw.trim() : ""
    const monthlyPrice = typeof overrideMonthly === "number" && overrideMonthly > 0 ? overrideMonthly : base.monthlyPrice
    const yearlyPrice = Math.round(12 * monthlyPrice * (1 - yearlyDiscountPercent / 100))
    return {
      ...base,
      name: overrideName || (planType as any),
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

  const getPlanDescription = (planType: SubscriptionType): string => {
    if (businessType === 'sme') {
      if (planType === 'Small Business') {
        return 'For businesses with annual turnover ≤ ₦50-100 million and fixed assets ≤ ₦250 million (excluding professional services). Qualifies for tax exemptions under NTA 2025.'
      }
      return 'For businesses with turnover above small business threshold, fixed assets exceeding ₦250 million, or providing professional services. Subject to full corporate tax regime.'
    } else {
      if (planType === 'PRO') {
        return 'Perfect for tech freelancers, Virtual Assistants, copywriters, independent professionals and consultants who need to manage their taxes with ease'
      }
      if (planType === 'GOLD') {
        return 'Ideal for content creators, influencers, digital creators and independent professionals & contractors managing multiple income streams'
      }
      return 'For individuals registered as BUSINESS NAMES with the Corporate Affairs Commission (CAC) in Nigeria'
    }
  }

  const togglePlanFeatures = (planType: SubscriptionType) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev)
      if (newSet.has(planType)) {
        newSet.delete(planType)
      } else {
        newSet.add(planType)
      }
      return newSet
    })
  }

  const getPlanFeatures = (planType: SubscriptionType): Array<{ text: string; comingSoon?: boolean }> => {
    if (businessType === 'sme') {
      if (planType === 'Small Business') {
        return [
          { text: 'Track up to 5,000 transactions/month' },
          { text: 'Advanced tax calculations' },
          { text: 'Small business tax exemption tracking' },
          { text: 'IRS/NRS filing (VAT filing, WHT filing, PIT filing etc)' },
          { text: 'Business invoice management' },
          { text: 'Proper book keeping and business accounting' },
          { text: 'Employee management and simple payroll system' },
          { text: 'Manage PAYE and remit', comingSoon: true },
          { text: 'Document storage (15GB total)' },
          { text: 'Receipt scanning & OCR' },
          { text: 'SMS & email reminders' },
          { text: 'Multi-user access (up to 5 users)', comingSoon: true },
          { text: 'Basic analytics & insights' },
          { text: 'Priority support' }
        ]
      }
      // Big Business
      return [
        { text: 'Everything in Small Business' },
        { text: 'Full corporate tax compliance' },
        { text: 'Multi-user access (up to 10 users)', comingSoon: true },
        { text: 'Advanced analytics & insights', comingSoon: true },
        { text: 'Custom report templates' },
        { text: 'Document storage (50GB total)' },
        { text: 'API access', comingSoon: true },
        { text: 'Dedicated account manager' },
        { text: '24/7 priority support' },
        { text: 'White-label options', comingSoon: true },
        { text: 'Custom integrations', comingSoon: true }
      ]
    } else {
      // Individuals
      if (planType === 'PRO') {
        return [
          { text: 'Track up to 100 transactions/month' },
          { text: 'Income & expense tracking' },
          { text: 'Receipt scanning & OCR for automatic transaction tracking' },
          { text: 'Automatic tax calculator with reliefs' },
          { text: 'Self assessment and filing (IRS standard)' },
          { text: 'Document storage (500MB total)' },
          { text: 'Email reminders' },
          { text: 'Email support' },
          { text: 'Easy payment of tax directly using various government approved methods (e.g., Remita and Paystack)', comingSoon: true }
        ]
      }
      if (planType === 'GOLD') {
        return [
          { text: 'Track up to 500 transactions/month' },
          { text: 'All PRO features' },
          { text: 'Multi-platform income tracking' },
          { text: 'Sponsorship & brand deal management' },
          { text: 'Simple invoice management' },
          { text: 'Advanced tax calculations' },
          { text: 'Document storage (2GB total)' },
          { text: 'SMS & email reminders' },
          { text: 'Priority support' },
          { text: 'Expense categorization' },
          { text: 'Receive local and international payments via invoicing', comingSoon: true }
        ]
      }
      // PLATINUM
      return [
        { text: 'Everything in GOLD' },
        { text: 'Multi-entity business management (ie operate multiple business account)' },
        { text: 'Business analytics & insights' },
        { text: 'Extensive Expense Management (expense focused tax calculation to reduce tax liability as a business)' },
        { text: 'IRS/NRS filing (VAT filing, WHT filing, PIT filing etc)' },
        { text: 'Document storage (10GB total)' },
        { text: 'Multi-user access(up to 3 users)' },
        { text: 'Dedicated tax advisor consultation' },
        { text: 'Quarterly tax planning sessions' },
        { text: '24/7 priority support' },
        { text: 'API access for integrations', comingSoon: true }
      ]
    }
  }

  const availablePlans = getAvailablePlans()

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

    if (needsMigration(planType)) {
      console.log('Migration needed - showing migration modal')
      console.log('Setting selectedPlan to:', planType)
      setSelectedPlan(planType)
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

    console.log('No migration needed - proceeding with subscription')
    await proceedWithSubscription(planType)
  }

  const handleMigrateAndSubscribe = async () => {
    if (!selectedPlan) return
    setTimeout(() => {
      proceedWithSubscription(selectedPlan)
    }, 200)
  }

  const proceedWithSubscription = async (planType: SubscriptionType) => {
    if (!window) return

    setProcessingSubscription(planType)
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        router.push("/login")
        setProcessingSubscription(null)
        return
      }

      const token = await currentUser.getIdToken()

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
              <li>Income & expense tracking with receipt scanning</li>
              <li>Automatic tax calculations with reliefs</li>
              <li>Self-assessment and filing (IRS/NRS standard)</li>
              <li>Document storage and management</li>
              <li>Email and SMS reminders</li>
              <li>Priority support and tax advisory</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {availablePlans.map((planType) => {
              const plan = getPlanWithOverrides(planType)
              if (!plan) return null

              const isProcessing = processingSubscription === planType
              const isBigBusiness = planType === 'Big Business' && businessType === 'sme'
              const isExpanded = expandedPlans.has(planType)
              const features = getPlanFeatures(planType)
              const initialFeaturesCount = 5
              const hasMoreFeatures = features.length > initialFeaturesCount

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
                      {getPlanDescription(planType)}
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
                      {(isExpanded ? features : features.slice(0, initialFeaturesCount)).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0 mt-0.5" />
                          <span className={feature.comingSoon ? 'opacity-70' : ''}>
                            {feature.text}
                            {feature.comingSoon && (
                              <span className="ml-1.5 text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full font-medium">
                                Coming Soon
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                      {hasMoreFeatures && (
                        <li>
                          <button
                            onClick={() => togglePlanFeatures(planType)}
                            className="text-[10px] sm:text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors mt-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                +{features.length - initialFeaturesCount} more features
                              </>
                            )}
                          </button>
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

