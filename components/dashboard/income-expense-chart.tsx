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
      <div className="bg-card border border-border rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 shadow-2xl z-50">
        <div className="font-medium text-xs sm:text-sm mb-1.5 sm:mb-2">{`${label} 2025`}</div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-1.5 sm:gap-2 mb-1 last:mb-0">
            <div 
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs sm:text-sm text-muted-foreground">
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
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="mb-4 sm:mb-5 md:mb-6">
        <h3 className="text-base sm:text-lg font-semibold">Income vs Expenses</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Monthly comparison for 2025</p>
      </div>
      <div className="w-full h-[250px] sm:h-[280px] md:h-[300px] -ml-2 sm:ml-0">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 5, left: 0, bottom: 5 }} className="sm:!ml-0">
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
              fontSize: 10, 
              fontWeight: 500 
            }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ 
              className: 'fill-muted-foreground',
              fontSize: 10, 
              fontWeight: 500 
            }}
            tickFormatter={(value) => `₦${(value / 1000)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{
              paddingTop: '15px',
              fontSize: '12px',
              fontWeight: '500'
            }}
            iconType="circle"
            iconSize={8}
          />
          <Bar 
            dataKey="income" 
            fill="url(#incomeGradient)" 
            name="Income" 
            radius={[4, 4, 0, 0]}
            maxBarSize={35}
          />
          <Bar 
            dataKey="expenses" 
            fill="url(#expenseGradient)" 
            name="Expenses" 
            radius={[4, 4, 0, 0]}
            maxBarSize={35}
          />
        </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
