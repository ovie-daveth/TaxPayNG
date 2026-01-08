"use client"

import type React from "react"
import { cloneElement, isValidElement, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, BarChart3, Calculator, FileText, Bell, CheckCircle2, Loader2, Sparkles, Shield, TrendingUp, Clock, Users, Zap, Award, DollarSign, ScanLine, FolderArchive, CreditCard, Layers, Receipt, FileCheck, Smartphone, Building2, LogIn } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "sonner"
import { db } from "@/firebase/firebase"
import { collection, addDoc, query, where, getDocs, setDoc, doc } from "firebase/firestore"
import { useEffect } from "react"
import Footer from "@/components/footer"
import { SiteHeader } from "@/components/site-header"
import { useRouter } from "next/navigation"
import { sendWaitlistVerification } from "@/lib/utils/emailVerification"
import { TokenInputDialog } from "@/components/waitlist/token-input-dialog"

export default function HomePage() {
  const { user, logout, loading } = useAuth()
  const router = useRouter()

  const [waitlistData, setWaitlistData] = useState({
    name: "",
    email: "",
    phone: "",
    userType: "",
    platformExpectations: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [pendingEmail, setPendingEmail] = useState("")

  const isSmeSelection = waitlistData.userType === "sme"
  const waitlistNameLabel = isSmeSelection ? "Business Name" : "Full Name"
  const waitlistEmailLabel = isSmeSelection ? "Business Email" : "Email Address"
  const waitlistNamePlaceholder = isSmeSelection ? "Enter your business name" : "Enter your full name"
  const waitlistEmailPlaceholder = isSmeSelection ? "business@example.com" : "you@example.com"

  // Check for verification status in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verified = params.get('verified')
    const email = params.get('email')
    
    if (verified === 'true') {
      toast.success(`✅ Email verified! ${email ? `Welcome ${email}` : 'You\'re now on the waitlist!'}`)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('error')) {
      const error = params.get('error')
      let errorMessage = 'Verification failed'
      if (error === 'invalid_token') errorMessage = 'Invalid verification link'
      else if (error === 'token_expired') errorMessage = 'Verification link expired. Please sign up again.'
      else if (error === 'not_found') errorMessage = 'Email not found in waitlist'
      toast.error(errorMessage)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      toast.success('Logged out successfully!')
      router.push('/')
    } else {
      toast.error(result.error || 'Failed to log out')
    }
  }


  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate inputs (name and email are required, phone is optional)
      if (!waitlistData.name || !waitlistData.email) {
        toast.error("Please fill in your name and email")
        setIsSubmitting(false)
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(waitlistData.email)) {
        toast.error("Please enter a valid email address")
        setIsSubmitting(false)
        return
      }

      // Validate phone format only if provided (Nigerian phone numbers)
      if (waitlistData.phone && waitlistData.phone.trim() !== "") {
        const phoneRegex = /^(\+234|0)?[789][01]\d{8}$/
        if (!phoneRegex.test(waitlistData.phone.replace(/\s/g, ""))) {
          toast.error("Please enter a valid Nigerian phone number")
          setIsSubmitting(false)
          return
        }
      }

      if (!waitlistData.userType) {
        toast.error("Please tell us whether you're a freelancer, creator, or SME")
        setIsSubmitting(false)
        return
      }

      // Send verification token via email
      const verificationToast = toast.loading("Sending verification code...")
      const verificationResult = await sendWaitlistVerification(
        waitlistData.email.trim(),
        waitlistData.name.trim(),
        waitlistData.phone,
        waitlistData.userType,
        waitlistData.platformExpectations.trim()
      )
      
      toast.dismiss(verificationToast)

      if (!verificationResult.success) {
        toast.error(verificationResult.error || "Failed to send verification code")
        setIsSubmitting(false)
        return
      }

      // Show token input dialog
      setPendingEmail(verificationResult.email || waitlistData.email.trim())
      setShowTokenDialog(true)
      setIsSubmitting(false)
    } catch (error) {
      console.error("Error submitting waitlist:", error)
      toast.error("Oops! Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader
        logoHref="/"
        navItems={[
          { label: "Features", href: "#features" },
          { label: "Pricing", href: "/pricing" },
          { label: "Blog", href: "/blog" },
          { label: "FAQ", href: "/faq" },
        ]}
        cta={{
          href: "/signup",
          label: "Start Free Trial",
          mobileLabel: "Start",
          showOnMobile: false,
        }}
        secondaryCta={{
          href: "/login",
          label: "Log In",
          mobileLabel: "Log In",
          showOnMobile: false,
          variant: "outline",
        }}
      />

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-[200px] py-12 sm:py-16 md:py-20 lg:py-28 xl:py-32 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-blue-50/50 dark:from-green-950/20 dark:via-transparent dark:to-blue-950/20 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 border border-primary/20 rounded-full mb-6 sm:mb-8 animate-in fade-in slide-in-from-top duration-700 animate-blink-shimmer relative">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary relative z-10" />
            <span className="text-xs sm:text-sm font-medium text-primary relative z-10 px-1">
              The Future of Tax Management in Nigeria
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-balance mb-4 sm:mb-6 px-2 animate-in fade-in slide-in-from-bottom duration-1000">
            Don't Lose Sleep Over
            <span className="bg-gradient-to-r from-green-600 via-green-700 to-green-600 bg-clip-text text-transparent animate-gradient block sm:inline"> Tax Compliance</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground text-balance mb-4 sm:mb-6 max-w-3xl mx-auto leading-relaxed px-4 animate-in fade-in slide-in-from-bottom duration-1200">
            OTax helps Nigerian freelancers and small businesses effortlessly manage their taxes, 
            track expenses, and stay compliant with IRS & NRS regulations—all in one intelligent platform.
          </p>
          <p className="text-sm sm:text-base text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto px-4 animate-in fade-in slide-in-from-bottom duration-1400">
            Join other professionals who've simplified their tax journey and saved hundreds of hours each year
          </p>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 px-4 animate-in fade-in slide-in-from-bottom duration-1600">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 group animate-button-shimmer relative">
                <span className="relative z-10">Start Free Trial</span>
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform relative z-10" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 border-2 border-gray-200 bg-transparent hover:bg-primary-foreground/10">
                <span className="relative z-10">Login</span>
                <LogIn className="ml-2 w-4 h-4 sm:w-5 sm:h-5 transition-transform relative z-10" />
              </Button>
            </Link>
          </div>

          {/* Social Proof */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8 text-xs sm:text-sm text-muted-foreground animate-in fade-in duration-1800 px-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <span>30-Day Money Back</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <span>IRS & NRS Compliant</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <span className="hidden sm:inline">Based on the latest NRS regulations</span>
              <span className="sm:hidden">Latest NRS regulations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Everything You Need in One Platform
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Built specifically for the Nigerian tax landscape. Simple, powerful, and fully compliant.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16">
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8" />}
              title="Income & Expense Tracking"
              description="Track unlimited transactions with automatic categorization. Monitor income streams, expenses, and maintain a complete financial picture—perfect for freelancers, creators, and businesses."
              delay="0"
            />
            <FeatureCard
              icon={<Calculator className="w-8 h-8" />}
              title="Tax Calculator with Reliefs"
              description="Calculate taxes, deductions, allowances, and reliefs based on Nigeria Tax Act 2025. Includes Rent Relief Allowance (up to 20% of annual rent, capped at ₦500,000) and automatic exemption for earnings ≤ ₦800,000/year."
              delay="100"
            />
            <FeatureCard
              icon={<FileCheck className="w-8 h-8" />}
              title="IRS/NRS Filing Reports"
              description="Generate filing-ready self-assessment forms, income statements, and compliance reports. Export PDF reports formatted for FIRS/NRS submission requirements."
              delay="200"
            />
            <FeatureCard
              icon={<ScanLine className="w-8 h-8" />}
              title="Receipt Scanning & OCR"
              description="Take a photo of receipts and let our OCR technology automatically extract details. Automatically categorizes expenses and updates your tax calculations in real-time."
              delay="300"
            />
            <FeatureCard
              icon={<Bell className="w-8 h-8" />}
              title="SMS & Email Reminders"
              description="Never miss a filing deadline. Get personalized reminders via SMS and email for payments, submissions, and renewals. Customize reminder frequency to stay ahead."
              delay="400"
            />
            <FeatureCard
              icon={<FolderArchive className="w-8 h-8" />}
              title="Secure Document Storage"
              description="Store receipts, invoices, tax documents, and compliance files securely. Plans include 500MB to 50GB storage with bank-level encryption and easy organization."
              delay="500"
            />
            <FeatureCard
              icon={<Layers className="w-8 h-8" />}
              title="Multi-Platform Income Tracking"
              description="Perfect for content creators! Track income from multiple platforms (YouTube, Instagram, TikTok, sponsorships) separately and get consolidated tax reports."
              delay="600"
            />
            <FeatureCard
              icon={<CreditCard className="w-8 h-8" />}
              title="Integrated Tax Payments"
              description="Generate Remita Retrieval Reference (RRR) directly from the platform. Pay taxes seamlessly through integrated payment gateways with instant receipts."
              delay="700"
            />
            <FeatureCard
              icon={<Receipt className="w-8 h-8" />}
              title="Invoice Management"
              description="Create, track, and manage invoices effortlessly. Simple invoice management for freelancers and advanced features for businesses managing multiple clients."
              delay="800"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Multi-User Collaboration"
              description="Team up with accountants, partners, or employees. Plans support 3-10 users with role-based access control for secure collaboration."
              delay="900"
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Advanced Analytics & Insights"
              description="Get deep insights into your financial health with advanced analytics. Track trends, identify opportunities for tax savings, and make data-driven decisions."
              delay="1000"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="100% FIRS & NRS Compliant"
              description="Built to align with all Nigerian tax regulations including NTA 2025. Rest assured your filings meet official requirements and standards—never worry about compliance."
              delay="1100"
            />
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mt-12 sm:mt-16 md:mt-20">
            {/* <StatItem 
              icon={<Users className="w-6 h-6" />}
              number="500+"
              label="Active Users on the Waitlist"
              color="text-blue-600"
              delay="0s"
            /> */}
            <StatItem 
              icon={<TrendingUp className="w-6 h-6" />}
              number="100%"
              label="Compliant with NRS & FIRS"
              color="text-green-600"
              delay="0.5s"
            />
            <StatItem 
              icon={<TrendingUp className="w-6 h-6" />}
              number="98%"
              label="Accuracy Rate"
              color="text-green-600"
              delay="0.5s"
            />
            <StatItem 
              icon={<Clock className="w-6 h-6" />}
              number="95%"
              label="Time Saved"
              color="text-orange-600"
              delay="1s"
            />
            <StatItem 
              icon={<Award className="w-6 h-6" />}
              number="4.9/5"
              label="User Rating"
              color="text-purple-600"
              delay="1.5s"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24 bg-gradient-to-br from-primary/5 via-transparent to-primary/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
              Why Choose <span className="text-primary">OTax?</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Join thousands of Nigerian creators, freelancers and businesses transforming their tax management experience
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16 md:mb-20">
            <BenefitCard
              icon={<DollarSign className="w-8 h-8" />}
              title="Save Money"
              description="Maximize deductions and reliefs you're entitled to. Our intelligent system ensures you never overpay on taxes."
              delay="0"
            />
            <BenefitCard
              icon={<Clock className="w-8 h-8" />}
              title="Save Time"
              description="Reduce hours of paperwork to minutes. Automated tracking, calculations, and report generation."
              delay="100"
            />
            <BenefitCard
              icon={<Shield className="w-8 h-8" />}
              title="Stay Compliant"
              description="Built-in compliance checks keep you aligned the latest Nigerian tax regulations (2026). Sleep better knowing you're covered."
              delay="200"
            />
          </div>

          {/* Testimonial Section */}
          <div className="bg-card border-2 border-primary/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-foreground mb-4 sm:mb-6 italic">
                "Going through the process of getting my tax calculations was a breeze. OTax did all the heavy lifting for me. Just going through the Demo was enough to convince me to join the waitlist."
                </p>
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-4">
                  <div className="text-center sm:text-left">
                    <p className="font-semibold text-base sm:text-lg">Daniel Becon</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Freelance Software Developer, Lagos</p>
                  </div>
                  <div className="flex gap-1 text-yellow-500">
                    {"⭐⭐⭐⭐⭐".split("").map((star, i) => (
                      <span key={i} className="text-lg sm:text-xl md:text-2xl">{star}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section id="waitlist" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full mb-4 sm:mb-6 duration-700 animate-blink-shimmer relative">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">
                Limited Early Access
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 px-4">
              Join Our <span className="text-primary">Exclusive Waitlist</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-3 sm:mb-4 px-4">
              Affordable tax management for every freelancer, creator, and small business — early users enjoy exclusive launch discounts.
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground px-4">
              Get early access, lifetime discounts, and priority support
            </p>
          </div>

          {isSubmitted ? (
            <div className="bg-card border-2 border-green-200 dark:border-green-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center shadow-lg">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">You're in!</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                Thank you for joining our waitlist. We'll notify you as soon as we launch!
              </p>
              <Button 
                onClick={() => {
                  setIsSubmitted(false)
                  setWaitlistData({ name: "", email: "", phone: "", userType: "", platformExpectations: "" })
                }}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Join Another Email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-4">
              <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="waitlist-user-type" className="text-sm font-medium">
                      I am a
                    </Label>
                    <Select
                      value={waitlistData.userType}
                      onValueChange={(value) => setWaitlistData(prev => ({ ...prev, userType: value }))}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="waitlist-user-type" className="h-11 sm:h-12 text-sm sm:text-base">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freelancer">Freelancer</SelectItem>
                        <SelectItem value="creator">Creator</SelectItem>
                        <SelectItem value="sme">SME</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="waitlist-name" className="text-sm font-medium">
                      {waitlistNameLabel}
                    </Label>
                    <Input
                      type="text"
                      name="name"
                      id="waitlist-name"
                      placeholder={waitlistNamePlaceholder}
                      value={waitlistData.name}
                      onChange={(e) => setWaitlistData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="h-11 sm:h-12 text-sm sm:text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="waitlist-email" className="text-sm font-medium">
                      {waitlistEmailLabel}
                    </Label>
                    <Input
                      type="email"
                      name="email"
                      id="waitlist-email"
                      placeholder={waitlistEmailPlaceholder}
                      value={waitlistData.email}
                      onChange={(e) => setWaitlistData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="h-11 sm:h-12 text-sm sm:text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="waitlist-phone" className="text-sm font-medium">
                      Phone Number <span className="text-xs text-muted-foreground">(Optional)</span>
                    </Label>
                    <Input
                      type="tel"
                      name="phone"
                      id="waitlist-phone"
                      placeholder="Phone Number"
                      value={waitlistData.phone}
                      onChange={(e) => setWaitlistData(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-11 sm:h-12 text-sm sm:text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="waitlist-platform-expectations" className="text-sm font-medium">
                      What would you like to see on this platform? <span className="text-xs text-muted-foreground">(Optional)</span>
                    </Label>
                    <Textarea
                      id="waitlist-platform-expectations"
                      name="platformExpectations"
                      placeholder="Share any features or experiences you'd love from OTax"
                      value={waitlistData.platformExpectations}
                      onChange={(e) => setWaitlistData(prev => ({ ...prev, platformExpectations: e.target.value }))}
                      className="min-h-[100px] text-sm sm:text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center -mt-1 sm:-mt-2 px-2">
                    🔒 We respect your privacy. We'll never spam your email or phone number. 
                    We'll only contact you when we launch or have important updates.
                  </p>
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-11 sm:h-12 text-sm sm:text-base animate-button-shimmer relative"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin relative z-10" />
                        <span className="relative z-10">Joining Waitlist...</span>
                      </>
                    ) : (
                      <>
                        <span className="relative z-10">Join Waitlist</span>
                        <ArrowRight className="ml-2 w-4 h-4 relative z-10" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="max-w-5xl mx-auto relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-2xl sm:rounded-3xl blur-3xl" />
          
          <div className="relative bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 text-center shadow-2xl border border-primary/50">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-2">
                Ready to Transform Your Tax Experience?
              </h2>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 md:mb-10 opacity-95 leading-relaxed px-2">
                Join thousands of Nigerian freelancers and SMEs who've made tax compliance effortless. 
                Start your free trial today—no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 group animate-button-shimmer relative">
                    <span className="relative z-10">Start Free Trial</span>
                    <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform relative z-10" />
                  </Button>
                </Link>
                <Link href="/tax-calculator" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 border-2 border-primary-foreground/20 bg-transparent hover:bg-primary-foreground/10">
                    Calculate taxes
                    <Calculator className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform relative z-10" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Token Input Dialog */}
      <TokenInputDialog
        open={showTokenDialog}
        onOpenChange={setShowTokenDialog}
        email={pendingEmail}
        onVerified={() => {
          setIsSubmitted(true)
          setWaitlistData({ name: "", email: "", phone: "", userType: "", platformExpectations: "" })
          setShowTokenDialog(false)
        }}
      />
    </div>
  )
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode; title: string; description: string; delay: string }) {
  // Clone icon with responsive sizing
  const responsiveIcon = isValidElement(icon)
    ? cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className: `w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${(icon as React.ReactElement<{ className?: string }>).props?.className || ''}`
      })
    : icon

  return (
    <div 
      className="bg-card border border-border rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-5 md:mb-6 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
        {responsiveIcon}
      </div>
      <h3 className="font-bold text-lg sm:text-xl mb-2 sm:mb-3">{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function StatItem({ icon, number, label, color, delay }: { icon: React.ReactNode; number: string; label: string; color: string; delay?: string }) {
  return (
    <div 
      className="text-center p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl hover:shadow-lg transition-shadow animate-stat-shimmer relative"
      style={{ '--shimmer-delay': delay || '0s' } as React.CSSProperties}
    >
      <div className={`flex items-center justify-center mb-2 sm:mb-3 ${color} relative z-10 stat-shine-icon`}>
        {icon}
      </div>
      <div className="relative z-10 mb-1 sm:mb-2">
        <div 
          className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent stat-shine-text"
          style={{ '--shimmer-delay': delay || '0s' } as React.CSSProperties}
        >
          {number}
        </div>
      </div>
      <div className="relative z-10">
        <div 
          className="text-xs sm:text-sm font-medium text-muted-foreground stat-shine-text px-1"
          style={{ '--shimmer-delay': delay || '0s' } as React.CSSProperties}
        >
          {label}
        </div>
      </div>
    </div>
  )
}

function BenefitCard({ icon, title, description, delay }: { icon: React.ReactNode; title: string; description: string; delay: string }) {
  return (
    <div 
      className="text-center p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl hover:shadow-xl transition-all duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-5 md:mb-6 text-primary">
        {icon}
      </div>
      <h3 className="font-bold text-xl sm:text-2xl mb-3 sm:mb-4">{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
