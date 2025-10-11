"use client"

import { Card } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

const data = [
  { month: "Jan", income: 70000, expenses: 170000 },
  { month: "Feb", income: 80000, expenses: 220000 },
  { month: "Mar", income: 80000, expenses: 190000 },
  { month: "Apr", income: 70000, expenses: 240000 },
  { month: "May", income: 90000, expenses: 280000 },
  { month: "Jun", income: 80000, expenses: 310000 },
]

export function IncomeExpenseChart() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Income vs Expenses</h3>
        <p className="text-sm text-muted-foreground">Monthly comparison for 2025</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              zIndex: 1000,
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value, name) => [
              `₦${value.toLocaleString()}`,
              name
            ]}
            labelFormatter={(label) => `${label} 2025`}
          />
          <Legend />
          <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
