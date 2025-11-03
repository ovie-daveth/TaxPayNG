"use client"

import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"

// Custom tooltip component for better visibility
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg z-50">
        <div className="font-medium mb-2">{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">
              {entry.name}: <span className="font-semibold text-foreground ml-1">
                {entry.dataKey === 'amount' 
                  ? `₦${entry.value?.toLocaleString() || 0}` 
                  : entry.value}
              </span>
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

interface DashboardChartsProps {
  transactions: any[]
  users: any[]
  taxCalculations: any[]
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))', 'hsl(var(--accent))', '#8b5cf6', '#f59e0b', '#ef4444']

export function DashboardCharts({ transactions, users, taxCalculations }: DashboardChartsProps) {
  // Helper function to safely parse dates
  const parseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null
    try {
      if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
        return dateValue.toDate()
      }
      if (dateValue instanceof Date) {
        return dateValue
      }
      if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        const date = new Date(dateValue)
        if (!isNaN(date.getTime())) {
          return date
        }
      }
      return null
    } catch {
      return null
    }
  }

  // Prepare user registration data by month (last 6 months)
  const getUserRegistrationData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    
    // Get last 6 months
    const months: { [key: string]: number } = {}
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
      months[key] = 0
    }

    // Count users by month
    users.forEach((user) => {
      const createdAt = parseDate(user.createdAt)
      if (createdAt) {
        const key = `${monthNames[createdAt.getMonth()]} ${createdAt.getFullYear()}`
        if (months.hasOwnProperty(key)) {
          months[key]++
        }
      }
    })

    // Convert to array format
    return Object.entries(months).map(([month, count]) => ({
      month,
      users: count
    }))
  }

  // Prepare transaction data by month (last 6 months)
  const getTransactionData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    
    // Get last 6 months
    const months: { [key: string]: { count: number; total: number } } = {}
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
      months[key] = { count: 0, total: 0 }
    }

    // Group transactions by month
    transactions.forEach((transaction) => {
      const createdAt = parseDate(transaction.createdAt || transaction.date)
      if (createdAt) {
        const key = `${monthNames[createdAt.getMonth()]} ${createdAt.getFullYear()}`
        if (months.hasOwnProperty(key)) {
          months[key].count++
          months[key].total += transaction.amount || 0
        }
      }
    })

    // Convert to array format
    return Object.entries(months).map(([month, data]) => ({
      month,
      amount: data.total
    }))
  }

  const monthlyTransactions = getTransactionData()
  const userRegistration = getUserRegistrationData()

  // Prepare tax categorization data from real tax calculations
  const getTaxCategoryData = () => {
    const categories: { [key: string]: number } = {}

    taxCalculations.forEach((calc) => {
      const businessType = calc.businessType || 'Other'
      const totalTax = calc.result?.totalTax || 0

      if (categories[businessType]) {
        categories[businessType] += totalTax
      } else {
        categories[businessType] = totalTax
      }
    })

    // Convert to array format and calculate percentages
    const total = Object.values(categories).reduce((sum, val) => sum + val, 0)

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value: total > 0 ? Math.round((value / total) * 100) : 0
    })).sort((a, b) => b.value - a.value) // Sort by value descending
  }

  const categoryData = getTaxCategoryData()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Transaction Chart */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Transaction Overview</h3>
          <p className="text-sm text-muted-foreground">Monthly transaction amounts</p>
        </div>
        <div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTransactions} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" strokeOpacity={0.3} vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ className: 'fill-muted-foreground', fontSize: 12, fontWeight: 500 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ className: 'fill-muted-foreground', fontSize: 12, fontWeight: 500 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* User Registration Chart */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">User Growth</h3>
          <p className="text-sm text-muted-foreground">Monthly user registrations</p>
        </div>
        <div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userRegistration} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" strokeOpacity={0.3} vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ className: 'fill-muted-foreground', fontSize: 12, fontWeight: 500 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ className: 'fill-muted-foreground', fontSize: 12, fontWeight: 500 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Tax Categories Pie Chart */}
      <Card className="p-6 lg:col-span-2">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Tax Categories Distribution</h3>
          <p className="text-sm text-muted-foreground">Breakdown of tax types</p>
        </div>
        <div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

