"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, ImageIcon, File, Download, Eye, Trash2, MoreVertical, LinkIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import type { Document } from "@/lib/types"
import { transactionService } from "@/lib/services"

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "pdf":
      return <FileText className="w-5 h-5" />
    case "image":
      return <ImageIcon className="w-5 h-5" />
    default:
      return <File className="w-5 h-5" />
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case "receipt":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
    case "invoice":
      return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
    case "proof":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300"
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

interface DocumentListProps {
  documents: Document[]
  onView: (document: Document) => void
  onDownload: (document: Document) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function DocumentList({ documents, onView, onDownload, onDelete }: DocumentListProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [transactionDescriptions, setTransactionDescriptions] = useState<Record<string, string>>({})

  // Fetch transaction descriptions for linked transactions
  useEffect(() => {
    const fetchTransactionDescriptions = async () => {
      const transactionIds = documents
        .filter(doc => doc.linkedTransaction)
        .map(doc => doc.linkedTransaction!)
        .filter((id, index, self) => self.indexOf(id) === index) // Unique IDs

      if (transactionIds.length === 0) return

      const descriptions: Record<string, string> = {}
      
      await Promise.all(
        transactionIds.map(async (id) => {
          try {
            const transaction = await transactionService.getById(id)
            if (transaction && transaction.description) {
              descriptions[id] = transaction.description
            }
          } catch (error) {
            console.error(`Failed to fetch transaction ${id}:`, error)
            descriptions[id] = id // Fallback to ID if fetch fails
          }
        })
      )

      setTransactionDescriptions(descriptions)
    }

    fetchTransactionDescriptions()
  }, [documents])

  const handleDownload = async (document: Document) => {
    try {
      await onDownload(document)
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  const openDeleteModal = (document: Document) => {
    setDocumentToDelete(document)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false)
      setDocumentToDelete(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return
    
    setIsDeleting(true)
    try {
      await onDelete(documentToDelete.id)
      closeDeleteModal()
    } catch (error) {
      console.error('Failed to delete document:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (documents.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No documents yet</h3>
          <p className="text-muted-foreground">Upload your first document to get started.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-border">
        {documents.map((doc) => (
          <div key={doc.id} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(doc.type)}`}
              >
                {getFileIcon(doc.fileType)}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm mb-1 truncate">{doc.name}</h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {doc.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatFileSize(doc.size)}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{formatDate(doc.uploadedAt)}</span>
                  {doc.linkedTransaction && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <LinkIcon className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">
                          {transactionDescriptions[doc.linkedTransaction] || doc.linkedTransaction}
                        </span>
                      </div>
                    </>
                  )}
                  {doc.notes && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={doc.notes}>
                        {doc.notes}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => onView(doc)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                  <Download className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(doc)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload(doc)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => openDeleteModal(doc)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title="Delete Document"
        description={`Are you sure you want to delete "${documentToDelete?.name}"? This action cannot be undone.`}
      />
    </Card>
  )
}
