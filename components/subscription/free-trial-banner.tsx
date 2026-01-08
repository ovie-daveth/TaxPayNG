"use client"

import { useSubscription } from "@/lib/hooks/useSubscription"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Sparkles, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function FreeTrialBanner() {
  const { freeTrialStatus, isBlocked, loading } = useSubscription()
  const [dismissed, setDismissed] = useState(false)

  // Don't show if loading, blocked (shows modal instead), or not in free trial
  if (loading || isBlocked || !freeTrialStatus.isInFreeTrial || dismissed) {
    return null
  }

  const { daysRemaining } = freeTrialStatus

  // Determine banner variant based on days remaining
  const isExpiringSoon = daysRemaining <= 2
  const variant = isExpiringSoon ? "warning" : "info"

  return (
    <Alert
      className={cn(
        "rounded-none border-x-0 border-t-0 border-b",
        isExpiringSoon
          ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
          : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
      )}
    >
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 md:gap-4 py-2 sm:py-3 w-full">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:w-auto">
            <div
              className={cn(
                "flex-shrink-0 p-1.5 sm:p-2 rounded-full",
                isExpiringSoon
                  ? "bg-yellow-100 dark:bg-yellow-900/40"
                  : "bg-blue-100 dark:bg-blue-900/40"
              )}
            >
              <Sparkles
                className={cn(
                  "h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5",
                  isExpiringSoon
                    ? "text-yellow-600 dark:text-yellow-500"
                    : "text-blue-600 dark:text-blue-500"
                )}
              />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <AlertDescription className="text-xs sm:text-sm md:text-base font-medium text-foreground m-0 break-words leading-tight sm:leading-normal">
                {isExpiringSoon ? (
                  <>
                    <span className="font-semibold">Free Trial Ending Soon!</span>{" "}
                    {daysRemaining === 1
                      ? "Your free trial ends tomorrow. Subscribe now to continue using OTax."
                      : `Your free trial ends in ${daysRemaining} days. Subscribe now to continue using OTax.`}
                  </>
                ) : (
                  <>
                    <span className="font-semibold">You're on a Free Trial</span> - {daysRemaining} day
                    {daysRemaining !== 1 ? "s" : ""} remaining. Explore all features and subscribe to continue.
                  </>
                )}
              </AlertDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
            <Link href="/pricing" className="flex-shrink-0">
              <Button
                size="sm"
                className={cn(
                  "h-8 sm:h-9 text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4",
                  isExpiringSoon
                    ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                }}
              >
                Subscribe Now
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  )
}

