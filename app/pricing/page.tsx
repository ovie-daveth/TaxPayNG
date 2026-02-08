"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Check, Loader2 } from "lucide-react"
import OtaxLogo from "@/components/OtaxLogo"
import Footer from "@/components/footer"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { useRouter } from "next/navigation"
import { MigrateToCreatorModal } from "@/components/subscription/migrate-to-creator-modal"
import { SubscriptionType } from "@/lib/types"
import { subscriptionService, getPlanPriceDisplay } from "@/lib/services/subscriptionService"
import { auth } from "@/firebase/firebase"
import { DEFAULT_FREE_TRIAL_DAYS, DEFAULT_YEARLY_DISCOUNT_PERCENT } from "@/lib/constants/pricing"

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth()
  const { profile } = useUserProfile()
  const router = useRouter()
  const [processingSubscription, setProcessingSubscription] = useState<string | null>(null)
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType | null>(null)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [pricingConfig, setPricingConfig] = useState<any | null>(null)

  const freeTrialDays = pricingConfig?.freeTrialDays ?? DEFAULT_FREE_TRIAL_DAYS
  const yearlyDiscountPercent = pricingConfig?.yearlyDiscountPercent ?? DEFAULT_YEARLY_DISCOUNT_PERCENT

  const getPlanWithOverrides = (planId: Exclude<SubscriptionType, null>) => {
    const base = subscriptionService.getPlan(planId)
    if (!base) return null
    const overrideMonthly = pricingConfig?.plans?.[planId]?.monthlyPrice
    const overrideNameRaw = pricingConfig?.plans?.[planId]?.displayName
    const overrideName = typeof overrideNameRaw === "string" ? overrideNameRaw.trim() : ""
    const monthlyPrice = typeof overrideMonthly === "number" && overrideMonthly > 0 ? overrideMonthly : base.monthlyPrice
    const yearlyPrice = Math.round(12 * monthlyPrice * (1 - yearlyDiscountPercent / 100))
    const format = (priceInKobo: number) => {
      const priceInNaira = priceInKobo / 100
      return `₦${priceInNaira.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }
    return {
      ...base,
      name: overrideName || (planId as any),
      monthlyPrice,
      yearlyPrice,
      monthlyPriceDisplay: format(monthlyPrice),
      yearlyPriceDisplay: format(yearlyPrice)
    }
  }

  // Load pricing config (prices + free trial days)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/pricing-config")
        const data = await res.json()
        if (data?.success) setPricingConfig(data.data)
      } catch {
        // Ignore and fall back to defaults
      }
    }
    load()
  }, [])

  // We only migrate AFTER successful payment (handled in /api/subscription/verify),
  // never before payment initialization.
  const needsMigration = (planType: string): boolean => {
    return profile?.businessType === 'freelancer' && (planType === 'GOLD' || planType === 'PLATINUM')
  }

  const handleSubscribe = async (planType: string) => {
    if (!user) {
      toast.error("Please log in to subscribe")
      router.push("/login?redirect=/pricing")
      return
    }

    // If migration is needed, show info modal but DO NOT update businessType yet.
    if (needsMigration(planType)) {
      setSelectedPlan(planType as SubscriptionType)
      setShowMigrationModal(true)
      return
    }

    await proceedWithSubscription(planType)
  }

  const handleMigrateAndSubscribe = async () => {
    if (!selectedPlan) return
    setShowMigrationModal(false)
    await proceedWithSubscription(selectedPlan)
  }

  const proceedWithSubscription = async (planType: string) => {
    if (!user) {
      toast.error("Please log in to subscribe")
      router.push("/login?redirect=/pricing")
      return
    }

    setProcessingSubscription(planType)
    try {
      // Get auth token
      const currentUser = auth.currentUser
      if (!currentUser) {
        toast.error("Please log in to subscribe")
        router.push("/login?redirect=/pricing")
        return
      }

      const token = await currentUser.getIdToken()

      // Initialize subscription payment
      const response = await fetch("/api/subscription/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subscriptionType: planType,
          interval: billingInterval
        })
      })

      const data = await response.json()

      if (!data.success) {
        toast.error(data.error || "Failed to initialize payment")
        return
      }

      // Redirect to Paystack payment page
      if (data.data?.authorizationUrl) {
        window.location.href = data.data.authorizationUrl
      } else {
        toast.error("Payment initialization failed")
      }
    } catch (error) {
      console.error("Error subscribing:", error)
      toast.error("An error occurred. Please try again.")
    } finally {
      setProcessingSubscription(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <OtaxLogo />
          </Link>
          <nav className="hidden md:flex items-center gap-4 lg:gap-6">
            <Link href="/#features" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-xs sm:text-sm font-medium text-foreground">
              Pricing
            </Link>
            <Link href="/blog" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link href="/faq" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard">
                <Button size="lg">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="container mx-auto px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-16 lg:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 md:mb-4">Simple, Transparent Pricing</h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4 mb-4 sm:mb-6">
              Choose the plan that fits your business needs. All plans include a {freeTrialDays}-day free trial.
            </p>
            
            {/* Billing Interval Toggle */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <Label htmlFor="billing-toggle" className={`text-sm sm:text-base cursor-pointer ${billingInterval === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}`}>
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={billingInterval === 'yearly'}
                onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')}
              />
              <Label htmlFor="billing-toggle" className={`text-sm sm:text-base cursor-pointer ${billingInterval === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}`}>
                Yearly
              </Label>
              {billingInterval === 'yearly' && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 text-xs font-semibold ml-2">
                  Save 25%
                </Badge>
              )}
            </div>
          </div>

          {/* Toggle between Individuals and SMEs */}
          <div className="flex justify-center mb-6 sm:mb-8 md:mb-12">
            <Tabs defaultValue="individuals" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 sm:mb-12 md:mb-20 h-10 sm:h-11">
                <TabsTrigger className="cursor-pointer text-xs sm:text-sm" value="individuals">Individuals</TabsTrigger>
                <TabsTrigger className="cursor-pointer text-xs sm:text-sm" value="smes">SMEs</TabsTrigger>
              </TabsList>

              {/* Individuals Pricing */}
              <TabsContent value="individuals" className="mt-4 sm:mt-6 md:mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
                  {/* PRO Plan - Freelancers */}
            <Card className="relative flex flex-col">
              <CardHeader className="p-4 sm:p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl sm:text-2xl">{getPlanWithOverrides('PRO')?.name || 'PRO'}</CardTitle>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium">
                          Basic
                        </span>
                      </div>
                      <CardDescription className="text-xs sm:text-sm">
                        Perfect for tech freelancers, Virtual Assistants, copywriters, independent professionals and consultants who need to manage their taxes with ease
                      </CardDescription>
                <div className="mt-3 sm:mt-4 space-y-1">
                  {billingInterval === 'monthly' ? (
                    <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                      {getPlanPriceDisplay(getPlanWithOverrides('PRO')!, 'monthly')}
                    </span>
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground">per month</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground line-through">
                        {(() => {
                          const plan = getPlanWithOverrides('PRO')
                          if (!plan) return '₦30,000'
                          const grossYearly = (plan.monthlyPrice * 12) / 100 // Convert kobo to naira
                          return `₦${grossYearly.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                        })()}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                          {getPlanPriceDisplay(getPlanWithOverrides('PRO')!, 'yearly')}
                        </span>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold">
                          {yearlyDiscountPercent}% OFF
                    </Badge>
                  </div>
                      <span className="text-xs sm:text-sm text-muted-foreground">per year</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4 sm:p-6 pt-0">
                <ul className="space-y-2 sm:space-y-3">
                  <PricingFeature>Track up to 100 transactions/month</PricingFeature>
                  <PricingFeature>Income & expense tracking</PricingFeature>
                  <PricingFeature>Receipt scanning & OCR for automatic transaction tracking</PricingFeature>
                  <PricingFeature>Automatic tax calculator with reliefs</PricingFeature>
                  <PricingFeature>Self assessment and filing (IRS standard)</PricingFeature>
                  <PricingFeature>Document storage (500MB total)</PricingFeature>
                  <PricingFeature>Email reminders</PricingFeature>
                  <PricingFeature>Email support</PricingFeature>
                  <PricingFeature comingSoon>Easy payment of tax directly using various government approved methods (e.g., Remita and Paystack) - coming soon</PricingFeature>
                </ul>
              </CardContent>
              <CardFooter className="p-4 sm:p-6 pt-0">
                {user ? (
                  <Button
                    type="button"
                    className="w-full bg-transparent hover:bg-muted hover:text-foreground transition-all duration-200 hover:scale-105 hover:shadow-lg h-9 sm:h-10 text-xs sm:text-sm"
                    variant="outline"
                    onClick={() => handleSubscribe("PRO")}
                    disabled={processingSubscription === "PRO"}
                  >
                    {processingSubscription === "PRO" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Subscribe Now"
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full bg-transparent hover:bg-muted hover:text-foreground transition-all duration-200 hover:scale-105 hover:shadow-lg h-9 sm:h-10 text-xs sm:text-sm"
                    variant="outline"
                    onClick={() => router.push("/login?redirect=/pricing")}
                  >
                    Login to Subscribe
                  </Button>
                )}
              </CardFooter>
            </Card>

                  {/* GOLD Plan - Content Creators */}
            <Card className="relative flex flex-col border-primary shadow-lg scale-100 sm:scale-105">
                    <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 sm:px-4 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                      Most Popular
                    </div>
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl sm:text-2xl">{getPlanWithOverrides('GOLD')?.name || 'GOLD'}</CardTitle>
                        <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full font-medium">
                          Advanced
                        </span>
                      </div>
                      <CardDescription className="text-xs sm:text-sm">
                        Ideal for content creators, influencers, digital creators and independent proffesionals & contractors managing multiple income streams
                      </CardDescription>
                      <div className="mt-3 sm:mt-4">
                        <div className="mt-3 sm:mt-4 space-y-1">
                          {billingInterval === 'monthly' ? (
                            <>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl md:text-4xl font-bold">
                              {getPlanPriceDisplay(getPlanWithOverrides('GOLD')!, 'monthly')}
                            </span>
                              </div>
                              <span className="text-xs sm:text-sm text-muted-foreground">per month</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs sm:text-sm font-medium text-muted-foreground line-through">
                                {(() => {
                                  const plan = getPlanWithOverrides('GOLD')
                                  if (!plan) return '₦72,000'
                                  const grossYearly = (plan.monthlyPrice * 12) / 100 // Convert kobo to naira
                                  return `₦${grossYearly.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                })()}
                              </span>
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl md:text-4xl font-bold">
                                  {getPlanPriceDisplay(getPlanWithOverrides('GOLD')!, 'yearly')}
                                </span>
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold">
                                  {yearlyDiscountPercent}% OFF
                            </Badge>
                          </div>
                              <span className="text-xs sm:text-sm text-muted-foreground">per year</span>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 sm:p-6 pt-0">
                      <ul className="space-y-2 sm:space-y-3">
                        <PricingFeature>Track up to 500 transactions/month</PricingFeature>
                        <PricingFeature>All PRO features</PricingFeature>
                        <PricingFeature>Multi-platform income tracking</PricingFeature>
                        <PricingFeature>Sponsorship & brand deal management</PricingFeature>
                         <PricingFeature>Simple invoice management</PricingFeature>
                        <PricingFeature>Advanced tax calculations</PricingFeature>
                        <PricingFeature>Document storage (2GB total)</PricingFeature>
                        <PricingFeature>SMS & email reminders</PricingFeature>
                        <PricingFeature>Priority support</PricingFeature>
                        <PricingFeature>Expense categorization</PricingFeature>
                        <PricingFeature comingSoon>Receive local and international payments via invoicing</PricingFeature>
                      </ul>
                    </CardContent>
                    <CardFooter className="p-4 sm:p-6 pt-0">
                      {user ? (
                        <Button
                          type="button"
                          className="w-full hover:bg-primary/90 hover:scale-105 transition-all duration-200 hover:shadow-lg h-9 sm:h-10 text-xs sm:text-sm"
                          onClick={() => handleSubscribe("GOLD")}
                          disabled={processingSubscription === "GOLD"}
                        >
                          {processingSubscription === "GOLD" ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Subscribe Now"
                          )}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="w-full hover:bg-primary/90 hover:scale-105 transition-all duration-200 hover:shadow-lg h-9 sm:h-10 text-xs sm:text-sm"
                          onClick={() => router.push("/login?redirect=/pricing")}
                        >
                          Login to Subscribe
                        </Button>
                      )}
                    </CardFooter>
                  </Card>

                  {/* PLATINUM Plan - Complex Content Creators */}
                  <Card className="relative flex flex-col">
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl sm:text-2xl">{getPlanWithOverrides('PLATINUM')?.name || 'PLATINUM'}</CardTitle>
                        <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium">
                          Individual Businesses
                        </span>
                      </div>
                      <CardDescription className="text-xs sm:text-sm">
                        For individuals registered as <span className="font-bold">BUSINESS NAMES</span> with the Corporate Affairs Commission (CAC) in Nigeria.
                      </CardDescription>
                      <div className="mt-3 sm:mt-4">
                        <div className="mt-3 sm:mt-4 space-y-1">
                          {billingInterval === 'monthly' ? (
                            <>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl md:text-4xl font-bold">
                              {getPlanPriceDisplay(getPlanWithOverrides('PLATINUM')!, 'monthly')}
                            </span>
                              </div>
                              <span className="text-xs sm:text-sm text-muted-foreground">per month</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs sm:text-sm font-medium text-muted-foreground line-through">
                                {(() => {
                                  const plan = getPlanWithOverrides('PLATINUM')
                                  if (!plan) return '₦150,000'
                                  const grossYearly = (plan.monthlyPrice * 12) / 100 // Convert kobo to naira
                                  return `₦${grossYearly.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                                })()}
                              </span>
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl md:text-4xl font-bold">
                                  {getPlanPriceDisplay(getPlanWithOverrides('PLATINUM')!, 'yearly')}
                                </span>
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold">
                                  {yearlyDiscountPercent}% OFF
                            </Badge>
                          </div>
                              <span className="text-xs sm:text-sm text-muted-foreground">per year</span>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-4 sm:p-6 pt-0">
                      <ul className="space-y-2 sm:space-y-3">
                        <PricingFeature>Everything in GOLD</PricingFeature>
                        <PricingFeature>Multi-entity business management (ie operate multiple business account)</PricingFeature>
                        <PricingFeature>Business analytics & insights</PricingFeature>
                        <PricingFeature>Extensive Expense Management (expense focused tax calculation to reduce tax liabilty as a business)</PricingFeature>
                        <PricingFeature>IRS/NRS filing (VAT filing, WHT filing, PIT filing etc)</PricingFeature>
                        <PricingFeature>Document storage (10GB total)</PricingFeature>
                        {/* <PricingFeature>Custom report templates</PricingFeature> */}
                        <PricingFeature>Multi-user access(up to 3 users)</PricingFeature>
                        <PricingFeature>Dedicated tax advisor consultation</PricingFeature>
                        <PricingFeature>Quarterly tax planning sessions</PricingFeature>
                        <PricingFeature>24/7 priority support</PricingFeature>
                        <PricingFeature comingSoon>API access for integrations</PricingFeature>
                      </ul>
                    </CardContent>
                    <CardFooter className="p-4 sm:p-6 pt-0">
                      {user ? (
                        <Button
                          type="button"
                          className="w-full bg-transparent hover:bg-muted hover:text-foreground transition-all duration-200 hover:scale-105 hover:shadow-lg h-9 sm:h-10 text-xs sm:text-sm"
                          variant="outline"
                          onClick={() => handleSubscribe("PLATINUM")}
                          disabled={processingSubscription === "PLATINUM"}
                        >
                          {processingSubscription === "PLATINUM" ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Subscribe Now"
                          )}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="w-full bg-transparent hover:bg-muted hover:text-foreground transition-all duration-200 hover:scale-105 hover:shadow-lg h-9 sm:h-10 text-xs sm:text-sm"
                          variant="outline"
                          onClick={() => router.push("/login?redirect=/pricing")}
                        >
                          Login to Subscribe
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </div>
              </TabsContent>

              {/* SMEs Pricing */}
              <TabsContent value="smes" className="mt-4 sm:mt-6 md:mt-8">
                <div className="mb-6 sm:mb-8 p-4 sm:p-5 md:p-6 bg-muted/50 rounded-lg border border-border max-w-4xl mx-auto">
                  <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Understanding Small vs Big Business Classification</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    Under the Nigeria Tax Act (NTA) 2025, businesses are classified based on specific criteria. Choose the plan that matches your business classification:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
                  {/* Small Business Plan */}
                  <Card className="relative flex flex-col border-primary shadow-lg">
              <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 sm:px-4 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                Most Popular
              </div>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl">{getPlanWithOverrides('Small Business')?.name || 'Small Business'}</CardTitle>
                      <CardDescription className="space-y-2 text-xs sm:text-sm">
                        <p>For businesses with annual turnover ≤ ₦50-100 million and fixed assets ≤ ₦250 million (excluding professional services).</p>
                        <p className="text-xs font-medium text-primary">Qualifies for tax exemptions under NTA 2025</p>
                      </CardDescription>
                <div className="mt-3 sm:mt-4 space-y-1">
                  {billingInterval === 'monthly' ? (
                    <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl md:text-4xl font-bold">
                      {getPlanPriceDisplay(getPlanWithOverrides('Small Business')!, 'monthly')}
                    </span>
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground">per month</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground line-through">
                        {(() => {
                          const plan = getPlanWithOverrides('Small Business')
                          if (!plan) return '₦150,000'
                          const grossYearly = (plan.monthlyPrice * 12) / 100 // Convert kobo to naira
                          return `₦${grossYearly.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                        })()}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl md:text-4xl font-bold">
                          {getPlanPriceDisplay(getPlanWithOverrides('Small Business')!, 'yearly')}
                        </span>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold">
                          {yearlyDiscountPercent}% OFF
                    </Badge>
                  </div>
                      <span className="text-xs sm:text-sm text-muted-foreground">per year</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4 sm:p-6 pt-0">
                <ul className="space-y-3">
                  <PricingFeature>Track up to 5,000 transactions/month</PricingFeature>
                  <PricingFeature>Advanced tax calculations</PricingFeature>
                  <PricingFeature>Small business tax exemption tracking</PricingFeature>
                   <PricingFeature>IRS/NRS filing (VAT filing, WHT filing, PIT filing etc)</PricingFeature>
                    <PricingFeature>Business invoice management</PricingFeature>
                    <PricingFeature>Proper book keeping and business accouting</PricingFeature>
                  <PricingFeature>Employee management and simple payroll system</PricingFeature>
                  <PricingFeature comingSoon>Manage PAYE and remit</PricingFeature>
                  <PricingFeature>Document storage (15GB total)</PricingFeature>
                  <PricingFeature>Receipt scanning & OCR</PricingFeature>
                  <PricingFeature>SMS & email reminders</PricingFeature>
                  <PricingFeature comingSoon>Multi-user access (up to 5 users)</PricingFeature>
                  <PricingFeature>Basic analytics & insights</PricingFeature>
                  <PricingFeature>Priority support</PricingFeature>

                </ul>
              </CardContent>
              <CardFooter>
                {user ? (
                  <Button
                    type="button"
                    className="w-full hover:bg-primary/90 hover:scale-105 transition-all duration-200 hover:shadow-lg"
                    onClick={() => handleSubscribe("Small Business")}
                    disabled={processingSubscription === "Small Business"}
                  >
                    {processingSubscription === "Small Business" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Subscribe Now"
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full hover:bg-primary/90 hover:scale-105 transition-all duration-200 hover:shadow-lg"
                    onClick={() => router.push("/login?redirect=/pricing")}
                  >
                    Login to Subscribe
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* Big Business Plan */}
                  <Card className="relative flex flex-col opacity-60 grayscale">
              <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 bg-orange-500 dark:bg-orange-600 text-white px-3 sm:px-4 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                      Coming Soon
              </div>
              <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-xl sm:text-2xl">{getPlanWithOverrides('Big Business')?.name || 'Big Business'}</CardTitle>
                      <CardDescription className="space-y-2 text-xs sm:text-sm">
                        <p>For businesses with turnover above small business threshold, fixed assets exceeding ₦250 million, or providing professional services.</p>
                        <p className="text-xs font-medium text-muted-foreground">Subject to full corporate tax regime</p>
                      </CardDescription>
                <div className="mt-3 sm:mt-4 space-y-1">
                  {billingInterval === 'monthly' ? (
                    <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl sm:text-3xl md:text-4xl font-bold">
                            {getPlanPriceDisplay(getPlanWithOverrides('Big Business')!, 'monthly')}
                          </span>
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground">per month</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground line-through">
                        {(() => {
                          const plan = getPlanWithOverrides('Big Business')
                          if (!plan) return '₦450,000'
                          const grossYearly = (plan.monthlyPrice * 12) / 100 // Convert kobo to naira
                          return `₦${grossYearly.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                        })()}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl md:text-4xl font-bold">
                          {getPlanPriceDisplay(getPlanWithOverrides('Big Business')!, 'yearly')}
                        </span>
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-semibold">
                          {yearlyDiscountPercent}% OFF
                          </Badge>
                        </div>
                      <span className="text-xs sm:text-sm text-muted-foreground">per year</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4 sm:p-6 pt-0">
                <ul className="space-y-2 sm:space-y-3">
                  <PricingFeature>Everything in Small Business</PricingFeature>
                        <PricingFeature>Full corporate tax compliance</PricingFeature>
                        <PricingFeature comingSoon>Multi-user access (up to 10 users)</PricingFeature>
                  <PricingFeature comingSoon>Advanced analytics & insights</PricingFeature>
                  <PricingFeature>Custom report templates</PricingFeature>
                  <PricingFeature>Document storage (50GB total)</PricingFeature>
                  <PricingFeature comingSoon>API access</PricingFeature>
                  <PricingFeature>Dedicated account manager</PricingFeature>
                  <PricingFeature>24/7 priority support</PricingFeature>
                        <PricingFeature comingSoon>White-label options</PricingFeature>
                        <PricingFeature comingSoon>Custom integrations</PricingFeature>
                </ul>
              </CardContent>
              <CardFooter className="p-4 sm:p-6 pt-0">
                      <Button className="w-full bg-transparent h-9 sm:h-10 text-xs sm:text-sm" variant="outline" disabled>
                          Coming Soon
                </Button>
              </CardFooter>
            </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* FAQ Section */}
          <div className="mt-12 sm:mt-16 md:mt-20 max-w-6xl mx-auto px-3 sm:px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12">Frequently Asked Questions</h2>
            <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              {/* Left Column */}
              <Accordion type="single" collapsible className="w-full">
                {/* General Questions */}
                <AccordionItem value="general-1" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Do you offer a free trial?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    Yes! All plans come with a {freeTrialDays}-day free trial. No credit card required to start. You can explore all features and see how OTax simplifies your tax management before committing.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="general-2" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Can I change plans later?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges or credits based on your billing cycle.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="general-3" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    What payment methods do you accept?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    We accept all major Nigerian payment methods including bank transfers, debit/credit cards, and mobile money. All transactions are processed securely through our payment partners.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="general-4" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Is my financial data secure?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    Yes! We use bank-level encryption (SSL/TLS) and security measures to protect your data. Your information is never shared with third parties without your explicit consent. We comply with Nigerian data protection regulations.
                  </AccordionContent>
                </AccordionItem>

                {/* Tax Calculations */}
                <AccordionItem value="calc-1" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    How accurate are your tax calculations?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    Our tax calculations are based on the latest Nigeria Tax Act (NTA) 2025 (and associated reform Acts). We regularly update our system to reflect current tax rates, reliefs, and deductions. Our calculations are verified by tax professionals and comply with Nigerian tax laws.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="calc-2" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    What tax reliefs and deductions are automatically applied?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    We automatically calculate and apply all eligible reliefs. Under Nigeria's new tax law effective January 1, 2026, individuals earning ₦800,000 or less per year are exempt from personal income tax. The Consolidated Relief Allowance (CRA) has been replaced with a Rent Relief Allowance, allowing up to 20% of annual rent (capped at ₦500,000) as a deductible expense. Pension contributions, National Housing Fund (NHF), and National Health Insurance Scheme (NHIS) contributions remain deductible. Compensation for loss of employment or injury is now exempt from tax up to ₦50 million. Additionally, the law introduces progressive tax bands that ease the burden on low- and middle-income earners while ensuring higher earners contribute more fairly.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="calc-3" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Can I calculate taxes for different income types?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    Yes! OTax handles various income types including employment income, business income, freelance income, rental income, investment income, and more. You can track multiple income streams and our system will calculate the appropriate tax for each based on current tax regulations.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="calc-4" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    How does the system handle complex tax scenarios for content creators?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    For content creators and influencers, we handle complex scenarios like multiple income streams (sponsorships, ad revenue, affiliate income), business expenses, equipment depreciation, and international payments. Our GOLD and PLATINUM plans include advanced features for tracking brand deals, platform-specific income, and managing deductions across different revenue sources.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="calc-5" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Can I see a breakdown of how my tax is calculated?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    Absolutely! Every tax calculation includes a detailed breakdown showing your total income, allowable deductions, applicable reliefs, taxable income, and the final tax amount. You can export these breakdowns as PDF reports for your records or tax filing.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="calc-6" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    What if I have questions about my tax calculation?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    Our support team is available to help explain your tax calculations. PLATINUM plan users get access to dedicated tax advisor consultations where certified professionals can review your calculations and provide personalized tax planning advice.
                  </AccordionContent>
                </AccordionItem>

                {/* Tax Payments */}
                <AccordionItem value="payment-1" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    How do I pay my taxes through OTax?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    <p className="mb-3">OTax makes tax payments seamless. You can generate your Remita Retrieval Reference (RRR) directly from the platform, pay through integrated payment gateways, or use our automated payment system. We support all major payment methods and provide instant payment receipts.</p>
                    <p className="text-red-600 dark:text-red-400 font-medium text-sm mt-3 pt-3 border-t border-border">
                      <strong>Important:</strong> We do not hold money. We simply intermediate between you and payment platforms like Remita and Paystack. We take no charge for payment processing—all fees are handled directly by the payment providers.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="payment-2" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Can I automate my tax payments?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    <p className="mb-3">Our automated payment system allows you to set up recurring tax payments. You can schedule payments for specific dates, set up payment reminders, and even enable auto-pay for your tax obligations. This ensures you never miss a payment deadline and avoid penalties.</p>
                    <p className="text-orange-600 dark:text-orange-400 font-medium text-sm mt-3 pt-3 border-t border-border">
                      <strong>Note:</strong> This feature is coming soon. For now, you can manually process payments through our payment gateway.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="payment-3" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    How do payment reminders work?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    We send automated reminders via email and SMS (depending on your plan) before important tax deadlines. You can customize reminder frequency - we recommend reminders at 30 days, 14 days, 7 days, and 1 day before deadlines. Reminders include your calculated tax amount and direct payment links.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Right Column */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="payment-4" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Can I track my payment history?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    Yes, all tax payments are tracked in your dashboard. You can view payment history, download receipts, see payment status, and generate payment reports. This makes it easy to maintain records for tax filing and audits.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="payment-5" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    What happens if I miss a payment deadline?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    Our system sends multiple reminders before deadlines to help you avoid late payments. If you do miss a deadline, we'll help you calculate any penalties and interest, and guide you through the payment process. PLATINUM users get priority support for resolving payment issues.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="payment-6" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Can I pay taxes for multiple periods at once?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    Yes! You can select and pay for multiple tax periods simultaneously. Our system calculates the total amount due across all periods and processes the payment accordingly. This is especially useful for catching up on missed payments or planning ahead.
                  </AccordionContent>
                </AccordionItem>

                {/* Automation & Ease of Use */}
                <AccordionItem value="auto-1" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    How does OTax automate tax management?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    OTax automates multiple aspects of tax management: transaction categorization, receipt scanning and OCR, automatic tax calculations, payment reminders, report generation, and document organization. Once you connect your accounts or upload transactions, the system does most of the heavy lifting for you.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="auto-2" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Can I import transactions automatically?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    <p className="mb-3">Yes! You can connect your bank accounts (where supported), import CSV files from your bank, or use our mobile app to scan receipts. Our OCR technology automatically extracts transaction details, categorizes expenses, and updates your tax calculations in real-time.</p>
                    <p className="text-orange-600 dark:text-orange-400 font-medium text-sm mt-3 pt-3 border-t border-border">
                      <strong>Note:</strong> Automatic transaction import is coming soon. For now, you can manually add transactions through the dashboard.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="auto-4" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Can the system generate tax reports automatically?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    Yes! OTax automatically generates comprehensive tax reports including income statements, expense reports, tax calculations, and filing-ready documents. You can generate reports for any period (monthly, quarterly, annually) with one click. Reports are formatted for FIRS/NRS filing requirements.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="auto-5" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    How does the system help with tax filing?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    We generate IRS/NRS filing-ready reports that include all necessary documentation, calculations, and summaries. These reports can be directly submitted to tax authorities or shared with your accountant. PLATINUM users get access to filing assistance and review by tax professionals.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="auto-6" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Can I set up recurring transactions and reminders?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    Absolutely! You can set up recurring income and expense transactions, and the system will automatically add them to your records. You can also set custom reminders for tax deadlines, document uploads, or any other important tax-related tasks.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="auto-7" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    How does multi-platform income tracking work for creators?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    For content creators, you can connect multiple income sources (YouTube, Instagram, TikTok, sponsorships, etc.) and track them separately. Our system automatically categorizes income by platform, calculates platform-specific taxes, and provides consolidated reports showing your total taxable income across all platforms.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="auto-8" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Can I integrate with other accounting tools?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    <p className="mb-3">PLATINUM and Big Business plans include API access for integrations. You can connect OTax with popular accounting software, payment processors, and business tools. Our API allows for seamless data synchronization and automated workflows.</p>
                    <p className="text-orange-600 dark:text-orange-400 font-medium text-sm mt-3 pt-3 border-t border-border">
                      <strong>Note:</strong> API access and integrations are coming soon. We're working on building our API infrastructure to enable seamless integrations with accounting tools.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                {/* Support & Additional Services */}
                <AccordionItem value="support-1" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    What kind of support do you offer?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    All plans include email support. GOLD and PLATINUM plans include priority support with faster response times. PLATINUM users get 24/7 priority support and access to dedicated tax advisor consultations. SME plans include dedicated account managers for enterprise clients.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support-2" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Do you provide tax advice?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    While we provide automated tax calculations and filing assistance, personalized tax advice is available to PLATINUM plan users through our network of certified tax professionals. We can also connect you with tax advisors for complex situations.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support-3" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    What if I need help setting up my account?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    We provide comprehensive onboarding guides, video tutorials, and step-by-step setup assistance. Our support team is available to help you get started, and PLATINUM users receive personalized onboarding sessions with a tax specialist.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support-4" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Can I export my data?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    Yes! You can export all your data including transactions, reports, documents, and tax calculations in various formats (PDF, CSV, Excel). This ensures you always have access to your data and can switch platforms if needed.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support-5" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    What happens to my data if I cancel my subscription?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
                    You can export all your data before canceling. We retain your data for 90 days after cancellation, after which it's permanently deleted. You can reactivate your account within this period to restore all your data.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support-6" className="border border-border rounded-lg px-3 sm:px-4 mb-3 sm:mb-4">
                  <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">
                    Do you offer training or workshops?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-xs sm:text-sm">
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

      {/* Migration Modal */}
      {selectedPlan && (
        <MigrateToCreatorModal
          open={showMigrationModal}
          onOpenChange={setShowMigrationModal}
          planType={selectedPlan}
          onConfirm={handleMigrateAndSubscribe}
        />
      )}
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

