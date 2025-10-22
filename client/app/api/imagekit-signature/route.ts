import { NextResponse } from 'next/server'
import { imagekit } from '@/lib/utils/imagekit-server'

export async function GET() {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters()
    
    return NextResponse.json(authenticationParameters)
  } catch (error) {
    console.error('ImageKit signature error:', error)
    return NextResponse.json(
      { error: 'Failed to get signature' },
      { status: 500 }
    )
  }
}
