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
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {isImage ? (
                <FileText className="w-5 h-5" />
              ) : isPdf ? (
                <FileText className="w-5 h-5 text-red-500" />
              ) : (
                <File className="w-5 h-5" />
              )}
              {document.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex-1 min-h-0">
          {canPreview ? (
            <div className="relative h-[70vh] flex items-center justify-center bg-muted/30">
              {isImage ? (
                <img
                  src={document.url}
                  alt={document.name}
                  className="max-h-full max-w-full object-contain"
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
            <div className="h-[70vh] flex flex-col items-center justify-center bg-muted/30 p-8">
              <div className="max-w-md text-center space-y-4">
                <div className="w-20 h-20 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
                  <File className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{document.name}</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    File type: {document.mimeType}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Size: {(document.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Preview not available for this file type. Download to view.
                </p>
                <div className="flex gap-2 justify-center pt-4">
                  <Button onClick={handleDownload} size="lg">
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </Button>
                  <Button onClick={openInNewTab} variant="outline" size="lg">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Document Info Footer */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Original: {document.originalName}</span>
              <span>•</span>
              <span>Type: {document.type}</span>
            </div>
            <div>
              Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

