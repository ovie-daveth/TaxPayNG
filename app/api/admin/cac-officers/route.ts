import { NextRequest, NextResponse } from "next/server"
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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true"

    // Avoid Firestore composite index requirement (where + orderBy) by sorting in memory.
    // Equality filters alone are fine without extra composite indexes.
    const base = auth.db.collection("cacOfficers")
    const snap = includeInactive
      ? await base.orderBy("createdAt", "desc").get()
      : await (base as any).where("isActive", "==", true).get()

    const rows = snap.docs
      .map((d: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")))
    return NextResponse.json({ success: true, data: rows })
  } catch (error: any) {
    console.error("Error fetching CAC officers:", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to fetch CAC officers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

    const body = await request.json()
    const name = String(body?.name || "").trim()
    const phone = String(body?.phone || "").trim()
    const email = body?.email ? String(body.email).trim() : ""

    const standardFeeNaira = Number(body?.profitSharing?.standardFeeNaira ?? 10_000)
    const businessNamePct = Number(body?.profitSharing?.platformPctByType?.BUSINESS_NAME ?? 5)
    const defaultPlatformPct = Number(body?.profitSharing?.defaultPlatformPct ?? 8)

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: "Name and phone are required" }, { status: 400 })
    }
    if (!Number.isFinite(standardFeeNaira) || standardFeeNaira < 0) {
      return NextResponse.json({ success: false, error: "Invalid standard fee" }, { status: 400 })
    }
    for (const pct of [businessNamePct, defaultPlatformPct]) {
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ success: false, error: "Invalid profit sharing percentage" }, { status: 400 })
      }
    }

    const now = new Date().toISOString()
    const doc: any = {
      name,
      phone,
      isActive: true,
      profitSharing: {
        standardFeeNaira,
        platformPctByType: {
          BUSINESS_NAME: businessNamePct,
        },
        defaultPlatformPct,
      },
      createdAt: now,
      updatedAt: now,
    }
    if (email) doc.email = email

    const ref = await auth.db.collection("cacOfficers").add(doc)
    return NextResponse.json({ success: true, data: { id: ref.id, ...doc } })
  } catch (error: any) {
    console.error("Error creating CAC officer:", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to create CAC officer" }, { status: 500 })
  }
}


