import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { payrollService } from '@/lib/services/payrollService'
import { payrollTemplateService } from '@/lib/services/payrollTemplateService'

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
    const { templateId, periodStart, periodEnd, periodType, periodLabel } = body

    if (!templateId || !periodStart || !periodEnd || !periodType || !periodLabel) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify template exists and belongs to user
    const template = await payrollTemplateService.getTemplate(templateId, userId)
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found or unauthorized' },
        { status: 404 }
      )
    }

    // Generate payroll
    const payroll = await payrollService.generatePayroll(
      userId,
      templateId,
      {
        start: periodStart,
        end: periodEnd,
        type: periodType
      },
      periodLabel
    )

    return NextResponse.json({
      success: true,
      data: payroll
    })
  } catch (error: any) {
    console.error('Error generating payroll:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate payroll' },
      { status: 500 }
    )
  }
}

