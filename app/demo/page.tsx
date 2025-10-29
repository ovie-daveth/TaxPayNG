import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calculator, TrendingUp, TrendingDown, DollarSign, Receipt, FileText, Bell, ArrowRight } from "lucide-react"

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl">OTax</span>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="hidden sm:flex">
              Demo Mode
            </Badge>
            <Link href="/signup">
              <Button size="sm">
                Get Started <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Demo Banner */}
      <div className="bg-primary/10 border-b border-primary/20">
        <div className="container mx-auto px-4 py-4 text-center">
          <p className="text-sm font-medium">
            You're viewing a demo of OTax.{" "}
            <Link href="/signup" className="underline font-semibold">
              Sign up free
            </Link>{" "}
            to start managing your taxes.
          </p>
        </div>
      </div>

      {/* Demo Dashboard */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
          <p className="text-muted-foreground">Welcome to your financial command center</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦2,450,000</div>
              <p className="text-xs text-muted-foreground">+12.5% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦850,000</div>
              <p className="text-xs text-muted-foreground">-3.2% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimated Tax</CardTitle>
              <DollarSign className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦245,000</div>
              <p className="text-xs text-muted-foreground">For current tax year</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦1,355,000</div>
              <p className="text-xs text-muted-foreground">After tax deductions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-2 mb-8">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Your latest income and expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TransactionItem
                  type="income"
                  description="Client Payment - Website Design"
                  amount="₦450,000"
                  date="Jan 15, 2025"
                />
                <TransactionItem type="expense" description="Office Rent" amount="₦120,000" date="Jan 10, 2025" />
                <TransactionItem type="income" description="Consulting Services" amount="₦280,000" date="Jan 8, 2025" />
                <TransactionItem
                  type="expense"
                  description="Software Subscriptions"
                  amount="₦35,000"
                  date="Jan 5, 2025"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tax Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Tax Summary
              </CardTitle>
              <CardDescription>Your tax breakdown for 2025</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Gross Income</span>
                  <span className="font-semibold">₦2,450,000</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Tax Reliefs</span>
                  <span className="font-semibold text-green-600">-₦350,000</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Taxable Income</span>
                  <span className="font-semibold">₦2,100,000</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-medium">Total Tax Due</span>
                  <span className="text-xl font-bold text-primary">₦245,000</span>
                </div>
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Monthly Set-Aside</p>
                  <p className="text-2xl font-bold">₦20,417</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Upcoming Reminders
            </CardTitle>
            <CardDescription>Don't miss important deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ReminderItem title="Q1 Tax Payment Due" date="March 31, 2025" priority="high" daysLeft={79} />
              <ReminderItem
                title="Submit Self-Assessment Report"
                date="March 15, 2025"
                priority="medium"
                daysLeft={63}
              />
              <ReminderItem title="Renew Business Registration" date="April 30, 2025" priority="low" daysLeft={109} />
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="mt-12 bg-primary text-primary-foreground rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Take Control of Your Taxes?</h2>
          <p className="text-lg mb-6 opacity-90 max-w-2xl mx-auto">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" variant="secondary">
                Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
              >
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Calculator className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">OTax</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2025 OTax. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function TransactionItem({
  type,
  description,
  amount,
  date,
}: {
  type: "income" | "expense"
  description: string
  amount: string
  date: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          }`}
        >
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

function ReminderItem({
  title,
  date,
  priority,
  daysLeft,
}: {
  title: string
  date: string
  priority: "high" | "medium" | "low"
  daysLeft: number
}) {
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
      <Badge variant="secondary" className="bg-white/50">
        {daysLeft} days
      </Badge>
    </div>
  )
}
