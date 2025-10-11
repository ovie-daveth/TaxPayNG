"use client"

import { Button } from "@/components/ui/button"
import { Plus, FileText, Calculator, Bell, Settings, Receipt, Download } from "lucide-react"
import { usePathname } from "next/navigation"
import { UploadDocumentDialog } from "../documents/upload-document-dialog"
import { useState } from "react"
import { AddTransactionDialog } from "../transactions/add-transaction-dialog"
import { AddReminderDialog } from "../reminders/add-reminder-dialog"

export function DashboardHeader() {
  const pathname = usePathname()
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAddReminderDialogOpen, setIsAddReminderDialogOpen] = useState(false)

  const getPageInfo = (path: string) => {
    switch (path) {
      case "/dashboard":
        return {
          title: "Dashboard",
          subtitle: "Welcome back! Here's your financial overview.",
          buttonText: "Add Transaction",
          buttonIcon: Plus,
          buttonAction: () => console.log("Add transaction")
        }
      case "/dashboard/transactions":
        return {
          title: "Transactions",
          subtitle: "Track and manage your income and expenses",
          buttonText: "Add Transaction",
          buttonIcon: Plus,
          buttonAction: () => setIsAddDialogOpen(true),
          showExportButton: true
        }
      case "/dashboard/tax-calculator":
        return {
          title: "Tax Calculator",
          subtitle: "Calculate your tax obligations based on Nigerian tax laws (LIRS/FIRS)",
          buttonText: "New Calculation",
          buttonIcon: Calculator,
          buttonAction: () => console.log("New calculation")
        }
      case "/dashboard/documents":
        return {
          title: "Documents",
          subtitle: "Store and manage receipts, invoices, and proofs",
          buttonText: "Upload Document",
          buttonIcon: FileText,
          buttonAction: () => setIsUploadDialogOpen(true)
        }
      case "/dashboard/reminders":
        return {
          title: "Reminders",
          subtitle: "Stay on top of important tax deadlines",
          buttonText: "Add Reminder",
          buttonIcon: Bell,
          buttonAction: () => setIsAddReminderDialogOpen(true)
        }
      case "/dashboard/settings":
        return {
          title: "Settings",
          subtitle: "Manage your account and preferences",
          buttonText: "Save Changes",
          buttonIcon: Settings,
          buttonAction: () => console.log("Save settings")
        }
      default:
        return {
          title: "Dashboard",
          subtitle: "Welcome back! Here's your financial overview.",
          buttonText: "Add Transaction",
          buttonIcon: Plus,
          buttonAction: () => console.log("Add transaction")
        }
    }
  }

  const pageInfo = getPageInfo(pathname)
  const ButtonIcon = pageInfo.buttonIcon

  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{pageInfo.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{pageInfo.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {pageInfo.showExportButton && (
              <Button 
                variant="outline" 
                onClick={() => console.log("Export transactions")}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
            <Button onClick={pageInfo.buttonAction}>
              <ButtonIcon className="w-4 h-4 mr-2" />
              {pageInfo.buttonText}
            </Button>
          </div>
        </div>
      </div>
      <UploadDocumentDialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen} />
      <AddTransactionDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      <AddReminderDialog open={isAddReminderDialogOpen} onOpenChange={setIsAddReminderDialogOpen} />
    </div>
  )
}
