"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { userService } from "@/lib/services"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { toast } from "sonner"
import { Loader2, Upload, CheckCircle2, X, FileText, Shield, AlertCircle, Camera, User, RotateCcw } from "lucide-react"
import OtaxLogo from "@/components/OtaxLogo"

export default function ConsultantKYCPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  const [uploading, setUploading] = useState({
    proofOfIdentity: false,
    selfie: false,
    certification: false
  })
  const [proofOfIdentityUrl, setProofOfIdentityUrl] = useState('')
  const [selfieUrl, setSelfieUrl] = useState('')
  const [certificationUrl, setCertificationUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // Selfie camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  useEffect(() => {
    // Wait for both auth and profile to finish loading
    if (authLoading || profileLoading) {
      return
    }

    if (!user) {
      router.push('/login')
      return
    }

    // If profile is still null after loading, wait a bit more or redirect
    if (!profile) {
      console.log("Agent KYC page - profile is null, waiting...")
      return
    }

    console.log("Consultant KYC page - businessType:", profile.businessType)
    console.log("Consultant KYC page - consultantKycCompleted:", profile.consultantKycCompleted)
    
    // Check for both 'consultant' and legacy 'agent' for backward compatibility
    if (!isConsultant(profile.businessType)) {
      router.push('/dashboard')
      return
    }

    // Only redirect if consultantKycCompleted is explicitly true
    // undefined or false means they need to complete KYC
    // Add a small delay to prevent rapid redirects during profile updates
    if (profile.consultantKycCompleted === true) {
      const timer = setTimeout(() => {
        router.push('/consultant/dashboard')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [user, profile, authLoading, profileLoading, router])

  useEffect(() => {
    if (profile) {
      // Support both new single proofOfIdentity and legacy separate documents
      const proofOfId = profile.kycDocuments?.proofOfIdentity || 
                       profile.kycDocuments?.id || 
                       profile.kycDocuments?.passport || 
                       profile.kycDocuments?.driverLicense || ''
      setProofOfIdentityUrl(proofOfId)
      setSelfieUrl(profile.kycDocuments?.selfie || '')
      setCertificationUrl(profile.consultantCertification || '')
    }
  }, [profile])

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const handleFileUpload = async (
    file: File,
    type: 'proofOfIdentity' | 'selfie' | 'certification'
  ) => {
    if (!user?.uid) return

    setUploading(prev => ({ ...prev, [type]: true }))

    try {
      const folder = type === 'certification' 
        ? 'consultant-certifications' 
        : type === 'selfie'
        ? 'consultant-selfies'
        : 'consultant-kyc'
      const result = await uploadToImageKit(file, folder)

      if (type === 'certification') {
        await userService.upsertProfile(user.uid, {
          consultantCertification: result.url
        })
        setCertificationUrl(result.url)
        toast.success("Certification uploaded successfully")
      } else if (type === 'selfie') {
        await userService.upsertProfile(user.uid, {
          kycDocuments: {
            ...(profile?.kycDocuments || {}),
            selfie: result.url
          }
        })
        setSelfieUrl(result.url)
        toast.success("Selfie uploaded successfully")
      } else {
        // proofOfIdentity
        await userService.upsertProfile(user.uid, {
          kycDocuments: {
            ...(profile?.kycDocuments || {}),
            proofOfIdentity: result.url
          }
        })
        setProofOfIdentityUrl(result.url)
        toast.success("Proof of identity uploaded successfully")
      }

      await refetchProfile()
    } catch (error) {
      console.error(`Error uploading ${type}:`, error)
      toast.error(`Failed to upload ${type === 'certification' ? 'certification' : type === 'selfie' ? 'selfie' : 'document'}`)
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleRemoveDocument = async (type: 'proofOfIdentity' | 'selfie' | 'certification') => {
    if (!user?.uid) return

    try {
      if (type === 'certification') {
        await userService.upsertProfile(user.uid, {
          consultantCertification: ''
        })
        setCertificationUrl('')
      } else if (type === 'selfie') {
        await userService.upsertProfile(user.uid, {
          kycDocuments: {
            ...(profile?.kycDocuments || {}),
            selfie: ''
          }
        })
        setSelfieUrl('')
        setCapturedPhoto(null)
      } else {
        // proofOfIdentity
        await userService.upsertProfile(user.uid, {
          kycDocuments: {
            ...(profile?.kycDocuments || {}),
            proofOfIdentity: ''
          }
        })
        setProofOfIdentityUrl('')
      }
      toast.success("Document removed")
      await refetchProfile()
    } catch (error) {
      console.error("Error removing document:", error)
      toast.error("Failed to remove document")
    }
  }

  // Camera functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // Front camera
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

  // Update video element when stream or ref changes
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

  const uploadSelfie = async () => {
    if (!capturedPhoto || !user?.uid) return

    try {
      setUploading(prev => ({ ...prev, selfie: true }))
      
      // Convert data URL to blob
      const response = await fetch(capturedPhoto)
      const blob = await response.blob()
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
      
      const result = await uploadToImageKit(file, 'consultant-selfies')
      
      await userService.upsertProfile(user.uid, {
        kycDocuments: {
          ...(profile?.kycDocuments || {}),
          selfie: result.url
        }
      })
      setSelfieUrl(result.url)
      setCapturedPhoto(null)
      toast.success("Selfie uploaded successfully")
      await refetchProfile()
    } catch (error) {
      console.error("Error uploading selfie:", error)
      toast.error("Failed to upload selfie")
    } finally {
      setUploading(prev => ({ ...prev, selfie: false }))
    }
  }

  const handleSubmit = async () => {
    if (!user?.uid) return

    // Validate required documents
    if (!proofOfIdentityUrl) {
      toast.error("Please upload your proof of identity (National ID, Passport, or Driver's License)")
      return
    }

    if (!selfieUrl) {
      toast.error("Please upload your selfie for KYC verification")
      return
    }

    if (!certificationUrl) {
      toast.error("Please upload your tax consultant certification document")
      return
    }

    setSubmitting(true)
    try {
      await userService.upsertProfile(user.uid, {
        consultantKycCompleted: true
        // Note: role is automatically set during signup for consultants
      })

      // Wait for profile to be refetched before redirecting
      await refetchProfile()
      
      // Small delay to ensure state is updated
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

  const canSubmit = proofOfIdentityUrl && selfieUrl && certificationUrl

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
            <strong>Required Documents:</strong> Please upload your proof of identity (National ID, Passport, or Driver's License), 
            a selfie for verification, and your tax consultant certification document to complete verification.
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
                  {proofOfIdentityUrl ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <CheckCircle2 className="w-12 h-12 text-green-500" />
                      <p className="text-sm font-medium text-center">Proof of identity uploaded</p>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => window.open(proofOfIdentityUrl, '_blank')}
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
                      <span className="text-sm font-medium text-muted-foreground">Click to upload proof of identity</span>
                      <span className="text-xs text-muted-foreground">National ID, Passport, or Driver's License (PDF, Images - Max 10MB)</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file, 'proofOfIdentity')
                        }}
                        disabled={uploading.proofOfIdentity}
                      />
                      {uploading.proofOfIdentity && (
                        <div className="flex items-center gap-2 mt-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs text-muted-foreground">Uploading...</span>
                        </div>
                      )}
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
                
                {/* Camera Preview */}
                {isCameraOpen && !capturedPhoto && (
                  <div className="space-y-4">
                    <div className="relative w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden aspect-video">
                      <video
                        ref={setVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }} // Mirror effect
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

                {/* Captured Photo Preview */}
                {capturedPhoto && !selfieUrl && (
                  <div className="space-y-4">
                    <div className="relative w-full max-w-md mx-auto">
                      <div className="relative w-48 h-48 sm:w-64 sm:h-64 mx-auto rounded-full overflow-hidden border-4 border-primary">
                        <img 
                          src={capturedPhoto} 
                          alt="Captured selfie" 
                          className="w-full h-full object-cover"
                          style={{ transform: 'scaleX(-1)' }} // Mirror effect
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
                        onClick={uploadSelfie}
                        disabled={uploading.selfie}
                        size="lg"
                        className="w-full sm:w-auto bg-primary"
                      >
                        {uploading.selfie ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Upload Selfie
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Uploaded Selfie */}
                {selfieUrl && !isCameraOpen && !capturedPhoto && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 border-green-500">
                      <img 
                        src={selfieUrl} 
                        alt="Selfie" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                      <p className="text-sm font-medium">Selfie uploaded</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => window.open(selfieUrl, '_blank')}
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

                {/* Start Camera Button */}
                {!isCameraOpen && !capturedPhoto && !selfieUrl && (
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

          {/* Agent Certification Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Tax Consultant Certification
              </CardTitle>
              <CardDescription>
                Upload proof of your certification as a professional tax consultant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Certification Document</Label>
                <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center min-h-[200px]">
                  {certificationUrl ? (
                    <div className="flex flex-col items-center gap-2 w-full">
                      <CheckCircle2 className="w-12 h-12 text-green-500" />
                      <p className="text-sm font-medium text-center">Certification uploaded</p>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => window.open(certificationUrl, '_blank')}
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
                      <span className="text-sm font-medium text-muted-foreground">Click to upload certification</span>
                      <span className="text-xs text-muted-foreground">PDF, Images (Max 10MB)</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file, 'certification')
                        }}
                        disabled={uploading.certification}
                      />
                      {uploading.certification && (
                        <div className="flex items-center gap-2 mt-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs text-muted-foreground">Uploading...</span>
                        </div>
                      )}
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload your professional certification, license, or authorization document that proves you are a certified tax consultant.
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
                  Submitting...
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

