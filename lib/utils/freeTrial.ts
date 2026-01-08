import { UserProfile } from "@/lib/types"

export interface FreeTrialStatus {
  isInFreeTrial: boolean
  daysRemaining: number
  isExpiringSoon: boolean // Day 6
  isExpired: boolean // Day 7 or later
  freeTrialEndDate: string | null
}

/**
 * Calculate free trial status from user profile
 */
export function getFreeTrialStatus(profile: UserProfile | null | undefined): FreeTrialStatus {
  if (!profile || !profile.freeTrialEndDate || profile.freeTrialUsed === false) {
    return {
      isInFreeTrial: false,
      daysRemaining: 0,
      isExpiringSoon: false,
      isExpired: false,
      freeTrialEndDate: null
    }
  }

  const now = new Date()
  const endDate = new Date(profile.freeTrialEndDate)
  
  // If user has an active subscription, they're not in free trial
  if (profile.isSubscribe && profile.subscriptionExpiryDate) {
    const subscriptionExpiry = new Date(profile.subscriptionExpiryDate)
    if (subscriptionExpiry > now) {
      return {
        isInFreeTrial: false,
        daysRemaining: 0,
        isExpiringSoon: false,
        isExpired: false,
        freeTrialEndDate: profile.freeTrialEndDate
      }
    }
  }

  // Calculate days remaining
  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  const isExpired = diffDays < 0
  const isExpiringSoon = diffDays === 1 || diffDays === 0 // Day 6 (1 day left) or Day 7 (0 days left)
  const isInFreeTrial = !isExpired && diffDays >= 0

  return {
    isInFreeTrial,
    daysRemaining: Math.max(0, diffDays),
    isExpiringSoon,
    isExpired,
    freeTrialEndDate: profile.freeTrialEndDate
  }
}

/**
 * Check if user should be blocked from accessing the system
 */
export function shouldBlockAccess(profile: UserProfile | null | undefined): boolean {
  const status = getFreeTrialStatus(profile)
  
  // Block if free trial expired and no active subscription
  if (status.isExpired && (!profile?.isSubscribe || !profile?.subscriptionExpiryDate)) {
    return true
  }

  // Block if subscription expired
  if (profile?.isSubscribe && profile?.subscriptionExpiryDate) {
    const subscriptionExpiry = new Date(profile.subscriptionExpiryDate)
    const now = new Date()
    if (subscriptionExpiry < now) {
      return true
    }
  }

  return false
}

