import { NextRequest, NextResponse } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin"
import { calculateNigerianTax } from "@/lib/tax-calculator"

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

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      businessType,
      period,
      income,
      rentPaid,
      pensionContribution,
      healthInsurance,
      housingFund,
      lifeInsurance,
      charitableDonations,
      businessExpenses,
      dependents,
      result,
      incomeBreakdown,
      businessExpensesBreakdown,
      creatorExpensesBreakdown,
    } = body

    // Validate required fields
    if (!businessType || !period || income === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Prepare calculation data
    const calculationData = {
      businessType,
      period,
      income: Number(income) || 0,
      rentPaid: Number(rentPaid) || 0,
      pensionContribution: Number(pensionContribution) || 0,
      healthInsurance: Number(healthInsurance) || 0,
      housingFund: Number(housingFund) || 0,
      lifeInsurance: Number(lifeInsurance) || 0,
      charitableDonations: Number(charitableDonations) || 0,
      businessExpenses: Number(businessExpenses) || 0,
      dependents: Number(dependents) || 0,
    }

    // Calculate tax using the existing calculator
    const taxResult = calculateNigerianTax(calculationData)

    // Prepare the calculation document
    const calculationDoc = {
      userId,
      ...calculationData,
      result: {
        ...taxResult,
        // Merge with provided result if available
        ...(result || {}),
      },
      // Add breakdowns if provided
      ...(incomeBreakdown && { incomeBreakdown }),
      ...(businessExpensesBreakdown && { businessExpensesBreakdown }),
      ...(creatorExpensesBreakdown && { creatorExpensesBreakdown }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Use Admin SDK to save to Firestore
    const db = getAdminDb()
    const calculationRef = await db.collection('taxCalculations').add(calculationDoc)

    // Get the created document
    const createdDoc = await calculationRef.get()
    const createdData = createdDoc.data()

    return NextResponse.json({
      success: true,
      data: {
        id: calculationRef.id,
        ...createdData,
      },
      message: "Tax calculation saved successfully",
    })
  } catch (error) {
    console.error("Error saving tax calculation:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save calculation",
      },
      { status: 500 }
    )
  }
}

