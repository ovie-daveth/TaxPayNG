import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { createTransporter } from "@/lib/utils/nodemailer"
import { buildWaitlistEmail, WAITLIST_EMAIL_TEMPLATES, type WaitlistTemplateKey } from "@/lib/emails/waitlist-templates"

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
    const { waitlistId, recipientEmail, recipientName, templateKey } = body as {
      waitlistId?: string
      recipientEmail?: string
      recipientName?: string
      templateKey?: WaitlistTemplateKey
    }

    if (!recipientEmail || !templateKey) {
      return NextResponse.json(
        { error: "Recipient email and template key are required" },
        { status: 400 }
      )
    }

    if (!WAITLIST_EMAIL_TEMPLATES[templateKey]) {
      return NextResponse.json({ error: "Invalid template key" }, { status: 400 })
    }

    const transporter = createTransporter()
    if (!transporter) {
      return NextResponse.json(
        { error: "Email service not configured. Please set SMTP credentials." },
        { status: 500 }
      )
    }

    const { subject, body: emailBody } = buildWaitlistEmail(templateKey, {
      name: recipientName,
      email: recipientEmail
    })

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@otax.com"

    await transporter.sendMail({
      from: `"OTax" <${fromEmail}>`,
      to: recipientEmail,
      subject,
      text: emailBody,
      html: emailBody.replace(/\n/g, "<br />")
    })

    let updatedWaitlistDoc: any = null

    if (waitlistId) {
      const waitlistRef = adminDb.collection("waitlist").doc(waitlistId)
      const now = new Date().toISOString()
      await waitlistRef.set(
        {
          notified: true,
          status: templateKey,
          lastNotifiedAt: now,
          lastNotificationTemplate: templateKey,
          updatedAt: now
        },
        { merge: true }
      )

      const snapshot = await waitlistRef.get()
      if (snapshot.exists) {
        updatedWaitlistDoc = {
          id: snapshot.id,
          ...snapshot.data()
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      updatedWaitlist: updatedWaitlistDoc
    })
  } catch (error: any) {
    console.error("Waitlist email send error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    )
  }
}

