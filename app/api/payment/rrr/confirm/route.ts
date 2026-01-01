import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { getAdminDb } from '@/lib/firebase-admin'

interface ConfirmPaymentRequest {
  rrr: string
  status: string
  transactionRef: string
  amount: number
  reportId?: string
  entityId?: string
  paymentType?: "filing" | "regular"
  paymentData?: {
    period?: string
    taxDuration?: string
    method?: string
  }
  userId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ConfirmPaymentRequest = await request.json()
    const { rrr, status, transactionRef, amount, reportId, entityId, paymentType, paymentData: paymentInfo, userId } = body

    if (!rrr || !status || !transactionRef || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const db = getAdminDb()

    // Prefer explicit entityId from client; otherwise infer from the report record (if available)
    let resolvedEntityId: string | undefined = entityId || undefined
    if (!resolvedEntityId && reportId) {
      try {
        const reportDoc = await db.collection('selfAssessments').doc(reportId).get()
        const reportData = reportDoc.exists ? (reportDoc.data() as any) : null
        if (reportData?.entityId) resolvedEntityId = reportData.entityId
      } catch (e) {
        // Best effort only
      }
    }

    // For regular payments (not filing), save to taxPayments collection
    if (paymentType === 'regular' && userId && paymentInfo) {
      try {
        const taxPaymentData = {
          userId,
          entityId: resolvedEntityId,
          transactionId: transactionRef,
          amount,
          period: (paymentInfo.period || 'monthly') as 'monthly' | 'quarterly' | 'yearly',
          taxDuration: paymentInfo.taxDuration || '',
          paymentMethod: (paymentInfo.method || 'remitta') as 'remitta' | 'interswitch' | 'paystack' | 'firs',
          status: status === 'PAID' ? 'completed' : 'pending' as 'pending' | 'completed' | 'failed',
          rrr,
          transactionRef,
          paymentDate: status === 'PAID' ? new Date().toISOString() : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Use Admin SDK to create payment record
        const paymentRef = db.collection('taxPayments').doc()
        await paymentRef.set(taxPaymentData)
        const paymentId = paymentRef.id
        
        return NextResponse.json({
          success: true,
          paymentId,
          message: 'Payment confirmed and saved successfully'
        })
      } catch (error) {
        console.error('Error saving regular payment:', error)
        return NextResponse.json(
          { error: 'Failed to save payment', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        )
      }
    }

    // For filing payments, update the self-assessment report
    if (reportId && status === 'PAID') {
      try {
        const reportRef = db.collection('selfAssessments').doc(reportId)
        await reportRef.update({
          paymentStatus: 'paid',
          transactionRef,
          paymentDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      } catch (error) {
        console.error('Error updating report payment status:', error)
        // Continue even if update fails
      }
    }

    // Also save a basic payment record for filing payments
    if (paymentType === 'filing' && userId) {
      try {
        const taxPaymentData = {
          userId,
          entityId: resolvedEntityId,
          transactionId: transactionRef,
          amount,
          period: 'yearly' as 'monthly' | 'quarterly' | 'yearly',
          taxDuration: `Annual Return ${new Date().getFullYear()}`,
          paymentMethod: 'remitta' as 'remitta' | 'interswitch' | 'paystack' | 'firs',
          status: status === 'PAID' ? 'completed' : 'pending' as 'pending' | 'completed' | 'failed',
          rrr,
          transactionRef,
          paymentDate: status === 'PAID' ? new Date().toISOString() : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Use Admin SDK to create payment record
        const filingPaymentRef = db.collection('taxPayments').doc()
        await filingPaymentRef.set(taxPaymentData)
      } catch (error) {
        console.error('Error saving filing payment record:', error)
        // Continue even if this fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed successfully'
    })
  } catch (error) {
    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}

