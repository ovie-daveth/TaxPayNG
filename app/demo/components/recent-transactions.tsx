import { Card } from "@/components/ui/card"
import { TransactionItem } from "./transaction-item"

interface RecentTransactionsProps {
  businessType: "freelancer" | "creator" | "small-business"
}

export function RecentTransactions({ businessType }: RecentTransactionsProps) {
  const freelancerTransactions = [
    { type: "income" as const, description: "Client Payment - Website Design", amount: "₦450,000", date: "Jan 15, 2025" },
    { type: "expense" as const, description: "Office Rent", amount: "₦120,000", date: "Jan 10, 2025" },
    { type: "income" as const, description: "Consulting Services", amount: "₦280,000", date: "Jan 8, 2025" },
    { type: "expense" as const, description: "Software Subscriptions", amount: "₦35,000", date: "Jan 5, 2025" },
  ]

  const creatorTransactions = [
    { type: "income" as const, description: "Brand Sponsorship - Tech Review", amount: "₦850,000", date: "Jan 15, 2025" },
    { type: "income" as const, description: "YouTube Ad Revenue", amount: "₦420,000", date: "Jan 12, 2025" },
    { type: "expense" as const, description: "Video Equipment Purchase", amount: "₦280,000", date: "Jan 10, 2025" },
    { type: "income" as const, description: "Instagram Brand Deal", amount: "₦350,000", date: "Jan 8, 2025" },
    { type: "expense" as const, description: "Video Editing Software", amount: "₦45,000", date: "Jan 5, 2025" },
  ]

  const smallBusinessTransactions = [
    { type: "income" as const, description: "Product Sales - Q1 2025", amount: "₦2,500,000", date: "Jan 15, 2025" },
    { type: "expense" as const, description: "Employee Salaries", amount: "₦850,000", date: "Jan 10, 2025" },
    { type: "expense" as const, description: "Inventory Purchase", amount: "₦1,200,000", date: "Jan 8, 2025" },
    { type: "income" as const, description: "Service Revenue", amount: "₦680,000", date: "Jan 5, 2025" },
    { type: "expense" as const, description: "Office Rent & Utilities", amount: "₦350,000", date: "Jan 3, 2025" },
  ]

  const transactions = businessType === "freelancer" 
    ? freelancerTransactions 
    : businessType === "creator" 
    ? creatorTransactions 
    : smallBusinessTransactions

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        <div className="space-y-4">
          {transactions.map((transaction, index) => (
            <TransactionItem 
              key={index}
              type={transaction.type} 
              description={transaction.description} 
              amount={transaction.amount} 
              date={transaction.date} 
            />
          ))}
        </div>
      </div>
    </Card>
  )
}

