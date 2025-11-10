import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

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
    const adminDb = getAdminDb()

    const verifiedDoc = await adminDb.collection('signupVerifiedEmails').doc(emailLower).get()
    if (verifiedDoc.exists) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified',
      })
    }

    const verificationDoc = await adminDb.collection('signupVerifications').doc(emailLower).get()

    if (!verificationDoc.exists) {
      return NextResponse.json(
        { error: 'No verification found. Please request a new verification code.' },
        { status: 400 }
      )
    }

    const verificationData = verificationDoc.data()
    if (!verificationData) {
      return NextResponse.json(
        { error: 'Invalid verification data.' },
        { status: 400 }
      )
    }

    if (verificationData.verificationToken !== tokenStr) {
      const attempts = (verificationData.attempts || 0) + 1
      await adminDb.collection('signupVerifications').doc(emailLower).update({
        attempts,
      })

      if (attempts >= 5) {
        await adminDb.collection('signupVerifications').doc(emailLower).delete()
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

    const expiresAt = new Date(verificationData.expiresAt)
    if (new Date() > expiresAt) {
      await adminDb.collection('signupVerifications').doc(emailLower).delete()
      return NextResponse.json(
        { error: 'Verification code expired. Please request a new one.' },
        { status: 400 }
      )
    }

    await adminDb.collection('signupVerifiedEmails').doc(emailLower).set({
      email: emailLower,
      name: verificationData.name,
      businessType: verificationData.businessType || null,
      verifiedAt: new Date().toISOString(),
    })

    await adminDb.collection('signupVerifications').doc(emailLower).delete()

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully. Continue signing up.',
    })
  } catch (error: any) {
    console.error('Signup token verification error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify token' },
      { status: 500 }
    )
  }
}

