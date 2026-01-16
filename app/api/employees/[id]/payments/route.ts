import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'

/**
 * GET /api/employees/[id]/payments
 * Get payment records for a specific employee
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const adminAuth = getAdminAuth()
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid
    const { id: employeeId } = await params
    const db = getAdminDb()

    // Get employee to verify ownership
    const employeeDoc = await db.collection('employees').doc(employeeId).get()
    if (!employeeDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    const employeeData = employeeDoc.data()
    if (employeeData?.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get payment records from employee document
    const paymentRecords = employeeData?.paymentRecords || []

    return NextResponse.json({
      success: true,
      data: paymentRecords
    })
  } catch (error) {
    console.error('Error fetching payment records:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch payment records' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/employees/[id]/payments
 * Record a payment for an employee
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const adminAuth = getAdminAuth()
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid
    const { id: employeeId } = await params
    const db = getAdminDb()
    const body = await request.json()

    const {
      payrollId,
      period,
      periodType,
      periodStart,
      periodEnd,
      netSalary,
      paymentMethod,
      paymentReference,
      notes
    } = body

    // Validate required fields
    if (!payrollId || !period || !periodType || !periodStart || !periodEnd || netSalary === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get employee to verify ownership
    const employeeDoc = await db.collection('employees').doc(employeeId).get()
    if (!employeeDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    const employeeData = employeeDoc.data()
    if (employeeData?.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Prevent duplicates: only one "paid" record per month (year-month) per employee.
    const monthKeyFromISO = (iso: string) => {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return null
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    const newMonthKey = monthKeyFromISO(periodStart)
    if (!newMonthKey) {
      return NextResponse.json(
        { success: false, error: 'Invalid periodStart date' },
        { status: 400 }
      )
    }

    // Create payment record
    const paymentRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      payrollId,
      period,
      periodType,
      periodStart,
      periodEnd,
      netSalary,
      status: 'paid' as const,
      paidAt: new Date().toISOString(),
      paidBy: userId,
      paymentMethod: paymentMethod || 'bank_transfer',
      paymentReference: paymentReference || '',
      notes: notes || '',
      createdAt: new Date().toISOString()
    }

    // Update employee document with new payment record
    const existingRecords = employeeData?.paymentRecords || []
    const hasPaidForMonth = existingRecords.some((r: any) => {
      if (r?.status !== 'paid') return false
      const mk = typeof r?.periodStart === 'string' ? monthKeyFromISO(r.periodStart) : null
      return mk === newMonthKey
    })
    if (hasPaidForMonth) {
      return NextResponse.json(
        { success: false, error: 'Payment already recorded for this month' },
        { status: 409 }
      )
    }
    const updatedRecords = [...existingRecords, paymentRecord]

    await employeeDoc.ref.update({
      paymentRecords: updatedRecords,
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: paymentRecord,
      message: 'Payment recorded successfully'
    })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record payment' },
      { status: 500 }
    )
  }
}

