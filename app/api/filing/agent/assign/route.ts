import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { FilingRequest } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, state, reportId, rrr, supportingDocuments } = body

    if (!userId || !state || !reportId || !rrr) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!supportingDocuments || !Array.isArray(supportingDocuments) || supportingDocuments.length === 0) {
      return NextResponse.json(
        { error: 'At least one supporting document is required' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    
    const requestData: Omit<FilingRequest, 'id'> = {
      userId,
      state,
      reportId,
      rrr,
      supportingDocuments,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Create document using Admin SDK (bypasses security rules)
    const requestRef = await db.collection('filingRequests').add(requestData)
    const requestId = requestRef.id

    // Update report with filing status using Admin SDK
    try {
      const db = getAdminDb()
      const reportRef = db.collection('selfAssessments').doc(reportId)
      await reportRef.update({
        filingStatus: 'submitted',
        filingMethod: 'agent',
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating report status:', error)
      // Continue even if update fails
    }

    return NextResponse.json({
      success: true,
      requestId,
      message: 'Filing request submitted successfully. An agent will be assigned shortly.'
    })
  } catch (error) {
    console.error('Error creating filing request:', error)
    return NextResponse.json(
      { error: 'Failed to submit filing request' },
      { status: 500 }
    )
  }
}
