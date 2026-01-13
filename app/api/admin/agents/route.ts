import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const db = getAdminDb()
    
    // Get all users with businessType 'consultant' and consultantKycCompleted = true
    // Also check for 'agent' for backward compatibility
    const consultantSnapshot = await db.collection('userProfiles')
      .where('businessType', '==', 'consultant')
      .where('consultantKycCompleted', '==', true)
      .get()
    
    // Also fetch legacy agents for backward compatibility
    const legacyAgentSnapshot = await db.collection('userProfiles')
      .where('businessType', '==', 'agent')
      .where('agentKycCompleted', '==', true)
      .get()
    
    const consultants = consultantSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        userId: data.userId,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email?.split('@')[0] || 'Unknown',
        email: data.email,
        consultantStates: data.consultantStates || data.agentStates || [],
        ...data
      }
    })
    
    const legacyAgents = legacyAgentSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        userId: data.userId,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email?.split('@')[0] || 'Unknown',
        email: data.email,
        consultantStates: data.agentStates || [],
        ...data
      }
    })
    
    // Combine and deduplicate by userId
    const allConsultants = [...consultants, ...legacyAgents]
    const uniqueConsultants = Array.from(
      new Map(allConsultants.map(c => [c.userId, c])).values()
    )
    
    // If no consultants found, return empty array (admin can manually assign any user)
    return NextResponse.json({
      success: true,
      data: uniqueConsultants
    })
  } catch (error) {
    console.error('Error fetching consultants:', error)
    // Return empty array if error (allows manual assignment)
    return NextResponse.json({
      success: true,
      data: []
    })
  }
}

