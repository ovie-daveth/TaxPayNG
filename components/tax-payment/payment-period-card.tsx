"use client"

import { Card, CardContent } from "@/components/ui/card"
import { RadioGroupItem } from "@/components/ui/radio"
import { Label } from "@/components/ui/label"
import { Calendar, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaymentPeriod {
  id: string
  name: string
  description: string
  icon: React.ReactNode
}

const PERIODS: PaymentPeriod[] = [
  {
    id: "monthly",
    name: "Monthly",
    description: "Pay your monthly tax obligations",
    icon: <Calendar className="w-12 h-12 text-primary" />,
  },
  {
    id: "quarterly",
    name: "Quarterly",
    description: "Pay for a quarter (3 months)",
    icon: <Calendar className="w-12 h-12 text-primary" />,
  },
  {
    id: "yearly",
    name: "Yearly",
    description: "Pay your annual tax obligations",
    icon: <Calendar className="w-12 h-12 text-primary" />,
  },
]

interface PaymentPeriodCardProps {
  period: PaymentPeriod
  selected: boolean
  onSelect: (periodId: string) => void
}

export function PaymentPeriodCard({ period, selected, onSelect }: PaymentPeriodCardProps) {
  const index = PERIODS.findIndex(p => p.id === period.id)
  
  return (
    <Card
      style={{ animationDelay: `${index * 100}ms` }}
      className={cn(
        "animate-in fade-in slide-in-from-bottom-4 duration-500",
        "cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg",
        selected ? "border-primary border-2 shadow-xl bg-primary/5" : "border-border hover:border-primary/30",
      )}
      onClick={() => onSelect(period.id)}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 h-full min-h-[180px] relative">
        <RadioGroupItem value={period.id} id={period.id} className="absolute top-3 right-3" />
        
        <div className="flex flex-col items-center justify-center gap-4 flex-1">
          <div className={cn(
            "transition-transform duration-300",
            selected && "scale-110"
          )}>
            {period.icon}
          </div>
          
          <div className="text-center">
            <Label htmlFor={period.id} className="cursor-pointer font-semibold text-lg">
              {period.name}
            </Label>
            <p className="text-sm text-muted-foreground mt-1">{period.description}</p>
          </div>
        </div>
        
        {selected && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full animate-in fade-in duration-300">
            Selected
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { PERIODS }

