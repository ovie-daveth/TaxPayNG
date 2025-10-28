"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, CheckCircle } from "lucide-react"

interface PaymentReceiptProps {
  paymentData: {
    amount: number
    tips: string[]
    status: string
    transactionId: string
    method: string
    taxDuration: string
    timestamp: string
  }
  onDownload: () => void
  onClose: () => void
}

export function PaymentReceipt({ paymentData, onDownload, onClose }: PaymentReceiptProps) {
  const generateReceiptPDF = () => {
    // Create a receipt HTML template
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .company { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { color: #666; font-size: 14px; }
            .receipt-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .amount { font-size: 24px; font-weight: bold; text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #000; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
            .tips { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px; }
            .tips-title { font-weight: bold; margin-bottom: 10px; }
            .tips-list { list-style-position: inside; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">TaxPayNG</div>
            <div class="subtitle">Official Tax Payment Receipt</div>
          </div>
          
          <div class="receipt-info">
            <div>
              <div><strong>Receipt No:</strong> ${paymentData.transactionId}</div>
              <div><strong>Tax Duration:</strong> ${paymentData.taxDuration}</div>
              <div><strong>Date:</strong> ${new Date(paymentData.timestamp).toLocaleString()}</div>
              <div><strong>Status:</strong> ${paymentData.status}</div>
            </div>
            <div style="text-align: right;">
              <div><strong>Payment Method:</strong></div>
              <div>${paymentData.method}</div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Payment Details</div>
            <div class="info-row">
              <span>Tax Payment:</span>
              <span>₦${paymentData.amount.toLocaleString()}</span>
            </div>
            <div class="info-row">
              <span>Service Fee:</span>
              <span>₦0.00</span>
            </div>
          </div>
          
          <div class="amount">
            <div>Total Amount: ₦${paymentData.amount.toLocaleString()}</div>
          </div>
          
          <div class="tips">
            <div class="tips-title">Important Tax Tips:</div>
            <ul class="tips-list">
              ${paymentData.tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
          </div>
          
          <div class="footer">
            <div>Thank you for using TaxPayNG</div>
            <div>This is an official receipt for your tax payment</div>
            <div>Keep this receipt for your records</div>
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
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <CardTitle>Payment Successful</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your tax payment has been processed successfully
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Transaction ID:</span>
            <span className="font-mono font-semibold">{paymentData.transactionId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax Duration:</span>
            <span className="font-semibold">{paymentData.taxDuration}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment Method:</span>
            <span className="font-semibold">{paymentData.method}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date & Time:</span>
            <span>{new Date(paymentData.timestamp).toLocaleString()}</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total Amount Paid:</span>
            <span className="text-2xl font-bold text-primary">
              ₦{paymentData.amount.toLocaleString()}
            </span>
          </div>
        </div>

        {paymentData.tips && paymentData.tips.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Important Tax Tips:
            </h3>
            <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
              {paymentData.tips.map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={generateReceiptPDF} className="flex-1" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Receipt
          </Button>
          <Button onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

