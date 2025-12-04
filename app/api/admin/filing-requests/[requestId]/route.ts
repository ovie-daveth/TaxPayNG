import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

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
    const requestDoc = await db.collection('filingRequests').doc(requestId).get()

    if (!requestDoc.exists) {
      return NextResponse.json(
        { error: 'Filing request not found' },
        { status: 404 }
      )
    }

    const requestData = {
      id: requestDoc.id,
      ...requestDoc.data()
    }

    return NextResponse.json({
      success: true,
      data: requestData
    })
  } catch (error) {
    console.error('Error fetching filing request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filing request' },
      { status: 500 }
    )
  }
}

