"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { ExternalLink, Building2, MapPin, Info, ChevronDown, ChevronUp, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { RadioGroup, RadioGroupItem } from "../ui/radio"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/hooks/useAuth"
import { taxPaymentService, documentService } from "@/lib/services"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { toast } from "sonner"

interface PaymentPortalSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userState?: string
  onSelectNRC: () => void
  onSelectStateIRS: (stateIrsUrl: string) => void
  taxAmount?: number
  taxDescription?: string
  taxDuration?: string
  period?: 'monthly' | 'quarterly' | 'yearly'
  onPaymentMade?: (receiptFile: File) => void
}

const STATE_IRS_PORTALS: Record<string, string> = {
  "Abia": "https://abia.tax/",
  "Adamawa": "https://ad-irs.adamawastate.gov.ng/",
  "Anambra": "https://tax.services.an.gov.ng",
  "Akwa Ibom": "https://akirs.ibomtax.ng/",
  "Bauchi": "https://birs.bu.gov.ng/",
  "Bayelsa": "https://etax.bir.by.gov.ng/",
  "Benue": "https://birs.be.gov.ng/",
  "Borno": "https://birs.bo.gov.ng/home/",
  "Cross River": "https://pay.crossriverstate.gov.ng",
  "Delta": "https://selfservice.deltairs.com/",
  "Ebonyi": "https://tax.ebsirb.eb.gov.ng",
  "Edo": "https://eras.eirs.gov.ng",
  "Enugu": "https://irs.en.gov.ng/home",
  "Ekiti": "https://ekitistaterevenue.com/index.php",
  "FCT": "https://fctirs.gov.ng/",
  "Gombe": "https://irs.gm.gov.ng/",
  "Imo": "https://iirs.im.gov.ng/",
  "Jigawa": "https://www.jirs.org.ng/",
  "Kaduna": "https://paykaduna.com/",
  "Kano": "https://kirs.gov.ng/",
  "Kastina": "https://revenue.katsinastate.gov.ng/",
  "Kebbi": "https://irs.kb.gov.ng/etax/",
  "Kogi": "https://irs.kg.gov.ng/",
  "Kwara": "https://taxpayers.irs.kg.gov.ng/",
  "Lagos": "https://etax.lirs.net/login/",
  "Nasarawa": "https://www.irs.na.gov.ng/",
  "Niger": "https://nigerigr.com/",
  "Ogun": "https://portal.ogetax.ogunstate.gov.ng/login",
  "Ondo": "https://iondo.ondostate.gov.ng/login",
  "Osun": "https://osun.electroniccollectionsecg.com/taxes/apply",
  "Oyo": "https://selfservice.oyostatebir.com/",
  "Plateau": "https://plateauigr.com/",
  "Rivers": "https://rivtamis.riversbirs.gov.ng/home.html",
  "Sokoto": "https://itas.irs.sk.gov.ng/login",
  "Yobe": "https://itas.irs.yb.gov.ng/",
  "Zamfara": "https://recruitment.zamfara.gov.ng/zirs/Login"
}

