"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { Loader2, Plus, X, Trash2, Save, Award, MapPin, Users, Star, Upload, Briefcase, Languages, GraduationCap, Trophy, TrendingUp, FileCheck, UserCheck, ExternalLink } from "lucide-react"
import { userService } from "@/lib/services"

const SPECIALIZATIONS = [
  "CIT (Company Income Tax)",
  "VAT (Value Added Tax)",
  "PAYE (Pay As You Earn)",
  "Personal Income Tax",
  "Capital Gains Tax",
  "Stamp Duties",
  "Tax Planning",
  "Tax Compliance",
  "Tax Audits",
  "Tax Advisory"
]

const LANGUAGES = [
  "English",
  "Yoruba",
  "Hausa",
  "Igbo",
  "Pidgin",
  "French"
]

const isValidUrl = (url: string): boolean => {
  if (!url) return true // Empty is valid (optional field)
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

export default function PortfolioPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  const [saving, setSaving] = useState(false)

  const [portfolio, setPortfolio] = useState({
    bio: "",
    experience: "",
    specializations: [] as string[],
    location: "",
    languages: [] as string[],
    certifications: [] as Array<{
      name: string
      issuer: string
      year?: number
      certificateUrl?: string
    }>,
    achievements: [] as Array<{
      title: string
      description?: string
      year?: number
    }>,
    portfolioImages: [] as string[]
  })

  // Read-only stats from profile
  const consultationClients = profile?.consultantPortfolio?.consultationClients || 0
  const filingClients = profile?.consultantPortfolio?.filingClients || 0
  const totalClients = consultationClients + filingClients
  const filingsCompleted = profile?.consultantPortfolio?.filingsCompleted || 0
  const successRate = profile?.consultantPortfolio?.successRate || 0

  const [newCertification, setNewCertification] = useState({
    name: "",
    issuer: "",
    year: new Date().getFullYear(),
    certificateUrl: ""
  })

  const [newAchievement, setNewAchievement] = useState({
    title: "",
    description: "",
    year: new Date().getFullYear()
  })

  const [certUrlError, setCertUrlError] = useState("")

  useEffect(() => {
    if (authLoading || profileLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (profile?.consultantPortfolio) {
      setPortfolio({
        bio: profile.consultantPortfolio.bio || "",
        experience: profile.consultantPortfolio.experience || "",
        specializations: profile.consultantPortfolio.specializations || [],
        location: profile.consultantPortfolio.location || "",
        languages: profile.consultantPortfolio.languages || [],
        certifications: profile.consultantPortfolio.certifications || [],
        achievements: profile.consultantPortfolio.achievements || [],
        portfolioImages: profile.consultantPortfolio.portfolioImages || []
      })
    }
  }, [user, profile, authLoading, profileLoading, router])

  const handleSave = async () => {
    if (!user?.uid) {
      toast.error("Please log in to save your portfolio")
      return
    }

    setSaving(true)
    try {
      const result = await userService.upsertProfile(user.uid, {
        consultantPortfolio: portfolio
      })

      if (result.success) {
        toast.success("Portfolio updated successfully!")
        await refetchProfile()
      } else {
        toast.error(result.error || "Failed to update portfolio")
      }
    } catch (error) {
      console.error("Error saving portfolio:", error)
      toast.error("Failed to save portfolio")
    } finally {
      setSaving(false)
    }
  }

  const toggleSpecialization = (spec: string) => {
    setPortfolio(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }))
  }

  const toggleLanguage = (lang: string) => {
    setPortfolio(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }))
  }

  const handleCertUrlChange = (url: string) => {
    setNewCertification(prev => ({ ...prev, certificateUrl: url }))
    
    if (url && !isValidUrl(url)) {
      setCertUrlError("Please enter a valid URL (e.g., https://example.com)")
    } else {
      setCertUrlError("")
    }
  }

  const addCertification = () => {
    if (!newCertification.name || !newCertification.issuer) {
      toast.error("Please fill in certification name and issuer")
      return
    }

    if (newCertification.certificateUrl && !isValidUrl(newCertification.certificateUrl)) {
      toast.error("Please enter a valid certificate URL")
      setCertUrlError("Please enter a valid URL (e.g., https://example.com)")
      return
    }

    setPortfolio(prev => ({
      ...prev,
      certifications: [...prev.certifications, { ...newCertification }]
    }))

    setNewCertification({
      name: "",
      issuer: "",
      year: new Date().getFullYear(),
      certificateUrl: ""
    })
    setCertUrlError("")
    toast.success("Certification added successfully")
  }

  const removeCertification = (index: number) => {
    setPortfolio(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }))
  }

  const addAchievement = () => {
    if (!newAchievement.title) {
      toast.error("Please fill in achievement title")
      return
    }

    setPortfolio(prev => ({
      ...prev,
      achievements: [...prev.achievements, { ...newAchievement }]
    }))

    setNewAchievement({
      title: "",
      description: "",
      year: new Date().getFullYear()
    })
  }

  const removeAchievement = (index: number) => {
    setPortfolio(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index)
    }))
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || profile?.businessType !== 'consultant') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-3 sm:px-4 pb-4 sm:pb-6 ">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats Overview */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Stats */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <TrendingUp className="w-5 h-5" />
                  Performance Stats
                </CardTitle>
                <CardDescription>Your professional metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Total Clients */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Total Clients
                  </Label>
                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold">{totalClients}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs font-medium text-blue-600">Consultation</span>
                      </div>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-1">{consultationClients}</p>
                    </div>
                    <div className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded-md border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-xs font-medium text-purple-600">Filing</span>
                      </div>
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-400 mt-1">{filingClients}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Based on active client relationships
                  </p>
                </div>

                {/* Filings Completed */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Filings Completed
                  </Label>
                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    <FileCheck className="w-5 h-5 text-green-600" />
                    <span className="text-2xl font-bold">{filingsCompleted}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total tax filings successfully completed
                  </p>
                </div>

                {/* Success Rate */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Success Rate
                  </Label>
                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    <Star className="w-5 h-5 text-amber-500" />
                    <span className="text-2xl font-bold">{successRate}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Based on client ratings and feedback
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Profile Strength</span>
                    <span className="font-semibold text-primary">
                      {Math.min(100, Math.round(
                        (portfolio.bio ? 20 : 0) +
                        (portfolio.experience ? 15 : 0) +
                        (portfolio.specializations.length > 0 ? 20 : 0) +
                        (portfolio.certifications.length > 0 ? 20 : 0) +
                        (portfolio.location ? 10 : 0) +
                        (portfolio.languages.length > 0 ? 15 : 0)
                      ))}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div 
                      className="bg-gradient-to-r from-primary to-primary/60 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round(
                          (portfolio.bio ? 20 : 0) +
                          (portfolio.experience ? 15 : 0) +
                          (portfolio.specializations.length > 0 ? 20 : 0) +
                          (portfolio.certifications.length > 0 ? 20 : 0) +
                          (portfolio.location ? 10 : 0) +
                          (portfolio.languages.length > 0 ? 15 : 0)
                        ))}%`
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card className="border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="e.g., Lagos, Nigeria"
                  value={portfolio.location}
                  onChange={(e) => setPortfolio(prev => ({ ...prev, location: e.target.value }))}     
                  className="bg-background"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Professional Profile */}
            <Card className="border-primary/10 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Professional Profile
                </CardTitle>
                <CardDescription>Tell clients about your expertise</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <Label htmlFor="bio" className="text-sm font-medium">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Write a compelling bio that highlights your expertise, experience, and what makes you unique..."
                    value={portfolio.bio}
                    onChange={(e) => setPortfolio(prev => ({ ...prev, bio: e.target.value }))}
                    rows={5}
                    className="mt-2 bg-background resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {portfolio.bio.length}/500 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="experience" className="text-sm font-medium">Years of Experience</Label>
                  <Input
                    id="experience"
                    placeholder="e.g., 10+ years in tax consulting"
                    value={portfolio.experience}
                    onChange={(e) => setPortfolio(prev => ({ ...prev, experience: e.target.value }))}
                    className="mt-2 bg-background"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Specializations */}
            <Card className="border-primary/10 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  Areas of Expertise
                </CardTitle>
                <CardDescription>Select your tax specializations (click to toggle)</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map((spec) => (
                    <Badge
                      key={spec}
                      variant={portfolio.specializations.includes(spec) ? "default" : "outline"}
                      className={`cursor-pointer transition-all hover:scale-105 ${
                        portfolio.specializations.includes(spec) 
                          ? 'bg-primary hover:bg-primary/90 shadow-sm' 
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => toggleSpecialization(spec)}
                    >
                      {portfolio.specializations.includes(spec) && <span className="mr-1">✓</span>}
                      {spec}
                    </Badge>
                  ))}
                </div>
                {portfolio.specializations.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-4">
                    {portfolio.specializations.length} specialization{portfolio.specializations.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Languages */}
            <Card className="border-primary/10 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="">
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-purple-600" />
                  Languages
                </CardTitle>
                <CardDescription>Languages you can communicate in</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <Badge
                      key={lang}
                      variant={portfolio.languages.includes(lang) ? "default" : "outline"}
                      className={`cursor-pointer transition-all hover:scale-105 ${
                        portfolio.languages.includes(lang) 
                          ? 'bg-purple-600 hover:bg-purple-700 shadow-sm' 
                          : 'hover:border-purple-500/50'
                      }`}
                      onClick={() => toggleLanguage(lang)}
                    >
                      {portfolio.languages.includes(lang) && <span className="mr-1">✓</span>}
                      {lang}
                    </Badge>
                  ))}
                </div>
                {portfolio.languages.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-4">
                    {portfolio.languages.length} language{portfolio.languages.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Certifications */}
            <Card className="border-primary/10 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="bg-gradient-to-r from-green-500/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-green-600" />
                  Professional Certifications
                </CardTitle>
                <CardDescription>Showcase your credentials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border border-dashed border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="cert-name" className="text-sm">Certification Name *</Label>
                    <Input
                      id="cert-name"
                      placeholder="e.g., ICAN, ACCA, CTA"
                      value={newCertification.name}
                      onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cert-issuer" className="text-sm">Issuing Organization *</Label>
                    <Input
                      id="cert-issuer"
                      placeholder="e.g., ICAN"
                      value={newCertification.issuer}
                      onChange={(e) => setNewCertification(prev => ({ ...prev, issuer: e.target.value }))}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cert-year" className="text-sm">Year Obtained</Label>
                    <Input
                      id="cert-year"
                      type="number"
                      placeholder="2020"
                      value={newCertification.year}
                      onChange={(e) => setNewCertification(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cert-url" className="text-sm flex items-center gap-1">
                      Certificate URL 
                      <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="cert-url"
                        type="url"
                        placeholder="https://example.com/certificate.pdf"
                        value={newCertification.certificateUrl}
                        onChange={(e) => handleCertUrlChange(e.target.value)}
                        className={`bg-background pr-8 ${certUrlError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {newCertification.certificateUrl && isValidUrl(newCertification.certificateUrl) && (
                        <ExternalLink className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                      )}
                    </div>
                    {certUrlError && (
                      <p className="text-xs text-red-500">{certUrlError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Link to your certificate document or verification page
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Button 
                      onClick={addCertification} 
                      variant="default" 
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={!!certUrlError}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Certification
                    </Button>
                  </div>
                </div>

                {portfolio.certifications.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Your Certifications</h4>
                    {portfolio.certifications.map((cert, index) => (
                      <div key={index} className="group flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <GraduationCap className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{cert.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {cert.issuer} {cert.year && `• ${cert.year}`}
                          </p>
                          {cert.certificateUrl && isValidUrl(cert.certificateUrl) && (
                            <a 
                              href={cert.certificateUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                            >
                              View Certificate 
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCertification(index)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="border-primary/10 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-600" />
                  Achievements & Awards
                </CardTitle>
                <CardDescription>Highlight your professional accomplishments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border border-dashed border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="ach-title" className="text-sm">Achievement Title *</Label>
                    <Input
                      id="ach-title"
                      placeholder="e.g., Tax Consultant of the Year"
                      value={newAchievement.title}
                      onChange={(e) => setNewAchievement(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ach-year" className="text-sm">Year</Label>
                    <Input
                      id="ach-year"
                      type="number"
                      placeholder="2023"
                      value={newAchievement.year}
                      onChange={(e) => setNewAchievement(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                      className="bg-background"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="ach-desc" className="text-sm">Description</Label>
                    <Textarea
                      id="ach-desc"
                      placeholder="Describe this achievement..."
                      value={newAchievement.description}
                      onChange={(e) => setNewAchievement(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="bg-background resize-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button 
                      onClick={addAchievement} 
                      variant="default" 
                      size="sm"
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Achievement
                    </Button>
                  </div>
                </div>

                {portfolio.achievements.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">Your Achievements</h4>
                    {portfolio.achievements.map((ach, index) => (
                      <div key={index} className="group flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                          <Trophy className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{ach.title}</p>
                          {ach.description && (
                            <p className="text-sm text-muted-foreground mt-1">{ach.description}</p>
                          )}
                          {ach.year && (
                            <p className="text-xs text-muted-foreground mt-2 font-medium">
                              {ach.year}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAchievement(index)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

             <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 shadow-2xl"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Portfolio
              </>
            )}
          </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

