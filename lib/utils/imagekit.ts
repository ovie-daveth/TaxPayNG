export interface ImageUploadResult {
  url: string
  fileId: string
  name: string
  size: number
  thumbnailUrl?: string
}

/**
 * Upload a file to ImageKit via our API route
 * 
 * @param file - The file to upload
 * @param folder - The folder path (e.g., 'transactions', 'documents', 'receipts')
 *                 Note: Blog uploads (folder starting with 'blog') are exempted from user-specific folders
 *                 All other uploads are automatically organized as: users/{userId}/{folder}
 */
export async function uploadToImageKit(file: File, folder: string = 'transactions', userId?: string): Promise<ImageUploadResult> {
  try {
    // Get auth token if available
    let authToken: string | undefined
    try {
      const { auth } = await import('@/firebase/firebase')
      const currentUser = auth.currentUser
      if (currentUser) {
        authToken = await currentUser.getIdToken()
      }
    } catch (error) {
      console.warn('Could not get auth token:', error)
    }

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      },
      body: JSON.stringify({
        file: await fileToBase64(file),
        fileName: file.name,
        folder,
        useUniqueFileName: true,
        originalFileSize: file.size, // Pass original file size as fallback
        ...(userId && { userId })
      })
    })

    if (!response.ok) {
      let errorData: any = { error: 'Unknown error' }
      try {
        const text = await response.text()
        if (text) {
          errorData = JSON.parse(text)
        }
      } catch (e) {
        // If response is not JSON, use status text
        errorData = { error: response.statusText || `HTTP ${response.status}` }
      }
      console.error('ImageKit upload error:', response.status, errorData)
      throw new Error(errorData.error || `Upload failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    return {
      url: result.url,
      fileId: result.fileId,
      name: result.name,
      size: result.size,
      thumbnailUrl: result.thumbnailUrl
    }
  } catch (error) {
    console.error('ImageKit upload error:', error)
    if (error instanceof Error) {
      // Check for network errors
      if (error.message.includes('getaddrinfo') || error.message.includes('EAI_AGAIN') || error.message.includes('ENOTFOUND') || error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to upload service. Please check your internet connection and try again.')
      }
      // Re-throw the error with its original message
      throw error
    }
    throw new Error('Failed to upload image. Please try again.')
  }
}

/**
 * Convert File to base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const result = reader.result as string
      // Remove data:image/jpeg;base64, prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}