import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Eye, FileText } from "lucide-react"

const reports = [
  {
    id: 1,
    title: "Self-Assessment Filing - Q4 2024",
    type: "Self-Assessment",
    generatedAt: "2025-01-15",
    period: "Q4 2024",
    status: "completed",
  },
  {
    id: 2,
    title: "Income Statement - December 2024",
    type: "Income Statement",
    generatedAt: "2025-01-10",
    period: "December 2024",
    status: "completed",
  },
  {
    id: 3,
    title: "Tax Summary Report - 2024",
    type: "Tax Summary",
    generatedAt: "2025-01-08",
    period: "Annual 2024",
    status: "completed",
  },
  {
    id: 4,
    title: "Expense Report - Q4 2024",
    type: "Expense Report",
    generatedAt: "2025-01-05",
    period: "Q4 2024",
    status: "completed",
  },
  {
    id: 5,
    title: "Self-Assessment Filing - Q3 2024",
    type: "Self-Assessment",
    generatedAt: "2024-10-15",
    period: "Q3 2024",
    status: "submitted",
  },
]

export function RecentReports() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Recent Reports</h2>
        <p className="text-sm text-muted-foreground mt-1">Your previously generated reports</p>
      </div>

      <div className="space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm mb-1 truncate">{report.title}</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {report.type}
                </Badge>
                <span className="text-xs text-muted-foreground">{report.period}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">Generated {report.generatedAt}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={report.status === "submitted" ? "default" : "outline"} className="text-xs capitalize">
                {report.status}
              </Badge>
              <Button variant="ghost" size="icon">
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
