import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

// Upload completed/stamped document for a filing request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params
    const body = await request.json()
    const { documentUrl, documentName, documentId } = body

    if (!requestId || !documentUrl || !documentName) {
      return NextResponse.json(
        { error: 'Request ID, document URL, and document name are required' },
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

    const requestData = requestDoc.data()
    
    // Update filing request with completed document
    await requestRef.update({
      completedDocumentUrl: documentUrl,
      completedDocumentName: documentName,
      completedDocumentId: documentId || null,
      status: 'completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    // Update the self-assessment report with the completed document
    if (requestData?.reportId) {
      try {
        const reportRef = db.collection('selfAssessments').doc(requestData.reportId)
        await reportRef.update({
          completedDocumentUrl: documentUrl,
          completedDocumentName: documentName,
          completedDocumentId: documentId || null,
          filingStatus: 'acknowledged',
          status: 'completed',
          updatedAt: new Date().toISOString()
        })
      } catch (error) {
        console.error('Error updating report with completed document:', error)
        // Continue even if report update fails
      }
    }

    // Create notification for the client
    try {
      if (requestData?.userId) {
        await db.collection('notifications').add({
          userId: requestData.userId,
          type: 'filing_status_update',
          title: 'Filing request completed',
          message: `Your filing request has been completed. The signed and stamped document is now available.`,
          status: 'unread',
          link: `/dashboard/filing-requests/${requestId}`,
          metadata: {
            requestId,
            reportId: requestData.reportId,
            agentId: requestData.assignedAgentId,
            agentName: requestData.assignedAgentName
          },
          createdAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error creating completion notification:', error)
      // Don't fail the upload if notification creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Completed document uploaded successfully'
    })
  } catch (error) {
    console.error('Error uploading completed document:', error)
    return NextResponse.json(
      { error: 'Failed to upload completed document' },
      { status: 500 }
    )
  }
}

