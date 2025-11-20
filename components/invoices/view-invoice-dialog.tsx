"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Printer, ExternalLink } from "lucide-react"
import { Invoice, InvoiceType } from "@/lib/types"
import { getCurrencySymbol } from "@/lib/utils/currency"
import { format } from "date-fns"
import { toast } from "sonner"

interface ViewInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
}

export function ViewInvoiceDialog({
  open,
  onOpenChange,
  invoice
}: ViewInvoiceDialogProps) {
  if (!invoice) return null

  const currencySymbol = getCurrencySymbol(invoice.currency as any)

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // TODO: Generate PDF and download
    toast.info("PDF download coming soon")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto hide-scrollbar">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {invoice.invoiceType === 'incoming' ? 'Bill' : 'Invoice'} {invoice.invoiceNumber}
              {invoice.invoiceType === 'incoming' && (
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
                {invoice.invoiceType === 'incoming' ? 'BILL' : 'INVOICE'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {invoice.invoiceType === 'incoming' ? 'Bill' : 'Invoice'} #{invoice.invoiceNumber}
              </p>
            </div>
            <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}>
              {invoice.status === 'sent' && invoice.invoiceType === 'incoming' 
                ? 'Received' 
                : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Badge>
          </div>

          {/* Supplier and Client Info */}
          <div className="grid md:grid-cols-2 gap-6">
            {invoice.invoiceType === 'outgoing' ? (
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

                <div>
                  <h3 className="font-semibold mb-2">Bill To (You):</h3>
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
                    <td className="p-3 text-right">{currencySymbol}{item.unitPrice.toLocaleString()}</td>
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
                <span className="font-medium">{currencySymbol}{invoice.subtotal.toLocaleString()}</span>
              </div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span className="font-medium">{currencySymbol}{invoice.taxAmount.toLocaleString()}</span>
                </div>
              )}
              {invoice.discount && invoice.discount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Discount ({invoice.discount}%):</span>
                  <span>-{currencySymbol}{(invoice.subtotal * (invoice.discount / 100)).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{currencySymbol}{invoice.total.toLocaleString()}</span>
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
  )
}

