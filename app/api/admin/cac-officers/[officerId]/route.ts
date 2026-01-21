import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false as const, status: 401, error: "Unauthorized" }
  }

  const token = authHeader.replace("Bearer ", "")
  const adminAuth = getAdminAuth()
  const decoded = await adminAuth.verifyIdToken(token)

  const db = getAdminDb()
  const adminProfileQuery = await db.collection("userProfiles").where("userId", "==", decoded.uid).limit(1).get()
  if (adminProfileQuery.empty || adminProfileQuery.docs[0].data()?.role !== "admin") {
    return { ok: false as const, status: 403, error: "Unauthorized - Admin access required" }
  }

  return { ok: true as const, db, uid: decoded.uid }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ officerId: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

    const { officerId } = await params
    const body = await request.json()

    const update: any = { updatedAt: new Date().toISOString() }
    if (body?.name !== undefined) update.name = String(body.name || "").trim()
    if (body?.phone !== undefined) update.phone = String(body.phone || "").trim()
    if (body?.email !== undefined) {
      const email = body.email ? String(body.email).trim() : ""
      // Firestore does not accept undefined values; delete the field when blank.
      update.email = email ? email : FieldValue.delete()
    }
    if (body?.isActive !== undefined) update.isActive = !!body.isActive

    if (body?.profitSharing) {
      const standardFeeNaira = Number(body?.profitSharing?.standardFeeNaira)
      const defaultPlatformPct = Number(body?.profitSharing?.defaultPlatformPct)
      const platformPctByType = body?.profitSharing?.platformPctByType || {}

      if (Number.isFinite(standardFeeNaira)) {
        if (standardFeeNaira < 0) return NextResponse.json({ success: false, error: "Invalid standard fee" }, { status: 400 })
      }
      if (Number.isFinite(defaultPlatformPct)) {
        if (defaultPlatformPct < 0 || defaultPlatformPct > 100) {
          return NextResponse.json({ success: false, error: "Invalid default platform percentage" }, { status: 400 })
        }
      }

      const patchProfit: any = {}
      if (Number.isFinite(standardFeeNaira)) patchProfit.standardFeeNaira = standardFeeNaira
      if (Number.isFinite(defaultPlatformPct)) patchProfit.defaultPlatformPct = defaultPlatformPct
      if (platformPctByType && typeof platformPctByType === "object") patchProfit.platformPctByType = platformPctByType
      update.profitSharing = patchProfit
    }

    const ref = auth.db.collection("cacOfficers").doc(officerId)
    const doc = await ref.get()
    if (!doc.exists) return NextResponse.json({ success: false, error: "Officer not found" }, { status: 404 })

    // Merge profitSharing if partial update
    if (update.profitSharing) {
      const current = doc.data() || {}
      update.profitSharing = {
        ...(current as any).profitSharing,
        ...update.profitSharing,
        platformPctByType: {
          ...((current as any).profitSharing?.platformPctByType || {}),
          ...(update.profitSharing.platformPctByType || {}),
        },
      }
    }

    // Basic validation
    if (update.name !== undefined && !update.name) return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 })
    if (update.phone !== undefined && !update.phone) return NextResponse.json({ success: false, error: "Phone is required" }, { status: 400 })

    await ref.update(update)
    const updated = await ref.get()
    return NextResponse.json({ success: true, data: { id: updated.id, ...updated.data() } })
  } catch (error: any) {
    console.error("Error updating CAC officer:", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to update CAC officer" }, { status: 500 })
  }
}


