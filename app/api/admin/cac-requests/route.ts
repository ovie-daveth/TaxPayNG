import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const adminAuth = getAdminAuth()
    const decoded = await adminAuth.verifyIdToken(token)

    const db = getAdminDb()
    const adminProfileQuery = await db.collection("userProfiles").where("userId", "==", decoded.uid).limit(1).get()
    if (adminProfileQuery.empty || adminProfileQuery.docs[0].data()?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const status = request.nextUrl.searchParams.get("status")
    let query: FirebaseFirestore.Query = db.collection("cacRequests").orderBy("createdAt", "desc")
    if (status) {
      query = (query as any).where("status", "==", status)
    }

    const snap = await query.get()
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ success: true, data: rows })
  } catch (error: any) {
    console.error("Error fetching CAC requests:", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to fetch CAC requests" }, { status: 500 })
  }
}


