"use client"

import { useState, useMemo } from "react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Filter, Grid, List } from "lucide-react"
import { DocumentGrid } from "@/components/documents/document-grid"
import { DocumentList } from "@/components/documents/document-list"
import { DocumentFilters } from "@/components/documents/document-filters"
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDocumentsFirebase } from "@/lib/hooks/use-documents-firebase"
import { DocumentFilters as FilterType } from "@/lib/types/document"
import { DocumentsSkeleton } from "@/components/ui/skeletons"

export default function DocumentsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<FilterType>({})
  
  const { documents, filterDocuments, loading, error, uploadDocument, deleteDocument, downloadDocument } = useDocumentsFirebase()

  // Filter documents based on search and filters
  const filteredDocuments = useMemo(() => {
    return filterDocuments({
      ...filters,
      search: searchQuery || undefined
    })
  }, [documents, searchQuery, filters, filterDocuments])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <div className="flex-1 md:ml-64">
          <DashboardHeader />
          <main className="container mx-auto px-4 py-6 max-w-7xl">
            <DocumentsSkeleton />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="">
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search documents..." 
                  className="pl-9" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "list")}>
                  <TabsList>
                    <TabsTrigger value="grid" className="px-3">
                      <Grid className="w-4 h-4" />
                    </TabsTrigger>
                    <TabsTrigger value="list" className="px-3">
                      <List className="w-4 h-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive text-sm">{error}</p>
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
                <p className="text-sm text-muted-foreground mb-4">
                  Showing {filteredDocuments.length} of {documents.length} documents
                </p>
              )}
              {viewMode === "grid" ? (
                <DocumentGrid 
                  documents={filteredDocuments} 
                  onDelete={deleteDocument}
                  onDownload={downloadDocument}
                />
              ) : (
                <DocumentList 
                  documents={filteredDocuments}
                  onDelete={deleteDocument}
                  onDownload={downloadDocument}
                />
              )}
            </div>
          </div>
        </main>
    </div>
  )
}
