"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, Download, Loader2, ArrowLeft } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { documentService } from "@/lib/services"
import { toast } from "sonner"
import { format } from "date-fns"
import jsPDF from "jspdf"
import { uploadToImageKit } from "@/lib/utils/imagekit"

interface PaymentData {
  rrr: string
  transactionRef: string
  amount: number
  period?: string
  taxDuration?: string
  timestamp: string
}

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [savingReceipt, setSavingReceipt] = useState(false)
  const [receiptSaved, setReceiptSaved] = useState(false)

  const paymentData: PaymentData = {
    rrr: searchParams.get("rrr") || "",
    transactionRef: searchParams.get("transactionRef") || "",
    amount: parseFloat(searchParams.get("amount") || "0"),
    period: searchParams.get("period") || "",
    taxDuration: searchParams.get("taxDuration") || "",
    timestamp: new Date().toISOString()
  }

  const generateReceiptPDF = async (): Promise<Blob> => {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(20)
    doc.text("OTax Payment Receipt", 105, 20, { align: "center" })
    
    doc.setFontSize(12)
    doc.text("Tax Payment Confirmation", 105, 30, { align: "center" })
    
    // Payment Details
    let yPos = 50
    doc.setFontSize(10)
    doc.text(`RRR Number: ${paymentData.rrr}`, 20, yPos)
    yPos += 10
    doc.text(`Transaction Reference: ${paymentData.transactionRef}`, 20, yPos)
    yPos += 10
    doc.text(`Amount Paid: ₦${paymentData.amount.toLocaleString()}`, 20, yPos)
    yPos += 10
    if (paymentData.taxDuration) {
      doc.text(`Tax Period: ${paymentData.taxDuration}`, 20, yPos)
      yPos += 10
    }
    if (paymentData.period) {
      doc.text(`Payment Type: ${paymentData.period.charAt(0).toUpperCase() + paymentData.period.slice(1)}`, 20, yPos)
      yPos += 10
    }
    doc.text(`Payment Date: ${format(new Date(paymentData.timestamp), "PPP")}`, 20, yPos)
    yPos += 10
    doc.text(`Status: PAID`, 20, yPos)
    
    // Footer
    doc.setFontSize(8)
    doc.text("This is an official receipt for tax payment", 105, 280, { align: "center" })
    
    return doc.output("blob")
  }

  const saveReceiptAsDocument = async () => {
    if (!user?.uid || receiptSaved) return

    setSavingReceipt(true)
    try {
      const receiptBlob = await generateReceiptPDF()
      const receiptFile = new File([receiptBlob], `tax-payment-receipt-${paymentData.rrr}.pdf`, { type: "application/pdf" })

      // Upload to ImageKit
      const uploadResult = await uploadToImageKit(receiptFile, `users/${user.uid}/receipts`)

      // Save to documents using documentService
      const result = await documentService.uploadDocument(user.uid, {
        file: receiptFile,
        name: `Tax Payment Receipt - ${paymentData.rrr}`,
        type: "proof",
        imageKitUrl: uploadResult.url,
        fileSize: uploadResult.size, // Use size from ImageKit upload result
        notes: `RRR: ${paymentData.rrr}, Transaction: ${paymentData.transactionRef}${paymentData.taxDuration ? `, Period: ${paymentData.taxDuration}` : ""}`,
        linkedTransaction: paymentData.transactionRef
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to save receipt")
      }

      setReceiptSaved(true)
      toast.success("Receipt saved to documents")
      
      // Trigger dashboard refresh to show updated tax payable
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('transactionChanged'))
      }
    } catch (error) {
      console.error("Error saving receipt:", error)
      toast.error("Failed to save receipt")
    } finally {
      setSavingReceipt(false)
    }
  }
  
  useEffect(() => {
    // Trigger dashboard refresh when payment is successful
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('transactionChanged'))
    }
  }, [])

  const downloadReceipt = async () => {
    try {
      const receiptBlob = await generateReceiptPDF()
      const url = URL.createObjectURL(receiptBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tax-payment-receipt-${paymentData.rrr}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Receipt downloaded")
    } catch (error) {
      console.error("Error downloading receipt:", error)
      toast.error("Failed to download receipt")
    }
  }

  if (profileLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Button 
        variant="ghost" 
        onClick={() => router.push("/dashboard")}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="max-w-3xl mx-auto space-y-6">
        <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Payment Successful!</strong> Your tax payment has been processed successfully.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Payment Confirmation</CardTitle>
            <CardDescription>
              Your payment has been processed and recorded
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">RRR Number:</span>
                <span className="font-mono font-semibold">{paymentData.rrr}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Transaction Reference:</span>
                <span className="font-semibold">{paymentData.transactionRef}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="text-2xl font-bold text-primary">
                  ₦{paymentData.amount.toLocaleString()}
                </span>
              </div>
              {paymentData.taxDuration && (
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Tax Period:</span>
                  <span className="font-semibold">{paymentData.taxDuration}</span>
                </div>
              )}
              {paymentData.period && (
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Payment Type:</span>
                  <span className="font-semibold capitalize">{paymentData.period}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-muted-foreground">Payment Date:</span>
                <span className="font-semibold">
                  {format(new Date(paymentData.timestamp), "PPP")}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={downloadReceipt}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
              <Button
                onClick={saveReceiptAsDocument}
                disabled={savingReceipt || receiptSaved}
                className="flex-1"
              >
                {savingReceipt ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : receiptSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save to Documents
                  </>
                )}
              </Button>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Important:</strong> Keep this receipt for your records. 
                This payment will be reflected in your tax dashboard and deducted from your tax payable.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button
            onClick={() => router.push("/dashboard")}
            size="lg"
            className="w-full max-w-md"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

