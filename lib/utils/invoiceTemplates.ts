import { InvoiceTemplate, InvoiceTemplateType } from '@/lib/types'

export const INVOICE_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'standard',
    name: 'Standard',
    type: 'standard',
    description: 'Clean and professional invoice template with all essential details',
    isDefault: true
  },
  {
    id: 'detailed',
    name: 'Detailed',
    type: 'detailed',
    description: 'Comprehensive invoice with detailed item descriptions and terms'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    type: 'minimal',
    description: 'Simple and minimal invoice design for quick billing'
  },
  {
    id: 'professional',
    name: 'Professional',
    type: 'professional',
    description: 'Premium invoice template with enhanced branding options'
  }
]

export function getTemplateById(id: string): InvoiceTemplate | undefined {
  return INVOICE_TEMPLATES.find(t => t.id === id)
}

export function getDefaultTemplate(): InvoiceTemplate {
  return INVOICE_TEMPLATES.find(t => t.isDefault) || INVOICE_TEMPLATES[0]
}

