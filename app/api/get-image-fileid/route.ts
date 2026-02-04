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

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')
    const fileId = request.nextUrl.searchParams.get('fileId')

    if (!url && !fileId) {
      return NextResponse.json(
        { error: 'No URL or fileId provided' },
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
      // If fileId is provided, get file details directly
      if (fileId) {
        console.log(`Getting file details from ImageKit for fileId: ${fileId}`)
        const fileDetails = await imagekit.getFileDetails(fileId)
        
        return NextResponse.json({
          success: true,
          fileId: fileDetails.fileId,
          url: fileDetails.url,
          size: fileDetails.size || 0,
          name: fileDetails.name
        })
      }

      // Otherwise proceed with URL lookup
      if (!url) {
        return NextResponse.json(
          { error: 'URL is required' },
          { status: 400 }
        )
      }
      
      console.log(`Attempting to get fileId from ImageKit for URL: ${url}`)
      
      // ImageKit listFiles can search by URL
      // We'll search for files matching this URL
      const files = await imagekit.listFiles({
        path: url.split('/').slice(-2).join('/'), // Get the last two path segments (e.g., "kyc/filename.jpg")
        limit: 1
      })
      
      // Helper function to check if item is a FileObject (has fileId)
      const isFileObject = (item: any): item is { fileId: string; size?: number; name: string; url?: string } => {
        return 'fileId' in item
      }
      
      // Also try searching by the full URL path
      if (files.length === 0) {
        const urlPath = url.split('ik.imagekit.io/')[1] // Get everything after the domain
        const filesByPath = await imagekit.listFiles({
          path: urlPath,
          limit: 1
        })
        
        if (filesByPath.length > 0 && isFileObject(filesByPath[0])) {
          const file = filesByPath[0]
          console.log(`Found file by path: ${file.fileId}`)
          return NextResponse.json({
            success: true,
            fileId: file.fileId,
            size: file.size || 0,
            name: file.name
          })
        }
      } else if (isFileObject(files[0])) {
        const file = files[0]
        console.log(`Found file: ${file.fileId}`)
        return NextResponse.json({
          success: true,
          fileId: file.fileId,
          size: file.size || 0,
          name: file.name
        })
      }
      
      // If not found by path, try searching by name (filename from URL)
      const fileName = url.split('/').pop()?.split('?')[0] // Get filename, remove query params
      if (fileName) {
        const filesByName = await imagekit.listFiles({
          name: fileName,
          limit: 10 // Get multiple matches
        })
        
        // Find the one that matches the URL (only check FileObjects)
        const matchingFile = filesByName.find(f => isFileObject(f) && (f.url === url || f.url?.includes(fileName)))
        if (matchingFile && isFileObject(matchingFile)) {
          console.log(`Found file by name: ${matchingFile.fileId}`)
          return NextResponse.json({
            success: true,
            fileId: matchingFile.fileId,
            size: matchingFile.size || 0,
            name: matchingFile.name
          })
        }
      }
      
      console.warn(`Could not find fileId for URL: ${url}`)
      return NextResponse.json(
        { error: 'File not found in ImageKit' },
        { status: 404 }
      )
    } catch (imagekitError) {
      console.error('ImageKit get fileId error:', imagekitError)
      const errorMessage = imagekitError instanceof Error ? imagekitError.message : 'ImageKit lookup failed'
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Get fileId API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to get fileId'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

