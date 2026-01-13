import { BusinessType } from '@/lib/types'

/**
 * Checks if a business type is consultant (including legacy 'agent' for backward compatibility)
 * This ensures users registered as 'agent' before the migration are treated as consultants
 */
export function isConsultant(businessType: string | undefined | null): boolean {
  return businessType === 'consultant' || businessType === 'agent'
}

/**
 * Checks if a business type is NOT consultant (including legacy 'agent')
 */
export function isNotConsultant(businessType: string | undefined | null): boolean {
  return !isConsultant(businessType)
}

/**
 * Normalizes business type: converts legacy 'agent' to 'consultant'
 * Use this when saving/updating business type to ensure consistency
 */
export function normalizeBusinessType(businessType: string | undefined | null): BusinessType | null {
  if (!businessType) return null
  if (businessType === 'agent') return 'consultant'
  if (['freelancer', 'creator', 'sme', 'consultant'].includes(businessType)) {
    return businessType as BusinessType
  }
  return null
}

