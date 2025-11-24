import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { createTransporter } from "@/lib/utils/nodemailer"
import { buildWaitlistEmail, WAITLIST_EMAIL_TEMPLATES, WAITLIST_SITE_LINK, type WaitlistTemplateKey } from "@/lib/emails/waitlist-templates"

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
    const { 
      waitlistId, 
      recipientEmail, 
      recipientName, 
      templateKey,
      customSubject,
      customBody,
      isCustomEmail
    } = body as {
      waitlistId?: string
      recipientEmail?: string
      recipientName?: string
      templateKey?: WaitlistTemplateKey
      customSubject?: string
      customBody?: string
      isCustomEmail?: boolean
    }

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
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

    let subject: string
    let emailBody: string

    if (isCustomEmail && customSubject && customBody) {
      // Use custom email
      subject = customSubject.trim()
      emailBody = customBody.trim()
      
      // Replace placeholders in custom email if present
      const displayName = recipientName?.trim() || "there"
      emailBody = emailBody
        .replace(/\{\{name\}\}/g, displayName)
        .replace(/\{\{siteLink\}\}/g, WAITLIST_SITE_LINK)
    } else {
      // Use template
      if (!templateKey) {
        return NextResponse.json(
          { error: "Template key is required when not using custom email" },
          { status: 400 }
        )
      }

      if (!WAITLIST_EMAIL_TEMPLATES[templateKey]) {
        return NextResponse.json({ error: "Invalid template key" }, { status: 400 })
      }

      const built = buildWaitlistEmail(templateKey, {
        name: recipientName,
        email: recipientEmail
      })
      subject = built.subject
      emailBody = built.body
    }

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
      
      // Build update object - only include defined values
      const updateData: any = {
        notified: true,
        lastNotifiedAt: now,
        updatedAt: now
      }

      // Only set status and template if using a template (not custom)
      if (templateKey && !isCustomEmail) {
        updateData.status = templateKey
        updateData.lastNotificationTemplate = templateKey
      } else if (isCustomEmail) {
        // For custom emails, use manualNotification status
        updateData.status = "manualNotification"
      }

      await waitlistRef.set(updateData, { merge: true })

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

