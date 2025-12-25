export interface ImageUploadResult {
  url: string
  fileId: string
  name: string
  size: number
  thumbnailUrl?: string
}

/**
 * Upload a file to ImageKit via our API route with retry logic
 * 
 * @param file - The file to upload
 * @param folder - The folder path (e.g., 'transactions', 'documents', 'receipts')
 *                 Note: Blog uploads (folder starting with 'blog') are exempted from user-specific folders
 *                 All other uploads are automatically organized as: users/{userId}/{folder}
 * @param userId - Optional user ID for user-specific folder organization
 * @param retries - Number of retry attempts (default: 3)
 */
export async function uploadToImageKit(file: File, folder: string = 'transactions', userId?: string, retries: number = 3): Promise<ImageUploadResult> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < retries; attempt++) {
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
            try {
              errorData = JSON.parse(text)
            } catch (parseError) {
              // If not valid JSON, use the text as error message
              errorData = { error: text || response.statusText || `HTTP ${response.status}` }
            }
          } else {
            errorData = { error: response.statusText || `HTTP ${response.status}` }
          }
        } catch (e) {
          // If response is not JSON, use status text
          errorData = { error: response.statusText || `HTTP ${response.status}` }
        }
        
        // Provide user-friendly error messages based on status code
        let userMessage = errorData.error || `Upload failed: ${response.status} ${response.statusText}`
        
        // Retry on 503, 502, 504 (service unavailable, bad gateway, gateway timeout)
        const isRetryableError = response.status === 503 || response.status === 502 || response.status === 504
        
        if (isRetryableError && attempt < retries - 1) {
          // Exponential backoff: wait 1s, 2s, 4s...
          const delay = Math.pow(2, attempt) * 1000
          console.warn(`ImageKit upload failed (attempt ${attempt + 1}/${retries}), retrying in ${delay}ms...`, errorData)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue // Retry
        }
        
        if (response.status === 503) {
          userMessage = 'ImageKit service is temporarily unavailable. Please try again in a few moments.'
        } else if (response.status === 413) {
          userMessage = errorData.error || 'File is too large. Please try a smaller file.'
        } else if (response.status === 401 || response.status === 403) {
          userMessage = 'Authentication error. Please refresh the page and try again.'
        } else if (response.status >= 500) {
          userMessage = 'Server error. Please try again in a few moments.'
        }
        
        lastError = new Error(userMessage)
        if (!isRetryableError || attempt === retries - 1) {
          console.error('ImageKit upload error:', response.status, errorData)
          throw lastError
        }
      } else {
        // Success!
        const result = await response.json()
        return {
          url: result.url,
          fileId: result.fileId,
          name: result.name,
          size: result.size,
          thumbnailUrl: result.thumbnailUrl
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Check for network errors that might be retryable
      const isNetworkError = lastError.message.includes('getaddrinfo') || 
                            lastError.message.includes('EAI_AGAIN') || 
                            lastError.message.includes('ENOTFOUND') || 
                            lastError.message.includes('fetch') ||
                            lastError.message.includes('Network error')
      
      if (isNetworkError && attempt < retries - 1) {
        // Exponential backoff for network errors
        const delay = Math.pow(2, attempt) * 1000
        console.warn(`Network error (attempt ${attempt + 1}/${retries}), retrying in ${delay}ms...`, lastError.message)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue // Retry
      }
      
      // If it's the last attempt or not retryable, throw the error
      if (attempt === retries - 1 || !isNetworkError) {
        console.error('ImageKit upload error:', lastError)
        if (isNetworkError) {
          throw new Error('Network error: Unable to connect to upload service. Please check your internet connection and try again.')
        }
        throw lastError
      }
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error('Failed to upload image after multiple attempts. Please try again.')
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