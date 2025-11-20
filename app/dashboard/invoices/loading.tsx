import { Card } from "@/components/ui/card"

export default function InvoicesLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-96 bg-muted rounded" />
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-6 h-32 animate-pulse bg-muted" />
        ))}
      </div>
    </div>
  )
}

