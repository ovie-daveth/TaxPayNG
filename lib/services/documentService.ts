import { BaseService } from './base'
import { Document, UploadDocumentData, DocumentFilters, ApiResponse, PaginatedResponse } from '@/lib/types'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/firebase/firebase'

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
      const fileExtension = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}-${file.name}`
      
      // Create storage reference
      const storageRef = ref(storage, `documents/${fileName}`)
      
      // Upload file to Firebase Storage
      const uploadResult = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(uploadResult.ref)
      
      // Create thumbnail URL for images
      let thumbnailURL: string | undefined
      if (file.type.startsWith('image/')) {
        thumbnailURL = downloadURL
      }

      // Create document record in Firestore
      const documentData = {
        userId,
        name: uploadData.name,
        originalName: file.name,
        type: uploadData.type,
        fileType: this.getFileType(file.type),
        mimeType: file.type,
        size: file.size,
        url: downloadURL,
        thumbnailUrl: thumbnailURL,
        uploadedAt: uploadData.date || new Date().toISOString(),
        linkedTransaction: uploadData.linkedTransaction || null,
        notes: uploadData.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const documentId = await this.create(documentData)
      const createdDocument = await this.getById(documentId)

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
    try {
      // Verify ownership
      const existingDocument = await this.getById(documentId)
      if (existingDocument.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only delete your own documents'
        }
      }

      // Delete file from Firebase Storage
      try {
        const fileRef = ref(storage, existingDocument.url)
        await deleteObject(fileRef)
      } catch (storageError) {
        console.warn('Could not delete file from storage:', storageError)
        // Continue with document deletion even if storage deletion fails
      }

      // Delete document record from Firestore
      await this.delete(documentId)

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
