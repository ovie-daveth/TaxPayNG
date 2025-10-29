"use client"

import { Card } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

const data = [
  { month: "Jan", income: 75000, expenses: 165000 },
  { month: "Feb", income: 80000, expenses: 225000 },
  { month: "Mar", income: 80000, expenses: 180000 },
  { month: "Apr", income: 70000, expenses: 240000 },
  { month: "May", income: 85000, expenses: 280000 },
  { month: "Jun", income: 80000, expenses: 300000 },
]

// Custom tooltip component for better visibility
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 shadow-2xl z-50">
        <div className="font-medium mb-2">{`${label} 2025`}</div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">
              {entry.name}: <span className="font-semibold text-foreground">
                ₦{entry.value.toLocaleString()}
              </span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function IncomeExpenseChart() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Income vs Expenses</h3>
        <p className="text-sm text-muted-foreground">Monthly comparison for 2025</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#007F5F" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#004D40" stopOpacity={0.9} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFC107" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#FF9800" stopOpacity={0.9} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            className="stroke-border"
            strokeOpacity={0.3}
            vertical={false}
          />
          <XAxis 
            dataKey="month" 
            axisLine={false}
            tickLine={false}
            tick={{ 
              className: 'fill-muted-foreground',
              fontSize: 12, 
              fontWeight: 500 
            }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ 
              className: 'fill-muted-foreground',
              fontSize: 12, 
              fontWeight: 500 
            }}
            tickFormatter={(value) => `₦${(value / 1000)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '14px',
              fontWeight: '500'
            }}
            iconType="circle"
          />
          <Bar 
            dataKey="income" 
            fill="url(#incomeGradient)" 
            name="Income" 
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
          <Bar 
            dataKey="expenses" 
            fill="url(#expenseGradient)" 
            name="Expenses" 
            radius={[6, 6, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
