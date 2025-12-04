import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId, agentId, agentName } = body

    if (!requestId || !agentId || !agentName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    
    // Get the filing request to get client info
    const requestDoc = await db.collection('filingRequests').doc(requestId).get()
    if (!requestDoc.exists) {
      return NextResponse.json(
        { error: 'Filing request not found' },
        { status: 404 }
      )
    }

    const requestData = requestDoc.data()
    
    // Update the filing request
    const requestRef = db.collection('filingRequests').doc(requestId)
    await requestRef.update({
      assignedAgentId: agentId,
      assignedAgentName: agentName,
      status: 'assigned',
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Create notification for the agent
    try {
      await db.collection('notifications').add({
        userId: agentId,
        type: 'filing_status_update',
        title: 'New filing request assigned',
        message: `You have been assigned a new filing request for ${requestData?.state || 'a state'}. RRR: ${requestData?.rrr || 'N/A'}`,
        status: 'unread',
        link: `/agent/dashboard/requests/${requestId}`,
        metadata: {
          requestId,
          state: requestData?.state,
          rrr: requestData?.rrr,
          clientId: requestData?.userId
        },
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error creating agent notification:', error)
      // Don't fail the assignment if notification creation fails
    }

    // Also notify the client that an agent has been assigned
    try {
      if (requestData?.userId) {
        await db.collection('notifications').add({
          userId: requestData.userId,
          type: 'filing_status_update',
          title: 'Agent assigned to your filing request',
          message: `${agentName} has been assigned to handle your filing request.`,
          status: 'unread',
          link: `/dashboard/filing-requests/${requestId}`,
          metadata: {
            requestId,
            agentId,
            agentName
          },
          createdAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error creating client notification:', error)
      // Don't fail the assignment if notification creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Agent assigned successfully'
    })
  } catch (error) {
    console.error('Error assigning agent:', error)
    return NextResponse.json(
      { error: 'Failed to assign agent' },
      { status: 500 }
    )
  }
}

