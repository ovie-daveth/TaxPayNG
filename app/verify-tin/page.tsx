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

export default function VerifyTaxIdPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, refetchProfile, loading } = useUserProfile()
  const [taxId, setTaxId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [tinVerified, setTinVerified] = useState(false)
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  const [businessDocuments, setBusinessDocuments] = useState<{
    cac?: File
    memorandum?: File
  }>({})
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [uploadingDocuments, setUploadingDocuments] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: boolean}>({})
  const [showPopupInstructions, setShowPopupInstructions] = useState(false)
  const [showTaxIdInfoModal, setShowTaxIdInfoModal] = useState(false)
  const [showTaxIdPortalModal, setShowTaxIdPortalModal] = useState(false)
  const [portalUrl, setPortalUrl] = useState("")

  // useEffect(() => {
  //   console.log("Verify Tax ID page mounted - user:", user ? "logged in" : "not logged in")
  //   console.log("Current path:", window.location.pathname)
  // }, [user])

  useEffect(() => {
    if (!user && !authLoading) {
      // console.log("No user after auth loaded, redirecting to login")
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!profile || loading) return

    // Check if businessDocuments exists and has at least one document
    const hasBusinessDocuments = profile.businessDocuments && (
      profile.businessDocuments.cac || 
      profile.businessDocuments.memorandum
    )

    // If user has TIN and is SME with documents, redirect to dashboard
    if (profile.taxId && profile.businessType === 'sme') {
      if (hasBusinessDocuments) {
        console.log("TIN and business documents exist, redirecting to SME dashboard")
        router.push("/dashboard-sme")
        return
      } else {
        // TIN exists but no documents - show document upload
        setTinVerified(true)
        setShowDocumentUpload(true)
        return
      }
    }

    // If user has TIN and is not SME, redirect to appropriate dashboard
    if (profile.taxId && profile.businessType !== 'sme') {
      if (profile.businessType === 'creator') {
        router.push("/dashboard-creator")
      } else {
        router.push("/dashboard")
      }
      return
    }

    // If no TIN, show the TIN input form
    setShowDocumentUpload(false)
    setTinVerified(false)
  }, [profile, loading, router])

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
      setShowTaxIdPortalModal(true)
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
        "taxIdPortal",
        features
      )

      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        setPopupBlocked(true)
        toast.info("Please allow pop-ups for OTax to open the Tax ID portal.")
      } else {
        setPopupBlocked(false)
        popup.focus()
      }
    }
  }


  const handleVerifyTaxIdPortal = () => {
    // Official Tax ID portal (verification happens there)
    const verificationUrl = "https://taxid.nrs.gov.ng/"
    
    // Check if user is on mobile (viewport width < 768px)
    const isMobile = window.innerWidth < 768
    openPortal(verificationUrl, isMobile)
  }

  const handleSaveTaxId = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!taxId.trim()) {
      toast.error('Please enter a Tax ID')
      return
    }

    setIsVerifying(true)

    try {
      // Check if Tax ID is already taken by another user
      const isTaken = await userService.isTaxIdTaken(taxId, user.uid)

      if (isTaken) {
        toast.error('This Tax ID has already been registered by another user. Please contact support if you believe this is an error.')
        return
      }

      // Save Tax ID to profile (no mock verification)
      setIsLoading(true)
      const result = await userService.upsertProfile(user.uid, { taxId })
      setIsLoading(false)

      if (!result.success) {
        toast.error(result.error || 'Failed to save Tax ID. Please try again.')
        return
      }

      toast.success('Tax ID saved successfully!')

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
    } catch (error) {
      toast.error('An error occurred while saving your Tax ID. Please try again.')
      console.error('Tax ID save error:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleFileChange = (type: 'cac' | 'memorandum', file: File | null) => {
    setBusinessDocuments(prev => ({ ...prev, [type]: file || undefined }))
  }

  const handleUploadDocuments = async () => {
    if (!user) return

    const requiredDocs = ['cac', 'memorandum']
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
              imageKitUrl: uploadResult.url,
              imageKitFileId: uploadResult.fileId, // Store fileId for deletion
              fileSize: uploadResult.size
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
        businessDocuments: uploadedDocUrls as { cac?: string; memorandum?: string }
      })

      // Refetch profile to update the local state
      await refetchProfile()

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
              {showDocumentUpload ? "Verify Your Business" : "Add Your Tax ID"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {showDocumentUpload 
                ? "Upload business documents to verify your company"
                : "Your Tax ID helps us personalize tax tracking, reporting, and compliance features."
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
                  <p className="text-xs sm:text-sm font-medium text-primary">Tax ID Saved Successfully!</p>
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

                {/* Memorandum & Articles of Association */}
                <div className="space-y-2">
                  <Label htmlFor="memorandum" className="text-sm sm:text-base">Memorandum & Articles of Association</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="memorandum"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('memorandum', e.target.files?.[0] || null)}
                      disabled={uploadingDocuments}
                      className="flex-1 text-xs sm:text-sm"
                    />
                    {businessDocuments.memorandum && (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Memorandum and Articles of Association from Corporate Affairs Commission
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

              {/* Skip Option */}
              <div className="text-center">
                <Button 
                  variant="ghost" 
                  type="button"
                  onClick={() => {
                    if (profile?.businessType === 'sme') {
                      router.push("/dashboard-sme")
                    } else if (profile?.businessType === 'creator') {
                      router.push("/dashboard-creator")
                    } else {
                      router.push("/dashboard")
                    }
                  }}
                  disabled={uploadingDocuments}
                  className="text-sm sm:text-base"
                >
                  Skip for now
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  You can add your business documents later in settings
                </p>
              </div>
            </div>
          ) : (
            /* Tax ID Section */
            <>
            <form onSubmit={handleSaveTaxId} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="taxId" className="text-sm sm:text-base">Tax Identification Number (Tax ID)</Label>
                  <button
                    type="button"
                    onClick={() => setShowTaxIdInfoModal(true)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Learn about Tax ID"
                  >
                    <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    id="taxId" 
                    type="text" 
                    placeholder="Enter your 13-digit Tax ID" 
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value.replace(/\D/g, ''))}
                    maxLength={13}
                    required 
                    disabled={isVerifying || isLoading}
                    className="h-10 sm:h-11 text-xs sm:text-sm placeholder:text-xs sm:placeholder:text-sm flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Tax ID is typically an 13-digit number used for tax identification in Nigeria.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold" 
                size="lg" 
                disabled={isVerifying || isLoading || !taxId}
              >
               
              {
                 isLoading || isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Tax ID"
                )
              }
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

            {/* Get Tax ID Section */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ExternalLink className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 w-full">
                  <h3 className="font-semibold mb-2 text-sm sm:text-base">Don't know your Tax ID?</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                    You can retrieve your Tax ID using the official FIRS Tax ID portal.
                  </p>
                  <button
                    type="button"
                    onClick={handleVerifyTaxIdPortal}
                    disabled={isVerifying || isLoading}
                    className="w-full sm:w-auto text-xs sm:text-sm font-semibold border border-border rounded-lg p-2 sm:p-3 flex items-center justify-center gap-2 cursor-pointer"
                    aria-label="Open FIRS Tax ID portal"
                    title="Open FIRS Tax ID portal"
                  >
                    Retrieve Tax ID (FIRS Portal)
                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground hover:text-primary transition-colors" />
                  </button>
                  <p className="text-xs text-muted-foreground mt-3 sm:hidden">
                    Having trouble on mobile? Allow pop-ups for OTax so the portal can open in a new window.
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

            {/* Skip Option - Show for all business types */}
            <div className="text-center">
              <Button 
                variant="ghost" 
                type="button"
                onClick={() => {
                  if (profile?.businessType === 'sme') {
                    router.push("/dashboard-sme")
                  } else if (profile?.businessType === 'creator') {
                    router.push("/dashboard-creator")
                  } else {
                    router.push("/dashboard")
                  }
                }}
                disabled={isVerifying || isLoading}
                className="text-sm sm:text-base"
              >
                Skip for now
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                You can add your Tax ID and business documents later in settings
              </p>
            </div>
            </>
          )}
        </Card>
      </div>
      {/* Tax ID Info Modal */}
      <Dialog open={showTaxIdInfoModal} onOpenChange={setShowTaxIdInfoModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">What is a Tax Identification Number (Tax ID)?</DialogTitle>
            <DialogDescription className="text-sm">
              A simple explanation of what it is, where it comes from, and why it matters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="space-y-2">
              <p className="text-foreground font-medium">What is a Tax Identification Number (Tax ID)?</p>
              <p>
                A Tax Identification Number (Tax ID) is a unique number jointly issued by the Nigeria Revenue Service (NRS) and the Joint Revenue Board (JRB) in accordance with Nigerian tax laws for the purpose of identifying individuals and entities for tax administration, compliance, and enforcement.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-foreground font-medium">How it’s created</p>
              <p>Under Nigeria’s tax administration framework, a Tax ID is not created in isolation.</p>
              <p>It is derived from and linked to officially recognized foundational identity systems, including:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>National Identification Number (NIN) issued by the National Identity Management Commission (NIMC) for individuals</li>
                <li>Corporate Affairs Commission (CAC) registration records for companies, business names, partnerships, and incorporated trustees</li>
                <li>Other legally recognized identity records for non-residents and special entities</li>
              </ul>
              <p>
                This linkage ensures that every Tax ID corresponds to a verified legal identity, improving accuracy, integrity, and trust in Nigeria’s tax system.
              </p>
            </div>

            <div className="border-l-4 border-primary/20 pl-4 space-y-2">
              <p className="text-foreground font-medium">Why this matters</p>
              <p>By anchoring Tax IDs to foundational identity systems, the tax authority is able to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ensure one Tax ID per person or entity</li>
                <li>Prevent duplication, fraud, and identity mismatch</li>
                <li>Enable seamless interaction with banks, employers, regulators, and government agencies</li>
                <li>Support efficient tax assessment, filing, and compliance monitoring</li>
              </ul>
            </div>

            <div className="border border-border rounded-lg p-3 sm:p-4 bg-muted/40">
              <p className="text-xs sm:text-sm">
                <span className="font-medium text-foreground">Need to request or verify a Tax ID?</span> You can use the official FIRS Tax ID portal{" "}
                <a
                  href="https://taxid.firs.gov.ng/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  here
                </a>{" "}
                or use the button on this page to open it.
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => setShowTaxIdInfoModal(false)}>
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
              Enable pop-ups so we can open the official Tax ID portal in a new window.
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
                Need more help? You can manually visit the Tax ID portal{" "}
                <a
                  href="https://taxid.firs.gov.ng/"
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

      {/* Tax ID Portal Modal (Mobile) */}
      <Dialog open={showTaxIdPortalModal} onOpenChange={setShowTaxIdPortalModal}>
        <DialogContent className="max-w-full w-full h-[90vh] p-0 sm:max-w-4xl sm:h-[85vh] flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b">
            <DialogTitle className="text-base sm:text-lg">FIRS Tax ID Portal</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Complete your Tax ID registration or verification in the form below. You can close this window when done.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 relative min-h-0">
            <iframe
              src={portalUrl || "https://taxid.firs.gov.ng/"}
              className="w-full h-full border-0"
              title="FIRS Tax ID Portal"
              allow="fullscreen"
            />
          </div>
          <div className="px-4 sm:px-6 py-3 border-t flex justify-end">
            <Button type="button" onClick={() => setShowTaxIdPortalModal(false)} className="h-9 sm:h-10 text-xs sm:text-sm">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


