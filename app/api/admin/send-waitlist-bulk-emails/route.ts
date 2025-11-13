import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { createTransporter } from "@/lib/utils/nodemailer"
import { buildWaitlistEmail, type WaitlistTemplateKey } from "@/lib/emails/waitlist-templates"

const auth = getAdminAuth()
const adminDb = getAdminDb()

async function getDecodedToken(request: NextRequest) {
  const cookies = request.headers.get("cookie") || ""
  const sessionCookie = cookies.match(/session=([^;]+)/)?.[1]

  if (sessionCookie) {
    return auth.verifySessionCookie(sessionCookie, true)
  }

  const bearer = request.headers.get("authorization")
  const token = bearer?.startsWith("Bearer ") ? bearer.substring(7) : undefined

  if (!token) {
    return null
  }

  return auth.verifyIdToken(token, true)
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

    const isAdmin = await isAdminUser(decodedToken.uid, decodedToken.email)
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { waitlistIds, templateKey } = body as {
      waitlistIds?: string[]
      templateKey?: WaitlistTemplateKey
    }

    if (!templateKey || !Array.isArray(waitlistIds) || waitlistIds.length === 0) {
      return NextResponse.json(
        { error: "Template key and at least one waitlist ID are required" },
        { status: 400 }
      )
    }

    const transporter = createTransporter()
    if (!transporter) {
      return NextResponse.json(
        { error: "Email service not configured. Please set SMTP credentials." },
        { status: 500 }
      )
    }

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@otax.com"
    const now = new Date().toISOString()

    const waitlistDocs = await adminDb.getAll(
      ...waitlistIds.map((id) => adminDb.collection("waitlist").doc(id))
    )

    const results: Array<{ id: string; email?: string; success: boolean; error?: string }> = []

    for (let i = 0; i < waitlistDocs.length; i++) {
      const docSnapshot = waitlistDocs[i]
      const waitlistId = waitlistIds[i]

      if (!docSnapshot.exists) {
        results.push({ id: waitlistId, success: false, error: "Waitlist entry not found" })
        continue
      }

      const data = docSnapshot.data()
      const recipientEmail = data?.email
      const recipientName = data?.name

      if (!recipientEmail) {
        results.push({ id: waitlistId, success: false, error: "Email missing" })
        continue
      }

      const { subject, body: emailBody } = buildWaitlistEmail(templateKey, {
        name: recipientName,
        email: recipientEmail
      })

      try {
        await transporter.sendMail({
          from: `"OTax" <${fromEmail}>`,
          to: recipientEmail,
          subject,
          text: emailBody,
          html: emailBody.replace(/\n/g, "<br />")
        })

        await adminDb.collection("waitlist").doc(waitlistId).set(
          {
            notified: true,
            status: templateKey,
            lastNotifiedAt: now,
            lastNotificationTemplate: templateKey,
            updatedAt: now
          },
          { merge: true }
        )

        results.push({ id: waitlistId, email: recipientEmail, success: true })
      } catch (error: any) {
        console.error(`Bulk email send failed for ${recipientEmail}:`, error)
        results.push({
          id: waitlistId,
          email: recipientEmail,
          success: false,
          error: error.message || "Failed to send email"
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Bulk email operation completed",
      results
    })
  } catch (error: any) {
    console.error("Bulk waitlist email error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send bulk emails" },
      { status: 500 }
    )
  }
}

