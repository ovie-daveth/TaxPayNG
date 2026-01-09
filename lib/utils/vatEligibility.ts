/**
 * VAT Eligibility Utility for Nigerian Tax System
 * 
 * Under Nigeria's VAT Act, only a "taxable person" can charge VAT.
 * A taxable person = any person/entity that supplies taxable goods or services
 * AND is required to register for VAT.
 * 
 * Key Rules (per FIRS/Nigeria VAT Act):
 * - Threshold: ₦100 million annual turnover in 12-month period
 * - Below ₦100M: VAT-exempt (must NOT charge VAT)
 * - ₦100M or above + VAT registered: Can charge VAT
 * 
 * Applies to: Companies, Business Names, AND Individuals (including professionals and creators)
 * 
 * VAT is collected on behalf of government - it is NOT income.
 * Charging VAT when exempt is illegal.
 */

import { UserProfile } from "@/lib/types"

// VAT charge threshold for individuals, freelancers, and creators
// Per Nigeria VAT Act: turnover >= ₦100M required to charge VAT
export const VAT_CHARGE_THRESHOLD_INDIVIDUAL = 100_000_000 // ₦100 million

// For SMEs/companies, the threshold may differ - using same threshold for consistency
// (vat-config.ts has VAT_EXEMPTION_THRESHOLD = 100M for "small company" - that's for a different classification)
export const VAT_CHARGE_THRESHOLD = VAT_CHARGE_THRESHOLD_INDIVIDUAL

export type VATEligibilityStatus = 'eligible' | 'exempt' | 'below_threshold' | 'not_registered'

export interface VATEligibilityResult {
  canChargeVAT: boolean
  status: VATEligibilityStatus
  reason: string
  /** Annual turnover in NGN (if provided) */
  annualTurnover?: number
  /** Whether user has indicated VAT registration */
  isVATRegistered?: boolean
}

/**
 * Determine if a user can charge VAT on invoices/transactions.
 * 
 * For Freelancers and Creators:
 * - Must have annual turnover >= ₦100M
 * - Must be registered for VAT (vatRegistered = true)
 * - Must have VAT registration number if claiming to be registered
 * 
 * For SMEs:
 * - Uses same threshold (₦100M) for consistency with individual rules
 * - SME-specific logic can be added if needed
 * 
 * @param profile User profile with optional vatRegistered, annualTurnover, vatRegistrationNumber
 * @returns VATEligibilityResult with canChargeVAT, status, and reason
 */
export function getVATEligibility(profile: UserProfile | null | undefined): VATEligibilityResult {
  if (!profile) {
    return {
      canChargeVAT: false,
      status: 'below_threshold',
      reason: 'Profile not loaded'
    }
  }

  const { businessType, annualTurnover, vatRegistered, vatRegistrationNumber } = profile

  // For freelancers and creators: apply the individual/freelancer VAT rules
  if (businessType === 'freelancer' || businessType === 'creator') {
    // No turnover data: assume below threshold (conservative - don't allow VAT)
    if (annualTurnover === undefined || annualTurnover === null) {
      return {
        canChargeVAT: false,
        status: 'below_threshold',
        reason: 'Annual turnover not provided. Under Nigerian law, only businesses with ₦100M+ annual turnover can charge VAT. Update your settings if you qualify.',
        annualTurnover: undefined,
        isVATRegistered: vatRegistered
      }
    }

    // Below ₦100M threshold: VAT exempt
    if (annualTurnover < VAT_CHARGE_THRESHOLD_INDIVIDUAL) {
      return {
        canChargeVAT: false,
        status: 'below_threshold',
        reason: `Annual turnover (₦${(annualTurnover / 1_000_000).toFixed(1)}M) is below the ₦100M threshold. You are VAT-exempt and must NOT charge VAT on invoices.`,
        annualTurnover,
        isVATRegistered: vatRegistered
      }
    }

    // At or above threshold but not VAT registered
    if (!vatRegistered) {
      return {
        canChargeVAT: false,
        status: 'not_registered',
        reason: `Your turnover (₦${(annualTurnover / 1_000_000).toFixed(1)}M) meets the threshold, but you must be registered for VAT with FIRS to charge VAT. Please register and update your profile.`,
        annualTurnover,
        isVATRegistered: false
      }
    }

    // At or above threshold AND VAT registered - can charge VAT
    return {
      canChargeVAT: true,
      status: 'eligible',
      reason: `You are VAT-registered with turnover of ₦${(annualTurnover / 1_000_000).toFixed(1)}M+. You may charge VAT on taxable goods/services. Remember: VAT is collected on behalf of government, not earned as income.`,
      annualTurnover,
      isVATRegistered: true
    }
  }

  // For SMEs and other business types: use similar logic
  // SMEs might have different rules - using same threshold for now
  if (businessType === 'sme' || businessType === 'agent') {
    // If they have the VAT eligibility fields set, use them
    if (annualTurnover !== undefined && annualTurnover !== null) {
      if (annualTurnover < VAT_CHARGE_THRESHOLD) {
        return {
          canChargeVAT: false,
          status: 'below_threshold',
          reason: `Annual turnover is below ₦100M threshold. Business is VAT-exempt.`,
          annualTurnover,
          isVATRegistered: vatRegistered
        }
      }
      if (!vatRegistered) {
        return {
          canChargeVAT: false,
          status: 'not_registered',
          reason: 'Turnover meets threshold but VAT registration is required to charge VAT.',
          annualTurnover,
          isVATRegistered: false
        }
      }
      return {
        canChargeVAT: true,
        status: 'eligible',
        reason: 'VAT-registered business above threshold. Can charge VAT on taxable supplies.',
        annualTurnover,
        isVATRegistered: true
      }
    }

    // SME without turnover data: check if they have vatRegistrationNumber (legacy support)
    // If they explicitly said they're VAT registered, allow it (they're likely a larger business)
    if (vatRegistered && vatRegistrationNumber) {
      return {
        canChargeVAT: true,
        status: 'eligible',
        reason: 'VAT-registered business. Ensure your annual turnover is ₦100M+ to remain compliant.',
        isVATRegistered: true
      }
    }
  }

  // Default: for unknown business types or missing data, don't allow VAT
  // This is the conservative/safe approach
  return {
    canChargeVAT: false,
    status: 'below_threshold',
    reason: 'VAT eligibility cannot be determined. Update your profile with annual turnover and VAT registration status.',
    annualTurnover: profile.annualTurnover,
    isVATRegistered: profile.vatRegistered
  }
}   

/**
 * Simplified check: Can this user charge VAT?
 * Use this in UI components for showing/hiding VAT fields.
 */
export function canChargeVAT(profile: UserProfile | null | undefined): boolean {
  return getVATEligibility(profile).canChargeVAT
}

/**
 * Format currency for display in VAT eligibility messages
 */
export function formatVATThreshold(): string {
  return `₦${(VAT_CHARGE_THRESHOLD_INDIVIDUAL / 1_000_000).toFixed(0)}M`
}

