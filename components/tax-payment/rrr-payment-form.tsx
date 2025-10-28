"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface RRRPaymentFormProps {
  onGenerateRRR: (rrr: string, tin: string, state: string) => void
  processing: boolean
  initialTin?: string
  initialState?: string
}

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara", "FCT"
]

// Mock TIN - in production this would come from user profile
const MOCK_TIN = "123456789-0001"

// Mock state - in production this would come from user profile
const MOCK_STATE = "Lagos"

export function RRRPaymentForm({ onGenerateRRR, processing, initialTin, initialState }: RRRPaymentFormProps) {
  const [tin, setTin] = useState(initialTin || MOCK_TIN)
  const [state, setState] = useState(initialState || MOCK_STATE)
  const [generating, setGenerating] = useState(false)

  // Generate mock RRR
  const generateRRR = async () => {
    if (!tin || !state) {
      toast.error("Please fill in all required fields")
      return
    }

    setGenerating(true)
    
    // Simulate API call to generate RRR
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Generate mock RRR: format is usually 12 digits or alphanumeric
    const rrr = `RRR${Date.now().toString().slice(-9)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`
    
    setGenerating(false)
    toast.success("RRR Generated Successfully")
    onGenerateRRR(rrr, tin, state)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate RRR (Remita Retrieval Reference)</CardTitle>
        <CardDescription>
          Complete the form below to generate your RRR for tax payment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="tin">Tax Identification Number (TIN) *</Label>
          <Input
            id="tin"
            value={tin}
            onChange={(e) => setTin(e.target.value)}
            placeholder="Enter your TIN"
            disabled={processing || generating}
            required
          />
          <p className="text-xs text-muted-foreground">
            Your Tax Identification Number for this payment
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State of Work *</Label>
          <Select value={state} onValueChange={setState} disabled={processing || generating}>
            <SelectTrigger id="state">
              <SelectValue placeholder="Select your state of work" />
            </SelectTrigger>
            <SelectContent>
              {NIGERIAN_STATES.map((stateName) => (
                <SelectItem key={stateName} value={stateName}>
                  {stateName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The state where you carry out your business/work
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> The RRR generated will be used as your transaction reference. 
            Keep it secure as you'll need it for payment confirmation.
          </p>
        </div>

        <Button 
          onClick={generateRRR} 
          disabled={processing || generating || !tin || !state}
          className="w-full"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating RRR...
            </>
          ) : (
            "Generate RRR"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

