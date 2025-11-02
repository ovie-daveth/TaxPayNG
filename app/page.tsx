"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, BarChart3, Calculator, FileText, Bell, CheckCircle2, Loader2, Sparkles, Shield, TrendingUp, Clock, Users, Zap, Award, DollarSign } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "sonner"
import { db } from "@/firebase/firebase"
import { collection, addDoc } from "firebase/firestore"

export default function HomePage() {
  const { user, logout, loading } = useAuth()
  const router = useRouter()

  const [waitlistData, setWaitlistData] = useState({
    name: "",
    email: "",
    phone: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

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
      // Validate inputs
      if (!waitlistData.name || !waitlistData.email || !waitlistData.phone) {
        toast.error("Please fill in all fields")
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

      // Validate phone format (Nigerian phone numbers)
      const phoneRegex = /^(\+234|0)?[789][01]\d{8}$/
      if (!phoneRegex.test(waitlistData.phone.replace(/\s/g, ""))) {
        toast.error("Please enter a valid Nigerian phone number")
        setIsSubmitting(false)
        return
      }

      // Save to Firestore
      const data = {
        name: waitlistData.name.trim(),
        email: waitlistData.email.trim().toLowerCase(),
        phone: waitlistData.phone.replace(/\s/g, ""),
        createdAt: new Date().toISOString(),
        status: "pending",
        notified: false
      }

      await addDoc(collection(db, "waitlist"), data)
      
      setIsSubmitted(true)
      toast.success("🎉 You're on the waitlist! We'll notify you when we launch.")
      
      // Reset form
      setWaitlistData({ name: "", email: "", phone: "" })
    } catch (error) {
      console.error("Error submitting waitlist:", error)
      toast.error("Oops! Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary text-primary-foreground font-bold rounded-lg flex items-center justify-center">
              O
            </div>
            <span className="font-semibold text-xl">OTax</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
          </nav>
          <div className="flex items-center gap-3">
        
            <ThemeToggle />
                <a href="#waitlist">
                  <Button size="lg">Join the Waitlist</Button>
                </a>
           
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32 relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-blue-50/50 dark:from-green-950/20 dark:via-transparent dark:to-blue-950/20 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-8 animate-in fade-in slide-in-from-top duration-700">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              The Future of Tax Management in Nigeria
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance mb-6 animate-in fade-in slide-in-from-bottom duration-1000">
            Stop Losing Sleep Over
            <span className="bg-gradient-to-r from-green-600 via-green-700 to-green-600 bg-clip-text text-transparent animate-gradient"> Tax Compliance</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground text-balance mb-6 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom duration-1200">
            OTax helps Nigerian freelancers and small businesses effortlessly manage their taxes, 
            track expenses, and stay compliant with LIRS & FIRS regulations—all in one intelligent platform.
          </p>
          <p className="text-base text-muted-foreground mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom duration-1400">
            Join 5,000+ professionals who've simplified their tax journey and saved hundreds of hours each year
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-in fade-in slide-in-from-bottom duration-1600">
            <a href="#waitlist">
              <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 group">
                Join the Waitlist
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent text-lg h-14 px-8">
                Watch Demo
              </Button>
            </Link>
          </div>

          {/* Social Proof */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground animate-in fade-in duration-1800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>30-Day Money Back</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>LIRS & FIRS Compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-24 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Everything You Need in One Platform
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built specifically for the Nigerian tax landscape. Simple, powerful, and fully compliant.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8" />}
              title="Smart Expense Tracking"
              description="Automatically categorize and track all your income and expenses in real-time. Sync transactions, upload receipts, and maintain a complete financial picture without the manual work."
              delay="0"
            />
            <FeatureCard
              icon={<Calculator className="w-8 h-8" />}
              title="Intelligent Tax Calculator"
              description="Calculate your taxes, deductions, allowances, and reliefs based on the latest Nigerian tax laws. Know exactly what you owe before filing season."
              delay="100"
            />
            <FeatureCard
              icon={<FileText className="w-8 h-8" />}
              title="Auto-Generated Reports"
              description="Generate LIRS and FIRS-ready self-assessment forms, income statements, and compliance reports in minutes—not hours."
              delay="200"
            />
            <FeatureCard
              icon={<Bell className="w-8 h-8" />}
              title="Smart Deadline Alerts"
              description="Never miss a filing deadline again. Get personalized reminders for payments, submissions, and renewals based on your business profile."
              delay="300"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8" />}
              title="100% LIRS & FIRS Compliant"
              description="Built to align with all Nigerian tax regulations. Rest assured your filings meet official requirements and standards."
              delay="400"
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Lightning-Fast Processing"
              description="Process thousands of transactions in seconds. Our optimized engine handles complex calculations and report generation in real-time."
              delay="500"
            />
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
            <StatItem 
              icon={<Users className="w-6 h-6" />}
              number="5,000+"
              label="Active Users"
              color="text-blue-600"
            />
            <StatItem 
              icon={<TrendingUp className="w-6 h-6" />}
              number="98%"
              label="Accuracy Rate"
              color="text-green-600"
            />
            <StatItem 
              icon={<Clock className="w-6 h-6" />}
              number="95%"
              label="Time Saved"
              color="text-orange-600"
            />
            <StatItem 
              icon={<Award className="w-6 h-6" />}
              number="4.9/5"
              label="User Rating"
              color="text-purple-600"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-24 bg-gradient-to-br from-primary/5 via-transparent to-primary/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Choose <span className="text-primary">OTax?</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of Nigerian businesses transforming their tax management experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
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
              description="Built-in compliance checks keep you aligned with LIRS and FIRS requirements. Sleep better knowing you're covered."
              delay="200"
            />
          </div>

          {/* Testimonial Section */}
          <div className="bg-card border-2 border-primary/20 rounded-3xl p-12 md:p-16 shadow-2xl">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xl md:text-2xl font-medium text-foreground mb-4 italic">
                  "OTax transformed how I handle my business taxes. What used to take me days now takes minutes. 
                  The self-assessment reports are flawless and I've never had a filing rejected."
                </p>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold text-lg">Temilade Adeyemi</p>
                    <p className="text-sm text-muted-foreground">Freelance Software Developer, Lagos</p>
                  </div>
                  <div className="flex gap-1 text-yellow-500">
                    {"⭐⭐⭐⭐⭐".split("").map((star, i) => (
                      <span key={i} className="text-2xl">{star}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section id="waitlist" className="container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-full mb-6 animate-pulse">
              <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Limited Early Access
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Join Our <span className="text-primary">Exclusive Waitlist</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-4">
              Be among the first 1,000 users to experience the future of tax management
            </p>
            <p className="text-sm text-muted-foreground">
              Get early access, lifetime discounts, and priority support
            </p>
          </div>

          {isSubmitted ? (
            <div className="bg-card border-2 border-green-200 dark:border-green-800 rounded-2xl p-8 text-center shadow-lg">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">You're in!</h3>
              <p className="text-muted-foreground mb-6">
                Thank you for joining our waitlist. We'll notify you as soon as we launch!
              </p>
              <Button 
                onClick={() => setIsSubmitted(false)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Join Another Email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                <div className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      value={waitlistData.name}
                      onChange={(e) => setWaitlistData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="h-12 text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Input
                      type="email"
                      name="email"
                      placeholder="Email Address"
                      value={waitlistData.email}
                      onChange={(e) => setWaitlistData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="h-12 text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Input
                      type="tel"
                      name="phone"
                      placeholder="Phone Number (e.g., 08012345678)"
                      value={waitlistData.phone}
                      onChange={(e) => setWaitlistData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                      className="h-12 text-base"
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-12 text-base"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Joining Waitlist...
                      </>
                    ) : (
                      <>
                        Join Waitlist
                        <ArrowRight className="ml-2 w-4 h-4" />
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
      <section className="container mx-auto px-4 py-24">
        <div className="max-w-5xl mx-auto relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl blur-3xl" />
          
          <div className="relative bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-3xl p-12 md:p-16 text-center shadow-2xl border border-primary/50">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Transform Your Tax Experience?
              </h2>
              <p className="text-xl md:text-2xl mb-10 opacity-95 leading-relaxed">
                Join thousands of Nigerian freelancers and SMEs who've made tax compliance effortless. 
                Start your free trial today—no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="#waitlist">
                  <Button size="lg" variant="secondary" className="text-lg h-14 px-8 group">
                    Join the Waitlist
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="text-lg h-14 px-8 border-2 border-primary-foreground/20 bg-transparent hover:bg-primary-foreground/10">
                    Watch Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Calculator className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">OTax</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2025 OTax. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode; title: string; description: string; delay: string }) {
  return (
    <div 
      className="bg-card border border-border rounded-2xl p-8 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
        {icon}
      </div>
      <h3 className="font-bold text-xl mb-3">{title}</h3>
      <p className="text-base text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function StatItem({ icon, number, label, color }: { icon: React.ReactNode; number: string; label: string; color: string }) {
  return (
    <div className="text-center p-6 bg-card border border-border rounded-2xl hover:shadow-lg transition-shadow">
      <div className={`flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <div className="text-4xl font-bold mb-2 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
        {number}
      </div>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
    </div>
  )
}

function BenefitCard({ icon, title, description, delay }: { icon: React.ReactNode; title: string; description: string; delay: string }) {
  return (
    <div 
      className="text-center p-8 rounded-2xl hover:shadow-xl transition-all duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
        {icon}
      </div>
      <h3 className="font-bold text-2xl mb-4">{title}</h3>
      <p className="text-base text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
