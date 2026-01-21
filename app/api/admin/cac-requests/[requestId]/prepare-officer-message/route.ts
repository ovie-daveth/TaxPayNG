import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { imagekit } from "@/lib/utils/imagekit-server"
import type { CacOfficer, CacRegistrationType } from "@/lib/types"
import { jsPDF } from "jspdf"

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

function nairaFromKobo(amountKobo: number): number {
  return Math.round(Number(amountKobo || 0) / 100)
}

function computeProfitSplit(args: {
  amountNaira: number
  type: CacRegistrationType
  officer: CacOfficer
}) {
  const { amountNaira, type, officer } = args
  const standardFee = Math.max(0, Number(officer.profitSharing?.standardFeeNaira ?? 0))
  const pct =
    Number(officer.profitSharing?.platformPctByType?.[type] ?? officer.profitSharing?.defaultPlatformPct ?? 0)

  const remainder = Math.max(0, amountNaira - standardFee)
  const pctClamped = Math.max(0, Math.min(100, pct))
  const platformVariable = Math.round((remainder * pctClamped) / 100)
  const platformTake = Math.min(amountNaira, standardFee + platformVariable)
  const officerTake = Math.max(0, amountNaira - platformTake)

  return {
    standardFeeNaira: standardFee,
    platformPct: pctClamped,
    platformTakeNaira: platformTake,
    officerTakeNaira: officerTake,
    computedAt: new Date().toISOString(),
  }
}

function prettyLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function buildPayloadLines(type: CacRegistrationType, payload: any): string[] {
  const p = payload || {}
  const lines: string[] = []

  const add = (label: string, value: any) => {
    const v = String(value ?? "").trim()
    if (!v) return
    lines.push(`${label}: ${v}`)
  }

  if (type === "BUSINESS_NAME") {
    add("Proposed business name", p.proposedBusinessName)
    add("Date of birth", p.dateOfBirth)
    add("Business address", p.businessAddress)
    add("Business LGA", p.businessLga)
    add("Nature of business / objectives", p.businessObjectives)
    lines.push("")
    add("Proprietor full name", p.proprietorFullName)
    add("Proprietor residential address", p.proprietorResidentialAddress)
    add("Proprietor residential LGA", p.proprietorResidentialLga)
    return lines.filter((x) => x !== undefined) as any
  }

  if (type === "LLC") {
    if (Array.isArray(p.proposedNames)) {
      const names = p.proposedNames.map((x: any) => String(x || "").trim()).filter(Boolean)
      if (names.length) lines.push(`Proposed company names: ${names.join(" | ")}`)
    }
    add("Company address", p.companyAddress)
    add("Company LGA", p.companyLga)
    add("Business objectives", p.objectives)
    add("Share capital band", p.shareCapitalBand)
    add("Official email", p.officialEmail)
    lines.push("")
    if (p.witness) {
      lines.push("Witness:")
      add("  Full name", p.witness.fullName)
      add("  Phone", p.witness.phone)
      add("  Email", p.witness.email)
      add("  Occupation", p.witness.occupation)
      add("  Address", p.witness.address)
      add("  LGA", p.witness.lga)
      lines.push("")
    }
    if (Array.isArray(p.directors) && p.directors.length) {
      lines.push("Directors:")
      p.directors.forEach((d: any, idx: number) => {
        lines.push(`  Director ${idx + 1}`)
        add("    Full name", d.fullName)
        add("    Phone", d.phone)
        add("    Email", d.email)
        add("    Occupation", d.occupation)
        add("    Address", d.address)
        add("    LGA", d.lga)
        add("    Date of birth", d.dateOfBirth)
        add("    Shares (optional)", d.shares)
      })
      lines.push("")
    }
    if (Array.isArray(p.shareholders) && p.shareholders.length) {
      lines.push("Shareholders (optional):")
      p.shareholders.forEach((s: any, idx: number) => {
        lines.push(`  Shareholder ${idx + 1}`)
        add("    Full name", s.fullName)
        add("    Phone", s.phone)
        add("    Email", s.email)
        add("    Occupation", s.occupation)
        add("    Address", s.address)
        add("    LGA", s.lga)
        add("    Date of birth", s.dateOfBirth)
        add("    Shares allotted", s.shares)
      })
    } else {
      lines.push("Shareholders (optional): None provided")
    }
    return lines
  }

  // Incorporated trustees
  if (Array.isArray(p.proposedNames)) {
    const names = p.proposedNames.map((x: any) => String(x || "").trim()).filter(Boolean)
    if (names.length) lines.push(`Proposed names: ${names.join(" | ")}`)
  }
  add("Registered address", p.registeredAddress)
  add("Registered LGA", p.registeredLga)
  add("Aims and objectives", p.aimsObjectives)
  add("Official email", p.officialEmail)
  add("Phone", p.phone)
  lines.push("")
  if (Array.isArray(p.trustees) && p.trustees.length) {
    lines.push("Trustees:")
    p.trustees.forEach((t: any, idx: number) => {
      lines.push(`  Trustee ${idx + 1}`)
      add("    Full name", t.fullName)
      add("    Date of birth", t.dateOfBirth)
      add("    Phone", t.phone)
      add("    Email", t.email)
      add("    Occupation", t.occupation)
      add("    Address", t.address)
      add("    LGA", t.lga)
    })
  }
  if (Array.isArray(p.executiveMembers) && p.executiveMembers.length) {
    lines.push("")
    lines.push("Executive members:")
    p.executiveMembers.forEach((m: any) => {
      add(`  ${m.role || "Role"}`, m.fullName)
    })
  }
  return lines
}

