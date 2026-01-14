import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { payrollService } from '@/lib/services/payrollService'

export async function GET(request: NextRequest) {
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

    const payrolls = await payrollService.getPayrolls(userId)

    return NextResponse.json({
      success: true,
      data: payrolls
    })
  } catch (error: any) {
    console.error('Error fetching payrolls:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch payrolls' },
      { status: 500 }
    )
  }
}

