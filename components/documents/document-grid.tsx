"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, ImageIcon, File, Download, Eye, Trash2, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const documents = [
  {
    id: 1,
    name: "Office Rent Receipt - January 2025.pdf",
    type: "receipt",
    fileType: "pdf",
    size: "245 KB",
    uploadedAt: "2025-01-15",
    linkedTransaction: "Office Rent",
  },
  {
    id: 2,
    name: "Client Invoice - Website Design.pdf",
    type: "invoice",
    fileType: "pdf",
    size: "189 KB",
    uploadedAt: "2025-01-14",
    linkedTransaction: "Client Payment - Website Design",
  },
  {
    id: 3,
    name: "Software Subscription Receipt.png",
    type: "receipt",
    fileType: "image",
    size: "512 KB",
    uploadedAt: "2025-01-10",
    linkedTransaction: "Software Subscription",
  },
  {
    id: 4,
    name: "Tax Clearance Certificate 2024.pdf",
    type: "proof",
    fileType: "pdf",
    size: "1.2 MB",
    uploadedAt: "2025-01-08",
    linkedTransaction: null,
  },
  {
    id: 5,
    name: "Bank Statement - December 2024.pdf",
    type: "proof",
    fileType: "pdf",
    size: "890 KB",
    uploadedAt: "2025-01-05",
    linkedTransaction: null,
  },
  {
    id: 6,
    name: "Marketing Invoice.pdf",
    type: "invoice",
    fileType: "pdf",
    size: "156 KB",
    uploadedAt: "2025-01-02",
    linkedTransaction: "Marketing & Advertising",
  },
]

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "pdf":
      return <FileText className="w-8 h-8" />
    case "image":
      return <ImageIcon className="w-8 h-8" />
    default:
      return <File className="w-8 h-8" />
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case "receipt":
      return "bg-blue-100 text-blue-700"
    case "invoice":
      return "bg-green-100 text-green-700"
    case "proof":
      return "bg-purple-100 text-purple-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

export function DocumentGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getTypeColor(doc.type)}`}>
              {getFileIcon(doc.fileType)}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h3 className="font-medium text-sm mb-2 line-clamp-2">{doc.name}</h3>

          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="text-xs capitalize">
              {doc.type}
            </Badge>
            <span className="text-xs text-muted-foreground">{doc.size}</span>
          </div>

          {doc.linkedTransaction && (
            <div className="bg-muted/50 rounded p-2 mb-3">
              <p className="text-xs text-muted-foreground mb-0.5">Linked to:</p>
              <p className="text-xs font-medium truncate">{doc.linkedTransaction}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">Uploaded {doc.uploadedAt}</p>
        </Card>
      ))}
    </div>
  )
}
