import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

const adminAuth = getAdminAuth()
const adminDb = getAdminDb()

async function getDecodedToken(request: NextRequest) {
  const cookies = request.headers.get("cookie") || ""
  const sessionCookie = cookies.match(/session=([^;]+)/)?.[1]

  if (sessionCookie) {
    return adminAuth.verifySessionCookie(sessionCookie, true)
  }

  const bearer = request.headers.get("authorization")
  const token = bearer?.startsWith("Bearer ") ? bearer.substring(7) : undefined

  if (!token) {
    return null
  }

  return adminAuth.verifyIdToken(token, true)
}

async function isAdminUser(uid: string, email?: string | null) {
  try {
    if (uid) {
      const profileQuery = await adminDb
        .collection("userProfiles")
        .where("userId", "==", uid)
        .limit(1)
        .get()

      if (!profileQuery.empty) {
        const profile = profileQuery.docs[0].data()
        if (profile.role === "admin") {
          return true
        }
      }
    }

    if (email) {
      const profileQueryByEmail = await adminDb
        .collection("userProfiles")
        .where("email", "==", email.toLowerCase())
        .limit(1)
        .get()

      if (!profileQueryByEmail.empty) {
        const profile = profileQueryByEmail.docs[0].data()
        if (profile.role === "admin") {
          return true
        }
      }
    }

    // Check hardcoded admin emails
    const ADMIN_EMAILS = ["oviedavid77@gmail.com"]
    if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
      return true
    }
  } catch (error) {
    console.error("Failed to verify admin role:", error)
    return false
  }

  return false
}

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await getDecodedToken(request)
    if (!decodedToken?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if requester is admin
    const requesterIsAdmin = await isAdminUser(decodedToken.uid, decodedToken.email)
    if (!requesterIsAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { email, uid } = body as { email?: string; uid?: string }

    if (!email && !uid) {
      return NextResponse.json(
        { error: "Email or UID is required" },
        { status: 400 }
      )
    }

    let targetUid = uid
    let targetEmail = email

    // If email provided, get UID
    if (email && !uid) {
      try {
        const userRecord = await adminAuth.getUserByEmail(email)
        targetUid = userRecord.uid
        targetEmail = userRecord.email || email
      } catch (error: any) {
        if (error.code === "auth/user-not-found") {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          )
        }
        throw error
      }
    }

    // If UID provided, get email
    if (uid && !email) {
      try {
        const userRecord = await adminAuth.getUser(uid)
        targetEmail = userRecord.email || undefined
      } catch (error: any) {
        if (error.code === "auth/user-not-found") {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          )
        }
        throw error
      }
    }

    if (!targetUid) {
      return NextResponse.json(
        { error: "Could not determine user UID" },
        { status: 400 }
      )
    }

    // Find userProfile by userId
    const userProfileQuery = await adminDb
      .collection("userProfiles")
      .where("userId", "==", targetUid)
      .limit(1)
      .get()

    if (userProfileQuery.empty) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      )
    }

    const profileDoc = userProfileQuery.docs[0]
    await adminDb.collection("userProfiles").doc(profileDoc.id).update({
      role: "admin",
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: `User ${targetEmail || targetUid} has been set as admin`,
      userId: targetUid
    })
  } catch (error: any) {
    console.error("Set admin role error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to set admin role" },
      { status: 500 }
    )
  }
}

