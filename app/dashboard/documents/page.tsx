"use client"

import { useState } from "react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Filter, Grid, List } from "lucide-react"
import { DocumentGrid } from "@/components/documents/document-grid"
import { DocumentList } from "@/components/documents/document-list"
import { DocumentFilters } from "@/components/documents/document-filters"
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DocumentsPage() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="flex-1 md:ml-64">
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 max-w-7xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Documents</h1>
                <p className="text-sm text-muted-foreground mt-1">Store and manage receipts, invoices, and proofs</p>
              </div>
              <Button size="sm" onClick={() => setIsUploadDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search documents..." className="pl-9" />
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

            {/* Filters Panel */}
            {isFilterOpen && <DocumentFilters />}

            {/* Document Display */}
            {viewMode === "grid" ? <DocumentGrid /> : <DocumentList />}
          </div>
        </main>
      </div>

      <UploadDocumentDialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen} />
    </div>
  )
}
