"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Trash2, Loader2, Info } from "lucide-react"
import { Invoice, InvoiceItem, InvoiceClient, InvoiceSupplier, InvoiceTemplateType } from "@/lib/types"
import { invoiceService } from "@/lib/services"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { INVOICE_TEMPLATES, getDefaultTemplate } from "@/lib/utils/invoiceTemplates"
import { formatDateForInput } from "@/lib/utils/date"
import { SUPPORTED_CURRENCIES, CurrencyCode, getCurrencySymbol, formatCurrencyInput, parseCurrencyInput } from "@/lib/utils/currency"

interface AddInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  invoice?: Invoice | null
}

export function AddInvoiceDialog({
  open,
  onOpenChange,
  onSuccess,
  invoice
}: AddInvoiceDialogProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Store unitPriceDisplay for each item (formatted string)
  const [itemDisplayValues, setItemDisplayValues] = useState<Record<string, string>>({})
  
  // Initialize supplier info from user profile
  const getInitialSupplier = (): InvoiceSupplier => {
    if (!profile) {
      return {
        name: user?.displayName || user?.email?.split('@')[0] || "",
        email: user?.email || "",
        phone: "",
        address: {
          street: "",
          city: "",
          state: "",
          country: "Nigeria",
          postalCode: ""
        },
        taxId: ""
      }
    }
    return {
      businessName: profile.businessType !== 'freelancer' ? `${profile.firstName} ${profile.lastName}` : undefined,
      name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user?.email?.split('@')[0] || "",
      email: profile.email || user?.email || "",
      phone: profile.phone || "",
      address: profile.address || {
        street: "",
        city: "",
        state: "",
        country: profile.address?.country || "Nigeria",
        postalCode: ""
      },
      taxId: profile.taxId || ""
    }
  }
  
  const [formData, setFormData] = useState({
    template: getDefaultTemplate().type as InvoiceTemplateType,
    supplier: getInitialSupplier(),
    client: {
      name: "",
      email: "",
      phone: "",
      address: {
        street: "",
        city: "",
        state: "",
        country: "Nigeria",
        postalCode: ""
      },
      taxId: "",
      businessName: ""
    } as InvoiceClient,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    currency: 'NGN' as CurrencyCode,
    items: [
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        tax: 0,
        amount: 0
      }
    ] as InvoiceItem[],
    discount: 0,
    notes: "",
    terms: "",
    paymentTerms: "Net 30",
    paymentInstructions: ""
  })

  // Update supplier when profile loads
  useEffect(() => {
    if (profile && !invoice) {
      setFormData(prev => ({
        ...prev,
        supplier: getInitialSupplier()
      }))
    }
  }, [profile])

  useEffect(() => {
    if (invoice) {
      const items = invoice.items
      const displayValues: Record<string, string> = {}
      items.forEach(item => {
        displayValues[item.id] = formatCurrencyInput(item.unitPrice.toString())
      })
      setItemDisplayValues(displayValues)
      setFormData({
        template: invoice.template,
        supplier: invoice.supplier || getInitialSupplier(),
        client: invoice.client,
        issueDate: invoice.issueDate.split('T')[0],
        dueDate: invoice.dueDate.split('T')[0],
        currency: invoice.currency as CurrencyCode,
        items: items,
        discount: invoice.discount || 0,
        notes: invoice.notes || "",
        terms: invoice.terms || "",
        paymentTerms: invoice.paymentTerms || "Net 30",
        paymentInstructions: invoice.paymentInstructions || ""
      })
    } else {
      // Reset form
      const newItemId = crypto.randomUUID()
      setItemDisplayValues({ [newItemId]: "" })
      setFormData({
        template: getDefaultTemplate().type as InvoiceTemplateType,
        client: {
          name: "",
          email: "",
          phone: "",
          address: {
            street: "",
            city: "",
            state: "",
            country: "Nigeria",
            postalCode: ""
          },
          taxId: ""
        },
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currency: 'NGN' as CurrencyCode,
        items: [{
          id: newItemId,
          description: "",
          quantity: 1,
          unitPrice: 0,
          tax: 0,
          amount: 0
        }],
        discount: 0,
        notes: "",
        terms: "",
        paymentTerms: "Net 30"
      })
    }
  }, [invoice, open])

  const calculateItemAmount = (item: InvoiceItem): number => {
    const subtotal = item.quantity * item.unitPrice
    const taxAmount = item.tax ? subtotal * (item.tax / 100) : 0
    return subtotal + taxAmount
  }

  const updateItem = (itemId: string, updates: Partial<InvoiceItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, ...updates }
          updated.amount = calculateItemAmount(updated)
          return updated
        }
        return item
      })
    }))
  }

  const handleUnitPriceChange = (itemId: string, value: string) => {
    // Parse the currency input
    const parsed = parseCurrencyInput(value)
    const numericValue = parseFloat(parsed) || 0
    
    // Update the display value (formatted)
    setItemDisplayValues(prev => ({
      ...prev,
      [itemId]: formatCurrencyInput(value)
    }))
    
    // Update the actual unitPrice
    updateItem(itemId, { unitPrice: numericValue })
  }

  const addItem = () => {
    const newItemId = crypto.randomUUID()
    setItemDisplayValues(prev => ({
      ...prev,
      [newItemId]: ""
    }))
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: newItemId,
          description: "",
          quantity: 1,
          unitPrice: 0,
          tax: 0,
          amount: 0
        }
      ]
    }))
  }

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
  }

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const taxAmount = formData.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice
      return sum + (item.tax ? itemSubtotal * (item.tax / 100) : 0)
    }, 0)
    const discountAmount = formData.discount ? subtotal * (formData.discount / 100) : 0
    const total = subtotal + taxAmount - discountAmount
    return { subtotal, taxAmount, total }
  }

  const handleSubmit = async () => {
    if (!user?.uid) {
      toast.error("User not authenticated")
      return
    }

    // Validation
    if (!formData.supplier?.name?.trim()) {
      toast.error("Please enter your business/contact name")
      return
    }

    if (!formData.supplier?.email?.trim()) {
      toast.error("Please enter your email")
      return
    }

    if (!formData.client.name.trim()) {
      toast.error("Please enter client name")
      return
    }

    if (formData.items.length === 0 || formData.items.some(item => !item.description.trim() || item.unitPrice <= 0)) {
      toast.error("Please add at least one valid item")
      return
    }

    setIsSubmitting(true)
    try {
      const invoiceData = {
        template: formData.template,
        supplier: formData.supplier || getInitialSupplier(),
        client: formData.client,
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        currency: formData.currency,
        items: formData.items,
        discount: formData.discount || undefined,
        notes: formData.notes || undefined,
        terms: formData.terms || undefined,
        paymentTerms: formData.paymentTerms,
        paymentInstructions: formData.paymentInstructions || undefined,
        status: 'draft' as const
      }

      let result
      if (invoice) {
        result = await invoiceService.updateInvoice(invoice.id, user.uid, invoiceData)
      } else {
        result = await invoiceService.createInvoice(user.uid, invoiceData)
      }

      if (result.success) {
        toast.success(invoice ? "Invoice updated successfully" : "Invoice created successfully")
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || "Failed to save invoice")
      }
    } catch (error) {
      console.error("Error saving invoice:", error)
      toast.error("Failed to save invoice")
    } finally {
      setIsSubmitting(false)
    }
  }

  const totals = calculateTotals()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto hide-scrollbar">
        <DialogHeader>
          <DialogTitle>{invoice ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Selection */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={formData.template}
                onValueChange={(value) => setFormData(prev => ({ ...prev, template: value as InvoiceTemplateType }))}
              >
                <SelectTrigger id="template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_TEMPLATES.map(template => (
                    <SelectItem key={template.id} value={template.type}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value as CurrencyCode }))}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map(currency => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Supplier/Business Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Business Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="supplier-name">Business/Contact Name *</Label>
                <Input
                  id="supplier-name"
                  value={formData.supplier?.name || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), name: e.target.value } }))}
                  placeholder="Your business or name"
                />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="supplier-business-name">Business Name (Optional)</Label>
                <Input
                  id="supplier-business-name"
                  value={formData.supplier?.businessName || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), businessName: e.target.value || undefined } }))}
                  placeholder="Registered business name"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="supplier-email">Email *</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={formData.supplier?.email || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), email: e.target.value } }))}
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="supplier-phone">Phone</Label>
                <Input
                  id="supplier-phone"
                  value={formData.supplier?.phone || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), phone: e.target.value } }))}
                  placeholder="+234 800 000 0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-address">Address</Label>
              <Input
                id="supplier-address"
                value={formData.supplier?.address?.street || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), address: { ...(prev.supplier?.address || {}), street: e.target.value } } }))}
                placeholder="Street address"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-city">City</Label>
                <Input
                  id="supplier-city"
                  value={formData.supplier?.address?.city || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), address: { ...(prev.supplier?.address || {}), city: e.target.value } } }))}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-state">State</Label>
                <Input
                  id="supplier-state"
                  value={formData.supplier?.address?.state || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), address: { ...(prev.supplier?.address || {}), state: e.target.value } } }))}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier-postal">Postal Code</Label>
                <Input
                  id="supplier-postal"
                  value={formData.supplier?.address?.postalCode || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), address: { ...(prev.supplier?.address || {}), postalCode: e.target.value } } }))}
                  placeholder="Postal code"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-tin">Tax Identification Number (TIN)</Label>
              <Input
                id="supplier-tin"
                value={formData.supplier?.taxId || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: { ...(prev.supplier || getInitialSupplier()), taxId: e.target.value } }))}
                placeholder="Your TIN"
              />
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Client Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name *</Label>
                <Input
                  id="client-name"
                  value={formData.client.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, name: e.target.value } }))}
                  placeholder="Enter client name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-business-name">Business Name (Optional)</Label>
                <Input
                  id="client-business-name"
                  value={formData.client.businessName || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, businessName: e.target.value || undefined } }))}
                  placeholder="Client's business name"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={formData.client.email || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, email: e.target.value } }))}
                  placeholder="client@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Phone</Label>
                <Input
                  id="client-phone"
                  value={formData.client.phone || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, phone: e.target.value } }))}
                  placeholder="+234 800 000 0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-tax-id">Tax ID</Label>
                <Input
                  id="client-tax-id"
                  value={formData.client.taxId || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: { ...prev.client, taxId: e.target.value } }))}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Invoice Dates */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue-date">Issue Date</Label>
              <Input
                id="issue-date"
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date">Due Date</Label>
              <Input
                id="due-date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Invoice Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            {/* Tax Calculation Explanation */}
            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Tax Calculation:</strong> Tax is calculated per item. Each item's tax is applied to its subtotal (quantity × unit price). 
                For example, if an item costs {getCurrencySymbol(formData.currency)}1,000 with 7.5% tax, the tax amount is {getCurrencySymbol(formData.currency)}75. 
                The total invoice tax is the sum of all item taxes.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={item.id} className="grid md:grid-cols-6 gap-4 p-4 border rounded-lg">
                  <div className="md:col-span-2 space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price ({getCurrencySymbol(formData.currency)})</Label>
                    <Input
                      type="text"
                      placeholder="0.00"
                      value={itemDisplayValues[item.id] || ""}
                      onChange={(e) => handleUnitPriceChange(item.id, e.target.value)}
                      className="text-lg font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax %</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={item.tax === 0 ? "" : item.tax}
                      onChange={(e) => {
                        const value = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0
                        updateItem(item.id, { tax: value })
                      }}
                      onFocus={(e) => {
                        if (e.target.value === "0" || e.target.value === "") {
                          e.target.select()
                        }
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label>Amount</Label>
                      <div className="p-2 border rounded bg-muted">
                        {getCurrencySymbol(formData.currency)} {item.amount.toFixed(2)}
                      </div>
                    </div>
                    {formData.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{getCurrencySymbol(formData.currency)} {totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span>{getCurrencySymbol(formData.currency)} {totals.taxAmount.toFixed(2)}</span>
            </div>
            {formData.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Discount ({formData.discount}%):</span>
                <span>-{getCurrencySymbol(formData.currency)} {(totals.subtotal * formData.discount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>Total:</span>
              <span>{getCurrencySymbol(formData.currency)} {totals.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Discount %</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={formData.discount}
                onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-terms">Payment Terms</Label>
              <Input
                id="payment-terms"
                value={formData.paymentTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                placeholder="e.g., Net 30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or comments"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={formData.terms}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              placeholder="Terms and conditions"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-instructions">Payment Instructions</Label>
            <Textarea
              id="payment-instructions"
              value={formData.paymentInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentInstructions: e.target.value }))}
              placeholder="Payment instructions, bank details, payment link, or other payment information"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Include bank account details, payment links, or any specific payment instructions for your client.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {invoice ? "Update Invoice" : "Create Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

