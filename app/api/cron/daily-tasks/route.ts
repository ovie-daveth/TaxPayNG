import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

/**
 * Unified cron job that handles both:
 * 1. Checking and sending reminder emails
 * 2. Checking subscription expiry and deactivating expired subscriptions
 * 
 * This runs daily to handle both tasks efficiently
 * 
 * GET /api/cron/daily-tasks?secret=YOUR_SECRET
 * 
 * Setup with External Cron Service (cron-job.org):
 * 
 * 1. Go to https://cron-job.org and create a free account
 * 2. Create a new cron job with these settings:
 *    - URL: https://yourdomain.com/api/cron/daily-tasks?secret=YOUR_SECRET
 *    - Schedule: Daily at 4:00 AM (or your preferred time)
 *    - Method: GET
 *    - Timezone: Your preferred timezone (e.g., UTC, Africa/Lagos)
 * 
 * 3. Recommended schedule: "0 4 * * *" (Daily at 4 AM)
 * 
 * Security:
 * - Set CRON_SECRET in your .env.local file
 * - Use the same secret in the cron job URL
 * - This prevents unauthorized access to your cron endpoint
 * 
 * Example URL:
 * https://yourdomain.com/api/cron/daily-tasks?secret=your_random_secret_key_here
 */
export async function GET(request: NextRequest) {
  const results = {
    reminders: {
      success: false,
      sent: 0,
      failed: 0,
      errors: [] as string[],
      message: ''
    },
    subscriptions: {
      success: false,
      expired: 0,
      warnings: 0,
      checked: 0,
      message: ''
    }
  }

  try {
    // Optional: Add secret key for security
    const secret = request.nextUrl.searchParams.get('secret')
    const expectedSecret = process.env.CRON_SECRET
    
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let db
    try {
      db = getAdminDb()
    } catch (error: any) {
      console.error('❌ Error initializing Firestore admin:', error)
      return NextResponse.json(
        { error: 'Failed to initialize database', details: error.message },
        { status: 500 }
      )
    }

    // ============================================
    // TASK 1: CHECK AND SEND REMINDERS
    // ============================================
    try {
      console.log('📅 Starting reminder check...')
      const now = new Date()
      
      // Get reminders that are due within the next 24 hours and haven't been sent yet
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const nowISO = now.toISOString()
      const tomorrowISO = tomorrow.toISOString()
      
      // Query only incomplete reminders to avoid composite index requirement
      let remindersSnapshot
      try {
        remindersSnapshot = await db.collection('reminders')
          .where('isCompleted', '==', false)
          .get()
      } catch (error: any) {
        console.error('❌ Error querying reminders:', error)
        results.reminders.message = `Failed to query reminders: ${error.message}`
        throw error
      }

      const remindersToSend: Array<{ id: string; data: any }> = []
      
      console.log(`📅 Checking reminders: Now=${nowISO}, Tomorrow=${tomorrowISO}`)
      console.log(`📋 Found ${remindersSnapshot.size} incomplete reminders`)
      
      remindersSnapshot.forEach(doc => {
        const data = doc.data()
        const dueDate = data.dueDate
        
        if (!dueDate) {
          console.log(`⚠️ Reminder ${doc.id} has no dueDate`)
          return // Skip if no due date
        }
        
        if (data.emailSent) {
          console.log(`✅ Reminder ${doc.id} already sent`)
          return // Skip if already sent
        }
        
        // Normalize dueDate to ISO string format
        let dueDateISO: string
        try {
          // Handle Firestore Timestamp objects
          if (dueDate && typeof dueDate === 'object') {
            // Check if it's a Firestore Timestamp (has seconds property)
            if ('seconds' in dueDate || '_seconds' in dueDate) {
              const seconds = (dueDate as any).seconds || (dueDate as any)._seconds || 0
              const nanoseconds = (dueDate as any).nanoseconds || (dueDate as any)._nanoseconds || 0
              // Convert Firestore Timestamp to JavaScript Date
              const timestamp = seconds * 1000 + nanoseconds / 1000000
              const dateObj = new Date(timestamp)
              dueDateISO = dateObj.toISOString()
            } else if (dueDate instanceof Date) {
              // Already a Date object
              dueDateISO = dueDate.toISOString()
            } else {
              // Try to convert object to Date
              const dateObj = new Date(dueDate as any)
              if (isNaN(dateObj.getTime())) {
                throw new Error('Invalid date object')
              }
              dueDateISO = dateObj.toISOString()
            }
          } else if (typeof dueDate === 'string') {
            if (dueDate.includes('T')) {
              // Already has time component (ISO string)
              dueDateISO = dueDate
            } else {
              // Date only - treat as start of day (00:00:00) in local timezone
              const [year, month, day] = dueDate.split('-').map(Number)
              const dateOnly = new Date(year, month - 1, day, 0, 0, 0, 0)
              dueDateISO = dateOnly.toISOString()
            }
          } else {
            // Try to convert to Date
            const dateObj = new Date(dueDate as any)
            if (isNaN(dateObj.getTime())) {
              throw new Error('Invalid date value')
            }
            dueDateISO = dateObj.toISOString()
          }
          
          console.log(`🔍 Checking reminder ${doc.id}: dueDate=${dueDate}, normalized=${dueDateISO}, title=${data.title}`)
          
          // Filter in memory:
          // 1. Due date is between now and tomorrow
          // 2. Email hasn't been sent yet
          if (dueDateISO >= nowISO && dueDateISO <= tomorrowISO) {
            console.log(`✅ Reminder ${doc.id} is due - adding to send list`)
            remindersToSend.push({ id: doc.id, data: { ...data, dueDate: dueDateISO } })
          } else {
            console.log(`⏭️ Reminder ${doc.id} is not due yet (${dueDateISO} is outside ${nowISO} - ${tomorrowISO})`)
          }
        } catch (error) {
          console.error(`❌ Error normalizing date for reminder ${doc.id}:`, error, 'dueDate:', dueDate)
          return // Skip this reminder if date parsing fails
        }
      })
      
      console.log(`📧 Total reminders to send: ${remindersToSend.length}`)

      if (remindersToSend.length > 0) {
        // Get user profiles for all reminders
        const userIds = [...new Set(remindersToSend.map(r => r.data.userId))]
        const userProfiles = new Map()
        
        for (const userId of userIds) {
          try {
            // Query userProfiles collection by userId field (not document ID)
            const profilesSnapshot = await db.collection('userProfiles')
              .where('userId', '==', userId)
              .limit(1)
              .get()
            
            if (!profilesSnapshot.empty) {
              const profileDoc = profilesSnapshot.docs[0]
              const profile = { id: profileDoc.id, ...profileDoc.data() }
              userProfiles.set(userId, profile)
            }
          } catch (error) {
            console.error(`Error fetching profile for user ${userId}:`, error)
          }
        }

        // Send emails for each reminder
        for (const reminder of remindersToSend) {
          try {
            const profile = userProfiles.get(reminder.data.userId)
            if (!profile || !profile.email) {
              results.reminders.failed++
              results.reminders.errors.push(`No email found for user ${reminder.data.userId}`)
              continue
            }

            // Check user's notification preferences
            const emailNotificationsEnabled = profile.preferences?.emailNotifications ?? (profile.preferences?.notifications ?? true)
            
            if (!emailNotificationsEnabled) {
              console.log(`⏭️ Skipping reminder ${reminder.id} - email notifications disabled for user ${reminder.data.userId}`)
              results.reminders.failed++
              results.reminders.errors.push(`Reminder ${reminder.id}: Email notifications disabled by user`)
              continue
            }

            // Call the send-email function directly (no HTTP request needed)
            const { sendReminderEmail } = await import('@/lib/utils/reminder-email')
            
            const emailResult = await sendReminderEmail({
              reminderId: reminder.id,
              userId: reminder.data.userId,
              userEmail: profile.email,
              userName: `${profile.firstName} ${profile.lastName}`,
              reminderTitle: reminder.data.title,
              reminderDescription: reminder.data.description,
              dueDate: reminder.data.dueDate,
              priority: reminder.data.priority || 'medium'
            })

            if (emailResult.success) {
              results.reminders.sent++
              console.log(`✅ Successfully sent reminder ${reminder.id} to ${profile.email} (Message ID: ${emailResult.messageId})`)
            } else {
              results.reminders.failed++
              const errorMessage = emailResult.error || 'Unknown error'
              results.reminders.errors.push(`Reminder ${reminder.id}: ${errorMessage}`)
              console.error(`❌ Failed to send reminder ${reminder.id}:`, errorMessage)
            }
          } catch (error: any) {
            results.reminders.failed++
            results.reminders.errors.push(`Reminder ${reminder.id}: ${error.message || 'Unknown error'}`)
            console.error(`Error sending reminder ${reminder.id}:`, error)
          }
        }
      }

      results.reminders.success = true
      results.reminders.message = remindersToSend.length === 0 
        ? 'No reminders to send' 
        : `Processed ${remindersToSend.length} reminders`
      
      console.log('✅ Reminder check completed')
    } catch (error: any) {
      console.error('❌ Error in reminder check:', error)
      results.reminders.message = error.message || 'Failed to check reminders'
    }

    // ============================================
    // TASK 2: CHECK SUBSCRIPTION EXPIRY
    // ============================================
    try {
      console.log('💳 Starting subscription expiry check...')
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
          results.subscriptions.expired++
          console.log(`Deactivated subscription for user ${profile.userId} - expired more than 2 days ago`)
        }
        // Check if subscription expires within 2 days (warning before expiry)
        else if (expiryTime <= twoDaysFromNowTime && expiryTime > nowTime) {
          // Set warning flag (we'll check this on the frontend)
          await db.collection('userProfiles').doc(doc.id).update({
            subscriptionWarningShown: false, // Reset warning flag so modal shows again
            updatedAt: now.toISOString()
          })
          results.subscriptions.warnings++
          console.log(`Warning set for user ${profile.userId} - expires within 2 days`)
        }
        // Check if subscription expired but within 2 days grace period (warning after expiry)
        else if (expiryTime <= nowTime && expiryTime > twoDaysAgoTime) {
          // Set warning flag for expired but in grace period
          await db.collection('userProfiles').doc(doc.id).update({
            subscriptionWarningShown: false, // Reset warning flag so modal shows again
            updatedAt: now.toISOString()
          })
          results.subscriptions.warnings++
          console.log(`Warning set for user ${profile.userId} - expired but within grace period`)
        }
      }

      results.subscriptions.success = true
      results.subscriptions.checked = subscribedUsersSnapshot.size
      results.subscriptions.message = `Checked ${subscribedUsersSnapshot.size} subscriptions`
      
      console.log('✅ Subscription expiry check completed')
    } catch (error: any) {
      console.error('❌ Error in subscription expiry check:', error)
      results.subscriptions.message = error.message || 'Failed to check subscription expiry'
    }

    // Return combined results
    return NextResponse.json({
      success: results.reminders.success && results.subscriptions.success,
      timestamp: new Date().toISOString(),
      reminders: results.reminders,
      subscriptions: results.subscriptions
    })

  } catch (error: any) {
    console.error('❌ Error in daily-tasks cron job:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to execute daily tasks',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        results
      },
      { status: 500 }
    )
  }
}

