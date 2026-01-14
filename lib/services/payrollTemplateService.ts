import { getAdminDb } from '@/lib/firebase-admin'
import { PayrollTemplate } from '@/lib/types'

export class PayrollTemplateService {
  private db = getAdminDb()

  /**
   * Create default template
   */
  async createDefaultTemplate(userId: string): Promise<PayrollTemplate> {
    const defaultTemplate: Omit<PayrollTemplate, 'id'> = {
      userId,
      name: 'Default Payroll Template',
      isDefault: true,
      description: '2026 Tax Reform Compliant - Standard payroll template with statutory allowances, deductions, and automated PAYE calculation using new tax brackets (0% on first ₦800K, then 15%, 18%, 21%, 23%, 25%). Includes rent relief (20% capped at ₦500K/year), pension (8%), NHF (2.5%), and NHIS. All calculations follow 2026 Nigerian tax law.',
      allowances: [
        {
          name: 'Transport Allowance',
          type: 'fixed',
          amount: 30000, // ₦30,000/month
          taxable: false,
          category: 'transport'
        },
        {
          name: 'Housing Allowance',
          type: 'fixed',
          amount: 50000, // ₦50,000/month
          taxable: false,
          category: 'housing'
        },
        {
          name: 'Meal Allowance',
          type: 'fixed',
          amount: 15000, // ₦15,000/month
          taxable: true,
          category: 'meal'
        }
      ],
      deductions: [
        // Note: Pension and NHF are not included here as they are automatically
        // calculated based on companySettings (pensionEnabled, nhfEnabled)
        // Pension: 8% employee, 10% employer of (basic + transport + housing)
        // NHF: 2.5% of basic salary
        {
          name: 'NHIS',
          type: 'fixed',
          amount: 5000, // ₦5,000/month
          category: 'nhis',
          applicable: false
        }
      ],
      companySettings: {
        pensionEnabled: true,
        nhfEnabled: true,
        nhisEnabled: false,
        nhisAmount: 5000
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const templateRef = await this.db.collection('payrollTemplates').add(defaultTemplate)
    
    return {
      id: templateRef.id,
      ...defaultTemplate
    }
  }

  /**
   * Create custom template
   */
  async createTemplate(userId: string, template: Omit<PayrollTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<PayrollTemplate> {
    // Remove undefined values to prevent Firestore errors
    const cleanedTemplate: any = {
      userId,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Copy only defined values and clean arrays
    if (template.name !== undefined) cleanedTemplate.name = template.name
    if (template.description !== undefined && template.description !== null && template.description.trim() !== '') {
      cleanedTemplate.description = template.description.trim()
    }
    if (template.allowances !== undefined) {
      // Clean allowances - remove any with empty names or invalid values
      cleanedTemplate.allowances = template.allowances
        .filter(a => a.name && a.name.trim())
        .map(a => {
          const cleaned: any = {
            name: a.name.trim(),
            type: a.type,
            taxable: Boolean(a.taxable),
            category: a.category || 'other'
          }
          if (a.type === 'fixed' && a.amount !== undefined) {
            cleaned.amount = Number(a.amount)
          } else if (a.type === 'percentage' && a.percentage !== undefined) {
            cleaned.percentage = Number(a.percentage)
          }
          return cleaned
        })
    }
    if (template.deductions !== undefined) {
      // Clean deductions - remove any with empty names or invalid values
      cleanedTemplate.deductions = template.deductions
        .filter(d => d.name && d.name.trim())
        .map(d => {
          const cleaned: any = {
            name: d.name.trim(),
            type: d.type,
            category: d.category || 'other',
            applicable: d.applicable !== undefined ? Boolean(d.applicable) : true
          }
          if (d.type === 'fixed' && d.amount !== undefined) {
            cleaned.amount = Number(d.amount)
          } else if (d.type === 'percentage' && d.percentage !== undefined) {
            cleaned.percentage = Number(d.percentage)
          }
          return cleaned
        })
    }
    if (template.companySettings !== undefined) {
      cleanedTemplate.companySettings = {
        pensionEnabled: Boolean(template.companySettings.pensionEnabled),
        nhfEnabled: Boolean(template.companySettings.nhfEnabled),
        nhisEnabled: Boolean(template.companySettings.nhisEnabled),
        ...(template.companySettings.nhisAmount !== undefined && { nhisAmount: Number(template.companySettings.nhisAmount) })
      }
    }

    const templateRef = await this.db.collection('payrollTemplates').add(cleanedTemplate)
    
    return {
      id: templateRef.id,
      ...cleanedTemplate
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string, userId: string): Promise<PayrollTemplate | null> {
    const templateDoc = await this.db.collection('payrollTemplates').doc(templateId).get()
    
    if (!templateDoc.exists) {
      return null
    }

    const template = { id: templateDoc.id, ...templateDoc.data() } as PayrollTemplate
    
    // User can access their own templates or default templates
    if (template.userId !== userId && !template.isDefault) {
      return null
    }

    return template
  }

  /**
   * Get all templates for a user (including defaults)
   */
  async getTemplates(userId: string): Promise<PayrollTemplate[]> {
    let userTemplatesSnapshot
    try {
      // Get user's custom templates
      userTemplatesSnapshot = await this.db.collection('payrollTemplates')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get()
    } catch (error: any) {
      // If index is missing or still building, fall back to unordered query and sort in memory
      if (error.code === 'failed-precondition' && 
          (error.message.includes('The query requires an index') || 
           error.message.includes('currently building'))) {
        const isBuilding = error.message.includes('currently building')
        console.warn(
          isBuilding 
            ? "Firestore index is still building for payrollTemplates userId + createdAt. Falling back to in-memory sort."
            : "Firestore index missing for payrollTemplates userId + createdAt. Falling back to in-memory sort."
        )
        userTemplatesSnapshot = await this.db.collection('payrollTemplates')
          .where('userId', '==', userId)
          .get()
        
        const userTemplates = userTemplatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as PayrollTemplate))
        
        // Sort in memory by createdAt descending
        userTemplates.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        })
        
        // Get default templates
        const defaultTemplatesSnapshot = await this.db.collection('payrollTemplates')
          .where('isDefault', '==', true)
          .get()

        const defaultTemplates = defaultTemplatesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as PayrollTemplate))
          .filter(t => t.userId === userId || !userTemplates.find(ut => ut.id === t.id)) // Avoid duplicates

        return [...userTemplates, ...defaultTemplates]
      }
      throw error // Re-throw other errors
    }

