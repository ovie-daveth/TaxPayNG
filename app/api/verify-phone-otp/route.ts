import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { otpStore } from "@/lib/services/otpStore"

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otp } = await request.json()

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { success: false, error: "Phone number and OTP are required" },
        { status: 400 }
      )
    }

    // Validate phone number format
    const cleanPhone = phoneNumber.replaceAll(/\D/g, '')
    if (!cleanPhone.match(/^(0|234)?[789]\d{9}$/)) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format" },
        { status: 400 }
      )
    }

    // Format phone number (international format)
    let formattedPhone: string
    if (cleanPhone.startsWith('234')) {
      formattedPhone = `+${cleanPhone}`
    } else if (cleanPhone.startsWith('0')) {
      formattedPhone = `+234${cleanPhone.slice(1)}`
    } else {
      formattedPhone = `+234${cleanPhone}`
    }

    // Get stored OTP data from memory first
    console.log(`[VERIFY-OTP] Looking for OTP for ${formattedPhone}`)
    let storedData = otpStore.get(formattedPhone)
    console.log(`[VERIFY-OTP] Found stored data in memory:`, storedData ? 'YES' : 'NO')

    // If not in memory, check Firestore
    if (!storedData) {
      try {
        const db = getAdminDb()
        const doc = await db.collection('phoneOtps').doc(formattedPhone).get()
        
        if (doc.exists) {
          const data = doc.data()
          storedData = {
            otp: data?.otp || '',
            expiresAt: data?.expiresAt || 0,
            attempts: data?.attempts || 0
          }
          console.log(`[VERIFY-OTP] Found OTP in Firestore for ${formattedPhone}`)
        } else {
          console.log(`[VERIFY-OTP] No OTP found in Firestore for ${formattedPhone}`)
        }
      } catch (dbError) {
        console.error('[VERIFY-OTP] Failed to retrieve OTP from Firestore:', dbError)
      }
    }

    if (!storedData) {
      return NextResponse.json(
        { success: false, error: "No verification code found. Please request a new code." },
        { status: 400 }
      )
    }

    // Check if OTP is expired
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(formattedPhone)
      // Delete from Firestore too
      try {
        const db = getAdminDb()
        await db.collection('phoneOtps').doc(formattedPhone).delete()
      } catch (dbError) {
        console.error('[VERIFY-OTP] Failed to delete expired OTP from Firestore:', dbError)
      }
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      )
    }

    // Check attempt limit
    if (storedData.attempts >= 5) {
      otpStore.delete(formattedPhone)
      // Delete from Firestore too
      try {
        const db = getAdminDb()
        await db.collection('phoneOtps').doc(formattedPhone).delete()
      } catch (dbError) {
        console.error('[VERIFY-OTP] Failed to delete OTP from Firestore:', dbError)
      }
      return NextResponse.json(
        { success: false, error: "Too many failed attempts. Please request a new code." },
        { status: 429 }
      )
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      // Increment attempts
      storedData.attempts += 1
      otpStore.set(formattedPhone, storedData)
      
      // Update in Firestore too
      try {
        const db = getAdminDb()
        await db.collection('phoneOtps').doc(formattedPhone).update({
          attempts: storedData.attempts
        })
      } catch (dbError) {
        console.error('[VERIFY-OTP] Failed to update attempts in Firestore:', dbError)
      }

      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid verification code",
          attemptsRemaining: 5 - storedData.attempts
        },
        { status: 400 }
      )
    }

    // OTP is valid - remove from store
    otpStore.delete(formattedPhone)
    
    // Delete from Firestore too
    try {
      const db = getAdminDb()
      await db.collection('phoneOtps').doc(formattedPhone).delete()
      console.log(`[VERIFY-OTP] Deleted OTP from Firestore for ${formattedPhone}`)
    } catch (dbError) {
      console.error('[VERIFY-OTP] Failed to delete OTP from Firestore:', dbError)
    }

    // Update user's phone verification status in database
    // You'll need to get the user ID from the session/auth
    // For now, we'll just mark the phone as verified in the response
    // In a real implementation, update the user document in Firestore

    try {
      // Get user by phone number and update verification status
      const db = getAdminDb()
      const usersRef = db.collection('users')
      const querySnapshot = await usersRef.where('phone', '==', phoneNumber).limit(1).get()

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]
        await userDoc.ref.update({
          phoneVerified: true,
          phoneVerifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    } catch (dbError) {
      console.error('Error updating user verification status:', dbError)
      // Don't fail the request if DB update fails
    }

    return NextResponse.json({
      success: true,
      message: "Phone number verified successfully"
    })
  } catch (error) {
    console.error("Error verifying OTP:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
