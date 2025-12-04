import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

/**
 * Admin endpoint to manually trigger reminder check
 * This is a convenience endpoint that calls the cron job
 * 
 * POST /api/admin/trigger-reminders
 * Requires admin authentication (you can add auth check here)
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add admin authentication check here
    // const authHeader = request.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Get the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    
    // Call the cron job endpoint
    const cronSecret = process.env.CRON_SECRET
    const url = cronSecret 
      ? `${baseUrl}/api/cron/check-reminders?secret=${cronSecret}`
      : `${baseUrl}/api/cron/check-reminders`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to trigger reminders' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder check triggered successfully',
      result: data
    })
  } catch (error: any) {
    console.error('Error triggering reminders:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to trigger reminders' },
      { status: 500 }
    )
  }
}

