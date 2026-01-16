import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { sendEmail, getEmailServiceName } from '@/lib/utils/email-service'
import { buildUserEmail } from '@/lib/emails/user-templates'

function textToNiceHtml(text: string) {
  const lines = text.split('\n')
  const htmlLines: string[] = []
  let inList = false

  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    if (trimmed.startsWith('•')) {
      if (!inList) {
        inList = true
        htmlLines.push('<ul style="margin: 12px 0; padding-left: 18px;">')
      }
      htmlLines.push(`<li style="margin: 6px 0;">${escape(trimmed.replace(/^•\s*/, ''))}</li>`)
      continue
    }

    if (inList) {
      htmlLines.push('</ul>')
      inList = false
    }

    if (trimmed.length === 0) {
      htmlLines.push('<div style="height: 10px;"></div>')
    } else {
      htmlLines.push(`<p style="margin: 0 0 10px; line-height: 1.6; color: #111827;">${escape(trimmed)}</p>`)
    }
  }

  if (inList) htmlLines.push('</ul>')

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Welcome to OTax</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
        <div style="padding:20px 22px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);">
          <div style="color:#fff;font-weight:800;font-size:18px;letter-spacing:0.2px;">OTax</div>
          <div style="color:#ecfdf5;margin-top:6px;font-size:14px;">Welcome on board</div>
        </div>
        <div style="padding:22px;">
          ${htmlLines.join('\n')}
          <div style="margin-top:18px;padding-top:14px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.6;">
            If you didn’t create this account, you can ignore this email.
          </div>
        </div>
      </div>
      <div style="text-align:center;color:#9ca3af;font-size:12px;margin-top:12px;">
        © ${new Date().getFullYear()} OTax
      </div>
    </div>
  </body>
</html>
  `.trim()
}

/**
 * Send welcome email (idempotent) for the currently authenticated user.
 * Uses Admin SDK to read/write user profile and unified email service to send.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const adminAuth = getAdminAuth()
    const decoded = await adminAuth.verifyIdToken(token)
    const userId = decoded.uid

    const db = getAdminDb()
    const profileSnap = await db
      .collection('userProfiles')
      .where('userId', '==', userId)
      .limit(1)
      .get()

    if (profileSnap.empty) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 })
    }

    const profileDoc = profileSnap.docs[0]
    const profile = profileDoc.data() as any

    if (profile.welcomeEmailSentAt) {
      return NextResponse.json({
        success: true,
        alreadySent: true,
        sentAt: profile.welcomeEmailSentAt,
        service: getEmailServiceName()
      })
    }

    const userRecord = await adminAuth.getUser(userId)
    const email = (userRecord.email || profile.email || '').toLowerCase().trim()
    if (!email) {
      return NextResponse.json({ success: false, error: 'User email not found' }, { status: 400 })
    }

    const displayName = userRecord.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'there'
    const { subject, body } = buildUserEmail('welcome', {
      email,
      name: displayName,
      firstName: profile.firstName,
      lastName: profile.lastName
    })

    const html = textToNiceHtml(body)
    const sendResult = await sendEmail({
      to: email,
      subject,
      html,
      text: body,
      tags: [{ name: 'type', value: 'welcome' }]
    })

    if (!sendResult.success) {
      return NextResponse.json(
        { success: false, error: sendResult.error || 'Failed to send welcome email' },
        { status: 500 }
      )
    }

    const nowIso = new Date().toISOString()
    await profileDoc.ref.update({
      welcomeEmailSentAt: nowIso,
      updatedAt: nowIso
    })

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      service: getEmailServiceName(),
      sentAt: nowIso
    })
  } catch (error: any) {
    console.error('Error sending welcome email:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to send welcome email' },
      { status: 500 }
    )
  }
}


