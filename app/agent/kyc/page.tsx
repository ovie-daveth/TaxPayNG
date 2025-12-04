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
import { Loader2, Upload, CheckCircle2, X, FileText, Shield, AlertCircle } from "lucide-react"
import OtaxLogo from "@/components/OtaxLogo"

export default function AgentKYCPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  const [uploading, setUploading] = useState({
    kycId: false,
    kycPassport: false,
    kycDriverLicense: false,
    certification: false
  })
  const [kycDocuments, setKycDocuments] = useState({
    id: '',
    passport: '',
    driverLicense: ''
  })
  const [certificationUrl, setCertificationUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

    console.log("Agent KYC page - businessType:", profile.businessType)
    console.log("Agent KYC page - agentKycCompleted:", profile.agentKycCompleted)
    
    if (profile.businessType !== 'agent') {
      router.push('/dashboard')
      return
    }

    // Only redirect if agentKycCompleted is explicitly true
    // undefined or false means they need to complete KYC
    // Add a small delay to prevent rapid redirects during profile updates
    if (profile.agentKycCompleted === true) {
      const timer = setTimeout(() => {
        router.push('/agent/dashboard')
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [user, profile, authLoading, profileLoading, router])

  useEffect(() => {
    if (profile) {
      setKycDocuments({
        id: profile.kycDocuments?.id || '',
        passport: profile.kycDocuments?.passport || '',
        driverLicense: profile.kycDocuments?.driverLicense || ''
      })
      setCertificationUrl(profile.agentCertification || '')
    }
  }, [profile])

  const handleFileUpload = async (
    file: File,
    type: 'kycId' | 'kycPassport' | 'kycDriverLicense' | 'certification'
  ) => {
    if (!user?.uid) return

    const uploadKey = type === 'certification' ? 'certification' : type
    setUploading(prev => ({ ...prev, [uploadKey]: true }))

    try {
      const folder = type === 'certification' ? 'agent-certifications' : 'agent-kyc'
      const result = await uploadToImageKit(file, folder)

      if (type === 'certification') {
        await userService.upsertProfile(user.uid, {
          agentCertification: result.url
        })
        setCertificationUrl(result.url)
        toast.success("Certification uploaded successfully")
      } else {
        const kycField = type === 'kycId' ? 'id' : type === 'kycPassport' ? 'passport' : 'driverLicense'
        await userService.upsertProfile(user.uid, {
          kycDocuments: {
            ...kycDocuments,
            [kycField]: result.url
          }
        })
        setKycDocuments(prev => ({ ...prev, [kycField]: result.url }))
        toast.success("Document uploaded successfully")
      }

      await refetchProfile()
    } catch (error) {
      console.error(`Error uploading ${type}:`, error)
      toast.error(`Failed to upload ${type === 'certification' ? 'certification' : 'document'}`)
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }))
    }
  }

  const handleRemoveDocument = async (type: 'id' | 'passport' | 'driverLicense' | 'certification') => {
    if (!user?.uid) return

    try {
      if (type === 'certification') {
        await userService.upsertProfile(user.uid, {
          agentCertification: ''
        })
        setCertificationUrl('')
      } else {
        await userService.upsertProfile(user.uid, {
          kycDocuments: {
            ...kycDocuments,
            [type]: ''
          }
        })
        setKycDocuments(prev => ({ ...prev, [type]: '' }))
      }
      toast.success("Document removed")
      await refetchProfile()
    } catch (error) {
      console.error("Error removing document:", error)
      toast.error("Failed to remove document")
    }
  }

  const handleSubmit = async () => {
    if (!user?.uid) return

    // Validate required documents
    const hasKyc = kycDocuments.id || kycDocuments.passport || kycDocuments.driverLicense
    if (!hasKyc) {
      toast.error("Please upload at least one KYC document (ID, Passport, or Driver's License)")
      return
    }

    if (!certificationUrl) {
      toast.error("Please upload your agent certification document")
      return
    }

    setSubmitting(true)
    try {
      await userService.upsertProfile(user.uid, {
        agentKycCompleted: true
        // Note: role is automatically set during signup for agents
      })

      // Wait for profile to be refetched before redirecting
      await refetchProfile()
      
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 500))
      
      toast.success("KYC verification submitted successfully! Your account is being reviewed.")
      router.push('/agent/dashboard')
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

  if (!user || profile?.businessType !== 'agent') {
    return null
  }

  const hasKyc = kycDocuments.id || kycDocuments.passport || kycDocuments.driverLicense
  const canSubmit = hasKyc && certificationUrl

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <OtaxLogo />
          </div>
          <h1 className="text-3xl font-bold mb-2">Agent KYC Verification</h1>
          <p className="text-muted-foreground">
            Complete your KYC verification to start accepting filing requests
          </p>
        </div>

        <Alert className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Required Documents:</strong> Please upload at least one identity document (ID, Passport, or Driver's License) 
            and your agent certification document to complete verification.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* KYC Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Identity Documents (KYC)
              </CardTitle>
              <CardDescription>
                Upload at least one of the following identity documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {/* National ID */}
                <div className="space-y-2">
                  <Label>National ID / Voter's Card</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[140px]">
                    {kycDocuments.id ? (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                        <p className="text-sm text-muted-foreground text-center">Document uploaded</p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(kycDocuments.id, '_blank')}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveDocument('id')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-2 w-full">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(file, 'kycId')
                          }}
                          disabled={uploading.kycId}
                        />
                        {uploading.kycId && <span className="text-xs text-muted-foreground">Uploading...</span>}
                      </label>
                    )}
                  </div>
                </div>

                {/* Passport */}
                <div className="space-y-2">
                  <Label>Passport</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[140px]">
                    {kycDocuments.passport ? (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                        <p className="text-sm text-muted-foreground text-center">Document uploaded</p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(kycDocuments.passport, '_blank')}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveDocument('passport')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-2 w-full">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(file, 'kycPassport')
                          }}
                          disabled={uploading.kycPassport}
                        />
                        {uploading.kycPassport && <span className="text-xs text-muted-foreground">Uploading...</span>}
                      </label>
                    )}
                  </div>
                </div>

                {/* Driver's License */}
                <div className="space-y-2">
                  <Label>Driver's License</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[140px]">
                    {kycDocuments.driverLicense ? (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                        <p className="text-sm text-muted-foreground text-center">Document uploaded</p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(kycDocuments.driverLicense, '_blank')}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveDocument('driverLicense')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-2 w-full">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(file, 'kycDriverLicense')
                          }}
                          disabled={uploading.kycDriverLicense}
                        />
                        {uploading.kycDriverLicense && <span className="text-xs text-muted-foreground">Uploading...</span>}
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agent Certification Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Agent Certification
              </CardTitle>
              <CardDescription>
                Upload proof of your certification as a tax filing agent
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
                  Upload your professional certification, license, or authorization document that proves you are a certified tax filing agent.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              size="lg"
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

