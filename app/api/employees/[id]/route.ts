import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { employeeService } from '@/lib/services/employeeService'

/**
 * GET /api/employees/[id]
 * Get a single employee by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Verify authentication
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
    // Handle both Promise and direct params (Next.js 13+ vs older versions)
    const resolvedParams = params instanceof Promise ? await params : params
    const employeeId = resolvedParams.id

    if (!employeeId || employeeId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Get employee
    const employee = await employeeService.getEmployee(employeeId, userId)

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: employee
    })
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/employees/[id]
 * Update an employee
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Verify authentication
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
    // Handle both Promise and direct params (Next.js 13+ vs older versions)
    const resolvedParams = params instanceof Promise ? await params : params
    const employeeId = resolvedParams.id

    if (!employeeId || employeeId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Get request body
    const body = await request.json()
    const updates = { ...body }
    
    // Remove fields that shouldn't be updated
    delete updates.id
    delete updates.userId
    delete updates.createdAt

    // Update employee
    const employee = await employeeService.updateEmployee(employeeId, userId, updates)

    return NextResponse.json({
      success: true,
      data: employee
    })
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update employee' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/employees/[id]
 * Delete an employee
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Verify authentication
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
    // Handle both Promise and direct params (Next.js 13+ vs older versions)
    const resolvedParams = params instanceof Promise ? await params : params
    const employeeId = resolvedParams.id

    if (!employeeId || employeeId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Delete employee
    await employeeService.deleteEmployee(employeeId, userId)

    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete employee' },
      { status: 500 }
    )
  }
}

