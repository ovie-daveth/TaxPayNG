"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calculator, ArrowRight, Loader2, Sparkles, LayoutDashboard, Receipt, Settings, Menu, X, ChevronLeft, ChevronRight, Building2, User, Users } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/firebase/firebase"
import { collection, setDoc, doc, query, getDocs, where } from "firebase/firestore"
import { TaxCalculatorForm } from "@/components/tax-calculator/form/tax-calculator-form"
import { TaxRatesInfo } from "@/components/tax-calculator/tax-rates-info"
import { ThemeToggle } from "@/components/theme-toggle"
import OtaxLogo from "@/components/OtaxLogo"
import { StatsCards } from "./components/stats-cards"
import { RecentTransactions } from "./components/recent-transactions"
import { UpcomingReminders } from "./components/upcoming-reminders"
import { TransactionsView } from "./components/transactions-view"
import { RemindersView } from "./components/reminders-view"
import { TaxBreakdownModalContent } from "./components/tax-breakdown-modal-content"
import { EmployeesView } from "./components/employees-view"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  available: boolean
  smallBusinessOnly?: boolean
}

const navItems: NavItem[] = [
  { href: "#dashboard", label: "Dashboard", icon: LayoutDashboard, available: true },
  { href: "#transactions", label: "Transactions", icon: Receipt, available: true },
  { href: "#tax-calculator", label: "Tax Calculator", icon: Calculator, available: true },
  { href: "#employees", label: "Employees", icon: Users, available: true, smallBusinessOnly: true },
  { href: "#documents", label: "Documents", icon: Settings, available: false },
  { href: "#reminders", label: "Reminders", icon: Receipt, available: true },
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
      case "employees":
        return <EmployeesView />
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
            // Hide employees section if not small business
            if (item.smallBusinessOnly && businessType !== "small-business") {
              return null
            }
            
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
              // Hide employees section if not small business
              if (item.smallBusinessOnly && businessType !== "small-business") {
                return null
              }
              
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
                  {activeSection === "employees" && "Employees"}
                  {activeSection === "reminders" && "Reminders"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeSection === "dashboard" && "Welcome to OTax Demo Mode"}
                  {activeSection === "transactions" && "View sample transaction data"}
                  {activeSection === "tax-calculator" && "Try the tax calculator"}
                  {activeSection === "employees" && "Manage employee payroll and PAYE"}
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
                <Loader2 className="w-8 h-8 text-green-600" />
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
                  placeholder="Phone Number (optional e.g., 08012345678)"
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
