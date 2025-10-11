import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import Link from "next/link"

const transactions = [
  {
    id: 1,
    type: "income",
    description: "Client Payment - Website Design",
    amount: 450000,
    date: "2025-01-15",
    category: "Services",
  },
  {
    id: 2,
    type: "expense",
    description: "Office Rent",
    amount: 120000,
    date: "2025-01-14",
    category: "Rent",
  },
  {
    id: 3,
    type: "income",
    description: "Consulting Fee",
    amount: 280000,
    date: "2025-01-12",
    category: "Consulting",
  },
  {
    id: 4,
    type: "expense",
    description: "Software Subscription",
    amount: 25000,
    date: "2025-01-10",
    category: "Software",
  },
  {
    id: 5,
    type: "income",
    description: "Project Milestone Payment",
    amount: 350000,
    date: "2025-01-08",
    category: "Projects",
  },
]

export function RecentTransactions() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <p className="text-sm text-muted-foreground">Your latest financial activity</p>
        </div>
        <Link href="/dashboard/transactions">
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                transaction.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
              }`}
            >
              {transaction.type === "income" ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowDownRight className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{transaction.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {transaction.category}
                </Badge>
                <span className="text-xs text-muted-foreground">{transaction.date}</span>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}>
                {transaction.type === "income" ? "+" : "-"}₦{transaction.amount.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
