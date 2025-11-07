import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/firebase/firebase'
import { doc, getDoc, deleteDoc, setDoc } from 'firebase/firestore'

/**
 * Verify waitlist token and add to waitlist
 * 
 * This endpoint verifies the token entered by the user.
 * Only after successful verification is the user added to the waitlist.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json()

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and token are required' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase().trim()
    const tokenStr = token.toString().trim()

    // Get pending verification
    const verificationDoc = await getDoc(doc(db, 'waitlistVerifications', emailLower))

    if (!verificationDoc.exists()) {
      return NextResponse.json(
        { error: 'No verification found. Please request a new verification code.' },
        { status: 400 }
      )
    }

    const verificationData = verificationDoc.data()

    // Check if token matches
    if (verificationData.verificationToken !== tokenStr) {
      // Increment attempts
      const attempts = (verificationData.attempts || 0) + 1
      await setDoc(doc(db, 'waitlistVerifications', emailLower), {
        ...verificationData,
        attempts
      }, { merge: true })

      if (attempts >= 5) {
        // Delete after too many attempts
        await deleteDoc(doc(db, 'waitlistVerifications', emailLower))
        return NextResponse.json(
          { error: 'Too many failed attempts. Please request a new verification code.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Invalid verification code. Please try again.' },
        { status: 400 }
      )
    }

    // Check if expired
    const expiresAt = new Date(verificationData.expiresAt)
    if (new Date() > expiresAt) {
      await deleteDoc(doc(db, 'waitlistVerifications', emailLower))
      return NextResponse.json(
        { error: 'Verification code expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Token is valid! Add to waitlist
    await setDoc(doc(db, 'waitlist', emailLower), {
      name: verificationData.name,
      email: emailLower,
      phone: verificationData.phone || '',
      createdAt: new Date().toISOString(),
      emailVerified: true,
      verifiedAt: new Date().toISOString(),
      status: 'verified',
      notified: false
    })

    // Delete pending verification
    await deleteDoc(doc(db, 'waitlistVerifications', emailLower))

    return NextResponse.json({
      success: true,
      message: 'Email verified! You are now on the waitlist.'
    })

  } catch (error: any) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify token' },
      { status: 500 }
    )
  }
}
