import { NextResponse } from 'next/server'
import { DEFAULT_FREE_TRIAL_DAYS, DEFAULT_YEARLY_DISCOUNT_PERCENT } from '@/lib/constants/pricing'
import { SUBSCRIPTION_PLANS } from '@/lib/services/subscriptionService'
import type { PricingConfig, PricingConfigPlanOverride } from '@/lib/services/pricingConfigService'

export const dynamic = 'force-dynamic'

/** Build default pricing config without loading Firebase (so this route always registers). */
function getDefaultConfig(): PricingConfig {
  const plans: Record<string, PricingConfigPlanOverride> = {}
  for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    plans[planId] = { monthlyPrice: plan.monthlyPrice, displayName: planId }
  }
  return {
    freeTrialDays: DEFAULT_FREE_TRIAL_DAYS,
    yearlyDiscountPercent: DEFAULT_YEARLY_DISCOUNT_PERCENT,
    plans,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  }
}

/**
 * Public pricing config (read-only).
 * Uses Firestore when available; falls back to defaults so the route never 404s.
 */
export async function GET() {
  try {
    const { getPricingConfigAdmin } = await import('@/lib/services/pricingConfigService')
    const config = await getPricingConfigAdmin()
    return NextResponse.json(
      { success: true, data: config },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch {
    const config = getDefaultConfig()
    return NextResponse.json(
      { success: true, data: config },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  }
}
