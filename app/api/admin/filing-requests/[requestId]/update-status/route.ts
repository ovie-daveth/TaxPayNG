import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params
    const body = await request.json()
    const { status, notes } = body

    if (!requestId || !status) {
      return NextResponse.json(
        { error: 'Request ID and status are required' },
        { status: 400 }
      )
    }

    const validStatuses = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const requestRef = db.collection('filingRequests').doc(requestId)
    const requestDoc = await requestRef.get()

    if (!requestDoc.exists) {
      return NextResponse.json(
        { error: 'Filing request not found' },
        { status: 404 }
      )
    }

    const updateData: any = {
      status,
      updatedAt: new Date().toISOString()
    }

    // Add completedAt timestamp if status is completed
    if (status === 'completed') {
      updateData.completedAt = new Date().toISOString()
    }

    // Add notes if provided
    if (notes) {
      updateData.notes = notes
    }

    await requestRef.update(updateData)

    // Create notification for the client
    try {
      const requestData = requestDoc.data()
      if (requestData?.userId) {
        const db = getAdminDb()
        const statusText = status.replace('_', ' ').split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
        
        await db.collection('notifications').add({
          userId: requestData.userId,
          type: 'filing_status_update',
          title: `Filing request status updated`,
          message: `Your filing request status has been updated to: ${statusText}${notes ? `. ${notes.substring(0, 80)}${notes.length > 80 ? '...' : ''}` : ''}`,
          status: 'unread',
          link: `/dashboard/filing-requests/${requestId}`,
          metadata: {
            requestId,
            status,
            agentId: requestData.assignedAgentId,
            agentName: requestData.assignedAgentName
          },
          createdAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error creating status update notification:', error)
      // Don't fail the status update if notification creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Request status updated successfully'
    })
  } catch (error) {
    console.error('Error updating request status:', error)
    return NextResponse.json(
      { error: 'Failed to update request status' },
      { status: 500 }
    )
  }
}

