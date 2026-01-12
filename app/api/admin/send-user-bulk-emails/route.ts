import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { sendBulkEmails, getEmailServiceName } from "@/lib/utils/email-service"
import { buildUserEmail, type UserTemplateKey } from "@/lib/emails/user-templates"

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
    const { userIds, templateKey } = body as {
      userIds?: string[]
      templateKey?: UserTemplateKey
    }

    if (!templateKey || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "Template key and at least one user ID are required" },
        { status: 400 }
      )
    }

    const fromEmail = process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@otax.com"
    const now = new Date().toISOString()
    const emailService = getEmailServiceName()

    console.log(`📧 Starting bulk user email send using ${emailService}...`)
    console.log(`📊 Total emails to send: ${userIds.length}`)

    // Fetch all user profiles in parallel
    const userDocPromises = userIds.map(async (userId) => {
      const userQuery = await adminDb
        .collection("userProfiles")
        .where("userId", "==", userId)
        .limit(1)
        .get()
      return { userId, doc: userQuery.empty ? null : userQuery.docs[0] }
    })
    const userDocs = await Promise.all(userDocPromises)

    // Prepare email options for batch sending
    const emailOptions: Array<{
      to: string
      subject: string
      html: string
      userId: string
      recipientName?: string
    }> = []

    const results: Array<{ id: string; email?: string; success: boolean; error?: string }> = []

    // Prepare all emails first
    for (const { userId, doc } of userDocs) {
      if (!doc || !doc.exists) {
        results.push({ id: userId, success: false, error: "User profile not found" })
        continue
      }

      const data = doc.data()
      const recipientEmail = data?.email
      const recipientName = data?.name || `${data?.firstName || ''} ${data?.lastName || ''}`.trim() || undefined
      const recipientFirstName = data?.firstName
      const recipientLastName = data?.lastName

      if (!recipientEmail) {
        results.push({ id: userId, success: false, error: "Email missing" })
        continue
      }

      const { subject, body: emailBody } = buildUserEmail(templateKey, {
        name: recipientName,
        firstName: recipientFirstName,
        lastName: recipientLastName,
        email: recipientEmail
      })

      emailOptions.push({
        to: recipientEmail,
        subject,
        html: emailBody.replace(/\n/g, "<br />"),
        userId,
        recipientName
      })
    }

    if (emailOptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No valid email addresses found in user profiles",
        results
      })
    }

    // Send all emails in parallel batches (much faster!)
    console.log(`🚀 Sending ${emailOptions.length} emails in parallel batches...`)
    const startTime = Date.now()
    
    const emailResults = await sendBulkEmails(
      emailOptions.map(opt => ({
        to: opt.to,
        subject: opt.subject,
        html: opt.html,
        from: fromEmail
      })),
      20 // Send 20 emails in parallel at a time
    )

    const sendDuration = Date.now() - startTime
    console.log(`✅ Email sending completed in ${sendDuration}ms (${emailService})`)

    // Update user profiles and collect results
    const updatePromises = emailOptions.map(async (opt, index) => {
      const emailResult = emailResults[index]
      const result = {
        id: opt.userId,
        email: opt.to,
        success: emailResult.success,
        error: emailResult.error
      }

      if (emailResult.success) {
        // Update user profile as emailed
        try {
          const userQuery = await adminDb
            .collection("userProfiles")
            .where("userId", "==", opt.userId)
            .limit(1)
            .get()

          if (!userQuery.empty) {
            await userQuery.docs[0].ref.set(
              {
                lastEmailedAt: now,
                lastEmailTemplate: templateKey,
                updatedAt: now
              },
              { merge: true }
            )
          }
        } catch (updateError) {
          console.error(`Failed to update user profile ${opt.userId}:`, updateError)
        }
      }

      return result
    })

    const finalResults = await Promise.all(updatePromises)
    results.push(...finalResults)

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      success: true,
      message: `Bulk email operation completed: ${successCount} sent, ${failureCount} failed`,
      service: emailService,
      total: results.length,
      successful: successCount,
      failed: failureCount,
      results
    })
  } catch (error: any) {
    console.error("Bulk user email error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send bulk emails" },
      { status: 500 }
    )
  }
}

