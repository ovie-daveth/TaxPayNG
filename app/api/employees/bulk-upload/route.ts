import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'
import { employeeService } from '@/lib/services/employeeService'
import type { Employee } from '@/lib/types'

/**
 * POST /api/employees/bulk-upload
 * Bulk upload employees from Excel file
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

    // Get form data (file upload)
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ]
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.' },
        { status: 400 }
      )
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse Excel/CSV file
    let employees: Array<Omit<Employee, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> = []
    
    try {
      // Dynamic import of xlsx library
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { raw: false })
      
      // Map Excel rows to employee objects
      employees = data.map((row: any, index: number) => {
        // Map common column names (case-insensitive)
        const getValue = (keys: string[]) => {
          for (const key of keys) {
            const found = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase().trim())
            if (found && row[found]) return String(row[found]).trim()
          }
          return undefined
        }

        const firstName = getValue(['first name', 'firstname', 'fname', 'given name']) || ''
        const lastName = getValue(['last name', 'lastname', 'lname', 'surname', 'family name']) || ''
        
        if (!firstName || !lastName) {
          throw new Error(`Row ${index + 2}: Missing required fields (First Name, Last Name)`)
        }

        // Parse basic salary
        const basicSalaryStr = getValue(['basic salary', 'basicsalary', 'salary', 'monthly salary', 'monthlysalary'])
        const basicSalary = basicSalaryStr ? parseFloat(basicSalaryStr.replace(/[^0-9.]/g, '')) : undefined

        // Parse date fields
        const parseDate = (dateStr?: string) => {
          if (!dateStr) return undefined
          try {
            const date = new Date(dateStr)
            return isNaN(date.getTime()) ? undefined : date.toISOString().split('T')[0]
          } catch {
            return undefined
          }
        }

        // Helper function to remove undefined values from an object (but keep null, empty strings, and 0)
        const removeUndefined = (obj: any): any => {
          if (obj === undefined) return undefined
          if (obj === null || typeof obj !== 'object') return obj
          if (Array.isArray(obj)) return obj.map(removeUndefined).filter(v => v !== undefined)
          
          const cleaned: any = {}
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
              const cleanedValue = removeUndefined(value)
              if (cleanedValue !== undefined) {
                cleaned[key] = cleanedValue
              }
            }
          }
          // Return undefined only if object is completely empty, otherwise return cleaned object
          return Object.keys(cleaned).length > 0 ? cleaned : undefined
        }

        const rawEmployee = {
          employeeNumber: getValue(['employee number', 'employeenumber', 'emp no', 'empno', 'id']),
          firstName,
          lastName,
          middleName: getValue(['middle name', 'middlename', 'mname']),
          email: getValue(['email', 'email address', 'e-mail']),
          phone: getValue(['phone', 'phone number', 'phonenumber', 'mobile', 'telephone']),
          dateOfBirth: parseDate(getValue(['date of birth', 'dateofbirth', 'dob', 'birth date', 'birthdate'])),
          gender: getValue(['gender', 'sex'])?.toLowerCase() as 'male' | 'female' | 'other' | undefined,
          address: {
            street: getValue(['address', 'street', 'street address']),
            city: getValue(['city']),
            state: getValue(['state']),
            country: getValue(['country']) || 'Nigeria',
            postalCode: getValue(['postal code', 'postalcode', 'zip', 'zip code'])
          },
          employmentType: (getValue(['employment type', 'employmenttype', 'type', 'emp type'])?.toLowerCase() || 'full-time') as 'full-time' | 'part-time' | 'contract' | 'intern',
          department: getValue(['department', 'dept']),
          position: getValue(['position']),
          jobTitle: getValue(['job title', 'jobtitle', 'title', 'designation']),
          employmentDate: parseDate(getValue(['employment date', 'employmentdate', 'start date', 'startdate', 'hire date', 'hiredate'])),
          status: (getValue(['status'])?.toLowerCase() || 'active') as 'active' | 'inactive' | 'terminated' | 'on-leave',
          basicSalary,
          taxIdentificationNumber: getValue(['tin', 'tax id', 'taxid', 'tax identification number']),
          taxState: getValue(['tax state', 'taxstate', 'state for tax']),
          bankAccount: {
            bankName: getValue(['bank name', 'bankname', 'bank']),
            accountNumber: getValue(['account number', 'accountnumber', 'account no', 'accountno']),
            accountName: getValue(['account name', 'accountname'])
          },
          emergencyContact: getValue(['emergency contact', 'emergencycontact', 'emergency contact name']) ? {
            name: getValue(['emergency contact', 'emergencycontact', 'emergency contact name']) || '',
            phone: getValue(['emergency phone', 'emergencyphone', 'emergency contact phone']) || '',
            relationship: getValue(['emergency relationship', 'emergencyrelationship', 'relationship']),
            email: getValue(['emergency email', 'emergencyemail', 'emergency contact email'])
          } : undefined,
          notes: getValue(['notes', 'remarks', 'comments'])
        }

        // Remove all undefined values before returning
        return removeUndefined(rawEmployee)
      }).filter(emp => emp.firstName && emp.lastName) // Filter out invalid rows
      
    } catch (error) {
      console.error('Error parsing Excel file:', error)
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Failed to parse Excel file' },
        { status: 400 }
      )
    }

    if (employees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid employee data found in file' },
        { status: 400 }
      )
    }

    // Bulk create employees
    const createdEmployees = await employeeService.bulkCreateEmployees(userId, employees)

    return NextResponse.json({
      success: true,
      data: createdEmployees,
      message: `Successfully imported ${createdEmployees.length} employee(s)`
    })
  } catch (error) {
    console.error('Error bulk uploading employees:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to bulk upload employees' },
      { status: 500 }
    )
  }
}

