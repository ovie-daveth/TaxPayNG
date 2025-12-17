"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Upload, X, FileText, Loader2, Check } from "lucide-react"
import { UploadDocumentData } from "@/lib/types/document"
import { uploadToImageKit, ImageUploadResult } from "@/lib/utils/imagekit"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"
import { transactionService } from "@/lib/services"
import { Transaction } from "@/lib/types"

interface UploadDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (data: UploadDocumentData) => Promise<any>
}

export function UploadDocumentDialog({ open, onOpenChange, onUpload }: UploadDocumentDialogProps) {
  const { user } = useAuth()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedImage, setUploadedImage] = useState<ImageUploadResult | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: '' as 'receipt' | 'invoice' | 'proof' | 'other' | '',
    date: '',
    linkedTransaction: 'none',
    notes: ''
  })
  const [isUploading, setIsUploading] = useState(false)

  // Load transactions
  useEffect(() => {
    const loadTransactions = async () => {
      if (!user || !open) return
      
      setLoadingTransactions(true)
      try {
        const recentTransactions = await transactionService.getRecentTransactions(user.uid, 50)
        setTransactions(recentTransactions)
      } catch (error) {
        console.error('Failed to load transactions:', error)
      } finally {
        setLoadingTransactions(false)
      }
    }

    loadTransactions()
  }, [user, open])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      
      // Auto-fill name if empty
      if (!formData.name) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setFormData(prev => ({ ...prev, name: nameWithoutExt }))
      }

      // Upload to ImageKit
      setUploadingImage(true)
      try {
        const result = await uploadToImageKit(file, 'documents')
        setUploadedImage(result)
        toast.success('File uploaded successfully!')
      } catch (error) {
        console.error('ImageKit upload failed:', error)
        toast.error('Failed to upload file')
        setSelectedFile(null)
      } finally {
        setUploadingImage(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!uploadedImage || !formData.name || !formData.type || !formData.date) {
      toast.error('Please fill all required fields')
      return
    }

    setIsUploading(true)

    try {
      // Determine file type from the selected file or uploaded image name
      const fileExtension = uploadedImage.name.split('.').pop()?.toLowerCase() || ''
      let mimeType = 'application/octet-stream'
      
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension)) {
        mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension === 'svg' ? 'svg+xml' : fileExtension}`
      } else if (fileExtension === 'pdf') {
        mimeType = 'application/pdf'
      } else if (fileExtension === 'doc') {
        mimeType = 'application/msword'
      } else if (fileExtension === 'docx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      } else if (fileExtension === 'xls') {
        mimeType = 'application/vnd.ms-excel'
      } else if (fileExtension === 'xlsx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } else if (fileExtension === 'csv') {
        mimeType = 'text/csv'
      } else if (fileExtension === 'txt') {
        mimeType = 'text/plain'
      }
      
      // Create a mock file object for the upload (we're actually using the ImageKit URL)
      const mockFile = new File([''], uploadedImage.name, { type: mimeType })
      
      const uploadData: UploadDocumentData = {
        file: mockFile,
        name: formData.name,
        type: formData.type as 'receipt' | 'invoice' | 'proof' | 'other',
        date: formData.date || new Date().toISOString(),
        linkedTransaction: formData.linkedTransaction === 'none' ? undefined : formData.linkedTransaction || undefined,
        notes: formData.notes || undefined,
        imageKitUrl: uploadedImage.url, // Pass ImageKit URL
        imageKitFileId: uploadedImage.fileId // Pass ImageKit fileId for deletion
      }

      const result = await onUpload(uploadData)
      
      if (result) {
        toast.success('Document saved successfully!')
        
        // Reset form
        resetForm()
        onOpenChange(false)
        
        // Dispatch event to refresh documents
        const event = new CustomEvent('documentChanged', { 
          detail: { action: 'created' } 
        })
        window.dispatchEvent(event)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Failed to save document. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setUploadedImage(null)
    setFormData({
      name: '',
      type: '',
      date: '',
      linkedTransaction: 'none',
      notes: ''
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full p-3 sm:p-4 md:p-6">
        <DialogHeader className="pb-2 sm:pb-3">
          <DialogTitle className="text-base sm:text-lg md:text-xl">Upload Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-2 sm:mt-4 overflow-x-hidden">
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-xs sm:text-sm">Select File</Label>
            {!selectedFile ? (
              <label className={`border-2 border-dashed border-border rounded-lg p-4 sm:p-6 md:p-8 text-center hover:border-primary transition-colors cursor-pointer block ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileSelect} 
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  disabled={uploadingImage}
                />
                <Upload className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mx-auto mb-2 sm:mb-3 text-muted-foreground" />
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                  {uploadingImage ? 'Uploading...' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground px-2">Images, PDF, Word, Excel, CSV up to 10MB</p>
              </label>
            ) : uploadingImage ? (
              <div className="border border-border rounded-lg p-3 sm:p-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-spin" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">Uploading to server...</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20 rounded-lg p-3 sm:p-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-green-900 dark:text-green-100 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Uploaded successfully</p>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setSelectedFile(null)
                    setUploadedImage(null)
                  }}
                  className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="doc-name" className="text-xs sm:text-sm">Document Name *</Label>
            <Input 
              id="doc-name" 
              placeholder="e.g., Office Rent Receipt - January 2025"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="h-9 sm:h-10 text-xs sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="doc-type" className="text-xs sm:text-sm">Document Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger id="doc-type" className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="proof">Proof / Certificate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="upload-date" className="text-xs sm:text-sm">Date *</Label>
              <Input 
                id="upload-date" 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="link-transaction" className="text-xs sm:text-sm">Link to Transaction (Optional)</Label>
            <Select 
              value={formData.linkedTransaction} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, linkedTransaction: value }))}
              disabled={loadingTransactions}
            >
              <SelectTrigger id="link-transaction" className="h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder={loadingTransactions ? "Loading transactions..." : "Select transaction"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {transactions.map((transaction) => (
                  <SelectItem key={transaction.id} value={transaction.id}>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>{transaction.type === 'income' ? '↓' : '↑'}</span>
                      <span className="truncate max-w-[150px] sm:max-w-none">{transaction.description}</span>
                      <span className="text-muted-foreground hidden sm:inline">-</span>
                      <span className="font-medium">₦{transaction.amount.toLocaleString()}</span>
                    </div>
                  </SelectItem>
                ))}
                {transactions.length === 0 && !loadingTransactions && (
                  <SelectItem value="no-transactions" disabled>
                    No transactions available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="notes" className="text-xs sm:text-sm">Notes (Optional)</Label>
            <Textarea 
              id="notes" 
              placeholder="Add any additional notes about this document..." 
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="text-xs sm:text-sm resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-transparent h-9 sm:h-10 text-xs sm:text-sm"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-9 sm:h-10 text-xs sm:text-sm" 
              disabled={!uploadedImage || !formData.name || !formData.type || !formData.date || isUploading || uploadingImage}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                  Saving...
                </>
              ) : uploadingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Save Document'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
