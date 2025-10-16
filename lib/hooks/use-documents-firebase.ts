"use client"

import { useState, useCallback, useEffect } from 'react'
import type { Document } from '@/lib/types'
import { UploadDocumentData, DocumentFilters } from '@/lib/types/document'
import { useAuth } from './useAuth'
import { documentService } from '@/lib/services'

const STORAGE_KEY = 'taxpay-documents'

export function useDocumentsFirebase() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 20

  // Load documents from localStorage (fallback) or Firebase
  const loadDocuments = useCallback(async (page: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      if (user) {
        // Use Firebase service when user is authenticated
        const result = await documentService.getUserDocuments(user.uid, undefined, page, PAGE_SIZE)
        
        if (append) {
          setDocuments(prev => [...prev, ...result.data])
        } else {
          setDocuments(result.data)
        }
        
        setHasMore(result.pagination.hasNext)
        setCurrentPage(page)
        console.log('Loaded documents from Firebase:', result.data)
      } else {
        // Fallback to localStorage when user is not authenticated
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setDocuments(parsed)
          setHasMore(false)
          console.log('Loaded documents from localStorage:', parsed)
        } else {
          setDocuments([])
          setHasMore(false)
          console.log('No documents found in localStorage')
        }
      }
    } catch (err) {
      console.error('Error loading documents:', err)
      setError('Failed to load documents')
      if (!append) {
        setDocuments([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user])

  // Load more documents for infinite scroll
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return
    await loadDocuments(currentPage + 1, true)
  }, [hasMore, loadingMore, loading, currentPage, loadDocuments])

  // Save documents to localStorage (fallback)
  const saveDocuments = useCallback((newDocuments: Document[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDocuments))
      setDocuments(newDocuments)
      console.log('Saved documents to localStorage:', newDocuments)
    } catch (err) {
      console.error('Error saving documents:', err)
      setError('Failed to save documents')
    }
  }, [])

  // Upload a new document
  const uploadDocument = useCallback(async (data: UploadDocumentData) => {
    setLoading(true)
    setError(null)
    try {
      if (user) {
        // Use Firebase service when user is authenticated
        const result = await documentService.uploadDocument(user.uid, data)
        if (result.success && result.data) {
          setDocuments(prev => [result.data!, ...prev])
          console.log('Document uploaded to Firebase successfully:', result.data)
          return result.data
        } else {
          throw new Error(result.error || 'Upload failed')
        }
      } else {
        // Fallback to localStorage when user is not authenticated
        const url = URL.createObjectURL(data.file)
        let thumbnailUrl: string | undefined
        if (data.file.type.startsWith('image/')) {
          thumbnailUrl = url
        }
        
        const now = new Date().toISOString()
        const newDocument: Document = {
          id: crypto.randomUUID(),
          userId: 'local',
          name: data.name,
          originalName: data.file.name,
          type: data.type,
          fileType: data.file.type.startsWith('image/') ? 'image' : 
                    data.file.type === 'application/pdf' ? 'pdf' : 'document',
          mimeType: data.file.type,
          size: data.file.size,
          uploadedAt: data.date || now,
          linkedTransaction: data.linkedTransaction,
          notes: data.notes,
          url,
          thumbnailUrl,
          createdAt: now,
          updatedAt: now
        }
        
        const updatedDocuments = [...documents, newDocument]
        saveDocuments(updatedDocuments)
        console.log('Document uploaded to localStorage successfully:', newDocument)
        return newDocument
      }
    } catch (err) {
      console.error('Error uploading document:', err)
      setError('Failed to upload document')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, documents, saveDocuments])

  // Delete a document
  const deleteDocument = useCallback(async (doc: Document) => {
    try {
      if (user) {
        // Use Firebase service when user is authenticated
        const result = await documentService.deleteDocument(doc.id, user.uid)
        if (result.success) {
          setDocuments(prev => prev.filter(d => d.id !== doc.id))
          console.log('Document deleted from Firebase successfully:', doc.id)
        } else {
          throw new Error(result.error || 'Delete failed')
        }
      } else {
        // Fallback to localStorage when user is not authenticated
        // Revoke object URL to free memory
        if (doc.url) {
          URL.revokeObjectURL(doc.url)
        }
        
        const updatedDocuments = documents.filter(d => d.id !== doc.id)
        saveDocuments(updatedDocuments)
        console.log('Document deleted from localStorage successfully:', doc.id)
      }
    } catch (err) {
      console.error('Error deleting document:', err)
      setError('Failed to delete document')
    }
  }, [user, documents, saveDocuments])

  // Download a document
  const downloadDocument = useCallback(async (doc: Document) => {
    try {
      if (user) {
        // Use Firebase service when user is authenticated
        const result = await documentService.getDownloadURL(doc.id, user.uid)
        if (result.success && result.data) {
          const link = document.createElement('a')
          link.href = result.data
          link.download = doc.originalName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          console.log('Document download from Firebase initiated:', doc.originalName)
        } else {
          throw new Error(result.error || 'Download failed')
        }
      } else {
        // Fallback to localStorage when user is not authenticated
        const link = document.createElement('a')
        link.href = doc.url
        link.download = doc.originalName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        console.log('Document download from localStorage initiated:', doc.originalName)
      }
    } catch (err) {
      console.error('Error downloading document:', err)
      setError('Failed to download document')
    }
  }, [user])

  // Filter documents
  const filterDocuments = useCallback((filters: DocumentFilters) => {
    return documents.filter(doc => {
      if (filters.search && !doc.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !doc.originalName.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }
      if (filters.type && doc.type !== filters.type) {
        return false
      }
      if (filters.fileType && doc.fileType !== filters.fileType) {
        return false
      }
      if (filters.linkedTransaction !== undefined) {
        const isLinked = !!doc.linkedTransaction
        if (filters.linkedTransaction !== isLinked) {
          return false
        }
      }
      if (filters.dateRange) {
        const uploadDate = new Date(doc.uploadedAt)
        const startDate = new Date(filters.dateRange.start)
        const endDate = new Date(filters.dateRange.end)
        if (uploadDate < startDate || uploadDate > endDate) {
          return false
        }
      }
      return true
    })
  }, [documents])

  // Load documents on mount
  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Listen for document changes from other components (e.g., transactions)
  useEffect(() => {
    const handleDocumentChanged = () => {
      if (user) {
        loadDocuments()
      }
    }

    window.addEventListener('documentChanged', handleDocumentChanged)
    
    return () => {
      window.removeEventListener('documentChanged', handleDocumentChanged)
    }
  }, [user, loadDocuments])

  return {
    documents,
    loading,
    loadingMore,
    error,
    hasMore,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    filterDocuments,
    loadDocuments,
    loadMore
  }
}
