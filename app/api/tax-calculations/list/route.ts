import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"

const auth = getAdminAuth()

/**
 * Get authenticated user ID from request
 */
async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const cookies = request.headers.get("cookie") || ""
    const sessionCookie = cookies.match(/session=([^;]+)/)?.[1]

    if (sessionCookie) {
      const decodedToken = await auth.verifySessionCookie(sessionCookie, true)
      return decodedToken?.uid || null
    }

    const bearer = request.headers.get("authorization")
    const token = bearer?.startsWith("Bearer ") ? bearer.substring(7) : undefined

    if (token) {
      const decodedToken = await auth.verifyIdToken(token, true)
      return decodedToken?.uid || null
    }

    return null
  } catch (error) {
    console.error('Error getting user ID:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const db = getAdminDb()
    
    // Get all calculations for the user, ordered by creation date (newest first)
    const calculationsSnapshot = await db.collection('taxCalculations')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50) // Limit to 50 most recent
      .get()

    const calculations = calculationsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        // Ensure dates are strings
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      data: calculations,
    })
  } catch (error) {
    console.error("Error fetching tax calculations:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch calculations",
      },
      { status: 500 }
    )
  }
}

