import { Card } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, TrendingUp, Calculator } from "lucide-react"

export function StatsCards() {
  const stats = [
    {
      label: "Total Income",
      value: "₦2,450,000",
      change: "+12.5%",
      trend: "up",
      icon: ArrowUpRight,
      color: "text-primary",
    },
    {
      label: "Total Expenses",
      value: "₦890,000",
      change: "+8.2%",
      trend: "up",
      icon: ArrowDownRight,
      color: "text-destructive",
    },
    {
      label: "Net Profit",
      value: "₦1,560,000",
      change: "+15.3%",
      trend: "up",
      icon: TrendingUp,
      color: "text-chart-3",
    },
    {
      label: "Tax Payable",
      value: "₦234,000",
      change: "Q1 2025",
      trend: "neutral",
      icon: Calculator,
      color: "text-accent",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="p-4 sm:p-5 md:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-bold mb-1.5 sm:mb-2 truncate">{stat.value}</p>
                <p
                  className={`text-xs font-medium ${stat.trend === "up" ? "text-primary" : "text-muted-foreground"}`}
                >
                  {stat.change}
                </p>
              </div>
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ml-2 ${stat.color}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
