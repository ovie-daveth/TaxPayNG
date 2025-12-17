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

export async function DELETE(request: NextRequest) {
  try {
    // Use query params instead of body for DELETE requests (more reliable)
    const fileId = request.nextUrl.searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json(
        { error: 'No fileId provided' },
        { status: 400 }
      )
    }

    // Validate fileId format (ImageKit fileId is typically 24 hex characters)
    // Real ImageKit fileId looks like: "64e1c9f3c8a9a12abc123456"
    if (fileId.includes('http') || fileId.includes('/') || fileId.includes('.')) {
      console.error('Invalid fileId format (looks like URL, not ID):', fileId)
      return NextResponse.json(
        { error: 'Invalid fileId format. Expected ImageKit fileId, got URL or path.' },
        { status: 400 }
      )
    }

    // Verify user is authenticated
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    try {
      console.log(`Attempting to delete ImageKit file with fileId: ${fileId}`)
      console.log(`FileId type: ${typeof fileId}, length: ${fileId.length}`)
      
      // Retry logic for network errors
      let lastError: Error | null = null
      const maxRetries = 3
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // ImageKit deleteFile expects the fileId as a string
          const deleteResult = await imagekit.deleteFile(fileId)
          
          console.log(`ImageKit delete result:`, deleteResult)
          console.log(`Successfully deleted ImageKit file: ${fileId}`)
          
          return NextResponse.json({
            success: true,
            message: 'File deleted successfully',
            data: deleteResult
          })
        } catch (attemptError) {
          lastError = attemptError instanceof Error ? attemptError : new Error(String(attemptError))
          
          // Check if it's a network/DNS error
          const isNetworkError = lastError.message.includes('getaddrinfo') || 
                                 lastError.message.includes('EAI_AGAIN') ||
                                 lastError.message.includes('ENOTFOUND') ||
                                 lastError.message.includes('ECONNREFUSED') ||
                                 lastError.message.includes('ETIMEDOUT')
          
          if (isNetworkError && attempt < maxRetries) {
            console.warn(`ImageKit delete attempt ${attempt} failed (network error), retrying...`, lastError.message)
            // Wait before retry (exponential backoff: 1s, 2s, 4s)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000))
            continue
          }
          
          // If not a network error or max retries reached, throw
          throw lastError
        }
      }
      
      // Should never reach here, but TypeScript needs it
      throw lastError || new Error('Unknown error')
    } catch (imagekitError) {
      console.error('ImageKit delete error:', imagekitError)
      console.error('ImageKit delete error details:', {
        fileId,
        error: imagekitError instanceof Error ? imagekitError.message : String(imagekitError),
        stack: imagekitError instanceof Error ? imagekitError.stack : undefined
      })
      
      const errorMessage = imagekitError instanceof Error ? imagekitError.message : 'ImageKit delete failed'
      
      // Return 200 with error flag for network errors (so client can still proceed with profile update)
      // Return 500 for other errors
      const isNetworkError = errorMessage.includes('getaddrinfo') || 
                             errorMessage.includes('EAI_AGAIN') ||
                             errorMessage.includes('ENOTFOUND') ||
                             errorMessage.includes('ECONNREFUSED') ||
                             errorMessage.includes('ETIMEDOUT')
      
      if (isNetworkError) {
        console.warn('Network error during ImageKit delete - file may still exist in ImageKit')
        return NextResponse.json({
          success: false,
          error: 'Network error: Could not connect to ImageKit. File may still exist.',
          networkError: true
        }, { status: 200 }) // Return 200 so client can still proceed
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Delete API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete file'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

