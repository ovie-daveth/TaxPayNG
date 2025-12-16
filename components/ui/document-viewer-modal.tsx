"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink, FileText, File } from "lucide-react"
import type { Document } from "@/lib/types"

interface DocumentViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: Document | null
}

export function DocumentViewerModal({ 
  open, 
  onOpenChange, 
  document 
}: DocumentViewerModalProps) {
  if (!document) return null

  const isImage = document.fileType === 'image' || document.mimeType.startsWith('image/')
  const isPdf = document.fileType === 'pdf' || document.mimeType === 'application/pdf'
  const canPreview = isImage || isPdf

  const handleDownload = async () => {
    try {
      const response = await fetch(document.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = document.originalName
      window.document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      window.document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  const openInNewTab = () => {
    window.open(document.url, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] sm:max-h-[90vh] p-0 overflow-hidden w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader className="p-3 sm:p-4 md:p-6 pb-3 sm:pb-4 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg truncate max-w-full sm:max-w-none">
              {isImage ? (
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              ) : isPdf ? (
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
              ) : (
                <File className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              )}
              <span className="truncate">{document.name}</span>
            </DialogTitle>
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial h-8 sm:h-9 text-xs sm:text-sm"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Download</span>
                <span className="sm:hidden">Download</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial h-8 sm:h-9 text-xs sm:text-sm"
              >
                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Open in New Tab</span>
                <span className="sm:hidden">Open</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex-1 min-h-0 overflow-hidden">
          {canPreview ? (
            <div className="relative h-[50vh] sm:h-[60vh] md:h-[70vh] flex items-center justify-center bg-muted/30 overflow-auto">
              {isImage ? (
                <img
                  src={document.url}
                  alt={document.name}
                  className="max-h-full max-w-full object-contain p-2 sm:p-4"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg'
                  }}
                />
              ) : isPdf ? (
                <iframe
                  src={document.url}
                  className="w-full h-full border-0"
                  title={document.name}
                />
              ) : null}
            </div>
          ) : (
            <div className="h-[50vh] sm:h-[60vh] md:h-[70vh] flex flex-col items-center justify-center bg-muted/30 p-4 sm:p-6 md:p-8 overflow-auto">
              <div className="max-w-md text-center space-y-3 sm:space-y-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
                  <File className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2 truncate px-2">{document.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                    File type: {document.mimeType}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Size: {(document.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground px-2">
                  Preview not available for this file type. Download to view.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2 sm:pt-4 w-full sm:w-auto">
                  <Button onClick={handleDownload} size="lg" className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm">
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    Download File
                  </Button>
                  <Button onClick={openInNewTab} variant="outline" size="lg" className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm">
                    <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Open in New Tab</span>
                    <span className="sm:hidden">Open</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Document Info Footer */}
        <div className="p-2 sm:p-3 md:p-4 border-t bg-muted/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-0 text-xs text-muted-foreground">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 md:gap-4 flex-wrap">
              <span className="truncate max-w-full sm:max-w-none">Original: <span className="truncate">{document.originalName}</span></span>
              <span className="hidden sm:inline">•</span>
              <span>Type: {document.type}</span>
            </div>
            <div className="text-xs sm:text-xs">
              Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

