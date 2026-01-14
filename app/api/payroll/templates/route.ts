import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { payrollTemplateService } from '@/lib/services/payrollTemplateService'

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

    let templates = await payrollTemplateService.getTemplates(userId)

    // If user has no templates, automatically create a default one
    if (templates.length === 0) {
      try {
        const defaultTemplate = await payrollTemplateService.createDefaultTemplate(userId)
        templates = [defaultTemplate]
      } catch (createError: any) {
        console.error('Error creating default template:', createError)
        // Continue even if default template creation fails
      }
    }

    return NextResponse.json({
      success: true,
      data: templates
    })
  } catch (error: any) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

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
    const { name, description, allowances, deductions, companySettings } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Template name is required' },
        { status: 400 }
      )
    }

    // Check if user wants to create default template
    if (body.createDefault) {
      const defaultTemplate = await payrollTemplateService.createDefaultTemplate(userId)
      return NextResponse.json({
        success: true,
        data: defaultTemplate
      })
    }

    // Remove undefined values to prevent Firestore errors
    const templateData: any = {
      name,
      isDefault: false,
      allowances: allowances || [],
      deductions: deductions || [],
      companySettings: companySettings || {
        pensionEnabled: true,
        nhfEnabled: true,
        nhisEnabled: false
      }
    }

    // Only include description if it's not empty/undefined
    if (description && description.trim()) {
      templateData.description = description.trim()
    }

    const template = await payrollTemplateService.createTemplate(userId, templateData)

    return NextResponse.json({
      success: true,
      data: template
    })
  } catch (error: any) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create template' },
      { status: 500 }
    )
  }
}

