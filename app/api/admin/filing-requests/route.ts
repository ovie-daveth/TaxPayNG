import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const db = getAdminDb()
    const status = request.nextUrl.searchParams.get('status')
    
    let query = db.collection('filingRequests').orderBy('createdAt', 'desc')
    
    if (status) {
      query = query.where('status', '==', status) as any
    }
    
    const snapshot = await query.get()
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    return NextResponse.json({
      success: true,
      data: requests
    })
  } catch (error) {
    console.error('Error fetching filing requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filing requests' },
      { status: 500 }
    )
  }
}

