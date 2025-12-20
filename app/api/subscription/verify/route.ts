import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { subscriptionService } from '@/lib/services/subscriptionService'
import { userService } from '@/lib/services/userService'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

export async function GET(request: NextRequest) {
  try {
    // Validate Paystack key
    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY === 'sk_test_...' || PAYSTACK_SECRET_KEY === 'sk_live_...' || PAYSTACK_SECRET_KEY.trim() === '') {
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
      let businessType = profileData?.businessType // Get business type before updating
      
      // If user subscribes to GOLD or PLATINUM, ensure businessType is 'creator'
      if ((subscriptionType === 'GOLD' || subscriptionType === 'PLATINUM') && businessType !== 'creator') {
        businessType = 'creator'
        console.log(`Updating businessType to 'creator' for user ${userId} subscribing to ${subscriptionType}`)
      }
      
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

      // Calculate subscription expiry
      const now = new Date()
      let expiryDate = new Date(now)
      
      // If user has an existing subscription that hasn't expired yet, start new subscription from that expiry date
      // Otherwise, start from today
      if (profileData?.subscriptionExpiryDate && profileData.isSubscribe) {
        const existingExpiry = new Date(profileData.subscriptionExpiryDate)
        // Only extend from existing expiry if it's in the future
        if (existingExpiry > now) {
          expiryDate = new Date(existingExpiry)
        }
      }
      
      // Add 31 days to the start date
      expiryDate.setDate(expiryDate.getDate() + 31)
      
      // Check if this is a first-time subscription or renewal
      const isFirstSubscription = !profileData?.subscriptionStartDate
      const renewalCount = (profileData?.renewalCount || 0) + (isFirstSubscription ? 0 : 1)
      
      // Update user profile with subscription and businessType (if changed)
      const updateData: any = {
        isSubscribe: true,
        subscriptionType: subscriptionType,
        subscriptionExpiryDate: expiryDate.toISOString(),
        lastSubscriptionDate: now.toISOString(),
        renewalCount: renewalCount,
        storageLimit: getStorageLimit(subscriptionType),
        updatedAt: now.toISOString()
      }
      
      // Set subscriptionStartDate if this is first subscription
      if (isFirstSubscription) {
        updateData.subscriptionStartDate = now.toISOString()
      }
      
      // Update businessType if it changed
      if ((subscriptionType === 'GOLD' || subscriptionType === 'PLATINUM') && profileData?.businessType !== 'creator') {
        updateData.businessType = 'creator'
      }
      
      await db.collection('userProfiles').doc(profileDoc.id).update(updateData)

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
          const profileData = profileDoc.data()
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

          // Calculate subscription expiry
          const now = new Date()
          let expiryDate = new Date(now)
          
          // If user has an existing subscription that hasn't expired yet, start new subscription from that expiry date
          // Otherwise, start from today
          if (profileData?.subscriptionExpiryDate && profileData.isSubscribe) {
            const existingExpiry = new Date(profileData.subscriptionExpiryDate)
            // Only extend from existing expiry if it's in the future
            if (existingExpiry > now) {
              expiryDate = new Date(existingExpiry)
            }
          }
          
          // Add 31 days to the start date
          expiryDate.setDate(expiryDate.getDate() + 31)
          
          // Check if this is a first-time subscription or renewal
          const isFirstSubscription = !profileData?.subscriptionStartDate
          const renewalCount = (profileData?.renewalCount || 0) + (isFirstSubscription ? 0 : 1)
          
          const updateData: any = {
            isSubscribe: true,
            subscriptionType: subscriptionType,
            subscriptionExpiryDate: expiryDate.toISOString(),
            lastSubscriptionDate: now.toISOString(),
            renewalCount: renewalCount,
            storageLimit: getStorageLimit(subscriptionType),
            updatedAt: now.toISOString()
          }
          
          // Set subscriptionStartDate if this is first subscription
          if (isFirstSubscription) {
            updateData.subscriptionStartDate = now.toISOString()
          }
          
          // If user subscribes to GOLD or PLATINUM, ensure businessType is 'creator'
          if ((subscriptionType === 'GOLD' || subscriptionType === 'PLATINUM') && profileData?.businessType !== 'creator') {
            updateData.businessType = 'creator'
            console.log(`Updating businessType to 'creator' for user ${userId} subscribing to ${subscriptionType} (webhook)`)
          }

          await db.collection('userProfiles').doc(profileDoc.id).update(updateData)
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

