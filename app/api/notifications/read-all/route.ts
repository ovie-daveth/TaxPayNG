import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

// Mark all notifications as read for a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const snapshot = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .where('status', '==', 'unread')
      .get()

    const batch = db.batch()
    const readAt = new Date().toISOString()

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'read',
        readAt
      })
    })

    await batch.commit()

    return NextResponse.json({
      success: true,
      message: `${snapshot.docs.length} notification(s) marked as read`
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}

