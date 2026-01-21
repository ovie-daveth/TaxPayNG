import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { CAC_FEES_NAIRA } from "@/lib/constants/cac"
import type { CacRegistrationType } from "@/lib/types"

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

type InitializeBody = {
  type: CacRegistrationType
  contact: { name: string; email: string; phone: string }
  shareCapitalBand?: keyof typeof CAC_FEES_NAIRA.LLC_SHARE_CAPITAL
}

function getAmountKobo(body: InitializeBody): number {
  if (body.type === "BUSINESS_NAME") return CAC_FEES_NAIRA.BUSINESS_NAME * 100
  if (body.type === "INCORPORATED_TRUSTEES") return CAC_FEES_NAIRA.INCORPORATED_TRUSTEES * 100
  // LLC
  const band = body.shareCapitalBand || "UP_TO_1M"
  return CAC_FEES_NAIRA.LLC_SHARE_CAPITAL[band] * 100
}

export async function POST(request: NextRequest) {
  try {
    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.trim() === "" || PAYSTACK_SECRET_KEY === "sk_test_..." || PAYSTACK_SECRET_KEY === "sk_live_...") {
      return NextResponse.json({ success: false, error: "Paystack Secret Key not configured" }, { status: 500 })
    }

    const body: InitializeBody = await request.json()
    if (!body?.type || !body?.contact?.email || !body?.contact?.name || !body?.contact?.phone) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const email = String(body.contact.email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Invalid email address" }, { status: 400 })
    }

    const db = getAdminDb()
    const docRef = db.collection("cacRequests").doc()
    const requestId = docRef.id
    const amountKobo = getAmountKobo(body)
    const reference = `cac_${Date.now()}_${requestId.substring(0, 8)}`

    // Optional: attach userId if request is authenticated
    let userId: string | undefined
    try {
      const authHeader = request.headers.get("authorization")
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "")
        const adminAuth = getAdminAuth()
        const decoded = await adminAuth.verifyIdToken(token)
        userId = decoded.uid
      }
    } catch {
      // Ignore auth errors for public flow
    }

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        currency: "NGN",
        reference,
        metadata: {
          cacRequestId: requestId,
          type: body.type,
          shareCapitalBand: body.shareCapitalBand || null,
          contactName: body.contact.name,
          contactPhone: body.contact.phone,
        },
      }),
    })

    if (!paystackRes.ok) {
      const err = await paystackRes.json().catch(() => ({}))
      return NextResponse.json({ success: false, error: err?.message || "Failed to initialize payment" }, { status: 500 })
    }

    const paystackData = await paystackRes.json()
    if (!paystackData?.status || !paystackData?.data?.reference) {
      return NextResponse.json({ success: false, error: "Invalid response from Paystack" }, { status: 500 })
    }

    const now = new Date().toISOString()
    await docRef.set({
      type: body.type,
      status: "payment_pending",
      amountKobo,
      currency: "NGN",
      paystackReference: paystackData.data.reference,
      paystackAccessCode: paystackData.data.access_code || null,
      contactName: String(body.contact.name || "").trim(),
      contactEmail: email,
      contactPhone: String(body.contact.phone || "").trim(),
      userId: userId || null,
      shareCapitalBand: body.type === "LLC" ? (body.shareCapitalBand || "UP_TO_1M") : null,
      // Payload + uploads are attached AFTER payment is verified, to avoid re-upload on payment retry.
      payload: {},
      uploads: {},
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({
      success: true,
      data: {
        requestId,
        reference: paystackData.data.reference,
        accessCode: paystackData.data.access_code,
        authorizationUrl: paystackData.data.authorization_url,
        amountKobo,
      },
    })
  } catch (error: any) {
    console.error("Error initializing CAC request:", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to initialize CAC request" }, { status: 500 })
  }
}


