import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '@/firebase/firebase';

interface SubscriptionValidationResult {
  hasAccess: boolean;
  reason: 'active_subscription' | 'free_trial_active' | 'subscription_expired' | 'free_trial_expired' | 'no_subscription_or_trial' | 'user_profile_not_found';
  daysRemaining?: number;
  subscriptionType?: string | null;
  expiredDate?: string;
  isExpiringSoon?: boolean;
}

export async function validateSubscriptionServerSide(
  userId?: string
): Promise<SubscriptionValidationResult> {
  try {
    const functions = getFunctions();
    const validateSubscription = httpsCallable(functions, 'validateSubscription');
    
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const result = await validateSubscription({
      userId: userId || currentUser.uid
    });

    return result.data as SubscriptionValidationResult;
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