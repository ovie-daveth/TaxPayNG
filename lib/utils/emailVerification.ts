/**
 * Email Verification Utility - Token-based verification
 * 
 * This utility sends a 6-digit token via email.
 * Users must enter the token to be added to the waitlist.
 */

/**
 * Send verification token for waitlist signup
 * 
 * @param email - The email address to verify
 * @param name - The user's name
 * @param phone - Optional phone number
 * @returns Promise with result including email
 */
export async function sendWaitlistVerification(email: string, name: string, phone?: string): Promise<{ success: boolean; error?: string; email?: string }> {
  try {
    const response = await fetch('/api/send-waitlist-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, name, phone }),
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.error || 'Failed to send verification email' }
    }

    const data = await response.json()
    return { success: true, email: data.email }
  } catch (error) {
    console.error('Email verification error:', error)
    return { 
      success: false, 
      error: 'Failed to send verification email. Please try again.' 
    }
  }
}

/**
 * Send verification token for account signup
 *
 * @param email - The email address to verify
 * @param name - The user's name (used in email template)
 * @param businessType - Optional business type to include in metadata
 */
export async function sendSignupVerification(
  email: string,
  name: string,
  businessType?: string
): Promise<{ success: boolean; error?: string; email?: string; alreadyVerified?: boolean }> {
  try {
    const response = await fetch('/api/send-signup-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, name, businessType }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send verification email' }
    }

    return {
      success: true,
      email: data.email,
      alreadyVerified: data.alreadyVerified ?? false,
    }
  } catch (error) {
    console.error('Signup email verification error:', error)
    return {
      success: false,
      error: 'Failed to send verification email. Please try again.',
    }
  }
}