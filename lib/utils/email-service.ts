/**
 * Unified Email Service
 * Supports both Resend (fast, recommended) and SMTP (fallback)
 */

import { Resend } from 'resend'
import { createTransporter } from './nodemailer'

// Initialize Resend if API key is available
let resend: Resend | null = null
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

export interface BulkEmailResult {
  success: boolean
  messageId?: string
  error?: string
  email?: string
}

/**
 * Send a single email using the best available service
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Try Resend first (faster and more reliable)
  if (resend && process.env.RESEND_API_KEY) {
    try {
      const fromEmail = options.from || process.env.RESEND_FROM || process.env.SMTP_FROM || 'noreply@otax.com'
      const recipients = Array.isArray(options.to) ? options.to : [options.to]
      
      // Resend supports batch sending
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
        reply_to: options.replyTo,
        tags: options.tags?.map(tag => ({ name: tag.name, value: tag.value }))
      })

      if (error) {
        console.error('Resend error:', error)
        throw new Error(error.message || 'Failed to send email via Resend')
      }

      return {
        success: true,
        messageId: data?.id
      }
    } catch (error: any) {
      console.error('Resend email failed, falling back to SMTP:', error.message)
      // Fall through to SMTP fallback
    }
  }

  // Fallback to SMTP (Nodemailer)
  const transporter = createTransporter()
  if (!transporter) {
    return {
      success: false,
      error: 'No email service configured. Please set RESEND_API_KEY or SMTP credentials.'
    }
  }

  try {
    const fromEmail = options.from || process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@otax.com'
    const recipients = Array.isArray(options.to) ? options.to.join(', ') : options.to

    const info = await transporter.sendMail({
      from: `"OTax" <${fromEmail}>`,
      to: recipients,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
      html: options.html,
      replyTo: options.replyTo
    })

    return {
      success: true,
      messageId: info.messageId
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send email'
    }
  }
}

/**
 * Send bulk emails in parallel batches for faster delivery
 * @param emails Array of email options
 * @param batchSize Number of emails to send in parallel (default: 10)
 * @returns Array of results for each email
 */
export async function sendBulkEmails(
  emails: EmailOptions[],
  batchSize: number = 10
): Promise<BulkEmailResult[]> {
  const results: BulkEmailResult[] = []
  
  // Process emails in batches to avoid overwhelming the service
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    
    // Send all emails in the batch in parallel
    const batchPromises = batch.map(async (emailOptions, index) => {
      const email = Array.isArray(emailOptions.to) ? emailOptions.to[0] : emailOptions.to
      
      try {
        const result = await sendEmail(emailOptions)
        return {
          success: result.success,
          messageId: result.messageId,
          error: result.error,
          email
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to send email',
          email
        }
      }
    })

    // Wait for all emails in the batch to complete
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // Small delay between batches to respect rate limits (only for SMTP)
    if (!resend && i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
    }
  }

  return results
}

/**
 * Check if Resend is configured
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!resend
}

/**
 * Get the active email service name
 */
export function getEmailServiceName(): string {
  if (isResendConfigured()) {
    return 'Resend'
  }
  if (process.env.SMTP_HOST) {
    return 'SMTP'
  }
  return 'None'
}

