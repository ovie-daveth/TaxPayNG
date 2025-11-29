import { NextRequest, NextResponse } from 'next/server'
import { BaseService } from '@/lib/services/base'
import { getAdminDb } from '@/lib/firebase-admin'

class FilingTicketService extends BaseService {
  constructor() {
    super('filingTickets')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, state, reportId, rrr } = body

    if (!userId || !state || !reportId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const ticketService = new FilingTicketService()
    
    const ticketData = {
      userId,
      state,
      reportId,
      rrr,
      status: 'pending',
      assignedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const ticketId = await ticketService.create(ticketData)

    // Update report with filing status using Admin SDK
    try {
      const db = getAdminDb()
      const reportRef = db.collection('selfAssessments').doc(reportId)
      await reportRef.update({
        filingStatus: 'submitted',
        filingMethod: 'agent',
        ticketId,
        status: 'completed',
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating report status:', error)
      // Continue even if update fails
    }

    // TODO: Notify agent via email/notification system

    return NextResponse.json({
      success: true,
      ticketId,
      message: 'Filing agent assigned successfully'
    })
  } catch (error) {
    console.error('Error assigning agent:', error)
    return NextResponse.json(
      { error: 'Failed to assign agent' },
      { status: 500 }
    )
  }
}

