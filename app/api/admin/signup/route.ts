import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin'
import type { UserRecord } from 'firebase-admin/auth'

/**
 * Admin Signup API Route
 * Creates a new user account with Firebase Auth and userProfile document
 * Role defaults to "user" - admin can change it later
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, phone, businessType } = await request.json()

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, password, first name, and last name are required' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Password validation
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Phone validation (if provided)
    if (phone && phone.trim() !== '') {
      const phoneRegex = /^(\+234|0)?[789][01]\d{8}$/
      const cleanPhone = phone.replace(/\s/g, '')
      if (!phoneRegex.test(cleanPhone)) {
        return NextResponse.json(
          { error: 'Please enter a valid Nigerian phone number' },
          { status: 400 }
        )
      }
    }

    const emailLower = email.toLowerCase().trim()
    const adminDb = getAdminDb()

    const adminAuth = getAdminAuth()

    // Check if user already exists in Firebase Auth
    let userRecord: UserRecord
    try {
      userRecord = await adminAuth.getUserByEmail(emailLower)
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    } catch (error: any) {
      // User doesn't exist, which is what we want
      if (error.code !== 'auth/user-not-found') {
        throw error
      }
    }

    // Create Firebase Auth user
    try {
      userRecord = await adminAuth.createUser({
        email: emailLower,
        password: password,
        displayName: `${firstName} ${lastName}`,
        emailVerified: false, // User can verify later
      })
    } catch (error: any) {
      console.error('Error creating Firebase Auth user:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Format phone number if provided
    let formattedPhone: string | undefined = undefined
    if (phone && phone.trim() !== '') {
      let cleaned = phone.replace(/\s/g, '')
      if (cleaned.startsWith('0')) {
        formattedPhone = '+234' + cleaned.substring(1)
      } else if (!cleaned.startsWith('+')) {
        formattedPhone = '+234' + cleaned
      } else {
        formattedPhone = cleaned
      }
    }

    // Create userProfile document in Firestore
    const userProfileData = {
      userId: userRecord.uid,
      email: emailLower,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: formattedPhone || '',
      businessType: businessType || 'individual',
      role: 'user', // Default role - admin can change this later
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Check if profile already exists (shouldn't happen, but just in case)
    const existingProfile = await adminDb.collection('userProfiles')
      .where('userId', '==', userRecord.uid)
      .limit(1)
      .get()

    if (!existingProfile.empty) {
      // Update existing profile
      const profileDoc = existingProfile.docs[0]
      await adminDb.collection('userProfiles').doc(profileDoc.id).update({
        ...userProfileData,
        updatedAt: new Date().toISOString(),
      })
    } else {
      // Create new profile
      await adminDb.collection('userProfiles').add(userProfileData)
    }

    return NextResponse.json({
      success: true,
      message: 'User account created successfully',
      data: {
        uid: userRecord.uid,
        email: emailLower,
        role: 'user',
      },
    })

  } catch (error: any) {
    console.error('Admin signup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user account' },
      { status: 500 }
    )
  }
}

