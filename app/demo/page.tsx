"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calculator, TrendingUp, TrendingDown, FileText, Bell, ArrowRight, CheckCircle2, Loader2, Sparkles, LayoutDashboard, Receipt, Settings, Menu, X, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Search, Filter, Building2, User, Users, DollarSign, Mail, Download, Wallet } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/firebase/firebase"
import { collection, addDoc, setDoc, doc, query, getDocs, where } from "firebase/firestore"
import { TaxCalculatorForm } from "@/components/tax-calculator/tax-calculator-form"
import { TaxBreakdown } from "@/components/tax-calculator/tax-breakdown"
import { TaxRatesInfo } from "@/components/tax-calculator/tax-rates-info"
import { ThemeToggle } from "@/components/theme-toggle"
import OtaxLogo from "@/components/OtaxLogo"

const navItems = [
  { href: "#dashboard", label: "Dashboard", icon: LayoutDashboard, available: true },
  { href: "#transactions", label: "Transactions", icon: Receipt, available: true },
  { href: "#tax-calculator", label: "Tax Calculator", icon: Calculator, available: true },
  { href: "#documents", label: "Documents", icon: FileText, available: false },
  { href: "#reminders", label: "Reminders", icon: Bell, available: true },
  { href: "#settings", label: "Settings", icon: Settings, available: false },
]

