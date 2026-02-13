"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { userService } from "@/lib/services"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { toast } from "sonner"
import { Loader2, Upload, CheckCircle2, X, FileText, Shield, AlertCircle, Camera, User, RotateCcw, Info, ExternalLink } from "lucide-react"
import OtaxLogo from "@/components/OtaxLogo"
import { isConsultant } from "@/lib/utils/businessTypeHelpers"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function ConsultantKYCPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  
  // File states (storing File objects, not URLs)
  const [proofOfIdentityFile, setProofOfIdentityFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [certificationFile, setCertificationFile] = useState<File | null>(null)
  
  // Preview URLs for display
  const [proofOfIdentityPreview, setProofOfIdentityPreview] = useState('')
  const [selfiePreview, setSelfiePreview] = useState('')
  const [certificationPreview, setCertificationPreview] = useState('')
  
  const [submitting, setSubmitting] = useState(false)
  const [showCertificationInfo, setShowCertificationInfo] = useState(false)
  
  // Selfie camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  useEffect(() => {
    if (authLoading || profileLoading) {
      return
    }

    if (!user) {
      router.push('/login')
      return
    }

    if (!profile) {
      console.log("Consultant KYC page - profile is null, waiting...")
      return
    }

    console.log("Consultant KYC page - businessType:", profile.businessType)
    console.log("Consultant KYC page - consultantKycCompleted:", profile.consultantKycCompleted)
    
    if (!isConsultant(profile.businessType)) {
      router.push('/dashboard')
      return
    }

    if (profile.consultantKycCompleted === true) {
      const timer = setTimeout(() => {
        router.push('/consultant/dashboard')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [user, profile, authLoading, profileLoading, router])

  useEffect(() => {
    if (profile) {
      // Load existing documents if already uploaded
      const proofOfId = profile.kycDocuments?.proofOfIdentity || 
                       profile.kycDocuments?.id || 
                       profile.kycDocuments?.passport || 
                       profile.kycDocuments?.driverLicense || ''
      if (proofOfId) setProofOfIdentityPreview(proofOfId)
      
      const selfie = profile.kycDocuments?.selfie || ''
      if (selfie) setSelfiePreview(selfie)
      
      const cert = profile.consultantCertification || ''
      if (cert) setCertificationPreview(cert)
    }
  }, [profile])

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const handleFileSelect = (
    file: File,
    type: 'proofOfIdentity' | 'selfie' | 'certification'
  ) => {
    // Create preview URL
    const previewUrl = URL.createObjectURL(file)

    if (type === 'certification') {
      setCertificationFile(file)
      setCertificationPreview(previewUrl)
      toast.success("Certification selected (will upload on submit)")
    } else if (type === 'selfie') {
      setSelfieFile(file)
      setSelfiePreview(previewUrl)
      toast.success("Selfie selected (will upload on submit)")
    } else {
      setProofOfIdentityFile(file)
      setProofOfIdentityPreview(previewUrl)
      toast.success("Proof of identity selected (will upload on submit)")
    }
  }

  const handleRemoveDocument = (type: 'proofOfIdentity' | 'selfie' | 'certification') => {
    if (type === 'certification') {
      setCertificationFile(null)
      setCertificationPreview('')
    } else if (type === 'selfie') {
      setSelfieFile(null)
      setSelfiePreview('')
      setCapturedPhoto(null)
    } else {
      setProofOfIdentityFile(null)
      setProofOfIdentityPreview('')
    }
    toast.success("Document removed")
  }

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
      setStream(mediaStream)
      setIsCameraOpen(true)
      setCapturedPhoto(null)
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast.error("Failed to access camera. Please check your permissions.")
      setIsCameraOpen(false)
    }
  }

  useEffect(() => {
    if (videoRef && stream) {
      videoRef.srcObject = stream
    }
    return () => {
      if (videoRef) {
        videoRef.srcObject = null
      }
    }
  }, [videoRef, stream])

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCameraOpen(false)
    if (videoRef) {
      videoRef.srcObject = null
    }
  }

  const capturePhoto = () => {
    if (!videoRef) return
    
    setIsCapturing(true)
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.videoWidth
    canvas.height = videoRef.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoRef, 0, 0)
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9)
      setCapturedPhoto(photoDataUrl)
      stopCamera()
    }
    setIsCapturing(false)
  }

  const retakePhoto = () => {
    setCapturedPhoto(null)
    startCamera()
  }

  const saveSelfie = async () => {
    if (!capturedPhoto) return

    try {
      const response = await fetch(capturedPhoto)
      const blob = await response.blob()
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
      
      setSelfieFile(file)
      setSelfiePreview(capturedPhoto)
      setCapturedPhoto(null)
      toast.success("Selfie captured (will upload on submit)")
    } catch (error) {
      console.error("Error saving selfie:", error)
      toast.error("Failed to save selfie")
    }
  }

  const handleSubmit = async () => {
    if (!user?.uid) return

    // Check if we have existing documents or new files
    const hasProofOfIdentity = proofOfIdentityFile || proofOfIdentityPreview
    const hasSelfie = selfieFile || selfiePreview
    const hasCertification = certificationFile || certificationPreview

    if (!hasProofOfIdentity) {
      toast.error("Please upload your proof of identity (National ID, Passport, or Driver's License)")
      return
    }

    if (!hasSelfie) {
      toast.error("Please upload your selfie for KYC verification")
      return
    }

    if (!hasCertification) {
      toast.error("Please upload your tax consultant certification document")
      return
    }

    setSubmitting(true)
    
    try {
      let proofOfIdentityUrl = proofOfIdentityPreview
      let selfieUrl = selfiePreview
      let certificationUrl = certificationPreview

      // Upload proof of identity if it's a new file
      if (proofOfIdentityFile) {
        toast.loading("Uploading proof of identity...")
        const result = await uploadToImageKit(proofOfIdentityFile, 'consultant-kyc')
        proofOfIdentityUrl = result.url
        toast.dismiss()
        toast.success("Proof of identity uploaded")
      }

      // Upload selfie if it's a new file
      if (selfieFile) {
        toast.loading("Uploading selfie...")
        const result = await uploadToImageKit(selfieFile, 'consultant-selfies')
        selfieUrl = result.url
        toast.dismiss()
        toast.success("Selfie uploaded")
      }

      // Upload certification if it's a new file
      if (certificationFile) {
        toast.loading("Uploading certification...")
        const result = await uploadToImageKit(certificationFile, 'consultant-certifications')
        certificationUrl = result.url
        toast.dismiss()
        toast.success("Certification uploaded")
      }

      // Update profile with all documents and mark KYC as completed
      await userService.upsertProfile(user.uid, {
        kycDocuments: {
          ...(profile?.kycDocuments || {}),
          proofOfIdentity: proofOfIdentityUrl,
          selfie: selfieUrl
        },
        consultantCertification: certificationUrl,
        consultantKycCompleted: true
      })

      await refetchProfile()
      await new Promise(resolve => setTimeout(resolve, 500))
      
      toast.success("KYC verification submitted successfully! Your account is being reviewed.")
      router.push('/consultant/dashboard')
    } catch (error) {
      console.error("Error submitting KYC:", error)
      toast.error("Failed to submit KYC verification")
    } finally {
      setSubmitting(false)
    }
  }

   useEffect(() => {
    if(profile?.consultantKycCompleted && profile?.consultantCertification !== null){
      
      const timer = setTimeout(() => {
        router.push('/consultant/dashboard')
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || profile?.businessType !== 'consultant') {
    return null
  }

  const canSubmit = (proofOfIdentityFile || proofOfIdentityPreview) && 
                    (selfieFile || selfiePreview) && 
                    (certificationFile || certificationPreview)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <OtaxLogo />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Tax Consultant KYC Verification</h1>
          <p className="text-sm sm:text-base text-muted-foreground px-4">
            Complete your KYC verification to start managing clients and their tax filings
          </p>
        </div>

        <Alert className="mb-4 sm:mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          <AlertDescription className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
            <strong>Required Documents:</strong> Please select your documents. They will be uploaded when you click "Submit for Verification".
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Proof of Identity Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Proof of Identity
              </CardTitle>
              <CardDescription>
                Upload your National ID, Passport, or Driver's License
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Identity Document</Label>
                <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center min-h-[200px]">
                  {proofOfIdentityPreview ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <CheckCircle2 className="w-12 h-12 text-green-500" />
                      <p className="text-sm font-medium text-center">
                        {proofOfIdentityFile ? 'Document selected (pending upload)' : 'Proof of identity uploaded'}
                      </p>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => window.open(proofOfIdentityPreview, '_blank')}
                        >
                          View Document
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRemoveDocument('proofOfIdentity')}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-2 w-full">
                      <Upload className="w-12 h-12 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Click to select proof of identity</span>
                      <span className="text-xs text-muted-foreground">National ID, Passport, or Driver's License (PDF, Images - Max 10MB)</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect(file, 'proofOfIdentity')
                        }}
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Accept any one of: National ID Card, International Passport, Voter's Card, or Driver's License
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Selfie Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Selfie for Verification
              </CardTitle>
              <CardDescription>
                Take a clear selfie for identity verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label>Selfie Photo</Label>
                
                {isCameraOpen && !capturedPhoto && (
                  <div className="space-y-4">
                    <div className="relative w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden aspect-video">
                      <video
                        ref={setVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={stopCamera}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={capturePhoto}
                        disabled={isCapturing}
                        size="lg"
                        className="w-full sm:w-auto bg-primary"
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        {isCapturing ? 'Capturing...' : 'Capture Photo'}
                      </Button>
                    </div>
                  </div>
                )}

                {capturedPhoto && !selfiePreview && (
                  <div className="space-y-4">
                    <div className="relative w-full max-w-md mx-auto">
                      <div className="relative w-48 h-48 sm:w-64 sm:h-64 mx-auto rounded-full overflow-hidden border-4 border-primary">
                        <img 
                          src={capturedPhoto} 
                          alt="Captured selfie" 
                          className="w-full h-full object-cover"
                          style={{ transform: 'scaleX(-1)' }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={retakePhoto}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Retake
                      </Button>
                      <Button
                        onClick={saveSelfie}
                        size="lg"
                        className="w-full sm:w-auto bg-primary"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Use This Photo
                      </Button>
                    </div>
                  </div>
                )}

                {selfiePreview && !isCameraOpen && !capturedPhoto && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 border-green-500">
                      <img 
                        src={selfiePreview} 
                        alt="Selfie" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                      <p className="text-sm font-medium">
                        {selfieFile ? 'Selfie selected (pending upload)' : 'Selfie uploaded'}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => window.open(selfiePreview, '_blank')}
                      >
                        View Photo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => handleRemoveDocument('selfie')}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                )}

                {!isCameraOpen && !capturedPhoto && !selfiePreview && (
                  <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
                    <Camera className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Take a selfie for verification
                    </p>
                    <p className="text-xs text-muted-foreground mb-6 text-center max-w-sm">
                      Make sure your face is well-lit and clearly visible. Look directly at the camera.
                    </p>
                    <Button
                      onClick={startCamera}
                      size="lg"
                      className="bg-primary"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Open Camera
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Take a clear selfie showing your face. Make sure your face is well-lit and clearly visible.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tax Consultant Certification Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Tax Consultant Certification
                <Dialog open={showCertificationInfo} onOpenChange={setShowCertificationInfo}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                      <Info className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle className="text-xl">Legal Tax Consultant Certification in Nigeria</DialogTitle>
                      <DialogDescription className="text-sm">
                        Professional certification requirements to practice as a tax consultant
                      </DialogDescription>
                    </DialogHeader>
                    
                    <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
                      <div className="space-y-6 py-4">
                        <div className="space-y-3">
                          <h5 className="font-semibold text-base">Primary Professional Qualifications:</h5>
                          <ul className="space-y-3 text-sm">
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <strong className="text-primary">CITN (Chartered Institute of Taxation of Nigeria)</strong>
                                <p className="text-muted-foreground text-xs mt-1">
                                  The primary professional certifier for tax practitioners. Membership grades include Graduate Member, Associate (ATI), and Fellow (FTI).
                                </p>
                              </div>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <strong>ICAN, ANAN, ACCA, or CIMA</strong>
                                <p className="text-muted-foreground text-xs mt-1">
                                  Accounting professional qualifications with tax modules are also recognized.
                                </p>
                              </div>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <strong>Law Degree/Legal Qualification</strong>
                                <p className="text-muted-foreground text-xs mt-1">
                                  Relevant for deep understanding of tax law, particularly for advisory and compliance work.
                                </p>
                              </div>
                            </li>
                          </ul>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <h5 className="font-semibold text-base">To Practice as a Licensed Tax Consultant:</h5>
                          <ol className="space-y-3 text-sm">
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">1</span>
                              <p className="text-muted-foreground pt-0.5">
                                Be a <strong className="text-foreground">financial member of CITN</strong> (passed exams or have professional exemptions)
                              </p>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">2</span>
                              <p className="text-muted-foreground pt-0.5">
                                Apply for a <strong className="text-foreground">Practising Licence from CITN</strong>
                              </p>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">3</span>
                              <p className="text-muted-foreground pt-0.5">
                                Have at least <strong className="text-foreground">18 months of relevant tax work experience</strong>
                              </p>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">4</span>
                              <p className="text-muted-foreground pt-0.5">
                                Complete required <strong className="text-foreground">continuing professional development (CPD)</strong> units
                              </p>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">5</span>
                              <p className="text-muted-foreground pt-0.5">
                                Renew licence regularly and comply with <strong className="text-foreground">professional ethics rules</strong>
                              </p>
                            </li>
                          </ol>
                        </div>

                        <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                          <AlertDescription className="text-sm text-amber-900 dark:text-amber-200">
                            <strong>Important:</strong> Under Nigeria's New Tax Administration Act, anyone acting as a tax agent must be accredited or recognized by the proper authority with the right credentials, experience, and practising licence.
                          </AlertDescription>
                        </Alert>

                        <Separator />

                        <div className="space-y-3">
                          <h5 className="font-semibold text-base">Learn More:</h5>
                          <div className="space-y-2">
                            <a 
                              href="https://www.new.citn.org/" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-primary hover:underline group"
                            >
                              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                              Chartered Institute of Taxation of Nigeria (CITN)
                            </a>
                            <a 
                              href="https://portal.citn.org/practicing-license/" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-primary hover:underline group"
                            >
                              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                              CITN Practicing License Portal
                            </a>
                            <a 
                              href="https://en.wikipedia.org/wiki/Chartered_Institute_of_Taxation_of_Nigeria" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-primary hover:underline group"
                            >
                              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                              About CITN (Wikipedia)
                            </a>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>

                    <div className="flex justify-end pt-4 border-t">
                      <Button onClick={() => setShowCertificationInfo(false)}>
                        Close
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Upload proof of your certification as a professional tax consultant (e.g. CITN, ICAN, ANAN, ACCA, CIMA or authorization document)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Certification Document</Label>
                <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center min-h-[200px]">
                  {certificationPreview ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <CheckCircle2 className="w-12 h-12 text-green-500" />
                      <p className="text-sm font-medium text-center">
                        {certificationFile ? 'Document selected (pending upload)' : 'Certification uploaded'}
                      </p>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => window.open(certificationPreview, '_blank')}
                        >
                          View Document
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRemoveDocument('certification')}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-2 w-full">
                      <Upload className="w-12 h-12 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Click to select certification</span>
                      <span className="text-xs text-muted-foreground">PDF, Images (Max 10MB)</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect(file, 'certification')
                        }}
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload your professional certification, license, or authorization document (CITN, ICAN, ANAN, ACCA, CIMA, etc.) that proves you are a certified tax consultant.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => router.push('/dashboard')}
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              size="lg"
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading & Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

