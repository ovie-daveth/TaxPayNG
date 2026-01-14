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
import { Loader2, Plus, X, Trash2, Save, Award, MapPin, Users, Star, Upload } from "lucide-react"
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
    clientCount: 0,
    successRate: 0,
    portfolioImages: [] as string[]
  })

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

  useEffect(() => {
    if (authLoading || profileLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (profile?.businessType !== 'consultant') {
      router.push('/dashboard')
      return
    }

    // Load existing portfolio
    if (profile?.consultantPortfolio) {
      setPortfolio({
        bio: profile.consultantPortfolio.bio || "",
        experience: profile.consultantPortfolio.experience || "",
        specializations: profile.consultantPortfolio.specializations || [],
        location: profile.consultantPortfolio.location || "",
        languages: profile.consultantPortfolio.languages || [],
        certifications: profile.consultantPortfolio.certifications || [],
        achievements: profile.consultantPortfolio.achievements || [],
        clientCount: profile.consultantPortfolio.clientCount || 0,
        successRate: profile.consultantPortfolio.successRate || 0,
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

  const addCertification = () => {
    if (!newCertification.name || !newCertification.issuer) {
      toast.error("Please fill in certification name and issuer")
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
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || profile?.businessType !== 'consultant') {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Manage Portfolio</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Update your professional portfolio to attract clients in the marketplace
          </p>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Tell clients about yourself and your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Write a brief professional bio describing your expertise and experience..."
                  value={portfolio.bio}
                  onChange={(e) => setPortfolio(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="experience">Experience</Label>
                <Input
                  id="experience"
                  placeholder="e.g., 10 years of experience in tax consulting"
                  value={portfolio.experience}
                  onChange={(e) => setPortfolio(prev => ({ ...prev, experience: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Lagos, Nigeria"
                  value={portfolio.location}
                  onChange={(e) => setPortfolio(prev => ({ ...prev, location: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Specializations */}
          <Card>
            <CardHeader>
              <CardTitle>Specializations</CardTitle>
              <CardDescription>Select your areas of expertise</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map((spec) => (
                  <Badge
                    key={spec}
                    variant={portfolio.specializations.includes(spec) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSpecialization(spec)}
                  >
                    {spec}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Languages */}
          <Card>
            <CardHeader>
              <CardTitle>Languages</CardTitle>
              <CardDescription>Languages you can communicate in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <Badge
                    key={lang}
                    variant={portfolio.languages.includes(lang) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleLanguage(lang)}
                  >
                    {lang}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader>
              <CardTitle>Certifications</CardTitle>
              <CardDescription>Add your professional certifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cert-name">Certification Name</Label>
                  <Input
                    id="cert-name"
                    placeholder="e.g., ICAN, ACCA"
                    value={newCertification.name}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cert-issuer">Issuer</Label>
                  <Input
                    id="cert-issuer"
                    placeholder="e.g., Institute of Chartered Accountants"
                    value={newCertification.issuer}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, issuer: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cert-year">Year</Label>
                  <Input
                    id="cert-year"
                    type="number"
                    placeholder="2020"
                    value={newCertification.year}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cert-url">Certificate URL (optional)</Label>
                  <Input
                    id="cert-url"
                    type="url"
                    placeholder="https://..."
                    value={newCertification.certificateUrl}
                    onChange={(e) => setNewCertification(prev => ({ ...prev, certificateUrl: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button onClick={addCertification} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Certification
              </Button>

              {portfolio.certifications.length > 0 && (
                <div className="space-y-2 mt-4">
                  {portfolio.certifications.map((cert, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{cert.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {cert.issuer} {cert.year && `• ${cert.year}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCertification(index)}
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
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
              <CardDescription>Highlight your professional achievements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ach-title">Achievement Title</Label>
                  <Input
                    id="ach-title"
                    placeholder="e.g., Awarded Best Tax Consultant 2023"
                    value={newAchievement.title}
                    onChange={(e) => setNewAchievement(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ach-year">Year</Label>
                  <Input
                    id="ach-year"
                    type="number"
                    placeholder="2023"
                    value={newAchievement.year}
                    onChange={(e) => setNewAchievement(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="ach-desc">Description (optional)</Label>
                  <Textarea
                    id="ach-desc"
                    placeholder="Describe this achievement..."
                    value={newAchievement.description}
                    onChange={(e) => setNewAchievement(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button onClick={addAchievement} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Achievement
              </Button>

              {portfolio.achievements.length > 0 && (
                <div className="space-y-2 mt-4">
                  {portfolio.achievements.map((ach, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{ach.title}</p>
                        {ach.description && (
                          <p className="text-sm text-muted-foreground">{ach.description}</p>
                        )}
                        {ach.year && (
                          <p className="text-xs text-muted-foreground mt-1">{ach.year}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAchievement(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Update your professional statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client-count">Client Count</Label>
                  <Input
                    id="client-count"
                    type="number"
                    placeholder="0"
                    value={portfolio.clientCount}
                    onChange={(e) => setPortfolio(prev => ({ ...prev, clientCount: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="success-rate">Success Rate (%)</Label>
                  <Input
                    id="success-rate"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={portfolio.successRate}
                    onChange={(e) => setPortfolio(prev => ({ ...prev, successRate: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
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

