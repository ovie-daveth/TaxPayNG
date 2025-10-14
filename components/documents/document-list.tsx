"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, ImageIcon, File, Download, Eye, Trash2, MoreVertical, LinkIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Document } from "@/lib/types/document"

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
  onDownload: (document: Document) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function DocumentList({ documents, onDownload, onDelete }: DocumentListProps) {
  const handleView = (document: Document) => {
    window.open(document.url, '_blank')
  }

  const handleDownload = async (document: Document) => {
    try {
      await onDownload(document)
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  const handleDelete = async (document: Document) => {
    if (confirm(`Are you sure you want to delete "${document.name}"?`)) {
      try {
        await onDelete(document.id)
      } catch (error) {
        console.error('Failed to delete document:', error)
      }
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
                        <span className="truncate max-w-[200px]">{doc.linkedTransaction}</span>
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
                <Button variant="ghost" size="icon" onClick={() => handleView(doc)}>
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
                    <DropdownMenuItem onClick={() => handleView(doc)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload(doc)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDelete(doc)}
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
    </Card>
  )
}
