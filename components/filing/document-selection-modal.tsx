"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileText, Loader2, X, Eye } from "lucide-react"
import { Document } from "@/lib/types"
import { documentService } from "@/lib/services"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { toast } from "sonner"

interface DocumentSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (selectedDocumentIds: string[]) => void
  userId: string
}

export function DocumentSelectionModal({
  open,
  onOpenChange,
  onConfirm,
  userId
}: DocumentSelectionModalProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string }>>([])
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)

  useEffect(() => {
    if (open && userId) {
      loadDocuments()
    }
  }, [open, userId])

  const loadDocuments = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const result = await documentService.getUserDocuments(userId, undefined, 1, 100)
      setDocuments(result.data || [])
    } catch (error) {
      console.error("Error loading documents:", error)
      toast.error("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentToggle = (documentId: string) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(documentId)) {
        newSet.delete(documentId)
      } else {
        newSet.add(documentId)
      }
      return newSet
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploading(true)
    try {
      // Upload to ImageKit
      const uploadResult = await uploadToImageKit(file, 'filing-documents')

      // Save as document
      const result = await documentService.uploadDocument(userId, {
        file,
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: 'proof',
        imageKitUrl: uploadResult.url,
        imageKitFileId: uploadResult.fileId, // Store fileId for deletion
        fileSize: uploadResult.size,
        notes: 'Supporting document for tax filing'
      })

      if (result.success && result.data) {
        // Add to uploaded files list and select it
        setUploadedFiles(prev => [...prev, { id: result.data!.id, name: result.data!.name }])
        setSelectedDocuments(prev => new Set([...prev, result.data!.id]))
        setDocuments(prev => [result.data!, ...prev])
        toast.success("Document uploaded and selected")
      }
    } catch (error) {
      console.error("Error uploading document:", error)
      toast.error("Failed to upload document")
    } finally {
      setUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  const handleConfirm = () => {
    if (selectedDocuments.size === 0) {
      toast.error("Please select at least one supporting document")
      return
    }
    onConfirm(Array.from(selectedDocuments))
    onOpenChange(false)
  }

  const handleRemoveUploaded = (documentId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== documentId))
    setSelectedDocuments(prev => {
      const newSet = new Set(prev)
      newSet.delete(documentId)
      return newSet
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Supporting Documents</DialogTitle>
          <DialogDescription>
            Select documents from your existing files or upload new ones to support your tax filing request
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="existing" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing Documents</TabsTrigger>
            <TabsTrigger value="upload">Upload New</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="flex-1 overflow-y-auto mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No documents found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleDocumentToggle(doc.id)}
                  >
                    <Checkbox
                      checked={selectedDocuments.has(doc.id)}
                      onCheckedChange={() => handleDocumentToggle(doc.id)}
                    />
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type} • {(doc.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewDocument(doc)
                      }}
                      className="shrink-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-sm font-medium text-primary hover:underline">
                    Click to upload a document
                  </span>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </Label>
                <p className="text-xs text-muted-foreground mt-2">
                  PDF, Images, Word documents (Max 10MB)
                </p>
                {uploading && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Uploading...</span>
                  </div>
                )}
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Recently Uploaded</Label>
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">(Selected)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUploaded(file.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={selectedDocuments.size === 0}>
                Confirm Selection
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Document Preview Modal */}
      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewDocument?.name}</DialogTitle>
            <DialogDescription>
              {previewDocument?.type} • {previewDocument ? (previewDocument.size / 1024).toFixed(1) : '0'} KB
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewDocument && (
              <div className="w-full h-full min-h-[500px]">
                {previewDocument.url?.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={previewDocument.url}
                    className="w-full h-full min-h-[500px] border rounded"
                    title={previewDocument.name}
                  />
                ) : (
                  <img
                    src={previewDocument.url}
                    alt={previewDocument.name}
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDocument(null)}>
              Close
            </Button>
            <Button asChild>
              <a href={previewDocument?.url} target="_blank" rel="noopener noreferrer">
                Open in New Tab
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

