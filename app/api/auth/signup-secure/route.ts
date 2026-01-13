/**
 * Secure Signup API Route
 * 
 * This route includes account proliferation detection and security logging.
 * Use this for server-side signup processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { checkAccountProliferation, logSuspiciousActivity, generateDeviceFingerprint, SignupContext } from '@/lib/utils/security/accountProliferation';
import { logSecurityEvent } from '@/lib/utils/security/monitoring';

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, businessType, phone, consultantStates, agentStates } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !businessType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    const deviceFingerprint = generateDeviceFingerprint(userAgent, ipAddress);

    // Create user account using Firebase Admin SDK
    const adminAuth = getAdminAuth();
    let user;
    try {
      user = await adminAuth.createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`
      });
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { success: false, error: 'Email already registered' },
          { status: 400 }
        );
      }
      throw authError;
    }

    // Check for account proliferation BEFORE creating profile
    const signupContext: SignupContext = {
      email,
      ipAddress,
      userAgent,
      deviceFingerprint,
      userId: user.uid
    };

    const proliferationCheck = await checkAccountProliferation(signupContext);

    // Log suspicious activity
    if (proliferationCheck.isSuspicious) {
      await logSuspiciousActivity(signupContext, proliferationCheck);
      
      // For critical/high risk, we might want to block signup or require additional verification
      if (proliferationCheck.riskLevel === 'critical') {
        // Log but allow signup - you may want to block this in production
        await logSecurityEvent({
          type: 'account_proliferation',
          userId: user.uid,
          severity: 'critical',
          description: `Critical account proliferation detected during signup: ${proliferationCheck.reason}`,
          metadata: {
            email,
            accountsFound: proliferationCheck.accountsFound,
            details: proliferationCheck.details
          }
        });
      }
    }

    // Create user profile
    const db = getAdminDb();
    const now = new Date();
    const freeTrialEndDate = new Date(now);
    freeTrialEndDate.setDate(freeTrialEndDate.getDate() + 7);

    const profileData: any = {
      userId: user.uid,
      email,
      firstName,
      lastName,
      businessType,
      freeTrialStartDate: now.toISOString(),
      freeTrialEndDate: freeTrialEndDate.toISOString(),
      freeTrialUsed: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      // Store signup metadata for security tracking
      signupMetadata: {
        ipAddress,
        userAgent,
        deviceFingerprint,
        timestamp: now.toISOString()
      }
    };

    // Add consultant-specific fields
    if (businessType === 'consultant') {
      profileData.phone = phone;
      profileData.consultantStates = consultantStates || agentStates || []; // Support both for backward compatibility
      profileData.consultantKycCompleted = false;
      profileData.role = 'consultant';
    }
    // Backward compatibility: also handle 'agent' business type
    if (businessType === 'agent') {
      profileData.phone = phone;
      profileData.consultantStates = agentStates || [];
      profileData.agentStates = agentStates || []; // Keep for backward compatibility
      profileData.consultantKycCompleted = false;
      profileData.agentKycCompleted = false; // Keep for backward compatibility
      profileData.role = 'agent';
    }

    await db.collection('userProfiles').add(profileData);

    return NextResponse.json({
      success: true,
      userId: user.uid,
      message: 'Account created successfully',
      securityCheck: {
        isSuspicious: proliferationCheck.isSuspicious,
        riskLevel: proliferationCheck.riskLevel
      }
    });

  } catch (error: any) {
    console.error('Error in secure signup:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}

