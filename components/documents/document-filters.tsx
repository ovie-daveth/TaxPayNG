import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { DocumentFilters as FilterType } from "@/lib/types/document"

interface DocumentFiltersProps {
  filters: FilterType
  onFiltersChange: (filters: FilterType) => void
}

export function DocumentFilters({ filters, onFiltersChange }: DocumentFiltersProps) {
  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value === "all" ? undefined : value as any
    })
  }

  const handleFileTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      fileType: value === "all" ? undefined : value as any
    })
  }

  const handleLinkedChange = (value: string) => {
    onFiltersChange({
      ...filters,
      linkedTransaction: value === "all" ? undefined : value === "linked"
    })
  }

  const handleDateRangeChange = (value: string) => {
    let dateRange = undefined
    const now = new Date()
    
    switch (value) {
      case "this-month":
        dateRange = {
          start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          end: now.toISOString()
        }
        break
      case "last-month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        dateRange = {
          start: lastMonth.toISOString(),
          end: new Date(now.getFullYear(), now.getMonth(), 0).toISOString()
        }
        break
      case "this-year":
        dateRange = {
          start: new Date(now.getFullYear(), 0, 1).toISOString(),
          end: now.toISOString()
        }
        break
    }

    onFiltersChange({
      ...filters,
      dateRange
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Filters</h3>
        <Button variant="ghost" size="sm" onClick={clearAllFilters}>
          <X className="w-4 h-4 mr-1" />
          Clear All
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="doc-type">Document Type</Label>
          <Select 
            value={filters.type || "all"} 
            onValueChange={handleTypeChange}
          >
            <SelectTrigger id="doc-type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="receipt">Receipt</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="proof">Proof</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="file-type">File Type</Label>
          <Select 
            value={filters.fileType || "all"} 
            onValueChange={handleFileTypeChange}
          >
            <SelectTrigger id="file-type">
              <SelectValue placeholder="All formats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All formats</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="document">Document</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="linked">Linked Status</Label>
          <Select 
            value={filters.linkedTransaction === undefined ? "all" : filters.linkedTransaction ? "linked" : "unlinked"}
            onValueChange={handleLinkedChange}
          >
            <SelectTrigger id="linked">
              <SelectValue placeholder="All documents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All documents</SelectItem>
              <SelectItem value="linked">Linked to transaction</SelectItem>
              <SelectItem value="unlinked">Not linked</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date-range">Date Range</Label>
          <Select 
            value={filters.dateRange ? "this-month" : "all"}
            onValueChange={handleDateRangeChange}
          >
            <SelectTrigger id="date-range">
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="this-month">This month</SelectItem>
              <SelectItem value="last-month">Last month</SelectItem>
              <SelectItem value="this-year">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  )
}
