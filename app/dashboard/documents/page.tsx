"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Filter, Grid, List, Loader2 } from "lucide-react"
import { DocumentGrid } from "@/components/documents/document-grid"
import { DocumentList } from "@/components/documents/document-list"
import { DocumentFilters } from "@/components/documents/document-filters"
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDocumentsFirebase } from "@/lib/hooks/use-documents-firebase"
import { DocumentFilters as FilterType } from "@/lib/types/document"
import { Document } from "@/lib/types"
import { DocumentsSkeleton } from "@/components/ui/skeletons"
import { DocumentViewerModal } from "@/components/ui/document-viewer-modal"

export default function DocumentsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<FilterType>({})
  const [viewerOpen, setViewerOpen] = useState(false)
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  const { 
    documents, 
    filterDocuments, 
    loading, 
    loadingMore,
    hasMore,
    error, 
    uploadDocument, 
    deleteDocument, 
    downloadDocument,
    loadMore
  } = useDocumentsFirebase()

  // Filter documents based on search and filters
  const filteredDocuments = useMemo(() => {
    return filterDocuments({
      ...filters,
      search: searchQuery || undefined
    })
  }, [documents, searchQuery, filters, filterDocuments])

  // Handle view document in modal
  const handleView = (document: Document) => {
    setCurrentDocument(document)
    setViewerOpen(true)
  }

  // Handle download document
  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(doc.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.originalName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  // Infinite scroll: Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMore, loadingMore, loading, loadMore])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
          <main className="">
            <DocumentsSkeleton />
          </main>
      </div>
    )
  }

  return (
    <div className="">
        <main className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search documents..." 
                  className="pl-8 sm:pl-9 h-9 sm:h-10 text-sm" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                {/* <Button onClick={() => setIsUploadOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload
                </Button> */}
                <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)} className="h-9 sm:h-10 text-xs sm:text-sm">
                  <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Filters
                </Button>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "list")}>
                  <TabsList className="h-9 sm:h-10">
                    <TabsTrigger value="grid" className="px-2 sm:px-3">
                      <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </TabsTrigger>
                    <TabsTrigger value="list" className="px-2 sm:px-3">
                      <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 sm:p-4">
                <p className="text-destructive text-xs sm:text-sm">{error}</p>
              </div>
            )}

            {/* Filters Panel */}
            {isFilterOpen && (
              <DocumentFilters 
                filters={filters} 
                onFiltersChange={setFilters}
              />
            )}

            {/* Document Display */}
            <div>
              {filteredDocuments.length > 0 && (
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  Showing {filteredDocuments.length} documents
                </p>
              )}
              {viewMode === "grid" ? (
                <DocumentGrid 
                  documents={filteredDocuments} 
                  onView={handleView}
                  onDelete={async (id) => {
                    console.log('DocumentGrid onDelete called with id:', id)
                    const doc = documents.find(d => d.id === id)
                    console.log('Found document:', doc ? { id: doc.id, name: doc.name } : 'NOT FOUND')
                    if (!doc) {
                      console.error('Document not found for id:', id)
                      throw new Error('Document not found')
                    }
                    await deleteDocument(doc)
                  }}
                  onDownload={handleDownload}
                />
              ) : (
                <DocumentList 
                  documents={filteredDocuments}
                  onView={handleView}
                  onDelete={async (id) => {
                    console.log('DocumentList onDelete called with id:', id)
                    const doc = documents.find(d => d.id === id)
                    console.log('Found document:', doc ? { id: doc.id, name: doc.name } : 'NOT FOUND')
                    if (!doc) {
                      console.error('Document not found for id:', id)
                      throw new Error('Document not found')
                    }
                    await deleteDocument(doc)
                  }}
                  onDownload={handleDownload}
                />
              )}

              {/* Infinite Scroll Trigger */}
              <div ref={loadMoreRef} className="h-16 sm:h-20 flex items-center justify-center">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span className="text-xs sm:text-sm">Loading more documents...</span>
                  </div>
                )}
                {!hasMore && documents.length > 0 && (
                  <p className="text-xs sm:text-sm text-muted-foreground">No more documents to load</p>
                )}
              </div>
            </div>
          </div>
        </main>

      {/* Upload Document Dialog */}
      <UploadDocumentDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUpload={uploadDocument}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        document={currentDocument}
      />
    </div>
  )
}
