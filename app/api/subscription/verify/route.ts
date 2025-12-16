import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { subscriptionService } from '@/lib/services/subscriptionService'
import { userService } from '@/lib/services/userService'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function GET(request: NextRequest) {
  try {
    // Validate Paystack key
    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY === 'sk_test_...' || PAYSTACK_SECRET_KEY.startsWith('sk_test_...')) {
      console.error('Paystack Secret Key not configured')
      return NextResponse.redirect(
        new URL(
          '/dashboard/settings?tab=subscription&error=config_error&message=' + encodeURIComponent('Paystack Secret Key not configured. Please set PAYSTACK_SECRET_KEY in your environment variables.'),
          request.url
        )
      )
    }
    const searchParams = request.nextUrl.searchParams
    // Paystack sends both 'reference' and 'trxref' - use either one
    const reference = searchParams.get('reference') || searchParams.get('trxref')

    if (!reference) {
      console.error('Missing reference parameter in callback URL')
      return NextResponse.redirect(
        new URL('/dashboard/settings?tab=subscription&error=missing_reference', request.url)
      )
    }

    // Verify payment with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json()
      console.error('Paystack verification error:', errorData)
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?tab=subscription&error=verification_failed&message=${encodeURIComponent(errorData.message || 'Payment verification failed')}`,
          request.url
        )
      )
    }

    const paystackData = await paystackResponse.json()

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?tab=subscription&error=payment_failed&message=${encodeURIComponent(paystackData.data.gateway_response || 'Payment was not successful')}`,
          request.url
        )
      )
    }

    // Get subscription payment record using Admin SDK
    const db = getAdminDb()
    const subscriptionsSnapshot = await db.collection('subscriptions')
      .where('paystackReference', '==', reference)
      .get()

    if (subscriptionsSnapshot.empty) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/settings?tab=subscription&error=subscription_not_found',
          request.url
        )
      )
    }

    const subscriptionDoc = subscriptionsSnapshot.docs[0]
    const subscription = subscriptionDoc.data()
    const subscriptionId = subscriptionDoc.id
    const userId = subscription.userId
    const subscriptionType = subscription.subscriptionType

    // Update subscription status to success using Admin SDK
    await db.collection('subscriptions').doc(subscriptionId).update({
      status: 'success',
      updatedAt: new Date().toISOString()
    })

    // Activate user subscription using Admin SDK
    try {
      // Get user profile
      const userProfilesSnapshot = await db.collection('userProfiles')
        .where('userId', '==', userId)
        .limit(1)
        .get()

      if (userProfilesSnapshot.empty) {
        throw new Error('User profile not found')
      }

      const profileDoc = userProfilesSnapshot.docs[0]
      const profileData = profileDoc.data()
      const businessType = profileData?.businessType // Get business type before updating
      
      // Get storage limit based on subscription type
      const getStorageLimit = (type: string): number => {
        switch (type) {
          case 'PRO': return 500 * 1024 * 1024 // 500MB
          case 'GOLD': return 2 * 1024 * 1024 * 1024 // 2GB
          case 'PLATINUM': return 10 * 1024 * 1024 * 1024 // 10GB
          case 'Small Business': return 15 * 1024 * 1024 * 1024 // 15GB
          case 'Big Business': return 50 * 1024 * 1024 * 1024 // 50GB
          default: return 500 * 1024 * 1024 // Default 500MB
        }
      }

      // Update user profile with subscription
      await db.collection('userProfiles').doc(profileDoc.id).update({
        isSubscribe: true,
        subscriptionType: subscriptionType,
        storageLimit: getStorageLimit(subscriptionType),
        updatedAt: new Date().toISOString()
      })

      // Redirect based on business type
      const baseUrl = new URL(request.url).origin
      if (businessType === 'creator') {
        return NextResponse.redirect(
          `${baseUrl}/dashboard-creator?subscription=success&plan=${encodeURIComponent(subscriptionType)}`
        )
      } else {
        return NextResponse.redirect(
          `${baseUrl}/dashboard?subscription=success&plan=${encodeURIComponent(subscriptionType)}`
        )
      }
    } catch (error) {
      console.error('Failed to activate subscription:', error)
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?tab=subscription&error=activation_failed&message=${encodeURIComponent(error instanceof Error ? error.message : 'Failed to activate subscription')}`,
          request.url
        )
      )
    }
  } catch (error) {
    console.error('Error verifying subscription:', error)
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?tab=subscription&error=unknown&message=${encodeURIComponent(error instanceof Error ? error.message : 'An unknown error occurred')}`,
        request.url
      )
    )
  }
}

// Handle Paystack webhook (for production)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const event = body.event
    const data = body.data

    // Verify webhook signature (in production, verify Paystack signature)
    // For now, we'll process the event

    if (event === 'charge.success') {
      const reference = data.reference

      // Get subscription payment record using Admin SDK
      const db = getAdminDb()
      const subscriptionsSnapshot = await db.collection('subscriptions')
        .where('paystackReference', '==', reference)
        .get()

      if (!subscriptionsSnapshot.empty) {
        const subscriptionDoc = subscriptionsSnapshot.docs[0]
        const subscription = subscriptionDoc.data()
        const subscriptionId = subscriptionDoc.id
        const userId = subscription.userId
        const subscriptionType = subscription.subscriptionType

        // Update subscription status using Admin SDK
        await db.collection('subscriptions').doc(subscriptionId).update({
          status: 'success',
          updatedAt: new Date().toISOString()
        })

        // Activate user subscription using Admin SDK
        const userProfilesSnapshot = await db.collection('userProfiles')
          .where('userId', '==', userId)
          .limit(1)
          .get()

        if (!userProfilesSnapshot.empty) {
          const profileDoc = userProfilesSnapshot.docs[0]
          const getStorageLimit = (type: string): number => {
            switch (type) {
              case 'PRO': return 500 * 1024 * 1024
              case 'GOLD': return 2 * 1024 * 1024 * 1024
              case 'PLATINUM': return 10 * 1024 * 1024 * 1024
              case 'Small Business': return 15 * 1024 * 1024 * 1024
              case 'Big Business': return 50 * 1024 * 1024 * 1024
              default: return 500 * 1024 * 1024
            }
          }

          await db.collection('userProfiles').doc(profileDoc.id).update({
            isSubscribe: true,
            subscriptionType: subscriptionType,
            storageLimit: getStorageLimit(subscriptionType),
            updatedAt: new Date().toISOString()
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

