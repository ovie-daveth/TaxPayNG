"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react"
import { SubscriptionType } from "@/lib/types"
import { toast } from "sonner"

interface MigrateToCreatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planType: SubscriptionType
  onConfirm: () => Promise<void>
}

export function MigrateToCreatorModal({
  open,
  onOpenChange,
  planType,
  onConfirm
}: MigrateToCreatorModalProps) {
  const [isMigrating, setIsMigrating] = useState(false)

  const handleConfirm = async () => {
    setIsMigrating(true)
    try {
      await onConfirm()
      // Close modal silently - migration happens in background
      onOpenChange(false)
    } catch (error) {
      console.error("Migration error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to migrate account")
      setIsMigrating(false)
    }
    // Don't reset isMigrating here - let it stay true so button shows loading during redirect
  }

  const planName = planType === 'GOLD' ? 'GOLD' : 'PLATINUM'

  console.log('MigrateToCreatorModal render:', { open, planType, shouldRender: open && planType })

  // Always render the Dialog, but control visibility with open prop
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-md p-3 sm:p-6" style={{ zIndex: 60 }}>
        <DialogHeader className="p-0">
          <div className="flex flex-col items-center text-center">
            <DialogTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2 justify-center">
              Migrate to Creator Account
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm mt-0.5 sm:mt-1">
              Upgrade your account type to access creator plans
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <div className="bg-muted/50 border border-border rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium">
                  You're about to migrate from a <strong>Freelancer</strong> account to a <strong>Creator</strong> account.
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  The {planName} plan is designed for content creators and influencers. By continuing, your account type will be changed to "Creator" and you'll be redirected to the Creator Dashboard after payment.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <p className="text-xs sm:text-sm font-medium">What this means:</p>
            <ul className="space-y-1 sm:space-y-1.5 text-[10px] sm:text-xs text-muted-foreground list-disc list-inside">
              <li>Your dashboard will switch to the Creator Dashboard</li>
              <li>You'll have access to creator-specific features</li>
              <li>Your account type will be permanently changed to "Creator"</li>
              <li>You can still access all your existing data</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1 sm:pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isMigrating}
              className="flex-1 h-8 sm:h-10 text-xs sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isMigrating}
              className="flex-1 h-8 sm:h-10 text-xs sm:text-sm"
            >
              {isMigrating ? (
                <>
                  <span className="animate-spin mr-1.5 sm:mr-2">⏳</span>
                  Processing...
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Continue to {planName}</span>
                  <span className="sm:hidden">Continue</span>
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

