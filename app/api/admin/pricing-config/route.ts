import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { getPricingConfigAdmin, setPricingConfigAdmin } from '@/lib/services/pricingConfigService'

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
    return NextResponse.json({ success: true, data: config })
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
      // Expect kobo numbers per plan
      const cleanedPlans: any = {}
      for (const [planId, v] of Object.entries(plans)) {
        const monthlyPrice = Number((v as any)?.monthlyPrice)
        if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0) continue
        cleanedPlans[planId] = { monthlyPrice: Math.round(monthlyPrice) }
      }
      updates.plans = cleanedPlans
    }

    const updated = await setPricingConfigAdmin(updates, decoded.email || decoded.uid)
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update pricing config' },
      { status: 500 }
    )
  }
}


