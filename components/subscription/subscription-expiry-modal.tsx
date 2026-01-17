"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Clock } from "lucide-react"
import { subscriptionService } from "@/lib/services/subscriptionService"
import { OneTouchResubscribeButton } from "./one-touch-resubscribe-button"
import { usePricingConfig } from "@/lib/hooks/usePricingConfig"

interface SubscriptionExpiryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expiryDate: string
  subscriptionType: string
  isExpired: boolean
}

export function SubscriptionExpiryModal({
  open,
  onOpenChange,
  expiryDate,
  subscriptionType,
  isExpired
}: SubscriptionExpiryModalProps) {

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getDaysUntilExpiry = () => {
    const expiry = new Date(expiryDate)
    const now = new Date()
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUntilExpiry = getDaysUntilExpiry()
  const { pricingConfig } = usePricingConfig()
  const plan = subscriptionService.getPlan(subscriptionType as any)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-md p-3 sm:p-6">
        <DialogHeader className="p-0">
          <div className="flex flex-col items-center text-center">
            <DialogTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2 justify-center">
              {isExpired ? (
                <>
                  Subscription Expired
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-500/10 rounded-full flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                  </div>
                </>
              ) : (
                <>
                  Subscription Expiring Soon
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-amber-500/10 rounded-full flex items-center justify-center shrink-0">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
                  </div>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm mt-0.5 sm:mt-1">
              {isExpired 
                ? "Your subscription has expired. Please renew to continue using all features."
                : `Your subscription will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}.`}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <div className="bg-muted/50 border border-border rounded-lg p-3 sm:p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Current Plan:</span>
                <span className="text-xs sm:text-sm font-semibold">
                  {plan 
                    ? (() => {
                        const override = pricingConfig?.plans?.[plan.id as any]?.displayName
                        return (typeof override === 'string' && override.trim()) ? override.trim() : plan.id
                      })()
                    : subscriptionType}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {isExpired ? "Expired on:" : "Expires on:"}
                </span>
                <span className="text-xs sm:text-sm font-semibold">{formatDate(expiryDate)}</span>
              </div>
              {plan && (
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Price:</span>
                  <span className="text-xs sm:text-sm font-semibold">{plan.priceDisplay}/month</span>
                </div>
              )}
            </div>
          </div>

          {isExpired && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                Your access has been restricted. Please renew your subscription to continue using all features.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1 sm:pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-8 sm:h-10 text-xs sm:text-sm"
            >
              {isExpired ? "Maybe Later" : "Remind Me Later"}
            </Button>
            <OneTouchResubscribeButton
              variant="default"
              size="default"
              className="flex-1 h-8 sm:h-10 text-xs sm:text-sm"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

