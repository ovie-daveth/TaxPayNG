import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

/**
 * Toggle like on a blog post
 * This endpoint adds or removes a like from a blog post
 */
export async function POST(request: NextRequest) {
  try {
    const { blogId, userId } = await request.json()

    if (!blogId) {
      return NextResponse.json(
        { error: 'Blog ID is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
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
    const likes = currentData?.likes || []
    const likedBy = currentData?.likedBy || []

    // Check if user already liked
    const userLiked = likedBy.includes(userId)

    let updatedLikes: string[]
    let updatedLikedBy: string[]

    if (userLiked) {
      // Remove like
      updatedLikedBy = likedBy.filter((id: string) => id !== userId)
      updatedLikes = updatedLikedBy
    } else {
      // Add like
      updatedLikedBy = [...likedBy, userId]
      updatedLikes = updatedLikedBy
    }

    // Update blog post
    await blogRef.update({
      likes: updatedLikes,
      likedBy: updatedLikedBy,
      likeCount: updatedLikes.length,
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      liked: !userLiked,
      likeCount: updatedLikes.length
    })

  } catch (error: any) {
    console.error('Toggle like error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to toggle like' },
      { status: 500 }
    )
  }
}

