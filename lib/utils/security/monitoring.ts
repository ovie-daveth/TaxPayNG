/**
 * Security Monitoring and Alerting
 * 
 * Monitors suspicious patterns related to free trials and subscriptions
 */

import { getAdminDb } from '@/lib/firebase-admin';

export interface SecurityEvent {
  type: 'trial_manipulation' | 'account_proliferation' | 'suspicious_access' | 'time_mismatch';
  userId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * Log a security event for monitoring
 */
export async function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
  try {
    const db = getAdminDb();
    
    await db.collection('securityLogs').add({
      ...event,
      timestamp: new Date().toISOString()
    });

    // If critical or high severity, also log to console for immediate attention
    if (event.severity === 'critical' || event.severity === 'high') {
      console.warn(`[SECURITY ALERT] ${event.type}: ${event.description}`, event);
    }
  } catch (error) {
    console.error('Error logging security event:', error);
    // Don't throw - logging failures shouldn't block operations
  }
}

/**
 * Check for suspicious trial extension patterns
 */
export async function checkTrialManipulation(userId: string): Promise<boolean> {
  try {
    const db = getAdminDb();
    
    // Get user profile
    const profileQuery = await db.collection('userProfiles')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (profileQuery.empty) {
      return false;
    }

    const profile = profileQuery.docs[0].data();
    
    // Check if freeTrialEndDate was recently modified
    // (This would require tracking modification history - simplified version here)
    
    // Check if trial end date is suspiciously far in the future
    if (profile.freeTrialEndDate) {
      const trialEnd = new Date(profile.freeTrialEndDate);
      const trialStart = profile.freeTrialStartDate ? new Date(profile.freeTrialStartDate) : null;
      const now = new Date();

      // Trial should be 14 days from start
      if (trialStart) {
        const expectedEnd = new Date(trialStart);
        expectedEnd.setDate(expectedEnd.getDate() + 14);
        
        // Allow 1 day buffer for timezone differences
        const daysDifference = Math.abs((trialEnd.getTime() - expectedEnd.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDifference > 1) {
          await logSecurityEvent({
            type: 'trial_manipulation',
            userId,
            severity: 'high',
            description: `Suspicious trial duration detected: ${daysDifference.toFixed(1)} days difference from expected`,
            metadata: {
              trialStart: profile.freeTrialStartDate,
              trialEnd: profile.freeTrialEndDate,
              expectedEnd: expectedEnd.toISOString(),
              daysDifference
            }
          });
          return true;
        }
      }

      // Check if trial end date is in the past but user still has access
      if (trialEnd < now && profile.freeTrialUsed && !profile.isSubscribe) {
        await logSecurityEvent({
          type: 'trial_manipulation',
          userId,
          severity: 'medium',
          description: 'Trial expired but user may still have access',
          metadata: {
            trialEnd: profile.freeTrialEndDate,
            isSubscribe: profile.isSubscribe
          }
        });
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking trial manipulation:', error);
    return false;
  }
}

/**
 * Get security statistics for monitoring dashboard
 */
export async function getSecurityStats(timeWindowHours: number = 24): Promise<{
  suspiciousSignups: number;
  timeMismatches: number;
  trialManipulations: number;
  totalEvents: number;
}> {
  try {
    const db = getAdminDb();
    const now = new Date();
    const timeWindowStart = new Date(now.getTime() - timeWindowHours * 60 * 60 * 1000);

    const logsQuery = await db.collection('securityLogs')
      .where('timestamp', '>=', timeWindowStart.toISOString())
      .get();

    const logs = logsQuery.docs.map(doc => doc.data());

    return {
      suspiciousSignups: logs.filter(log => log.type === 'account_proliferation').length,
      timeMismatches: logs.filter(log => log.type === 'time_mismatch').length,
      trialManipulations: logs.filter(log => log.type === 'trial_manipulation').length,
      totalEvents: logs.length
    };
  } catch (error) {
    console.error('Error getting security stats:', error);
    return {
      suspiciousSignups: 0,
      timeMismatches: 0,
      trialManipulations: 0,
      totalEvents: 0
    };
  }
}

