"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Upload, Scan, Loader2, AlertCircle } from "lucide-react"
import { Transaction } from "@/lib/types"
import { toast } from "sonner"
import { formatDateForInput } from "@/lib/utils/date"
import { uploadToImageKit, ImageUploadResult } from "@/lib/utils/imagekit"
import { TagsInput } from "@/components/ui/tags-input"
import { ocrService, ReceiptData } from "@/lib/services"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<any>
  transaction?: Transaction | null
  defaultType?: Transaction['type']
  defaultCategory?: string
  defaultDescription?: string
}

export function AddTransactionDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  transaction,
  defaultType,
  defaultCategory,
  defaultDescription
}: AddTransactionDialogProps) {
  const [formData, setFormData] = useState({
    type: 'income' as Transaction['type'],
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    paymentMethod: 'Bank Transfer',
    notes: '',
    taxDeductible: false,
    tags: [] as string[],
    attachments: [] as string[]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadedImages, setUploadedImages] = useState<ImageUploadResult[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [ocrResult, setOcrResult] = useState<ReceiptData | null>(null)
  const [ocrProgress, setOcrProgress] = useState(0)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...filesArray])
      
      // Auto-upload files to ImageKit
      await uploadFilesToImageKit(filesArray)
    }
  }

  const handleScanReceipt = async (file: File) => {
    setIsScanning(true)
    setOcrProgress(0)
    setOcrResult(null)

    try {
      // Show progress updates
      const progressInterval = setInterval(() => {
        setOcrProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Perform OCR
      const result = await ocrService.extractReceiptData(file)
      
      clearInterval(progressInterval)
      setOcrProgress(100)

      // Auto-populate form fields
      if (result.amount) {
        setFormData(prev => ({
          ...prev,
          amount: result.amount,
          date: result.date || prev.date,
          description: result.description || prev.description,
          category: result.category || prev.category,
          taxDeductible: result.taxDeductible || prev.taxDeductible,
          notes: result.notes || prev.notes, // Extract remarks/notes from receipt
          type: 'expense' as Transaction['type'] // Receipts are usually expenses
        }))
      }

      setOcrResult(result)

      // Show success message with confidence
      const confidencePercent = Math.round(result.confidence)
      if (confidencePercent >= 70) {
        toast.success(`Receipt scanned! Extracted data with ${confidencePercent}% confidence.`)
      } else {
        toast.warning(`Receipt scanned with ${confidencePercent}% confidence. Please review the extracted data.`)
      }
    } catch (error) {
      console.error('OCR scanning failed:', error)
      toast.error('Failed to scan receipt. Please try again or enter details manually.')
    } finally {
      setIsScanning(false)
      setTimeout(() => setOcrProgress(0), 1000)
    }
  }

  const handleFileSelectWithOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      
      // Check if it's an image file or PDF
      if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // Offer to scan the receipt
        const shouldScan = window.confirm('Would you like to scan this receipt to auto-fill transaction details?')
        
        if (shouldScan) {
          await handleScanReceipt(file)
        }
      }
      
      // Always upload the file
      setSelectedFiles(prev => [...prev, file])
      await uploadFilesToImageKit([file])
    }
  }

  const uploadFilesToImageKit = async (files: File[]) => {
    setUploadingImages(true)
    
    try {
      const uploadPromises = files.map(file => uploadToImageKit(file, 'transactions'))
      const results = await Promise.all(uploadPromises)
      
      setUploadedImages(prev => [...prev, ...results])
      toast.success(`${files.length} image(s) uploaded successfully!`)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload some images')
    } finally {
      setUploadingImages(false)
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type,
        description: transaction.description,
        amount: transaction.amount.toString(),
        date: formatDateForInput(transaction.date),
        category: transaction.category,
        paymentMethod: transaction.paymentMethod,
        notes: transaction.notes || '',
        taxDeductible: transaction.taxDeductible,
        tags: transaction.tags || [],
        attachments: transaction.attachments || []
      })
      setSelectedFiles([])
      setUploadedImages([])
      setOcrResult(null)
    } else {
      setFormData({
        type: defaultType ?? 'income',
        description: defaultDescription ?? '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: defaultCategory ?? '',
        paymentMethod: 'Bank Transfer',
        notes: '',
        taxDeductible: false,
        tags: [],
        attachments: []
      })
      setSelectedFiles([])
      setUploadedImages([])
      setOcrResult(null)
    }
  }, [transaction, open, defaultType, defaultCategory, defaultDescription])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description || !formData.amount || !formData.category) return

    console.log("Before submission:", formData)
    setIsSubmitting(true)
    try {
      // Get image URLs from uploaded images
      const imageUrls = uploadedImages.map(img => img.url)
      
      const result = await onSubmit({
        type: formData.type,
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes,
        taxDeductible: formData.taxDeductible,
        tags: formData.tags,
        attachments: imageUrls
      })

      console.log("Result:", result)
      
      if (result.success) {
        const hasAttachments = uploadedImages.length > 0
        const successMessage = transaction 
          ? 'Transaction updated successfully!' 
          : hasAttachments 
            ? `Transaction added successfully! ${uploadedImages.length} document(s) also saved.`
            : 'Transaction added successfully!'
        
        toast.success(successMessage)
        onOpenChange(false)
        
        // Dispatch custom event to notify other components of the change
        const event = new CustomEvent('transactionChanged', { 
          detail: { 
            action: transaction ? 'updated' : 'created',
            transactionId: result.data?.id 
          } 
        })
        window.dispatchEvent(event)
        
        // Dispatch document changed event if documents were created
        if (hasAttachments && !transaction) {
          const docEvent = new CustomEvent('documentChanged', { 
            detail: { action: 'created' } 
          })
          window.dispatchEvent(docEvent)
        }
      } else {
        toast.error(result.error || 'Failed to save transaction')
      }
    } catch (error) {
      console.error('Error submitting transaction:', error)
      toast.error('Failed to save transaction')
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Attach Receipt/Invoice</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*,.pdf'
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) {
                      await handleScanReceipt(file)
                      // Also add to selected files
                      setSelectedFiles(prev => [...prev, file])
                      await uploadFilesToImageKit([file])
                    }
                  }
                  input.click()
                }}
                disabled={isScanning || uploadingImages}
                className="gap-2"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4" />
                    Scan Receipt
                  </>
                )}
              </Button>
            </div>
            
            {isScanning && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>Scanning receipt... {ocrProgress}%</p>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">This may take a few seconds...</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {ocrResult && (
              <Alert className={ocrResult.confidence >= 70 ? 'border-green-500' : 'border-yellow-500'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {ocrResult.confidence >= 70 ? '✓ Data extracted successfully' : '⚠ Low confidence - please review'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confidence: {Math.round(ocrResult.confidence)}% | 
                      Amount: {ocrResult.amount ? `₦${ocrResult.amount}` : 'Not found'} | 
                      Merchant: {ocrResult.merchant || 'Not found'}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setOcrResult(null)}
                      className="mt-2 h-6 text-xs"
                    >
                      Dismiss
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <input
              type="file"
              id="file-upload"
              className="hidden"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={handleFileSelectWithOCR}
              disabled={uploadingImages || isScanning}
            />
            <label
              htmlFor="file-upload"
              className={`border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors block ${
                uploadingImages || isScanning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {uploadingImages ? 'Uploading...' : isScanning ? 'Scanning...' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Images, PDF, Word, Excel, CSV up to 10MB</p>
            </label>
            
            {uploadedImages.length > 0 && (
              <div className="space-y-2 mt-2">
                <p className="text-sm font-medium text-primary">✅ Uploaded Files:</p>
                {uploadedImages.map((image, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                        <Upload className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-sm font-medium">{image.name}</span>
                        <p className="text-xs text-muted-foreground">Uploaded successfully</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as Transaction['type'] }))}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="relief">Tax Relief</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input 
                id="amount" 
                type="number" 
                placeholder="0.00" 
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input 
              id="description" 
              placeholder="e.g., Client payment for website design" 
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Services">Services</SelectItem>
                  <SelectItem value="Consulting">Consulting</SelectItem>
                  <SelectItem value="Projects">Projects</SelectItem>
                  <SelectItem value="Rent">Rent</SelectItem>
                  <SelectItem value="Software">Software</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input 
                id="date" 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea 
              id="notes" 
              placeholder="Add any additional notes..." 
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags (Optional)</Label>
            <TagsInput
              tags={formData.tags}
              onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
              placeholder="Add tags like 'business', 'travel', 'meals'..."
              maxTags={5}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="tax-deductible" className="cursor-pointer">
                Tax Deductible
              </Label>
              <p className="text-xs text-muted-foreground">Mark this expense as tax deductible</p>
            </div>
            <Switch 
              id="tax-deductible" 
              checked={formData.taxDeductible}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, taxDeductible: checked }))}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (transaction ? 'Update Transaction' : 'Add Transaction')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
