"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, MoreVertical, Pencil, Trash2, Paperclip } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const transactions = [
  {
    id: 1,
    type: "income",
    description: "Client Payment - Website Design",
    amount: 450000,
    date: "2025-01-15",
    category: "Services",
    paymentMethod: "Bank Transfer",
    hasAttachment: true,
    taxDeductible: false,
  },
  {
    id: 2,
    type: "expense",
    description: "Office Rent",
    amount: 120000,
    date: "2025-01-14",
    category: "Rent",
    paymentMethod: "Bank Transfer",
    hasAttachment: true,
    taxDeductible: true,
  },
  {
    id: 3,
    type: "income",
    description: "Consulting Fee - Tech Startup",
    amount: 280000,
    date: "2025-01-12",
    category: "Consulting",
    paymentMethod: "Cash",
    hasAttachment: false,
    taxDeductible: false,
  },
  {
    id: 4,
    type: "expense",
    description: "Software Subscription - Adobe Creative Cloud",
    amount: 25000,
    date: "2025-01-10",
    category: "Software",
    paymentMethod: "Card",
    hasAttachment: true,
    taxDeductible: true,
  },
  {
    id: 5,
    type: "income",
    description: "Project Milestone Payment",
    amount: 350000,
    date: "2025-01-08",
    category: "Projects",
    paymentMethod: "Bank Transfer",
    hasAttachment: true,
    taxDeductible: false,
  },
  {
    id: 6,
    type: "expense",
    description: "Internet & Utilities",
    amount: 35000,
    date: "2025-01-05",
    category: "Utilities",
    paymentMethod: "Bank Transfer",
    hasAttachment: false,
    taxDeductible: true,
  },
  {
    id: 7,
    type: "income",
    description: "Freelance Writing - Blog Posts",
    amount: 180000,
    date: "2025-01-03",
    category: "Services",
    paymentMethod: "Bank Transfer",
    hasAttachment: false,
    taxDeductible: false,
  },
  {
    id: 8,
    type: "expense",
    description: "Marketing & Advertising",
    amount: 75000,
    date: "2025-01-02",
    category: "Marketing",
    paymentMethod: "Card",
    hasAttachment: true,
    taxDeductible: true,
  },
]

export function TransactionList() {
  return (
    <Card className="overflow-hidden">
      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Description</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Category</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Payment Method</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="py-4 px-4 text-sm">{transaction.date}</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        transaction.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{transaction.description}</span>
                      {transaction.hasAttachment && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Badge variant="secondary" className="text-xs">
                    {transaction.category}
                  </Badge>
                </td>
                <td className="py-4 px-4 text-sm text-muted-foreground">{transaction.paymentMethod}</td>
                <td className="py-4 px-4 text-right">
                  <span
                    className={`font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                  >
                    {transaction.type === "income" ? "+" : "-"}₦{transaction.amount.toLocaleString()}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  {transaction.taxDeductible && (
                    <Badge variant="outline" className="text-xs">
                      Tax Deductible
                    </Badge>
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden divide-y divide-border">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    transaction.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  }`}
                >
                  {transaction.type === "income" ? (
                    <ArrowUpRight className="w-5 h-5" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{transaction.description}</p>
                    {transaction.hasAttachment && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{transaction.date}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {transaction.category}
                </Badge>
                {transaction.taxDeductible && (
                  <Badge variant="outline" className="text-xs">
                    Tax Deductible
                  </Badge>
                )}
              </div>
              <span className={`font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}>
                {transaction.type === "income" ? "+" : "-"}₦{transaction.amount.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
