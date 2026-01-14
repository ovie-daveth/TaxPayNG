import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { payrollService } from '@/lib/services/payrollService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

    // Handle both Promise and direct params (Next.js 13+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params
    const payrollId = resolvedParams.id
    const payroll = await payrollService.getPayroll(payrollId, userId)

    if (!payroll) {
      return NextResponse.json(
        { success: false, error: 'Payroll not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: payroll
    })
  } catch (error: any) {
    console.error('Error fetching payroll:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch payroll' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

    // Handle both Promise and direct params (Next.js 13+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params
    const payrollId = resolvedParams.id

    if (!payrollId || payrollId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Payroll ID is required' },
        { status: 400 }
      )
    }

    await payrollService.deletePayroll(payrollId, userId)

    return NextResponse.json({
      success: true,
      message: 'Payroll deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting payroll:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete payroll' },
      { status: 500 }
    )
  }
}

