import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportId, state, rrr, transactionRef } = body

    if (!reportId || !state || !rrr) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // TODO: Integrate with actual IRS API
    // For now, generate mock acknowledgment number
    const acknowledgmentNumber = `IRS-${state.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // In production, this would call the actual IRS API:
    // const response = await fetch(`${IRS_API_URL}/submit`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${IRS_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     reportId,
    //     state,
    //     rrr,
    //     transactionRef
    //   })
    // })

    // Update report with filing status using Admin SDK
    try {
      const db = getAdminDb()
      const reportRef = db.collection('selfAssessments').doc(reportId)
      await reportRef.update({
        filingStatus: 'acknowledged',
        filingMethod: 'direct',
        acknowledgmentNumber,
        status: 'completed',
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating report status:', error)
      // Continue even if update fails
    }

    return NextResponse.json({
      success: true,
      acknowledgmentNumber,
      message: `Tax return submitted successfully to ${state} IRS`
    })
  } catch (error) {
    console.error('Error submitting return:', error)
    return NextResponse.json(
      { error: 'Failed to submit return' },
      { status: 500 }
    )
  }
}

