import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

/**
 * Track blog post view/impression
 * This endpoint increments the view count for a blog post
 */
export async function POST(request: NextRequest) {
  try {
    const { blogId } = await request.json()

    if (!blogId) {
      return NextResponse.json(
        { error: 'Blog ID is required' },
        { status: 400 }
      )
    }

    const adminDb = getAdminDb()
    const blogRef = adminDb.collection('blogPosts').doc(blogId.toString())

    // Get current post data
    const blogDoc = await blogRef.get()
    
    if (!blogDoc.exists) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      )
    }

    const currentData = blogDoc.data()
    const currentViews = currentData?.views || 0

    // Increment view count
    await blogRef.update({
      views: currentViews + 1,
      lastViewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      views: currentViews + 1
    })

  } catch (error: any) {
    console.error('Track view error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to track view' },
      { status: 500 }
    )
  }
}

