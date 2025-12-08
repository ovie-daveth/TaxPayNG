"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, Lock, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSubscription } from "@/lib/hooks/useSubscription"

interface SubscriptionRestrictionProps {
  feature?: string
  requiredPlan?: string
  message?: string
}

export function SubscriptionRestriction({ 
  feature = "this feature",
  requiredPlan,
  message 
}: SubscriptionRestrictionProps) {
  const router = useRouter()
  const { isSubscribed, subscriptionType } = useSubscription()

  const defaultMessage = isSubscribed
    ? `Your current plan (${subscriptionType}) doesn't include access to ${feature}.`
    : `You need an active subscription to access ${feature}.`

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-4 rounded-full bg-muted">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Subscription Required</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {message || defaultMessage}
            {requiredPlan && (
              <span className="block mt-2">
                This feature requires the <strong>{requiredPlan}</strong> plan or higher.
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.push('/pricing')}>
            <CreditCard className="w-4 h-4 mr-2" />
            View Plans
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/settings?tab=subscription')}>
            Manage Subscription
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function SubscriptionAlert({ 
  message,
  onUpgrade 
}: { 
  message?: string
  onUpgrade?: () => void 
}) {
  const router = useRouter()
  const { isSubscribed } = useSubscription()

  if (isSubscribed) return null

  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          {message || "You need an active subscription to access all features."}
        </span>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onUpgrade || (() => router.push('/pricing'))}
          className="ml-4"
        >
          Subscribe
        </Button>
      </AlertDescription>
    </Alert>
  )
}

