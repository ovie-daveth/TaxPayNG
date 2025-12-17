import { NextRequest, NextResponse } from 'next/server'
import { imagekit } from '@/lib/utils/imagekit-server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin'

const auth = getAdminAuth()
const adminDb = getAdminDb()

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
    const { file, fileName, folder, useUniqueFileName, userId: providedUserId, originalFileSize } = await request.json()

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Get userId from auth (preferred) or from request body (fallback)
    const authUserId = await getUserId(request)
    const userId = providedUserId || authUserId

    // Check storage limit BEFORE uploading (if userId is available)
    // This ensures ALL uploads count towards storage usage (KYC, invoices, transactions, receipts, etc.)
    if (userId) {
      try {
        // Use Admin SDK to get profile
        const profileQuery = await adminDb.collection('userProfiles')
          .where('userId', '==', userId)
          .limit(1)
          .get()
        
        if (!profileQuery.empty) {
          const profileData = profileQuery.docs[0].data()
          // Calculate file size from base64 string
          // Base64 encoding increases size by ~33%, so we need to decode to get actual size
          const base64Length = file.length
          const fileSize = Math.floor(base64Length * 0.75) // Approximate actual file size from base64
          
          const storageLimit = profileData.storageLimit || 500 * 1024 * 1024 // Default 500MB
          const currentStorageUsed = profileData.storageUsed || 0
          
          if (currentStorageUsed + fileSize > storageLimit) {
            const remainingBytes = storageLimit - currentStorageUsed
            const remainingMB = (remainingBytes / (1024 * 1024)).toFixed(2)
            const limitMB = (storageLimit / (1024 * 1024)).toFixed(2)
            
            return NextResponse.json(
              { error: `Storage limit exceeded. You have ${remainingMB}MB remaining of ${limitMB}MB total storage. Please delete some documents or upgrade your plan.` },
              { status: 413 }
            )
          }
        }
      } catch (storageError) {
        console.error('Error checking storage limit:', storageError)
        // Continue with upload even if storage check fails
      }
    }

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

      // Log ImageKit response for debugging
      console.log('ImageKit upload result (full):', JSON.stringify(result, null, 2))
      console.log('ImageKit upload result (summary):', {
        url: result.url,
        fileId: result.fileId,
        size: result.size,
        sizeType: typeof result.size,
        name: result.name,
        hasSize: 'size' in result,
        allKeys: Object.keys(result)
      })

      // Get file size - ImageKit may return size in different formats
      // Try multiple possible properties: size, fileSize, sizeInBytes
      let fileSize = 0
      if (result.size !== undefined && result.size !== null) {
        fileSize = typeof result.size === 'number' ? result.size : parseInt(result.size) || 0
      } else if ((result as any).fileSize !== undefined) {
        fileSize = typeof (result as any).fileSize === 'number' ? (result as any).fileSize : parseInt((result as any).fileSize) || 0
      } else if ((result as any).sizeInBytes !== undefined) {
        fileSize = typeof (result as any).sizeInBytes === 'number' ? (result as any).sizeInBytes : parseInt((result as any).sizeInBytes) || 0
      }
      
      // Fallback 1: Use original file size from client if ImageKit doesn't return size
      if (fileSize === 0 && originalFileSize) {
        fileSize = typeof originalFileSize === 'number' ? originalFileSize : parseInt(String(originalFileSize)) || 0
        console.warn(`ImageKit didn't return size, using original file size from client: ${fileSize} bytes`)
      }
      
      // Fallback 2: Calculate from base64 if neither ImageKit nor client provided size
      if (fileSize === 0) {
        const base64Length = file.length
        fileSize = Math.floor(base64Length * 0.75) // Approximate actual file size from base64
        console.warn(`ImageKit and client didn't provide size, using calculated size from base64: ${fileSize} bytes`)
      }

      console.log(`Final file size to use: ${fileSize} bytes (${(fileSize / 1024).toFixed(2)} KB)`)

      // Update storage usage AFTER successful upload using Admin SDK
      if (userId && fileSize > 0) {
        try {
          console.log(`Updating storage for user ${userId}: adding ${fileSize} bytes (${(fileSize / 1024).toFixed(2)} KB)`)
          
          // Use Admin SDK to get and update profile
          const profileQuery = await adminDb.collection('userProfiles')
            .where('userId', '==', userId)
            .limit(1)
            .get()
          
          if (profileQuery.empty) {
            console.error(`User profile not found for userId: ${userId}`)
          } else {
            const profileDoc = profileQuery.docs[0]
            const profileData = profileDoc.data()
            const currentStorageUsed = profileData.storageUsed || 0
            const newStorageUsed = Math.max(0, currentStorageUsed + fileSize)
            
            await adminDb.collection('userProfiles').doc(profileDoc.id).update({
              storageUsed: newStorageUsed,
              updatedAt: new Date().toISOString()
            })
            
            console.log(`Storage updated successfully. Old: ${currentStorageUsed} bytes, New: ${newStorageUsed} bytes (${(newStorageUsed / 1024 / 1024).toFixed(2)} MB)`)
          }
        } catch (storageError) {
          // Log error but don't fail the upload - storage tracking is secondary
          console.error('Error updating storage usage:', storageError)
          console.error('Storage error details:', storageError)
        }
      } else {
        console.warn(`Skipping storage update: userId=${userId}, fileSize=${fileSize}`)
      }

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
