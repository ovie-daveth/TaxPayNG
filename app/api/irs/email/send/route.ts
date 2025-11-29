import { NextRequest, NextResponse } from 'next/server'
import { createTransporter } from '@/lib/utils/nodemailer'
import { reportService } from '@/lib/services'
import { getAdminDb } from '@/lib/firebase-admin'

// State IRS email addresses (mock - in production, use actual IRS emails)
const STATE_IRS_EMAILS: Record<string, string> = {
  "Lagos": "irs@lirs.gov.ng",
  "FCT": "irs@fctirs.gov.ng",
  "Rivers": "irs@rirs.gov.ng",
  "Kano": "irs@kano-irs.gov.ng",
  "Ogun": "irs@ogirs.gov.ng",
  "Oyo": "irs@oyirs.gov.ng",
  "Delta": "irs@deltairs.gov.ng",
  "Kaduna": "irs@kadirs.gov.ng",
  "Enugu": "irs@enirs.gov.ng",
  "Anambra": "irs@anirs.gov.ng",
  "Other": process.env.SMTP_USER || "irs@taxpayng.com"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { state, reportId, rrr, userInfo } = body

    if (!state || !reportId || !rrr || !userInfo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get report data
    const report = await reportService.getReportById(reportId, 'Self-Assessment')
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    const irsEmail = STATE_IRS_EMAILS[state] || STATE_IRS_EMAILS["Other"]
    const transporter = createTransporter()

    if (!transporter) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    // Generate email content
    const emailSubject = `Tax Return Submission - ${userInfo.name} - ${report.reportData.period.year}`
    const emailBody = `
Dear ${state} IRS,

Please find attached the annual tax return for:

Taxpayer Name: ${userInfo.name}
TIN: ${userInfo.tin}
Email: ${userInfo.email}
Tax Year: ${report.reportData.period.year}
RRR: ${rrr}

Attachments:
- Annual Tax Return PDF
- Payment Receipt (RRR: ${rrr})
- Supporting Documents

This submission is made through OTax platform.

Best regards,
OTax Team
    `

    // TODO: Attach PDF files (report PDF, receipt PDF, supporting documents)
    // For now, send email without attachments (in production, generate and attach PDFs)

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: irsEmail,
      cc: userInfo.email,
      subject: emailSubject,
      text: emailBody,
      html: emailBody.replace(/\n/g, '<br>')
    })

    // Update self-assessment report with filing status using Admin SDK
    try {
      const db = getAdminDb()
      const reportRef = db.collection('selfAssessments').doc(reportId)
      await reportRef.update({
        filingStatus: 'submitted',
        filingMethod: 'email',
        status: 'completed',
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating report status:', error)
      // Continue even if update fails
    }

    return NextResponse.json({
      success: true,
      message: `Tax return sent to ${state} IRS via email`
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

