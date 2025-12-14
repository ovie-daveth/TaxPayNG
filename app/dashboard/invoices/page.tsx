"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Filter, Download, FileText, Eye, Edit, Trash2, Send, CheckCircle2, Clock, AlertCircle, LayoutGrid, Table2, Receipt, Info, Save, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { invoiceService } from "@/lib/services"
import { Invoice, InvoiceStatus, InvoiceType } from "@/lib/types"
import { toast } from "sonner"
import { AddInvoiceDialog } from "@/components/invoices/add-invoice-dialog"
import { ViewInvoiceDialog } from "@/components/invoices/view-invoice-dialog"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { formatCurrencyAmount } from "@/lib/utils/currency"
import { documentService } from "@/lib/services"
import { uploadToImageKit } from "@/lib/utils/imagekit"

export default function InvoicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { isSubscribed } = useSubscription()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all")
  const [typeFilter, setTypeFilter] = useState<InvoiceType | "all">("all")
  const [showCreditNoteDialog, setShowCreditNoteDialog] = useState(false)
  const [isSavingCreditNote, setIsSavingCreditNote] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<"card" | "table">("table")
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  const loadInvoices = async () => {
    if (!profile?.userId) return
    
    try {
      setLoading(true)
      const filters: any = {}
      if (statusFilter !== "all") {
        filters.status = statusFilter
      }
      if (typeFilter !== "all") {
        filters.invoiceType = typeFilter
      }
      if (searchTerm) {
        filters.search = searchTerm
      }
      
      const result = await invoiceService.getUserInvoices(profile.userId, filters, currentPage, 20)
      setInvoices(result.data)
      setPagination(result.pagination)
    } catch (error) {
      console.error("Error loading invoices:", error)
      toast.error("Failed to load invoices")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [profile?.userId, currentPage, statusFilter, typeFilter, searchTerm])

  // Listen for create invoice event from header
  useEffect(() => {
    const handleCreateInvoice = () => {
      if (!isSubscribed) {
        setShowSubscriptionModal(true)
        return
      }
      setIsAddDialogOpen(true)
    }
    window.addEventListener('createInvoice', handleCreateInvoice)
    return () => window.removeEventListener('createInvoice', handleCreateInvoice)
  }, [isSubscribed])

  // Handle invoiceId query parameter to open specific invoice
  useEffect(() => {
    const invoiceId = searchParams?.get('invoiceId')
    if (invoiceId && invoices.length > 0 && !isViewDialogOpen) {
      const invoice = invoices.find(inv => inv.id === invoiceId)
      if (invoice) {
        setSelectedInvoice(invoice)
        setIsViewDialogOpen(true)
        // Remove query parameter from URL after opening
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('invoiceId')
        router.replace(newUrl.pathname + newUrl.search, { scroll: false })
      }
    }
  }, [searchParams, invoices, router, isViewDialogOpen])

  const getStatusBadge = (status: InvoiceStatus, invoiceType?: InvoiceType) => {
    const variants: Record<InvoiceStatus, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      draft: { variant: "secondary", icon: FileText },
      sent: { variant: "outline", icon: Send },
      paid: { variant: "default", icon: CheckCircle2 },
      overdue: { variant: "destructive", icon: AlertCircle },
      cancelled: { variant: "secondary", icon: FileText }
    }
    const config = variants[status]
    const Icon = config.icon
    
    // For incoming invoices with "sent" status, show "Received" instead
    let statusLabel = status.charAt(0).toUpperCase() + status.slice(1)
    if (status === 'sent' && invoiceType === 'incoming') {
      statusLabel = 'Received'
    }
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {statusLabel}
      </Badge>
    )
  }

  const handleDelete = async (invoiceId: string) => {
    if (!profile?.userId) return
    if (!confirm("Are you sure you want to delete this invoice?")) return

    try {
      const result = await invoiceService.deleteInvoice(invoiceId, profile.userId)
      if (result.success) {
        toast.success("Invoice deleted successfully")
        loadInvoices()
      } else {
        toast.error(result.error || "Failed to delete invoice")
      }
    } catch (error) {
      toast.error("Failed to delete invoice")
    }
  }

  const handleMarkAsSent = async (invoiceId: string) => {
    if (!profile?.userId) return
    try {
      const result = await invoiceService.markAsSent(invoiceId, profile.userId)
      if (result.success) {
        toast.success("Invoice marked as sent")
        loadInvoices()
      } else {
        toast.error(result.error || "Failed to update invoice")
      }
    } catch (error) {
      toast.error("Failed to update invoice")
    }
  }

  const handleMarkAsPaid = async (invoiceId: string) => {
    // This is now handled in the ViewInvoiceDialog with receipt upload
    // Keeping this for backward compatibility but it will open the view dialog
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (invoice) {
      setSelectedInvoice(invoice)
      setIsViewDialogOpen(true)
    }
  }

  const handleSaveCreditNoteAsPDF = async () => {
    if (!selectedInvoice?.whtCreditNote || !profile?.userId) {
      toast.error("Credit note not found")
      return
    }

    try {
      setIsSavingCreditNote(true)

      const creditNote = selectedInvoice.whtCreditNote
      const invoice = selectedInvoice

      // Load jsPDF dynamically
      const { jsPDF } = await import('jspdf')

      // Create jsPDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Set margins
      const margin = 20
      let yPos = margin

      // Helper function to add text with word wrapping
      const addText = (text: string, x: number, y: number, options: { fontSize?: number; fontStyle?: string; align?: 'left' | 'center' | 'right'; color?: [number, number, number] } = {}) => {
        pdf.setFontSize(options.fontSize || 12)
        pdf.setFont('helvetica', options.fontStyle || 'normal')
        if (options.color) {
          pdf.setTextColor(options.color[0], options.color[1], options.color[2])
        } else {
          pdf.setTextColor(0, 0, 0)
        }
        const lines = pdf.splitTextToSize(text, 170) // 210mm - 40mm margins = 170mm
        pdf.text(lines, x, y, { align: options.align || 'left' })
        return y + (lines.length * (options.fontSize || 12) * 0.4)
      }

      // Header
      pdf.setFontSize(24)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      const titleLines = pdf.splitTextToSize('Withholding Tax (WHT) Credit Note', 170)
      pdf.text(titleLines, 105, yPos, { align: 'center' })
      yPos += titleLines.length * 8 + 5

      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(107, 114, 128) // #6b7280
      pdf.text(creditNote.creditNoteNumber, 105, yPos, { align: 'center' })
      yPos += 15

      // Draw line
      pdf.setDrawColor(229, 231, 235) // #e5e7eb
      pdf.setLineWidth(0.5)
      pdf.line(margin, yPos, 190, yPos)
      yPos += 20

      // Credit Note Details
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text('Credit Note Details', margin, yPos)
      yPos += 10

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(107, 114, 128)
      pdf.text('CREDIT NOTE NUMBER', margin, yPos)
      yPos += 5
      pdf.setFontSize(14)
      pdf.setTextColor(0, 0, 0)
      pdf.text(creditNote.creditNoteNumber, margin, yPos)
      yPos += 10

      pdf.setFontSize(10)
      pdf.setTextColor(107, 114, 128)
      pdf.text('ISSUED DATE', margin, yPos)
      yPos += 5
      pdf.setFontSize(14)
      pdf.setTextColor(0, 0, 0)
      pdf.text(format(new Date(creditNote.issuedDate), "MMM dd, yyyy"), margin, yPos)
      yPos += 10

      pdf.setFontSize(10)
      pdf.setTextColor(107, 114, 128)
      pdf.text('INVOICE NUMBER', margin, yPos)
      yPos += 5
      pdf.setFontSize(14)
      pdf.setTextColor(0, 0, 0)
      pdf.text(creditNote.invoiceNumber, margin, yPos)
      yPos += 10

      if (creditNote.certificateNumber) {
        pdf.setFontSize(10)
        pdf.setTextColor(107, 114, 128)
        pdf.text('WHT CERTIFICATE NUMBER', margin, yPos)
        yPos += 5
        pdf.setFontSize(14)
        pdf.setTextColor(0, 0, 0)
        pdf.text(creditNote.certificateNumber, margin, yPos)
        yPos += 10
      }

      yPos += 5

      // Amount Details
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text('Amount Details', margin, yPos)
      yPos += 15

      // Table
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(107, 114, 128)
      pdf.text('Invoice Total:', margin, yPos)
      pdf.setTextColor(0, 0, 0)
      pdf.text(formatCurrencyAmount(creditNote.invoiceTotal, invoice.currency as any), 190, yPos, { align: 'right' })
      yPos += 8

      pdf.setDrawColor(229, 231, 235)
      pdf.line(margin, yPos, 190, yPos)
      yPos += 8

      pdf.setTextColor(107, 114, 128)
      pdf.text(`Withholding Tax (${creditNote.whtRate}%):`, margin, yPos)
      pdf.setTextColor(220, 38, 38) // #dc2626
      pdf.text(`-${formatCurrencyAmount(creditNote.whtAmount, invoice.currency as any)}`, 190, yPos, { align: 'right' })
      yPos += 8

      pdf.setDrawColor(229, 231, 235)
      pdf.setLineWidth(0.5)
      pdf.line(margin, yPos, 190, yPos)
      yPos += 10

      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0, 0, 0)
      pdf.text('Net Amount Paid:', margin, yPos)
      pdf.text(formatCurrencyAmount(creditNote.netAmountPaid, invoice.currency as any), 190, yPos, { align: 'right' })
      yPos += 15

      // Notes
      if (creditNote.notes) {
        pdf.setFillColor(249, 250, 251) // #f9fafb
        pdf.rect(margin, yPos, 170, 20, 'F')
        yPos += 5
        pdf.setFontSize(11)
        pdf.setTextColor(107, 114, 128)
        pdf.text('Notes', margin + 5, yPos)
        yPos += 5
        pdf.setFontSize(12)
        pdf.setTextColor(0, 0, 0)
        const notesLines = pdf.splitTextToSize(creditNote.notes, 160)
        pdf.text(notesLines, margin + 5, yPos)
        yPos += notesLines.length * 5 + 10
      }

      yPos += 10

      // Footer
      pdf.setDrawColor(229, 231, 235)
      pdf.line(margin, yPos, 190, yPos)
      yPos += 15

      pdf.setFontSize(10)
      pdf.setTextColor(107, 114, 128)
      const footer1 = 'This credit note serves as proof that withholding tax was deducted and remitted to the tax authority.'
      const footer1Lines = pdf.splitTextToSize(footer1, 170)
      pdf.text(footer1Lines, 105, yPos, { align: 'center' })
      yPos += footer1Lines.length * 5 + 5

      const footer2 = `Generated on ${format(new Date(), "MMM dd, yyyy 'at' h:mm a")}`
      pdf.text(footer2, 105, yPos, { align: 'center' })

      // Get PDF as blob
      const pdfBlob = pdf.output('blob')

      // Create File from blob
      const pdfFile = new File([pdfBlob], `WHT-Credit-Note-${creditNote.creditNoteNumber}.pdf`, { type: 'application/pdf' })
      
      // Upload to ImageKit
      const uploadResult = await uploadToImageKit(pdfFile, 'documents/credit-notes')
      
      // Get the transaction ID from the invoice
      const transactionId = invoice.linkedTransactionId
      
      // Create document record
      const documentData = {
        file: pdfFile,
        name: `WHT Credit Note - ${creditNote.creditNoteNumber}`,
        type: 'proof' as const,
        date: creditNote.issuedDate,
        linkedTransaction: transactionId || undefined,
        notes: `WHT Credit Note for Invoice ${creditNote.invoiceNumber}. WHT Rate: ${creditNote.whtRate}%, Amount: ${formatCurrencyAmount(creditNote.whtAmount, invoice.currency as any)}`,
        imageKitUrl: uploadResult.url
      }

      const result = await documentService.uploadDocument(profile.userId, documentData)

      if (result.success) {
        toast.success("Credit note saved as PDF document")
        if (transactionId) {
          toast.info("Document linked to transaction")
        }
      } else {
        toast.error(result.error || "Failed to save credit note")
      }
    } catch (error) {
      console.error("Error saving credit note as PDF:", error)
      toast.error("Failed to save credit note as PDF")
    } finally {
      setIsSavingCreditNote(false)
    }
  }

  if (loading && invoices.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-6 h-32" />
          ))}
        </div>
      </div>
    )
  }
