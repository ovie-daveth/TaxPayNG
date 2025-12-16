"use client"

import { useEffect, useState } from "react"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { SubscriptionExpiryModal } from "./subscription-expiry-modal"

export function SubscriptionExpiryChecker() {
  const { isSubscribed, subscriptionType, subscriptionExpiryDate, isExpiringSoon, isExpired, loading } = useSubscription()
  const [showModal, setShowModal] = useState(false)
  const [hasShownWarning, setHasShownWarning] = useState(false)

  useEffect(() => {
    if (loading) return

    // Only show modal if subscription is expiring soon or expired
    if ((isExpiringSoon || isExpired) && subscriptionExpiryDate && subscriptionType && !hasShownWarning) {
      setShowModal(true)
      setHasShownWarning(true)
    }
  }, [isExpiringSoon, isExpired, subscriptionExpiryDate, subscriptionType, loading, hasShownWarning])

  if (!isSubscribed || !subscriptionExpiryDate || !subscriptionType) {
    return null
  }

  return (
    <SubscriptionExpiryModal
      open={showModal}
      onOpenChange={setShowModal}
      expiryDate={subscriptionExpiryDate}
      subscriptionType={subscriptionType}
      isExpired={isExpired}
    />
  )
}

