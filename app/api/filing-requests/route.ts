import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

// Get all filing requests for the current user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const entityId = searchParams.get('entityId')
    const defaultEntityId = searchParams.get('defaultEntityId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    // Fetch all requests for this user (without orderBy to avoid index requirement)
    const requestsSnapshot = await db
      .collection('filingRequests')
      .where('userId', '==', userId)
      .get()

    // Sort in memory by createdAt descending
    const requests = requestsSnapshot.docs
      .map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt || new Date().toISOString()
        } as { id: string; createdAt: string; [key: string]: any }
      })
      .filter((r) => {
        if (!entityId) return true
        // Backwards compatibility: legacy requests without entityId belong to the default entity.
        const isLegacyDefault = !r.entityId && defaultEntityId && entityId === defaultEntityId
        return r.entityId === entityId || isLegacyDefault
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA // Descending order (newest first)
      })

    return NextResponse.json({
      success: true,
      data: requests
    })
  } catch (error) {
    console.error('Error fetching filing requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filing requests' },
      { status: 500 }
    )
  }
}

