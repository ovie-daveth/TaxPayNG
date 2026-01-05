import jsPDF from 'jspdf'
import { Invoice, InvoiceItem } from '@/lib/types'
import { formatCurrencyAmount, getCurrencySymbol } from './currency'
import { format } from 'date-fns'

/**
 * Generate a PDF document for an invoice
 */
export function generateInvoicePDF(invoice: Invoice): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const margin = 20
  const pageWidth = 210 // A4 width in mm
  const pageHeight = 297 // A4 height in mm
  const contentWidth = pageWidth - 2 * margin
  let yPos = margin

  // Helper function to add text with word wrapping
  const addText = (
    text: string,
    x: number,
    y: number,
    options: {
      fontSize?: number
      fontStyle?: 'normal' | 'bold' | 'italic'
      align?: 'left' | 'center' | 'right'
      color?: [number, number, number]
      maxWidth?: number
    } = {}
  ) => {
    pdf.setFontSize(options.fontSize || 12)
    pdf.setFont('helvetica', options.fontStyle || 'normal')
    if (options.color) {
      pdf.setTextColor(options.color[0], options.color[1], options.color[2])
    } else {
      pdf.setTextColor(0, 0, 0)
    }
    const maxWidth = options.maxWidth || contentWidth
    const lines = pdf.splitTextToSize(text, maxWidth)
    pdf.text(lines, x, y, { align: options.align || 'left' })
    return y + (lines.length * (options.fontSize || 12) * 0.4)
  }

  // Helper to check if we need a new page
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      pdf.addPage()
      yPos = margin
      return true
    }
    return false
  }

  // Header - OTax Logo/Title
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(37, 99, 235) // Blue color
  addText('OTax Invoice', pageWidth / 2, yPos, { align: 'center', fontSize: 20 })
  yPos += 10

  // Invoice Number and Date
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  addText(`Invoice #${invoice.invoiceNumber}`, margin, yPos, { fontSize: 14 })
  
  const issueDate = format(new Date(invoice.issueDate), 'MMM dd, yyyy')
  addText(issueDate, pageWidth - margin, yPos, { align: 'right', fontSize: 12 })
  yPos += 10

  // Draw line
  pdf.setDrawColor(229, 231, 235) // #e5e7eb
  pdf.setLineWidth(0.5)
  pdf.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 15

  // Supplier/From Information
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  addText('From:', margin, yPos, { fontSize: 12 })
  yPos += 7

  pdf.setFont('helvetica', 'normal')
  const supplierName = invoice.supplier?.businessName || invoice.supplier?.name || 'N/A'
  yPos = addText(supplierName, margin, yPos, { fontSize: 11 })
  
  if (invoice.supplier?.email) {
    yPos = addText(invoice.supplier.email, margin, yPos, { fontSize: 10, color: [107, 114, 128] })
  }
  if (invoice.supplier?.phone) {
    yPos = addText(invoice.supplier.phone, margin, yPos, { fontSize: 10, color: [107, 114, 128] })
  }
  if (invoice.supplier?.address) {
    const addr = invoice.supplier.address
    const addressLines: string[] = []
    if (addr.street) addressLines.push(addr.street)
    if (addr.city || addr.state) {
      addressLines.push(`${addr.city || ''}${addr.city && addr.state ? ', ' : ''}${addr.state || ''}`)
    }
    if (addr.postalCode) addressLines.push(addr.postalCode)
    if (addr.country) addressLines.push(addr.country)
    addressLines.forEach(line => {
      if (line) yPos = addText(line, margin, yPos, { fontSize: 10, color: [107, 114, 128] })
    })
  }
  if (invoice.supplier?.vatRegistrationNumber) {
    yPos = addText(`VAT Reg: ${invoice.supplier.vatRegistrationNumber}`, margin, yPos, { fontSize: 10, color: [107, 114, 128] })
  }

  yPos += 10

  // Bill To/Client Information
  checkNewPage(30)
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  addText('Bill To:', margin, yPos, { fontSize: 12 })
  yPos += 7

  pdf.setFont('helvetica', 'normal')
  const clientName = invoice.client?.businessName || invoice.client?.name || 'N/A'
  yPos = addText(clientName, margin, yPos, { fontSize: 11 })
  
  if (invoice.client?.email) {
    yPos = addText(invoice.client.email, margin, yPos, { fontSize: 10, color: [107, 114, 128] })
  }
  if (invoice.client?.phone) {
    yPos = addText(invoice.client.phone, margin, yPos, { fontSize: 10, color: [107, 114, 128] })
  }
  if (invoice.client?.address) {
    const addr = invoice.client.address
    const addressLines: string[] = []
    if (addr.street) addressLines.push(addr.street)
    if (addr.city || addr.state) {
      addressLines.push(`${addr.city || ''}${addr.city && addr.state ? ', ' : ''}${addr.state || ''}`)
    }
    if (addr.postalCode) addressLines.push(addr.postalCode)
    if (addr.country) addressLines.push(addr.country)
    addressLines.forEach(line => {
      if (line) yPos = addText(line, margin, yPos, { fontSize: 10, color: [107, 114, 128] })
    })
  }
  if (invoice.client?.taxId) {
    yPos = addText(`Tax ID: ${invoice.client.taxId}`, margin, yPos, { fontSize: 10, color: [107, 114, 128] })
  }

  yPos += 15

  // Draw line
  pdf.setDrawColor(229, 231, 235)
  pdf.setLineWidth(0.5)
  pdf.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10

  // Due Date
  if (invoice.dueDate) {
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const dueDate = format(new Date(invoice.dueDate), 'MMM dd, yyyy')
    addText(`Due Date: ${dueDate}`, pageWidth - margin, yPos, { align: 'right', fontSize: 10, color: [107, 114, 128] })
    yPos += 10
  }

  // Items Table
  checkNewPage(50)
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  addText('Items', margin, yPos, { fontSize: 11 })
  yPos += 8

  // Table header
  pdf.setDrawColor(229, 231, 235)
  pdf.setFillColor(249, 250, 251) // #f9fafb
  pdf.rect(margin, yPos - 5, contentWidth, 8, 'F')
  pdf.rect(margin, yPos - 5, contentWidth, 8, 'S')

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Description', margin + 2, yPos)
  pdf.text('Qty', margin + 80, yPos)
  pdf.text('Unit Price', margin + 100, yPos, { align: 'right' })
  pdf.text('Amount', pageWidth - margin - 2, yPos, { align: 'right' })
  yPos += 10

  // Table rows
  pdf.setFont('helvetica', 'normal')
  invoice.items.forEach((item: InvoiceItem) => {
    checkNewPage(15)
    
    // Draw row border
    pdf.setDrawColor(229, 231, 235)
    pdf.rect(margin, yPos - 5, contentWidth, 10, 'S')
    
    // Description
    pdf.setFontSize(9)
    const descLines = pdf.splitTextToSize(item.description || '', 70)
    pdf.text(descLines, margin + 2, yPos)
    
    // Quantity
    pdf.text(item.quantity.toString(), margin + 80, yPos)
    
    // Unit Price
    const unitPriceText = `${getCurrencySymbol(item.currency || invoice.currency as any)}${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    pdf.text(unitPriceText, margin + 100, yPos, { align: 'right' })
    
    // Amount
    const itemAmount = item.quantity * item.unitPrice
    const amountText = formatCurrencyAmount(itemAmount, invoice.currency as any)
    pdf.text(amountText, pageWidth - margin - 2, yPos, { align: 'right' })
    
    yPos += Math.max(descLines.length * 4, 10)
  })

  yPos += 10

  // Draw line
  pdf.setDrawColor(229, 231, 235)
  pdf.setLineWidth(0.5)
  pdf.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10

  // Totals Section
  checkNewPage(60)
  
  // Subtotal
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(107, 114, 128) // #6b7280
  pdf.text('Subtotal:', margin + 120, yPos, { align: 'right' })
  pdf.setTextColor(0, 0, 0)
  pdf.text(formatCurrencyAmount(invoice.subtotal, invoice.currency as any), pageWidth - margin, yPos, { align: 'right' })
  yPos += 7

  // Discount
  if (invoice.discount && invoice.discount > 0) {
    const discountAmount = invoice.subtotal * (invoice.discount / 100)
    pdf.setTextColor(220, 38, 38) // Red for discount
    pdf.text(`Discount (${invoice.discount}%):`, margin + 120, yPos, { align: 'right' })
    pdf.text(`-${formatCurrencyAmount(discountAmount, invoice.currency as any)}`, pageWidth - margin, yPos, { align: 'right' })
    yPos += 7
    pdf.setTextColor(0, 0, 0)
  }

  // VAT
  if (invoice.vatAmount && invoice.vatAmount > 0) {
    pdf.setTextColor(107, 114, 128)
    pdf.text(`VAT (${invoice.vatRate || 7.5}%):`, margin + 120, yPos, { align: 'right' })
    pdf.setTextColor(0, 0, 0)
    pdf.text(formatCurrencyAmount(invoice.vatAmount, invoice.currency as any), pageWidth - margin, yPos, { align: 'right' })
    yPos += 7
  }

  // Invoice Total
  pdf.setDrawColor(229, 231, 235)
  pdf.setLineWidth(1)
  pdf.line(margin + 120, yPos, pageWidth - margin, yPos)
  yPos += 7

  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Invoice Total:', margin + 120, yPos, { align: 'right' })
  pdf.setFontSize(12)
  pdf.text(formatCurrencyAmount(invoice.invoiceTotal, invoice.currency as any), pageWidth - margin, yPos, { align: 'right' })
  yPos += 10

  // WHT (if deducted)
  if (invoice.whtDeducted && invoice.whtAmount && invoice.whtAmount > 0) {
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.5)
    pdf.line(margin + 120, yPos, pageWidth - margin, yPos)
    yPos += 7

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(220, 38, 38) // Red for deduction
    pdf.text(`Withholding Tax (${invoice.whtRate || 5}%):`, margin + 120, yPos, { align: 'right' })
    pdf.text(`-${formatCurrencyAmount(invoice.whtAmount, invoice.currency as any)}`, pageWidth - margin, yPos, { align: 'right' })
    yPos += 7
    pdf.setTextColor(0, 0, 0)
  }

  // Final Total
  pdf.setDrawColor(229, 231, 235)
  pdf.setLineWidth(2)
  pdf.line(margin + 120, yPos, pageWidth - margin, yPos)
  yPos += 7

  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(5, 150, 105) // Green color
  pdf.text('Amount Payable:', margin + 120, yPos, { align: 'right' })
  pdf.setFontSize(14)
  pdf.text(formatCurrencyAmount(invoice.total, invoice.currency as any), pageWidth - margin, yPos, { align: 'right' })
  yPos += 15

  // Notes and Terms
  if (invoice.notes || invoice.terms) {
    checkNewPage(40)
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.5)
    pdf.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(0, 0, 0)

    if (invoice.notes) {
      pdf.setFont('helvetica', 'bold')
      yPos = addText('Notes:', margin, yPos, { fontSize: 10 })
      pdf.setFont('helvetica', 'normal')
      yPos = addText(invoice.notes, margin, yPos, { fontSize: 9, color: [107, 114, 128] })
      yPos += 5
    }

    if (invoice.terms) {
      pdf.setFont('helvetica', 'bold')
      yPos = addText('Terms & Conditions:', margin, yPos, { fontSize: 10 })
      pdf.setFont('helvetica', 'normal')
      yPos = addText(invoice.terms, margin, yPos, { fontSize: 9, color: [107, 114, 128] })
    }
  }

  // Footer
  const totalPages = (pdf as any).internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(156, 163, 175) // #9ca3af
    pdf.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
    pdf.text(
      `© ${new Date().getFullYear()} OTax. All rights reserved.`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    )
  }

  return pdf
}

/**
 * Generate invoice PDF as Buffer (for email attachments)
 */
export function generateInvoicePDFBuffer(invoice: Invoice): Buffer {
  const pdf = generateInvoicePDF(invoice)
  return Buffer.from(pdf.output('arraybuffer'))
}

