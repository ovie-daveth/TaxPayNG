"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, Sparkles, ChevronDown, ChevronUp, Heart } from "lucide-react"
import { subscriptionService } from "@/lib/services/subscriptionService"
import { SubscriptionType } from "@/lib/types"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { usePricingConfig } from "@/lib/hooks/usePricingConfig"

export function SubscriptionSuccessModal() {
  const router = useRouter()
  const { profile } = useUserProfile()
  const { pricingConfig } = usePricingConfig()
  const [isOpen, setIsOpen] = useState(false)
  const [plan, setPlan] = useState<ReturnType<typeof subscriptionService.getPlan> | null>(null)
  const [showAllFeatures, setShowAllFeatures] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(true)

  useEffect(() => {
    // Check URL params on client side
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const subscriptionSuccess = params.get('subscription')
      const planParam = params.get('plan')

      if (subscriptionSuccess === 'success' && planParam) {
        const planType = planParam as SubscriptionType
        const planData = subscriptionService.getPlan(planType)
        if (planData) {
          setPlan(planData)
          setIsOpen(true)
        }
      }
    }
  }, [])

  useEffect(() => {
    // Check if this is first-time subscription or renewal
    // If renewalCount exists and is > 0, it's a renewal
    if (profile?.renewalCount && profile.renewalCount > 0) {
      setIsFirstTime(false)
    } else {
      setIsFirstTime(true)
    }
  }, [profile])

  const handleClose = () => {
    setIsOpen(false)
    // Remove query params without scrolling
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      params.delete('subscription')
      params.delete('plan')
      const newUrl = params.toString() 
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname
      router.replace(newUrl, { scroll: false })
    }
  }

  if (!isOpen || !plan) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-md p-3 sm:p-6">
        <DialogHeader className="p-0">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2 justify-center">
              {isFirstTime ? 'Subscription Successful!' : 'Subscription Renewed!'}
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                {isFirstTime ? (
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                ) : (
                  <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-primary fill-primary" />
                )}
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm mt-1 sm:mt-2">
              {(() => {
                const override = pricingConfig?.plans?.[plan.id as any]?.displayName
                const planDisplayName = (typeof override === 'string' && override.trim()) ? override.trim() : plan.id
                return isFirstTime 
                  ? `Welcome to ${planDisplayName}! Your subscription is now active.`
                  : profile?.renewalCount 
                    ? `Thank you for being a loyal customer! You've renewed ${profile.renewalCount} time${profile.renewalCount !== 1 ? 's' : ''}. Your ${planDisplayName} subscription is now active.`
                    : `Your ${planDisplayName} subscription has been renewed and is now active.`
              })()}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <div className="bg-muted/50 border border-border rounded-lg p-3 sm:p-4">
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-medium text-center">
                You now have access to:
              </p>
              <ul className="space-y-1.5 text-[10px] sm:text-xs text-muted-foreground">
                {plan.features.slice(0, 4).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
                {showAllFeatures && plan.features.length > 4 && (
                  <>
                    {plan.features.slice(4).map((feature, idx) => (
                      <li key={idx + 4} className="flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </>
                )}
                {plan.features.length > 4 && (
                  <li className="pt-1">
                    <button
                      onClick={() => setShowAllFeatures(!showAllFeatures)}
                      className="text-[10px] sm:text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 mx-auto transition-colors"
                    >
                      {showAllFeatures ? (
                        <>
                          Show less
                          <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          +{plan.features.length - 4} more features
                          <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="flex justify-center pt-1 sm:pt-2">
            <Button
              onClick={handleClose}
              className="h-8 sm:h-10 text-xs sm:text-sm px-6 sm:px-8"
            >
              Get Started
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

