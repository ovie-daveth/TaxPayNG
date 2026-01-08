/**
 * Account Proliferation Detection
 * 
 * Detects and prevents users from creating multiple accounts
 * to abuse free trial periods.
 */

import { getAdminDb } from '@/lib/firebase-admin';

export interface AccountProliferationCheck {
  isSuspicious: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  accountsFound: number;
  details?: {
    sameIP?: number;
    sameDevice?: number;
    timeWindow?: string;
  };
}

export interface SignupContext {
  email: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  userId: string;
}

/**
 * Generate a simple device fingerprint from user agent and other available data
 */
export function generateDeviceFingerprint(userAgent?: string, ipAddress?: string): string {
  // Simple fingerprint - in production, use a more sophisticated method
  const parts: string[] = [];
  
  if (userAgent) {
    // Extract browser and OS info
    const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)?.[0] || '';
    const os = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/)?.[0] || '';
    parts.push(browser, os);
  }
  
  if (ipAddress) {
    // Use IP prefix for privacy (last octet removed)
    const ipParts = ipAddress.split('.');
    if (ipParts.length === 4) {
      parts.push(`${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.x`);
    }
  }
  
  return parts.join('|') || 'unknown';
}

/**
 * Check for account proliferation patterns
 * 
 * @param context - Signup context information
 * @param timeWindowHours - Time window to check for multiple signups (default: 24 hours)
 * @returns Check result
 */
export async function checkAccountProliferation(
  context: SignupContext,
  timeWindowHours: number = 24
): Promise<AccountProliferationCheck> {
  try {
    const db = getAdminDb();
    const now = new Date();
    const timeWindowStart = new Date(now.getTime() - timeWindowHours * 60 * 60 * 1000);

    // Check for accounts created in the time window
    const recentSignupsQuery = await db.collection('userProfiles')
      .where('createdAt', '>=', timeWindowStart.toISOString())
      .where('createdAt', '<=', now.toISOString())
      .get();

    // If no recent signups, no risk
    if (recentSignupsQuery.empty) {
      return {
        isSuspicious: false,
        riskLevel: 'low',
        reason: 'No recent signups detected',
        accountsFound: 0
      };
    }

    const recentAccounts = recentSignupsQuery.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email as string | undefined,
        userId: data.userId as string | undefined,
        createdAt: data.createdAt as string | undefined,
        ...data
      };
    });

    // Check for same IP address (if provided)
    let sameIPCount = 0;
    if (context.ipAddress) {
      // In a real implementation, you'd store IP addresses during signup
      // For now, we'll check email patterns and timing
      sameIPCount = recentAccounts.length; // Placeholder
    }

    // Check for similar email patterns (e.g., user1@example.com, user2@example.com)
    const emailDomain = context.email.split('@')[1];
    const similarEmails = recentAccounts.filter(account => {
      const accountEmail = account.email || '';
      return accountEmail.includes(emailDomain) && account.userId !== context.userId;
    });

    // Check for rapid signups (multiple accounts in short time)
    const rapidSignups = recentAccounts.filter(account => {
      if (!account.createdAt) return false;
      const accountCreated = new Date(account.createdAt);
      const minutesDiff = (now.getTime() - accountCreated.getTime()) / (1000 * 60);
      return minutesDiff < 60; // Within last hour
    });

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let isSuspicious = false;
    let reason = 'No suspicious patterns detected';

    if (rapidSignups.length >= 3) {
      riskLevel = 'critical';
      isSuspicious = true;
      reason = `Multiple accounts created within 1 hour (${rapidSignups.length} accounts)`;
    } else if (rapidSignups.length >= 2) {
      riskLevel = 'high';
      isSuspicious = true;
      reason = `Multiple accounts created within 1 hour (${rapidSignups.length} accounts)`;
    } else if (similarEmails.length >= 3) {
      riskLevel = 'high';
      isSuspicious = true;
      reason = `Multiple accounts with similar email patterns (${similarEmails.length} accounts)`;
    } else if (recentAccounts.length >= 5) {
      riskLevel = 'medium';
      isSuspicious = true;
      reason = `Multiple accounts created in last ${timeWindowHours} hours (${recentAccounts.length} accounts)`;
    } else if (recentAccounts.length >= 3) {
      riskLevel = 'medium';
      isSuspicious = true;
      reason = `Multiple accounts created recently (${recentAccounts.length} accounts)`;
    }

    return {
      isSuspicious,
      riskLevel,
      reason,
      accountsFound: recentAccounts.length,
      details: {
        sameIP: sameIPCount,
        timeWindow: `${timeWindowHours} hours`
      }
    };
  } catch (error) {
    console.error('Error checking account proliferation:', error);
    // On error, allow signup but log for investigation
    return {
      isSuspicious: false,
      riskLevel: 'low',
      reason: 'Error during check - allowing signup',
      accountsFound: 0
    };
  }
}

/**
 * Log suspicious signup activity for monitoring
 */
export async function logSuspiciousActivity(
  context: SignupContext,
  checkResult: AccountProliferationCheck
): Promise<void> {
  try {
    const db = getAdminDb();
    
    await db.collection('securityLogs').add({
      type: 'account_proliferation',
      userId: context.userId,
      email: context.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      timestamp: new Date().toISOString(),
      riskLevel: checkResult.riskLevel,
      isSuspicious: checkResult.isSuspicious,
      reason: checkResult.reason,
      accountsFound: checkResult.accountsFound,
      details: checkResult.details
    });
  } catch (error) {
    console.error('Error logging suspicious activity:', error);
    // Don't throw - logging failures shouldn't block signup
  }
}

