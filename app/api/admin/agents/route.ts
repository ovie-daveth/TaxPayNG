import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const db = getAdminDb()
    
    // Get all users with businessType 'agent' and agentKycCompleted = true
    // Also include users with role 'agent' for backward compatibility
    const agentSnapshot = await db.collection('userProfiles')
      .where('businessType', '==', 'agent')
      .where('agentKycCompleted', '==', true)
      .get()
    
    const agents = agentSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        userId: data.userId,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email?.split('@')[0] || 'Unknown',
        email: data.email,
        agentStates: data.agentStates || [],
        ...data
      }
    })
    
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

