"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calculator, TrendingUp, TrendingDown, DollarSign, Receipt, FileText, Bell, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/firebase/firebase"
import { collection, addDoc } from "firebase/firestore"

export default function DemoPage() {
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [waitlistData, setWaitlistData] = useState({
    name: "",
    email: "",
    phone: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

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
        notified: false,
        source: "demo_page"
      }

      await addDoc(collection(db, "waitlist"), data)
      
      setIsSubmitted(true)
      toast.success("🎉 You're on the waitlist! We'll notify you when we launch.")
      
      // Reset form
      setWaitlistData({ name: "", email: "", phone: "" })
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowWaitlistModal(false)
        setIsSubmitted(false)
      }, 2000)
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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              
            </div>
            <span className="font-semibold text-xl">OTax</span>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="hidden sm:flex">
              Demo Mode
            </Badge>
            <Button size="lg" onClick={() => setShowWaitlistModal(true)}>
              Join the Waitlist <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Demo Banner */}
      <div className="bg-primary/10 border-b border-primary/20">
        <div className="container mx-auto px-4 py-4 text-center">
          <p className="text-sm font-medium">
            You're viewing a demo of OTax.{" "}
            <button onClick={() => setShowWaitlistModal(true)} className="underline font-semibold hover:text-primary transition-colors">
              Join the waitlist
            </button>{" "}
            to be notified when we launch.
          </p>
        </div>
      </div>

      {/* Demo Dashboard */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
          <p className="text-muted-foreground">Welcome to your financial command center</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦2,450,000</div>
              <p className="text-xs text-muted-foreground">+12.5% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦850,000</div>
              <p className="text-xs text-muted-foreground">-3.2% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated Tax</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦245,000</div>
              <p className="text-xs text-muted-foreground">For current tax year</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦1,355,000</div>
              <p className="text-xs text-muted-foreground">After tax deductions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-2 mb-8">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Your latest income and expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TransactionItem
                  type="income"
                  description="Client Payment - Website Design"
                  amount="₦450,000"
                  date="Jan 15, 2025"
                />
                <TransactionItem type="expense" description="Office Rent" amount="₦120,000" date="Jan 10, 2025" />
                <TransactionItem type="income" description="Consulting Services" amount="₦280,000" date="Jan 8, 2025" />
                <TransactionItem
                  type="expense"
                  description="Software Subscriptions"
                  amount="₦35,000"
                  date="Jan 5, 2025"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tax Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Tax Summary
              </CardTitle>
              <CardDescription>Your tax breakdown for 2025</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Gross Income</span>
                  <span className="font-semibold">₦2,450,000</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Tax Reliefs</span>
                  <span className="font-semibold text-green-600">-₦350,000</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Taxable Income</span>
                  <span className="font-semibold">₦2,100,000</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-medium">Total Tax Due</span>
                  <span className="text-xl font-bold text-primary">₦245,000</span>
                </div>
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Monthly Set-Aside</p>
                  <p className="text-2xl font-bold">₦20,417</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Upcoming Reminders
            </CardTitle>
            <CardDescription>Don't miss important deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ReminderItem title="Q1 Tax Payment Due" date="March 31, 2025" priority="high" daysLeft={79} />
              <ReminderItem
                title="Submit Self-Assessment Report"
                date="March 15, 2025"
                priority="medium"
                daysLeft={63}
              />
              <ReminderItem title="Renew Business Registration" date="April 30, 2025" priority="low" daysLeft={109} />
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="mt-12 bg-primary text-primary-foreground rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Take Control of Your Taxes?</h2>
          <p className="text-lg mb-6 opacity-90 max-w-2xl mx-auto">
            Join our waitlist to be among the first to experience OTax when we launch.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" onClick={() => setShowWaitlistModal(true)}>
              Join the Waitlist <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
              >
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </div>

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

      {/* Waitlist Modal */}
      <Dialog open={showWaitlistModal} onOpenChange={setShowWaitlistModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Join the Waitlist</DialogTitle>
            <DialogDescription className="text-center">
              Be among the first to experience OTax
            </DialogDescription>
          </DialogHeader>

          {isSubmitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">You're in!</h3>
              <p className="text-muted-foreground">
                Thank you for joining our waitlist. We'll notify you as soon as we launch!
              </p>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={waitlistData.name}
                  onChange={(e) => setWaitlistData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="h-12"
                />
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={waitlistData.email}
                  onChange={(e) => setWaitlistData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="h-12"
                />
              </div>
              <div>
                <Input
                  type="tel"
                  placeholder="Phone Number (e.g., 08012345678)"
                  value={waitlistData.phone}
                  onChange={(e) => setWaitlistData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                  className="h-12"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Join the Waitlist
                  </>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TransactionItem({
  type,
  description,
  amount,
  date,
}: {
  type: "income" | "expense"
  description: string
  amount: string
  date: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          }`}
        >
          {type === "income" ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-medium text-sm">{description}</p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
      </div>
      <span className={`font-semibold ${type === "income" ? "text-green-600" : "text-red-600"}`}>
        {type === "income" ? "+" : "-"}
        {amount}
      </span>
    </div>
  )
}

function ReminderItem({
  title,
  date,
  priority,
  daysLeft,
}: {
  title: string
  date: string
  priority: "high" | "medium" | "low"
  daysLeft: number
}) {
  const priorityColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-orange-100 text-orange-700 border-orange-200",
    low: "bg-blue-100 text-blue-700 border-blue-200",
  }

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${priorityColors[priority]}`}>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs opacity-80">{date}</p>
      </div>
      <Badge variant="secondary" className="bg-white/50">
        {daysLeft} days
      </Badge>
    </div>
  )
}
