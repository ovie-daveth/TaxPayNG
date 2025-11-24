import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

/**
 * Verify comment token and save comment
 * 
 * This endpoint verifies the token entered by the user.
 * Only after successful verification is the comment saved.
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
    const adminDb = getAdminDb()

    // Get pending verification
    const verificationDoc = await adminDb.collection('commentVerifications').doc(emailLower).get()

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

    // Check if token matches
    if (verificationData.verificationToken !== tokenStr) {
      // Increment attempts
      const attempts = (verificationData.attempts || 0) + 1
      await adminDb.collection('commentVerifications').doc(emailLower).update({
        attempts
      })

      if (attempts >= 5) {
        // Delete after too many attempts
        await adminDb.collection('commentVerifications').doc(emailLower).delete()
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
      await adminDb.collection('commentVerifications').doc(emailLower).delete()
      return NextResponse.json(
        { error: 'Verification code expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Token is valid! Save comment
    const commentData = {
      blogId: verificationData.blogId,
      name: verificationData.name,
      email: emailLower,
      comment: verificationData.comment,
      createdAt: new Date().toISOString()
    }
    
    await adminDb.collection('blogComments').add(commentData)

    // Delete pending verification
    await adminDb.collection('commentVerifications').doc(emailLower).delete()

    return NextResponse.json({
      success: true,
      message: 'Email verified! Your comment has been posted.'
    })

  } catch (error: any) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify token' },
      { status: 500 }
    )
  }
}

