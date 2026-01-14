import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { employeeService } from '@/lib/services/employeeService'
import type { Employee } from '@/lib/types'

/**
 * GET /api/employees
 * Get all employees for the authenticated user
 */
export async function GET(request: NextRequest) {
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

    // Get all employees for this user
    const employees = await employeeService.getEmployees(userId)

    return NextResponse.json({
      success: true,
      data: employees
    })
  } catch (error) {
    console.error('Error fetching employees:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch employees'
    console.error('Full error details:', error)
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * POST /api/employees
 * Create a new employee
 */
export async function POST(request: NextRequest) {
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

    // Get request body
    const body = await request.json()
    const {
      employeeNumber,
      firstName,
      lastName,
      middleName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      employmentType,
      department,
      position,
      jobTitle,
      employmentDate,
      employmentEndDate,
      status,
      basicSalary,
      allowances,
      deductions,
      taxIdentificationNumber,
      taxState,
      taxExempt,
      bankAccount,
      emergencyContact,
      notes
    } = body

    // Validate required fields
    if (!firstName || !lastName || !employmentType || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: firstName, lastName, employmentType, status' },
        { status: 400 }
      )
    }

    // Remove undefined values before creating employee
    const employeeData: any = {
      employeeNumber,
      firstName,
      lastName,
      middleName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      employmentType,
      department,
      position,
      jobTitle,
      employmentDate,
      employmentEndDate,
      status,
      basicSalary,
      allowances,
      deductions,
      taxIdentificationNumber,
      taxState,
      taxExempt,
      bankAccount,
      emergencyContact,
      notes
    }

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(employeeData).filter(([_, value]) => value !== undefined)
    )

    // Create employee
    const employee = await employeeService.createEmployee(userId, cleanedData)

    return NextResponse.json({
      success: true,
      data: employee
    })
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create employee' },
      { status: 500 }
    )
  }
}

