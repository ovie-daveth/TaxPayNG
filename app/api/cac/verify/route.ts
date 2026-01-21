import { NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

async function notifyAdminsOfCacRequest(db: FirebaseFirestore.Firestore, requestId: string, title: string, message: string) {
  const adminsSnapshot = await db.collection("userProfiles").where("role", "==", "admin").get()
  const now = new Date().toISOString()
  const writes: Promise<any>[] = []
  adminsSnapshot.forEach((doc) => {
    const data = doc.data() as any
    const adminUserId = data?.userId
    if (!adminUserId) return
    writes.push(
      db.collection("notifications").add({
        userId: adminUserId,
        type: "cac_request",
        title,
        message,
        status: "unread",
        link: "/admin/dashboard/cac-requests",
        metadata: { cacRequestId: requestId },
        createdAt: now,
      })
    )
  })
  await Promise.allSettled(writes)
}

export async function POST(request: NextRequest) {
  try {
    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.trim() === "" || PAYSTACK_SECRET_KEY === "sk_test_..." || PAYSTACK_SECRET_KEY === "sk_live_...") {
      return NextResponse.json({ success: false, error: "Paystack Secret Key not configured" }, { status: 500 })
    }

    const body = await request.json()
    const reference = String(body?.reference || "").trim()
    if (!reference) {
      return NextResponse.json({ success: false, error: "Missing reference" }, { status: 400 })
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}))
      return NextResponse.json({ success: false, error: err?.message || "Payment verification failed" }, { status: 500 })
    }

    const paystackData = await verifyRes.json()
    if (!paystackData?.status || paystackData?.data?.status !== "success") {
      return NextResponse.json(
        { success: false, error: paystackData?.data?.gateway_response || "Payment was not successful" },
        { status: 400 }
      )
    }

    const metadata = paystackData?.data?.metadata || {}
    const requestIdFromMeta = metadata?.cacRequestId

    const db = getAdminDb()

    let requestDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null
    if (requestIdFromMeta) {
      const docSnap = await db.collection("cacRequests").doc(String(requestIdFromMeta)).get()
      if (docSnap.exists) {
        // @ts-ignore
        requestDoc = { id: docSnap.id, data: () => docSnap.data() } as any
      }
    }
    if (!requestDoc) {
      const snap = await db.collection("cacRequests").where("paystackReference", "==", reference).limit(1).get()
      if (!snap.empty) requestDoc = snap.docs[0]
    }

    if (!requestDoc) {
      return NextResponse.json({ success: false, error: "CAC request not found for this reference" }, { status: 404 })
    }

    const requestId = (requestDoc as any).id || (requestDoc as any).ref?.id
    const existing = (requestDoc as any).data?.() || {}
    const now = new Date().toISOString()

    await db.collection("cacRequests").doc(requestId).update({
      status: "paid",
      paidAt: now,
      updatedAt: now,
      paystackVerification: {
        reference,
        paidAt: paystackData?.data?.paid_at || null,
        channel: paystackData?.data?.channel || null,
        gatewayResponse: paystackData?.data?.gateway_response || null,
        amount: paystackData?.data?.amount || null,
        currency: paystackData?.data?.currency || null,
      },
    })

    // Notify admins (best-effort)
    try {
      const title = "New CAC request paid"
      const msg = `${existing?.contactName || "A customer"} paid for ${existing?.type || "CAC registration"} (Ref: ${reference}).`
      await notifyAdminsOfCacRequest(db, requestId, title, msg)
    } catch (notifyErr) {
      console.error("Failed to notify admins:", notifyErr)
    }

    return NextResponse.json({ success: true, data: { requestId, reference } })
  } catch (error: any) {
    console.error("Error verifying CAC payment:", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to verify CAC payment" }, { status: 500 })
  }
}


