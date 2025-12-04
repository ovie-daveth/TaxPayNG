"use client"

import { Button } from "@/components/ui/button"
import { Plus, FileText, Calculator, Bell, Settings, Receipt, Download, FileCheck, BarChart3 } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { UploadDocumentDialog } from "../documents/upload-document-dialog"
import { useState } from "react"
import { AddTransactionDialog } from "../transactions/add-transaction-dialog"
import { AddReminderDialog } from "../reminders/add-reminder-dialog"
import { ThemeToggle } from "../theme-toggle"
import { NotificationBell } from "../notifications/notification-bell"
import { useDocumentsFirebase } from "@/lib/hooks/use-documents-firebase"
import { useAuth } from "@/lib/hooks/useAuth"
import { useTransactions } from "@/lib/hooks/useTransactions"
import { useReminders } from "@/lib/hooks/useReminders"

export function DashboardHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAddReminderDialogOpen, setIsAddReminderDialogOpen] = useState(false)
  
  const { user } = useAuth()
  const { uploadDocument } = useDocumentsFirebase()
  const { createTransaction } = useTransactions(user?.uid || null)
  // Load reminders hook for header actions
  const { createReminder } = useReminders(user?.uid || null)

  const getPageInfo = (path: string) => {
    // Handle dynamic routes first
    if (path.startsWith("/dashboard/filing-requests/") && path !== "/dashboard/filing-requests") {
      return {
        title: "Filing Request Status",
        subtitle: "View status updates and communicate with your agent",
        buttonText: "",
        buttonIcon: FileText,
        buttonAction: () => {}
      }
    }
    
    switch (path) {
      case "/dashboard":
        return {
          title: "Dashboard",
          subtitle: "Welcome back! Here's your financial overview.",
          buttonText: "Pay Tax",
          buttonIcon: Plus,
          buttonAction: () => router.push("/dashboard/payment")
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
      case "/dashboard/invoices":
        return {
          title: "Invoices",
          subtitle: "Create, manage, and track your invoices",
          buttonText: "Create Invoice",
          buttonIcon: Plus,
          buttonAction: () => {
            // Trigger invoice creation - will be handled by the invoices page
            const event = new CustomEvent('createInvoice')
            window.dispatchEvent(event)
          }
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
      case "/dashboard/reports":
        return {
          title: "Reports & Filings",
          subtitle: "Generate tax reports and self-assessment filings for LIRS/FIRS",
          buttonText: "New Report",
          buttonIcon: BarChart3,
          buttonAction: () => router.push("/dashboard/reports/generate/self-assessment")
        }
      case "/dashboard/filing-requests":
        return {
          title: "Filing Requests",
          subtitle: "Track the status of your tax filing requests submitted to agents",
          buttonText: "",
          buttonIcon: FileText,
          buttonAction: () => {}
        }
      case "/dashboard/reports/generate/self-assessment":
        return {
          title: "Self-Assessment Filing",
          subtitle: "Create LIRS/FIRS-ready self-assessment report",
          buttonText: "",
          buttonIcon: BarChart3,
          buttonAction: () => {}
        }
      case "/dashboard/reports/generate/income-statement":
        return {
          title: "Income Statement",
          subtitle: "Detailed breakdown of all income sources and categories",
          buttonText: "",
          buttonIcon: BarChart3,
          buttonAction: () => {}
        }
      case "/dashboard/reports/generate/expense-report":
        return {
          title: "Expense Report",
          subtitle: "Comprehensive report of business expenses and deductions",
          buttonText: "",
          buttonIcon: BarChart3,
          buttonAction: () => {}
        }
      case "/dashboard/reports/generate/tax-summary":
        return {
          title: "Tax Summary Report",
          subtitle: "Annual or quarterly tax calculation summary with breakdowns",
          buttonText: "",
          buttonIcon: BarChart3,
          buttonAction: () => {}
        }
      case "/dashboard/payment":
        return {
          title: "Payment",
          subtitle: "Manage your tax payments and receipts",
          buttonText: "New Payment",
          buttonIcon: Plus,
          buttonAction: () => router.push("/dashboard/payment/add")
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">{pageInfo.title}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">{pageInfo.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <NotificationBell />
            <ThemeToggle />
            {pageInfo.showExportButton && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => console.log("Export transactions")}
                className="h-9 sm:h-10 text-xs sm:text-sm px-3"
              >
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
            {/* Show Add Reminder button on non-reminder pages */}
            {pathname !== "/dashboard/reminders" && pathname !== "/dashboard/settings" && (
              <Button 
                variant="outline" 
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10"
                onClick={() => setIsAddReminderDialogOpen(true)}
                title="Add Reminder"
              >
                <Bell className="w-4 h-4" />
              </Button>
            )}
            {/* Show main action button except on report generation pages */}
            {pageInfo.buttonText && (
              <Button 
                onClick={pageInfo.buttonAction}
                size="sm"
                className="h-9 sm:h-10 text-xs sm:text-sm whitespace-nowrap px-3"
              >
                <ButtonIcon className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{pageInfo.buttonText}</span>
                <span className="sm:hidden">{pageInfo.buttonText.split(' ')[0]}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      <UploadDocumentDialog 
        open={isUploadDialogOpen} 
        onOpenChange={setIsUploadDialogOpen} 
        onUpload={uploadDocument}
      />
      <AddTransactionDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        onSubmit={createTransaction}
        transaction={null}
      />
      {/* Render AddReminderDialog for all pages */}
      <AddReminderDialog 
        open={isAddReminderDialogOpen} 
        onOpenChange={setIsAddReminderDialogOpen}
        onSubmit={createReminder}
      />
    </div>
  )
}
