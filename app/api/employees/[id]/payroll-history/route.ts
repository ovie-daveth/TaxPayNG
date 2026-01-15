import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'

/**
 * GET /api/employees/[id]/payroll-history
 * Get payroll history for a specific employee
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

    // Get all payrolls for this user
    const payrollsSnapshot = await db.collection('payrolls')
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc')
      .get()

    // Filter payrolls that include this employee
    const payrollHistory: any[] = []
    payrollsSnapshot.forEach((doc) => {
      const payrollData = doc.data()
      const items = payrollData.items || []
      
      // For yearly payrolls, find all monthly items for this employee
      // For monthly/quarterly payrolls, find the single item
      const employeeItems = items.filter((item: any) => item.employeeId === employeeId)
      
      if (employeeItems.length > 0) {
        // If it's a yearly payroll with monthly breakdown, create separate entries for each month
        if (payrollData.periodType === 'yearly' && employeeItems.length > 1) {
          employeeItems.forEach((item: any) => {
            // Use the monthly period info if available, otherwise calculate from month number
            let monthPeriod = item.monthlyPeriod || `${item.monthName || 'Unknown'} ${payrollData.period}`
            let monthStart = item.monthlyPeriodStart
            let monthEnd = item.monthlyPeriodEnd
            
            // If monthly period dates aren't stored, calculate them from the month number
            if (!monthStart && item.month) {
              const year = new Date(payrollData.periodStart).getFullYear()
              const monthStartDate = new Date(year, item.month - 1, 1)
              const monthEndDate = new Date(year, item.month, 0) // Last day of the month
              monthStart = monthStartDate.toISOString()
              monthEnd = monthEndDate.toISOString()
            }
            
            payrollHistory.push({
              payrollId: doc.id,
              period: monthPeriod,
              periodType: 'monthly',
              periodStart: monthStart || payrollData.periodStart,
              periodEnd: monthEnd || payrollData.periodEnd,
              generatedAt: payrollData.generatedAt,
              item: item
            })
          })
        } else {
          // Single item (monthly or quarterly payroll, or first item from yearly)
          const employeeItem = employeeItems[0]
          payrollHistory.push({
            payrollId: doc.id,
            period: payrollData.period,
            periodType: payrollData.periodType,
            periodStart: payrollData.periodStart,
            periodEnd: payrollData.periodEnd,
            generatedAt: payrollData.generatedAt,
            item: employeeItem
          })
        }
      }
    })
    
    // Sort by period start date (most recent first)
    payrollHistory.sort((a, b) => {
      const dateA = new Date(a.periodStart).getTime()
      const dateB = new Date(b.periodStart).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      data: payrollHistory
    })
  } catch (error) {
    console.error('Error fetching payroll history:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch payroll history' },
      { status: 500 }
    )
  }
}

