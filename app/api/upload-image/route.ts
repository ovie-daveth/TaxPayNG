import { NextRequest, NextResponse } from 'next/server'
import { imagekit } from '@/lib/utils/imagekit-server'
import { getAdminAuth } from '@/lib/firebase-admin'

const auth = getAdminAuth()

/**
 * Get authenticated user ID from request
 */
async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const cookies = request.headers.get("cookie") || ""
    const sessionCookie = cookies.match(/session=([^;]+)/)?.[1]

    if (sessionCookie) {
      const decodedToken = await auth.verifySessionCookie(sessionCookie, true)
      return decodedToken?.uid || null
    }

    const bearer = request.headers.get("authorization")
    const token = bearer?.startsWith("Bearer ") ? bearer.substring(7) : undefined

    if (token) {
      const decodedToken = await auth.verifyIdToken(token, true)
      return decodedToken?.uid || null
    }

    return null
  } catch (error) {
    console.error('Error getting user ID:', error)
    return null
  }
}

/**
 * Build the final folder path based on whether it's a blog upload or user upload
 */
function buildFolderPath(userId: string | null, folder: string): string {
  // Blog uploads are exempted from user folders
  if (folder.startsWith('blog')) {
    return folder
  }

  // If no userId and not a blog upload, use the provided folder as-is
  // (fallback for unauthenticated uploads, though should be rare)
  if (!userId) {
    return folder
  }

  // User-specific folders: users/{userId}/{folder}
  // Example: users/abc123/transactions, users/abc123/documents
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
  return `users/${userId}/${cleanFolder}`
}

export async function POST(request: NextRequest) {
  try {
    const { file, fileName, folder, useUniqueFileName, userId: providedUserId } = await request.json()

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Get userId from auth (preferred) or from request body (fallback)
    const authUserId = await getUserId(request)
    const userId = providedUserId || authUserId

    // Build the final folder path
    const finalFolder = buildFolderPath(userId, folder || 'documents')

    try {
      const result = await imagekit.upload({
        file,
        fileName: fileName || 'upload',
        folder: finalFolder,
        useUniqueFileName: useUniqueFileName !== false, // Default to true
        overwriteFile: false,
        overwriteAITags: false,
        overwriteTags: false,
        overwriteCustomMetadata: false
      })

      return NextResponse.json({
        url: result.url,
        fileId: result.fileId,
        name: result.name,
        size: result.size,
        thumbnailUrl: result.thumbnailUrl || result.url,
        fileType: result.fileType // 'image' or 'video'
      })
    } catch (imagekitError) {
      console.error('ImageKit SDK error:', imagekitError)
      const errorMessage = imagekitError instanceof Error ? imagekitError.message : 'ImageKit upload failed'
      
      // Check for specific ImageKit errors
      if (errorMessage.includes('getaddrinfo') || errorMessage.includes('EAI_AGAIN')) {
        return NextResponse.json(
          { error: 'Network error: Unable to connect to ImageKit. Please check your internet connection and try again.' },
          { status: 503 }
        )
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Upload API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
