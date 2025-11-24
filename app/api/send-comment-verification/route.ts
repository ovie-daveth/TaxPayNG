import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { createTransporter } from '@/lib/utils/nodemailer'

/**
 * Send verification email for blog comment
 * Used when user's email is not found in existing blogComments
 */
export async function POST(request: NextRequest) {
  try {
    const { email, name, comment, blogId } = await request.json()

    if (!email || !name || !comment || !blogId) {
      return NextResponse.json(
        { error: 'Email, name, comment, and blogId are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase().trim()
    const adminDb = getAdminDb()

    // Generate 6-digit verification token
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString()

    // Store pending comment verification
    await adminDb.collection('commentVerifications').doc(emailLower).set({
      name: name.trim(),
      email: emailLower,
      comment: comment.trim(),
      blogId: blogId.toString(),
      verificationToken,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      attempts: 0
    })

    // Send verification email
    const emailResult = await sendCommentVerificationEmail(emailLower, name.trim(), verificationToken)

    if (!emailResult.success) {
      // If SMTP not configured, still return success but include the token for development
      if (emailResult.smtpNotConfigured) {
        console.warn('⚠️ SMTP not configured - returning token for development')
        return NextResponse.json({
          success: true,
          message: 'Verification token (SMTP not configured - check console)',
          email: emailLower,
          token: verificationToken, // Include token in response for development
          smtpNotConfigured: true
        })
      }
      
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification token sent to your email',
      email: emailLower
    })

  } catch (error: any) {
    console.error('Send comment verification error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send verification email' },
      { status: 500 }
    )
  }
}

/**
 * Send verification email with token using nodemailer
 */
async function sendCommentVerificationEmail(
  email: string, 
  name: string, 
  token: string
): Promise<{ success: boolean; error?: string; smtpNotConfigured?: boolean }> {
  try {
    const transporter = createTransporter()
    
    if (!transporter) {
      // Fallback to console log if SMTP not configured
      console.log(`\n📧 Comment Verification Email for ${email}`)
      console.log(`Hi ${name},`)
      console.log(`Your verification code is: ${token}`)
      console.log(`This code expires in 15 minutes.\n`)
      console.warn('⚠️ SMTP not configured. Please configure SMTP settings to send actual emails.')
      console.warn('Add these to your .env.local file:')
      console.warn('  SMTP_HOST=smtp.gmail.com')
      console.warn('  SMTP_PORT=587')
      console.warn('  SMTP_USER=your_email@gmail.com')
      console.warn('  SMTP_PASS=your_app_password')
      return { 
        success: false, 
        smtpNotConfigured: true,
        error: 'SMTP not configured. Check server console for verification code.'
      }
    }

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@otax.com'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://otax.com'

    // Create HTML email template
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - OTax Blog Comment</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Verify Your Email</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${name},
              </p>
              
              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                To post your comment, please verify your email address by entering the verification code below:
              </p>
              
              <!-- Verification Code Box -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <div style="display: inline-block; background-color: #f3f4f6; border: 2px dashed #10b981; border-radius: 12px; padding: 30px 40px;">
                      <div style="font-size: 36px; font-weight: 700; color: #10b981; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        ${token}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                ⏰ This code will expire in <strong>15 minutes</strong>.
              </p>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px;">
                © ${new Date().getFullYear()} OTax. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                <a href="${appUrl}" style="color: #10b981; text-decoration: none;">Visit our website</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    // Plain text version
    const textTemplate = `
Hi ${name},

To post your comment, please verify your email address by entering the verification code below:

Verification Code: ${token}

This code will expire in 15 minutes.

If you didn't request this code, you can safely ignore this email.

© ${new Date().getFullYear()} OTax. All rights reserved.
Visit our website: ${appUrl}
    `.trim()

    // Send email
    const info = await transporter.sendMail({
      from: `"OTax" <${fromEmail}>`,
      to: email,
      subject: 'Verify Your Email - OTax Blog Comment',
      text: textTemplate,
      html: htmlTemplate,
    })

    console.log('✅ Comment verification email sent successfully:', info.messageId)
    console.log('   To:', email)
    console.log('   Message ID:', info.messageId)
    return { success: true }
  } catch (error: any) {
    console.error('❌ Email sending error:', error)
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    })
    
    // Fallback to console log if email fails
    console.log(`\n📧 Comment Verification Email for ${email} (Fallback - Email service failed)`)
    console.log(`Hi ${name},`)
    console.log(`Your verification code is: ${token}`)
    console.log(`This code expires in 15 minutes.\n`)
    
    // Return error details
    return { 
      success: false, 
      error: error.message || 'Failed to send email. Check server logs for details.'
    }
  }
}

