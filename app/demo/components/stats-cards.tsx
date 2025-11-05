"use client"

import { useState, useEffect, useRef } from "react"
import { calculateNigerianTax } from "@/lib/tax-calculator"
import { Card } from "@/components/ui/card"
import { Calculator, ArrowUpRight, ArrowDownRight, TrendingUp, Info, CheckCircle2 } from "lucide-react"
import { SmallBusinessExemptionInfo } from "./small-business-exemption-info"
import { TaxCalculationBreakdown } from "./tax-calculation-breakdown"

interface StatsCardsProps {
  businessType: "freelancer" | "creator" | "small-business"
}

export function StatsCards({ businessType }: StatsCardsProps) {
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
              className={`p-6 cursor-pointer transition-all relative ${isOpen ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleCardClick(stat.id)}
            >
            {/* Click to pin hint - only show when hovered but not pinned */}
            {isHovered && !isOpen && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-primary/10 dark:bg-primary/20 text-primary text-xs px-2 py-1 rounded-md border border-primary/20">
                <Info className="w-3 h-3" />
                <span>Click to pin</span>
              </div>
            )}
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

