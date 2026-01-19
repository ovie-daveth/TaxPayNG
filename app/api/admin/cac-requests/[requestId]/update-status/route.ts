import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

const VALID_STATUSES = ["payment_pending", "paid", "in_progress", "completed", "cancelled", "draft"] as const

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
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

    const { requestId } = await params
    const body = await request.json()
    const status = String(body?.status || "").trim()
    const notes = body?.notes ? String(body.notes).trim() : ""

    if (!requestId || !status) {
      return NextResponse.json({ success: false, error: "Request ID and status are required" }, { status: 400 })
    }
    if (!VALID_STATUSES.includes(status as any)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 })
    }

    const ref = db.collection("cacRequests").doc(requestId)
    const doc = await ref.get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "CAC request not found" }, { status: 404 })
    }

    const updateData: any = { status, updatedAt: new Date().toISOString() }
    if (notes) updateData.notes = notes
    if (status === "completed") updateData.completedAt = new Date().toISOString()

    await ref.update(updateData)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error updating CAC request status:", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to update status" }, { status: 500 })
  }
}