export function PaymentPortalSelectorModal({
  open,
  onOpenChange,
  userState,
  onSelectNRC,
  onSelectStateIRS,
  taxAmount,
  taxDescription,
  taxDuration,
  period,
  onPaymentMade,
}: PaymentPortalSelectorModalProps) {
  const [selectedOption, setSelectedOption] = useState<"nrc" | "state">("nrc")
  const [processing, setProcessing] = useState(false)
  const [embeddedUrl, setEmbeddedUrl] = useState<string | null>(null)
  const [selectedState, setSelectedState] = useState<string | undefined>(userState)
  const [showReceiptUpload, setShowReceiptUpload] = useState(false)
  const [showTaxDetails, setShowTaxDetails] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [uploadedReceiptUrl, setUploadedReceiptUrl] = useState<string | null>(null)
  const [paymentRecord, setPaymentRecord] = useState<any>(null)
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  // Determine base path for redirect
  const basePath = pathname?.startsWith("/dashboard-creator")
    ? "/dashboard-creator"
    : pathname?.startsWith("/dashboard-sme")
      ? "/dashboard-sme"
      : "/dashboard"

  const userStateIRSUrl = userState ? STATE_IRS_PORTALS[userState] : null
  const hasStateIRS = !!userStateIRSUrl

  const handleContinue = async () => {
    setProcessing(true)
    try {
      // Open portal inside an embedded dialog (no redirects, all embedded)
      if (selectedOption === "nrc") {
        const url = "https://selfservice.nrs.gov.ng/"
        setEmbeddedUrl(url)
      } else if (selectedOption === "state") {
        const stateToUse = selectedState || userState
        const url = stateToUse ? STATE_IRS_PORTALS[stateToUse] : null
        if (url) {
          setEmbeddedUrl(url)
        } else {
          // Fallback to NRC if no state portal available
          setEmbeddedUrl("https://selfservice.nrs.gov.ng/")
        }
      }
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose Payment Portal</DialogTitle>
          <DialogDescription>
            Select where you'd like to make your tax payment. NRC is for federal payers (VAT, Development Fee, CIT), while State IRS is for those paying Personal Income Taxes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto">
          <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              We're working to make payment more seamless in-app. <span className="font-semibold">Coming soon!</span>
            </AlertDescription>
          </Alert>
          <RadioGroup value={selectedOption} onValueChange={(v) => setSelectedOption(v as "nrc" | "state") }>
            {/* NRC Option */}
            <div
              className={cn(
                "relative flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                selectedOption === "nrc"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              )}
              onClick={() => setSelectedOption("nrc")}
            >
              <RadioGroupItem value="nrc" id="nrc" className="mt-1" />
              <div className="flex-1 min-w-0">
                <Label
                  htmlFor="nrc"
                  className="flex items-center gap-2 cursor-pointer font-semibold text-sm"
                >
                  <Building2 className="w-4 h-4" />
                  National Revenue Center (NRC)
                </Label>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Pay through the centralized National Revenue Center portal. For federal taxes: VAT, Development Fee, and CIT (Company Income Tax).
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium">
                  <ExternalLink className="w-3 h-3" />
                  <a
                    href="https://selfservice.nrs.gov.ng/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    selfservice.nrs.gov.ng
                  </a>
                </div>
              </div>
            </div>

              {/* State IRS Option (always available and editable) */}
              <div
                className={cn(
                  "relative flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  selectedOption === "state"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                )}
                onClick={() => setSelectedOption("state")}
              >
                <RadioGroupItem value="state" id="state" className="mt-1" />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor="state"
                    className="flex items-center gap-2 cursor-pointer font-semibold text-sm"
                  >
                    <MapPin className="w-4 h-4" />
                    {selectedState || userState || "State"} IRS
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Pay directly through your state's Internal Revenue Service portal. For Personal Income Taxes (PIT).
                  </p>
                  <div className="mt-3">
                    <Label className="text-xs">Choose state</Label>
                    <Select onValueChange={(v) => setSelectedState(v)} defaultValue={userState}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={userState ?? "Select state"} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(STATE_IRS_PORTALS).map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedState && STATE_IRS_PORTALS[selectedState]
                        ? STATE_IRS_PORTALS[selectedState].replace("https://", "").replace(/\/$/, "")
                        : (!selectedState && userStateIRSUrl)
                        ? userStateIRSUrl.replace("https://", "").replace(/\/$/, "")
                        : "No portal available for selected state. NRC will be used as fallback."}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium">
                    <ExternalLink className="w-3 h-3" />
                    <a
                      href={(selectedState && STATE_IRS_PORTALS[selectedState]) || userStateIRSUrl || "https://selfservice.nrs.gov.ng/"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate"
                      title={(selectedState && STATE_IRS_PORTALS[selectedState]) || userStateIRSUrl || "https://selfservice.nrs.gov.ng/"}
                    >
                      {((selectedState && STATE_IRS_PORTALS[selectedState]) || userStateIRSUrl || "https://selfservice.nrs.gov.ng/")
                        .replace("https://", "").replace(/\/$/, "")}
                    </a>
                  </div>
                </div>
              </div>
          </RadioGroup>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={processing}
          >
            {processing ? "Processing..." : "Continue to Portal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Tax Details Popup Dialog - Centered Square */}
    <Dialog open={showTaxDetails} onOpenChange={setShowTaxDetails}>
      <DialogContent className="max-w-md w-[90vw] aspect-square flex flex-col items-center justify-center">
        <DialogHeader>
          <DialogTitle className="text-center mb-6">Payment Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 w-full flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-4">
            {taxAmount && (
              <div className="space-y-1 text-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount to Pay</p>
                <p className="text-xl font-bold text-primary">
                  ₦{taxAmount.toLocaleString()}
                </p>
              </div>
            )}
            {taxDuration && (
              <div className="space-y-1 text-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period</p>
                <p className="text-sm font-semibold">{taxDuration}</p>
              </div>
            )}
            {period && (
              <div className="space-y-1 text-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</p>
                <p className="text-sm font-semibold capitalize">{period}</p>
              </div>
            )}
            {selectedState && (
              <div className="space-y-1 text-center">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">State</p>
                <p className="text-sm font-semibold">{selectedState}</p>
              </div>
            )}
          </div>

          {taxDescription && (
            <p className="text-xs text-muted-foreground italic text-center">{taxDescription}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Embedded portal dialog (iframe) */}
    <Dialog open={!!embeddedUrl} onOpenChange={(open) => !open && setEmbeddedUrl(null)}>
      <DialogContent className="max-w-6xl w-screen h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0">
        {/* Header - fixed */}
        <div className="border-b bg-gradient-to-r from-primary/5 to-primary/10 shrink-0">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg md:text-2xl font-bold">Complete Payment</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTaxDetails(!showTaxDetails)}
                className="h-10 w-10 p-0"
                title="View payment details"
              >
                <Info className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Portal iframe - takes remaining space and scrollable */}
        <div className="flex-1 overflow-auto min-h-0">
          {embeddedUrl ? (
            <iframe
              src={embeddedUrl}
              title="Payment Portal"
              className="w-full h-full min-h-[calc(95vh-200px)] border-none"
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation"
            />
          ) : null}
        </div>

        <DialogFooter className="border-t pt-4 flex justify-between">
          <Button variant="outline" onClick={() => setEmbeddedUrl(null)}>
            Close
          </Button>
          <Button onClick={() => setShowReceiptUpload(true)}>
            Payment Made
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Receipt Upload Modal */}
    <ReceiptUploadModal
      open={showReceiptUpload}
      onOpenChange={setShowReceiptUpload}
      onUpload={async (file) => {
        if (!user?.uid || !taxAmount || !period || !taxDuration) {
          toast.error("Missing payment information. Please try again.")
          return
        }

        try {
          // Upload receipt to ImageKit
          const uploadResult = await uploadToImageKit(file, "payment-receipts", user.uid)
          
          // Save as a Document
          const docRes = await documentService.uploadDocument(user.uid, {
            file: file,
            name: `Payment Receipt - ${taxDuration}`,
            type: "receipt",
            imageKitUrl: uploadResult.url,
            imageKitFileId: uploadResult.fileId,
            fileSize: uploadResult.size,
            notes: `Tax payment receipt for ${period} period: ${taxDuration}`
          })

          if (!docRes.success || !docRes.data) {
            throw new Error(docRes.error || "Failed to save receipt document")
          }

          // Create tax payment record with status 'completed'
          // Ensure we use the taxDuration from the form (the period the user selected to pay for)
          // NOT the current date - this is critical for backdated payments
          if (!taxDuration) {
            throw new Error("Tax duration is required. Please go back and select the period you're paying for.")
          }
          
          const transactionId = `PORTAL-${Date.now()}`
          const saveResult = await taxPaymentService.createPayment(user.uid, {
            transactionId: transactionId,
            amount: taxAmount,
            period: period,
            taxDuration: taxDuration.trim(), // Use the selected taxDuration (e.g., "December 2025")
            paymentMethod: selectedOption === 'nrc' ? 'firs' : 'firs', // Both use FIRS
            status: 'completed',
            receiptUrl: uploadResult.url,
            notes: `Payment made via ${selectedOption === 'nrc' ? 'NRC' : 'State IRS'} portal for ${taxDuration.trim()}`
          })
          
          // Log for debugging
          console.log('Payment recorded with taxDuration:', taxDuration.trim(), 'Period:', period)

          if (!saveResult.success || !saveResult.data) {
            throw new Error(saveResult.error || "Failed to record payment")
          }

          // Store receipt URL and payment record for confirmation modal
          setUploadedReceiptUrl(uploadResult.url)
          setPaymentRecord(saveResult.data)

          // Close receipt upload modal and show confirmation
          setShowReceiptUpload(false)
          setEmbeddedUrl(null)
          setShowConfirmation(true)

          // Call the callback if provided
          if (onPaymentMade) {
            onPaymentMade(file)
          }

          toast.success("Payment recorded successfully!")
        } catch (error) {
          console.error("Error processing payment:", error)
          toast.error(error instanceof Error ? error.message : "Failed to process payment")
        }
      }}
    />

    {/* Payment Confirmation Modal */}
    <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Payment Confirmed
          </DialogTitle>
          <DialogDescription>
            Your tax payment has been successfully recorded for the specified period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {paymentRecord && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold">₦{paymentRecord.amount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Period</p>
                  <p className="font-semibold capitalize">{paymentRecord.period}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tax Duration</p>
                  <p className="font-semibold">{paymentRecord.taxDuration}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-semibold text-green-600 capitalize">{paymentRecord.status}</p>
                </div>
              </div>
            </div>
          )}

          {uploadedReceiptUrl && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Uploaded Receipt</Label>
              <div className="rounded-lg border overflow-hidden">
                {uploadedReceiptUrl.endsWith('.pdf') ? (
                  <iframe
                    src={uploadedReceiptUrl}
                    className="w-full h-[400px]"
                    title="Payment Receipt"
                  />
                ) : (
                  <img
                    src={uploadedReceiptUrl}
                    alt="Payment Receipt"
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              setShowConfirmation(false)
              onOpenChange(false)
              // Redirect to payment page
              router.push(`${basePath}/payment`)
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

interface ReceiptUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (file: File) => void
}

function ReceiptUploadModal({ open, onOpenChange, onUpload }: ReceiptUploadModalProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    try {
      onUpload(selectedFile)
    } finally {
      setUploading(false)
      setSelectedFile(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Payment Receipt</DialogTitle>
          <DialogDescription>
            Upload your payment receipt to confirm the transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              id="receipt-upload"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
            <Label htmlFor="receipt-upload" className="cursor-pointer">
              <div className="text-sm font-medium text-primary hover:underline">
                {selectedFile ? selectedFile.name : "Click to upload receipt"}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                PDF or Image (Max 10MB)
              </p>
            </Label>
          </div>

          {selectedFile && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? "Uploading..." : "Confirm Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
