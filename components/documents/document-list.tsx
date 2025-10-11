"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, ImageIcon, File, Download, Eye, Trash2, MoreVertical, LinkIcon } from "lucide-react"
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
      return "bg-blue-100 text-blue-700"
    case "invoice":
      return "bg-green-100 text-green-700"
    case "proof":
      return "bg-purple-100 text-purple-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

export function DocumentList() {
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
                  <span className="text-xs text-muted-foreground">{doc.size}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{doc.uploadedAt}</span>
                  {doc.linkedTransaction && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <LinkIcon className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{doc.linkedTransaction}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="ghost" size="icon">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
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
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
