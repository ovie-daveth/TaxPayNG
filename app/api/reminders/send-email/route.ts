import { NextRequest, NextResponse } from 'next/server'
import { sendReminderEmail } from '@/lib/utils/reminder-email'

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

    const result = await sendReminderEmail({
      reminderId,
      userId,
      userEmail,
      userName,
      reminderTitle,
      reminderDescription,
      dueDate,
      priority
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send reminder email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder email sent successfully',
      messageId: result.messageId
    })
  } catch (error: any) {
    console.error('❌ Error sending reminder email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send reminder email' },
      { status: 500 }
    )
  }
}

