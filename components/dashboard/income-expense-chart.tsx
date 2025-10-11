"use client"

import { Card } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

const data = [
  { month: "Jan", income: 180000, expenses: 65000 },
  { month: "Feb", income: 220000, expenses: 78000 },
  { month: "Mar", income: 195000, expenses: 82000 },
  { month: "Apr", income: 240000, expenses: 71000 },
  { month: "May", income: 280000, expenses: 95000 },
  { month: "Jun", income: 310000, expenses: 88000 },
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
            }}
          />
          <Legend />
          <Bar dataKey="income" fill="hsl(var(--chart-1))" name="Income" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" fill="hsl(var(--chart-2))" name="Expenses" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
