"use client"

import { useState, useEffect, useCallback } from 'react'
import { Document, DocumentFilters, UploadDocumentData } from '@/lib/types/document'

// In a real app, this would be replaced with API calls
const STORAGE_KEY = 'taxpay-documents'

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load documents from localStorage on mount
  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      console.log('Loading documents from localStorage:', stored)
      if (stored) {
        const parsedDocs = JSON.parse(stored)
        console.log('Parsed documents:', parsedDocs)
        setDocuments(parsedDocs)
      }
    } catch (err) {
      console.error('Failed to load documents:', err)
      setError('Failed to load documents')
    }
  }, [])

  const saveDocuments = useCallback((docs: Document[]) => {
    try {
      console.log('Saving documents to localStorage:', docs)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs))
      console.log('Setting documents state:', docs)
      setDocuments(docs)
    } catch (err) {
      console.error('Failed to save documents:', err)
      setError('Failed to save documents')
    }
  }, [])

  const uploadDocument = useCallback(async (data: UploadDocumentData) => {
    setLoading(true)
    setError(null)

    try {
      // Create object URL for the file
      const url = URL.createObjectURL(data.file)
      
      // Generate thumbnail for images
      let thumbnailUrl: string | undefined
      if (data.file.type.startsWith('image/')) {
        thumbnailUrl = url // Use the same URL as thumbnail for images
      }

      const newDocument: Document = {
        id: crypto.randomUUID(),
        name: data.name,
        originalName: data.file.name,
        type: data.type,
        fileType: data.file.type.startsWith('image/') ? 'image' : 
                  data.file.type === 'application/pdf' ? 'pdf' : 'document',
        mimeType: data.file.type,
        size: data.file.size,
        uploadedAt: data.date || new Date().toISOString(),
        linkedTransaction: data.linkedTransaction,
        notes: data.notes,
        url,
        thumbnailUrl
      }

      console.log('Uploading document:', newDocument)
      console.log('Current documents:', documents)
      
      const updatedDocuments = [...documents, newDocument]
      console.log('Updated documents:', updatedDocuments)
      
      saveDocuments(updatedDocuments)
      
      return newDocument
    } catch (err) {
      console.error('Failed to upload document:', err)
      setError('Failed to upload document')
      throw err
    } finally {
      setLoading(false)
    }
  }, [documents, saveDocuments])

  const deleteDocument = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const doc = documents.find(d => d.id === id)
      if (doc) {
        // Revoke object URL to free memory
        URL.revokeObjectURL(doc.url)
        if (doc.thumbnailUrl && doc.thumbnailUrl !== doc.url) {
          URL.revokeObjectURL(doc.thumbnailUrl)
        }
      }

      const updatedDocuments = documents.filter(d => d.id !== id)
      saveDocuments(updatedDocuments)
    } catch (err) {
      console.error('Failed to delete document:', err)
      setError('Failed to delete document')
      throw err
    } finally {
      setLoading(false)
    }
  }, [documents, saveDocuments])

  const downloadDocument = useCallback((doc: Document) => {
    try {
      // Create a temporary link element to trigger download
      const link = document.createElement('a')
      link.href = doc.url
      link.download = doc.originalName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Failed to download document:', err)
      setError('Failed to download document')
    }
  }, [])

  const filterDocuments = useCallback((filters: DocumentFilters) => {
    let filtered = [...documents]

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(searchLower) ||
        doc.originalName.toLowerCase().includes(searchLower) ||
        (doc.notes && doc.notes.toLowerCase().includes(searchLower))
      )
    }

    if (filters.type) {
      filtered = filtered.filter(doc => doc.type === filters.type)
    }

    if (filters.fileType) {
      filtered = filtered.filter(doc => doc.fileType === filters.fileType)
    }

    if (filters.linkedTransaction !== undefined) {
      filtered = filtered.filter(doc => 
        filters.linkedTransaction ? !!doc.linkedTransaction : !doc.linkedTransaction
      )
    }

    if (filters.dateRange) {
      filtered = filtered.filter(doc => {
        const docDate = new Date(doc.uploadedAt)
        const startDate = new Date(filters.dateRange!.start)
        const endDate = new Date(filters.dateRange!.end)
        return docDate >= startDate && docDate <= endDate
      })
    }

    return filtered
  }, [documents])

  return {
    documents,
    loading,
    error,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    filterDocuments,
    clearError: () => setError(null)
  }
}
