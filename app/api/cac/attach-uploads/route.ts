import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

/**
 * Attach uploads + payload to an already-paid CAC request.
 * This is called AFTER Paystack verification succeeds, to avoid re-uploading on payment retries.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const requestId = String(body?.requestId || "").trim()
    const reference = String(body?.reference || "").trim()
    const payload = body?.payload || {}
    const uploads = body?.uploads || {}
    const shareCapitalBand = body?.shareCapitalBand || null

    if (!requestId || !reference) {
      return NextResponse.json({ success: false, error: "Missing requestId or reference" }, { status: 400 })
    }

    const db = getAdminDb()
    const ref = db.collection("cacRequests").doc(requestId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "CAC request not found" }, { status: 404 })
    }

    const existing: any = snap.data() || {}
    if (String(existing.paystackReference || "") !== reference) {
      return NextResponse.json({ success: false, error: "Reference does not match this request" }, { status: 400 })
    }
    if (String(existing.status || "") !== "paid") {
      return NextResponse.json({ success: false, error: "Payment not confirmed for this request" }, { status: 400 })
    }

    const now = new Date().toISOString()
    await ref.update({
      payload,
      uploads,
      shareCapitalBand: existing.type === "LLC" ? shareCapitalBand : null,
      updatedAt: now,
    })

    return NextResponse.json({ success: true, data: { requestId } })
  } catch (error: any) {
    console.error("Error attaching CAC uploads:", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to attach uploads" }, { status: 500 })
  }
}


