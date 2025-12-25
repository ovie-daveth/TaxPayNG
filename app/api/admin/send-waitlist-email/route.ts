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
      isCustomEmail,
      images
    } = body as {
      waitlistId?: string
      recipientEmail?: string
      recipientName?: string
      templateKey?: WaitlistTemplateKey
      customSubject?: string
      customBody?: string
      isCustomEmail?: boolean
      images?: Array<{ base64: string; filename: string; contentType: string }>
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

    // Convert email body to HTML (escape HTML to prevent XSS)
    const escapeHtml = (text: string) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }
      return text.replace(/[&<>"']/g, (m) => map[m])
    }
    
    // Prepare attachments and image references for CID
    const attachments: Array<{
      filename: string
      content: Buffer
      cid: string
      contentType?: string
    }> = []
    
    // Map to store image index to CID mapping
    const imageCidMap: Record<number, string> = {}
    
    // Process images and create attachments
    if (images && images.length > 0) {
      images.forEach((image, index) => {
        // Extract base64 data (remove data:image/...;base64, prefix if present)
        let base64Data = image.base64
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1]
        }
        
        // Create unique CID for each image
        const cid = `image-${index}-${Date.now()}@email`
        imageCidMap[index] = cid
        
        // Convert base64 to Buffer for nodemailer
        const imageBuffer = Buffer.from(base64Data, 'base64')
        
        // Add as attachment with CID
        attachments.push({
          filename: image.filename,
          content: imageBuffer,
          cid: cid,
          contentType: image.contentType || 'image/jpeg'
        })
      })
    }
    
    // Replace image placeholders in the email body with actual image HTML
    let processedBody = emailBody
    const imagePlaceholderRegex = /\{\{image:(\d+)\}\}/g
    
    processedBody = processedBody.replace(imagePlaceholderRegex, (match, imageIndex) => {
      const index = parseInt(imageIndex, 10)
      if (imageCidMap[index] !== undefined && images && images[index]) {
        const cid = imageCidMap[index]
        const safeFilename = escapeHtml(images[index].filename)
        // Return placeholder that will be converted to HTML
        return `{{IMAGE_PLACEHOLDER:${cid}:${safeFilename}}}`
      }
      // If image index is invalid, remove the placeholder
      return ''
    })
    
    // Convert to HTML (escape HTML and convert newlines)
    const escapedBody = escapeHtml(processedBody).replace(/\n/g, "<br />")
    
    // Replace image placeholders with actual HTML img tags
    let htmlBodyContent = escapedBody.replace(/\{\{IMAGE_PLACEHOLDER:([^:]+):([^}]+)\}\}/g, (match, cid, alt) => {
      return `<div style="margin: 5px 0; text-align: center;">
        <img src="cid:${cid}" alt="${alt}" style="width: 100%; height: auto; border-radius: 8px; display: block; margin: 0 auto;" />
      </div>`
    })
    
    // Build HTML body
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; padding: 10px; border-radius: 8px;">
    <div style="white-space: pre-wrap;">${htmlBodyContent}</div>
  </div>
</body>
</html>`

    await transporter.sendMail({
      from: `"OTax" <${fromEmail}>`,
      to: recipientEmail,
      subject,
      text: emailBody,
      html: htmlBody,
      attachments: attachments.length > 0 ? attachments : undefined
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

