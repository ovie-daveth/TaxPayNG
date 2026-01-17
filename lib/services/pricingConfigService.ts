import type { SubscriptionType } from '@/lib/types'
import { SUBSCRIPTION_PLANS } from '@/lib/services/subscriptionService'
import { getAdminDb } from '@/lib/firebase-admin'
import { DEFAULT_FREE_TRIAL_DAYS, DEFAULT_YEARLY_DISCOUNT_PERCENT } from '@/lib/constants/pricing'

export type BillingInterval = 'monthly' | 'yearly'

export interface PricingConfigPlanOverride {
  monthlyPrice: number // in kobo
  /**
   * Human-friendly display name for the plan (admin-controlled).
   * Example: "PRO", "GOLD", "PLATINUM", "Small Business"
   */
  displayName?: string
}

export interface PricingConfig {
  freeTrialDays: number
  yearlyDiscountPercent: number
  plans: Record<string, PricingConfigPlanOverride>
  updatedAt?: string
  updatedBy?: string
}

export function calculateYearlyPriceFromMonthly(monthlyPriceKobo: number, yearlyDiscountPercent: number): number {
  const discountFactor = 1 - yearlyDiscountPercent / 100
  return Math.round(12 * monthlyPriceKobo * discountFactor)
}

export function getDefaultPricingConfig(): PricingConfig {
  const plans: Record<string, PricingConfigPlanOverride> = {}
  for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    // Default display names should match the public pricing page headings.
    // Admin can override this via the pricing config in Firestore.
    plans[planId] = { monthlyPrice: plan.monthlyPrice, displayName: planId }
  }

  return {
    freeTrialDays: DEFAULT_FREE_TRIAL_DAYS,
    yearlyDiscountPercent: DEFAULT_YEARLY_DISCOUNT_PERCENT,
    plans,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system'
  }
}

export async function getPricingConfigAdmin(): Promise<PricingConfig> {
  const db = getAdminDb()
  const ref = db.collection('appConfig').doc('pricing')
  const snap = await ref.get()

  if (!snap.exists) {
    const defaults = getDefaultPricingConfig()
    await ref.set(defaults, { merge: true })
    return defaults
  }

  const data = snap.data() as Partial<PricingConfig>
  const defaults = getDefaultPricingConfig()

  // Merge with defaults to ensure new plans/fields exist (deep merge per plan)
  const mergedPlans: Record<string, PricingConfigPlanOverride> = { ...defaults.plans }
  for (const [planId, override] of Object.entries((data.plans || {}) as Record<string, PricingConfigPlanOverride>)) {
    mergedPlans[planId] = {
      ...(mergedPlans[planId] || {}),
      ...(override || {})
    }
  }

  return {
    ...defaults,
    ...data,
    plans: mergedPlans
  }
}

export async function setPricingConfigAdmin(
  updates: Partial<PricingConfig>,
  updatedBy: string
): Promise<PricingConfig> {
  const db = getAdminDb()
  const ref = db.collection('appConfig').doc('pricing')

  const current = await getPricingConfigAdmin()
  const mergedPlans: Record<string, PricingConfigPlanOverride> = { ...(current.plans || {}) }
  for (const [planId, override] of Object.entries((updates.plans || {}) as Record<string, PricingConfigPlanOverride>)) {
    mergedPlans[planId] = {
      ...(mergedPlans[planId] || {}),
      ...(override || {})
    }
  }

  const next: PricingConfig = {
    ...current,
    ...updates,
    plans: mergedPlans,
    updatedAt: new Date().toISOString(),
    updatedBy
  }

  await ref.set(next, { merge: true })
  return next
}

export function getEffectivePlanPriceKobo(
  subscriptionType: SubscriptionType,
  interval: BillingInterval,
  config: PricingConfig
): number | null {
  if (!subscriptionType) return null
  const basePlan = SUBSCRIPTION_PLANS[subscriptionType]
  if (!basePlan) return null

  const overrideMonthly = config.plans?.[subscriptionType]?.monthlyPrice
  const monthlyPrice = typeof overrideMonthly === 'number' && overrideMonthly > 0 ? overrideMonthly : basePlan.monthlyPrice
  if (interval === 'monthly') return monthlyPrice
  return calculateYearlyPriceFromMonthly(monthlyPrice, config.yearlyDiscountPercent || DEFAULT_YEARLY_DISCOUNT_PERCENT)
}