console.log("invoices", invoices)
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
          <div className="flex-1 relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search invoices by number, client name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 items-center w-full sm:w-auto">
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | "outgoing" | "incoming")}>
              <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="outgoing">Outgoing (You send)</SelectItem>
              <SelectItem value="incoming">Incoming (You receive)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as InvoiceStatus | "all")}>
              <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="rounded-r-none"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="rounded-l-none"
              >
                <Table2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card className="p-12 text-center px-[20rem]">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== "all" 
              ? "Try adjusting your filters" 
              : "Get started by creating your first invoice"}
          </p>
          {!searchTerm && statusFilter === "all" && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </Card>
      ) : viewMode === "card" ? (
        <div className="space-y-4">
          {invoices.map((invoice) => {
            const isIncoming = invoice.recipientUserId === profile?.userId
            const paymentStatus = isIncoming 
              ? (invoice.clientPaymentStatus || 'Pending')
              : (invoice.supplierPaymentStatus || 'Pending')
            
            return (
            <Card key={invoice.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header with document type, ID, and badges */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      {invoice.whtCreditNote && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setShowCreditNoteDialog(true)
                              }}
                            >
                              <Receipt className="w-3 h-3 mr-1" />
                              <span className="text-xs">Credit Note</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View WHT Credit Note</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    <h3 className="text-lg font-semibold">
                        {isIncoming ? 'Bill' : 'Invoice'} {invoice.invoiceNumber}
                    </h3>
                      {invoice.status === "sent" && (
                        <Badge variant="outline" className="text-xs">
                          {isIncoming ? 'Incoming' : 'Outgoing'}
                  </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={`text-xs capitalize ${
                          paymentStatus === 'paid' 
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' 
                            : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
                        }`}
                      >
                        {paymentStatus}
                      </Badge>
                    </div>
                    
                    {/* Content grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Client/From */}
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                          {isIncoming ? 'From' : 'Client'}
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {isIncoming 
                            ? (invoice.supplier?.name || 'Unknown')
                            : invoice.client.name
                          }
                        </p>
                        {(isIncoming ? invoice.supplier?.email : invoice.client.email) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {isIncoming ? invoice.supplier?.email : invoice.client.email}
                          </p>
                      )}
                    </div>
                      
                      {/* Dates */}
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                          Dates
                        </p>
                        <p className="text-sm text-foreground">
                          Issue: <span className="font-medium">{format(new Date(invoice.issueDate), "MMM dd, yyyy")}</span>
                        </p>
                        <p className="text-sm text-foreground">
                          Due: <span className="font-medium">{format(new Date(invoice.dueDate), "MMM dd, yyyy")}</span>
                        </p>
                    </div>
                      
                      {/* Amount */}
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                          Amount
                        </p>
                        <p className="text-xl font-semibold text-foreground">
                        {invoice.currency} {invoice.total.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                          size="icon"
                          className="h-9 w-9"
                        onClick={() => {
                          setSelectedInvoice(invoice)
                          setIsViewDialogOpen(true)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View Invoice</p>
                    </TooltipContent>
                  </Tooltip>
                  {invoice.status === "draft" && invoice.userId === profile?.userId && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleMarkAsSent(invoice.id)}
                          >
                          <Send className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mark as Sent</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => handleDelete(invoice.id)}
                        >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete Invoice</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </Card>
            )
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold">Document</th>
                  <th className="text-left p-4 text-sm font-semibold">Type</th>
                  <th className="text-left p-4 text-sm font-semibold">{typeFilter === "incoming" ? "From" : typeFilter === "outgoing" ? "Client" : "Client/From"}</th>
                  <th className="text-left p-4 text-sm font-semibold">Issue Date</th>
                  <th className="text-left p-4 text-sm font-semibold">Due Date</th>
                  <th className="text-left p-4 text-sm font-semibold">Status</th>
                  <th className="text-right p-4 text-sm font-semibold">Amount</th>
                  <th className="text-center p-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const isIncoming = invoice.recipientUserId === profile?.userId
                  const paymentStatus = isIncoming 
                    ? (invoice.clientPaymentStatus || 'Pending')
                    : (invoice.supplierPaymentStatus || 'Pending')
                  
                  return (
                    <tr key={invoice.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold">
                          {isIncoming ? 'Bill' : 'Invoice'} {invoice.invoiceNumber}
                        </div>
                      </td>
                      <td className="p-4">
                        {invoice.status === "sent" && (
                          <Badge variant="outline" className="text-xs">
                            {isIncoming ? 'Incoming' : 'Outgoing'}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm font-medium">
                            {isIncoming 
                              ? (invoice.supplier?.name || 'Unknown')
                              : invoice.client.name
                            }
                          </p>
                          {(isIncoming ? invoice.supplier?.email : invoice.client.email) && (
                            <p className="text-xs text-muted-foreground">
                              {isIncoming ? invoice.supplier?.email : invoice.client.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {format(new Date(invoice.issueDate), "MMM dd, yyyy")}
                      </td>
                      <td className="p-4 text-sm">
                        {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant="outline" 
                          className={`text-xs capitalize ${
                            paymentStatus === 'paid' 
                              ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' 
                              : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
                          }`}
                        >
                          {paymentStatus}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-semibold">
                          {invoice.currency} {invoice.total.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {invoice.whtCreditNote && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setSelectedInvoice(invoice)
                                    setShowCreditNoteDialog(true)
                                  }}
                                >
                                  <Receipt className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View WHT Credit Note</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setSelectedInvoice(invoice)
                                  setIsViewDialogOpen(true)
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View Invoice</p>
                            </TooltipContent>
                          </Tooltip>
                          {invoice.status === "draft" && invoice.userId === profile?.userId && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleMarkAsSent(invoice.id)}
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Mark as Sent</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(invoice.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete Invoice</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        </div>
        </Card>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} invoices
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!pagination.hasPrev} onClick={() => setCurrentPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" disabled={!pagination.hasNext} onClick={() => setCurrentPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <AddInvoiceDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            setSelectedInvoice(null) // Clear selected invoice when dialog closes
          }
        }}
        onSuccess={loadInvoices}
        invoice={selectedInvoice}
      />

      <ViewInvoiceDialog
        open={isViewDialogOpen}
        onOpenChange={(open) => {
          setIsViewDialogOpen(open)
          // Only clear selectedInvoice if credit note dialog is not open
          if (!open && !showCreditNoteDialog) {
            setSelectedInvoice(null)
          }
        }}
        invoice={selectedInvoice}
        onInvoiceUpdated={loadInvoices}
        onEdit={(invoice) => {
          setSelectedInvoice(invoice)
          setIsViewDialogOpen(false)
          setIsAddDialogOpen(true)
        }}
      />
      {/* Credit Note Dialog */}
      <Dialog 
        open={showCreditNoteDialog} 
        onOpenChange={(open) => {
          setShowCreditNoteDialog(open)
          if (!open) {
            // Clear selectedInvoice when credit note dialog closes
            // Only if view dialog is not open
            if (!isViewDialogOpen) {
              setSelectedInvoice(null)
            }
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>WHT Credit Note</DialogTitle>
          </DialogHeader>
          {selectedInvoice?.whtCreditNote ? (
            <div className="space-y-4">
              {/* Explanation */}
              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  What is a Withholding Tax (WHT) Credit Note?
                </h4>
                <p className="text-sm text-muted-foreground">
                  A WHT Credit Note is a document issued by the buyer/client who deducted withholding tax from your invoice payment. 
                  This credit note serves as proof that tax was withheld and remitted to the tax authority on your behalf.
                </p>
                <p className="text-sm text-muted-foreground">
                  You can use this credit note to claim the withheld tax as a credit when filing your tax returns, reducing your overall tax liability.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Credit Note Number</Label>
                  <p className="font-semibold">{selectedInvoice.whtCreditNote.creditNoteNumber}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Issued Date</Label>
                  <p>{format(new Date(selectedInvoice.whtCreditNote.issuedDate), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Invoice Number</Label>
                  <p>{selectedInvoice.whtCreditNote.invoiceNumber}</p>
                </div>
                {selectedInvoice.whtCreditNote.certificateNumber && (
                  <div>
                    <Label className="text-xs text-muted-foreground">WHT Certificate Number</Label>
                    <p>{selectedInvoice.whtCreditNote.certificateNumber}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Invoice Total:</span>
                  <span className="font-medium">{formatCurrencyAmount(selectedInvoice.whtCreditNote.invoiceTotal, selectedInvoice.currency as any)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>Withholding Tax ({selectedInvoice.whtCreditNote.whtRate}%):</span>
                  <span>-{formatCurrencyAmount(selectedInvoice.whtCreditNote.whtAmount, selectedInvoice.currency as any)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Net Amount Paid:</span>
                  <span>{formatCurrencyAmount(selectedInvoice.whtCreditNote.netAmountPaid, selectedInvoice.currency as any)}</span>
                </div>
              </div>

              {selectedInvoice.whtCreditNote.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1">{selectedInvoice.whtCreditNote.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={handleSaveCreditNoteAsPDF}
                  disabled={isSavingCreditNote}
                >
                  {isSavingCreditNote ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save as PDF
                    </>
                  )}
                </Button>
                <DialogClose asChild>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (!isViewDialogOpen) {
                        setSelectedInvoice(null)
                      }
                    }}
                  >
                    Close
                  </Button>
                </DialogClose>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No credit note found for this invoice.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {profile && profile.businessType !== 'agent' && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile.businessType || 'freelancer'}
        />
      )}
    </div>
  )
}