    // Get default templates (created by system or first user)
    const defaultTemplatesSnapshot = await this.db.collection('payrollTemplates')
      .where('isDefault', '==', true)
      .get()

    const userTemplates = userTemplatesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PayrollTemplate))

    const defaultTemplates = defaultTemplatesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as PayrollTemplate))
      .filter(t => t.userId === userId || !userTemplates.find(ut => ut.id === t.id)) // Avoid duplicates

    return [...userTemplates, ...defaultTemplates]
  }

  /**
   * Update template
   */
  async updateTemplate(templateId: string, userId: string, updates: Partial<PayrollTemplate>): Promise<PayrollTemplate> {
    const template = await this.getTemplate(templateId, userId)
    
    if (!template) {
      throw new Error('Template not found')
    }

    if (template.userId !== userId) {
      throw new Error('Unauthorized: Cannot update template that does not belong to you')
    }

    // Remove undefined values to prevent Firestore errors
    const cleanedUpdates: any = {
      updatedAt: new Date().toISOString()
    }

    // Copy only defined values
    Object.keys(updates).forEach(key => {
      const value = (updates as any)[key]
      if (value !== undefined) {
        // For description, only include if it's not empty
        if (key === 'description') {
          if (value && value.trim && value.trim()) {
            cleanedUpdates[key] = value.trim()
          }
          // If empty, omit it to keep existing description
        } else {
          cleanedUpdates[key] = value
        }
      }
    })

    await this.db.collection('payrollTemplates').doc(templateId).update(cleanedUpdates)

    return {
      ...template,
      ...cleanedUpdates
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const template = await this.getTemplate(templateId, userId)
    
    if (!template) {
      throw new Error('Template not found')
    }

    if (template.userId !== userId) {
      throw new Error('Unauthorized: Cannot delete template that does not belong to you')
    }

    if (template.isDefault) {
      throw new Error('Cannot delete default template')
    }

    await this.db.collection('payrollTemplates').doc(templateId).delete()
  }
}

export const payrollTemplateService = new PayrollTemplateService()

