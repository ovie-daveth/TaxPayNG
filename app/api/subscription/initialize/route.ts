import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'
import { subscriptionService } from '@/lib/services/subscriptionService'
import { SubscriptionType } from '@/lib/types'
import { getPricingConfigAdmin, getEffectivePlanPriceKobo } from '@/lib/services/pricingConfigService'

// Initialize Paystack
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY

interface InitializeSubscriptionRequest {
  subscriptionType: SubscriptionType
  interval?: 'monthly' | 'yearly' // Default to 'monthly' if not provided
}

export async function POST(request: NextRequest) {
  try {
    // Validate Paystack keys
    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY === 'sk_test_...' || PAYSTACK_SECRET_KEY === 'sk_live_...' || PAYSTACK_SECRET_KEY.trim() === '') {
      console.error('Paystack Secret Key not configured')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Paystack Secret Key not configured. Please set PAYSTACK_SECRET_KEY in your environment variables.' 
        },
        { status: 500 }
      )
    }
    // Get auth token from request
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    let decodedToken
    const adminAuth = getAdminAuth()
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid
    const body: InitializeSubscriptionRequest = await request.json()
    const { subscriptionType, interval = 'monthly' } = body

    if (!subscriptionType || !subscriptionService.getPlan(subscriptionType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription plan' },
        { status: 400 }
      )
    }

    if (interval !== 'monthly' && interval !== 'yearly') {
      return NextResponse.json(
        { success: false, error: 'Invalid interval. Must be "monthly" or "yearly"' },
        { status: 400 }
      )
    }

    const plan = subscriptionService.getPlan(subscriptionType)!
    const pricingConfig = await getPricingConfigAdmin()
    const amount = getEffectivePlanPriceKobo(subscriptionType, interval, pricingConfig) // Amount in kobo based on interval
    
    if (!amount) {
      return NextResponse.json(
        { success: false, error: 'Failed to get plan price' },
        { status: 500 }
      )
    }

    // Get user email for Paystack
    const userRecord = await adminAuth.getUser(userId)
    const userEmail = userRecord.email

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User email not found' },
        { status: 400 }
      )
    }

    // Initialize Paystack payment
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: userEmail,
        amount: amount,
        currency: 'NGN',
        reference: `sub_${Date.now()}_${userId.substring(0, 8)}`,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/subscription/verify`,
        metadata: {
          userId,
          subscriptionType,
          planName: plan.name,
          interval: interval
        }
      })
    })

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json()
      console.error('Paystack error:', errorData)
      return NextResponse.json(
        { success: false, error: errorData.message || 'Failed to initialize payment' },
        { status: 500 }
      )
    }

    const paystackData = await paystackResponse.json()

    if (!paystackData.status || !paystackData.data) {
      return NextResponse.json(
        { success: false, error: 'Invalid response from Paystack' },
        { status: 500 }
      )
    }

    // Create subscription payment record using Admin SDK (bypasses security rules)
    const db = getAdminDb()
    // Calculate expiry date based on interval (will be recalculated in verify route, but set initial value)
    const expiresAt = new Date()
    if (interval === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    }
    
    const subscriptionData = {
      userId,
      subscriptionType,
      interval: interval,
      amount,
      paystackReference: paystackData.data.reference,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    }

    const subscriptionRef = await db.collection('subscriptions').add(subscriptionData)

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: paystackData.data.authorization_url,
        accessCode: paystackData.data.access_code,
        reference: paystackData.data.reference,
        subscriptionId: subscriptionRef.id
      }
    })
  } catch (error) {
    console.error('Error initializing subscription:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    )
  }
}

