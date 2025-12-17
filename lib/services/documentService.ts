import { BaseService } from './base'
import { Document, UploadDocumentData, DocumentFilters, ApiResponse, PaginatedResponse } from '@/lib/types'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/firebase/firebase'
import { userService } from './userService'

export class DocumentService extends BaseService {
  constructor() {
    super('documents')
  }

  // Get all documents for a user
  async getUserDocuments(
    userId: string,
    filters?: DocumentFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<Document>> {
    try {
      const queryFilters = [{ field: 'userId', operator: '==', value: userId }]
      
      // Add additional filters
      if (filters) {
        if (filters.type) {
          queryFilters.push({ field: 'type', operator: '==', value: filters.type })
        }
        if (filters.fileType) {
          queryFilters.push({ field: 'fileType', operator: '==', value: filters.fileType })
        }
        if (filters.dateRange) {
          queryFilters.push({ field: 'uploadedAt', operator: '>=', value: filters.dateRange.start })
          queryFilters.push({ field: 'uploadedAt', operator: '<=', value: filters.dateRange.end })
        }
        if (filters.linkedTransaction !== undefined) {
          if (filters.linkedTransaction) {
            // For linked documents, we'll filter client-side since Firestore doesn't support != null well
            // This is handled in the client-side filtering below
          } else {
            queryFilters.push({ field: 'linkedTransaction', operator: '==', value: '' })
          }
        }
      }

      const { data, total } = await this.getPaginated(
        page,
        pageSize,
        queryFilters,
        'uploadedAt',
        'desc'
      )

      // Apply search filter if provided (client-side for now)
      let filteredData = data
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase()
        filteredData = filteredData.filter(doc => 
          doc.name.toLowerCase().includes(searchTerm) ||
          doc.originalName.toLowerCase().includes(searchTerm) ||
          (doc.notes && doc.notes.toLowerCase().includes(searchTerm))
        )
      }
      
      // Apply linkedTransaction filter (client-side for != null)
      if (filters?.linkedTransaction !== undefined) {
        if (filters.linkedTransaction) {
          filteredData = filteredData.filter(doc => doc.linkedTransaction && doc.linkedTransaction !== '')
        } else {
          filteredData = filteredData.filter(doc => !doc.linkedTransaction || doc.linkedTransaction === '')
        }
      }

      const totalPages = Math.ceil(total / pageSize)

      return {
        data: filteredData,
        pagination: {
          page,
          limit: pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      console.error('Error getting user documents:', error)
      throw error
    }
  }

  // Upload a new document
  async uploadDocument(userId: string, uploadData: UploadDocumentData): Promise<ApiResponse<Document>> {
    try {
      const file = uploadData.file
      
      // Use fileSize from uploadData if provided (from ImageKit result), otherwise use file.size
      const fileSize = uploadData.fileSize || file.size || 0
      
      // Check storage limit
      const profile = await userService.getProfile(userId)
      if (profile) {
        const storageLimit = profile.storageLimit || 500 * 1024 * 1024 // Default 500MB
        const currentStorageUsed = profile.storageUsed || 0
        
        if (currentStorageUsed + fileSize > storageLimit) {
          const remainingBytes = storageLimit - currentStorageUsed
          const remainingMB = (remainingBytes / (1024 * 1024)).toFixed(2)
          const limitMB = (storageLimit / (1024 * 1024)).toFixed(2)
          
          return {
            success: false,
            error: `Storage limit exceeded. You have ${remainingMB}MB remaining of ${limitMB}MB total storage. Please delete some documents or upgrade your plan.`
          }
        }
      }
      
      let downloadURL: string
      let thumbnailURL: string | undefined
      
      // Use ImageKit URL if provided, otherwise upload to Firebase Storage
      let imageKitFileId: string | undefined
      if (uploadData.imageKitUrl) {
        downloadURL = uploadData.imageKitUrl
        
        // Extract ImageKit fileId from uploadData if available
        // This is typically passed when the file was uploaded via the upload-image API route
        imageKitFileId = (uploadData as any).imageKitFileId
        
        // For images, use the same URL as thumbnail
        if (file.type.startsWith('image/') || uploadData.imageKitUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          thumbnailURL = downloadURL
        }
      } else {
        // Fallback to Firebase Storage upload
        const fileExtension = file.name.split('.').pop()
        const fileName = `${userId}/${Date.now()}-${file.name}`
        
        // Create storage reference
        const storageRef = ref(storage, `documents/${fileName}`)
        
        // Upload file to Firebase Storage
        const uploadResult = await uploadBytes(storageRef, file)
        downloadURL = await getDownloadURL(uploadResult.ref)
        
        // Create thumbnail URL for images
        if (file.type.startsWith('image/')) {
          thumbnailURL = downloadURL
        }
      }

      // Create document record in Firestore (fileSize already defined above)
      const documentData: any = {
        userId,
        name: uploadData.name,
        originalName: file.name,
        type: uploadData.type,
        fileType: this.getFileType(file.type),
        mimeType: file.type,
        size: fileSize,
        url: downloadURL,
        uploadedAt: uploadData.date || new Date().toISOString(),
        linkedTransaction: uploadData.linkedTransaction || null,
        notes: uploadData.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Only add thumbnailUrl if it exists
      if (thumbnailURL) {
        documentData.thumbnailUrl = thumbnailURL
      }

      // Store ImageKit fileId if available (for deletion later)
      if (imageKitFileId) {
        documentData.imageKitFileId = imageKitFileId
      }

      const documentId = await this.create(documentData)
      const createdDocument = await this.getById(documentId)

      // Update storage used
      // Note: If imageKitUrl was provided, storage was already updated by the upload-image API route
      // So we only update here if uploading directly to Firebase Storage
      if (!uploadData.imageKitUrl) {
        await userService.updateStorageUsed(userId, fileSize)
      }

      return {
        success: true,
        data: createdDocument,
        message: 'Document uploaded successfully'
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Update document metadata
  async updateDocument(documentId: string, userId: string, updateData: Partial<Document>): Promise<ApiResponse<Document>> {
    try {
      // Verify ownership
      const existingDocument = await this.getById(documentId)
      if (existingDocument.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only update your own documents'
        }
      }

      await this.update(documentId, updateData)
      const updatedDocument = await this.getById(documentId)

      return {
        success: true,
        data: updatedDocument,
        message: 'Document updated successfully'
      }
    } catch (error) {
      console.error('Error updating document:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Delete document and its file
  async deleteDocument(documentId: string, userId: string): Promise<ApiResponse<void>> {
    console.log('DocumentService.deleteDocument called:', { documentId, userId })
    try {
      // Verify ownership
      console.log('Fetching document from Firestore...')
      const existingDocument = await this.getById(documentId)
      console.log('Document fetched:', { 
        id: existingDocument.id, 
        userId: existingDocument.userId, 
        url: existingDocument.url,
        size: existingDocument.size,
        hasImageKitFileId: !!(existingDocument as any).imageKitFileId
      })
      
      if (existingDocument.userId !== userId) {
        console.error('Unauthorized delete attempt:', { documentUserId: existingDocument.userId, requestUserId: userId })
        return {
          success: false,
          error: 'Unauthorized: You can only delete your own documents'
        }
      }

      const documentSize = existingDocument.size || 0
      const imageKitFileId = (existingDocument as any).imageKitFileId
      const isImageKitUrl = existingDocument.url && (
        existingDocument.url.includes('imagekit.io') || 
        existingDocument.url.includes('ik.imagekit.io')
      )

      console.log('Document deletion info:', {
        documentId,
        userId,
        imageKitFileId,
        imageKitFileIdType: typeof imageKitFileId,
        imageKitFileIdLength: imageKitFileId?.length,
        isImageKitUrl,
        url: existingDocument.url,
        allDocumentKeys: Object.keys(existingDocument)
      })
      
      // Sanity check: Log the actual fileId format
      if (imageKitFileId) {
        const looksLikeUrl = imageKitFileId.includes('http') || imageKitFileId.includes('/')
        const looksLikeId = /^[a-f0-9]{24}$/i.test(imageKitFileId) // ImageKit fileId is typically 24 hex chars
        console.log('ImageKit fileId validation:', {
          value: imageKitFileId,
          looksLikeUrl,
          looksLikeId,
          isValid: !looksLikeUrl && looksLikeId
        })
      }

      // Delete file from ImageKit if it was uploaded via ImageKit
      if (imageKitFileId) {
        try {
          // Validate fileId format (should be ImageKit fileId, not URL)
          const isValidFileId = imageKitFileId && 
            !imageKitFileId.includes('http') && 
            !imageKitFileId.includes('/') && 
            !imageKitFileId.includes('.')
          
          if (!isValidFileId) {
            console.warn(`Invalid ImageKit fileId format (looks like URL): ${imageKitFileId}`)
            console.warn('Cannot delete from ImageKit without valid fileId')
          } else {
            console.log(`Deleting ImageKit file with fileId: ${imageKitFileId}`)
            console.log(`FileId type: ${typeof imageKitFileId}, length: ${imageKitFileId.length}`)
            
            // Get auth token for API call
            const { auth } = await import('@/firebase/firebase')
            const currentUser = auth.currentUser
            if (currentUser) {
              const token = await currentUser.getIdToken()
              
              // Use query params instead of body for DELETE requests
              const response = await fetch(`/api/delete-image?fileId=${encodeURIComponent(imageKitFileId)}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                const errorMessage = errorData.error || `Delete failed: ${response.status}`
                console.error(`ImageKit delete API error: ${errorMessage}`)
                throw new Error(errorMessage)
              }
              
              const deleteResult = await response.json()
              console.log(`Successfully deleted ImageKit file: ${imageKitFileId}`, deleteResult)
            } else {
              console.warn('No authenticated user found, skipping ImageKit deletion')
            }
          }
        } catch (imagekitError) {
          console.error('Could not delete file from ImageKit:', imagekitError)
          console.error('ImageKit delete error details:', imagekitError)
          // Continue with document deletion even if ImageKit deletion fails
        }
      } else if (isImageKitUrl) {
        // ImageKit file detected but no fileId stored
        // Note: ImageKit requires fileId for deletion, so we can't delete without it
        console.warn(`ImageKit file detected but no fileId stored. URL: ${existingDocument.url}. File will remain in ImageKit.`)
        console.warn('To enable deletion, ensure imageKitFileId is stored when documents are created.')
      }

      // Delete file from Firebase Storage (if it was uploaded there)
      if (!isImageKitUrl) {
        try {
          const fileRef = ref(storage, existingDocument.url)
          await deleteObject(fileRef)
        } catch (storageError) {
          console.warn('Could not delete file from Firebase Storage:', storageError)
          // Continue with document deletion even if storage deletion fails
        }
      }

      // Delete document record from Firestore
      await this.delete(documentId)

      // Reduce storage used using Admin SDK via API route
      if (documentSize > 0) {
        try {
          console.log(`Reducing storage by ${documentSize} bytes (${(documentSize / 1024).toFixed(2)} KB) for user ${userId}`)
          
          // Get auth token for API call
          const { auth } = await import('@/firebase/firebase')
          const currentUser = auth.currentUser
          if (currentUser) {
            const token = await currentUser.getIdToken()
            
            const response = await fetch('/api/user/update-storage', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ 
                additionalBytes: -documentSize // Negative to reduce
              })
            })

            if (response.ok) {
              const result = await response.json()
              const newUsage = result.data?.storageUsed || 0
              console.log(`Storage reduced successfully. New usage: ${newUsage} bytes (${(newUsage / 1024 / 1024).toFixed(2)} MB)`)
            } else {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
              console.error(`Failed to reduce storage via API: ${errorData.error}`)
              // Try fallback to userService (might fail due to permissions)
              try {
                await userService.updateStorageUsed(userId, -documentSize)
                console.log('Storage reduced via fallback userService')
              } catch (fallbackError) {
                console.error('Fallback storage reduction also failed:', fallbackError)
              }
            }
          } else {
            console.warn('No authenticated user found, skipping storage reduction')
          }
        } catch (storageError) {
          console.error('Error reducing storage usage:', storageError)
          // Don't fail document deletion if storage update fails
        }
      }

      return {
        success: true,
        message: 'Document deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Get document download URL
  async getDownloadURL(documentId: string, userId: string): Promise<ApiResponse<string>> {
    try {
      const document = await this.getById(documentId)
      
      if (document.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only access your own documents'
        }
      }

      return {
        success: true,
        data: document.url,
        message: 'Download URL retrieved successfully'
      }
    } catch (error) {
      console.error('Error getting download URL:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Get documents by type
  async getDocumentsByType(userId: string, type: Document['type']): Promise<Document[]> {
    try {
      return await this.getAll([
        { field: 'userId', operator: '==', value: userId },
        { field: 'type', operator: '==', value: type }
      ], 'uploadedAt', 'desc')
    } catch (error) {
      console.error('Error getting documents by type:', error)
      throw error
    }
  }

  // Get documents linked to a transaction
  async getDocumentsByTransaction(userId: string, transactionId: string): Promise<Document[]> {
    try {
      return await this.getAll([
        { field: 'userId', operator: '==', value: userId },
        { field: 'linkedTransaction', operator: '==', value: transactionId }
      ], 'uploadedAt', 'desc')
    } catch (error) {
      console.error('Error getting documents by transaction:', error)
      throw error
    }
  }

  // Helper method to determine file type
  private getFileType(mimeType: string): 'pdf' | 'image' | 'document' {
    if (mimeType.startsWith('image/')) {
      return 'image'
    } else if (mimeType === 'application/pdf') {
      return 'pdf'
    } else {
      return 'document'
    }
  }

  // Get storage usage for a user
  async getUserStorageUsage(userId: string): Promise<{
    totalSize: number
    documentCount: number
    typeBreakdown: { [key: string]: { count: number; size: number } }
  }> {
    try {
      const documents = await this.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])

      const usage = {
        totalSize: 0,
        documentCount: documents.length,
        typeBreakdown: {} as { [key: string]: { count: number; size: number } }
      }

      documents.forEach(doc => {
        usage.totalSize += doc.size

        if (!usage.typeBreakdown[doc.fileType]) {
          usage.typeBreakdown[doc.fileType] = { count: 0, size: 0 }
        }
        usage.typeBreakdown[doc.fileType].count++
        usage.typeBreakdown[doc.fileType].size += doc.size
      })

      return usage
    } catch (error) {
      console.error('Error getting storage usage:', error)
      throw error
    }
  }
}

// Export a singleton instance
export const documentService = new DocumentService()
