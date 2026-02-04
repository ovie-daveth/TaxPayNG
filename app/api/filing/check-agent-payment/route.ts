import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get("reportId")
    const userId = searchParams.get("userId")

    if (!reportId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing reportId or userId" },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    
    // Check if there's a successful payment record for this report
    const paymentsSnapshot = await db
      .collection("agentFilingPayments")
      .where("reportId", "==", reportId)
      .where("userId", "==", userId)
      .where("status", "==", "success")
      .limit(1)
      .get()

    const hasPaid = !paymentsSnapshot.empty

    return NextResponse.json({
      success: true,
      hasPaid,
      paymentData: hasPaid ? paymentsSnapshot.docs[0].data() : null
    })
  } catch (error) {
    console.error("Error checking agent payment:", error)
    return NextResponse.json(
      { success: false, error: "Failed to check payment status" },
      { status: 500 }
    )
  }
}
