"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Download, Printer, ExternalLink, Upload, X, FileText, Loader2 } from "lucide-react"
import { Invoice, InvoiceType } from "@/lib/types"
import { getCurrencySymbol, formatCurrencyAmount } from "@/lib/utils/currency"
import { format } from "date-fns"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { invoiceService } from "@/lib/services"
import { uploadToImageKit } from "@/lib/utils/imagekit"

interface ViewInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
  onInvoiceUpdated?: () => void
}

export function ViewInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onInvoiceUpdated
}: ViewInvoiceDialogProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false)
  const [taxDeductible, setTaxDeductible] = useState(true) // Default to true for bills

  // Check if user can view this invoice (must be sender OR recipient)
  const isSender = invoice && profile?.userId && invoice.userId === profile.userId
  const isRecipient = invoice && profile?.userId && invoice.recipientUserId === profile.userId
  // Also check if user is the client (for incoming invoices)
  const isClient = invoice && profile?.userId && invoice.client?.id === profile.userId
  
  // Determine if this should be displayed as incoming
  const displayAsIncoming = isRecipient || isClient

  // Reset confirmation dialog when main dialog closes
  useEffect(() => {
    if (!open) {
      setShowConfirmDialog(false)
      setIsMarkingPaid(false)
    }
  }, [open])
  
  if (!invoice || !profile?.userId || (!isSender && !isRecipient && !isClient)) {
    if (invoice && profile?.userId) {
      toast.error("You don't have permission to view this invoice")
      onOpenChange(false)
    }
    return null
  }
  
  // Get the appropriate payment status based on user role
  const paymentStatus = isClient || isRecipient 
    ? invoice.clientPaymentStatus || 'pending'
    : invoice.supplierPaymentStatus || 'pending'

  const currencySymbol = getCurrencySymbol(invoice.currency as any)

  const handleReceiptUpload = async (file: File): Promise<string | null> => {
    if (!user?.uid || !invoice) return null

    try {
      setIsUploadingReceipt(true)
      
      // Upload to ImageKit
      const result = await uploadToImageKit(file, 'invoices/receipts')
      
      // Return the ImageKit URL
      return result.url
    } catch (error) {
      console.error("Error uploading receipt to ImageKit:", error)
      toast.error("Failed to upload receipt")
      return null
    } finally {
      setIsUploadingReceipt(false)
    }
  }

  const handleMarkAsPaid = async () => {
    if (!profile?.userId || !invoice) return

    // This function is only for clients/recipients
    if (!isClient && !isRecipient) {
      toast.error("Only the client can mark this invoice as paid")
      return
    }

    try {
      setIsMarkingPaid(true)

      let receiptUrl: string | undefined

      // Get ImageKit URL from file if already uploaded, otherwise upload now
      if (receiptFile) {
        // Check if file already has ImageKit URL (uploaded when selected)
        if ((receiptFile as any).imageKitUrl) {
          receiptUrl = (receiptFile as any).imageKitUrl
        } else {
          // Fallback: upload now if not already uploaded
          const uploadedUrl = await handleReceiptUpload(receiptFile)
          if (uploadedUrl) {
            receiptUrl = uploadedUrl
          }
        }
      }

      if (!receiptUrl) {
        toast.error("Please upload a receipt")
        setIsMarkingPaid(false)
        return
      }
      
      // Only client can mark as paid
      if (!isClient && !isRecipient) {
        toast.error("Only the client can mark this invoice as paid")
        setIsMarkingPaid(false)
        return
      }

      const result = await invoiceService.markAsPaid(
        invoice.id,
        profile.userId,
        paymentMethod || undefined,
        paymentReference || undefined,
        receiptUrl,
        taxDeductible
      )

      if (result.success) {
        toast.success("Bill marked as paid and transaction created")
        setShowPaymentForm(false)
        setPaymentMethod("")
        setPaymentReference("")
        setReceiptFile(null)
        setTaxDeductible(true) // Reset to default
        onInvoiceUpdated?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || "Failed to mark bill as paid")
      }
    } catch (error) {
      console.error("Error marking bill as paid:", error)
      toast.error("Failed to mark bill as paid")
    } finally {
      setIsMarkingPaid(false)
    }
  }

  const handleConfirmPaymentReceived = async (e?: React.MouseEvent) => {
    // Prevent default dialog close behavior
    e?.preventDefault()
    e?.stopPropagation()
    
    console.log("handleConfirmPaymentReceived called", { 
      hasProfile: !!profile?.userId, 
      hasInvoice: !!invoice,
      invoiceUserId: invoice?.userId,
      profileUserId: profile?.userId,
      isMarkingPaid 
    })
    
    if (!profile?.userId || !invoice) {
      console.log("Early return: missing profile or invoice")
      return
    }

    // This function is only for issuers (senders)
    if (invoice.userId !== profile.userId) {
      console.log("Early return: user is not the issuer")
      toast.error("Only the issuer can confirm payment received")
      return
    }

    // Don't proceed if already processing
    if (isMarkingPaid) {
      console.log("Early return: already processing")
      return
    }

    try {
      console.log("Setting isMarkingPaid to true")
      setIsMarkingPaid(true)

      const result = await invoiceService.confirmPaymentReceived(
        invoice.id,
        profile.userId,
        paymentMethod || undefined,
        paymentReference || undefined
      )

      if (result.success) {
        toast.success("Payment confirmed and transaction created")
        setPaymentMethod("")
        setPaymentReference("")
        onInvoiceUpdated?.()
        // Close confirmation modal first
        setShowConfirmDialog(false)
        // Wait for confirmation modal to fully close before closing main dialog
        setTimeout(() => {
          onOpenChange(false)
        }, 300)
      } else {
        toast.error(result.error || "Failed to confirm payment")
        // Don't close dialog on error so user can retry
      }
    } catch (error) {
      console.error("Error confirming payment:", error)
      toast.error("Failed to confirm payment")
      // Don't close dialog on error so user can retry
    } finally {
      setIsMarkingPaid(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // TODO: Generate PDF and download
    toast.info("PDF download coming soon")
  }

  return (
    <>
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        // If main dialog is closing, also close the confirmation dialog
        if (!isOpen && showConfirmDialog) {
          setShowConfirmDialog(false)
        }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto hide-scrollbar">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {displayAsIncoming ? 'Bill' : 'Invoice'} {invoice.invoiceNumber}
              {displayAsIncoming && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">(You owe supplier)</span>
              )}
            </DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 print:p-8">
          {/* Invoice Header */}
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {displayAsIncoming ? 'BILL' : 'INVOICE'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {displayAsIncoming ? 'Bill' : 'Invoice'} #{invoice.invoiceNumber}
              </p>
            </div>
            <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}>
              {invoice.status === 'sent' && displayAsIncoming 
                ? 'Received' 
                : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Badge>
          </div>

          {/* Supplier and Client Info */}
          <div className="grid md:grid-cols-2 gap-6">
            {isSender ? (
              <>
                <div>
                  <h3 className="font-semibold mb-2">From (You):</h3>
                  <p className="text-xs text-muted-foreground mb-2">Your business information</p>
                  {invoice.supplier?.businessName && (
                    <p className="font-medium">{invoice.supplier.businessName}</p>
                  )}
                  <p>{invoice.supplier?.name || "Not provided"}</p>
                  {invoice.supplier?.address && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {invoice.supplier.address.street && <p>{invoice.supplier.address.street}</p>}
                      {(invoice.supplier.address.city || invoice.supplier.address.state) && (
                        <p>
                          {invoice.supplier.address.city}
                          {invoice.supplier.address.city && invoice.supplier.address.state && ", "}
                          {invoice.supplier.address.state}
                        </p>
                      )}
                      {invoice.supplier.address.postalCode && <p>{invoice.supplier.address.postalCode}</p>}
                      {invoice.supplier.address.country && <p>{invoice.supplier.address.country}</p>}
                    </div>
                  )}
                  {invoice.supplier?.email && (
                    <p className="text-sm text-muted-foreground mt-1">{invoice.supplier.email}</p>
                  )}
                  {invoice.supplier?.phone && (
                    <p className="text-sm text-muted-foreground">{invoice.supplier.phone}</p>
                  )}
                  {invoice.supplier?.taxId && (
                    <p className="text-sm text-muted-foreground mt-1">TIN: {invoice.supplier.taxId}</p>
                  )}
                </div>

            <div>
              <h3 className="font-semibold mb-2">
                Bill To:
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Client who will pay this invoice
              </p>
                  <p className="text-xs text-muted-foreground mb-2">Client information</p>
                  {invoice.client.businessName && (
                    <p className="font-medium">{invoice.client.businessName}</p>
                  )}
                  <p>{invoice.client.name}</p>
                  {invoice.client.address && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {invoice.client.address.street && <p>{invoice.client.address.street}</p>}
                      {(invoice.client.address.city || invoice.client.address.state) && (
                        <p>
                          {invoice.client.address.city}
                          {invoice.client.address.city && invoice.client.address.state && ", "}
                          {invoice.client.address.state}
                        </p>
                      )}
                      {invoice.client.address.postalCode && <p>{invoice.client.address.postalCode}</p>}
                      {invoice.client.address.country && <p>{invoice.client.address.country}</p>}
                    </div>
                  )}
                  {invoice.client.email && (
                    <p className="text-sm text-muted-foreground mt-1">{invoice.client.email}</p>
                  )}
                  {invoice.client.phone && (
                    <p className="text-sm text-muted-foreground">{invoice.client.phone}</p>
                  )}
                  {invoice.client.taxId && (
                    <p className="text-sm text-muted-foreground mt-1">TIN: {invoice.client.taxId}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="font-semibold mb-2">From (Supplier):</h3>
                  <p className="text-xs text-muted-foreground mb-2">Supplier who sent you this bill</p>
                  {invoice.supplier?.businessName && (
                    <p className="font-medium">{invoice.supplier.businessName}</p>
                  )}
                  <p>{invoice.supplier?.name || "Not provided"}</p>
                  {invoice.supplier?.address && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {invoice.supplier.address.street && <p>{invoice.supplier.address.street}</p>}
                      {(invoice.supplier.address.city || invoice.supplier.address.state) && (
                        <p>
                          {invoice.supplier.address.city}
                          {invoice.supplier.address.city && invoice.supplier.address.state && ", "}
                          {invoice.supplier.address.state}
                        </p>
                      )}
                      {invoice.supplier.address.postalCode && <p>{invoice.supplier.address.postalCode}</p>}
                      {invoice.supplier.address.country && <p>{invoice.supplier.address.country}</p>}
                    </div>
                  )}
                  {invoice.supplier?.email && (
                    <p className="text-sm text-muted-foreground mt-1">{invoice.supplier.email}</p>
                  )}
                  {invoice.supplier?.phone && (
                    <p className="text-sm text-muted-foreground">{invoice.supplier.phone}</p>
                  )}
                  {invoice.supplier?.taxId && (
                    <p className="text-sm text-muted-foreground mt-1">TIN: {invoice.supplier.taxId}</p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Bill To (You):</h3>
                  <p className="text-xs text-muted-foreground mb-2">Your business information</p>
                  {invoice.client.businessName && (
                    <p className="font-medium">{invoice.client.businessName}</p>
                  )}
                  <p>{invoice.client.name}</p>
                  {invoice.client.address && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {invoice.client.address.street && <p>{invoice.client.address.street}</p>}
                      {(invoice.client.address.city || invoice.client.address.state) && (
                        <p>
                          {invoice.client.address.city}
                          {invoice.client.address.city && invoice.client.address.state && ", "}
                          {invoice.client.address.state}
                        </p>
                      )}
                      {invoice.client.address.postalCode && <p>{invoice.client.address.postalCode}</p>}
                      {invoice.client.address.country && <p>{invoice.client.address.country}</p>}
                    </div>
                  )}
                  {invoice.client.email && (
                    <p className="text-sm text-muted-foreground mt-1">{invoice.client.email}</p>
                  )}
                  {invoice.client.phone && (
                    <p className="text-sm text-muted-foreground">{invoice.client.phone}</p>
                  )}
                  {invoice.client.taxId && (
                    <p className="text-sm text-muted-foreground mt-1">TIN: {invoice.client.taxId}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Invoice Details */}
          <div className="grid md:grid-cols-3 gap-4 text-sm border-b pb-4">
            <div>
              <p className="text-muted-foreground">Issue Date</p>
              <p className="font-medium">{format(new Date(invoice.issueDate), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Due Date</p>
              <p className="font-medium">{format(new Date(invoice.dueDate), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Payment Terms</p>
              <p className="font-medium">{invoice.paymentTerms || "Net 30"}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-semibold">Description</th>
                  <th className="text-center p-3 font-semibold">Quantity</th>
                  <th className="text-right p-3 font-semibold">Unit Price</th>
                  <th className="text-right p-3 font-semibold">Tax</th>
                  <th className="text-right p-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id || index} className="border-t">
                    <td className="p-3">{item.description}</td>
                    <td className="p-3 text-center">{item.quantity}</td>
                    <td className="p-3 text-right">
                      {item.currency ? getCurrencySymbol(item.currency as any) : currencySymbol}
                      {item.unitPrice.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      {item.tax ? `${item.tax}%` : "—"}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {currencySymbol}{item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full md:w-80 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrencyAmount(invoice.subtotal, invoice.currency as any)}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-medium">{formatCurrencyAmount(invoice.taxAmount, invoice.currency as any)}</span>
                </div>
              )}
              {invoice.discount && invoice.discount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Discount ({invoice.discount}%):</span>
                  <span>-{formatCurrencyAmount(invoice.subtotal * (invoice.discount / 100), invoice.currency as any)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrencyAmount(invoice.total, invoice.currency as any)}</span>
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          {invoice.paymentInstructions && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Payment Instructions</h4>
              <p className="text-sm whitespace-pre-wrap">{invoice.paymentInstructions}</p>
            </div>
          )}

          {/* Payment Status and Actions */}
          {!(invoice.clientPaymentStatus === 'paid' && invoice.supplierPaymentStatus === 'paid') && (
            <div className="border-t pt-4">
              {(isClient || isRecipient) ? (
                // For clients/recipients (bills received): Full payment form with receipt upload
                !showPaymentForm ? (
                  <Button 
                    onClick={() => setShowPaymentForm(true)}
                    className="w-full"
                    disabled={invoice.clientPaymentStatus === 'paid'}
                  >
                    {invoice.clientPaymentStatus === 'paid' ? 'Payment Marked' : 'Mark as Paid'}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="payment-method">Payment Method</Label>
                      <Input
                        id="payment-method"
                        placeholder="e.g., Bank Transfer, Cash, Card"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment-reference">Payment Reference (Optional)</Label>
                      <Input
                        id="payment-reference"
                        placeholder="Transaction ID or reference number"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="receipt-upload">Upload Receipt (Required)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="receipt-upload"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setReceiptFile(file)
                              // Auto-upload to ImageKit when file is selected
                              setIsUploadingReceipt(true)
                              try {
                                const result = await uploadToImageKit(file, 'invoices/receipts')
                                // Store the ImageKit URL in the file object (we'll use it later)
                                ;(file as any).imageKitUrl = result.url
                                toast.success("Receipt uploaded successfully")
                              } catch (error) {
                                console.error("Error uploading receipt:", error)
                                toast.error("Failed to upload receipt")
                                setReceiptFile(null)
                              } finally {
                                setIsUploadingReceipt(false)
                              }
                            }
                          }}
                          disabled={isUploadingReceipt}
                          className="flex-1"
                        />
                        {receiptFile && !isUploadingReceipt && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReceiptFile(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                        {isUploadingReceipt && (
                          <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs text-muted-foreground">Uploading...</span>
                          </div>
                        )}
                      </div>
                      {receiptFile && !isUploadingReceipt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Selected: {receiptFile.name}
                        </p>
                      )}
                      {isUploadingReceipt && (
                        <p className="text-xs text-primary mt-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Uploading receipt to ImageKit...
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tax-deductible"
                        checked={taxDeductible}
                        onCheckedChange={(checked) => setTaxDeductible(checked === true)}
                      />
                      <Label
                        htmlFor="tax-deductible"
                        className="text-sm font-normal cursor-pointer"
                      >
                        This expense is tax deductible
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleMarkAsPaid}
                        disabled={isMarkingPaid || isUploadingReceipt || !receiptFile}
                        className="flex-1"
                      >
                        {isMarkingPaid || isUploadingReceipt ? "Processing..." : "Confirm Payment"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPaymentForm(false)
                          setPaymentMethod("")
                          setPaymentReference("")
                          setReceiptFile(null)
                          setTaxDeductible(true) // Reset to default
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )
              ) : isSender ? (
                // For issuers (senders): Simple confirmation button
                <Button 
                  onClick={() => setShowConfirmDialog(true)}
                  className="w-full"
                  disabled={invoice.supplierPaymentStatus === 'paid'}
                >
                  {invoice.supplierPaymentStatus === 'paid' ? 'Payment Confirmed' : 'Confirm Payment Received'}
                </Button>
              ) : null}
            </div>
          )}

          {/* Payment Details (if paid and confirmed) */}
          {invoice.clientPaymentStatus === 'paid' && invoice.supplierPaymentStatus === 'paid' && (
            <div className="border-t pt-4 space-y-2">
              <h4 className="font-semibold">Payment Details</h4>
              {((isClient || isRecipient) ? invoice.clientPaidAt : invoice.supplierPaidAt) && (
                <p className="text-sm text-muted-foreground">
                  Paid on: {format(new Date((isClient || isRecipient) ? invoice.clientPaidAt! : invoice.supplierPaidAt!), "MMM dd, yyyy 'at' h:mm a")}
                </p>
              )}
              {((isClient || isRecipient) ? invoice.clientPaymentMethod : invoice.supplierPaymentMethod) && (
                <p className="text-sm text-muted-foreground">
                  Method: {(isClient || isRecipient) ? invoice.clientPaymentMethod : invoice.supplierPaymentMethod}
                </p>
              )}
              {((isClient || isRecipient) ? invoice.clientPaymentReference : invoice.supplierPaymentReference) && (
                <p className="text-sm text-muted-foreground">
                  Reference: {(isClient || isRecipient) ? invoice.clientPaymentReference : invoice.supplierPaymentReference}
                </p>
              )}
              {invoice.clientReceiptUrl && (
                <div>
                  <a
                    href={invoice.clientReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-4 h-4" />
                    View Receipt
                  </a>
                </div>
              )}
              {invoice.linkedTransactionId && (
                <p className="text-xs text-muted-foreground">
                  Transaction created: {invoice.linkedTransactionId}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h4 className="font-semibold mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Terms & Conditions */}
          {invoice.terms && (
            <div>
              <h4 className="font-semibold mb-2">Terms & Conditions</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.terms}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
{/* Confirmation Dialog for Outgoing Invoices */}
<Dialog open={showConfirmDialog} onOpenChange={(open) => {
      if (!isMarkingPaid) {
        setShowConfirmDialog(open)
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Payment Received</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you have received payment for this invoice? This will mark the invoice as paid and create a transaction record.
          </p>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (!isMarkingPaid) {
                  setShowConfirmDialog(false)
                }
              }}
              disabled={isMarkingPaid}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPaymentReceived}
              disabled={isMarkingPaid}
            >
              {isMarkingPaid ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Yes, Confirm Payment"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

