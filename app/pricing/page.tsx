import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Calculator } from "lucide-react"

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl">OTax</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your business needs. All plans include a 14-day free trial.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Individual Plan */}
            <Card className="relative flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl">Individual</CardTitle>
                <CardDescription>Perfect for freelancers and solo entrepreneurs</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">₦2,000</span>
                  <span className="text-muted-foreground">/month</span>
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
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/signup" className="w-full">
                  <Button className="w-full bg-transparent" variant="outline">
                    Start Free Trial
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Small Business Plan */}
            <Card className="relative flex flex-col border-primary shadow-lg scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Small Business</CardTitle>
                <CardDescription>For growing businesses and freelancers</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">₦5,000</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <PricingFeature>Unlimited transactions</PricingFeature>
                  <PricingFeature>All Individual features</PricingFeature>
                  <PricingFeature>Advanced tax calculations</PricingFeature>
                  <PricingFeature>LIRS/FIRS filing reports</PricingFeature>
                  <PricingFeature>Document storage (5GB)</PricingFeature>
                  <PricingFeature>Receipt scanning & OCR</PricingFeature>
                  <PricingFeature>SMS & email reminders</PricingFeature>
                  <PricingFeature>Priority support</PricingFeature>
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/signup" className="w-full">
                  <Button className="w-full">Start Free Trial</Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Big Business Plan */}
            <Card className="relative flex flex-col opacity-75">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-muted text-muted-foreground px-4 py-1 rounded-full text-sm font-medium">
                Coming Soon
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Big Business</CardTitle>
                <CardDescription>For established businesses and enterprises</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">₦15,000</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <PricingFeature>Everything in Small Business</PricingFeature>
                  <PricingFeature>Multi-user access (up to 5 users)</PricingFeature>
                  <PricingFeature>Advanced analytics & insights</PricingFeature>
                  <PricingFeature>Custom report templates</PricingFeature>
                  <PricingFeature>Document storage (50GB)</PricingFeature>
                  <PricingFeature>API access</PricingFeature>
                  <PricingFeature>Dedicated account manager</PricingFeature>
                  <PricingFeature>24/7 priority support</PricingFeature>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-transparent" variant="outline" disabled>
                  Coming Soon
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <FAQItem
                question="Do you offer a free trial?"
                answer="Yes! All plans come with a 14-day free trial. No credit card required to start."
              />
              <FAQItem
                question="Can I change plans later?"
                answer="You can upgrade or downgrade your plan at any time. Changes take effect immediately."
              />
              <FAQItem
                question="What payment methods do you accept?"
                answer="We accept all major Nigerian payment methods including bank transfers, cards, and mobile money."
              />
              <FAQItem
                question="Is my financial data secure?"
                answer="Yes! We use bank-level encryption and security measures to protect your data. Your information is never shared with third parties."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 mt-20">
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

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <span className="text-sm">{children}</span>
    </li>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border border-border rounded-lg p-6">
      <h3 className="font-semibold text-lg mb-2">{question}</h3>
      <p className="text-muted-foreground">{answer}</p>
    </div>
  )
}
