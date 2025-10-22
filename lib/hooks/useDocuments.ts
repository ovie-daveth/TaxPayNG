"use client"

import { useState, useEffect, useCallback } from 'react'
import { documentService } from '@/lib/services'
import { Document, UploadDocumentData, DocumentFilters, PaginatedResponse } from '@/lib/types'

export function useDocuments(userId: string | null) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginatedResponse<Document>['pagination'] | null>(null)

  const loadDocuments = useCallback(async (
    page: number = 1,
    pageSize: number = 20,
    filters?: DocumentFilters
  ) => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const result = await documentService.getUserDocuments(userId, filters, page, pageSize)
      setDocuments(result.data)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const uploadDocument = useCallback(async (uploadData: UploadDocumentData) => {
    if (!userId) return { success: false, error: 'User not authenticated' }

    setLoading(true)
    setError(null)

    try {
      const result = await documentService.uploadDocument(userId, uploadData)
      if (result.success && result.data) {
        setDocuments(prev => [result.data!, ...prev])
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [userId])

  const updateDocument = useCallback(async (documentId: string, updateData: Partial<Document>) => {
    if (!userId) return { success: false, error: 'User not authenticated' }

    setLoading(true)
    setError(null)

    try {
      const result = await documentService.updateDocument(documentId, userId, updateData)
      if (result.success && result.data) {
        setDocuments(prev => 
          prev.map(d => d.id === documentId ? result.data! : d)
        )
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update document'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [userId])

  const deleteDocument = useCallback(async (documentId: string) => {
    if (!userId) return { success: false, error: 'User not authenticated' }

    setLoading(true)
    setError(null)

    try {
      const result = await documentService.deleteDocument(documentId, userId)
      if (result.success) {
        setDocuments(prev => prev.filter(d => d.id !== documentId))
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [userId])

  const downloadDocument = useCallback(async (documentId: string) => {
    if (!userId) return { success: false, error: 'User not authenticated' }

    try {
      const result = await documentService.getDownloadURL(documentId, userId)
      if (result.success && result.data) {
        // Create download link
        const link = document.createElement('a')
        link.href = result.data
        link.download = documents.find(d => d.id === documentId)?.originalName || 'document'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download document'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [userId, documents])

  const getDocumentsByType = useCallback(async (type: Document['type']) => {
    if (!userId) return []

    try {
      return await documentService.getDocumentsByType(userId, type)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get documents by type')
      return []
    }
  }, [userId])

  const getDocumentsByTransaction = useCallback(async (transactionId: string) => {
    if (!userId) return []

    try {
      return await documentService.getDocumentsByTransaction(userId, transactionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get documents by transaction')
      return []
    }
  }, [userId])

  const getStorageUsage = useCallback(async () => {
    if (!userId) return null

    try {
      return await documentService.getUserStorageUsage(userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get storage usage')
      return null
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      loadDocuments()
    }
  }, [userId, loadDocuments])

  return {
    documents,
    loading,
    error,
    pagination,
    loadDocuments,
    uploadDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
    getDocumentsByType,
    getDocumentsByTransaction,
    getStorageUsage,
    setError
  }
}
