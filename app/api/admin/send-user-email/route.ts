import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { sendEmail } from "@/lib/utils/email-service"
import { buildUserEmail, USER_EMAIL_TEMPLATES, USER_SITE_LINK, type UserTemplateKey } from "@/lib/emails/user-templates"

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
      userId, 
      recipientEmail, 
      recipientName,
      recipientFirstName,
      recipientLastName,
      templateKey,
      customSubject,
      customBody,
      isCustomEmail
    } = body as {
      userId?: string
      recipientEmail?: string
      recipientName?: string
      recipientFirstName?: string
      recipientLastName?: string
      templateKey?: UserTemplateKey
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

    let subject: string
    let emailBody: string

    if (isCustomEmail && customSubject && customBody) {
      // Use custom email
      subject = customSubject.trim()
      emailBody = customBody.trim()
      
      // Replace placeholders in custom email if present
      const displayName = recipientName?.trim() || 
        `${recipientFirstName || ''} ${recipientLastName || ''}`.trim() || 
        "there"
      emailBody = emailBody
        .replace(/\{\{name\}\}/g, displayName)
        .replace(/\{\{siteLink\}\}/g, USER_SITE_LINK)
    } else {
      // Use template
      if (!templateKey) {
        return NextResponse.json(
          { error: "Template key is required when not using custom email" },
          { status: 400 }
        )
      }

      if (!USER_EMAIL_TEMPLATES[templateKey]) {
        return NextResponse.json({ error: "Invalid template key" }, { status: 400 })
      }

      const built = buildUserEmail(templateKey, {
        name: recipientName,
        firstName: recipientFirstName,
        lastName: recipientLastName,
        email: recipientEmail
      })
      subject = built.subject
      emailBody = built.body
    }

    const fromEmail = process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@otax.com"

    const emailResult = await sendEmail({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html: emailBody.replace(/\n/g, "<br />"),
      text: emailBody
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send email" },
        { status: 500 }
      )
    }

    let updatedUserDoc: any = null

    if (userId) {
      try {
        const userQuery = await adminDb
          .collection("userProfiles")
          .where("userId", "==", userId)
          .limit(1)
          .get()

        if (!userQuery.empty) {
          const userRef = userQuery.docs[0].ref
          const now = new Date().toISOString()
          
          // Build update object - only include defined values
          const updateData: any = {
            lastEmailedAt: now,
            updatedAt: now
          }

          // Only set template if using a template (not custom)
          if (templateKey && !isCustomEmail) {
            updateData.lastEmailTemplate = templateKey
          }

          await userRef.set(updateData, { merge: true })

          const snapshot = await userRef.get()
          if (snapshot.exists) {
            updatedUserDoc = {
              id: snapshot.id,
              ...snapshot.data()
            }
          }
        }
      } catch (updateError) {
        console.error("Failed to update user document:", updateError)
        // Don't fail the request if update fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      updatedUser: updatedUserDoc
    })
  } catch (error: any) {
    console.error("User email send error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    )
  }
}

