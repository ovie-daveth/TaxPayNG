import { useState, useEffect } from "react"
import { useAuth } from "./useAuth"
import { useUserProfile } from "./useUserProfile"
import { SubscriptionType } from "@/lib/types"
import { getFreeTrialStatus, shouldBlockAccess, FreeTrialStatus } from "@/lib/utils/freeTrial"

export function useSubscription() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType | null>(null)
  const [subscriptionExpiryDate, setSubscriptionExpiryDate] = useState<string | null>(null)
  const [isExpiringSoon, setIsExpiringSoon] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [freeTrialStatus, setFreeTrialStatus] = useState<FreeTrialStatus>({
    isInFreeTrial: false,
    daysRemaining: 0,
    isExpiringSoon: false,
    isExpired: false,
    freeTrialEndDate: null
  })
  const [isBlocked, setIsBlocked] = useState(false)
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
      setFreeTrialStatus({
        isInFreeTrial: false,
        daysRemaining: 0,
        isExpiringSoon: false,
        isExpired: false,
        freeTrialEndDate: null
      })
      setIsBlocked(false)
      setLoading(false)
      return
    }

    // Check free trial status
    const trialStatus = getFreeTrialStatus(profile)
    setFreeTrialStatus(trialStatus)
    
    // Check if user should be blocked
    const blocked = shouldBlockAccess(profile)
    setIsBlocked(blocked)

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
    // If blocked (free trial expired and no subscription), no access
    if (isBlocked) {
      return false
    }

    // If subscription expired, no access
    if (isExpired) {
      return false
    }

    // If in free trial, allow access to ALL features (unless blocked)
    if (freeTrialStatus.isInFreeTrial && !isBlocked) {
      return true
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

  // Check if user is subscribed (excludes free trial users)
  // Use this for features that require actual subscription, not free trial
  const isSubscribedOnly = (): boolean => {
    // Must be subscribed (not just free trial)
    if (!isSubscribed || !subscriptionType) {
      return false
    }

    // Subscription must not be expired
    if (isExpired) {
      return false
    }

    // User is subscribed and subscription is active
    return true
  }

  return {
    isSubscribed,
    subscriptionType,
    subscriptionExpiryDate,
    isExpiringSoon,
    isExpired,
    freeTrialStatus,
    isBlocked,
    hasAccess,
    isSubscribedOnly,
    loading: loading || authLoading || profileLoading
  }
}

