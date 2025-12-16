import { useState, useEffect } from "react"
import { useAuth } from "./useAuth"
import { useUserProfile } from "./useUserProfile"
import { SubscriptionType } from "@/lib/types"

export function useSubscription() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType | null>(null)
  const [subscriptionExpiryDate, setSubscriptionExpiryDate] = useState<string | null>(null)
  const [isExpiringSoon, setIsExpiringSoon] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || profileLoading) {
      setLoading(true)
      return
    }

    if (!profile) {
      setIsSubscribed(false)
      setSubscriptionType(null)
      setSubscriptionExpiryDate(null)
      setIsExpiringSoon(false)
      setIsExpired(false)
      setLoading(false)
      return
    }

    const subscribed = profile.isSubscribe ?? false
    const expiryDate = profile.subscriptionExpiryDate || null
    
    setIsSubscribed(subscribed)
    setSubscriptionType(profile.subscriptionType || null)
    setSubscriptionExpiryDate(expiryDate)

    // Check if subscription is expiring soon or expired
    if (expiryDate && subscribed) {
      const now = new Date()
      const expiry = new Date(expiryDate)
      const twoDaysFromNow = new Date(now)
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
      const twoDaysAgo = new Date(now)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      const expiryTime = expiry.getTime()
      const nowTime = now.getTime()
      const twoDaysFromNowTime = twoDaysFromNow.getTime()
      const twoDaysAgoTime = twoDaysAgo.getTime()

      // Expired more than 2 days ago
      if (expiryTime < twoDaysAgoTime) {
        setIsExpired(true)
        setIsExpiringSoon(false)
      }
      // Expiring within 2 days or expired but within grace period
      else if (expiryTime <= twoDaysFromNowTime) {
        setIsExpiringSoon(true)
        setIsExpired(expiryTime < nowTime)
      } else {
        setIsExpiringSoon(false)
        setIsExpired(false)
      }
    } else {
      setIsExpiringSoon(false)
      setIsExpired(false)
    }

    setLoading(false)
  }, [profile, authLoading, profileLoading])

  const hasAccess = (requiredPlan?: SubscriptionType): boolean => {
    // If subscription expired, no access
    if (isExpired) {
      return false
    }

    if (!isSubscribed || !subscriptionType) {
      return false
    }

    // If no plan required, just check if subscribed and not expired
    if (!requiredPlan) {
      return isSubscribed && !isExpired
    }

    // Define plan hierarchy (higher plans have access to lower plan features)
    const planHierarchy: Record<Exclude<SubscriptionType, null>, number> = {
      'PRO': 1,
      'GOLD': 2,
      'PLATINUM': 3,
      'Small Business': 2,
      'Big Business': 4
    }

    const userPlanLevel = subscriptionType ? (planHierarchy[subscriptionType] || 0) : 0
    const requiredPlanLevel = requiredPlan ? (planHierarchy[requiredPlan] || 0) : 0

    return userPlanLevel >= requiredPlanLevel
  }

  return {
    isSubscribed,
    subscriptionType,
    subscriptionExpiryDate,
    isExpiringSoon,
    isExpired,
    hasAccess,
    loading: loading || authLoading || profileLoading
  }
}

