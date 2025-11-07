import nodemailer from 'nodemailer'

/**
 * Create nodemailer transporter
 * Configure this with your SMTP settings
 */
export function createTransporter() {
  // Check if SMTP is configured
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.warn('⚠️ SMTP not configured. Email sending will fail.')
    console.warn('Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables.')
    return null
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    // For Gmail, you may need to enable "Less secure app access" or use App Password
    // For other providers, check their specific requirements
  })
}

/**
 * Verify transporter connection
 */
export async function verifyTransporter() {
  const transporter = createTransporter()
  if (!transporter) {
    return false
  }

  try {
    await transporter.verify()
    return true
  } catch (error) {
    console.error('SMTP connection verification failed:', error)
    return false
  }
}

