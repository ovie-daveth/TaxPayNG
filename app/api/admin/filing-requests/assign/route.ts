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
    
    // Update the filing request
    const requestRef = db.collection('filingRequests').doc(requestId)
    await requestRef.update({
      assignedAgentId: agentId,
      assignedAgentName: agentName,
      status: 'assigned',
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

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

