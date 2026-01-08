import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { createTransporter } from "@/lib/utils/nodemailer"
import crypto from "crypto"

const adminAuth = getAdminAuth()
const adminDb = getAdminDb()

/**
 * Generate a random secure password
 */
function generateRandomPassword(): string {
  // Generate a 12-character password with uppercase, lowercase, numbers, and special chars
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const numbers = "0123456789"
  const special = "!@#$%^&*"
  const allChars = uppercase + lowercase + numbers + special

  let password = ""
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  // Fill the rest randomly
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle the password
  return password.split("").sort(() => Math.random() - 0.5).join("")
}

/**
 * Send signup notification email with credentials
 */
async function sendSignupEmail(
  email: string,
  name: string,
  password: string
): Promise<boolean> {
  const transporter = createTransporter()
  if (!transporter) {
    console.error("❌ Email service not configured")
    return false
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://taxpayng.com"
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@taxpayng.com"

  const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to OTax</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Welcome to OTax! 🎉</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! Your OTax account has been created. You can now access the platform and start managing your taxes.
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #667eea;">Your Login Credentials:</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 4px; font-family: monospace;">${password}</code></p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${appUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Login to OTax
      </a>
    </div>
    
    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⚠️ Important:</strong> For security reasons, please change your password after your first login. You can do this in your account settings.
      </p>
    </div>
    
    <p style="font-size: 16px; margin-top: 30px;">
      You're starting with a <strong>7-day free trial</strong> to explore all features. Enjoy!
    </p>
    
    <p style="font-size: 16px; margin-top: 20px;">
      If you have any questions, feel free to reach out to our support team.
    </p>
    
    <p style="font-size: 16px; margin-top: 30px;">
      Best regards,<br>
      <strong>The OTax Team</strong>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>This is an automated email. Please do not reply to this message.</p>
  </div>
</body>
</html>
  `.trim()

  const textTemplate = `
Welcome to OTax! 🎉

Hi ${name},

Great news! Your OTax account has been created. You can now access the platform and start managing your taxes.

Your Login Credentials:
Email: ${email}
Password: ${password}

Login here: ${appUrl}/login

⚠️ Important: For security reasons, please change your password after your first login. You can do this in your account settings.

You're starting with a 7-day free trial to explore all features. Enjoy!

If you have any questions, feel free to reach out to our support team.

Best regards,
The OTax Team

---
This is an automated email. Please do not reply to this message.
  `.trim()

  try {
    const info = await transporter.sendMail({
      from: `"OTax" <${fromEmail}>`,
      to: email,
      subject: "Welcome to OTax - Your Account is Ready!",
      text: textTemplate,
      html: htmlTemplate,
    })

    console.log("✅ Signup email sent successfully:", info.messageId)
    return true
  } catch (error: any) {
    console.error("❌ Failed to send signup email:", error)
    return false
  }
}

async function getDecodedToken(request: NextRequest) {
  const cookies = request.headers.get("cookie") || ""
  const sessionCookie = cookies.match(/session=([^;]+)/)?.[1]

  if (sessionCookie) {
    return adminAuth.verifySessionCookie(sessionCookie, true)
  }

  const bearer = request.headers.get("authorization")
  const token = bearer?.startsWith("Bearer ") ? bearer.substring(7) : undefined

  if (!token) {
    return null
  }

  return adminAuth.verifyIdToken(token, true)
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
    const { waitlistId } = body as { waitlistId: string }

    if (!waitlistId) {
      return NextResponse.json(
        { error: "Waitlist ID is required" },
        { status: 400 }
      )
    }

    // Get waitlist entry
    const waitlistDoc = await adminDb.collection("waitlist").doc(waitlistId).get()
    if (!waitlistDoc.exists) {
      return NextResponse.json(
        { error: "Waitlist entry not found" },
        { status: 404 }
      )
    }

    const waitlistData = waitlistDoc.data()
    const email = waitlistData?.email?.toLowerCase().trim()
    const name = waitlistData?.name || "User"
    const userType = waitlistData?.userType || "freelancer"
    const phone = waitlistData?.phone || ""

    if (!email) {
      return NextResponse.json(
        { error: "Email not found in waitlist entry" },
        { status: 400 }
      )
    }

    // Check if user already exists
    try {
      const existingUser = await adminAuth.getUserByEmail(email)
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      )
    } catch (error: any) {
      // User doesn't exist, which is what we want
      if (error.code !== "auth/user-not-found") {
        throw error
      }
    }

    // Generate random password
    const password = generateRandomPassword()

    // Split name into first and last name
    const nameParts = name.trim().split(" ")
    const firstName = nameParts[0] || name
    const lastName = nameParts.slice(1).join(" ") || ""

    // Create Firebase Auth user
    let userRecord
    try {
      userRecord = await adminAuth.createUser({
        email: email,
        password: password,
        displayName: name,
        emailVerified: true, // Mark as verified since they're from waitlist
      })
    } catch (error: any) {
      console.error("Error creating Firebase Auth user:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create user account" },
        { status: 500 }
      )
    }

    // Format phone number if provided
    let formattedPhone: string | undefined = undefined
    if (phone && phone.trim() !== "") {
      let cleaned = phone.replace(/\s/g, "")
      if (cleaned.startsWith("0")) {
        formattedPhone = "+234" + cleaned.substring(1)
      } else if (!cleaned.startsWith("+")) {
        formattedPhone = "+234" + cleaned
      } else {
        formattedPhone = cleaned
      }
    }

    // Set up free trial (7 days from now)
    const now = new Date()
    const freeTrialEndDate = new Date(now)
    freeTrialEndDate.setDate(freeTrialEndDate.getDate() + 7)

    // Create user profile
    const userProfileData = {
      userId: userRecord.uid,
      email: email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: formattedPhone || "",
      businessType: userType || "freelancer",
      role: "user",
      freeTrialStartDate: now.toISOString(),
      freeTrialEndDate: freeTrialEndDate.toISOString(),
      freeTrialUsed: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      // Mark as signed up from waitlist
      signedUpFromWaitlist: true,
      waitlistId: waitlistId,
    }

    await adminDb.collection("userProfiles").add(userProfileData)

    // Send email with credentials
    const emailSent = await sendSignupEmail(email, name, password)

    // Update waitlist entry to mark as signed up
    await adminDb.collection("waitlist").doc(waitlistId).update({
      signedUp: true,
      signedUpAt: now.toISOString(),
      signedUpBy: decodedToken.uid,
      userId: userRecord.uid,
      updatedAt: now.toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: emailSent
        ? "User signed up successfully and email sent"
        : "User signed up successfully but email failed to send",
      userId: userRecord.uid,
      emailSent,
    })
  } catch (error: any) {
    console.error("Signup waitlist user error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sign up user" },
      { status: 500 }
    )
  }
}

