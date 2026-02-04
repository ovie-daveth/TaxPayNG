import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, email, metadata } = body

    if (!amount || !email) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      throw new Error("Paystack secret key not configured")
    }

    // Initialize payment with Paystack
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount,
        email,
        metadata,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`
      })
    })

    const data = await response.json()

    if (!response.ok || !data.status) {
      throw new Error(data.message || "Failed to initialize payment")
    }

    return NextResponse.json({
      success: true,
      reference: data.data.reference,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    })
  } catch (error) {
    console.error("Payment initialization error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to initialize payment" 
      },
      { status: 500 }
    )
  }
}
