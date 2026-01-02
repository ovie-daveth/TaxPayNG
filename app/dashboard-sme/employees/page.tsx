"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function SMEEmployeesPage() {
  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Employees</h1>
        <Badge variant="secondary">Coming soon</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">We’re building this</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Employee management will be available for SMEs soon. For now, you can use Reports, Payments, and the Tax Calculator.
        </CardContent>
      </Card>
    </div>
  )
}


