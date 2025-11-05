import { TrendingUp, TrendingDown } from "lucide-react"

interface TransactionItemProps {
  type: "income" | "expense"
  description: string
  amount: string
  date: string
}

export function TransactionItem({ type, description, amount, date }: TransactionItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
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

