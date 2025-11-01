"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, CheckCircle2, Copy, X, Receipt, Calendar, CreditCard, Hash } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { useState } from "react"

interface PaymentReceiptProps {
  paymentData: {
    amount: number
    tips: string[]
    status: string
    transactionId: string
    method: string
    taxDuration: string
    timestamp: string
    rrr?: string
    tin?: string
    state?: string
  }
  onDownload: () => void
  onClose: () => void
}

export function PaymentReceipt({ paymentData, onDownload, onClose }: PaymentReceiptProps) {
  const [loading, setLoading] = useState(false)

  const generateReceiptPDF = async () => {
    setLoading(true)
    
    // Create a receipt HTML template
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              max-width: 600px;
              margin: 0 auto;
              background: white;
            }
            .receipt-container {
              background: white;
              border: 2px dashed #e5e7eb;
              padding: 30px;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #d1d5db;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #059669;
              margin-bottom: 5px;
              letter-spacing: 1px;
            }
            .subtitle {
              color: #6b7280;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .status-badge {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 8px 20px;
              border-radius: 20px;
              font-weight: 600;
              font-size: 14px;
              margin-top: 15px;
            }
            .info-section {
              margin-bottom: 25px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px dotted #e5e7eb;
            }
            .info-label {
              color: #6b7280;
              font-size: 13px;
            }
            .info-value {
              font-weight: 600;
              color: #111827;
              font-size: 14px;
              text-align: right;
            }
            .amount-section {
              background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
              padding: 20px;
              border-radius: 10px;
              margin: 25px 0;
              text-align: center;
            }
            .amount-label {
              color: #065f46;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .amount-value {
              font-size: 32px;
              font-weight: bold;
              color: #059669;
            }
            .divider {
              border-top: 2px dashed #d1d5db;
              margin: 25px 0;
            }
            .tips-section {
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .tips-title {
              font-weight: 700;
              color: #1e40af;
              margin-bottom: 10px;
              font-size: 14px;
            }
            .tips-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .tips-list li {
              color: #1e3a8a;
              font-size: 12px;
              padding: 5px 0;
              padding-left: 20px;
              position: relative;
            }
            .tips-list li:before {
              content: "→";
              position: absolute;
              left: 0;
              color: #3b82f6;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px dashed #d1d5db;
              color: #9ca3af;
              font-size: 11px;
              line-height: 1.6;
            }
            .transaction-id {
              font-family: 'Courier New', monospace;
              background: #f3f4f6;
              padding: 8px 12px;
              border-radius: 5px;
              font-size: 13px;
              letter-spacing: 1px;
            }
            .qr-placeholder {
              background: #f3f4f6;
              border: 2px dashed #d1d5db;
              width: 100px;
              height: 100px;
              margin: 20px auto;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #9ca3af;
              font-size: 12px;
              text-align: center;
              padding: 10px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="logo">TaxPayNG</div>
              <div class="subtitle">Official Tax Payment Receipt</div>
              <div class="status-badge">✓ Successful</div>
            </div>
            
            <div class="qr-placeholder">
              Receipt<br>QR Code<br>Placeholder
            </div>
            
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Transaction ID</span>
                <span class="transaction-id">${paymentData.transactionId}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Tax Duration</span>
                <span class="info-value">${paymentData.taxDuration}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment Method</span>
                <span class="info-value">${paymentData.method}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date & Time</span>
                <span class="info-value">${new Date(paymentData.timestamp).toLocaleString('en-NG')}</span>
              </div>
              ${paymentData.rrr ? `
              <div class="info-row">
                <span class="info-label">RRR</span>
                <span class="info-value">${paymentData.rrr}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="divider"></div>
            
            <div class="amount-section">
              <div class="amount-label">Amount Paid</div>
              <div class="amount-value">₦${paymentData.amount.toLocaleString()}</div>
            </div>
            
            ${paymentData.tips && paymentData.tips.length > 0 ? `
            <div class="tips-section">
              <div class="tips-title">Important Tax Tips</div>
              <ul class="tips-list">
                ${paymentData.tips.map(tip => `<li>${tip}</li>`).join('')}
              </ul>
            </div>
            ` : ''}
            
            <div class="footer">
              <div style="font-weight: 600; margin-bottom: 5px;">Thank you for using TaxPayNG</div>
              <div>This is an official receipt for your tax payment</div>
              <div>Keep this receipt for your tax records</div>
              <div style="margin-top: 15px;">For support, contact: support@taxpayng.com</div>
            </div>
          </div>
        </body>
      </html>
    `
    
    // Open a new window with the receipt
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(receiptHTML)
      printWindow.document.close()
      
      // Wait for the content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 250)
      }
      
      toast.success('Receipt ready for download')
    }
    
    setLoading(false)
  }

  const copyTransactionId = () => {
    navigator.clipboard.writeText(paymentData.transactionId)
    toast.success('Transaction ID copied!')
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        {/* Receipt Header */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 text-center relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Payment Successful</h2>
            <p className="text-green-50">Your tax payment was processed</p>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-4 bg-gray-50 overflow-y-auto flex-1">
          {/* QR Code Placeholder */}
          <div className="flex justify-center py-4">
            <div className="w-32 h-32 bg-white border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <Receipt className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-500">Receipt QR</p>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="bg-white rounded-xl p-4 space-y-3 border border-gray-200">
            <div className="flex items-center justify-between py-2 border-b border-dashed">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Transaction ID
              </span>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono font-semibold">{paymentData.transactionId}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={copyTransactionId}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-dashed">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Tax Duration
              </span>
              <span className="text-sm font-semibold">{paymentData.taxDuration}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-dashed">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Method
              </span>
              <span className="text-sm font-semibold capitalize">{paymentData.method}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date & Time
              </span>
              <span className="text-sm font-semibold">
                {new Date(paymentData.timestamp).toLocaleString('en-NG', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                })}
              </span>
            </div>
          </div>

          {/* Amount Highlight */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200 text-center">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
              Amount Paid
            </p>
            <p className="text-4xl font-bold text-green-600">
              {formatCurrency(paymentData.amount)}
            </p>
          </div>

          {/* Tips Section */}
          {paymentData.tips && paymentData.tips.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Important Tax Tips
              </h3>
              <ul className="space-y-2">
                {paymentData.tips.map((tip, index) => (
                  <li key={index} className="text-xs text-blue-800 flex items-start gap-2">
                    <span className="text-blue-500 mt-1">→</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer Note */}
          <div className="text-center text-xs text-gray-500 space-y-1 bg-white rounded-lg p-4 border border-gray-200">
            <p className="font-semibold text-gray-700">Thank you for using TaxPayNG</p>
            <p>Keep this receipt for your tax records</p>
            <p>For support: support@taxpayng.com</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-gray-200 flex gap-2 flex-shrink-0">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={generateReceiptPDF}
            disabled={loading}
          >
            <Download className="w-4 h-4 mr-2" />
            {loading ? 'Generating...' : 'Download'}
          </Button>
          <Button 
            onClick={onClose}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
