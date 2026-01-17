import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { getPricingConfigAdmin, setPricingConfigAdmin } from '@/lib/services/pricingConfigService'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const adminAuth = getAdminAuth()
    const decoded = await adminAuth.verifyIdToken(token)

    const db = getAdminDb()
    const adminProfileQuery = await db.collection('userProfiles')
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()

    if (adminProfileQuery.empty || adminProfileQuery.docs[0].data()?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const config = await getPricingConfigAdmin()
    return NextResponse.json(
      { success: true, data: config },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch pricing config' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const adminAuth = getAdminAuth()
    const decoded = await adminAuth.verifyIdToken(token)

    const db = getAdminDb()
    const adminProfileQuery = await db.collection('userProfiles')
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()

    if (adminProfileQuery.empty || adminProfileQuery.docs[0].data()?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { freeTrialDays, yearlyDiscountPercent, plans } = body || {}

    const updates: any = {}
    if (freeTrialDays !== undefined) {
      const n = Number(freeTrialDays)
      if (!Number.isFinite(n) || n < 0 || n > 90) {
        return NextResponse.json({ success: false, error: 'Invalid freeTrialDays' }, { status: 400 })
      }
      updates.freeTrialDays = Math.round(n)
    }
    if (yearlyDiscountPercent !== undefined) {
      const n = Number(yearlyDiscountPercent)
      if (!Number.isFinite(n) || n < 0 || n > 80) {
        return NextResponse.json({ success: false, error: 'Invalid yearlyDiscountPercent' }, { status: 400 })
      }
      updates.yearlyDiscountPercent = Math.round(n)
    }
    if (plans !== undefined) {
      if (typeof plans !== 'object' || Array.isArray(plans) || plans === null) {
        return NextResponse.json({ success: false, error: 'Invalid plans' }, { status: 400 })
      }
      // Expect kobo numbers per plan (and optional displayName strings)
      const cleanedPlans: any = {}
      for (const [planId, v] of Object.entries(plans)) {
        const monthlyPriceRaw = (v as any)?.monthlyPrice
        const monthlyPrice = monthlyPriceRaw !== undefined ? Number(monthlyPriceRaw) : undefined
        const displayNameRaw = (v as any)?.displayName
        const displayName = typeof displayNameRaw === 'string' ? displayNameRaw.trim() : undefined

        // Allow updating displayName even if price is unchanged.
        const next: any = {}
        if (monthlyPrice !== undefined) {
          if (Number.isFinite(monthlyPrice) && monthlyPrice > 0) {
            next.monthlyPrice = Math.round(monthlyPrice)
          }
        }
        if (displayName) {
          // Avoid absurdly long names
          next.displayName = displayName.slice(0, 50)
        }

        if (Object.keys(next).length === 0) continue
        cleanedPlans[planId] = next
      }
      updates.plans = cleanedPlans
    }

    const updated = await setPricingConfigAdmin(updates, decoded.email || decoded.uid)
    return NextResponse.json(
      { success: true, data: updated },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update pricing config' },
      { status: 500 }
    )
  }
}


