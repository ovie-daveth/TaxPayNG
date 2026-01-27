import { NextRequest, NextResponse } from "next/server"
import { Twilio } from "twilio"
import { otpStore } from "@/lib/services/otpStore"
import { getAdminDb } from "@/lib/firebase-admin"

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      )
    }

    // Validate phone number format (Nigerian format)
    const cleanPhone = phoneNumber.replaceAll(/\D/g, '')
    if (!cleanPhone.match(/^(0|234)?[789]\d{9}$/)) {
      return NextResponse.json(
        { success: false, error: "Invalid Nigerian phone number format" },
        { status: 400 }
      )
    }

    // Format phone number for Twilio (international format)
    let formattedPhone: string
    if (cleanPhone.startsWith('234')) {
      formattedPhone = `+${cleanPhone}`
    } else if (cleanPhone.startsWith('0')) {
      formattedPhone = `+234${cleanPhone.slice(1)}`
    } else {
      formattedPhone = `+234${cleanPhone}`
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    // Store OTP in memory
    otpStore.set(formattedPhone, { otp, expiresAt, attempts: 0 })
    console.log(`[SEND-OTP] Stored OTP for ${formattedPhone}:`, otp)

    // Also store in Firestore for persistence across API route instances
    try {
      const db = getAdminDb()
      await db.collection('phoneOtps').doc(formattedPhone).set({
        otp,
        expiresAt,
        attempts: 0,
        createdAt: new Date().toISOString()
      })
      console.log(`[SEND-OTP] Stored OTP in Firestore for ${formattedPhone}`)
    } catch (dbError) {
      console.error('[SEND-OTP] Failed to store OTP in Firestore:', dbError)
      // Continue even if Firestore fails
    }

    // Clean up expired OTPs
    otpStore.cleanup()

    // Send OTP via Twilio
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          body: `Your TaxPayNG verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone
        })

        console.log(`OTP sent to ${formattedPhone}`)
      } catch (twilioError) {
        console.error('Twilio error:', twilioError)
        // For development, continue even if Twilio fails
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { success: false, error: "Failed to send SMS" },
            { status: 500 }
          )
        }
        // In development, log the OTP to console
        console.log(`[DEV MODE] OTP for ${formattedPhone}: ${otp}`)
      }
    } else {
      // Development mode - log OTP to console
      console.log(`[DEV MODE] OTP for ${formattedPhone}: ${otp}`)
      console.warn('Twilio credentials not configured. Using development mode.')
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
      // Only include OTP in response in development mode
      ...(process.env.NODE_ENV !== 'production' && { otp })
    })
  } catch (error) {
    console.error("Error sending OTP:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
