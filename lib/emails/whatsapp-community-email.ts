import { createTransporter } from '@/lib/utils/nodemailer'
import { WHATSAPP_COMMUNITY_LINK } from './waitlist-templates'

/**
 * Send WhatsApp community invitation email to a new waitlist member
 */
export async function sendWhatsAppCommunityEmail(
  email: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createTransporter()
    
    if (!transporter) {
      console.warn('⚠️ SMTP not configured. WhatsApp community email will not be sent.')
      console.log(`\n📧 WhatsApp Community Email for ${email} (Fallback - SMTP not configured)`)
      console.log(`Hi ${name},`)
      console.log(`Thank you for joining the OTax waitlist!`)
      console.log(`Join our WhatsApp community: ${WHATSAPP_COMMUNITY_LINK}\n`)
      return { success: false, error: "Email service not configured" }
    }

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@otax.com'
    const displayName = name?.trim() || "there"

    const subject = "Join the OTax WhatsApp Community 👥"
    
    const textBody = `Hi ${displayName}

Thank you for joining the OTax waitlist! We're excited to have you on this journey as we build Nigeria's first smart tax management platform for freelancers, business owners, and creators.

To help you get early access to updates, ask questions, share challenges, and connect with others like you, we've created a dedicated WhatsApp Community.

This group will allow you to:

• Get early announcements before public release

• Ask tax and business compliance questions

• Share feedback to help us improve OTax

• Learn how new tax rules affect you

• Engage directly with the OTax team

👉 Click here to join the WhatsApp group:

${WHATSAPP_COMMUNITY_LINK}

Whether you're trying to figure out PAYE, VAT, filing, deductions, or just want a stress-free way to manage taxes when we launch, the community will benefit you.

We look forward to seeing you inside!

Warm regards,

The OTax Team

OTax Digital Services Ltd`

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Join the OTax Community 👥</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${displayName},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Thank you for joining the OTax waitlist! We're excited to have you on this journey as we build Nigeria's first smart tax management platform for freelancers, business owners, and creators.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      To help you get early access to updates, ask questions, share challenges, and connect with others like you, we've created a dedicated WhatsApp Community.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 15px; font-weight: 600;">This group will allow you to:</p>
    
    <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px;">
      <li style="margin-bottom: 8px;">Get early announcements before public release</li>
      <li style="margin-bottom: 8px;">Ask tax and business compliance questions</li>
      <li style="margin-bottom: 8px;">Share feedback to help us improve OTax</li>
      <li style="margin-bottom: 8px;">Learn how new tax rules affect you</li>
      <li style="margin-bottom: 8px;">Engage directly with the OTax team</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${WHATSAPP_COMMUNITY_LINK}" 
         style="display: inline-block; background: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        👉 Join WhatsApp Community
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 20px; text-align: center;">
      <a href="${WHATSAPP_COMMUNITY_LINK}" style="color: #25D366; word-break: break-all;">${WHATSAPP_COMMUNITY_LINK}</a>
    </p>
    
    <p style="font-size: 16px; margin-top: 30px; margin-bottom: 20px;">
      Whether you're trying to figure out PAYE, VAT, filing, deductions, or just want a stress-free way to manage taxes when we launch, the community will benefit you.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 5px;">We look forward to seeing you inside!</p>
    
    <p style="font-size: 16px; margin-top: 30px;">
      Warm regards,<br>
      <strong>The OTax Team</strong><br>
      <span style="color: #666; font-size: 14px;">OTax Digital Services Ltd</span>
    </p>
  </div>
</body>
</html>`

    // Verify connection first
    try {
      await transporter.verify()
      console.log('✅ SMTP connection verified successfully for WhatsApp email')
    } catch (verifyError: any) {
      console.error('❌ SMTP connection verification failed:', verifyError.message)
      // Continue anyway - might work despite verification failure
    }

    // Send email
    const info = await transporter.sendMail({
      from: `"OTax" <${fromEmail}>`,
      to: email,
      subject: subject,
      text: textBody,
      html: htmlBody,
    })

    console.log('✅ WhatsApp community email sent successfully:', info.messageId)
    console.log('   To:', email)
    return { success: true }
  } catch (error: any) {
    console.error('❌ WhatsApp community email sending error:', error)
    console.log(`\n📧 WhatsApp Community Email for ${email} (Fallback - Email service failed)`)
    console.log(`Hi ${name},`)
    console.log(`Thank you for joining the OTax waitlist!`)
    console.log(`Join our WhatsApp community: ${WHATSAPP_COMMUNITY_LINK}\n`)
    return { success: false, error: error.message || "Failed to send WhatsApp community email" }
  }
}

