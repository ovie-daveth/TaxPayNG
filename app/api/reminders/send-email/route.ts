import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { createTransporter } from '@/lib/utils/nodemailer'

/**
 * Send reminder email to user
 * POST /api/reminders/send-email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reminderId, userId, userEmail, userName, reminderTitle, reminderDescription, dueDate, priority } = body

    if (!reminderId || !userId || !userEmail || !reminderTitle || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const transporter = createTransporter()
    if (!transporter) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    // Format due date
    let formattedDate: string
    try {
      const dueDateObj = new Date(dueDate)
      if (isNaN(dueDateObj.getTime())) {
        throw new Error('Invalid date')
      }
      formattedDate = dueDateObj.toLocaleDateString('en-NG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (dateError) {
      // Fallback to ISO string if formatting fails
      formattedDate = typeof dueDate === 'string' ? dueDate : new Date().toISOString()
      console.warn('⚠️ Could not format due date, using fallback:', dueDate)
    }

    // Priority emoji
    const priorityEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🔴'
    }

    // Email template
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reminder: ${reminderTitle}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📅 Reminder</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0; font-size: 20px;">${reminderTitle}</h2>
            
            ${reminderDescription ? `<p style="color: #666; font-size: 16px; margin: 20px 0;">${reminderDescription}</p>` : ''}
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0; font-size: 14px; color: #666;">
                <strong style="color: #333;">Due Date:</strong> ${formattedDate}
              </p>
              <p style="margin: 10px 0; font-size: 14px; color: #666;">
                <strong style="color: #333;">Priority:</strong> ${priorityEmoji[priority as keyof typeof priorityEmoji] || '🟡'} ${priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Medium'}
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                This is an automated reminder from OTax. Please take action before the due date.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} OTax. All rights reserved.</p>
          </div>
        </body>
      </html>
    `

    const textTemplate = `
Reminder: ${reminderTitle}

${reminderDescription ? `${reminderDescription}\n\n` : ''}Due Date: ${formattedDate}
Priority: ${priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Medium'}

This is an automated reminder from OTax. Please take action before the due date.
    `.trim()

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@otax.com'

    // Send email
    const info = await transporter.sendMail({
      from: `"OTax Reminders" <${fromEmail}>`,
      to: userEmail,
      subject: `Reminder: ${reminderTitle}`,
      text: textTemplate,
      html: htmlTemplate,
    })

    console.log('✅ Reminder email sent successfully:', info.messageId)

    // Update reminder to mark email as sent
    const db = getAdminDb()
    await db.collection('reminders').doc(reminderId).update({
      emailSent: true,
      emailSentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Reminder email sent successfully',
      messageId: info.messageId
    })
  } catch (error: any) {
    console.error('❌ Error sending reminder email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send reminder email' },
      { status: 500 }
    )
  }
}

