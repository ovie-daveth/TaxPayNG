import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getAdminDb } from '@/lib/firebase-admin'
import { payrollService } from '@/lib/services/payrollService'
import { format } from 'date-fns'

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
    const filteredItems = employeeIds && employeeIds.length > 0
      ? payroll.items.filter(item => employeeIds.includes(item.employeeId))
      : payroll.items

    // IMPORTANT: Yearly payrolls include 12 monthly items per employee.
    // We should send ONE email per employee (not 12).
    // We pick the latest monthly item per employee for the attachment, so the email count matches employee count.
    const itemsToSend = Array.from(
      filteredItems.reduce((map, item) => {
        const existing = map.get(item.employeeId)
        // Prefer the item with the latest monthlyPeriodStart if available
        const existingDate = existing?.monthlyPeriodStart ? new Date(existing.monthlyPeriodStart).getTime() : 0
        const itemDate = item.monthlyPeriodStart ? new Date(item.monthlyPeriodStart).getTime() : 0
        if (!existing || itemDate > existingDate) {
          map.set(item.employeeId, item)
        }
        return map
      }, new Map<string, any>())
    ).map(([, v]) => v)

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

    const formatCurrency = (amount: number) => {
      // Use the naira sign in HTML (renders correctly in email clients).
      return `₦${Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const buildSlipHtml = (item: any) => {
      const periodLabel = item.monthlyPeriod || payroll.period
      const totalDeductions =
        (item.paye?.amount || 0) +
        (item.pension?.employee || 0) +
        (item.nhf?.amount || 0) +
        (item.nhis?.amount || 0) +
        (item.otherDeductions || []).reduce((s: number, d: any) => s + (d?.amount || 0), 0)

      return `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Salary Breakdown - ${item.employeeName}</title>
            <style>
              body { font-family: Arial, Helvetica, sans-serif; color: #111827; background: #ffffff; margin: 0; padding: 0; }
              .container { max-width: 720px; margin: 0 auto; padding: 20px; }
              .header { display:flex; justify-content: space-between; align-items:flex-start; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
              .title { font-size: 20px; font-weight: 700; margin: 0; }
              .subtitle { font-size: 12px; color: #6b7280; margin: 4px 0 0; }
              .meta { font-size: 12px; color: #374151; text-align: right; }
              .card { background:#f9fafb; border:1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 14px; }
              .section-title { font-size: 14px; font-weight: 700; margin: 0 0 10px; }
              .row { display:flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
              .row:last-child { border-bottom: 0; }
              .label { color: #6b7280; }
              .value { font-weight: 600; text-align: right; }
              .total { border-top: 2px solid #111827; padding-top: 10px; margin-top: 8px; font-size: 13px; }
              .pill { display:inline-block; background:#e5e7eb; color:#111827; font-size: 11px; padding: 2px 8px; border-radius: 999px; }
              .foot { font-size: 11px; color:#6b7280; margin-top: 16px; }
              .grid { display:grid; grid-template-columns: 1fr; gap: 12px; }
              @media (min-width: 640px) { .grid { grid-template-columns: 1fr 1fr; } }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div>
                  <h1 class="title">Salary Breakdown</h1>
                  <p class="subtitle">${companyName} • ${periodLabel}</p>
                </div>
                <div class="meta">
                  <div class="pill">${item.employeeNumber || 'Employee'}</div>
                  <div style="margin-top:6px;">Generated: ${format(new Date(), 'MMM dd, yyyy')}</div>
                </div>
              </div>

              <div class="card">
                <div class="section-title">Employee</div>
                <div class="row"><div class="label">Name</div><div class="value">${item.employeeName}</div></div>
                <div class="row"><div class="label">Email</div><div class="value">${item.employeeEmail || '—'}</div></div>
                <div class="row"><div class="label">TIN</div><div class="value">${item.taxId || '—'}</div></div>
              </div>

              <div class="grid">
                <div class="card">
                  <div class="section-title">Earnings</div>
                  <div class="row"><div class="label">Basic Salary</div><div class="value">${formatCurrency(item.basicSalary)}</div></div>
                  ${(item.allowances || []).map((a: any) => `
                    <div class="row"><div class="label">${a.name}${a.taxable === false ? ' <span class="pill">Non‑taxable</span>' : ''}</div><div class="value">${formatCurrency(a.amount)}</div></div>
                  `).join('')}
                  <div class="row total"><div class="label">Gross Salary</div><div class="value">${formatCurrency(item.grossSalary)}</div></div>
                </div>

                <div class="card">
                  <div class="section-title">Deductions</div>
                  <div class="row"><div class="label">PAYE</div><div class="value">${formatCurrency(item.paye?.amount || 0)}</div></div>
                  <div class="row"><div class="label">Pension (Employee)</div><div class="value">${formatCurrency(item.pension?.employee || 0)}</div></div>
                  ${item.nhf ? `<div class="row"><div class="label">NHF</div><div class="value">${formatCurrency(item.nhf.amount)}</div></div>` : ''}
                  ${item.nhis ? `<div class="row"><div class="label">NHIS</div><div class="value">${formatCurrency(item.nhis.amount)}</div></div>` : ''}
                  ${(item.otherDeductions || []).map((d: any) => `
                    <div class="row"><div class="label">${d.name}</div><div class="value">${formatCurrency(d.amount)}</div></div>
                  `).join('')}
                  <div class="row total"><div class="label">Total Deductions</div><div class="value">${formatCurrency(totalDeductions)}</div></div>
                </div>
              </div>

              <div class="card">
                <div class="section-title">Net Salary</div>
                <div class="row total"><div class="label">Net Pay</div><div class="value">${formatCurrency(item.netSalary)}</div></div>
              </div>

              <div class="foot">
                This is an automated message from OTax. If you have any questions, please contact your HR department.
              </div>
            </div>
          </body>
        </html>
      `.trim()
    }

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
        const slipHtml = buildSlipHtml(item)
        const periodLabel = (item as any).monthlyPeriod || payroll.period
        const emailSubject = `Salary Breakdown - ${periodLabel}`
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto;">
            <p>Dear ${item.employeeName},</p>
            <p>Please find your salary breakdown for <strong>${periodLabel}</strong> below. You can also download the attached HTML and print it.</p>
          </div>
          ${slipHtml}
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
              filename: `Salary-Breakdown-${item.employeeName.replace(/\s+/g, '-')}-${periodLabel.replace(/\s+/g, '-')}.html`,
              content: Buffer.from(slipHtml, 'utf-8'),
              contentType: 'text/html; charset=utf-8'
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

