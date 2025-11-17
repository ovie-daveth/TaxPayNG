"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { FileText, ExternalLink, CheckCircle, Upload, Building2, Loader2 } from "lucide-react"
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

  const handleGetTIN = () => {
    const portalUrl = "https://tinverification.jtb.gov.ng/"
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
      portalUrl,
      "tinVerificationPortal",
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-2xl">
        <Card className="p-8">
          {/* Header - Different for document upload */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              {showDocumentUpload ? (
                <Building2 className="w-8 h-8 text-primary" />
              ) : (
                <FileText className="w-8 h-8 text-primary" />
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {showDocumentUpload ? "Verify Your Business" : "Verify Your TIN"}
            </h1>
            <p className="text-muted-foreground">
              {showDocumentUpload 
                ? "Upload business documents to verify your company"
                : "Tax Identification Number (TIN) is required for tax management in Nigeria"
              }
            </p>
          </div>

          {showDocumentUpload ? (
            /* Document Upload Section */
            <div className="space-y-6">
              {/* Success Message */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">TIN Verified Successfully!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Now upload your business documents to complete verification
                  </p>
                </div>
              </div>

              {/* Document Upload Fields */}
              <div className="space-y-4">
                {/* CAC Certificate */}
                <div className="space-y-2">
                  <Label htmlFor="cac">CAC Certificate (Company Registration)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cac"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('cac', e.target.files?.[0] || null)}
                      disabled={uploadingDocuments}
                      className="flex-1"
                    />
                    {businessDocuments.cac && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Certificate of Incorporation from Corporate Affairs Commission
                  </p>
                </div>

                {/* Tax Certificate */}
                <div className="space-y-2">
                  <Label htmlFor="taxCertificate">Tax Clearance Certificate</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="taxCertificate"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('taxCertificate', e.target.files?.[0] || null)}
                      disabled={uploadingDocuments}
                      className="flex-1"
                    />
                    {businessDocuments.taxCertificate && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valid tax clearance certificate from FIRS
                  </p>
                </div>

                {/* Business License */}
                <div className="space-y-2">
                  <Label htmlFor="businessLicense">Business License</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="businessLicense"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('businessLicense', e.target.files?.[0] || null)}
                      disabled={uploadingDocuments}
                      className="flex-1"
                    />
                    {businessDocuments.businessLicense && (
                      <CheckCircle className="w-5 h-5 text-primary" />
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
            <form onSubmit={handleVerifyTIN} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tin">Tax Identification Number (TIN)</Label>
                <Input 
                  id="tin" 
                  type="text" 
                  placeholder="Enter your 11-digit TIN" 
                  value={tin}
                  onChange={(e) => setTIN(e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                  required 
                  disabled={isVerifying || isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  TIN is an 11-digit number issued by FIRS for tax purposes
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={isVerifying || isLoading || !tin}
              >
                {isVerifying ? "Verifying..." : isLoading ? "Saving..." : "Verify TIN"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Get TIN Section */}
            <div className="bg-muted/50 border border-border rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ExternalLink className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Don't have a TIN yet?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You need to obtain a TIN from the Federal Inland Revenue Service (FIRS) before proceeding. 
                    Click the button below to visit the FIRS TIN portal.
                  </p>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={handleGetTIN}
                    disabled={isVerifying || isLoading}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Get TIN from FIRS Portal
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3 md:hidden">
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
              <div className="mt-6 text-center">
                <Button 
                  variant="ghost" 
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  disabled={isVerifying || isLoading}
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
      {/* Popup Instructions Modal */}
      <Dialog open={showPopupInstructions} onOpenChange={setShowPopupInstructions}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>How to Allow Pop-ups for OTax</DialogTitle>
            <DialogDescription>
              Enable pop-ups so we can open the official TIN portal in a new window.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Chrome / Edge (Desktop)</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the blocked popup icon in the address bar.</li>
                <li>Select <span className="font-medium text-foreground">“Always allow pop-ups and redirects”</span> for <span className="font-medium text-foreground">otax.ng</span>.</li>
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
                Need more help? You can manually visit{" "}
                <a
                  href="https://tinverification.jtb.gov.ng/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  tinverification.jtb.gov.ng
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
    </div>
  )
}

