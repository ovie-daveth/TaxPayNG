import { NextRequest, NextResponse } from 'next/server'
import { createTransporter } from '@/lib/utils/nodemailer'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'
import { generateInvoicePDFBuffer } from '@/lib/utils/invoice-pdf'

async function getDecodedToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.replace('Bearer ', '')
    const adminAuth = getAdminAuth()
    const decodedToken = await adminAuth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await getDecodedToken(request)
    if (!decodedToken?.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { invoiceId, recipientEmail, senderUserId } = body

    if (!invoiceId || !recipientEmail || !senderUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, recipientEmail, senderUserId' },
        { status: 400 }
      )
    }

    // Verify sender matches authenticated user
    if (decodedToken.uid !== senderUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Get invoice using Admin SDK (bypasses security rules)
    const db = getAdminDb()
    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get()
    
    if (!invoiceDoc.exists) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    const invoiceData = invoiceDoc.data()
    if (!invoiceData) {
      return NextResponse.json(
        { error: 'Invoice data not found' },
        { status: 404 }
      )
    }

    // Convert Firestore timestamps to ISO strings
    const convertTimestamp = (value: any): string => {
      try {
        if (!value) return new Date().toISOString()
        if (typeof value === 'string') {
          // Validate it's a valid ISO string or date string
          const date = new Date(value)
          if (isNaN(date.getTime())) {
            return new Date().toISOString()
          }
          return date.toISOString()
        }
        if (value.toDate && typeof value.toDate === 'function') {
          const date = value.toDate()
          if (isNaN(date.getTime())) {
            return new Date().toISOString()
          }
          return date.toISOString()
        }
        if (value.seconds) {
          const date = new Date(value.seconds * 1000)
          if (isNaN(date.getTime())) {
            return new Date().toISOString()
          }
          return date.toISOString()
        }
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          return new Date().toISOString()
        }
        return date.toISOString()
      } catch (error) {
        console.error('Error converting timestamp:', error, value)
        return new Date().toISOString()
      }
    }

    // Helper to convert date value to string (handles both date strings and timestamps)
    const convertDateValue = (value: any, fallback?: string): string => {
      try {
        if (!value) {
          const fallbackDate = fallback || new Date().toISOString().split('T')[0]
          return fallbackDate
        }
        if (typeof value === 'string') {
          // Validate it's a valid date string (YYYY-MM-DD format)
          if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const date = new Date(value + 'T00:00:00')
            if (isNaN(date.getTime())) {
              return fallback || new Date().toISOString().split('T')[0]
            }
            return value
          }
          // Try parsing as ISO string
          const date = new Date(value)
          if (isNaN(date.getTime())) {
            return fallback || new Date().toISOString().split('T')[0]
          }
          return date.toISOString().split('T')[0]
        }
        // If it's a timestamp, convert to date string
        if (value.toDate && typeof value.toDate === 'function') {
          const date = value.toDate()
          if (isNaN(date.getTime())) {
            return fallback || new Date().toISOString().split('T')[0]
          }
          return date.toISOString().split('T')[0]
        }
        if (value.seconds) {
          const date = new Date(value.seconds * 1000)
          if (isNaN(date.getTime())) {
            return fallback || new Date().toISOString().split('T')[0]
          }
          return date.toISOString().split('T')[0]
        }
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          return fallback || new Date().toISOString().split('T')[0]
        }
        return date.toISOString().split('T')[0]
      } catch (error) {
        console.error('Error converting date value:', error, value)
        return fallback || new Date().toISOString().split('T')[0]
      }
    }

    const invoice = {
      id: invoiceDoc.id,
      ...invoiceData,
      createdAt: convertTimestamp(invoiceData.createdAt),
      updatedAt: convertTimestamp(invoiceData.updatedAt),
      issueDate: convertDateValue(invoiceData.issueDate, convertTimestamp(invoiceData.createdAt).split('T')[0]),
      dueDate: convertDateValue(invoiceData.dueDate, convertTimestamp(invoiceData.createdAt).split('T')[0]),
      ...(invoiceData.sentAt && { sentAt: convertTimestamp(invoiceData.sentAt) }),
      ...(invoiceData.receivedAt && { receivedAt: convertTimestamp(invoiceData.receivedAt) }),
    } as any

    // Verify sender owns the invoice
    if (invoice.userId !== senderUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get sender info
    const senderProfile = await db.collection('userProfiles')
      .where('userId', '==', senderUserId)
      .limit(1)
      .get()

    const sender = senderProfile.empty ? null : senderProfile.docs[0].data()
    const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Someone'

    // Create transporter
    const transporter = createTransporter()
    if (!transporter) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    // Generate signup link with invoice ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const signupLink = `${appUrl}/signup?invoiceId=${invoiceId}&email=${encodeURIComponent(recipientEmail)}`

    // Format currency amount
    const currencySymbol = invoice.currency === 'NGN' ? '₦' : invoice.currency === 'USD' ? '$' : invoice.currency === 'GBP' ? '£' : invoice.currency === 'EUR' ? '€' : invoice.currency
    const formattedAmount = `${currencySymbol}${invoice.invoiceTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    // Format due date - handle both date strings and Timestamp objects
    const formatDate = (dateValue: any): string => {
      if (!dateValue) return 'Not specified'
      try {
        let date: Date | null = null
        // Handle Firestore Timestamp object
        if (dateValue.toDate && typeof dateValue.toDate === 'function') {
          date = dateValue.toDate()
        } else if (dateValue.seconds) {
          date = new Date(dateValue.seconds * 1000)
        } else if (typeof dateValue === 'string') {
          // If it's a date string (YYYY-MM-DD), parse it properly
          if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = new Date(dateValue + 'T00:00:00')
          } else {
            date = new Date(dateValue)
          }
        } else if (dateValue instanceof Date) {
          date = dateValue
        }
        
        if (!date || isNaN(date.getTime())) {
          return 'Not specified'
        }
        
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      } catch (error) {
        console.error('Error formatting date:', error)
        return 'Not specified'
      }
    }
    
    const dueDate = formatDate(invoice.dueDate)

    // Create email content
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@otax.com'
    
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice ${invoice.invoiceNumber}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">OTax Invoice</h1>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
              <h2 style="margin-top: 0; color: #111827;">Invoice ${invoice.invoiceNumber}</h2>
              <p style="margin: 10px 0; font-size: 16px;">
                <strong>From:</strong> ${senderName}
              </p>
              <p style="margin: 10px 0; font-size: 16px;">
                <strong>Amount:</strong> ${formattedAmount}
              </p>
              <p style="margin: 10px 0; font-size: 16px;">
                <strong>Due Date:</strong> ${dueDate}
              </p>
            </div>

            <div style="margin-bottom: 30px;">
              <p style="font-size: 16px; color: #374151;">
                You have received an invoice from <strong>${senderName}</strong>.
              </p>
              <p style="font-size: 16px; color: #374151;">
                To view and manage this invoice, please create a free OTax account. It only takes a minute!
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${signupLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Create Account & View Invoice
              </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                If you already have an OTax account, you can log in and the invoice will be automatically linked to your account.
              </p>
            </div>

            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This email was sent from OTax. If you have any questions, please contact the sender directly.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© ${new Date().getFullYear()} OTax. All rights reserved.</p>
          </div>
        </body>
      </html>
    `

    const textTemplate = `
OTax Invoice

Invoice ${invoice.invoiceNumber}

From: ${senderName}
Amount: ${formattedAmount}
Due Date: ${dueDate}

You have received an invoice from ${senderName}.

To view and manage this invoice, please create a free OTax account. It only takes a minute!

Create Account & View Invoice: ${signupLink}

If you already have an OTax account, you can log in and the invoice will be automatically linked to your account.

This email was sent from OTax. If you have any questions, please contact the sender directly.

© ${new Date().getFullYear()} OTax. All rights reserved.
    `.trim()

    // Generate PDF attachment
    const pdfBuffer = generateInvoicePDFBuffer(invoice)
    const pdfFileName = `Invoice-${invoice.invoiceNumber}.pdf`

    // Send email with PDF attachment
    await transporter.sendMail({
      from: `"OTax" <${fromEmail}>`,
      to: recipientEmail,
      subject: `Invoice ${invoice.invoiceNumber} from ${senderName}`,
      text: textTemplate,
      html: htmlTemplate,
      attachments: [
        {
          filename: pdfFileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    })

    // Update invoice with recipient email (for tracking, even if they're not a user yet)
    // Use Admin SDK directly to bypass security rules (this is a server-side operation)
    const invoiceRef = db.collection('invoices').doc(invoiceId)
    await invoiceRef.update({
      recipientEmail: recipientEmail.toLowerCase(),
      sentAt: new Date().toISOString(),
      status: 'sent',
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `Invoice email sent successfully to ${recipientEmail}`
    })
  } catch (error: any) {
    console.error('Error sending invoice email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send invoice email' },
      { status: 500 }
    )
  }
}

