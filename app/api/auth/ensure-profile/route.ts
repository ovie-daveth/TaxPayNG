import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

/**
 * Ensures a Firestore userProfile exists for an already-existing Firebase Auth user.
 *
 * This is used to recover "partial signups" where Auth exists but the Firestore profile was never created.
 * Security: requires the email to have been verified via /api/verify-signup-token (signupVerifiedEmails doc exists).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, firstName, lastName, businessType, phone, consultantStates } = body || {}

    if (!email || !firstName || !lastName || !businessType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const emailLower = String(email).toLowerCase().trim()
    const adminDb = getAdminDb()

    // Must be verified via token first
    const verifiedDoc = await adminDb.collection("signupVerifiedEmails").doc(emailLower).get()
    if (!verifiedDoc.exists) {
      return NextResponse.json({ error: "Email not verified" }, { status: 400 })
    }

    const adminAuth = getAdminAuth()
    const authUser = await adminAuth.getUserByEmail(emailLower)

    const profilesCol = adminDb.collection("userProfiles")

    // Detect existing profile (supports multiple historical shapes)
    const directDoc = await profilesCol.doc(authUser.uid).get()
    if (directDoc.exists) {
      return NextResponse.json({ success: false, error: "ACCOUNT_EXISTS" }, { status: 400 })
    }

    const byUserId = await profilesCol.where("userId", "==", authUser.uid).limit(1).get()
    if (!byUserId.empty) {
      return NextResponse.json({ success: false, error: "ACCOUNT_EXISTS" }, { status: 400 })
    }

    const byEmail = await profilesCol.where("email", "==", emailLower).limit(1).get()
    if (!byEmail.empty) {
      return NextResponse.json({ success: false, error: "ACCOUNT_EXISTS" }, { status: 400 })
    }

    const now = new Date()
    const profileData: any = {
      userId: authUser.uid,
      email: emailLower,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      businessType,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }

    if (businessType === "consultant") {
      profileData.phone = phone || ""
      profileData.consultantStates = Array.isArray(consultantStates) ? consultantStates : []
      profileData.consultantKycCompleted = false
      profileData.role = "consultant"
    }

    // Keep the existing data model: userProfiles are stored with random doc IDs in some places.
    await profilesCol.add(profileData)

    return NextResponse.json({ success: true, userId: authUser.uid })
  } catch (error: any) {
    console.error("ensure-profile error:", error)
    return NextResponse.json({ error: error.message || "Failed to ensure profile" }, { status: 500 })
  }
}


