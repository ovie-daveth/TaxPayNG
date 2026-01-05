import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { invoiceService } from '@/lib/services'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, userId, email } = body

    if (!invoiceId || !userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, userId, email' },
        { status: 400 }
      )
    }

    // Get invoice
    const invoice = await invoiceService.getById(invoiceId)
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Check if email matches
    if (invoice.recipientEmail && invoice.recipientEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match invoice recipient' },
        { status: 403 }
      )
    }

    // Update invoice to link to user
    const db = getAdminDb()
    await db.collection('invoices').doc(invoiceId).update({
      recipientUserId: userId,
      recipientEmail: email.toLowerCase(),
      updatedAt: new Date().toISOString()
    })

    // Create notification for the user
    try {
      const senderProfile = await db.collection('userProfiles')
        .where('userId', '==', invoice.userId)
        .limit(1)
        .get()

      const sender = senderProfile.empty ? null : senderProfile.docs[0].data()
      const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Someone'

      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          type: 'invoice',
          title: `New invoice from ${senderName}`,
          message: `You have received invoice ${invoice.invoiceNumber} for ₦${invoice.invoiceTotal.toLocaleString()}`,
          link: `/dashboard/invoices?invoiceId=${invoiceId}`,
          metadata: {
            invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            senderId: invoice.userId,
            senderName,
            amount: invoice.invoiceTotal
          }
        })
      })
    } catch (error) {
      console.error('Error creating notification:', error)
      // Don't fail if notification creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice linked to user successfully'
    })
  } catch (error: any) {
    console.error('Error linking invoice to user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to link invoice to user' },
      { status: 500 }
    )
  }
}

