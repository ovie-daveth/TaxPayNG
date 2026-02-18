/**
 * Hook to gate General Ledger / full accounting.
 * True only when subscriptionType is PLATINUM, Small Business, or Big Business.
 */

import { useUserProfile } from './useUserProfile'
import { useSubscription } from './useSubscription'
import { canUseGeneralLedger } from '@/lib/services/ledgerService'

export function useCanUseGeneralLedger(): boolean {
  const { profile } = useUserProfile()
  const { subscriptionType } = useSubscription()
  return canUseGeneralLedger(profile?.businessType, subscriptionType ?? null)
}
