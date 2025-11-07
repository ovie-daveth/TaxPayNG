"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, CheckCircle2, Calculator, Loader2 } from "lucide-react"
import OtaxLogo from "@/components/OtaxLogo"
import Footer from "@/components/footer"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { TokenInputDialog } from "@/components/waitlist/token-input-dialog"
import { sendWaitlistVerification } from "@/lib/utils/emailVerification"

export default function PricingPage() {
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [waitlistForm, setWaitlistForm] = useState({
    name: "",
    email: "",
    phone: "",
  })
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false)
  const [isWaitlistSubmitted, setIsWaitlistSubmitted] = useState(false)
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [pendingEmail, setPendingEmail] = useState("")

  const handleOpenWaitlist = (plan: string) => {
    setSelectedPlan(plan)
    setShowWaitlistModal(true)
  }

  const handleWaitlistModalChange = (open: boolean) => {
    setShowWaitlistModal(open)
    if (!open) {
      setIsWaitlistSubmitted(false)
      setIsSubmittingWaitlist(false)
      setWaitlistForm({ name: "", email: "", phone: "" })
      setSelectedPlan(null)
    }
  }

  const handleWaitlistSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmittingWaitlist(true)

    try {
      if (!waitlistForm.name || !waitlistForm.email) {
        toast.error("Please provide your name and email")
        setIsSubmittingWaitlist(false)
        return
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(waitlistForm.email.trim())) {
        toast.error("Please enter a valid email address")
        setIsSubmittingWaitlist(false)
        return
      }

      if (waitlistForm.phone && waitlistForm.phone.trim() !== "") {
        const phoneRegex = /^(\+234|0)?[789][01]\d{8}$/
        if (!phoneRegex.test(waitlistForm.phone.replace(/\s/g, ""))) {
          toast.error("Please enter a valid Nigerian phone number")
          setIsSubmittingWaitlist(false)
          return
        }
      }

      const toastId = toast.loading("Sending verification code...")
      const verificationResult = await sendWaitlistVerification(
        waitlistForm.email.trim(),
        waitlistForm.name.trim(),
        waitlistForm.phone.trim() || undefined
      )
      toast.dismiss(toastId)

      if (!verificationResult.success) {
        toast.error(verificationResult.error || "Failed to send verification code")
        setIsSubmittingWaitlist(false)
        return
      }

      toast.success("Verification code sent! Please check your email.")
      setPendingEmail(verificationResult.email || waitlistForm.email.trim())
      setShowTokenDialog(true)
    } catch (error) {
      console.error("Waitlist submission error:", error)
      toast.error("Oops! Something went wrong. Please try again.")
    } finally {
      setIsSubmittingWaitlist(false)
    }
  }

  const handleVerified = () => {
    setIsWaitlistSubmitted(true)
    setPendingEmail("")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <OtaxLogo />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-foreground">
              Pricing
            </Link>
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a href="/#waitlist">
              <Button size="lg" className="">
                <span className="relative z-10">Join the Waitlist</span>
              </Button>
            </a>
            {/* <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link> */}
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your business needs. All plans include a 30-day free trial.
            </p>
          </div>

          {/* Toggle between Individuals and SMEs */}
          <div className="flex justify-center mb-12">
            <Tabs defaultValue="individuals" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-20">
                <TabsTrigger className="cursor-pointer" value="individuals">Individuals</TabsTrigger>
                <TabsTrigger className="cursor-pointer" value="smes">SMEs</TabsTrigger>
              </TabsList>

              {/* Individuals Pricing */}
              <TabsContent value="individuals" className="mt-8">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                  {/* PRO Plan - Freelancers */}
            <Card className="relative flex flex-col">
              <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-2xl">PRO</CardTitle>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full font-medium">
                          Freelancers
                        </span>
                      </div>
                      <CardDescription>
                        Perfect for tech freelancers, VAs, copywriters, and independent professionals
                      </CardDescription>
                <div className="mt-4 space-y-1">
                  <span className="text-sm font-medium text-muted-foreground line-through">₦5,000</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">₦2,500</span>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-1 text-xs font-semibold">
                      50% OFF
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">per month (launch discount)</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <PricingFeature>Track up to 100 transactions/month</PricingFeature>
                  <PricingFeature>Income & expense tracking</PricingFeature>
                  <PricingFeature>Tax calculator with reliefs</PricingFeature>
                  <PricingFeature>Basic reports generation</PricingFeature>
                  <PricingFeature>Document storage (500MB)</PricingFeature>
                  <PricingFeature>Email reminders</PricingFeature>
                  <PricingFeature>Email support</PricingFeature>
                  <PricingFeature>Simple invoice management</PricingFeature>
                  <PricingFeature>Easy payment of tax directly using various government approved methods (e.g., Remita and Paystack)</PricingFeature>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  className="w-full bg-transparent hover:bg-muted hover:text-foreground transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  variant="outline"
                  onClick={() => handleOpenWaitlist("PRO")}
                >
                  Start Free Trial
                </Button>
              </CardFooter>
            </Card>

                  {/* GOLD Plan - Content Creators */}
            <Card className="relative flex flex-col border-primary shadow-lg scale-105">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-2xl">GOLD</CardTitle>
                        <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full font-medium">
                          Creators
                        </span>
                      </div>
                      <CardDescription>
                        Ideal for content creators, influencers, and digital creators managing multiple income streams
                      </CardDescription>
                      <div className="mt-4">
                        <div className="mt-4 space-y-1">
                          <span className="text-sm font-medium text-muted-foreground line-through">₦12,000</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold">₦6,000</span>
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-1 text-xs font-semibold">
                              50% OFF
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">per month (launch discount)</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-3">
                        <PricingFeature>Unlimited transactions</PricingFeature>
                        <PricingFeature>All PRO features</PricingFeature>
                        <PricingFeature>Multi-platform income tracking</PricingFeature>
                        <PricingFeature>Sponsorship & brand deal management</PricingFeature>
                        <PricingFeature>Advanced tax calculations</PricingFeature>
                        <PricingFeature>Document storage (2GB)</PricingFeature>
                        <PricingFeature>Receipt scanning & OCR</PricingFeature>
                        <PricingFeature>SMS & email reminders</PricingFeature>
                        <PricingFeature>Priority support</PricingFeature>
                        <PricingFeature>Expense categorization</PricingFeature>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button
                        type="button"
                        className="w-full hover:bg-primary/90 hover:scale-105 transition-all duration-200 hover:shadow-lg"
                        onClick={() => handleOpenWaitlist("GOLD")}
                      >
                        Start Free Trial
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* PLATINUM Plan - Complex Content Creators */}
                  <Card className="relative flex flex-col">
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-2xl">PLATINUM</CardTitle>
                        <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full font-medium">
                          Advanced Creators
                        </span>
                      </div>
                      <CardDescription>
                        For established creators with complex tax situations, multiple businesses, and team collaborations
                      </CardDescription>
                      <div className="mt-4">
                        <div className="mt-4 space-y-1">
                          <span className="text-sm font-medium text-muted-foreground line-through">₦25,000</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold">₦12,500</span>
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-1 text-xs font-semibold">
                              50% OFF
                            </Badge>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">per month (launch discount)</span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-3">
                        <PricingFeature>Everything in GOLD</PricingFeature>
                        <PricingFeature>Multi-entity business management</PricingFeature>
                        <PricingFeature comingSoon>Advanced analytics & insights</PricingFeature>
                        <PricingFeature>IRS/NRS filing reports</PricingFeature>
                        <PricingFeature>Document storage (10GB)</PricingFeature>
                        <PricingFeature>Custom report templates</PricingFeature>
                        <PricingFeature comingSoon>Team collaboration (up to 3 users)</PricingFeature>
                        <PricingFeature>Dedicated tax advisor consultation</PricingFeature>
                        <PricingFeature>Quarterly tax planning sessions</PricingFeature>
                        <PricingFeature>24/7 priority support</PricingFeature>
                        <PricingFeature comingSoon>API access for integrations</PricingFeature>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button
                        type="button"
                        className="w-full bg-transparent hover:bg-muted hover:text-foreground transition-all duration-200 hover:scale-105 hover:shadow-lg"
                        variant="outline"
                        onClick={() => handleOpenWaitlist("PLATINUM")}
                      >
                        Start Free Trial
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </TabsContent>

              {/* SMEs Pricing */}
              <TabsContent value="smes" className="mt-8">
                <div className="mb-8 p-6 bg-muted/50 rounded-lg border border-border max-w-4xl mx-auto">
                  <h3 className="text-lg font-semibold mb-3">Understanding Small vs Big Business Classification</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Under the Nigeria Tax Act (NTA) 2025, businesses are classified based on specific criteria. Choose the plan that matches your business classification:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="font-medium">✅ Small Business Qualifies If:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                        <li>Annual turnover ≤ ₦50-100 million</li>
                        <li>Fixed assets ≤ ₦250 million</li>
                        <li>Not providing professional services</li>
                        <li>May qualify for tax exemptions</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="font-medium">⚠️ Big Business Applies If:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                        <li>Turnover exceeds small business threshold</li>
                        <li>Fixed assets exceed ₦250 million</li>
                        <li>Provides professional services</li>
                        <li>Subject to full tax regime</li>
                      </ul>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 italic">
                    Note: Exact turnover thresholds may vary. Consult the latest NTA regulations or a tax professional for your specific situation.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {/* Small Business Plan */}
                  <Card className="relative flex flex-col border-primary shadow-lg">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Small Business</CardTitle>
                      <CardDescription className="space-y-2">
                        <p>For businesses with annual turnover ≤ ₦50-100 million and fixed assets ≤ ₦250 million (excluding professional services).</p>
                        <p className="text-xs font-medium text-primary">May qualify for tax exemptions under NTA 2025</p>
                      </CardDescription>
                <div className="mt-4 space-y-1">
                  <span className="text-sm font-medium text-muted-foreground line-through">₦25,000</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">₦12,500</span>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-1 text-xs font-semibold">
                      50% OFF
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">per month (launch discount)</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <PricingFeature>Unlimited transactions</PricingFeature>
                  <PricingFeature>Advanced tax calculations</PricingFeature>
                        <PricingFeature>Small business tax exemption tracking</PricingFeature>
                  <PricingFeature>IRS/NRS filing reports</PricingFeature>
                  <PricingFeature>Document storage (5GB)</PricingFeature>
                  <PricingFeature>Receipt scanning & OCR</PricingFeature>
                  <PricingFeature>SMS & email reminders</PricingFeature>
                        <PricingFeature comingSoon>Multi-user access (up to 3 users)</PricingFeature>
                        <PricingFeature>Basic analytics & insights</PricingFeature>
                  <PricingFeature>Priority support</PricingFeature>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  className="w-full hover:bg-primary/90 hover:scale-105 transition-all duration-200 hover:shadow-lg"
                  onClick={() => handleOpenWaitlist("Small Business")}
                >
                  Start Free Trial
                </Button>
              </CardFooter>
            </Card>

            {/* Big Business Plan */}
                  <Card className="relative flex flex-col opacity-60 grayscale">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 dark:bg-orange-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Coming Soon
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Big Business</CardTitle>
                      <CardDescription className="space-y-2">
                        <p>For businesses with turnover above small business threshold, fixed assets exceeding ₦250 million, or providing professional services.</p>
                        <p className="text-xs font-medium text-muted-foreground">Subject to full corporate tax regime</p>
                      </CardDescription>
                <div className="mt-4 space-y-1">
                        <span className="text-sm font-medium text-muted-foreground line-through">₦75,000</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold">₦37,500</span>
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-1 text-xs font-semibold">
                            50% OFF
                          </Badge>
                        </div>
                  <span className="text-sm text-muted-foreground">per month (launch discount)</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <PricingFeature>Everything in Small Business</PricingFeature>
                        <PricingFeature>Full corporate tax compliance</PricingFeature>
                        <PricingFeature comingSoon>Multi-user access (up to 10 users)</PricingFeature>
                  <PricingFeature comingSoon>Advanced analytics & insights</PricingFeature>
                  <PricingFeature>Custom report templates</PricingFeature>
                  <PricingFeature>Document storage (50GB)</PricingFeature>
                  <PricingFeature comingSoon>API access</PricingFeature>
                  <PricingFeature>Dedicated account manager</PricingFeature>
                  <PricingFeature>24/7 priority support</PricingFeature>
                        <PricingFeature comingSoon>White-label options</PricingFeature>
                        <PricingFeature comingSoon>Custom integrations</PricingFeature>
                </ul>
              </CardContent>
              <CardFooter>
                      <Button className="w-full bg-transparent" variant="outline" disabled>
                          Coming Soon
                </Button>
              </CardFooter>
            </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column */}
              <Accordion type="single" collapsible className="w-full">
                {/* General Questions */}
                <AccordionItem value="general-1" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Do you offer a free trial?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! All plans come with a 30-day free trial. No credit card required to start. You can explore all features and see how OTax simplifies your tax management before committing.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="general-2" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Can I change plans later?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges or credits based on your billing cycle.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="general-3" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    What payment methods do you accept?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We accept all major Nigerian payment methods including bank transfers, debit/credit cards, and mobile money. All transactions are processed securely through our payment partners.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="general-4" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Is my financial data secure?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! We use bank-level encryption (SSL/TLS) and security measures to protect your data. Your information is never shared with third parties without your explicit consent. We comply with Nigerian data protection regulations.
                  </AccordionContent>
                </AccordionItem>

                {/* Tax Calculations */}
                <AccordionItem value="calc-1" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    How accurate are your tax calculations?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Our tax calculations are based on the latest Nigeria Tax Act (NTA) 2025 (and associated reform Acts). We regularly update our system to reflect current tax rates, reliefs, and deductions. Our calculations are verified by tax professionals and comply with Nigerian tax laws.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="calc-2" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    What tax reliefs and deductions are automatically applied?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We automatically calculate and apply all eligible reliefs. Under Nigeria's new tax law effective January 1, 2026, individuals earning ₦800,000 or less per year are exempt from personal income tax. The Consolidated Relief Allowance (CRA) has been replaced with a Rent Relief Allowance, allowing up to 20% of annual rent (capped at ₦500,000) as a deductible expense. Pension contributions, National Housing Fund (NHF), and National Health Insurance Scheme (NHIS) contributions remain deductible. Compensation for loss of employment or injury is now exempt from tax up to ₦50 million. Additionally, the law introduces progressive tax bands that ease the burden on low- and middle-income earners while ensuring higher earners contribute more fairly.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="calc-3" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Can I calculate taxes for different income types?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! OTax handles various income types including employment income, business income, freelance income, rental income, investment income, and more. You can track multiple income streams and our system will calculate the appropriate tax for each based on current tax regulations.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="calc-4" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    How does the system handle complex tax scenarios for content creators?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    For content creators and influencers, we handle complex scenarios like multiple income streams (sponsorships, ad revenue, affiliate income), business expenses, equipment depreciation, and international payments. Our GOLD and PLATINUM plans include advanced features for tracking brand deals, platform-specific income, and managing deductions across different revenue sources.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="calc-5" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Can I see a breakdown of how my tax is calculated?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Absolutely! Every tax calculation includes a detailed breakdown showing your total income, allowable deductions, applicable reliefs, taxable income, and the final tax amount. You can export these breakdowns as PDF reports for your records or tax filing.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="calc-6" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    What if I have questions about my tax calculation?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Our support team is available to help explain your tax calculations. PLATINUM plan users get access to dedicated tax advisor consultations where certified professionals can review your calculations and provide personalized tax planning advice.
                  </AccordionContent>
                </AccordionItem>

                {/* Tax Payments */}
                <AccordionItem value="payment-1" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    How do I pay my taxes through OTax?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <p className="mb-3">OTax makes tax payments seamless. You can generate your Remita Retrieval Reference (RRR) directly from the platform, pay through integrated payment gateways, or use our automated payment system. We support all major payment methods and provide instant payment receipts.</p>
                    <p className="text-red-600 dark:text-red-400 font-medium text-sm mt-3 pt-3 border-t border-border">
                      <strong>Important:</strong> We do not hold money. We simply intermediate between you and payment platforms like Remita and Paystack. We take no charge for payment processing—all fees are handled directly by the payment providers.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="payment-2" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Can I automate my tax payments?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <p className="mb-3">Our automated payment system allows you to set up recurring tax payments. You can schedule payments for specific dates, set up payment reminders, and even enable auto-pay for your tax obligations. This ensures you never miss a payment deadline and avoid penalties.</p>
                    <p className="text-orange-600 dark:text-orange-400 font-medium text-sm mt-3 pt-3 border-t border-border">
                      <strong>Note:</strong> This feature is coming soon. For now, you can manually process payments through our payment gateway.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="payment-3" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    How do payment reminders work?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We send automated reminders via email and SMS (depending on your plan) before important tax deadlines. You can customize reminder frequency - we recommend reminders at 30 days, 14 days, 7 days, and 1 day before deadlines. Reminders include your calculated tax amount and direct payment links.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Right Column */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="payment-4" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Can I track my payment history?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes, all tax payments are tracked in your dashboard. You can view payment history, download receipts, see payment status, and generate payment reports. This makes it easy to maintain records for tax filing and audits.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="payment-5" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    What happens if I miss a payment deadline?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Our system sends multiple reminders before deadlines to help you avoid late payments. If you do miss a deadline, we'll help you calculate any penalties and interest, and guide you through the payment process. PLATINUM users get priority support for resolving payment issues.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="payment-6" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Can I pay taxes for multiple periods at once?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! You can select and pay for multiple tax periods simultaneously. Our system calculates the total amount due across all periods and processes the payment accordingly. This is especially useful for catching up on missed payments or planning ahead.
                  </AccordionContent>
                </AccordionItem>

                {/* Automation & Ease of Use */}
                <AccordionItem value="auto-1" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    How does OTax automate tax management?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    OTax automates multiple aspects of tax management: transaction categorization, receipt scanning and OCR, automatic tax calculations, payment reminders, report generation, and document organization. Once you connect your accounts or upload transactions, the system does most of the heavy lifting for you.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="auto-2" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Can I import transactions automatically?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <p className="mb-3">Yes! You can connect your bank accounts (where supported), import CSV files from your bank, or use our mobile app to scan receipts. Our OCR technology automatically extracts transaction details, categorizes expenses, and updates your tax calculations in real-time.</p>
                    <p className="text-orange-600 dark:text-orange-400 font-medium text-sm mt-3 pt-3 border-t border-border">
                      <strong>Note:</strong> Automatic transaction import is coming soon. For now, you can manually add transactions through the dashboard.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="auto-4" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Can the system generate tax reports automatically?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! OTax automatically generates comprehensive tax reports including income statements, expense reports, tax calculations, and filing-ready documents. You can generate reports for any period (monthly, quarterly, annually) with one click. Reports are formatted for FIRS/NRS filing requirements.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="auto-5" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    How does the system help with tax filing?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We generate IRS/NRS filing-ready reports that include all necessary documentation, calculations, and summaries. These reports can be directly submitted to tax authorities or shared with your accountant. PLATINUM users get access to filing assistance and review by tax professionals.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="auto-6" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Can I set up recurring transactions and reminders?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Absolutely! You can set up recurring income and expense transactions, and the system will automatically add them to your records. You can also set custom reminders for tax deadlines, document uploads, or any other important tax-related tasks.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="auto-7" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    How does multi-platform income tracking work for creators?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    For content creators, you can connect multiple income sources (YouTube, Instagram, TikTok, sponsorships, etc.) and track them separately. Our system automatically categorizes income by platform, calculates platform-specific taxes, and provides consolidated reports showing your total taxable income across all platforms.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="auto-8" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Can I integrate with other accounting tools?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <p className="mb-3">PLATINUM and Big Business plans include API access for integrations. You can connect OTax with popular accounting software, payment processors, and business tools. Our API allows for seamless data synchronization and automated workflows.</p>
                    <p className="text-orange-600 dark:text-orange-400 font-medium text-sm mt-3 pt-3 border-t border-border">
                      <strong>Note:</strong> API access and integrations are coming soon. We're working on building our API infrastructure to enable seamless integrations with accounting tools.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                {/* Support & Additional Services */}
                <AccordionItem value="support-1" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    What kind of support do you offer?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    All plans include email support. GOLD and PLATINUM plans include priority support with faster response times. PLATINUM users get 24/7 priority support and access to dedicated tax advisor consultations. SME plans include dedicated account managers for enterprise clients.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support-2" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Do you provide tax advice?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    While we provide automated tax calculations and filing assistance, personalized tax advice is available to PLATINUM plan users through our network of certified tax professionals. We can also connect you with tax advisors for complex situations.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support-3" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    What if I need help setting up my account?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We provide comprehensive onboarding guides, video tutorials, and step-by-step setup assistance. Our support team is available to help you get started, and PLATINUM users receive personalized onboarding sessions with a tax specialist.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support-4" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Can I export my data?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! You can export all your data including transactions, reports, documents, and tax calculations in various formats (PDF, CSV, Excel). This ensures you always have access to your data and can switch platforms if needed.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support-5" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    What happens to my data if I cancel my subscription?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    You can export all your data before canceling. We retain your data for 90 days after cancellation, after which it's permanently deleted. You can reactivate your account within this period to restore all your data.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support-6" className="border border-border rounded-lg px-4 mb-4">
                  <AccordionTrigger className="text-left font-semibold">
                    Do you offer training or workshops?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We regularly host webinars and workshops on tax management, compliance, and using OTax effectively. PLATINUM users get access to exclusive quarterly tax planning sessions and personalized training.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      <Dialog open={showWaitlistModal} onOpenChange={handleWaitlistModalChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Join the Waitlist</DialogTitle>
            <DialogDescription>
              {selectedPlan ? `Secure your ${selectedPlan} launch discount.` : "Get early access to OTax and enjoy launch perks."}
            </DialogDescription>
          </DialogHeader>

          {isWaitlistSubmitted ? (
            <div className="py-6 flex flex-col items-center gap-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <div className="text-center space-y-2">
                <p className="text-base font-semibold">You're all set!</p>
                <p className="text-sm text-muted-foreground">
                  Thanks for joining our waitlist. We'll notify you as soon as we launch.
                </p>
              </div>
              <Button onClick={() => handleWaitlistModalChange(false)}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-4 mt-4">
              <div className="space-y-1">
                <label htmlFor="waitlist-name" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="waitlist-name"
                  placeholder="Jane Doe"
                  value={waitlistForm.name}
                  onChange={(e) => setWaitlistForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={isSubmittingWaitlist}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="waitlist-email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="waitlist-email"
                  type="email"
                  placeholder="you@example.com"
                  value={waitlistForm.email}
                  onChange={(e) => setWaitlistForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  disabled={isSubmittingWaitlist}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="waitlist-phone" className="text-sm font-medium">
                  Phone Number <span className="text-xs text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="waitlist-phone"
                  placeholder="0801 234 5678"
                  value={waitlistForm.phone}
                  onChange={(e) => setWaitlistForm((prev) => ({ ...prev, phone: e.target.value }))}
                  disabled={isSubmittingWaitlist}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmittingWaitlist}>
                {isSubmittingWaitlist ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...
                  </>
                ) : (
                  "Join Waitlist"
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <TokenInputDialog
        open={showTokenDialog}
        onOpenChange={(open) => {
          setShowTokenDialog(open)
          if (!open && !isWaitlistSubmitted) {
            setPendingEmail("")
          }
        }}
        email={pendingEmail}
        onVerified={handleVerified}
      />
    </div>
  )
}

function PricingFeature({ children, comingSoon }: { children: React.ReactNode; comingSoon?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <span className={`text-sm ${comingSoon ? 'opacity-70' : ''}`}>
        {children}
        {comingSoon && (
          <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">
            Coming Soon
          </span>
        )}
      </span>
    </li>
  )
}

