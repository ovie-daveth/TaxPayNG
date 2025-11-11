"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, X, ArrowUpRight, ArrowDownRight } from "lucide-react"

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
  sidebarCollapsed?: boolean
}

export function TransactionsView({ 
  businessType, 
  isFilterOpen, 
  setIsFilterOpen, 
  searchTerm, 
  setSearchTerm,
  selectedType,
  setSelectedType,
  selectedCategory,
  setSelectedCategory,
  sidebarCollapsed = false
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
    <div className="space-y-3 sm:space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
          <Input 
            placeholder="Search transactions..." 
            className="pl-8 sm:pl-9 h-9 sm:h-10 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="h-9 sm:h-10 text-sm"
        >
          <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">Filters</span>
          <span className="sm:hidden">Filter</span>
        </Button>
      </div>

      {/* Filters Panel */}
      {isFilterOpen && (
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-semibold text-xs sm:text-sm">Filters</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSelectedType("all")
                setSelectedCategory("all")
                setIsFilterOpen(false)
              }}
              className="h-8 sm:h-9 text-xs sm:text-sm"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1" />
              <span className="hidden sm:inline">Clear All</span>
              <span className="sm:hidden">Clear</span>
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-9 sm:h-10 text-sm">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="relief">Tax Relief</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9 sm:h-10 text-sm">
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
        {/* Desktop View - Full Table with responsive columns */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left py-2.5 sm:py-3 lg:px-3 xl:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left py-2.5 sm:py-3 lg:px-3 xl:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Description</th>
                <th className="text-left py-2.5 sm:py-3 lg:px-3 xl:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden xl:table-cell">Category</th>
                <th className="text-left py-2.5 sm:py-3 lg:px-3 xl:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden xl:table-cell">Payment Method</th>
                <th className="text-right py-2.5 sm:py-3 lg:px-3 xl:px-4 text-xs sm:text-sm font-medium text-muted-foreground">Amount</th>
                <th className="text-center py-2.5 sm:py-3 lg:px-3 xl:px-4 text-xs sm:text-sm font-medium text-muted-foreground hidden xl:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="py-3 sm:py-4 lg:px-3 xl:px-4 text-xs sm:text-sm">{transaction.date}</td>
                  <td className="py-3 sm:py-4 lg:px-3 xl:px-4">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${transaction.type === "income" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {transaction.type === "income" ? <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </div>
                      <span className={`text-xs sm:text-sm font-medium truncate ${sidebarCollapsed ? 'lg:max-w-[180px] xl:max-w-none' : 'lg:max-w-[150px] xl:max-w-none'}`} title={transaction.description}>{transaction.description}</span>
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 lg:px-3 xl:px-4 hidden xl:table-cell">
                    <Badge variant="secondary" className="text-xs">{transaction.category}</Badge>
                  </td>
                  <td className="py-3 sm:py-4 lg:px-3 xl:px-4 text-xs sm:text-sm text-muted-foreground hidden xl:table-cell">{transaction.paymentMethod}</td>
                  <td className="py-3 sm:py-4 lg:px-3 xl:px-4 text-right">
                    <span className={`text-xs sm:text-sm font-semibold ${transaction.type === "income" ? "text-primary" : "text-destructive"}`}>
                      {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="py-3 sm:py-4 lg:px-3 xl:px-4 text-center hidden xl:table-cell">
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

        {/* Tablet View - Simplified Table (md to lg) */}
        <div className="hidden md:block lg:hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Description</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-3 text-xs">{transaction.date}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${transaction.type === "income" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {transaction.type === "income" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-medium truncate block max-w-[150px]" title={transaction.description}>{transaction.description}</span>
                        <Badge variant="secondary" className="text-[10px] mt-0.5">{transaction.category}</Badge>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`text-xs font-semibold ${transaction.type === "income" ? "text-primary" : "text-destructive"}`}>
                      {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {transaction.taxDeductible ? (
                      <Badge variant="outline" className="text-[10px]">Tax Ded.</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Non-ded.</Badge>
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
            <div key={transaction.id} className="p-3 sm:p-4">
              <div className="flex items-start justify-between mb-2.5 sm:mb-3">
                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${transaction.type === "income" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {transaction.type === "income" ? <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" /> : <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate" title={transaction.description}>{transaction.description}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{transaction.date}</p>
                  </div>
                </div>
                <span className={`text-sm sm:text-base font-semibold ml-2 flex-shrink-0 ${transaction.type === "income" ? "text-primary" : "text-destructive"}`}>
                  {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] sm:text-xs">{transaction.category}</Badge>
                  {transaction.taxDeductible && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs">Tax Deductible</Badge>
                  )}
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground">{transaction.paymentMethod}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

