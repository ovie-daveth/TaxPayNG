"use client"

import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio"
import { Label } from "@/components/ui/label"
import { CreditCard, Globe, ExternalLink, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaymentMethod {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  external?: boolean
}

interface PaymentMethodCardProps {
  method: PaymentMethod
  selected: boolean
  onSelect: (methodId: string) => void
  processing: boolean
}

export function PaymentMethodCard({ method, selected, onSelect, processing }: PaymentMethodCardProps) {
  const index = PAYMENT_METHODS.findIndex(m => m.id === method.id)
  
  return (
    <Card
      style={{ animationDelay: `${index * 50}ms` }}
      className={cn(
        "animate-in fade-in slide-in-from-bottom-4 duration-500",
        "cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg",
        selected ? "border-primary border-2 shadow-xl bg-primary/5" : "border-border hover:border-primary/30",
        processing && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !processing && onSelect(method.id)}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 h-full min-h-[180px] relative">
        <RadioGroupItem value={method.id} id={method.id} disabled={processing} className="absolute top-3 right-3" />
        {processing && selected && (
          <Loader2 className="absolute top-3 left-3 w-5 h-5 animate-spin text-primary" />
        )}
        
        <div className="flex flex-col items-center justify-center gap-4 flex-1">
          <div className={cn(
            "transition-transform duration-300",
            selected && "scale-110"
          )}>
            {method.icon}
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Label htmlFor={method.id} className="cursor-pointer font-semibold text-lg">
                {method.name}
              </Label>
              {method.external && <ExternalLink className="w-4 h-4 text-muted-foreground" />}
            </div>
            <p className="text-sm text-muted-foreground">{method.description}</p>
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

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "remitta",
    name: "Remitta",
    description: "Pay via Remitta payment gateway",
    icon: <CreditCard className="w-12 h-12 text-primary" />,
  },
  {
    id: "interswitch",
    name: "Interswitch",
    description: "Pay via Interswitch payment gateway",
    icon: <CreditCard className="w-12 h-12 text-primary" />,
  },
  {
    id: "paystack",
    name: "Paystack",
    description: "Pay via Paystack payment gateway",
    icon: <CreditCard className="w-12 h-12 text-primary" />,
  },
  {
    id: "firs",
    name: "Direct to FIRS",
    description: "Redirect to FIRS official payment portal",
    icon: <Globe className="w-12 h-12 text-primary" />,
    external: true,
  },
]

