import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { getAdminDb } from '@/lib/firebase-admin'

interface GenerateRRRRequest {
  amount: number
  taxType: string
  taxYear: number
  paymentMode: string
  userInfo: {
    tin?: string
    taxId?: string
    name: string
    email: string
    phone?: string
  }
  reportId?: string
  paymentData?: {
    period?: string
    taxDuration?: string
    method?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRRRRequest = await request.json()
    const { amount, taxType, taxYear, paymentMode, userInfo, reportId } = body

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Get TIN from either tin or taxId field
    const tin = userInfo?.tin || userInfo?.taxId || ""
    
    if (!tin || !userInfo?.name || !userInfo?.email) {
      return NextResponse.json(
        { error: 'Missing user information' },
        { status: 400 }
      )
    }

    // TODO: Integrate with actual Remita API
    // For now, generate a mock RRR
    // In production, this would call Remita's API:
    // const remitaResponse = await fetch('https://remitademo.net/remita/ecomm/finalize.reg', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${REMITA_API_KEY}`
    //   },
    //   body: JSON.stringify({
    //     amount: amount,
    //     orderId: `TAX-${Date.now()}`,
    //     payerName: userInfo.name,
    //     payerEmail: userInfo.email,
    //     payerPhone: userInfo.phone,
    //     description: `${taxType} - ${taxYear}`
    //   })
    // })

    // Generate mock RRR (format: 12 alphanumeric characters)
    const timestamp = Date.now().toString()
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
    const rrr = `${timestamp.slice(-6)}${randomStr}`.padEnd(12, '0').slice(0, 12)

    // Calculate validity (30 days from now)
    const validity = new Date()
    validity.setDate(validity.getDate() + 30)

    // Update the self-assessment report with RRR using Admin SDK (if reportId provided)
    if (reportId) {
      try {
        const db = getAdminDb()
        const reportRef = db.collection('selfAssessments').doc(reportId)
        await reportRef.update({
          rrr,
          updatedAt: new Date().toISOString()
        })
      } catch (error) {
        console.error('Error updating report with RRR:', error)
        // Continue even if update fails
      }
    }
    // Note: For regular payments (without reportId), RRR is stored when payment is confirmed

    return NextResponse.json({
      rrr,
      validity: validity.toISOString(),
      amount,
      taxType,
      taxYear,
      paymentMode,
      orderId: `TAX-${reportId}-${Date.now()}`,
      message: 'RRR generated successfully'
    })
  } catch (error) {
    console.error('Error generating RRR:', error)
    return NextResponse.json(
      { error: 'Failed to generate RRR' },
      { status: 500 }
    )
  }
}