export default function DemoPage() {
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [waitlistData, setWaitlistData] = useState({
    name: "",
    email: "",
    phone: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("dashboard")
  const [taxResult, setTaxResult] = useState<any>(null)
  const [showTaxResults, setShowTaxResults] = useState(false)
  const [businessType, setBusinessType] = useState<"freelancer" | "sme">("freelancer")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // const handleWaitlistSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault()
  //   setIsSubmitting(true)

  //   try {
  //     // Validate inputs
  //     if (!waitlistData.name || !waitlistData.email || !waitlistData.phone) {
  //       toast.error("Please fill in all fields")
  //       setIsSubmitting(false)
  //       return
  //     }

  //     // Validate email format
  //     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  //     if (!emailRegex.test(waitlistData.email)) {
  //       toast.error("Please enter a valid email address")
  //       setIsSubmitting(false)
  //       return
  //     }

  //     // Validate phone format (Nigerian phone numbers)
  //     const phoneRegex = /^(\+234|0)?[789][01]\d{8}$/
  //     if (!phoneRegex.test(waitlistData.phone.replace(/\s/g, ""))) {
  //       toast.error("Please enter a valid Nigerian phone number")
  //       setIsSubmitting(false)
  //       return
  //     }

  //     // Save to Firestore
  //     const data = {
  //       name: waitlistData.name.trim(),
  //       email: waitlistData.email.trim().toLowerCase(),
  //       phone: waitlistData.phone.replace(/\s/g, ""),
  //       createdAt: new Date().toISOString(),
  //       status: "pending",
  //       notified: false,
  //       source: "demo_page"
  //     }

  //     await addDoc(collection(db, "waitlist"), data)
      
  //     setIsSubmitted(true)
  //     toast.success("🎉 You're on the waitlist! We'll notify you when we launch.")
      
  //     // Reset form
  //     setWaitlistData({ name: "", email: "", phone: "" })
      
  //     // Close modal after 2 seconds
  //     setTimeout(() => {
  //       setShowWaitlistModal(false)
  //       setIsSubmitted(false)
  //     }, 2000)
  //   } catch (error) {
  //     console.error("Error submitting waitlist:", error)
  //     toast.error("Oops! Something went wrong. Please try again.")
  //   } finally {
  //     setIsSubmitting(false)
  //   }
  // }

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

   
      const q = query(collection(db, "waitlist"), where("email", "==", waitlistData.email.toLowerCase()))
      const existing = await getDocs(q)
      if (!existing.empty) {
        toast.error("That email is already on the waitlist!")
        setIsSubmitting(false)
        return
      }

      // Save to Firestore
      const data = {
        name: waitlistData.name.trim(),
        email: waitlistData.email.trim().toLowerCase(),
        phone: waitlistData.phone ? waitlistData.phone.replace(/\s/g, "") : "",
        createdAt: new Date().toISOString(),
        status: "pending",
        notified: false
      }

      const emailId = waitlistData.email.trim().toLowerCase()

      await setDoc(doc(db, "waitlist", emailId), data)

      
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

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <StatsCards />
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RecentTransactions />
              </div>
              <div>
                <UpcomingReminders />
              </div>
            </div>
          </div>
        )
      case "transactions":
        return (
          <TransactionsView 
            businessType={businessType}
            isFilterOpen={isFilterOpen}
            setIsFilterOpen={setIsFilterOpen}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
        )
      case "tax-calculator":
        return (
          <>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <TaxCalculatorForm 
                  onCalculate={(result) => {
                    setTaxResult(result)
                    setShowTaxResults(true)
                  }} 
                />
              </div>
              <div>
                <TaxRatesInfo />
              </div>
            </div>

            {/* Tax Results Modal */}
            <Dialog open={showTaxResults} onOpenChange={setShowTaxResults}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
                {taxResult && (
                  <>
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
                      <DialogTitle className="text-2xl font-bold">Tax Calculation Results</DialogTitle>
                      <DialogDescription>Your detailed tax breakdown and payment schedule</DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-6">
                      <TaxBreakdownModalContent result={taxResult} />
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </>
        )
      case "reminders":
        return <RemindersView />
      default:
        return (
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Feature Coming Soon</h3>
              <p className="text-sm text-muted-foreground">This feature is not available in demo mode</p>
              <Button onClick={() => setShowWaitlistModal(true)} className="mt-4">
                Join Waitlist
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background mb-10">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex fixed left-0 top-0 h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out ${sidebarCollapsed ? "w-16" : "w-64"}`}>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link href="/" className={`flex items-center gap-2 transition-all duration-300 ${sidebarCollapsed && "justify-center"}`}>
            {!sidebarCollapsed && (
              <>
               <OtaxLogo />
                <Badge variant="secondary" className="ml-2">Demo</Badge>
              </>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 hover:bg-muted"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-8">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.href.replace("#", "")
            return (
              <button
                key={item.href}
                onClick={() => item.available ? setActiveSection(item.href.replace("#", "")) : toast.info("This feature is available in the full version")}
                className={`w-full flex items-center gap-3 px-3 my-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive && item.available
                    ? "bg-primary text-primary-foreground"
                    : item.available
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                    : "text-muted-foreground opacity-50 cursor-not-allowed"
                } ${sidebarCollapsed && "justify-center px-2"}`}
                title={sidebarCollapsed ? item.label : undefined}
                disabled={!item.available}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="whitespace-nowrap transition-opacity duration-300">
                    {item.label}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Button 
            variant="ghost" 
            className={`w-full text-muted-foreground transition-all duration-200 ${sidebarCollapsed ? "justify-center px-2" : "justify-start"}`} 
            size="sm"
            title={sidebarCollapsed ? "Join Waitlist" : undefined}
            onClick={() => setShowWaitlistModal(true)}
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="ml-2 whitespace-nowrap transition-opacity duration-300">
                Join Waitlist
              </span>
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">OTax</span>
            <Badge variant="secondary" className="ml-2">Demo</Badge>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="border-t border-border p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.href.replace("#", "")
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    if (item.available) {
                      setActiveSection(item.href.replace("#", ""))
                      setMobileMenuOpen(false)
                    } else {
                      toast.info("This feature is available in the full version")
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive && item.available
                      ? "bg-primary text-primary-foreground"
                      : item.available
                      ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                      : "text-muted-foreground opacity-50 cursor-not-allowed"
                  }`}
                  disabled={!item.available}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              )
            })}
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground mt-4" 
              size="sm"
              onClick={() => setShowWaitlistModal(true)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Join Waitlist
            </Button>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 max-w-7xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  {activeSection === "dashboard" && "Dashboard"}
                  {activeSection === "transactions" && "Transactions"}
                  {activeSection === "tax-calculator" && "Tax Calculator"}
                  {activeSection === "reminders" && "Reminders"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeSection === "dashboard" && "Welcome to OTax Demo Mode"}
                  {activeSection === "transactions" && "View sample transaction data"}
                  {activeSection === "tax-calculator" && "Try the tax calculator"}
                  {activeSection === "reminders" && "Sample tax deadlines"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Business Type Toggle - Only show on transactions page */}
                {activeSection === "transactions" && (
                  <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                    <Button
                      variant={businessType === "freelancer" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setBusinessType("freelancer")}
                      className="flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">Freelancer</span>
                    </Button>
                    <Button
                      variant={businessType === "sme" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setBusinessType("sme")}
                      className="flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      <span className="hidden sm:inline">SME</span>
                    </Button>
                  </div>
                )}
                <ThemeToggle />
                <Button size="lg" onClick={() => setShowWaitlistModal(true)}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Join Waitlist
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {renderContent()}
        </main>

        {/* Demo Banner */}
        <div className="fixed bottom-0 left-0 right-0 md:left-16 border-t border-border bg-primary text-primary-foreground p-4">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <p className="text-sm font-medium">
                  You're viewing the OTax demo. Join the waitlist for early access!
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowWaitlistModal(true)}>
                Join Waitlist
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

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
                  placeholder="Phone Number (optionale.g., 08012345678)"
                  value={waitlistData.phone}
                  onChange={(e) => setWaitlistData(prev => ({ ...prev, phone: e.target.value }))}
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

function StatsCards() {
  const stats = [
    { label: "Total Income", value: "₦2,450,000", change: "+12.5%", trend: "up", icon: ArrowUpRight, color: "text-primary" },
    { label: "Total Expenses", value: "₦890,000", change: "+8.2%", trend: "up", icon: ArrowDownRight, color: "text-destructive" },
    { label: "Net Profit", value: "₦1,560,000", change: "+15.3%", trend: "up", icon: TrendingUp, color: "text-chart-3" },
    { label: "Tax Payable", value: "₦234,000", change: "Q1 2025", trend: "neutral", icon: Calculator, color: "text-accent" },
  ]

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold mb-2">{stat.value}</p>
                <p className={`text-xs font-medium ${stat.trend === "up" ? "text-primary" : "text-muted-foreground"}`}>
                  {stat.change}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function RecentTransactions() {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        <div className="space-y-4">
          <TransactionItem type="income" description="Client Payment - Website Design" amount="₦450,000" date="Jan 15, 2025" />
          <TransactionItem type="expense" description="Office Rent" amount="₦120,000" date="Jan 10, 2025" />
          <TransactionItem type="income" description="Consulting Services" amount="₦280,000" date="Jan 8, 2025" />
          <TransactionItem type="expense" description="Software Subscriptions" amount="₦35,000" date="Jan 5, 2025" />
        </div>
      </div>
    </Card>
  )
}

function UpcomingReminders() {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Upcoming Reminders</h2>
        <div className="space-y-3">
          <ReminderItem title="Q1 Tax Payment Due" date="March 31, 2025" priority="high" daysLeft={79} />
          <ReminderItem title="Submit Self-Assessment Report" date="March 15, 2025" priority="medium" daysLeft={63} />
          <ReminderItem title="Renew Business Registration" date="April 30, 2025" priority="low" daysLeft={109} />
        </div>
      </div>
    </Card>
  )
}

interface TransactionsViewProps {
  businessType: "freelancer" | "sme"
  isFilterOpen: boolean
  setIsFilterOpen: (open: boolean) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedType: string
  setSelectedType: (type: string) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
}

function TransactionsView({ 
  businessType, 
  isFilterOpen, 
  setIsFilterOpen, 
  searchTerm, 
  setSearchTerm,
  selectedType,
  setSelectedType,
  selectedCategory,
  setSelectedCategory
}: TransactionsViewProps) {
  const freelancerTransactions = [
    { id: 1, type: "income" as const, description: "Client Payment - Website Design", amount: 450000, date: "Jan 15, 2025", category: "Services", paymentMethod: "Bank Transfer", taxDeductible: false },
    { id: 2, type: "expense" as const, description: "Office Rent", amount: 120000, date: "Jan 10, 2025", category: "Rent", paymentMethod: "Bank Transfer", taxDeductible: true },
    { id: 3, type: "income" as const, description: "Consulting Services", amount: 280000, date: "Jan 8, 2025", category: "Consulting", paymentMethod: "Cash", taxDeductible: false },
    { id: 4, type: "expense" as const, description: "Software Subscriptions", amount: 35000, date: "Jan 5, 2025", category: "Software", paymentMethod: "Card", taxDeductible: true },
    { id: 5, type: "income" as const, description: "Freelance Project", amount: 180000, date: "Jan 3, 2025", category: "Services", paymentMethod: "Mobile Money", taxDeductible: false },
  ]

  const smeTransactions = [
    { id: 1, type: "income" as const, description: "Product Sales", amount: 2500000, date: "Jan 15, 2025", category: "Sales Revenue", paymentMethod: "Bank Transfer", taxDeductible: false },
    { id: 2, type: "expense" as const, description: "Employee Salaries", amount: 850000, date: "Jan 10, 2025", category: "Payroll", paymentMethod: "Bank Transfer", taxDeductible: true },
    { id: 3, type: "expense" as const, description: "Office Supplies", amount: 125000, date: "Jan 8, 2025", category: "Operations", paymentMethod: "Card", taxDeductible: true },
    { id: 4, type: "income" as const, description: "Service Revenue", amount: 1200000, date: "Jan 5, 2025", category: "Services", paymentMethod: "Bank Transfer", taxDeductible: false },
    { id: 5, type: "expense" as const, description: "Marketing Campaign", amount: 450000, date: "Jan 3, 2025", category: "Marketing", paymentMethod: "Card", taxDeductible: true },
  ]

  const transactions = businessType === "freelancer" ? freelancerTransactions : smeTransactions

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchTerm === "" || transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === "all" || transaction.type === selectedType
    const matchesCategory = selectedCategory === "all" || transaction.category === selectedCategory
    return matchesSearch && matchesType && matchesCategory
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search transactions..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}>
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Filters Panel */}
      {isFilterOpen && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Filters</h3>
            <Button variant="ghost" size="sm" onClick={() => {
              setSelectedType("all")
              setSelectedCategory("all")
              setIsFilterOpen(false)
            }}>
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {businessType === "freelancer" ? (
                    <>
                      <SelectItem value="Services">Services</SelectItem>
                      <SelectItem value="Consulting">Consulting</SelectItem>
                      <SelectItem value="Rent">Rent</SelectItem>
                      <SelectItem value="Software">Software</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Sales Revenue">Sales Revenue</SelectItem>
                      <SelectItem value="Payroll">Payroll</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Services">Services</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Description</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Payment Method</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="py-4 px-4 text-sm">{transaction.date}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${transaction.type === "income" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {transaction.type === "income" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <span className="text-sm font-medium">{transaction.description}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant="secondary" className="text-xs">{transaction.category}</Badge>
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">{transaction.paymentMethod}</td>
                  <td className="py-4 px-4 text-right">
                    <span className={`font-semibold ${transaction.type === "income" ? "text-primary" : "text-destructive"}`}>
                      {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {transaction.taxDeductible ? (
                      <Badge variant="outline" className="text-xs">Tax Deductible</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Tax Non-deductible</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-border">
          {filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${transaction.type === "income" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {transaction.type === "income" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{transaction.date}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{transaction.category}</Badge>
                  {transaction.taxDeductible && (
                    <Badge variant="outline" className="text-xs">Tax Deductible</Badge>
                  )}
                </div>
                <span className={`font-semibold ${transaction.type === "income" ? "text-primary" : "text-destructive"}`}>
                  {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function RemindersView() {
  return (
    <div className="space-y-4">
      <ReminderItem title="Q1 Tax Payment Due" date="March 31, 2025" priority="high" daysLeft={79} />
      <ReminderItem title="Submit Self-Assessment Report" date="March 15, 2025" priority="medium" daysLeft={63} />
      <ReminderItem title="Renew Business Registration" date="April 30, 2025" priority="low" daysLeft={109} />
    </div>
  )
}

function TransactionItem({ type, description, amount, date }: { type: "income" | "expense"; description: string; amount: string; date: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
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

function ReminderItem({ title, date, priority, daysLeft }: { title: string; date: string; priority: "high" | "medium" | "low"; daysLeft: number }) {
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
      <Badge variant="secondary" className="bg-white/50">{daysLeft} days</Badge>
    </div>
  )
}

function TaxBreakdownModalContent({ result }: { result: any }) {
  return (
    <>
      {/* Monthly Set-Aside Card */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border-2 border-primary/30 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Monthly Set-Aside</h3>
        </div>
        <p className="text-2xl font-bold text-primary">₦{result.monthlySetAside.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1">Save this amount each month for tax payments</p>
      </div>

      {/* Income Section */}
      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-sm mb-3">Income</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Gross Income</span>
            <span className="font-medium">₦{result.grossIncome.toLocaleString()}</span>
          </div>
          {result.businessExpenses > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Business Expenses</span>
              <span className="font-medium text-red-600">-₦{result.businessExpenses.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
            <span className="font-medium">Adjusted Gross Income</span>
            <span className="font-semibold">₦{result.adjustedGrossIncome.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Reliefs & Deductions */}
      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-sm mb-3">Tax Reliefs & Deductions</h3>
        <div className="space-y-2">
          {result.reliefs.rentRelief > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rent Relief (20%)</span>
              <span className="font-medium text-green-600">-₦{result.reliefs.rentRelief.toLocaleString()}</span>
            </div>
          )}
          {result.reliefs.pension > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pension Contribution</span>
              <span className="font-medium text-green-600">-₦{result.reliefs.pension.toLocaleString()}</span>
            </div>
          )}
          {result.reliefs.healthInsurance > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Health Insurance</span>
              <span className="font-medium text-green-600">-₦{result.reliefs.healthInsurance.toLocaleString()}</span>
            </div>
          )}
          {result.reliefs.lifeInsurance > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Life Insurance</span>
              <span className="font-medium text-green-600">-₦{result.reliefs.lifeInsurance.toLocaleString()}</span>
            </div>
          )}
          {result.reliefs.charitable > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Charitable Donations</span>
              <span className="font-medium text-green-600">-₦{result.reliefs.charitable.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
            <span className="font-medium">Total Reliefs</span>
            <span className="font-semibold text-green-600">-₦{result.totalReliefs.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Tax Calculation */}
      <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary/20 mb-4">
        <h3 className="font-semibold text-sm mb-3">Tax Calculation</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Taxable Income</span>
            <span className="font-medium">₦{result.taxableIncome.toLocaleString()}</span>
          </div>
          {result.taxBrackets.map((bracket: any, index: number) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {bracket.rate === 0 ? "Tax-free" : `${bracket.rate}% on`} ₦{bracket.amount.toLocaleString()}
              </span>
              <span className="font-medium">{bracket.rate === 0 ? "₦0" : `₦${bracket.tax.toLocaleString()}`}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 border-t-2 border-primary/20">
            <span className="font-semibold text-base">Total Tax Payable</span>
            <span className="font-bold text-xl text-primary">₦{result.totalTax.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Quarterly Breakdown */}
      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-sm mb-3">Quarterly Payment Schedule</h3>
        <div className="grid grid-cols-2 gap-3">
          {result.quarterlyPayments.map((payment: any, index: number) => (
            <div key={index} className="bg-background rounded p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{payment.quarter}</p>
              <p className="font-semibold">₦{payment.amount.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        <Button variant="outline" className="flex-1 bg-transparent">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
        <Button className="flex-1">
          <FileText className="w-4 h-4 mr-2" />
          Save Calculation
        </Button>
      </div>
    </>
  )
}
