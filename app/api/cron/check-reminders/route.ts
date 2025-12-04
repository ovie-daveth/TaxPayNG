import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

/**
 * Cron job to check and send reminder emails
 * This should be called periodically (e.g., every hour) by Vercel Cron or external cron service
 * 
 * GET /api/cron/check-reminders?secret=YOUR_SECRET
 * 
 * For Vercel Cron, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-reminders",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
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
    const now = new Date()
    
    // Get reminders that are due within the next 24 hours and haven't been sent yet
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const nowISO = now.toISOString()
    const tomorrowISO = tomorrow.toISOString()
    
    // Query only incomplete reminders to avoid composite index requirement
    // We'll filter by date and emailSent status in memory
    let remindersSnapshot
    try {
      remindersSnapshot = await db.collection('reminders')
        .where('isCompleted', '==', false)
        .get()
    } catch (error: any) {
      console.error('❌ Error querying reminders:', error)
      return NextResponse.json(
        { error: 'Failed to query reminders', details: error.message },
        { status: 500 }
      )
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
            // Parse as local date to avoid timezone issues
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

    if (remindersToSend.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No reminders to send',
        count: 0
      })
    }

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
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const reminder of remindersToSend) {
      try {
        const profile = userProfiles.get(reminder.data.userId)
        if (!profile || !profile.email) {
          results.failed++
          results.errors.push(`No email found for user ${reminder.data.userId}`)
          continue
        }

        // Call the send-email API route
        // For local development, use localhost; for production, use the app URL
        let baseUrl = 'http://localhost:3000'
        if (process.env.NEXT_PUBLIC_APP_URL) {
          baseUrl = process.env.NEXT_PUBLIC_APP_URL
        } else if (process.env.VERCEL_URL) {
          baseUrl = `https://${process.env.VERCEL_URL}`
        }
        
        const response = await fetch(`${baseUrl}/api/reminders/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reminderId: reminder.id,
            userId: reminder.data.userId,
            userEmail: profile.email,
            userName: `${profile.firstName} ${profile.lastName}`,
            reminderTitle: reminder.data.title,
            reminderDescription: reminder.data.description,
            dueDate: reminder.data.dueDate,
            priority: reminder.data.priority || 'medium'
          })
        })

        if (response.ok) {
          results.sent++
        } else {
          results.failed++
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          results.errors.push(`Reminder ${reminder.id}: ${errorData.error || 'Failed to send'}`)
        }
      } catch (error: any) {
        results.failed++
        results.errors.push(`Reminder ${reminder.id}: ${error.message || 'Unknown error'}`)
        console.error(`Error sending reminder ${reminder.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${remindersToSend.length} reminders`,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined
    })
  } catch (error: any) {
    console.error('❌ Error in check-reminders cron job:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to check reminders',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

