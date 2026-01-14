import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { payrollService } from '@/lib/services/payrollService'
import { generatePayrollSlipPDF } from '@/lib/utils/payroll-pdf'
import { sendEmail } from '@/lib/utils/email-service'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const auth = getAuth()
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid

    const body = await request.json()
    const { payrollId, employeeIds } = body

    if (!payrollId) {
      return NextResponse.json(
        { success: false, error: 'Payroll ID is required' },
        { status: 400 }
      )
    }

    // Get payroll
    const payroll = await payrollService.getPayroll(payrollId, userId)
    if (!payroll) {
      return NextResponse.json(
        { success: false, error: 'Payroll not found' },
        { status: 404 }
      )
    }

    // Get user profile for company name
    const db = getAdminDb()
    const userProfileDoc = await db.collection('userProfiles').doc(userId).get()
    const userProfile = userProfileDoc.data()
    const companyName = userProfile?.businessName || userProfile?.name || 'Your Company'

    // Filter items if specific employees are selected
    const itemsToSend = employeeIds && employeeIds.length > 0
      ? payroll.items.filter(item => employeeIds.includes(item.employeeId))
      : payroll.items

    if (itemsToSend.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No employees selected' },
        { status: 400 }
      )
    }

    // Send emails
    const results: Array<{ employeeId: string; email?: string; success: boolean; error?: string }> = []
    let emailsSent = 0
    let emailsFailed = 0

    for (const item of itemsToSend) {
      if (!item.employeeEmail) {
        results.push({
          employeeId: item.employeeId,
          success: false,
          error: 'Employee email not found'
        })
        emailsFailed++
        continue
      }

      try {
        // Generate PDF
        const pdf = generatePayrollSlipPDF(payroll, item)
        const pdfBlob = pdf.output('blob')
        const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

        // Create email content
        const emailSubject = `Your Payroll Slip - ${payroll.period}`
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Payroll Slip</h2>
            <p>Dear ${item.employeeName},</p>
            <p>Please find attached your payroll slip for the period <strong>${payroll.period}</strong>.</p>
            <p><strong>Net Salary:</strong> ₦${item.netSalary.toLocaleString('en-NG')}</p>
            <p>If you have any questions, please contact your HR department.</p>
            <p>Best regards,<br>${companyName}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              This is an automated email from OTax. Please do not reply to this email.
            </p>
          </div>
        `

        // Send email with PDF attachment using nodemailer
        const { createTransporter } = await import('@/lib/utils/nodemailer')
        
        const transporter = createTransporter()
        if (!transporter) {
          throw new Error('Email service not configured')
        }

        const fromEmail = process.env.RESEND_FROM || process.env.SMTP_FROM || 'noreply@otax.com'

        await transporter.sendMail({
          from: `"${companyName}" <${fromEmail}>`,
          to: item.employeeEmail,
          subject: emailSubject,
          html: emailBody,
          attachments: [
            {
              filename: `Payroll-Slip-${item.employeeName.replace(/\s+/g, '-')}-${payroll.period.replace(/\s+/g, '-')}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        })

        results.push({
          employeeId: item.employeeId,
          email: item.employeeEmail,
          success: true
        })
        emailsSent++
      } catch (error: any) {
        console.error(`Error sending email to ${item.employeeEmail}:`, error)
        results.push({
          employeeId: item.employeeId,
          email: item.employeeEmail,
          success: false,
          error: error.message || 'Failed to send email'
        })
        emailsFailed++
      }
    }

    // Update payroll with email status
    await db.collection('payrolls').doc(payrollId).update({
      emailsSent: (payroll.emailsSent || 0) + emailsSent,
      emailsFailed: (payroll.emailsFailed || 0) + emailsFailed,
      status: emailsSent > 0 ? 'sent' : payroll.status,
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: {
        emailsSent,
        emailsFailed,
        results
      }
    })
  } catch (error: any) {
    console.error('Error sending payroll emails:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send payroll emails' },
      { status: 500 }
    )
  }
}

