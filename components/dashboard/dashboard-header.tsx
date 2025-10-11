import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export function DashboardHeader() {
  return (
    <div className="border-b border-border bg-card md:ml-64">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back! Here's your financial overview.</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>
    </div>
  )
}
