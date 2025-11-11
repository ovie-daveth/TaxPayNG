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
import { TaxBreakdownModalContent } from "./components/tax-breakdown-modal-content"
import { EmployeesView } from "./components/employees-view"
import { StatsCards } from "./components/stats-cards"
import { RecentTransactions } from "./components/recent-transactions"
import { UpcomingReminders } from "./components/upcoming-reminders"
import { TransactionsView } from "./components/transactions-view"
import { RemindersView } from "./components/reminders-view"
import { ThemeToggle } from "@/components/theme-toggle"
import { TokenInputDialog } from "@/components/waitlist/token-input-dialog"
import OtaxLogo from "@/components/OtaxLogo"
import { sendWaitlistVerification } from "@/lib/utils/emailVerification"
import { TaxRatesInfo } from "@/components/tax-calculator/tax-rates-info"
import { AnalyticsInsights } from "@/components/dashboard/analytics-insights"

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
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [pendingEmail, setPendingEmail] = useState("")
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

      // Send verification token via email
      const verificationToast = toast.loading("Sending verification code...")
      const verificationResult = await sendWaitlistVerification(
        waitlistData.email.trim(),
        waitlistData.name.trim(),
        waitlistData.phone
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

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="space-y-4 sm:space-y-4 md:space-y-5 lg:space-y-6">
            <StatsCards businessType={businessType} sidebarCollapsed={sidebarCollapsed} useMockData />
            <div className={`grid ${sidebarCollapsed ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'} gap-4 sm:gap-4 md:gap-5 lg:gap-6`}>
              <div className={`${sidebarCollapsed ? 'lg:col-span-2' : 'xl:col-span-2 lg:col-span-1'}`}>
                <RecentTransactions businessType={businessType} />
              </div>
              <div>
                <UpcomingReminders />
              </div>
            </div>

            <AnalyticsInsights businessType={businessType === "small-business" ? "freelancer" : businessType} useMockData />
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
            sidebarCollapsed={sidebarCollapsed}
          />
        )
      case "tax-calculator":
        return (
          <>
            <div className={`flex flex-col lg:flex-row lg:items-start gap-6 w-full ${sidebarCollapsed ? 'md:max-w-3xl lg:max-w-5xl' : 'lg:max-w-6xl'} mx-auto`}>
              <div className="flex-1 min-w-0">
                <TaxCalculatorForm 
                  onCalculate={(result) => {
                    setTaxResult(result)
                    setShowTaxResults(true)
                  }} 
                />
              </div>
              <div className="hidden lg:block w-full max-w-sm">
                <TaxRatesInfo />
              </div>
            </div>

            {/* Tax Results Modal */}
            <Dialog open={showTaxResults} onOpenChange={setShowTaxResults}>
              <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
                {taxResult && (
                  <>
                    <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-border">
                      <DialogTitle className="text-xl sm:text-2xl font-bold">Tax Calculation Results</DialogTitle>
                      <DialogDescription className="text-xs sm:text-sm">Your detailed tax breakdown and payment schedule</DialogDescription>
                    </DialogHeader>
                    <div className="px-4 sm:px-6 py-4 sm:py-6">
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
          <div className="flex items-center justify-center h-48 sm:h-64 border-2 border-dashed border-muted rounded-lg p-4">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">Feature Coming Soon</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">This feature is not available in demo mode</p>
              <Button onClick={() => setShowWaitlistModal(true)} size="sm" className="text-xs sm:text-sm">
                Join Waitlist
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background mb-16 sm:mb-20 md:mb-10">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex fixed left-0 top-0 h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out ${sidebarCollapsed ? "w-16" : "w-64"}`}>
        <div className="p-4 sm:p-5 md:p-6 border-b border-border flex items-center justify-between">
          <Link href="/" className={`flex items-center gap-2 transition-all duration-300 ${sidebarCollapsed && "justify-center"}`}>
            {!sidebarCollapsed && (
              <>
               <OtaxLogo />
                <Badge variant="secondary" className="ml-2 text-xs">Demo</Badge>
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

        <nav className="flex-1 p-3 sm:p-4 space-y-2 sm:space-y-4 md:space-y-8 overflow-y-auto">
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
                className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 my-1 sm:my-2 md:my-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive && item.available
                    ? "bg-primary text-primary-foreground"
                    : item.available
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                    : "text-muted-foreground opacity-50 cursor-not-allowed"
                } ${sidebarCollapsed && "justify-center px-2"}`}
                title={sidebarCollapsed ? item.label : undefined}
                disabled={!item.available}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="whitespace-nowrap transition-opacity duration-300">
                    {item.label}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-3 sm:p-4 border-t border-border">
          <Button 
            variant="ghost" 
            className={`w-full text-muted-foreground transition-all duration-200 text-xs sm:text-sm ${sidebarCollapsed ? "justify-center px-2" : "justify-start"}`} 
            size="sm"
            title={sidebarCollapsed ? "Join Waitlist" : undefined}
            onClick={() => setShowWaitlistModal(true)}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
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
        <div className="flex items-center justify-between p-3 sm:p-4">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center">
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-base sm:text-lg">OTax</span>
            <Badge variant="secondary" className="ml-1.5 sm:ml-2 text-xs">Demo</Badge>
          </Link>
          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="border-t border-border p-3 sm:p-4 space-y-1 max-h-[calc(100vh-60px)] overflow-y-auto">
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
                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive && item.available
                      ? "bg-primary text-primary-foreground"
                      : item.available
                      ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                      : "text-muted-foreground opacity-50 cursor-not-allowed"
                  }`}
                  disabled={!item.available}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              )
            })}
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground mt-3 sm:mt-4 text-sm" 
              size="sm"
              onClick={() => setShowWaitlistModal(true)}
            >
              <Sparkles className="w-4 h-4 mr-2 flex-shrink-0" />
              Join Waitlist
            </Button>
            
            {/* Theme Toggle - Show in mobile menu */}
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className={`container mx-auto px-4 sm:px-5 md:px-6 ${sidebarCollapsed ? 'lg:px-8' : 'xl:px-8 lg:px-6'} py-3 sm:py-4 max-w-7xl`}>
            <div className={`flex flex-col ${sidebarCollapsed ? 'md:flex-row' : 'lg:flex-row'}  md:justify-between gap-3 sm:gap-4`}>
              <div className="flex-1 min-w-0">
                <h1 className={`text-xl ${sidebarCollapsed ? 'md:text-2xl' : 'lg:text-2xl'} font-bold`}>
                  {activeSection === "dashboard" && "Dashboard"}
                  {activeSection === "transactions" && "Transactions"}
                  {activeSection === "tax-calculator" && "Tax Calculator"}
                  {activeSection === "employees" && "Employees"}
                  {activeSection === "reminders" && "Reminders"}
                </h1>
                <p className={`text-xs ${sidebarCollapsed ? 'md:text-sm' : 'lg:text-sm'} text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2`}>
                  {activeSection === "dashboard" && "Welcome to OTax Demo Mode"}
                  {activeSection === "transactions" && "View sample transaction data"}
                  {activeSection === "tax-calculator" && "Try the tax calculator"}
                  {activeSection === "employees" && "Manage employee payroll and PAYE"}
                  {activeSection === "reminders" && "Sample tax deadlines"}
                </p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 flex-wrap">
                {/* Business Type Toggle - Show on dashboard and transactions pages */}
                {(activeSection === "dashboard" || activeSection === "transactions") && (
                  <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 bg-muted p-0.5 sm:p-1 rounded-lg">
                    <Button
                      variant={businessType === "freelancer" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setBusinessType("freelancer")}
                      className={`flex items-center gap-1 text-xs md:text-sm h-8 md:h-9 px-1.5 sm:px-2 md:px-3 ${!sidebarCollapsed ? 'xl:px-3' : 'lg:px-3'}`}
                      title="Freelancer"
                    >
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Freelancer</span>
                      <span className="sm:hidden">Free.</span>
                    </Button>
                    <Button
                      variant={businessType === "creator" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setBusinessType("creator")}
                      className={`flex items-center gap-1 text-xs md:text-sm h-8 md:h-9 px-1.5 sm:px-2 md:px-3 ${!sidebarCollapsed ? 'xl:px-3' : 'lg:px-3'}`}
                      title="Creator"
                    >
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Creator</span>
                      <span className="sm:hidden">Create.</span>
                    </Button>
                    <Button
                      variant={businessType === "small-business" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setBusinessType("small-business")}
                      className={`flex items-center gap-1 text-xs md:text-sm h-8 md:h-9 px-1.5 sm:px-2 md:px-3 ${!sidebarCollapsed ? 'xl:px-3' : 'lg:px-3'}`}
                      title="Small Business"
                    >
                      <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className={sidebarCollapsed ? "hidden xl:inline" : "hidden 2xl:inline sm:inline"}>Small Business</span>
                      <span className={sidebarCollapsed ? "xl:hidden lg:inline md:hidden" : "2xl:hidden xl:inline lg:hidden md:inline sm:hidden"}>SME</span>
                    </Button>
                  </div>
                )}
                <div className="hidden md:flex">
                  <ThemeToggle />
                </div>
                <Button size="sm" className={`hidden md:flex text-xs md:text-sm h-8 md:h-9 px-2 sm:px-3 md:px-4 ${!sidebarCollapsed ? 'xl:px-4' : 'lg:px-4'}`} onClick={() => setShowWaitlistModal(true)}>
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:mr-1.5 flex-shrink-0" />
                  <span className={sidebarCollapsed ? "hidden xl:inline" : "hidden 2xl:inline"}>Join Waitlist</span>
                  <span className={sidebarCollapsed ? "xl:hidden" : "2xl:hidden"}>Join</span>
                  <ArrowRight className={`ml-1 md:ml-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${sidebarCollapsed ? 'lg:inline md:hidden' : 'xl:inline lg:hidden'} hidden md:inline`} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className={`container mx-auto px-4 sm:px-5 md:px-6 ${sidebarCollapsed ? 'lg:px-8' : 'xl:px-8 lg:px-6'} py-4 sm:py-4 md:py-5 lg:py-6 max-w-7xl`}>
          {renderContent()}
        </main>

        {/* Demo Banner */}
        <div className={`fixed bottom-0 left-0 right-0 border-t border-border bg-primary text-primary-foreground p-3 sm:p-4 transition-all duration-300 ${sidebarCollapsed ? "md:left-16" : "md:left-64"} z-40`}>
          <div className={`container mx-auto px-4 sm:px-5 md:px-6 ${sidebarCollapsed ? 'lg:px-8' : 'xl:px-8 lg:px-6'} max-w-7xl`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <p className={`text-xs ${sidebarCollapsed ? 'sm:text-sm' : 'lg:text-sm'} font-medium text-center sm:text-left`}>
                  You're viewing the OTax demo. Join the waitlist for early access!
                </p>
              </div>
              <Button variant="secondary" size="sm" className={`text-xs ${sidebarCollapsed ? 'sm:text-sm' : 'lg:text-sm'} h-8 sm:h-9 whitespace-nowrap`} onClick={() => setShowWaitlistModal(true)}>
                <span className={sidebarCollapsed ? "hidden sm:inline" : "hidden lg:inline"}>Join Waitlist</span>
                <span className={sidebarCollapsed ? "sm:hidden" : "lg:hidden"}>Join</span>
                <ArrowRight className={`ml-1.5 sm:ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4 ${sidebarCollapsed ? 'hidden sm:inline' : 'hidden lg:inline'}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Waitlist Modal */}
      <Dialog open={showWaitlistModal} onOpenChange={setShowWaitlistModal}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-center">Join the Waitlist</DialogTitle>
            <DialogDescription className="text-center text-xs sm:text-sm">
              Be among the first to experience OTax
            </DialogDescription>
          </DialogHeader>

          {isSubmitted ? (
            <div className="text-center py-6 sm:py-8">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2">You're in!</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Thank you for joining our waitlist. We'll notify you as soon as we launch!
              </p>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={waitlistData.name}
                  onChange={(e) => setWaitlistData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={waitlistData.email}
                  onChange={(e) => setWaitlistData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>
              <div>
                <Input
                  type="tel"
                  placeholder="Phone Number (optional)"
                  value={waitlistData.phone}
                  onChange={(e) => setWaitlistData(prev => ({ ...prev, phone: e.target.value }))}
                  className="h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 sm:h-12 text-sm sm:text-base" 
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

      {/* Token Input Dialog */}
      <TokenInputDialog
        open={showTokenDialog}
        onOpenChange={setShowTokenDialog}
        email={pendingEmail}
        onVerified={() => {
          setIsSubmitted(true)
          setWaitlistData({ name: "", email: "", phone: "" })
          setShowTokenDialog(false)
        }}
      />
    </div>
  )
}
