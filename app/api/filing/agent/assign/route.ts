import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { FilingRequest } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, state, reportId, rrr, supportingDocuments, entityId } = body

    console.log('Filing agent request received:', { userId, state, reportId, rrr, supportingDocsCount: supportingDocuments?.length, entityId })

    if (!userId || !reportId) {
      console.error('Missing required fields:', { userId: !!userId, reportId: !!reportId })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!supportingDocuments || !Array.isArray(supportingDocuments) || supportingDocuments.length === 0) {
      console.error('No supporting documents provided')
      return NextResponse.json(
        { error: 'At least one supporting document is required' },
        { status: 400 }
      )
    }

    console.log('Getting admin DB...')
    const db = getAdminDb()
    
    // Prefer explicit entityId from client; otherwise infer from the report record (if available)
    let resolvedEntityId: string | undefined = entityId || undefined
    if (!resolvedEntityId) {
      try {
        console.log('Fetching report to get entityId...')
        const reportDoc = await db.collection('selfAssessments').doc(reportId).get()
        const reportData = reportDoc.exists ? (reportDoc.data() as any) : null
        if (reportData?.entityId) resolvedEntityId = reportData.entityId
        console.log('Resolved entityId:', resolvedEntityId)
      } catch (e) {
        console.error('Error fetching report for entityId:', e)
        // Best effort only
      }
    }

    const requestData: any = {
      userId,
      state: state || 'NRS',
      reportId,
      rrr: rrr || '',
      supportingDocuments,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Only add entityId if it exists (Firestore doesn't allow undefined values)
    if (resolvedEntityId) {
      requestData.entityId = resolvedEntityId
    }

    console.log('Creating filing request...')
    // Create document using Admin SDK (bypasses security rules)
    const requestRef = await db.collection('filingRequests').add(requestData)
    const requestId = requestRef.id
    console.log('Filing request created:', requestId)

    // Update report with filing status using Admin SDK
    try {
      console.log('Updating report status...')
      const db = getAdminDb()
      const reportRef = db.collection('selfAssessments').doc(reportId)
      await reportRef.update({
        filingStatus: 'submitted',
        filingMethod: 'agent',
        updatedAt: new Date().toISOString()
      })
      console.log('Report status updated successfully')
    } catch (error) {
      console.error('Error updating report status:', error)
      // Continue even if update fails
    }

    console.log('Filing request submitted successfully:', requestId)
    return NextResponse.json({
      success: true,
      requestId,
      message: 'Filing request submitted successfully. An agent will be assigned shortly.'
    })
  } catch (error) {
    console.error('Error creating filing request:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to submit filing request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
