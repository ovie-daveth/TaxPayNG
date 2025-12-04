import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

// Get messages for a filing request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    // Fetch all messages for this request (without orderBy to avoid index requirement)
    const messagesSnapshot = await db
      .collection('filingRequestMessages')
      .where('requestId', '==', requestId)
      .get()

    // Sort in memory by createdAt descending
    const messages = messagesSnapshot.docs
      .map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt || new Date().toISOString()
        } as { id: string; createdAt: string; [key: string]: any }
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA // Descending order (newest first)
      })

    return NextResponse.json({
      success: true,
      data: messages
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// Send a new message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params
    const body = await request.json()
    const { userId, userName, message, userType } = body // userType: 'agent' | 'client'

    if (!requestId || !userId || !message) {
      return NextResponse.json(
        { error: 'Request ID, user ID, and message are required' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    
    // Verify the request exists
    const requestDoc = await db.collection('filingRequests').doc(requestId).get()
    if (!requestDoc.exists) {
      return NextResponse.json(
        { error: 'Filing request not found' },
        { status: 404 }
      )
    }

    // Create message
    const messageData = {
      requestId,
      userId,
      userName: userName || 'Unknown',
      message,
      userType: userType || 'client',
      createdAt: new Date().toISOString(),
      read: false
    }

    const messageRef = await db.collection('filingRequestMessages').add(messageData)

    // Update request's updatedAt timestamp
    await db.collection('filingRequests').doc(requestId).update({
      updatedAt: new Date().toISOString()
    })

    // Create notification for the recipient
    try {
      const requestDoc = await db.collection('filingRequests').doc(requestId).get()
      const requestData = requestDoc.data()
      
      if (requestData) {
        // Determine recipient: if sender is client, notify agent; if sender is agent, notify client
        const recipientUserId = userType === 'agent' ? requestData.userId : requestData.assignedAgentId
        
        if (recipientUserId && recipientUserId !== userId) {
          const senderName = userName || 'Someone'
          const recipientType = userType === 'agent' ? 'client' : 'agent'
          
          // Link should be based on recipient type, not sender type
          // If sender is client, recipient is agent → use agent route
          // If sender is agent, recipient is client → use client route
          const recipientLink = recipientType === 'agent'
            ? `/agent/dashboard/requests/${requestId}#messages`
            : `/dashboard/filing-requests/${requestId}#messages`
          
          console.log("Notification link:", {
            senderType: userType,
            recipientType,
            recipientUserId,
            link: recipientLink
          })
          
          await db.collection('notifications').add({
            userId: recipientUserId,
            type: 'message',
            title: `New message from ${senderName}`,
            message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
            status: 'unread',
            link: recipientLink,
            metadata: {
              requestId,
              messageId: messageRef.id,
              senderId: userId,
              senderName,
              senderType: userType
            },
            createdAt: new Date().toISOString()
          })
        }
      }
    } catch (error) {
      console.error('Error creating message notification:', error)
      // Don't fail the message send if notification creation fails
    }

    return NextResponse.json({
      success: true,
      data: {
        id: messageRef.id,
        ...messageData
      },
      message: 'Message sent successfully'
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

