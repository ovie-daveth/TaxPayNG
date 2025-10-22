import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { TransactionFilters as TransactionFiltersType } from "@/lib/types"

interface TransactionFiltersProps {
  filters: TransactionFiltersType
  onFiltersChange: (filters: TransactionFiltersType) => void
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
  const handleClearAll = () => {
    onFiltersChange({})
  }

  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value === 'all' ? undefined : value as 'income' | 'expense'
    })
  }

  const handleCategoryChange = (value: string) => {
    onFiltersChange({
      ...filters,
      category: value === 'all' ? undefined : value
    })
  }

  const handlePaymentMethodChange = (value: string) => {
    onFiltersChange({
      ...filters,
      paymentMethod: value === 'all' ? undefined : value
    })
  }

  const handleDateRangeChange = (value: string) => {
    const now = new Date()
    let startDate: string | undefined
    let endDate: string | undefined

    switch (value) {
      case 'today':
        startDate = now.toISOString().split('T')[0]
        endDate = startDate
        break
      case 'week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
        startDate = weekStart.toISOString().split('T')[0]
        endDate = new Date().toISOString().split('T')[0]
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        endDate = new Date().toISOString().split('T')[0]
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
        endDate = new Date().toISOString().split('T')[0]
        break
      default:
        startDate = undefined
        endDate = undefined
    }

    onFiltersChange({
      ...filters,
      startDate,
      endDate
    })
  }
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Filters</h3>
        <Button variant="ghost" size="sm" onClick={handleClearAll}>
          <X className="w-4 h-4 mr-1" />
          Clear All
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={filters.type || 'all'} onValueChange={handleTypeChange}>
            <SelectTrigger id="type">
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
          <Label htmlFor="category">Category</Label>
          <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
            <SelectTrigger id="category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="Services">Services</SelectItem>
              <SelectItem value="Consulting">Consulting</SelectItem>
              <SelectItem value="Rent">Rent</SelectItem>
              <SelectItem value="Software">Software</SelectItem>
              <SelectItem value="Utilities">Utilities</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="Food">Food</SelectItem>
              <SelectItem value="Transport">Transport</SelectItem>
              <SelectItem value="Entertainment">Entertainment</SelectItem>
              <SelectItem value="Healthcare">Healthcare</SelectItem>
              <SelectItem value="Education">Education</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment">Payment Method</Label>
          <Select value={filters.paymentMethod || 'all'} onValueChange={handlePaymentMethodChange}>
            <SelectTrigger id="payment">
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Card">Card</SelectItem>
              <SelectItem value="Mobile Money">Mobile Money</SelectItem>
              <SelectItem value="Check">Check</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="period">Period</Label>
          <Select onValueChange={handleDateRangeChange}>
            <SelectTrigger id="period">
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="year">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  )
}
