import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { payrollTemplateService } from '@/lib/services/payrollTemplateService'

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

    const resolvedParams = params instanceof Promise ? await params : params
    const templateId = resolvedParams.id

    const template = await payrollTemplateService.getTemplate(templateId, userId)

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: template
    })
  } catch (error: any) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const resolvedParams = params instanceof Promise ? await params : params
    const templateId = resolvedParams.id

    const body = await request.json()
    const { name, description, allowances, deductions, companySettings } = body

    // Remove undefined values to prevent Firestore errors
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) {
      // Only include description if it's not empty
      if (description && description.trim()) {
        updateData.description = description.trim()
      } else {
        // If description is empty, we can either omit it or set it to null
        // For now, we'll omit it to keep existing description
      }
    }
    if (allowances !== undefined) updateData.allowances = allowances
    if (deductions !== undefined) updateData.deductions = deductions
    if (companySettings !== undefined) updateData.companySettings = companySettings

    const template = await payrollTemplateService.updateTemplate(templateId, userId, updateData)

    return NextResponse.json({
      success: true,
      data: template
    })
  } catch (error: any) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update template' },
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

    const resolvedParams = params instanceof Promise ? await params : params
    const templateId = resolvedParams.id

    if (!templateId || templateId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      )
    }

    await payrollTemplateService.deleteTemplate(templateId, userId)

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete template' },
      { status: 500 }
    )
  }
}

