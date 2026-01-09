import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { sendBulkEmails, getEmailServiceName } from "@/lib/utils/email-service"
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

    const fromEmail = process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@otax.com"
    const now = new Date().toISOString()
    const emailService = getEmailServiceName()

    console.log(`📧 Starting bulk email send using ${emailService}...`)
    console.log(`📊 Total emails to send: ${waitlistIds.length}`)

    // Fetch all waitlist entries in parallel
    const waitlistDocPromises = waitlistIds.map(id => 
      adminDb.collection("waitlist").doc(id).get()
    )
    const waitlistDocs = await Promise.all(waitlistDocPromises)

    // Prepare email options for batch sending
    const emailOptions: Array<{
      to: string
      subject: string
      html: string
      waitlistId: string
      recipientName?: string
    }> = []

    const results: Array<{ id: string; email?: string; success: boolean; error?: string }> = []

    // Prepare all emails first
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

      emailOptions.push({
        to: recipientEmail,
        subject,
        html: emailBody.replace(/\n/g, "<br />"),
        waitlistId,
        recipientName
      })
    }

    if (emailOptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No valid email addresses found in waitlist entries",
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

    // Update waitlist entries and collect results
    const updatePromises = emailOptions.map(async (opt, index) => {
      const emailResult = emailResults[index]
      const result = {
        id: opt.waitlistId,
        email: opt.to,
        success: emailResult.success,
        error: emailResult.error
      }

      if (emailResult.success) {
        // Update waitlist entry as notified
        try {
          await adminDb.collection("waitlist").doc(opt.waitlistId).set(
            {
              notified: true,
              status: templateKey,
              lastNotifiedAt: now,
              lastNotificationTemplate: templateKey,
              updatedAt: now
            },
            { merge: true }
          )
        } catch (updateError) {
          console.error(`Failed to update waitlist entry ${opt.waitlistId}:`, updateError)
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
    console.error("Bulk waitlist email error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send bulk emails" },
      { status: 500 }
    )
  }
}

