import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getAdminDb()
    const now = new Date()
    
    // Calculate dates for warnings and expiry
    const twoDaysFromNow = new Date(now)
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
    
    const twoDaysAgo = new Date(now)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    
    // Get all subscribed users
    const subscribedUsersSnapshot = await db.collection('userProfiles')
      .where('isSubscribe', '==', true)
      .get()

    let expiredCount = 0
    let warningCount = 0

    for (const doc of subscribedUsersSnapshot.docs) {
      const profile = doc.data()
      const expiryDate = profile.subscriptionExpiryDate
      
      if (!expiryDate) {
        continue
      }

      const expiry = new Date(expiryDate)
      const expiryTime = expiry.getTime()
      const nowTime = now.getTime()
      const twoDaysFromNowTime = twoDaysFromNow.getTime()
      const twoDaysAgoTime = twoDaysAgo.getTime()

      // Check if subscription expired more than 2 days ago
      if (expiryTime < twoDaysAgoTime) {
        // Deactivate subscription
        await db.collection('userProfiles').doc(doc.id).update({
          isSubscribe: false,
          updatedAt: now.toISOString()
        })
        expiredCount++
        console.log(`Deactivated subscription for user ${profile.userId} - expired more than 2 days ago`)
      }
      // Check if subscription expires within 2 days (warning before expiry)
      else if (expiryTime <= twoDaysFromNowTime && expiryTime > nowTime) {
        // Set warning flag (we'll check this on the frontend)
        await db.collection('userProfiles').doc(doc.id).update({
          subscriptionWarningShown: false, // Reset warning flag so modal shows again
          updatedAt: now.toISOString()
        })
        warningCount++
        console.log(`Warning set for user ${profile.userId} - expires within 2 days`)
      }
      // Check if subscription expired but within 2 days grace period (warning after expiry)
      else if (expiryTime <= nowTime && expiryTime > twoDaysAgoTime) {
        // Set warning flag for expired but in grace period
        await db.collection('userProfiles').doc(doc.id).update({
          subscriptionWarningShown: false, // Reset warning flag so modal shows again
          updatedAt: now.toISOString()
        })
        warningCount++
        console.log(`Warning set for user ${profile.userId} - expired but within grace period`)
      }
    }

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      warnings: warningCount,
      checked: subscribedUsersSnapshot.size
    })
  } catch (error) {
    console.error('Error checking subscription expiry:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

