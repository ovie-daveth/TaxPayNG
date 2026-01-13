import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'
import { BusinessType } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
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
    const userId = decodedToken.uid

    // Get request body
    const body = await request.json()
    const { businessType } = body

    // Validate business type
    const validBusinessTypes: BusinessType[] = ['freelancer', 'creator', 'sme', 'consultant']
    if (!businessType || !validBusinessTypes.includes(businessType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid business type' },
        { status: 400 }
      )
    }

    // Get user profile using Admin SDK
    const db = getAdminDb()
    const userProfilesSnapshot = await db.collection('userProfiles')
      .where('userId', '==', userId)
      .limit(1)
      .get()

    if (userProfilesSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    const profileDoc = userProfilesSnapshot.docs[0]

    // Update business type
    await db.collection('userProfiles').doc(profileDoc.id).update({
      businessType,
      updatedAt: new Date().toISOString()
    })

    // Get updated profile
    const updatedProfileDoc = await db.collection('userProfiles').doc(profileDoc.id).get()
    const updatedProfile = updatedProfileDoc.data()

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Business type updated successfully'
    })
  } catch (error) {
    console.error('Error updating business type:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

