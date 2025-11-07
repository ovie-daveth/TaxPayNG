"use client"

import { useState, useEffect, useRef } from "react"
import { calculateNigerianTax } from "@/lib/tax-calculator"
import { Card } from "@/components/ui/card"
import { Calculator, ArrowUpRight, ArrowDownRight, TrendingUp, Info, CheckCircle2 } from "lucide-react"
import { SmallBusinessExemptionInfo } from "./small-business-exemption-info"
import { TaxCalculationBreakdown } from "./tax-calculation-breakdown"

interface StatsCardsProps {
  businessType: "freelancer" | "creator" | "small-business"
  sidebarCollapsed?: boolean
}

export function StatsCards({ businessType, sidebarCollapsed = false }: StatsCardsProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [isHoverEnabled, setIsHoverEnabled] = useState(false)
  const [showTapHint, setShowTapHint] = useState(false)
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hasShownHintRef = useRef(false)

  // Check if device supports hover (desktop) vs touch (mobile/tablet)
  useEffect(() => {
    const checkHoverSupport = () => {
      // Check if device has hover capability (desktop) vs touch (mobile/tablet)
      // Use media query to detect hover capability
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        // Only enable hover on larger screens (lg breakpoint: 1024px+)
        setIsHoverEnabled(window.innerWidth >= 1024)
      } else {
        setIsHoverEnabled(false)
      }
    }

    checkHoverSupport()
    window.addEventListener('resize', checkHoverSupport)
    
    return () => {
      window.removeEventListener('resize', checkHoverSupport)
    }
  }, [])

  // Show tap hint on mobile/tablet when component is in view, hide after 3 seconds
  useEffect(() => {
    if (isHoverEnabled || hasShownHintRef.current || !containerRef.current) {
      setShowTapHint(false)
      return
    }

    let showTimer: ReturnType<typeof setTimeout> | null = null

    // Use Intersection Observer to detect when component is visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasShownHintRef.current && !isHoverEnabled) {
            // Prevent multiple triggers
            hasShownHintRef.current = true
            // Disconnect observer since we only want to show hint once
            observer.disconnect()
            
            // Component is in view, show hint after a brief delay
            showTimer = setTimeout(() => {
              setShowTapHint(true)
              // Hide hint after 3 seconds
              hintTimeoutRef.current = setTimeout(() => {
                setShowTapHint(false)
              }, 3000)
            }, 500) // Small delay to ensure component is fully rendered
          }
        })
      },
      { threshold: 0.1 } // Trigger when 10% of component is visible
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      if (showTimer) {
        clearTimeout(showTimer)
      }
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
      }
    }
  }, [isHoverEnabled])

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
  // According to Nigeria Tax Act 2025, small companies (turnover ≤ ₦100M, assets ≤ ₦250M) pay 0% CIT
  const smallBusinessIncome = 8500000
  const smallBusinessExpenses = 5200000
  const smallBusinessRent = 780000 // From breakdown (Office Rent & Utilities)
  // Small businesses are exempt from CIT, so tax is 0
  const smallBusinessTax = 0
  const smallBusinessTaxResult = null // No tax calculation needed for exempt businesses

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
      value: "₦0", 
      change: "Exempt", 
      trend: "neutral", 
      icon: Calculator, 
      color: "text-green-600",
      barColor: "bg-green-500",
      breakdown: null,
      taxCalculation: null,
      isSmallBusinessExempt: true, // Flag to show exemption info instead of tax breakdown
    },
  ]

  const stats = businessType === "freelancer" ? freelancerStats : businessType === "creator" ? creatorStats : smallBusinessStats

  const handleCardClick = (statId: string) => {
    setOpenDropdown(openDropdown === statId ? null : statId)
    // Hide tap hint immediately when user clicks any card
    if (showTapHint) {
      setShowTapHint(false)
      hasShownHintRef.current = true
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
        hintTimeoutRef.current = null
      }
    }
  }

  const handleCardHover = (statId: string | null) => {
    setHoveredCard(statId)
  }

  return (
    <div 
      ref={containerRef}
      className={`grid grid-cols-1 sm:grid-cols-2 ${sidebarCollapsed ? 'lg:grid-cols-4' : 'lg:grid-cols-2 xl:grid-cols-4'} gap-3 sm:gap-4`}
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const isOpen = openDropdown === stat.id
        const isHovered = hoveredCard === stat.id && isHoverEnabled
        // Only show dropdown on click for mobile/tablet, allow hover on desktop
        const showDropdown = isOpen || (isHovered && isHoverEnabled)

        // Determine if this card is in the last column(s) to position dropdown correctly
        // Adjust based on sidebar state: when collapsed, use 4-col logic; when expanded, use 2-col at lg, 4-col at xl
        // For safety, align right for last 2 cards in 4-col grid, or last card in 2-col grid
        const isLastColumn4 = index % 4 === 3 || index % 4 === 2 // Last 2 columns in 4-col grid
        const isLastInRow2 = index % 2 === 1 // Last in 2-col grid
        // Use more conservative approach: align right if it's last in 2-col OR last 2 in 4-col
        const shouldAlignRight = isLastInRow2 || isLastColumn4

        return (
          <div 
            key={stat.id} 
            className="relative"
            onMouseEnter={() => isHoverEnabled && !isOpen && handleCardHover(stat.id)}
            onMouseLeave={() => isHoverEnabled && !isOpen && handleCardHover(null)}
            ref={(el) => {
              dropdownRefs.current[stat.id] = el
            }}
          >
            <Card 
              className={`p-4 sm:p-5 md:p-6 cursor-pointer transition-all relative ${isOpen ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleCardClick(stat.id)}
            >
            {/* Click to pin hint - only show when hovered but not pinned (desktop only) */}
            {isHovered && !isOpen && isHoverEnabled && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-primary/10 dark:bg-primary/20 text-primary text-xs px-2 py-1 rounded-md border border-primary/20">
                <Info className="w-3 h-3" />
                <span className="hidden sm:inline">Click to pin</span>
                <span className="sm:hidden">Pin</span>
              </div>
            )}
            {/* Tap hint for mobile/tablet - show on first card only, for 3 seconds when component is in view */}
            {!isOpen && !isHoverEnabled && showTapHint && index === 0 && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-primary/10 dark:bg-primary/20 text-primary text-xs px-2 py-1 rounded-md border border-primary/20 animate-in fade-in-0 zoom-in-95 duration-300 z-10">
                <Info className="w-3 h-3" />
                <span>Tap for details</span>
              </div>
            )}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 truncate">{stat.value}</p>
                <p className={`text-xs font-medium ${stat.trend === "up" ? "text-primary" : "text-muted-foreground"}`}>
                  {stat.change}
                </p>
              </div>
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ml-2 ${stat.color}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </Card>

            {/* Breakdown Dropdown */}
            {showDropdown && (
              <div 
                className={`absolute z-50 mt-2 bg-popover border border-border rounded-lg shadow-lg p-3 sm:p-4 animate-in fade-in-0 zoom-in-95 ${
                  stat.id === "tax-payable" ? "w-[280px] sm:w-[380px] md:w-[450px]" : "w-[260px] sm:w-[300px] md:w-[320px]"
                } ${
                  shouldAlignRight ? "right-0" : "left-0"
                }`}
                onMouseEnter={() => isHoverEnabled && handleCardHover(stat.id)}
                onMouseLeave={() => isHoverEnabled && !isOpen && handleCardHover(null)}
              >
                {stat.id === "tax-payable" && (stat as any).isSmallBusinessExempt ? (
                  <SmallBusinessExemptionInfo />
                ) : stat.id === "tax-payable" && stat.taxCalculation ? (
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

