import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '@/firebase/firebase';
import { validateClientTime, getServerTime } from './security/timeValidation';
import { logSecurityEvent } from './security/monitoring';

interface SubscriptionValidationResult {
  hasAccess: boolean;
  reason: 'active_subscription' | 'free_trial_active' | 'subscription_expired' | 'free_trial_expired' | 'no_subscription_or_trial' | 'user_profile_not_found';
  daysRemaining?: number;
  subscriptionType?: string | null;
  expiredDate?: string;
  isExpiringSoon?: boolean;
  timeWarning?: string; // Warning about time mismatch
}

export async function validateSubscriptionServerSide(
  userId?: string,
  clientTime?: string
): Promise<SubscriptionValidationResult> {
  try {
    const functions = getFunctions();
    const validateSubscription = httpsCallable(functions, 'validateSubscription');
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    // Validate client time if provided
    let timeWarning: string | undefined;
    if (clientTime) {
      const timeValidation = validateClientTime(clientTime, getServerTime());
      if (timeValidation.isSuspicious) {
        timeWarning = timeValidation.warning;
        // Log suspicious time mismatch
        logSecurityEvent({
          type: 'time_mismatch',
          userId: userId || currentUser.uid,
          severity: timeValidation.timeDifferenceSeconds > 300 ? 'high' : 'medium',
          description: `Client/server time mismatch detected: ${timeValidation.timeDifferenceSeconds}s difference`,
          metadata: {
            clientTime,
            serverTime: getServerTime().toISOString(),
            differenceSeconds: timeValidation.timeDifferenceSeconds
          }
        }).catch(err => console.error('Error logging security event:', err));
      }
    }

    const result = await validateSubscription({
      userId: userId || currentUser.uid,
      clientTime: clientTime || getServerTime().toISOString()
    });

    const validationResult = result.data as SubscriptionValidationResult;
    
    // Add time warning if present
    if (timeWarning) {
      validationResult.timeWarning = timeWarning;
    }

    return validationResult;
  } catch (error: any) {
    console.error('Error validating subscription:', error);
    
    if (error.code === 'functions/not-found' || error.code === 'functions/unavailable') {
      console.warn('Cloud Function not available, falling back to client-side check');
      throw new Error('Subscription validation service unavailable');
    }
    
    throw error;
  }
}

export async function requireValidAccess(userId?: string): Promise<void> {
  const result = await validateSubscriptionServerSide(userId);
  
  if (!result.hasAccess) {
    const errorMessages: Record<string, string> = {
      'subscription_expired': 'Your subscription has expired. Please renew to continue.',
      'free_trial_expired': 'Your free trial has ended. Please subscribe to continue.',
      'no_subscription_or_trial': 'Subscription required. Please subscribe to access this feature.',
      'user_profile_not_found': 'User profile not found. Please contact support.'
    };

    throw new Error(errorMessages[result.reason] || 'Access denied');
  }
}