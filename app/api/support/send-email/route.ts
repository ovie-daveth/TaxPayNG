import { NextRequest, NextResponse } from 'next/server'
import { createTransporter } from '@/lib/utils/nodemailer'
import { getAdminAuth } from '@/lib/firebase-admin'

interface SupportEmailRequest {
  subject: string
  message: string
  category?: string
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    let decodedToken
    const adminAuth = getAdminAuth()
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid
    const userRecord = await adminAuth.getUser(userId)
    const userEmail = userRecord.email || 'Unknown'
    const userName = userRecord.displayName || userEmail.split('@')[0]

    const body: SupportEmailRequest = await request.json()
    const { subject, message, category } = body

    if (!subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Subject and message are required' },
        { status: 400 }
      )
    }

    // Get support email from environment or use default
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_USER || 'support@taxpayng.com'
    const transporter = createTransporter()

    if (!transporter) {
      return NextResponse.json(
        { success: false, error: 'Email service not configured. Please contact support directly.' },
        { status: 500 }
      )
    }

    // Format email content
    const emailSubject = `[Support Request] ${subject}`
    const emailBody = `
New Support Request from OTax User

User Information:
- Name: ${userName}
- Email: ${userEmail}
- User ID: ${userId}
${category ? `- Category: ${category}` : ''}

Subject: ${subject}

Message:
${message}

---
This email was sent from the OTax support form.
Reply directly to this email to respond to the user.
    `.trim()

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: supportEmail,
      replyTo: userEmail,
      subject: emailSubject,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
            New Support Request from OTax User
          </h2>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #555;">User Information</h3>
            <p><strong>Name:</strong> ${userName}</p>
            <p><strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>
            <p><strong>User ID:</strong> ${userId}</p>
            ${category ? `<p><strong>Category:</strong> ${category}</p>` : ''}
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #555;">Subject</h3>
            <p style="font-size: 18px; font-weight: bold; color: #333;">${subject}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #555;">Message</h3>
            <div style="background-color: #fff; padding: 15px; border-left: 4px solid #4F46E5; white-space: pre-wrap;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px;">
            <p>This email was sent from the OTax support form.</p>
            <p>Reply directly to this email to respond to the user.</p>
          </div>
        </div>
      `
    })

    return NextResponse.json({
      success: true,
      message: 'Support request sent successfully. We will get back to you soon!'
    })
  } catch (error) {
    console.error('Error sending support email:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send support request. Please try again or contact us directly.' 
      },
      { status: 500 }
    )
  }
}

