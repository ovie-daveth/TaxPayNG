import { useState, useEffect } from "react"
import { useAuth } from "./useAuth"
import { useUserProfile } from "./useUserProfile"
import { SubscriptionType } from "@/lib/types"

export function useSubscription() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || profileLoading) {
      setLoading(true)
      return
    }

    if (!profile) {
      setIsSubscribed(false)
      setSubscriptionType(null)
      setLoading(false)
      return
    }

    setIsSubscribed(profile.isSubscribe ?? false)
    setSubscriptionType(profile.subscriptionType || null)
    setLoading(false)
  }, [profile, authLoading, profileLoading])

  const hasAccess = (requiredPlan?: SubscriptionType): boolean => {
    if (!isSubscribed || !subscriptionType) {
      return false
    }

    // If no plan required, just check if subscribed
    if (!requiredPlan) {
      return isSubscribed
    }

    // Define plan hierarchy (higher plans have access to lower plan features)
    const planHierarchy: Record<SubscriptionType, number> = {
      'PRO': 1,
      'GOLD': 2,
      'PLATINUM': 3,
      'Small Business': 2,
      'Big Business': 4
    }

    const userPlanLevel = planHierarchy[subscriptionType] || 0
    const requiredPlanLevel = planHierarchy[requiredPlan] || 0

    return userPlanLevel >= requiredPlanLevel
  }

  return {
    isSubscribed,
    subscriptionType,
    hasAccess,
    loading: loading || authLoading || profileLoading
  }
}

