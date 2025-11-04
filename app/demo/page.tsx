"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { calculateNigerianTax } from "@/lib/tax-calculator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Calculator, TrendingUp, TrendingDown, FileText, Bell, ArrowRight, CheckCircle2, Loader2, Sparkles, LayoutDashboard, Receipt, Settings, Menu, X, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Search, Filter, Building2, User, Users, DollarSign, Mail, Download, Wallet, Clock, AlertCircle, MoreVertical, Plus } from "lucide-react"
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
  const [businessType, setBusinessType] = useState<"freelancer" | "creator" | "small-business">("freelancer")
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
            <StatsCards businessType={businessType} />
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RecentTransactions businessType={businessType} />
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
        return <RemindersView onAddReminder={() => setShowWaitlistModal(true)} />
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
                {/* Business Type Toggle - Show on dashboard and transactions pages */}
                {(activeSection === "dashboard" || activeSection === "transactions") && (
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
                      variant={businessType === "creator" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setBusinessType("creator")}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="hidden sm:inline">Creator</span>
                    </Button>
                    <Button
                      variant={businessType === "small-business" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setBusinessType("small-business")}
                      className="flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Small Business</span>
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
        <div className={`fixed bottom-0 left-0 right-0 border-t border-border bg-primary text-primary-foreground p-4 transition-all duration-300 ${sidebarCollapsed ? "md:left-16" : "md:left-64"}`}>
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

function StatsCards({ businessType }: { businessType: "freelancer" | "creator" | "small-business" }) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.keys(dropdownRefs.current).forEach((key) => {
        const ref = dropdownRefs.current[key]
        if (ref && !ref.contains(event.target as Node)) {
          if (openDropdown === key) {
            setOpenDropdown(null)
          }
        }
      })
    }

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdown])

  // Calculate actual tax amounts using the tax calculator
  const calculateTax = (income: number, expenses: number, rentPaid: number = 0) => {
    const result = calculateNigerianTax({
      businessType: businessType === "small-business" ? "sme" : businessType,
      income: income,
      period: "yearly",
      rentPaid: rentPaid,
      pensionContribution: 0,
      healthInsurance: 0,
      housingFund: 0,
      lifeInsurance: 0,
      charitableDonations: 0,
      businessExpenses: expenses,
      dependents: 0,
    })
    return result
  }

  // Freelancer calculations
  const freelancerIncome = 2450000
  const freelancerExpenses = 890000
  const freelancerRent = 480000 // From breakdown
  const freelancerTaxResult = calculateTax(freelancerIncome, freelancerExpenses, freelancerRent)
  const freelancerTax = Math.round(freelancerTaxResult.totalTax)

  // Creator calculations
  const creatorIncome = 4200000
  const creatorExpenses = 1350000
  const creatorRent = 450000 // From breakdown
  const creatorTaxResult = calculateTax(creatorIncome, creatorExpenses, creatorRent)
  const creatorTax = Math.round(creatorTaxResult.totalTax)

  // Small Business calculations
  const smallBusinessIncome = 8500000
  const smallBusinessExpenses = 5200000
  const smallBusinessRent = 780000 // From breakdown (Office Rent & Utilities)
  const smallBusinessTaxResult = calculateTax(smallBusinessIncome, smallBusinessExpenses, smallBusinessRent)
  const smallBusinessTax = Math.round(smallBusinessTaxResult.totalTax)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('NGN', '₦')
  }

  const freelancerStats = [
    { 
      id: "total-income",
      label: "Total Income", 
      value: "₦2,450,000", 
      change: "+12.5%", 
      trend: "up", 
      icon: ArrowUpRight, 
      color: "text-primary",
      barColor: "bg-primary",
      breakdown: [
        { label: "Client Payments", value: "₦1,200,000", percentage: 49 },
        { label: "Consulting Services", value: "₦850,000", percentage: 35 },
        { label: "Freelance Projects", value: "₦400,000", percentage: 16 },
      ]
    },
    { 
      id: "total-expenses",
      label: "Total Expenses", 
      value: "₦890,000", 
      change: "+8.2%", 
      trend: "up", 
      icon: ArrowDownRight, 
      color: "text-destructive",
      barColor: "bg-destructive",
      breakdown: [
        { label: "Office Rent", value: "₦480,000", percentage: 54 },
        { label: "Software Subscriptions", value: "₦140,000", percentage: 16 },
        { label: "Business Expenses", value: "₦270,000", percentage: 30 },
      ]
    },
    { 
      id: "net-profit",
      label: "Net Profit", 
      value: "₦1,560,000", 
      change: "+15.3%", 
      trend: "up", 
      icon: TrendingUp, 
      color: "text-chart-3",
      barColor: "bg-green-500",
      breakdown: [
        { label: "After Expenses", value: "₦1,560,000", percentage: 100 },
      ]
    },
    { 
      id: "tax-payable",
      label: "Tax Payable", 
      value: formatCurrency(Math.round(freelancerTax / 4)), 
      change: "Q1 2025", 
      trend: "neutral", 
      icon: Calculator, 
      color: "text-accent",
      barColor: "bg-accent",
      breakdown: null, // Will be populated dynamically with tax calculation
      taxCalculation: freelancerTaxResult,
    },
  ]

  const creatorStats = [
    { 
      id: "total-income",
      label: "Total Income", 
      value: "₦4,200,000", 
      change: "+28.5%", 
      trend: "up", 
      icon: ArrowUpRight, 
      color: "text-primary",
      barColor: "bg-primary",
      breakdown: [
        { label: "Brand Sponsorships", value: "₦1,700,000", percentage: 40 },
        { label: "YouTube Ad Revenue", value: "₦1,260,000", percentage: 30 },
        { label: "Instagram Brand Deals", value: "₦840,000", percentage: 20 },
        { label: "TikTok Creator Fund", value: "₦400,000", percentage: 10 },
      ]
    },
    { 
      id: "total-expenses",
      label: "Total Expenses", 
      value: "₦1,350,000", 
      change: "+15.2%", 
      trend: "up", 
      icon: ArrowDownRight, 
      color: "text-destructive",
      barColor: "bg-destructive",
      breakdown: [
        { label: "Video Equipment", value: "₦560,000", percentage: 41 },
        { label: "Studio Rent", value: "₦450,000", percentage: 33 },
        { label: "Editing Software", value: "₦135,000", percentage: 10 },
        { label: "Marketing & Promotion", value: "₦205,000", percentage: 16 },
      ]
    },
    { 
      id: "net-profit",
      label: "Net Profit", 
      value: "₦2,850,000", 
      change: "+35.8%", 
      trend: "up", 
      icon: TrendingUp, 
      color: "text-chart-3",
      barColor: "bg-green-500",
      breakdown: [
        { label: "After Expenses", value: "₦2,850,000", percentage: 100 },
      ]
    },
    { 
      id: "tax-payable",
      label: "Tax Payable", 
      value: formatCurrency(Math.round(creatorTax / 4)), 
      change: "Q1 2025", 
      trend: "neutral", 
      icon: Calculator, 
      color: "text-accent",
      barColor: "bg-accent",
      breakdown: null, // Will be populated dynamically with tax calculation
      taxCalculation: creatorTaxResult,
    },
  ]

  const smallBusinessStats = [
    { 
      id: "total-revenue",
      label: "Total Revenue", 
      value: "₦8,500,000", 
      change: "+22.3%", 
      trend: "up", 
      icon: ArrowUpRight, 
      color: "text-primary",
      barColor: "bg-primary",
      breakdown: [
        { label: "Product Sales", value: "₦5,100,000", percentage: 60 },
        { label: "Service Revenue", value: "₦2,550,000", percentage: 30 },
        { label: "Consulting Services", value: "₦850,000", percentage: 10 },
      ]
    },
    { 
      id: "total-expenses",
      label: "Total Expenses", 
      value: "₦5,200,000", 
      change: "+18.5%", 
      trend: "up", 
      icon: ArrowDownRight, 
      color: "text-destructive",
      barColor: "bg-destructive",
      breakdown: [
        { label: "Employee Salaries", value: "₦2,550,000", percentage: 49 },
        { label: "Inventory Purchase", value: "₦1,560,000", percentage: 30 },
        { label: "Office Rent & Utilities", value: "₦780,000", percentage: 15 },
        { label: "Marketing Campaign", value: "₦310,000", percentage: 6 },
      ]
    },
    { 
      id: "net-profit",
      label: "Net Profit", 
      value: "₦3,300,000", 
      change: "+30.1%", 
      trend: "up", 
      icon: TrendingUp, 
      color: "text-chart-3",
      barColor: "bg-green-500",
      breakdown: [
        { label: "After Expenses", value: "₦3,300,000", percentage: 100 },
      ]
    },
    { 
      id: "tax-payable",
      label: "Tax Payable", 
      value: formatCurrency(Math.round(smallBusinessTax / 4)), 
      change: "Q1 2025", 
      trend: "neutral", 
      icon: Calculator, 
      color: "text-accent",
      barColor: "bg-accent",
      breakdown: null, // Will be populated dynamically with tax calculation
      taxCalculation: smallBusinessTaxResult,
    },
  ]

  const stats = businessType === "freelancer" ? freelancerStats : businessType === "creator" ? creatorStats : smallBusinessStats

  const handleCardClick = (statId: string) => {
    setOpenDropdown(openDropdown === statId ? null : statId)
  }

  const handleCardHover = (statId: string | null) => {
    setHoveredCard(statId)
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const isOpen = openDropdown === stat.id
        const isHovered = hoveredCard === stat.id
        const showDropdown = isOpen || isHovered

        // Determine if this card is in the last column(s) to position dropdown correctly
        // For 4-column grid on large screens, last 2 cards should align right
        // For 2-column grid on medium screens, last card should align right
        const isLastColumn = index % 4 === 3 || index % 4 === 2 // Last 2 columns in 4-col grid
        const isLastInRow = index % 2 === 1 // Last in 2-col grid

        return (
          <div 
            key={stat.id} 
            className="relative"
            onMouseEnter={() => !isOpen && handleCardHover(stat.id)}
            onMouseLeave={() => !isOpen && handleCardHover(null)}
            ref={(el) => {
              dropdownRefs.current[stat.id] = el
            }}
          >
            <Card 
              className={`p-6 cursor-pointer transition-all ${isOpen ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleCardClick(stat.id)}
            >
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

            {/* Breakdown Dropdown */}
            {showDropdown && (
              <div 
                className={`absolute z-50 mt-2 bg-popover border border-border rounded-lg shadow-lg p-4 animate-in fade-in-0 zoom-in-95 ${
                  stat.id === "tax-payable" ? "w-[450px]" : "w-[320px]"
                } ${
                  isLastColumn || isLastInRow ? "right-0" : "left-0"
                }`}
                onMouseEnter={() => handleCardHover(stat.id)}
                onMouseLeave={() => !isOpen && handleCardHover(null)}
              >
                {stat.id === "tax-payable" && stat.taxCalculation ? (
                  <TaxCalculationBreakdown calculation={stat.taxCalculation} formatCurrency={formatCurrency} />
                ) : (
                  <>
                    <h4 className="font-semibold text-sm mb-3">{stat.label} Breakdown</h4>
                    <div className="space-y-3">
                      {stat.breakdown?.map((item, index) => (
                        <div key={index} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-medium">{item.value}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${stat.barColor}`}
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{item.percentage}%</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TaxCalculationBreakdown({ calculation, formatCurrency }: { calculation: any, formatCurrency: (amount: number) => string }) {
  const hasReliefs = calculation.totalReliefs > 0
  const reliefs = calculation.reliefs

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm mb-3">Tax Calculation Breakdown</h4>
      
      {/* Income and Expenses */}
      <div className="space-y-2 border-b pb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Gross Income</span>
          <span className="font-medium">{formatCurrency(calculation.grossIncome)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Business Expenses</span>
          <span className="font-medium text-destructive">-{formatCurrency(calculation.businessExpenses)}</span>
        </div>
        <div className="flex items-center justify-between text-sm font-medium pt-1 border-t">
          <span>Adjusted Gross Income</span>
          <span>{formatCurrency(calculation.adjustedGrossIncome)}</span>
        </div>
      </div>

      {/* Reliefs */}
      {hasReliefs && (
        <div className="space-y-2 border-b pb-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Tax Reliefs:</p>
          {reliefs.rentRelief > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Rent Relief (20%)</span>
              <span className="text-primary">-{formatCurrency(reliefs.rentRelief)}</span>
            </div>
          )}
          {reliefs.pension > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Pension Contribution</span>
              <span className="text-primary">-{formatCurrency(reliefs.pension)}</span>
            </div>
          )}
          {reliefs.healthInsurance > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Health Insurance</span>
              <span className="text-primary">-{formatCurrency(reliefs.healthInsurance)}</span>
            </div>
          )}
          {reliefs.housingFund > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Housing Fund</span>
              <span className="text-primary">-{formatCurrency(reliefs.housingFund)}</span>
            </div>
          )}
          {reliefs.lifeInsurance > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Life Insurance</span>
              <span className="text-primary">-{formatCurrency(reliefs.lifeInsurance)}</span>
            </div>
          )}
          {reliefs.charitable > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Charitable Donations</span>
              <span className="text-primary">-{formatCurrency(reliefs.charitable)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm font-medium pt-1 border-t">
            <span>Total Reliefs</span>
            <span className="text-primary">-{formatCurrency(calculation.totalReliefs)}</span>
          </div>
        </div>
      )}

      {/* Taxable Income */}
      <div className="space-y-2 border-b pb-3">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Taxable Income</span>
          <span>{formatCurrency(calculation.taxableIncome)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Effective Rate: {calculation.effectiveRate}%
        </p>
      </div>

      {/* Tax Brackets */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground mb-2">Tax by Bracket:</p>
        {calculation.taxBrackets.map((bracket: any, index: number) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              ₦{bracket.amount.toLocaleString()} × {bracket.rate}%
            </span>
            <span className="font-medium">{formatCurrency(Math.round(bracket.tax))}</span>
          </div>
        ))}
      </div>

      {/* Total Tax */}
      <div className="pt-3 border-t space-y-2">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Annual Tax Payable</span>
          <span className="text-accent">{formatCurrency(calculation.totalTax)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Quarterly Payment</span>
          <span>{formatCurrency(Math.round(calculation.totalTax / 4))}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Monthly Set Aside</span>
          <span>{formatCurrency(Math.round(calculation.monthlySetAside))}</span>
        </div>
      </div>
    </div>
  )
}

function RecentTransactions({ businessType }: { businessType: "freelancer" | "creator" | "small-business" }) {
  const freelancerTransactions = [
    { type: "income" as const, description: "Client Payment - Website Design", amount: "₦450,000", date: "Jan 15, 2025" },
    { type: "expense" as const, description: "Office Rent", amount: "₦120,000", date: "Jan 10, 2025" },
    { type: "income" as const, description: "Consulting Services", amount: "₦280,000", date: "Jan 8, 2025" },
    { type: "expense" as const, description: "Software Subscriptions", amount: "₦35,000", date: "Jan 5, 2025" },
  ]

  const creatorTransactions = [
    { type: "income" as const, description: "Brand Sponsorship - Tech Review", amount: "₦850,000", date: "Jan 15, 2025" },
    { type: "income" as const, description: "YouTube Ad Revenue", amount: "₦420,000", date: "Jan 12, 2025" },
    { type: "expense" as const, description: "Video Equipment Purchase", amount: "₦280,000", date: "Jan 10, 2025" },
    { type: "income" as const, description: "Instagram Brand Deal", amount: "₦350,000", date: "Jan 8, 2025" },
    { type: "expense" as const, description: "Video Editing Software", amount: "₦45,000", date: "Jan 5, 2025" },
  ]

  const smallBusinessTransactions = [
    { type: "income" as const, description: "Product Sales - Q1 2025", amount: "₦2,500,000", date: "Jan 15, 2025" },
    { type: "expense" as const, description: "Employee Salaries", amount: "₦850,000", date: "Jan 10, 2025" },
    { type: "expense" as const, description: "Inventory Purchase", amount: "₦1,200,000", date: "Jan 8, 2025" },
    { type: "income" as const, description: "Service Revenue", amount: "₦680,000", date: "Jan 5, 2025" },
    { type: "expense" as const, description: "Office Rent & Utilities", amount: "₦350,000", date: "Jan 3, 2025" },
  ]

  const transactions = businessType === "freelancer" 
    ? freelancerTransactions 
    : businessType === "creator" 
    ? creatorTransactions 
    : smallBusinessTransactions

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        <div className="space-y-4">
          {transactions.map((transaction, index) => (
            <TransactionItem 
              key={index}
              type={transaction.type} 
              description={transaction.description} 
              amount={transaction.amount} 
              date={transaction.date} 
            />
          ))}
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
  businessType: "freelancer" | "creator" | "small-business"
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

  const creatorTransactions = [
    { id: 1, type: "income" as const, description: "Brand Sponsorship - Tech Review", amount: 850000, date: "Jan 15, 2025", category: "Sponsorships", paymentMethod: "Bank Transfer", taxDeductible: false },
    { id: 2, type: "income" as const, description: "YouTube Ad Revenue", amount: 420000, date: "Jan 12, 2025", category: "Ad Revenue", paymentMethod: "Bank Transfer", taxDeductible: false },
    { id: 3, type: "expense" as const, description: "Video Equipment Purchase", amount: 280000, date: "Jan 10, 2025", category: "Equipment", paymentMethod: "Card", taxDeductible: true },
    { id: 4, type: "income" as const, description: "Instagram Brand Deal", amount: 350000, date: "Jan 8, 2025", category: "Brand Deals", paymentMethod: "Bank Transfer", taxDeductible: false },
    { id: 5, type: "expense" as const, description: "Video Editing Software", amount: 45000, date: "Jan 5, 2025", category: "Software", paymentMethod: "Card", taxDeductible: true },
    { id: 6, type: "income" as const, description: "TikTok Creator Fund", amount: 185000, date: "Jan 3, 2025", category: "Platform Revenue", paymentMethod: "Bank Transfer", taxDeductible: false },
    { id: 7, type: "expense" as const, description: "Studio Rent", amount: 150000, date: "Jan 1, 2025", category: "Rent", paymentMethod: "Bank Transfer", taxDeductible: true },
  ]

  const smallBusinessTransactions = [
    { id: 1, type: "income" as const, description: "Product Sales", amount: 2500000, date: "Jan 15, 2025", category: "Sales Revenue", paymentMethod: "Bank Transfer", taxDeductible: false },
    { id: 2, type: "expense" as const, description: "Employee Salaries", amount: 850000, date: "Jan 10, 2025", category: "Payroll", paymentMethod: "Bank Transfer", taxDeductible: true },
    { id: 3, type: "expense" as const, description: "Office Supplies", amount: 125000, date: "Jan 8, 2025", category: "Operations", paymentMethod: "Card", taxDeductible: true },
    { id: 4, type: "income" as const, description: "Service Revenue", amount: 1200000, date: "Jan 5, 2025", category: "Services", paymentMethod: "Bank Transfer", taxDeductible: false },
    { id: 5, type: "expense" as const, description: "Marketing Campaign", amount: 450000, date: "Jan 3, 2025", category: "Marketing", paymentMethod: "Card", taxDeductible: true },
    { id: 6, type: "expense" as const, description: "Inventory Purchase", amount: 1200000, date: "Jan 2, 2025", category: "Inventory", paymentMethod: "Bank Transfer", taxDeductible: true },
    { id: 7, type: "income" as const, description: "Consulting Services", amount: 680000, date: "Jan 1, 2025", category: "Services", paymentMethod: "Bank Transfer", taxDeductible: false },
  ]

  const transactions = businessType === "freelancer" 
    ? freelancerTransactions 
    : businessType === "creator" 
    ? creatorTransactions 
    : smallBusinessTransactions

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
                  ) : businessType === "creator" ? (
                    <>
                      <SelectItem value="Sponsorships">Sponsorships</SelectItem>
                      <SelectItem value="Ad Revenue">Ad Revenue</SelectItem>
                      <SelectItem value="Brand Deals">Brand Deals</SelectItem>
                      <SelectItem value="Platform Revenue">Platform Revenue</SelectItem>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                      <SelectItem value="Software">Software</SelectItem>
                      <SelectItem value="Rent">Rent</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Sales Revenue">Sales Revenue</SelectItem>
                      <SelectItem value="Payroll">Payroll</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Services">Services</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Inventory">Inventory</SelectItem>
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

interface RemindersViewProps {
  onAddReminder: () => void
}

function RemindersView({ onAddReminder }: RemindersViewProps) {
  const [selectedReminders, setSelectedReminders] = useState<Set<string>>(new Set())
  
  // Demo reminder data matching the image
  const upcomingReminders = [
    {
      id: "1",
      title: "Ask for salary",
      description: "Yes for salary",
      date: "10/31/2025",
      priority: "medium",
      status: "overdue",
      isCompleted: false
    },
    {
      id: "2",
      title: "Tax Me",
      description: "no no",
      date: "10/31/2025",
      priority: "medium",
      status: "overdue",
      isCompleted: false
    }
  ]

  const completedReminders: typeof upcomingReminders = [
    {
      id: "3",
      title: "Annual Tax Filing",
      description: "Submit annual tax return for 2024",
      date: "01/15/2025",
      priority: "high",
      status: "completed",
      isCompleted: true
    }
  ]

  const stats = {
    total: 3,
    upcoming: 0,
    completed: 1,
    overdue: 2
  }

  const toggleSelection = (reminderId: string) => {
    setSelectedReminders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reminderId)) {
        newSet.delete(reminderId)
      } else {
        newSet.add(reminderId)
      }
      return newSet
    })
  }

  const selectAll = (reminderList: typeof upcomingReminders) => {
    setSelectedReminders(prev => {
      const newSet = new Set(prev)
      reminderList.forEach(r => newSet.add(r.id))
      return newSet
    })
  }

  const deselectAll = () => {
    setSelectedReminders(new Set())
  }

  return (
    <div className="space-y-6 mb-10">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reminders</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your tax deadlines and important dates</p>
        </div>
        <Button onClick={onAddReminder}>
          <Plus className="w-4 h-4 mr-2" />
          Add Reminder
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Reminders</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 bg-blue-100 dark:bg-blue-900/30">
              <Bell className="w-6 h-6" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Upcoming</p>
              <p className="text-3xl font-bold">{stats.upcoming}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-orange-600 bg-orange-100 dark:bg-orange-900/30">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Completed</p>
              <p className="text-3xl font-bold">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-green-600 bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Overdue</p>
              <p className="text-3xl font-bold">{stats.overdue}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-red-600 bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Reminders */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Upcoming Reminders</h2>
              <p className="text-sm text-muted-foreground mt-1">Your scheduled reminders and deadlines</p>
            </div>
            {upcomingReminders.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => selectedReminders.size === upcomingReminders.length ? deselectAll() : selectAll(upcomingReminders)}
              >
                {selectedReminders.size === upcomingReminders.length ? "Clear" : "Select All"}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {upcomingReminders.map((reminder) => {
            const priorityColors = {
              high: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
              medium: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
              low: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
            }
            
            return (
              <div
                key={reminder.id}
                className={`flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors ${
                  selectedReminders.has(reminder.id) ? 'bg-muted/50 border-primary' : ''
                }`}
              >
                <Checkbox 
                  id={`reminder-${reminder.id}`} 
                  className="mt-1" 
                  checked={selectedReminders.has(reminder.id)}
                  onCheckedChange={() => toggleSelection(reminder.id)}
                />
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${priorityColors[reminder.priority as keyof typeof priorityColors]}`}>
                  <Bell className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-medium text-sm">{reminder.title}</h3>
                    <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                      {reminder.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">{reminder.date}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-red-600 dark:text-red-400">{reminder.status === "overdue" ? "Overdue" : ""}</span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Completed Reminders */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Completed Reminders</h2>
              <p className="text-sm text-muted-foreground mt-1">Your completed tasks and deadlines</p>
            </div>
            {completedReminders.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => selectedReminders.size === completedReminders.length ? deselectAll() : selectAll(completedReminders as any)}
              >
                {selectedReminders.size === completedReminders.length ? "Clear" : "Select All"}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {completedReminders.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No completed reminders</p>
            </div>
          ) : (
            completedReminders.map((reminder) => {
              return (
                <div 
                  key={reminder.id} 
                  className={`flex items-start gap-4 p-4 border border-border rounded-lg opacity-60 ${
                    selectedReminders.has(reminder.id) ? 'bg-muted/50 border-primary opacity-100' : ''
                  }`}
                >
                  <Checkbox 
                    id={`reminder-${reminder.id}`} 
                    checked={selectedReminders.has(reminder.id)}
                    className="mt-1"
                    onCheckedChange={() => toggleSelection(reminder.id)}
                  />
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    <Bell className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-through">{reminder.title}</h3>
                    {reminder.description && (
                      <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{reminder.date}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-green-600 dark:text-green-400">Completed</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })
          )}
        </div>
      </Card>
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
          {/* Income Breakdown by Source */}
          {result.incomeBreakdown && result.incomeBreakdown.length > 0 && (
            <div className="mb-3 pb-3 border-b border-border">
              <p className="text-xs text-muted-foreground mb-2">Income Sources:</p>
              <div className="space-y-1.5">
                {result.incomeBreakdown.map((source: any, index: number) => {
                  const allTypes = [
                    { value: "salary", label: "Salary (PAYE)" },
                    { value: "bonus", label: "Bonus" },
                    { value: "allowance", label: "Allowances" },
                    { value: "freelance", label: "Freelance Work" },
                    { value: "consulting", label: "Consulting" },
                    { value: "contract", label: "Contract Work" },
                    { value: "sponsorship", label: "Brand Sponsorships" },
                    { value: "ad_revenue", label: "Ad Revenue" },
                    { value: "affiliate", label: "Affiliate Income" },
                    { value: "brand_deal", label: "Brand Deals" },
                    { value: "content_licensing", label: "Content Licensing" },
                    { value: "merchandise", label: "Merchandise Sales" },
                    { value: "subscription", label: "Subscription Revenue" },
                    { value: "courses", label: "Online Courses/Coaching" },
                    { value: "events", label: "Events & Speaking" },
                    { value: "business_income", label: "Business Income" },
                    { value: "sales", label: "Product/Service Sales" },
                    { value: "rental", label: "Rental Income" },
                    { value: "investment", label: "Investment Income" },
                    { value: "dividends", label: "Dividends" },
                    { value: "other", label: "Other Income" },
                  ]
                  const typeLabel = allTypes.find(t => t.value === source.type)?.label || source.type.replace(/_/g, " ")
                  return (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {typeLabel}
                      </span>
                      <span className="font-medium">₦{source.amount.toLocaleString()}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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
          {result.reliefs.housingFund > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">National Housing Fund (NHF)</span>
              <span className="font-medium text-green-600">-₦{result.reliefs.housingFund.toLocaleString()}</span>
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
