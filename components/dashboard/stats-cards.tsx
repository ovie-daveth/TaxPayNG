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
      color: "text-green-600",
    },
    {
      label: "Total Expenses",
      value: "₦890,000",
      change: "+8.2%",
      trend: "up",
      icon: ArrowDownRight,
      color: "text-red-600",
    },
    {
      label: "Net Profit",
      value: "₦1,560,000",
      change: "+15.3%",
      trend: "up",
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      label: "Tax Payable",
      value: "₦234,000",
      change: "Q1 2025",
      trend: "neutral",
      icon: Calculator,
      color: "text-orange-600",
    },
  ]

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl font-bold mb-2">{stat.value}</p>
                <p
                  className={`text-xs font-medium ${stat.trend === "up" ? "text-green-600" : "text-muted-foreground"}`}
                >
                  {stat.change}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
