import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

// Create a notification (server-side only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, title, message, link, metadata } = body

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    
    const notificationData = {
      userId,
      type,
      title,
      message,
      status: 'unread' as const,
      link: link || null,
      metadata: metadata || {},
      createdAt: new Date().toISOString()
    }

    const notificationRef = await db.collection('notifications').add(notificationData)

    return NextResponse.json({
      success: true,
      data: {
        id: notificationRef.id,
        ...notificationData
      }
    })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

