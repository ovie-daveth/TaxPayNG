import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'
import { createTransporter } from '@/lib/utils/nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { email, name, businessType } = await request.json()

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase().trim()
    const trimmedName = name.toString().trim()
    const adminDb = getAdminDb()
    const adminAuth = getAdminAuth()

    // Check if user already exists in Firebase Auth
    try {
      await adminAuth.getUserByEmail(emailLower)
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in instead.' },
        { status: 400 }
      )
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        console.error('Firebase auth lookup error:', error)
        throw error
      }
    }

    // If email already verified previously, allow user to continue without resending
    const existingVerified = await adminDb.collection('signupVerifiedEmails').doc(emailLower).get()
    if (existingVerified.exists) {
      return NextResponse.json({
        success: true,
        email: emailLower,
        alreadyVerified: true,
        message: 'Email already verified',
      })
    }

    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString()

    await adminDb.collection('signupVerifications').doc(emailLower).set({
      name: trimmedName,
      email: emailLower,
      businessType: businessType || 'freelancer',
      verificationToken,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      attempts: 0,
    })

    const emailSent = await sendSignupVerificationEmail(emailLower, trimmedName, verificationToken)

    if (!emailSent) {
      // Check if we're in development mode - if so, the code was logged to console
      const isDevelopment = process.env.NODE_ENV === 'development'
      const errorMessage = isDevelopment
        ? 'Email sending failed, but verification code has been logged to the server console. Check your terminal for the code.'
        : 'Failed to send verification email. Please check your SMTP configuration and try again.'
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification token sent to your email',
      email: emailLower,
    })
  } catch (error: any) {
    console.error('Send signup verification error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send verification email' },
      { status: 500 }
    )
  }
}

async function sendSignupVerificationEmail(email: string, name: string, token: string): Promise<boolean> {
  try {
    const transporter = createTransporter()

    if (!transporter) {
      // SMTP not configured - log to console for development
      console.log(`\n📧 Signup Verification Email for ${email}`)
      console.log(`Hi ${name},`)
      console.log(`Your verification code is: ${token}`)
      console.log(`This code expires in 15 minutes.\n`)
      console.warn('⚠️ SMTP not configured. Please configure SMTP settings to send actual emails.')
      console.warn('   Add SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to your .env.local file.')
      console.warn('   See NODEMAILER_SETUP.md for instructions.\n')
      // Return true to allow development flow to continue
      return true
    }

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@otax.com'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://otax.com'

    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - OTax</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Verify Your Email</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${name},
              </p>
              <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                Thanks for creating an account with OTax! To continue, please verify your email address by entering the verification code below during signup:
              </p>
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
                If you didn't start this signup, you can safely ignore this email.
              </p>
            </td>
          </tr>
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

    const textTemplate = `
Hi ${name},

Thanks for creating an account with OTax! To continue, please verify your email address by entering the verification code below during signup:

Verification Code: ${token}

This code will expire in 15 minutes.

If you didn't start this signup, you can safely ignore this email.

© ${new Date().getFullYear()} OTax. All rights reserved.
Visit our website: ${appUrl}
    `.trim()

    try {
      const info = await transporter.sendMail({
        from: `"OTax" <${fromEmail}>`,
        to: email,
        subject: 'Verify Your Email - OTax Signup',
        text: textTemplate,
        html: htmlTemplate,
      })

      console.log('✅ Signup verification email sent successfully:', info.messageId)
      return true
    } catch (sendError: any) {
      // Log detailed error information
      console.error('❌ Signup email sending error:', sendError)
      console.error('Error details:', {
        message: sendError.message,
        code: sendError.code,
        command: sendError.command,
        response: sendError.response,
        responseCode: sendError.responseCode,
      })

      // Common error messages
      if (sendError.code === 'EAUTH') {
        console.error('❌ Authentication failed. Check your SMTP_USER and SMTP_PASS credentials.')
      } else if (sendError.code === 'ECONNECTION') {
        console.error('❌ Connection failed. Check your SMTP_HOST and SMTP_PORT settings.')
      } else if (sendError.code === 'ETIMEDOUT') {
        console.error('❌ Connection timeout. Check your network and SMTP settings.')
      }

      // Fallback: log to console for development
      console.log(`\n📧 Signup Verification Email for ${email} (Fallback - Email service failed)`)
      console.log(`Hi ${name},`)
      console.log(`Your verification code is: ${token}`)
      console.log(`This code expires in 15 minutes.\n`)
      console.warn('⚠️ Email sending failed. Check your SMTP configuration in .env.local')
      console.warn('   See NODEMAILER_SETUP.md for setup instructions.\n')

      // In development, allow flow to continue even if email fails
      // In production, you might want to return false here
      const isDevelopment = process.env.NODE_ENV === 'development'
      if (isDevelopment) {
        console.warn('⚠️ Development mode: Allowing signup to continue despite email failure.')
        return true
      }

      return false
    }
  } catch (error: any) {
    console.error('❌ Unexpected error in sendSignupVerificationEmail:', error)
    console.log(`\n📧 Signup Verification Email for ${email} (Fallback - Unexpected error)`)
    console.log(`Hi ${name},`)
    console.log(`Your verification code is: ${token}`)
    console.log(`This code expires in 15 minutes.\n`)

    // In development, allow flow to continue
    const isDevelopment = process.env.NODE_ENV === 'development'
    return isDevelopment
  }
}

