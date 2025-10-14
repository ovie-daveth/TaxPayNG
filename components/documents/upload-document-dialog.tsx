"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Upload, X, FileText, Loader2 } from "lucide-react"
import { UploadDocumentData } from "@/lib/types/document"

interface UploadDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => voidk
  onUpload: (data: UploadDocumentData) => Promise<any>
}

export function UploadDocumentDialog({ open, onOpenChange, onUpload }: UploadDocumentDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: '' as 'receipt' | 'invoice' | 'proof' | 'other' | '',
    date: '',
    linkedTransaction: 'none',
    notes: ''
  })
  const [isUploading, setIsUploading] = useState(false)


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      
      // Auto-fill name if empty
      if (!formData.name) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setFormData(prev => ({ ...prev, name: nameWithoutExt }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile || !formData.name || !formData.type) {
      return
    }

    setIsUploading(true)

    try {
      const uploadData: UploadDocumentData = {
        file: selectedFile,
        name: formData.name,
        type: formData.type as 'receipt' | 'invoice' | 'proof' | 'other',
        date: formData.date || new Date().toISOString(),
        linkedTransaction: formData.linkedTransaction === 'none' ? undefined : formData.linkedTransaction || undefined,
        notes: formData.notes || undefined
      }

      await onUpload(uploadData)
      
      // Reset form
      setSelectedFile(null)
      setFormData({
        name: '',
        type: '',
        date: '',
        linkedTransaction: 'none',
        notes: ''
      })
      
      onOpenChange(false)
      
      // Refresh the page to show the new document
      window.location.reload()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Select File</Label>
            {!selectedFile ? (
              <label className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer block">
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileSelect} 
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" 
                />
                <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF, PNG, JPG, DOC up to 10MB</p>
              </label>
            ) : (
              <div className="border border-border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedFile(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-name">Document Name *</Label>
            <Input 
              id="doc-name" 
              placeholder="e.g., Office Rent Receipt - January 2025"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Document Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger id="doc-type">
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
            <div className="space-y-2">
              <Label htmlFor="upload-date">Date</Label>
              <Input 
                id="upload-date" 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-transaction">Link to Transaction (Optional)</Label>
            <Select 
              value={formData.linkedTransaction} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, linkedTransaction: value }))}
            >
              <SelectTrigger id="link-transaction">
                <SelectValue placeholder="Select transaction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Office Rent - ₦120,000">Office Rent - ₦120,000</SelectItem>
                <SelectItem value="Client Payment - ₦450,000">Client Payment - ₦450,000</SelectItem>
                <SelectItem value="Software Subscription - ₦25,000">Software Subscription - ₦25,000</SelectItem>
                <SelectItem value="Marketing & Advertising - ₦75,000">Marketing & Advertising - ₦75,000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea 
              id="notes" 
              placeholder="Add any additional notes about this document..." 
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-transparent"
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
              className="flex-1" 
              disabled={!selectedFile || !formData.name || !formData.type || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Document'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
