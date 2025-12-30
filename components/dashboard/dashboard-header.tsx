"use client"

import { Button } from "@/components/ui/button"
import { Plus, FileText, Calculator, Bell, Settings, Receipt, Download, FileCheck, BarChart3, ArrowLeft } from "lucide-react"
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
import { useSubscription } from "@/lib/hooks/useSubscription"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { SubscriptionRequiredModal } from "../subscription/subscription-required-modal"

export function DashboardHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isAddReminderDialogOpen, setIsAddReminderDialogOpen] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const { isSubscribed, isExpired, loading: subscriptionLoading } = useSubscription()
  const { uploadDocument } = useDocumentsFirebase()
  const { createTransaction } = useTransactions(user?.uid || null)
  // Load reminders hook for header actions
  const { createReminder } = useReminders(user?.uid || null)

  const checkSubscription = (action: () => void) => {
    // Wait for subscription status to load
    if (subscriptionLoading) {
      return
    }
    // Check if user is subscribed or expired - if not, show modal
    if (!isSubscribed || isExpired) {
      setShowSubscriptionModal(true)
      return
    }
    // User is subscribed and not expired, proceed with action
    action()
  }

  const getPageInfo = (path: string) => {
    // Normalize path for matching (handle both /dashboard and /dashboard-creator)
    const isCreator = path.startsWith("/dashboard-creator")
    const normalizedPath = isCreator ? path.replace("/dashboard-creator", "/dashboard") : path
    const basePath = isCreator ? "/dashboard-creator" : "/dashboard"
    
    // Handle dynamic routes first
    if ((path.startsWith("/dashboard/filing-requests/") || path.startsWith("/dashboard-creator/filing-requests/")) && path !== "/dashboard/filing-requests" && path !== "/dashboard-creator/filing-requests") {
      return {
        title: "Filing Request Status",
        subtitle: "View status updates and communicate with your agent",
        buttonText: "",
        buttonIcon: Plus,
        buttonAction: () => {}
      }
    }
    
    switch (normalizedPath) {
      case "/dashboard":
        return {
          title: "Dashboard",
          subtitle: "Welcome back! Here's your financial overview.",
          buttonText: undefined,
          buttonIcon: undefined,
          buttonAction: undefined
        } 
      case "/dashboard/transactions":
        return {
          title: "Transactions",
          subtitle: "Track and manage your income and expenses",
          buttonText: "Add Transaction",
          buttonIcon: Plus,
          buttonAction: () => checkSubscription(() => setIsAddDialogOpen(true)),
          showExportButton: true
        }
      case "/dashboard/invoices":
        return {
          title: "Invoices",
          subtitle: "Create, manage, and track your invoices",
          buttonText: "Create Invoice",
          buttonIcon: Plus,
          buttonAction: () => checkSubscription(() => {
            // Trigger invoice creation - will be handled by the invoices page
            const event = new CustomEvent('createInvoice')
            window.dispatchEvent(event)
          })
        }
      case "/dashboard/tax-calculator":
        return {
          title: "Tax Calculator",
          subtitle: "Calculate your tax obligations based on Nigerian tax laws (LIRS/FIRS)",
          buttonText: "New Calculation",
          buttonIcon: Plus,
          buttonAction: () => console.log("New calculation") // No subscription check - this is the exemption
        }
      case "/dashboard/documents":
        return {
          title: "Documents",
          subtitle: "Store and manage receipts, invoices, and proofs",
          buttonText: "Upload Document",
          buttonIcon: Plus,
          buttonAction: () => checkSubscription(() => setIsUploadDialogOpen(true))
        }
      case "/dashboard/reminders":
        return {
          title: "Reminders",
          subtitle: "Stay on top of important tax deadlines",
          buttonText: "Add Reminder",
          buttonIcon: Plus,
          buttonAction: () => checkSubscription(() => setIsAddReminderDialogOpen(true))
        }
      case "/dashboard/reports":
        return {
          title: "Reports & Filings",
          subtitle: "Generate tax reports and self-assessment filings for LIRS/FIRS",
          buttonText: "New Report",
          buttonIcon: Plus,
          buttonAction: () => checkSubscription(() => router.push(`${basePath}/reports/generate/self-assessment`))
        }
      case "/dashboard/filing-requests":
        return {
          title: "Filing Requests",
          subtitle: "Track the status of your tax filing requests submitted to agents",
          buttonText: "",
          buttonIcon: Plus,
          buttonAction: () => {}
        }
      case "/dashboard/reports/generate/self-assessment":
        return {
          title: "Self-Assessment Filing",
          subtitle: "Create LIRS/FIRS-ready self-assessment report",
          buttonText: "",
          buttonIcon: Plus,
          buttonAction: () => {}
        }
      case "/dashboard/reports/generate/income-statement":
        return {
          title: "Income Statement",
          subtitle: "Detailed breakdown of all income sources and categories",
          buttonText: "",
          buttonIcon: Plus,
          buttonAction: () => {}
        }
      case "/dashboard/reports/generate/expense-report":
        return {
          title: "Expense Report",
          subtitle: "Comprehensive report of business expenses and deductions",
          buttonText: "",
          buttonIcon: Plus,
          buttonAction: () => {}
        }
      case "/dashboard/reports/generate/tax-summary":
        return {
          title: "Tax Summary Report",
          subtitle: "Annual or quarterly tax calculation summary with breakdowns",
          buttonText: "",
          buttonIcon: Plus,
          buttonAction: () => {}
        }
      case "/dashboard/payment":
        return {
          title: "Payment",
          subtitle: "Manage your tax payments and receipts",
          buttonText: "New Payment",
          buttonIcon: Plus,
          buttonAction: () => router.push(`${basePath}/payment/add`)
        }
      case "/dashboard/settings":
        return {
          title: "Settings",
          subtitle: "Manage your account and preferences",
          buttonText: "",
          buttonIcon: Settings,
          buttonAction: () => {}
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
  const showBackButton = pathname !== "/dashboard" && pathname !== "/dashboard/"

  return (
    <div className="border-b border-border bg-card w-full hidden md:block">
      <div className="w-full px-3 sm:px-4 md:px-4 lg:px-8 py-2.5 sm:py-3 md:py-3 lg:py-4">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-2 lg:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:block">
              {/* Back button beside title - Mobile only */}
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="md:hidden h-7 w-7 p-0 mr-1 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl md:text-lg lg:text-2xl font-bold">{pageInfo.title}</h1>
                <p className="hidden sm:block text-xs sm:text-sm md:text-xs lg:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">{pageInfo.subtitle}</p>
              </div>
            </div>
            {showBackButton && (
              <div className="sm:hidden ml-9">
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{pageInfo.subtitle}</p>
              </div>
            )}
            {!showBackButton && (
              <p className="sm:hidden text-xs text-muted-foreground mt-0.5 line-clamp-1">{pageInfo.subtitle}</p>
            )}
          </div>
          <div className="hidden md:flex md:flex-row items-center gap-1 md:gap-1 lg:gap-2 flex-shrink-0 justify-end md:justify-start">
            <div className="hidden md:flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
            </div>
            {pageInfo.showExportButton && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => console.log("Export transactions")}
                className="h-8 md:h-8 lg:h-10 text-xs md:text-xs lg:text-sm px-1.5 md:px-2 lg:px-3"
              >
                <Download className="w-3.5 h-3.5 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 md:mr-0 lg:mr-2" />
                <span className="hidden lg:inline">Export</span>
              </Button>
            )}
            {/* Show main action button except on report generation pages */}
            {pageInfo.buttonText && (
              <Button 
                onClick={pageInfo.buttonAction}
                size="sm"
                className="h-8 md:h-8 lg:h-10 text-xs md:text-xs lg:text-sm whitespace-nowrap px-1.5 md:px-2 lg:px-3"
              >
                {ButtonIcon && <ButtonIcon className="w-3.5 h-3.5 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 md:mr-0 lg:mr-2" />}
                <span className="hidden lg:inline">{pageInfo.buttonText}</span>
                <span className="lg:hidden">{pageInfo.buttonText.split(' ')[0]}</span>
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
      {(profile?.businessType !== 'agent' || !profile) && (
        <SubscriptionRequiredModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          businessType={profile?.businessType || 'freelancer'}
        />
      )}
    </div>
  )
}
