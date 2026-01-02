import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { FilingRequest } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, state, reportId, rrr, supportingDocuments, entityId } = body

    if (!userId || !reportId) {
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
    
    // Prefer explicit entityId from client; otherwise infer from the report record (if available)
    let resolvedEntityId: string | undefined = entityId || undefined
    if (!resolvedEntityId) {
      try {
        const reportDoc = await db.collection('selfAssessments').doc(reportId).get()
        const reportData = reportDoc.exists ? (reportDoc.data() as any) : null
        if (reportData?.entityId) resolvedEntityId = reportData.entityId
      } catch (e) {
        // Best effort only
      }
    }

    const requestData: Omit<FilingRequest, 'id'> = {
      entityId: resolvedEntityId,
      userId,
      state: state || 'NRS',
      reportId,
      rrr: rrr || '',
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
