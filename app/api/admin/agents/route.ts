import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const db = getAdminDb()
    
    // Get all users with role 'agent' or create a simple list
    // For now, we'll get all users and filter, or you can create a dedicated agents collection
    const usersSnapshot = await db.collection('userProfiles')
      .where('role', 'in', ['agent', 'admin'])
      .get()
    
    const agents = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      userId: doc.data().userId,
      name: `${doc.data().firstName || ''} ${doc.data().lastName || ''}`.trim() || doc.data().email?.split('@')[0] || 'Unknown',
      email: doc.data().email,
      ...doc.data()
    }))
    
    // If no agents found, return empty array (admin can manually assign any user)
    return NextResponse.json({
      success: true,
      data: agents
    })
  } catch (error) {
    console.error('Error fetching agents:', error)
    // Return empty array if error (allows manual assignment)
    return NextResponse.json({
      success: true,
      data: []
    })
  }
}

