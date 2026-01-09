/**
 * Server-Side Validation Utilities
 * 
 * Provides server-side validation functions to prevent trial field manipulation
 * and ensure data integrity.
 */

import { getAdminDb } from '@/lib/firebase-admin';

export interface TrialFieldValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that free trial fields are not being manipulated
 * 
 * @param userId - User ID
 * @param proposedFields - Fields being updated
 * @returns Validation result
 */
export async function validateTrialFields(
  userId: string,
  proposedFields: {
    freeTrialStartDate?: string;
    freeTrialEndDate?: string;
    freeTrialUsed?: boolean;
  }
): Promise<TrialFieldValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const db = getAdminDb();
    
    // Get existing profile
    const profileQuery = await db.collection('userProfiles')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (profileQuery.empty) {
      // New profile - allow setting trial fields (handled during signup)
      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    }

    const existingProfile = profileQuery.docs[0].data();
    const now = new Date();

    // Check if trying to modify freeTrialStartDate
    if (proposedFields.freeTrialStartDate !== undefined) {
      const existingStart = existingProfile.freeTrialStartDate 
        ? new Date(existingProfile.freeTrialStartDate) 
        : null;
      const proposedStart = new Date(proposedFields.freeTrialStartDate);

      if (existingStart && existingStart.getTime() !== proposedStart.getTime()) {
        errors.push('freeTrialStartDate cannot be modified after initial creation');
      }
    }

    // Check if trying to modify freeTrialEndDate
    if (proposedFields.freeTrialEndDate !== undefined) {
      const existingEnd = existingProfile.freeTrialEndDate 
        ? new Date(existingProfile.freeTrialEndDate) 
        : null;
      const proposedEnd = new Date(proposedFields.freeTrialEndDate);

      if (existingEnd) {
        // Check if trying to extend trial
        if (proposedEnd.getTime() > existingEnd.getTime()) {
          errors.push('freeTrialEndDate cannot be extended');
        }

        // Check if trying to set trial end to suspiciously far future
        const daysFromNow = (proposedEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysFromNow > 30) {
          warnings.push(`Trial end date is ${daysFromNow.toFixed(1)} days in the future - suspicious`);
        }

        // Check if trial duration is suspicious (should be 3 days)
        if (existingProfile.freeTrialStartDate) {
          const startDate = new Date(existingProfile.freeTrialStartDate);
          const trialDuration = (proposedEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          if (Math.abs(trialDuration - 3) > 1) {
            warnings.push(`Trial duration is ${trialDuration.toFixed(1)} days (expected 3 days)`);
          }
        }
      }
    }

    // Check if trying to reset freeTrialUsed
    if (proposedFields.freeTrialUsed !== undefined) {
      if (existingProfile.freeTrialUsed === true && proposedFields.freeTrialUsed === false) {
        errors.push('freeTrialUsed cannot be reset to false after being set to true');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    console.error('Error validating trial fields:', error);
    return {
      isValid: false,
      errors: ['Error during validation'],
      warnings: []
    };
  }
}

/**
 * Validate subscription fields are not being manipulated
 */
export async function validateSubscriptionFields(
  userId: string,
  proposedFields: {
    isSubscribe?: boolean;
    subscriptionType?: string;
    subscriptionExpiryDate?: string;
  }
): Promise<TrialFieldValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const db = getAdminDb();
    
    const profileQuery = await db.collection('userProfiles')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (profileQuery.empty) {
      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    }

    const existingProfile = profileQuery.docs[0].data();
    const now = new Date();

    // Check if trying to extend subscription expiry
    if (proposedFields.subscriptionExpiryDate !== undefined) {
      const existingExpiry = existingProfile.subscriptionExpiryDate 
        ? new Date(existingProfile.subscriptionExpiryDate) 
        : null;
      const proposedExpiry = new Date(proposedFields.subscriptionExpiryDate);

      if (existingExpiry && proposedExpiry.getTime() > existingExpiry.getTime()) {
        // Only allow extension if it's a reasonable renewal (31 days from now)
        const daysFromNow = (proposedExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysFromNow > 365) {
          errors.push('Subscription expiry cannot be extended beyond 1 year');
        } else if (daysFromNow > 60) {
          warnings.push(`Subscription expiry is ${daysFromNow.toFixed(1)} days in the future - verify this is a legitimate renewal`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    console.error('Error validating subscription fields:', error);
    return {
      isValid: false,
      errors: ['Error during validation'],
      warnings: []
    };
  }
}

