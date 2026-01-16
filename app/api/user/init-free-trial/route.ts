import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'

/**
 * Initialize free trial for a newly created user profile
 * This endpoint uses Admin SDK to bypass Firestore security rules
 * and securely set free trial fields (14 days from now)
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    let decodedToken
    const adminAuth = getAdminAuth()
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid
    const db = getAdminDb()

    // Check if profile exists
    const profileQuery = await db.collection('userProfiles')
      .where('userId', '==', userId)
      .limit(1)
      .get()

    if (profileQuery.empty) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    const profileDoc = profileQuery.docs[0]
    const profileData = profileDoc.data()

    // Check if free trial has already been initialized
    if (profileData.freeTrialUsed === true && profileData.freeTrialStartDate && profileData.freeTrialEndDate) {
      return NextResponse.json({
        success: true,
        message: 'Free trial already initialized',
        data: {
          freeTrialStartDate: profileData.freeTrialStartDate,
          freeTrialEndDate: profileData.freeTrialEndDate,
          freeTrialUsed: profileData.freeTrialUsed
        }
      })
    }

    // Set up free trial (14 days from now)
    const now = new Date()
    const freeTrialEndDate = new Date(now)
    freeTrialEndDate.setDate(freeTrialEndDate.getDate() + 14)

    // Update profile with free trial fields using Admin SDK (bypasses security rules)
    await profileDoc.ref.update({
      freeTrialStartDate: now.toISOString(),
      freeTrialEndDate: freeTrialEndDate.toISOString(),
      freeTrialUsed: true,
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Free trial initialized successfully',
      data: {
        freeTrialStartDate: now.toISOString(),
        freeTrialEndDate: freeTrialEndDate.toISOString(),
        freeTrialUsed: true
      }
    })
  } catch (error) {
    console.error('Error initializing free trial:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

