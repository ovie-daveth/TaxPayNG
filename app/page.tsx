"use client"

import type React from "react"
import { cloneElement, isValidElement, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Bell,
  Users,
  ScanLine,
  FolderArchive,
  CreditCard,
  Receipt,
  FileCheck,
  Smartphone,
  Building2,
  LogIn,
} from "lucide-react"
import { toast } from "sonner"
import { useEffect } from "react"
import Footer from "@/components/footer"
import { LandingReveal } from "@/components/landing-reveal"
import { SiteHeader } from "@/components/site-header"
import { TokenInputDialog } from "@/components/waitlist/token-input-dialog"
import { CAC_REGISTRATION_TYPES, formatNaira } from "@/lib/constants/cac"

const AUDIENCE_OPTIONS = [
  { id: "individual", label: "Individual", sub: "Freelancers & creators" },
  { id: "sme", label: "SME", sub: "6–50 employees" },
  { id: "enterprise", label: "Enterprise", sub: "51+ employees" },
]

export default function HomePage() {
  const [waitlistData, setWaitlistData] = useState({
    name: "",
    email: "",
    phone: "",
    userType: "",
    platformExpectations: "",
  })
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [pendingEmail, setPendingEmail] = useState("")
  const [audience, setAudience] = useState("individual")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verified = params.get("verified")
    const email = params.get("email")

    if (verified === "true") {
      toast.success(
        `✅ Email verified! ${email ? `Welcome ${email}` : "You're now on the waitlist!"}`
      )
      window.history.replaceState({}, "", window.location.pathname)
    } else if (params.get("error")) {
      const error = params.get("error")
      let errorMessage = "Verification failed"
      if (error === "invalid_token") errorMessage = "Invalid verification link"
      else if (error === "token_expired")
        errorMessage = "Verification link expired. Please sign up again."
      else if (error === "not_found") errorMessage = "Email not found in waitlist"
      toast.error(errorMessage)
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

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

      {/* Hero - Odoo style */}
      <section className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-[200px] py-16 sm:py-20 md:py-24 lg:py-28">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4 sm:mb-6">
              <span className="landing-hero-line block">#1 Software for</span>
              <span className="landing-hero-line block mt-1">
                <span className="text-primary">Tax & Compliance</span> in Nigeria
              </span>
            </h1>
            <p className="landing-hero-line text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10">
              Manage your taxes from tracking income and expenses to filing with FIRS &amp; NRS—all in one platform.
            </p>
            <div className="landing-hero-line flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                  Start now
                </Button>
              </Link>
              <Link href="/#contact" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                  Meet an advisor
                </Button>
              </Link>
            </div>
            <div className="landing-hero-line flex flex-wrap justify-center gap-2 sm:gap-3">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAudience(opt.id)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                    audience === opt.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border border-border hover:bg-muted text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {opt.label}
                  <span className="hidden sm:inline opacity-80 ml-1">({opt.sub})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial - Odoo style quote */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <LandingReveal className="max-w-4xl mx-auto">
          <blockquote className="text-center">
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground italic mb-6">
              &ldquo;Going through the process of getting my tax calculations was a breeze. OTax did all the heavy lifting for me. Just going through the Demo was enough to convince me to join the waitlist.&rdquo;
            </p>
            <footer className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center sm:text-left">
                <cite className="font-semibold not-italic text-foreground">Daniel Becon</cite>
                <p className="text-sm text-muted-foreground">Freelance Software Developer, Lagos</p>
              </div>
            </footer>
          </blockquote>
        </LandingReveal>
      </section>

      {/* From tracking to filing - Odoo "From the lead to the invoice" */}
      <section className="border-y border-border bg-background py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingReveal className="max-w-6xl mx-auto" stagger>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
              From tracking to the filing
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              Your finances are centralized in one place. Track income and expenses, calculate what you owe, and file with confidence.
            </p>
            <div className="grid sm:grid-cols-3 gap-8 sm:gap-10">
              <div className="landing-reveal-item text-center transition-all duration-300 hover:scale-[1.02]">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                  <BarChart3 className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Track income &amp; expenses</h3>
                <p className="text-sm text-muted-foreground">
                  Categorize transactions, scan receipts, and keep a clear picture of your finances.
                </p>
              </div>
              <div className="landing-reveal-item text-center transition-all duration-300 hover:scale-[1.02]">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                  <Calculator className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Calculate taxes &amp; reliefs</h3>
                <p className="text-sm text-muted-foreground">
                  Get accurate tax estimates with NTA 2025 reliefs, allowances, and exemptions built in.
                </p>
              </div>
              <div className="landing-reveal-item text-center transition-all duration-300 hover:scale-[1.02]">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                  <FileCheck className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-lg mb-2">File with FIRS &amp; NRS</h3>
                <p className="text-sm text-muted-foreground">
                  Generate filing-ready reports and pay via integrated gateways with RRR generation.
                </p>
              </div>
            </div>
          </LandingReveal>
        </div>
      </section>

      {/* Smart tax management - Odoo "Smart service management" */}
      <section className="py-16 sm:py-20 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingReveal className="max-w-6xl mx-auto" stagger>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
              Smart tax management
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              Keep track of each obligation with reminders, timesheets, and a clear dashboard.
            </p>
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              <div className="landing-reveal-item bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/20">
                <h3 className="font-semibold text-lg mb-2">Create tasks</h3>
                <p className="text-sm text-muted-foreground">
                  Break down tax deadlines and submissions into tasks so nothing slips through.
                </p>
              </div>
              <div className="landing-reveal-item bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/20">
                <h3 className="font-semibold text-lg mb-2">Schedule activities</h3>
                <p className="text-sm text-muted-foreground">
                  Plan reminders for PAYE, VAT, CIT, and annual filings in one place.
                </p>
              </div>
              <div className="landing-reveal-item bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/20">
                <h3 className="font-semibold text-lg mb-2">Fill in timesheets</h3>
                <p className="text-sm text-muted-foreground">
                  Log time and expenses for accurate reporting and client billing.
                </p>
              </div>
            </div>
          </LandingReveal>
        </div>
      </section>

      {/* Next-level compliance - Odoo "Next-level accounting" */}
      <section className="py-16 sm:py-20 md:py-24 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingReveal className="max-w-6xl mx-auto" stagger>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12">
              Next-level compliance
            </h2>
            <div className="grid sm:grid-cols-3 gap-8 sm:gap-10 text-center">
              <div className="landing-reveal-item transition-transform duration-300 hover:scale-105">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">100%</div>
                <p className="text-muted-foreground text-sm sm:text-base">
                  FIRS &amp; NRS compliant. Built for Nigerian Tax Act 2025.
                </p>
              </div>
              <div className="landing-reveal-item transition-transform duration-300 hover:scale-105">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">Smart reliefs</div>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Rent relief, exemptions for earnings ≤ ₦800k, and automatic deductions.
                </p>
              </div>
              <div className="landing-reveal-item transition-transform duration-300 hover:scale-105">
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">95%</div>
                <p className="text-muted-foreground text-sm sm:text-base">
                  of the work automated—from categorization to report generation.
                </p>
              </div>
            </div>
          </LandingReveal>
        </div>
      </section>

      {/* Secure document workspace - Odoo style */}
      <section className="py-16 sm:py-20 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingReveal className="max-w-6xl mx-auto" stagger>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
              Secure document workspace
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              Store receipts, invoices, and tax documents in one secure place. Scan with OCR and organize by project or year.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
              <div className="landing-reveal-item bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                    <FolderArchive className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Organize by project or year</h3>
                    <p className="text-sm text-muted-foreground">
                      Each tax year or client can have its own workspace. Find documents quickly when you need them.
                    </p>
                  </div>
                </div>
              </div>
              <div className="landing-reveal-item bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                    <ScanLine className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Scan &amp; extract</h3>
                    <p className="text-sm text-muted-foreground">
                      Capture receipts with your phone. OCR extracts details and updates your expenses automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </LandingReveal>
        </div>
      </section>

      {/* All the features done right - Odoo style grid */}
      <section id="features" className="py-16 sm:py-20 md:py-24 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingReveal className="max-w-6xl mx-auto" stagger>
            <p className="text-sm font-medium text-primary uppercase tracking-wider text-center mb-2">
              But wait! There&apos;s more.
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
              All the features done right
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mt-10">
              <FeatureCard
                icon={<BarChart3 className="w-8 h-8" />}
                title="Income & expense tracking"
                description="Unlimited transactions with automatic categorization for freelancers and businesses."
              />
              <FeatureCard
                icon={<Calculator className="w-8 h-8" />}
                title="Tax calculator with reliefs"
                description="NTA 2025 reliefs, rent allowance (capped ₦500k), exemption for earnings ≤ ₦800k."
              />
              <FeatureCard
                icon={<FileCheck className="w-8 h-8" />}
                title="FIRS/NRS filing reports"
                description="Filing-ready self-assessment forms and compliance reports. Export PDF for submission."
              />
              <FeatureCard
                icon={<ScanLine className="w-8 h-8" />}
                title="Receipt scanning & OCR"
                description="Photo receipts; OCR extracts and categorizes. Real-time tax updates."
              />
              <FeatureCard
                icon={<Bell className="w-8 h-8" />}
                title="SMS & email reminders"
                description="Deadline reminders for payments, submissions, and renewals. Customize frequency."
              />
              <FeatureCard
                icon={<CreditCard className="w-8 h-8" />}
                title="Integrated tax payments"
                description="Generate RRR and pay via integrated gateways. Instant receipts."
              />
            </div>
          </LandingReveal>
        </div>
      </section>

      {/* One platform, every need - Odoo "One need, one app" */}
      <section className="py-16 sm:py-20 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingReveal className="max-w-6xl mx-auto" stagger>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
              One platform, every need
            </h2>
            <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
              Expand as you grow.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-6">
              {[
                { icon: BarChart3, label: "Tracking", href: "#features" },
                { icon: Calculator, label: "Tax calc", href: "#features" },
                { icon: FileCheck, label: "Filing", href: "#features" },
                { icon: FolderArchive, label: "Documents", href: "#features" },
                { icon: Receipt, label: "Invoicing", href: "#features" },
                { icon: Bell, label: "Reminders", href: "#features" },
              ].map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="landing-reveal-item flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md hover:scale-105 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-center">{label}</span>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="transition-all duration-300 hover:scale-[1.02]">
                  See all features
                </Button>
              </Link>
            </div>
          </LandingReveal>
        </div>
      </section>

      {/* CAC Registration - compact */}
      <section className="py-16 sm:py-20 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingReveal className="max-w-6xl mx-auto" stagger>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-3">
                  <Building2 className="w-4 h-4" />
                  Business registration
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Register with CAC — Business Name, LLC, Incorporated Trustees
                </h2>
                <p className="text-muted-foreground mt-2 max-w-2xl">
                  Pick what you want to register, submit documents, pay securely via Paystack.
                </p>
              </div>
              <Link href="/cac" className="shrink-0">
                <Button size="lg" className="w-full md:w-auto">
                  Explore CAC services <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
              {CAC_REGISTRATION_TYPES.map((t) => (
                <div
                  key={t.type}
                  className="landing-reveal-item rounded-xl border bg-card p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
                >
                  <div className="font-semibold text-lg mb-1">
                    {t.type === "LLC" ? "LLC registration" : t.title}
                  </div>
                  <div className="text-xl font-bold text-primary mb-2">
                    {formatNaira(t.priceFromNaira)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{t.shortDescription}</p>
                  <Link href={`/cac/register/${t.slug}`}>
                    <Button size="sm" variant="outline" className="w-full">
                      Start <ArrowRight className="ml-1 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </LandingReveal>
        </div>
      </section>

      {/* Mobile app coming soon - compact */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingReveal className="max-w-6xl mx-auto">
            <div className="rounded-2xl border bg-card p-6 sm:p-8 md:p-10 overflow-hidden transition-shadow duration-300 hover:shadow-lg">
              <div className="grid gap-8 md:grid-cols-2 md:items-center">
                <div className="relative max-w-md mx-auto">
                  <Image
                    src="/mobile_app_1.png"
                    alt="OTax mobile app"
                    width={800}
                    height={600}
                    className="h-auto w-full object-contain"
                  />
                </div>
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                    <Smartphone className="w-4 h-4" />
                    Mobile App Coming Soon
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold">
                    Manage your taxes on the go
                  </h2>
                  <p className="text-muted-foreground">
                    iOS and Android app for tracking, payroll, and compliance—anytime, anywhere.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs">iOS</span>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs">Android</span>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs">Push reminders</span>
                  </div>
                </div>
              </div>
            </div>
          </LandingReveal>
        </div>
      </section>

      {/* Join happy users - Odoo style */}
      <section className="py-12 sm:py-16 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <LandingReveal>
            <p className="text-lg sm:text-xl text-muted-foreground">
              Join thousands of Nigerian freelancers and SMEs who grow with OTax
            </p>
          </LandingReveal>
        </div>
      </section>

      {/* Final CTA - Odoo "Unleash your growth potential" */}
      <section id="contact" className="py-16 sm:py-20 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingReveal className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Unleash your growth potential
            </h2>
            <p className="text-muted-foreground mb-8">
              Start your free trial today. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                  Start now
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                  <LogIn className="mr-2 w-4 h-4" />
                  Log in
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">15 days free trial</p>
          </LandingReveal>
        </div>
      </section>

      <Footer />

      <TokenInputDialog
        open={showTokenDialog}
        onOpenChange={setShowTokenDialog}
        email={pendingEmail}
        resendEndpoint="/api/send-waitlist-verification"
        resendBody={() => ({
          email: waitlistData.email.trim() || pendingEmail,
          name: waitlistData.name.trim() || "there",
          phone: waitlistData.phone || undefined,
          userType: waitlistData.userType || undefined,
          platformExpectations: waitlistData.platformExpectations || undefined,
        })}
        onVerified={() => {
          setWaitlistData({
            name: "",
            email: "",
            phone: "",
            userType: "",
            platformExpectations: "",
          })
          setShowTokenDialog(false)
        }}
      />
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  const responsiveIcon = isValidElement(icon)
    ? cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className: `w-6 h-6 sm:w-8 sm:h-8 ${(icon as React.ReactElement<{ className?: string }>).props?.className || ""}`,
      })
    : icon

  return (
    <div className="group landing-reveal-item bg-card border border-border rounded-xl p-5 sm:p-6 hover:shadow-lg hover:border-primary/20 hover:scale-[1.02] transition-all duration-300">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
        {responsiveIcon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