function makePdfBase64(args: {
  requestId: string
  type: CacRegistrationType
  createdAt?: string
  contact: { name?: string; email?: string; phone?: string }
  payload: any
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const marginX = 40
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const contentW = pageW - marginX * 2

  let y = 48
  const lineH = 14

  doc.setFontSize(16)
  doc.text("CAC Registration Submission", marginX, y)
  y += 22

  doc.setFontSize(10)
  const metaLines = [
    `Request ID: ${args.requestId}`,
    `Type: ${args.type}`,
    args.createdAt ? `Created: ${args.createdAt}` : "",
    "",
    "Contact:",
    `Name: ${args.contact?.name || ""}`,
    `Email: ${args.contact?.email || ""}`,
    `Phone: ${args.contact?.phone || ""}`,
    "",
    "Form payload:",
    ...buildPayloadLines(args.type, args.payload),
  ].filter((l) => l !== undefined) as string[]

  const pushLine = (text: string) => {
    const chunks = doc.splitTextToSize(text || " ", contentW)
    for (const c of chunks) {
      if (y > pageH - 48) {
        doc.addPage()
        y = 48
      }
      doc.text(String(c), marginX, y)
      y += lineH
    }
  }

  for (const l of metaLines) pushLine(l)

  const uri = doc.output("datauristring")
  return String(uri).split(",")[1] || ""
}

function isRetryableImageKitError(err: any): boolean {
  const msg = String(err?.message || err || "").toLowerCase()
  return (
    msg.includes("eai_again") ||
    msg.includes("enotfound") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("503") ||
    msg.includes("service unavailable")
  )
}

async function uploadPdfWithRetry(args: { base64: string; fileName: string; folder: string; maxAttempts?: number }) {
  const maxAttempts = Math.max(1, Number(args.maxAttempts ?? 3))
  let lastErr: any = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await imagekit.upload({
        file: args.base64,
        fileName: args.fileName,
        folder: args.folder,
        useUniqueFileName: true,
      })
    } catch (e: any) {
      lastErr = e
      if (!isRetryableImageKitError(e) || attempt === maxAttempts) break
      const delayMs = 500 * Math.pow(2, attempt - 1) // 500ms, 1000ms, 2000ms...
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  throw lastErr
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

    const { requestId } = await params
    const body = await request.json().catch(() => ({} as any))
    const officerId = body?.officerId ? String(body.officerId).trim() : ""

    const reqRef = auth.db.collection("cacRequests").doc(requestId)
    const reqSnap = await reqRef.get()
    if (!reqSnap.exists) return NextResponse.json({ success: false, error: "CAC request not found" }, { status: 404 })

    const reqData: any = { id: reqSnap.id, ...reqSnap.data() }

    // Load officer if provided
    let officer: CacOfficer | null = null
    if (officerId) {
      const oSnap = await auth.db.collection("cacOfficers").doc(officerId).get()
      if (!oSnap.exists) return NextResponse.json({ success: false, error: "CAC officer not found" }, { status: 404 })
      const oData = oSnap.data() as any
      officer = { id: oSnap.id, ...oData } as CacOfficer
      if (officer && !officer.isActive) {
        return NextResponse.json({ success: false, error: "Selected officer is inactive" }, { status: 400 })
      }
    }

    let warning: string | null = null

    // Generate summary PDF if missing
    let summary = reqData?.submissionSummary
    if (!summary?.pdfUrl) {
      const base64 = makePdfBase64({
        requestId: reqData.id,
        type: String(reqData.type || "") as CacRegistrationType,
        createdAt: reqData.createdAt,
        contact: { name: reqData.contactName, email: reqData.contactEmail, phone: reqData.contactPhone },
        payload: reqData.payload,
      })

      try {
        const uploadRes = await uploadPdfWithRetry({
          base64,
          fileName: `cac-request-${reqData.id}.pdf`,
          folder: `cac/requests/${reqData.id}`,
          maxAttempts: 3,
        })

        summary = {
          pdfUrl: uploadRes.url,
          pdfFileId: uploadRes.fileId,
          generatedAt: new Date().toISOString(),
        }
      } catch (e: any) {
        // Network/DNS issues to ImageKit shouldn't block officer assignment & messaging.
        console.error("ImageKit upload failed (CAC summary PDF):", e)
        warning =
          "Could not upload the PDF summary (temporary network issue). The WhatsApp message will be generated without the PDF link—please try again later."
        summary = null
      }
    }

    // Compute profit split if officer
    const amountNaira = nairaFromKobo(reqData.amountKobo || 0)
    const profitSplit = officer
      ? computeProfitSplit({ amountNaira, type: String(reqData.type || "") as CacRegistrationType, officer })
      : undefined

    const patch: any = { updatedAt: new Date().toISOString() }
    if (summary?.pdfUrl) patch.submissionSummary = summary
    if (officer) {
      patch.cacOfficerId = officer.id
      patch.cacOfficerName = officer.name
      patch.cacOfficerPhone = officer.phone
      patch.profitSplit = profitSplit
    }

    await reqRef.update(patch)
    const updated = await reqRef.get()

    return NextResponse.json({
      success: true,
      data: {
        request: { id: updated.id, ...updated.data() },
        officer: officer ? { id: officer.id, name: officer.name, phone: officer.phone, email: officer.email } : null,
        summary,
        profitSplit,
        warning,
      },
    })
  } catch (error: any) {
    console.error("Error preparing officer message:", error)
    return NextResponse.json({ success: false, error: error?.message || "Failed to prepare officer message" }, { status: 500 })
  }
}


