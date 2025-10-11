export interface Document {
  id: string
  name: string
  originalName: string
  type: 'receipt' | 'invoice' | 'proof' | 'other'
  fileType: 'pdf' | 'image' | 'document'
  mimeType: string
  size: number
  uploadedAt: string
  linkedTransaction?: string
  notes?: string
  url: string
  thumbnailUrl?: string
}

export interface DocumentFilters {
  type?: Document['type']
  fileType?: Document['fileType']
  dateRange?: {
    start: string
    end: string
  }
  search?: string
  linkedTransaction?: boolean
}

export interface UploadDocumentData {
  file: File
  name: string
  type: Document['type']
  date: string
  linkedTransaction?: string
  notes?: string
}
