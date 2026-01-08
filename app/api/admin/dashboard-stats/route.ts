import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

const adminAuth = getAdminAuth()
const adminDb = getAdminDb()

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

    // Check hardcoded admin emails
    const ADMIN_EMAILS = ["oviedavid77@gmail.com"]
    if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
      return true
    }
  } catch (error) {
    console.error("Failed to verify admin role:", error)
    return false
  }

  return false
}

export async function GET(request: NextRequest) {
  try {
    const decodedToken = await getDecodedToken(request)
    if (!decodedToken?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if requester is admin
    const requesterIsAdmin = await isAdminUser(decodedToken.uid, decodedToken.email)
    if (!requesterIsAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    // Fetch all stats using Admin SDK (bypasses Firestore rules)
    const [
      usersSnapshot,
      transactionsSnapshot,
      blogPostsSnapshot,
      waitlistSnapshot,
      taxCalculationsSnapshot
    ] = await Promise.all([
      adminDb.collection("userProfiles").get(),
      adminDb.collection("transactions").get(),
      adminDb.collection("blogPosts").orderBy("publishedAt", "desc").get(),
      adminDb.collection("waitlist").get(),
      adminDb.collection("taxCalculations").get()
    ])

    // Get recent users
    const recentUsersSnapshot = await adminDb
      .collection("userProfiles")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get()

    // Get recent transactions
    const recentTransactionsSnapshot = await adminDb
      .collection("transactions")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get()

    // Get all users for charts (limited to 20)
    const allUsersSnapshot = await adminDb
      .collection("userProfiles")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get()

    // Get all transactions for charts
    const allTransactionsSnapshot = await adminDb
      .collection("transactions")
      .orderBy("createdAt", "desc")
      .get()

    const stats = {
      totalUsers: usersSnapshot.size,
      totalTransactions: transactionsSnapshot.size,
      totalBlogPosts: blogPostsSnapshot.size,
      totalWaitlist: waitlistSnapshot.size,
      recentUsers: recentUsersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })),
      recentTransactions: recentTransactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    }

    const allUsers = allUsersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    const allTransactions = allTransactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    const allTaxCalculations = taxCalculationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json({
      success: true,
      stats,
      allUsers,
      allTransactions,
      allTaxCalculations
    })
  } catch (error: any) {
    console.error("Admin dashboard stats error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}

