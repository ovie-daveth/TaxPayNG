"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { FileText, ExternalLink, CheckCircle, Upload, Building2, Loader2, Info } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { userService, documentService } from "@/lib/services"
import { toast } from "sonner"
import { uploadToImageKit } from "@/lib/utils/imagekit"

export default function VerifyTINPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, refetchProfile, loading } = useUserProfile()
  const [tin, setTIN] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [tinVerified, setTinVerified] = useState(false)
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  const [businessDocuments, setBusinessDocuments] = useState<{
    cac?: File
    taxCertificate?: File
    businessLicense?: File
  }>({})
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [uploadingDocuments, setUploadingDocuments] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: boolean}>({})
  const [showPopupInstructions, setShowPopupInstructions] = useState(false)
  const [showTinInfoModal, setShowTinInfoModal] = useState(false)
  const [showTinPortalModal, setShowTinPortalModal] = useState(false)
  const [portalUrl, setPortalUrl] = useState("")

  useEffect(() => {
    console.log("Verify TIN page mounted - user:", user ? "logged in" : "not logged in")
    console.log("Current path:", window.location.pathname)
  }, [user])

  useEffect(() => {
    if (!user && !authLoading) {
      console.log("No user after auth loaded, redirecting to login")
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Check if user already has TIN verified but needs to upload business documents
  useEffect(() => {
    if (profile) {
      if (profile.taxId && !profile.businessDocuments && profile.businessType === 'sme') {
        console.log("TIN verified but no business documents, showing document upload")
        setTinVerified(true)
        setShowDocumentUpload(true)
      }
    }
  }, [profile])

  if (!user && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const openPortal = (url: string, isMobile: boolean) => {
    if (isMobile) {
      // On mobile, show modal with iframe
      setPortalUrl(url)
      setShowTinPortalModal(true)
      setPopupBlocked(false)
    } else {
      // On desktop, open popup window
      const viewportWidth = window.innerWidth || 1024
      const viewportHeight = window.innerHeight || 768

      const popupWidth = Math.min(1024, Math.floor(viewportWidth * 0.9))
      const popupHeight = Math.min(768, Math.floor(viewportHeight * 0.9))

      const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX
      const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY
      const outerWidth = window.outerWidth || viewportWidth
      const outerHeight = window.outerHeight || viewportHeight

      const left = Math.max(0, Math.floor(dualScreenLeft + (outerWidth - popupWidth) / 2))
      const top = Math.max(0, Math.floor(dualScreenTop + (outerHeight - popupHeight) / 2))

      const features = [
        "noopener",
        "noreferrer",
        `width=${popupWidth}`,
        `height=${popupHeight}`,
        `left=${left}`,
        `top=${top}`,
        "scrollbars=yes",
        "resizable=yes",
      ].join(",")

      const popup = window.open(
        url,
        "tinPortal",
        features
      )

      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        setPopupBlocked(true)
        toast.info("Please allow pop-ups for OTax to open the TIN portal.")
      } else {
        setPopupBlocked(false)
        popup.focus()
      }
    }
  }

  const handleGetTIN = () => {
    // Determine the correct TIN registration URL based on business type
    const registrationUrl = profile?.businessType === 'sme' 
      ? "https://tin.jtb.gov.ng/TinRequestExternal"
      : "https://tin.jtb.gov.ng/TinIndividualRequestExternal"
    
    // Check if user is on mobile (viewport width < 768px)
    const isMobile = window.innerWidth < 768
    openPortal(registrationUrl, isMobile)
  }

  const handleVerifyTINPortal = () => {
    // JTB TIN Verification Portal URL (same for all business types)
    const verificationUrl = "https://tinverification.jtb.gov.ng/"
    
    // Check if user is on mobile (viewport width < 768px)
    const isMobile = window.innerWidth < 768
    openPortal(verificationUrl, isMobile)
  }

  const handleVerifyTIN = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!tin.trim()) {
      toast.error('Please enter a TIN')
      return
    }

    setIsVerifying(true)

    try {
      // Mock API call to verify TIN
      // In production, replace with actual FIRS API call
      const mockVerifyTIN = async (tinNumber: string) => {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Mock: Accept TIN if it's 11 digits
        if (tinNumber.length === 11 && /^\d+$/.test(tinNumber)) {
          return { valid: true, data: { name: profile?.firstName + " " + profile?.lastName } }
        }
        return { valid: false, message: 'Invalid TIN format' }
      }

      const verificationResult = await mockVerifyTIN(tin)
      
      if (verificationResult.valid) {
        // Check if TIN is already taken by another user
        const isTaken = await userService.isTinTaken(tin, user.uid)
        
        if (isTaken) {
          toast.error('This TIN has already been registered by another user. Please contact support if you believe this is an error.')
          setIsVerifying(false)
          return
        }
        
        // Update user profile with TIN
        setIsLoading(true)
        const result = await userService.upsertProfile(user.uid, {
          taxId: tin
        })

        setIsLoading(false)

        if (result.success) {
          toast.success('TIN verified and saved successfully!')
          // Refetch profile to get updated data
          await refetchProfile()
          
          // Get updated profile data
          const updatedProfile = await userService.getProfile(user.uid)
          
          // Check if user is SME - they need to upload documents
          if (updatedProfile?.businessType === 'sme') {
            setTinVerified(true)
            setShowDocumentUpload(true)
          } else {
            // Freelancer - go directly to dashboard
            router.push("/dashboard")
          }
        } else {
          toast.error('Failed to save TIN. Please try again.')
        }
      } else {
        toast.error(verificationResult.message || 'Invalid TIN. Please check and try again.')
      }
    } catch (error) {
      toast.error('An error occurred while verifying TIN. Please try again.')
      console.error('TIN verification error:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleFileChange = (type: 'cac' | 'taxCertificate' | 'businessLicense', file: File | null) => {
    setBusinessDocuments(prev => ({ ...prev, [type]: file || undefined }))
  }

  const handleUploadDocuments = async () => {
    if (!user) return

    const requiredDocs = ['cac', 'taxCertificate', 'businessLicense']
    const hasAtLeastOne = requiredDocs.some(doc => businessDocuments[doc as keyof typeof businessDocuments])

    if (!hasAtLeastOne) {
      toast.error('Please upload at least one business document')
      return
    }

    setUploadingDocuments(true)

    try {
      const uploadedDocUrls: {[key: string]: string} = {}

      // Upload each document
      for (const [docType, file] of Object.entries(businessDocuments)) {
        if (file) {
          setUploadProgress(prev => ({ ...prev, [docType]: true }))
          
          try {
            const uploadResult = await uploadToImageKit(file, 'business-documents')
            uploadedDocUrls[docType] = uploadResult.url

            // Also save as a document record for tracking
            await documentService.uploadDocument(user.uid, {
              file,
              name: `${docType.toUpperCase()} Document`,
              type: 'proof',
              imageKitUrl: uploadResult.url
            })
          } catch (error) {
            console.error(`Error uploading ${docType}:`, error)
            toast.error(`Failed to upload ${docType}`)
            setUploadingDocuments(false)
            setUploadProgress({})
            return
          }

          setUploadProgress(prev => ({ ...prev, [docType]: false }))
        }
      }

      // Save business document URLs to user profile
      await userService.upsertProfile(user.uid, {
        businessDocuments: uploadedDocUrls as { cac?: string; taxCertificate?: string; businessLicense?: string }
      })

      toast.success('Business documents uploaded successfully!')
      router.push("/dashboard-sme")
    } catch (error) {
      console.error('Error uploading business documents:', error)
      toast.error('Failed to upload documents. Please try again.')
    } finally {
      setUploadingDocuments(false)
      setUploadProgress({})
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-6 sm:py-12">
      <div className="w-full max-w-2xl">
        <Card className="p-4 sm:p-6 md:p-8">
          {/* Header - Different for document upload */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              {showDocumentUpload ? (
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              ) : (
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {showDocumentUpload ? "Verify Your Business" : "Verify Your TIN"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {showDocumentUpload 
                ? "Upload business documents to verify your company"
                : "Tax Identification Number (TIN) is required for tax management in Nigeria"
              }
            </p>
          </div>

          {showDocumentUpload ? (
            /* Document Upload Section */
            <div className="space-y-4 sm:space-y-6">
              {/* Success Message */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-medium text-primary">TIN Verified Successfully!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Now upload your business documents to complete verification
                  </p>
                </div>
              </div>

              {/* Document Upload Fields */}
              <div className="space-y-3 sm:space-y-4">
                {/* CAC Certificate */}
                <div className="space-y-2">
                  <Label htmlFor="cac" className="text-sm sm:text-base">CAC Certificate (Company Registration)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cac"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('cac', e.target.files?.[0] || null)}
                      disabled={uploadingDocuments}
                      className="flex-1 text-xs sm:text-sm"
                    />
                    {businessDocuments.cac && (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Certificate of Incorporation from Corporate Affairs Commission
                  </p>
                </div>

                {/* Tax Certificate */}
                <div className="space-y-2">
                  <Label htmlFor="taxCertificate" className="text-sm sm:text-base">Tax Clearance Certificate</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="taxCertificate"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('taxCertificate', e.target.files?.[0] || null)}
                      disabled={uploadingDocuments}
                      className="flex-1 text-xs sm:text-sm"
                    />
                    {businessDocuments.taxCertificate && (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valid tax clearance certificate from FIRS
                  </p>
                </div>

                {/* Business License */}
                <div className="space-y-2">
                  <Label htmlFor="businessLicense" className="text-sm sm:text-base">Business License</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="businessLicense"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('businessLicense', e.target.files?.[0] || null)}
                      disabled={uploadingDocuments}
                      className="flex-1 text-xs sm:text-sm"
                    />
                    {businessDocuments.businessLicense && (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valid business operating license (if applicable)
                  </p>
                </div>
              </div>

              {/* Upload Button */}
              <Button
                type="button"
                onClick={handleUploadDocuments}
                className="w-full"
                size="lg"
                disabled={uploadingDocuments || !Object.values(businessDocuments).some(Boolean)}
              >
                {uploadingDocuments ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Documents & Continue
                  </>
                )}
              </Button>

              {/* Note */}
              <p className="text-xs text-center text-muted-foreground">
                You can upload additional documents later in your dashboard
              </p>
            </div>
          ) : (
            /* TIN Verification Section */
            <>
            <form onSubmit={handleVerifyTIN} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="tin" className="text-sm sm:text-base">Tax Identification Number (TIN)</Label>
                  <button
                    type="button"
                    onClick={() => setShowTinInfoModal(true)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Learn how to get a TIN"
                  >
                    <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    id="tin" 
                    type="text" 
                    placeholder="Enter your 11-digit TIN" 
                    value={tin}
                    onChange={(e) => setTIN(e.target.value.replace(/\D/g, ''))}
                    maxLength={11}
                    required 
                    disabled={isVerifying || isLoading}
                    className="text-base sm:text-lg flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyTINPortal}
                    disabled={isVerifying || isLoading}
                    className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Verify TIN on JTB portal"
                    title="Verify TIN on JTB portal"
                  >
                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground hover:text-primary transition-colors" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  TIN is an 11-digit number issued by FIRS for tax purposes
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold" 
                size="lg" 
                disabled={isVerifying || isLoading || !tin}
              >
               
               isLoading || isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add TIN"
                )
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6 sm:my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Get TIN Section */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ExternalLink className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 w-full">
                  <h3 className="font-semibold mb-2 text-sm sm:text-base">Don't have a TIN yet?</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                    You need to obtain a TIN from the Federal Inland Revenue Service (FIRS) before proceeding. 
                    Click the button below to visit the FIRS TIN portal.
                  </p>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={handleGetTIN}
                    disabled={isVerifying || isLoading}
                    className="w-full sm:w-auto"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Get TIN from FIRS Portal
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3 sm:hidden">
                    Having trouble on mobile? Allow pop-ups for OTax so the FIRS portal can open in a new window.
                  </p>
                  {(popupBlocked) && (
                    <p className="text-xs text-destructive mt-2">
                      Pop-up blocked. Please enable pop-ups for OTax and try again.{" "}
                      <button
                        type="button"
                        onClick={() => setShowPopupInstructions(true)}
                        className="underline underline-offset-2 text-destructive"
                      >
                        Learn how
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Skip Option - Only show for freelancers */}
            {profile?.businessType !== 'sme' && (
              <div className="mt-4 sm:mt-6 text-center">
                <Button 
                  variant="ghost" 
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  disabled={isVerifying || isLoading}
                  className="text-sm sm:text-base"
                >
                  Skip for now
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  You can add your TIN later in settings
                </p>
              </div>
            )}
            </>
          )}
        </Card>
      </div>
      {/* TIN Info Modal */}
      <Dialog open={showTinInfoModal} onOpenChange={setShowTinInfoModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">How to Get a Tax Identification Number (TIN)</DialogTitle>
            <DialogDescription className="text-sm">
              Complete guide to registering for a TIN online in Nigeria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="mb-3">
                To register for a Tax Identification Number (TIN) online in Nigeria, visit the Joint Tax Board (JTB) portal, fill out the application form, and submit the required documents.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2 text-base">Steps to Register for a TIN Online</h4>
              <ol className="list-decimal list-inside space-y-3 ml-2">
                <li>
                  <span className="font-medium text-foreground">Visit the JTB TIN Registration Portal:</span> Go to the official JTB TIN registration website. This is the primary platform for registering your TIN online.
                </li>
                <li>
                  <span className="font-medium text-foreground">Select Application Type:</span> Choose whether you are registering as an Individual or a Business Entity (Non-Individual).
                </li>
                <li>
                  <span className="font-medium text-foreground">Fill in Required Details:</span> Provide accurate personal or business information, including your Bank Verification Number (BVN) or National Identification Number (NIN), date of birth, and contact information for individuals. For businesses, include the Registration Certificate (RC) number, business name, and details of directors.
                </li>
                <li>
                  <span className="font-medium text-foreground">Upload Necessary Documents:</span> Scan and upload required identification documents, such as a valid ID (National ID, Driver's License, or International Passport) and a utility bill for proof of address. Businesses will need to upload their Certificate of Incorporation and other relevant documents.
                </li>
                <li>
                  <span className="font-medium text-foreground">Submit Application:</span> Review all the information for accuracy and submit the application. You will receive a notification once your TIN is issued, usually within 24 to 48 hours if all documents are correct.
                </li>
                <li>
                  <span className="font-medium text-foreground">Verification:</span> After submission, you can verify your TIN status through the JTB TIN verification portal by entering your details.
                </li>
              </ol>
            </div>

            <div className="border-l-4 border-primary/20 pl-4 space-y-2">
              <h4 className="font-semibold text-foreground mb-2 text-base">Important Notes</h4>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <span className="font-medium text-foreground">Free Registration:</span> The registration process is completely free of charge. Be cautious of any requests for payment during the application process.
                </li>
                <li>
                  <span className="font-medium text-foreground">Keep Records:</span> Save copies of all submitted documents and confirmation emails for your records.
                </li>
                <li>
                  <span className="font-medium text-foreground">Follow Up:</span> If you do not receive your TIN within the expected timeframe, consider following up with the JTB support team for assistance.
                </li>
              </ul>
            </div>

            <div className="border border-border rounded-lg p-3 sm:p-4 bg-muted/40">
              <p className="text-xs sm:text-sm">
                <span className="font-medium text-foreground">Need help?</span> You can visit the official JTB TIN registration portal{" "}
                <a
                  href={profile?.businessType === 'sme' 
                    ? "https://tin.jtb.gov.ng/TinRequestExternal"
                    : "https://tin.jtb.gov.ng/TinIndividualRequestExternal"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  here
                </a>{" "}
                or use the "Get TIN from FIRS Portal" button below to open it directly.
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => setShowTinInfoModal(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup Instructions Modal */}
      <Dialog open={showPopupInstructions} onOpenChange={setShowPopupInstructions}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">How to Allow Pop-ups for OTax</DialogTitle>
            <DialogDescription className="text-sm">
              Enable pop-ups so we can open the official TIN portal in a new window.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-xs sm:text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Chrome / Edge (Desktop)</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the blocked popup icon in the address bar.</li>
                <li>Select <span className="font-medium text-foreground">"Always allow pop-ups and redirects"</span> for <span className="font-medium text-foreground">otax.ng</span>.</li>
                <li>Click <span className="font-medium text-foreground">Done</span>, then press the button again.</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Safari (iPhone / iPad)</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open <span className="font-medium text-foreground">Settings</span> &gt; <span className="font-medium text-foreground">Safari</span>.</li>
                <li>Turn off <span className="font-medium text-foreground">Block Pop-ups</span>.</li>
                <li>Return to OTax and try again.</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">Android (Chrome)</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Tap the 3-dot menu &gt; <span className="font-medium text-foreground">Settings</span>.</li>
                <li>Tap <span className="font-medium text-foreground">Site settings</span> &gt; <span className="font-medium text-foreground">Pop-ups and redirects</span>.</li>
                <li>Allow pop-ups, then try again.</li>
              </ol>
            </div>
            <div className="border border-border rounded-lg p-3 bg-muted/40">
              <p>
                Need more help? You can manually visit the TIN registration portal{" "}
                <a
                  href={profile?.businessType === 'sme' 
                    ? "https://tin.jtb.gov.ng/TinRequestExternal"
                    : "https://tin.jtb.gov.ng/TinIndividualRequestExternal"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  here
                </a>{" "}
                in a new tab.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={() => setShowPopupInstructions(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TIN Portal Modal (Mobile) */}
      <Dialog open={showTinPortalModal} onOpenChange={setShowTinPortalModal}>
        <DialogContent className="max-w-full w-full h-[90vh] p-0 sm:max-w-4xl sm:h-[85vh] flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b">
            <DialogTitle className="text-base sm:text-lg">JTB TIN Portal</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Complete your TIN registration or verification in the form below. You can close this window when done.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 relative min-h-0">
            <iframe
              src={portalUrl || (profile?.businessType === 'sme' 
                ? "https://tin.jtb.gov.ng/TinRequestExternal"
                : "https://tin.jtb.gov.ng/TinIndividualRequestExternal")}
              className="w-full h-full border-0"
              title="JTB TIN Portal"
              allow="fullscreen"
            />
          </div>
          <div className="px-4 sm:px-6 py-3 border-t flex justify-end">
            <Button type="button" onClick={() => setShowTinPortalModal(false)} className="h-9 sm:h-10 text-xs sm:text-sm">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

