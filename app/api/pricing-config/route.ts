import { NextResponse } from 'next/server'
import { getPricingConfigAdmin } from '@/lib/services/pricingConfigService'

/**
 * Public pricing config (read-only).
 * Safe to expose: prices + trial days used to render the pricing page.
 */
export async function GET() {
  try {
    const config = await getPricingConfigAdmin()
    return NextResponse.json({ success: true, data: config })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch pricing config' },
      { status: 500 }
    )
  }
}


