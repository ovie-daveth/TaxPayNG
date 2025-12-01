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
export async function uploadToImageKit(file: File, folder: string = 'transactions'): Promise<ImageUploadResult> {
  try {
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: await fileToBase64(file),
        fileName: file.name,
        folder,
        useUniqueFileName: true
      })
    })

    if (!response.ok) {
      throw new Error('Upload failed')
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
    throw new Error('Failed to upload image')
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