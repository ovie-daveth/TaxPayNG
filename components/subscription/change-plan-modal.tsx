"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { subscriptionService } from "@/lib/services/subscriptionService"
import { SubscriptionType, BusinessType } from "@/lib/types"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge as UIBadge } from "@/components/ui/badge"
import { usePricingConfig } from "@/lib/hooks/usePricingConfig"
import { DEFAULT_YEARLY_DISCOUNT_PERCENT } from "@/lib/constants/pricing"

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
  const { pricingConfig } = usePricingConfig()
  const [internalBillingInterval, setInternalBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [expandedPlans, setExpandedPlans] = useState<Set<SubscriptionType>>(new Set())
  
  // Use external billing interval if provided, otherwise use internal state
  const billingInterval = externalBillingInterval ?? internalBillingInterval
  const setBillingInterval = onBillingIntervalChange ?? setInternalBillingInterval

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

  // Get plans based on business type
  const getAvailablePlans = (): SubscriptionType[] => {
    if (businessType === 'sme') {
      return ['Small Business', 'Big Business']
    } else {
      // For freelancers, creators, and individuals
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

  const handlePlanSelect = async (planType: SubscriptionType) => {
    // Migration (if needed) is handled by the parent settings page to avoid double-modals.
    await onSelectPlan(planType, billingInterval)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change Subscription Plan</DialogTitle>
          <DialogDescription>
            {currentPlan 
              ? `You're currently on the ${(getPlanWithOverrides(currentPlan)?.name ?? currentPlan)} plan. Choose a new plan below.`
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
                Save {yearlyDiscountPercent}%
              </UIBadge>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {availablePlans.map((planType) => {
            const plan = getPlanWithOverrides(planType)
            if (!plan) return null

            const isCurrent = isCurrentPlan(planType)
            const upgrade = isUpgrade(planType)
            const isProcessing = processingPlan === planType
            const isBigBusiness = planType === 'Big Business' && businessType === 'sme'
            const isExpanded = expandedPlans.has(planType)
            const features = getPlanFeatures(planType)
            const initialFeaturesCount = 5
            const hasMoreFeatures = features.length > initialFeaturesCount

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
                    {getPlanDescription(planType)}
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
                            {plan.yearlyPriceDisplay}
                          </span>
                          <UIBadge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 text-xs font-semibold">
                            {yearlyDiscountPercent}% OFF
                          </UIBadge>
                        </div>
                        <span className="text-sm text-muted-foreground">/year</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {(isExpanded ? features : features.slice(0, initialFeaturesCount)).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
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
                          className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors mt-1"
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
  )
}

