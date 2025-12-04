import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { createTransporter } from '@/lib/utils/nodemailer'
import { ReportData } from '@/lib/services/reportService'

const auth = getAdminAuth()

async function getDecodedToken(request: NextRequest) {
  const cookies = request.headers.get("cookie") || ""
  const sessionCookie = cookies.match(/session=([^;]+)/)?.[1]

  if (sessionCookie) {
    return auth.verifySessionCookie(sessionCookie, true)
  }

  const bearer = request.headers.get("authorization")
  const token = bearer?.startsWith("Bearer ") ? bearer.substring(7) : undefined

  if (!token) {
    return null
  }

  return auth.verifyIdToken(token, true)
}

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await getDecodedToken(request)
    if (!decodedToken?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { reportData, periodLabel } = body as {
      reportData: ReportData
      periodLabel: string
    }

    if (!reportData) {
      return NextResponse.json(
        { error: "Report data is required" },
        { status: 400 }
      )
    }

    const transporter = createTransporter()
    if (!transporter) {
      return NextResponse.json(
        { error: "Email service not configured. Please set SMTP credentials." },
        { status: 500 }
      )
    }

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@otax.com'
    const userEmail = decodedToken.email || 'taxpayer@example.com'
    const userName = reportData.userInfo.name || 'Taxpayer'

    // Generate PDF content as HTML (for email attachment, we'll send a summary)
    // In production, you might want to generate actual PDF and attach it
    const taxReturnSummary = `
SELF-ASSESSMENT TAX RETURN
${periodLabel}

TAXPAYER INFORMATION:
- Full Name: ${reportData.userInfo.name}
- Tax Identification Number: ${reportData.userInfo.tin || 'N/A'}
- Business Name: ${reportData.userInfo.businessName || 'N/A'}
- Business Type: ${reportData.userInfo.businessType || 'N/A'}
${reportData.userInfo.address ? `- Business Address: ${reportData.userInfo.address}` : ''}

INCOME SUMMARY:
- Gross Income: ₦${reportData.tax.grossIncome.toLocaleString()}
- Business Expenses: -₦${reportData.expenses.totalExpenses.toLocaleString()}
- Net Income: ₦${reportData.tax.netIncome.toLocaleString()}

RELIEFS AND DEDUCTIONS:
- Pension Contribution: -₦${reportData.tax.reliefs.pensionContribution.toLocaleString()}
- NHF Contribution: -₦${reportData.tax.reliefs.nhfContribution.toLocaleString()}
- Health Insurance: -₦${reportData.tax.reliefs.healthInsurance.toLocaleString()}
- Life Insurance: -₦${reportData.tax.reliefs.lifeInsurance.toLocaleString()}
- Charitable Donations: -₦${reportData.tax.reliefs.charitableDonations.toLocaleString()}
- Total Reliefs: -₦${reportData.tax.totalReliefs.toLocaleString()}

TAX CALCULATION:
- Taxable Income: ₦${reportData.tax.taxableIncome.toLocaleString()}
${reportData.tax.taxBrackets.map((bracket, index) => 
  `- ${bracket.amount.toLocaleString()} @ ${bracket.rate}%: ₦${bracket.tax.toLocaleString()}`
).join('\n')}
- Total Tax Payable: ₦${reportData.tax.taxPayable.toLocaleString()}

DECLARATION:
I declare that the information provided in this return is true, correct and complete to the best of my knowledge and belief.

Generated on: ${new Date(reportData.generatedAt).toLocaleDateString()}
    `.trim()

    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #059669;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #059669;
      margin: 0;
      font-size: 24px;
    }
    .section {
      margin-bottom: 25px;
      padding: 15px;
      background: #f9fafb;
      border-left: 4px solid #059669;
    }
    .section-title {
      font-weight: bold;
      color: #059669;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .info-row {
      margin: 8px 0;
      padding: 5px 0;
      border-bottom: 1px dotted #e5e7eb;
    }
    .label {
      font-weight: 600;
      color: #6b7280;
    }
    .value {
      color: #111827;
    }
    .amount {
      font-weight: bold;
      color: #059669;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    pre {
      white-space: pre-wrap;
      font-family: Arial, sans-serif;
      background: #f3f4f6;
      padding: 15px;
      border-radius: 5px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>SELF-ASSESSMENT TAX RETURN</h1>
    <p>Federal Inland Revenue Service (FIRS) / Lagos Internal Revenue Service (LIRS)</p>
    <p><strong>Tax Year: ${periodLabel}</strong></p>
  </div>

  <div class="section">
    <div class="section-title">Taxpayer Information</div>
    <div class="info-row">
      <span class="label">Full Name:</span>
      <span class="value">${reportData.userInfo.name}</span>
    </div>
    <div class="info-row">
      <span class="label">Tax Identification Number:</span>
      <span class="value">${reportData.userInfo.tin || 'N/A'}</span>
    </div>
    <div class="info-row">
      <span class="label">Business Name:</span>
      <span class="value">${reportData.userInfo.businessName || 'N/A'}</span>
    </div>
    <div class="info-row">
      <span class="label">Business Type:</span>
      <span class="value">${reportData.userInfo.businessType || 'N/A'}</span>
    </div>
    ${reportData.userInfo.address ? `
    <div class="info-row">
      <span class="label">Business Address:</span>
      <span class="value">${reportData.userInfo.address}</span>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">Income Summary</div>
    <div class="info-row">
      <span class="label">Gross Income:</span>
      <span class="amount">₦${reportData.tax.grossIncome.toLocaleString()}</span>
    </div>
    <div class="info-row">
      <span class="label">Business Expenses:</span>
      <span class="amount" style="color: #dc2626;">-₦${reportData.expenses.totalExpenses.toLocaleString()}</span>
    </div>
    <div class="info-row">
      <span class="label">Net Income:</span>
      <span class="amount">₦${reportData.tax.netIncome.toLocaleString()}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Reliefs and Deductions</div>
    ${reportData.tax.reliefs.pensionContribution > 0 ? `
    <div class="info-row">
      <span class="label">Pension Contribution:</span>
      <span class="amount" style="color: #059669;">-₦${reportData.tax.reliefs.pensionContribution.toLocaleString()}</span>
    </div>
    ` : ''}
    ${reportData.tax.reliefs.nhfContribution > 0 ? `
    <div class="info-row">
      <span class="label">NHF Contribution:</span>
      <span class="amount" style="color: #059669;">-₦${reportData.tax.reliefs.nhfContribution.toLocaleString()}</span>
    </div>
    ` : ''}
    ${reportData.tax.reliefs.healthInsurance > 0 ? `
    <div class="info-row">
      <span class="label">Health Insurance (NHIS):</span>
      <span class="amount" style="color: #059669;">-₦${reportData.tax.reliefs.healthInsurance.toLocaleString()}</span>
    </div>
    ` : ''}
    ${reportData.tax.reliefs.lifeInsurance > 0 ? `
    <div class="info-row">
      <span class="label">Life Insurance:</span>
      <span class="amount" style="color: #059669;">-₦${reportData.tax.reliefs.lifeInsurance.toLocaleString()}</span>
    </div>
    ` : ''}
    ${reportData.tax.reliefs.charitableDonations > 0 ? `
    <div class="info-row">
      <span class="label">Charitable Donations:</span>
      <span class="amount" style="color: #059669;">-₦${reportData.tax.reliefs.charitableDonations.toLocaleString()}</span>
    </div>
    ` : ''}
    <div class="info-row">
      <span class="label">Total Reliefs:</span>
      <span class="amount" style="color: #059669;">-₦${reportData.tax.totalReliefs.toLocaleString()}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Tax Calculation</div>
    <div class="info-row">
      <span class="label">Taxable Income:</span>
      <span class="amount">₦${reportData.tax.taxableIncome.toLocaleString()}</span>
    </div>
    ${reportData.tax.taxBrackets.map((bracket, index) => `
    <div class="info-row">
      <span class="label">${bracket.amount.toLocaleString()} @ ${bracket.rate}%:</span>
      <span class="amount">₦${bracket.tax.toLocaleString()}</span>
    </div>
    `).join('')}
    <div class="info-row" style="border-top: 2px solid #059669; padding-top: 10px; margin-top: 10px;">
      <span class="label" style="font-size: 16px;">Total Tax Payable:</span>
      <span class="amount" style="font-size: 18px;">₦${reportData.tax.taxPayable.toLocaleString()}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Declaration</div>
    <p>I declare that the information provided in this return is true, correct and complete to the best of my knowledge and belief.</p>
  </div>

  <div class="footer">
    <p>This tax return was generated and filed via OTax platform</p>
    <p>Generated on: ${new Date(reportData.generatedAt).toLocaleDateString()}</p>
    <p style="margin-top: 10px;">
      <strong>Note:</strong> This is an automated filing. Please keep a copy of this email for your records.
      For official submission, please also file through the official FIRS/LIRS portal.
    </p>
  </div>
</body>
</html>
    `.trim()

    const textTemplate = taxReturnSummary

    // Send email to IRS (for now, we'll use a placeholder email or send to user)
    // In production, you would send to the actual IRS email address
    const irsEmail = process.env.IRS_EMAIL || process.env.SMTP_USER || userEmail

    try {
      const info = await transporter.sendMail({
        from: `"OTax Tax Filing" <${fromEmail}>`,
        to: irsEmail,
        cc: userEmail, // Send copy to user
        subject: `Tax Return Filing - ${periodLabel} - ${userName}`,
        text: textTemplate,
        html: htmlTemplate,
      })

      console.log('✅ Tax return filed via email successfully:', info.messageId)

      return NextResponse.json({
        success: true,
        message: 'Tax return filed successfully via email',
        messageId: info.messageId
      })
    } catch (sendError: any) {
      console.error('❌ Tax return email sending error:', sendError)
      
      // In development, log to console
      if (process.env.NODE_ENV === 'development') {
        console.log('\n📧 Tax Return Filing Email (Fallback - Email service failed)')
        console.log(taxReturnSummary)
        console.warn('⚠️ Email sending failed. Check your SMTP configuration.')
      }

      return NextResponse.json(
        { 
          error: 'Failed to send email. Please check SMTP configuration.',
          details: process.env.NODE_ENV === 'development' ? sendError.message : undefined
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error filing tax return:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to file tax return' },
      { status: 500 }
    )
  }
}

