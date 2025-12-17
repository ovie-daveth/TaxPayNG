import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'

const auth = getAdminAuth()
const adminDb = getAdminDb()

/**
 * Get authenticated user ID from request
 */
async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const cookies = request.headers.get("cookie") || ""
    const sessionCookie = cookies.match(/session=([^;]+)/)?.[1]

    if (sessionCookie) {
      const decodedToken = await auth.verifySessionCookie(sessionCookie, true)
      return decodedToken?.uid || null
    }

    const bearer = request.headers.get("authorization")
    const token = bearer?.startsWith("Bearer ") ? bearer.substring(7) : undefined

    if (token) {
      const decodedToken = await auth.verifyIdToken(token, true)
      return decodedToken?.uid || null
    }

    return null
  } catch (error) {
    console.error('Error getting user ID:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { additionalBytes } = await request.json()

    if (additionalBytes === undefined || additionalBytes === null) {
      return NextResponse.json(
        { error: 'additionalBytes is required' },
        { status: 400 }
      )
    }

    // Get userId from auth
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    try {
      // Use Admin SDK to get and update profile
      const profileQuery = await adminDb.collection('userProfiles')
        .where('userId', '==', userId)
        .limit(1)
        .get()
      
      if (profileQuery.empty) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }

      const profileDoc = profileQuery.docs[0]
      const profileData = profileDoc.data()
      const currentStorageUsed = profileData.storageUsed || 0
      const newStorageUsed = Math.max(0, currentStorageUsed + additionalBytes) // Ensure it doesn't go below 0
      
      await adminDb.collection('userProfiles').doc(profileDoc.id).update({
        storageUsed: newStorageUsed,
        updatedAt: new Date().toISOString()
      })

      console.log(`Storage updated: ${additionalBytes > 0 ? 'added' : 'reduced'} ${Math.abs(additionalBytes)} bytes. Old: ${currentStorageUsed}, New: ${newStorageUsed}`)
      
      return NextResponse.json({
        success: true,
        data: {
          storageUsed: newStorageUsed,
          storageLimit: profileData.storageLimit || 500 * 1024 * 1024
        },
        message: 'Storage usage updated'
      })
    } catch (dbError) {
      console.error('Error updating storage:', dbError)
      return NextResponse.json(
        { error: dbError instanceof Error ? dbError.message : 'Failed to update storage' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Update storage API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update storage'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

