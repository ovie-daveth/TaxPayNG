import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

// Get notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') // 'unread' | 'read' | 'all'

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    let query = db.collection('notifications').where('userId', '==', userId)

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.where('status', '==', status)
    }

    const snapshot = await query.get()

    // Sort in memory by createdAt descending
    const notifications = snapshot.docs
      .map(doc => {
        const data = doc.data()
        let notification = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt || new Date().toISOString()
        } as { id: string; createdAt: string; link?: string; metadata?: any; userId: string; [key: string]: any }
        
        // Fix incorrect links for message notifications
        // The link should be based on the recipient (userId), not the sender
        if (notification.type === 'message' && notification.metadata?.requestId) {
          const requestId = notification.metadata.requestId
          const senderType = notification.metadata.senderType
          
          // Determine correct link based on recipient type
          // If sender is client, recipient is agent → should use agent route
          // If sender is agent, recipient is client → should use client route
          const correctLink = senderType === 'client'
            ? `/agent/dashboard/requests/${requestId}#messages`  // Agent receives message from client
            : `/dashboard/filing-requests/${requestId}#messages` // Client receives message from agent
          
          // Only fix if the link is wrong
          if (notification.link && notification.link !== correctLink) {
            console.log(`Fixing notification link: ${notification.link} → ${correctLink}`)
            notification.link = correctLink
            // Update in database (async, don't wait)
            doc.ref.update({ link: correctLink }).catch(err => 
              console.error('Error updating notification link:', err)
            )
          }
        }
        
        return notification
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA // Descending order (newest first)
      })

    return NextResponse.json({
      success: true,
      data: notifications
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// Create a new notification
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

