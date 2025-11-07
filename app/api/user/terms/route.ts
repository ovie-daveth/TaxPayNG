import { NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

const auth = getAdminAuth()
const adminDb = getAdminDb()

export async function POST(request: Request) {
  try {
    const cookies = request.headers.get("cookie") || ""
    const sessionCookie = cookies.match(/session=([^;]+)/)?.[1]
    let decodedToken

    if (sessionCookie) {
      decodedToken = await auth.verifySessionCookie(sessionCookie, true)
    } else {
      const bearer = request.headers.get("authorization")
      const token = bearer?.startsWith("Bearer ") ? bearer.substring(7) : undefined
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      decodedToken = await auth.verifyIdToken(token, true)
    }

    if (!decodedToken?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body.isAgreedTerms !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const profileQuery = await adminDb
      .collection("userProfiles")
      .where("userId", "==", decodedToken.uid)
      .limit(1)
      .get()

    if (profileQuery.empty) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    await profileQuery.docs[0].ref.update({ isAgreedTerms: body.isAgreedTerms, termsUpdatedAt: new Date() })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating terms consent", error)
    return NextResponse.json({ error: "Failed to update consent" }, { status: 500 })
  }
}
