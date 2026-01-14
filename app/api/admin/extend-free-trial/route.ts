import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'

/**
 * Extend free trial for users (individual or bulk)
 * Admin-only endpoint using Admin SDK
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const adminAuth = getAdminAuth()
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminEmail = decodedToken.email
    const db = getAdminDb()
    const adminProfileQuery = await db.collection('userProfiles')
      .where('userId', '==', decodedToken.uid)
      .limit(1)
      .get()

    if (adminProfileQuery.empty) {
      return NextResponse.json(
        { success: false, error: 'Admin profile not found' },
        { status: 403 }
      )
    }

    const adminProfile = adminProfileQuery.docs[0].data()
    if (adminProfile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userIds, daysToAdd } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User IDs array is required' },
        { status: 400 }
      )
    }

    if (!daysToAdd || typeof daysToAdd !== 'number' || daysToAdd <= 0) {
      return NextResponse.json(
        { success: false, error: 'Days to add must be a positive number' },
        { status: 400 }
      )
    }

    const now = new Date()
    const results: Array<{ userId: string; success: boolean; error?: string; newEndDate?: string }> = []

    // Process each user
    for (const userId of userIds) {
      try {
        // Find user profile by userId
        const userProfileQuery = await db.collection('userProfiles')
          .where('userId', '==', userId)
          .limit(1)
          .get()

        if (userProfileQuery.empty) {
          results.push({
            userId,
            success: false,
            error: 'User profile not found'
          })
          continue
        }

        const profileDoc = userProfileQuery.docs[0]
        const profileData = profileDoc.data()

        // Calculate new end date
        let newEndDate: Date

        if (profileData.freeTrialEndDate) {
          // Extend from existing end date
          const currentEndDate = new Date(profileData.freeTrialEndDate)
          newEndDate = new Date(currentEndDate)
          newEndDate.setDate(newEndDate.getDate() + daysToAdd)
        } else if (profileData.freeTrialStartDate) {
          // Extend from start date (if end date doesn't exist)
          const startDate = new Date(profileData.freeTrialStartDate)
          newEndDate = new Date(startDate)
          newEndDate.setDate(newEndDate.getDate() + daysToAdd)
        } else {
          // Initialize new trial if none exists
          newEndDate = new Date(now)
          newEndDate.setDate(newEndDate.getDate() + daysToAdd)
          
          // Update profile with new trial
          await profileDoc.ref.update({
            freeTrialStartDate: now.toISOString(),
            freeTrialEndDate: newEndDate.toISOString(),
            freeTrialUsed: true,
            updatedAt: new Date().toISOString()
          })

          results.push({
            userId,
            success: true,
            newEndDate: newEndDate.toISOString()
          })
          continue
        }

        // Update free trial end date
        await profileDoc.ref.update({
          freeTrialEndDate: newEndDate.toISOString(),
          freeTrialUsed: true, // Ensure trial is marked as used
          updatedAt: new Date().toISOString()
        })

        results.push({
          userId,
          success: true,
          newEndDate: newEndDate.toISOString()
        })
      } catch (error: any) {
        console.error(`Error extending trial for user ${userId}:`, error)
        results.push({
          userId,
          success: false,
          error: error.message || 'Failed to extend trial'
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Extended free trial for ${successful} user(s). ${failed > 0 ? `${failed} failed.` : ''}`,
      results,
      summary: {
        total: userIds.length,
        successful,
        failed
      }
    })
  } catch (error) {
    console.error('Error extending free trial:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

