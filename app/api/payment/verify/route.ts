import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { reference, reportId, userId, purpose } = body

    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Missing payment reference" },
        { status: 400 }
      )
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      throw new Error("Paystack secret key not configured")
    }

    // Verify payment with Paystack
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json"
        }
      }
    )

    const data = await response.json()

    if (!response.ok || !data.status) {
      throw new Error(data.message || "Failed to verify payment")
    }

    const paymentData = data.data

    // Check if payment was successful
    if (paymentData.status !== "success") {
      return NextResponse.json(
        { success: false, error: "Payment not successful" },
        { status: 400 }
      )
    }

    // If this is an agent filing payment, save to agentFilingPayments collection
    if (purpose === "agent_filing_fee" && reportId && userId) {
      const db = getAdminDb()
      
      await db.collection("agentFilingPayments").add({
        userId,
        reportId,
        reference,
        amount: paymentData.amount / 100, // Convert from kobo to naira
        status: "success",
        paymentData: {
          reference: paymentData.reference,
          amount: paymentData.amount,
          currency: paymentData.currency,
          channel: paymentData.channel,
          paidAt: paymentData.paid_at,
          transactionDate: paymentData.transaction_date
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })
    }

    return NextResponse.json({
      success: true,
      payment: {
        reference: paymentData.reference,
        amount: paymentData.amount / 100,
        status: paymentData.status,
        paidAt: paymentData.paid_at
      }
    })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to verify payment" 
      },
      { status: 500 }
    )
  }
}
