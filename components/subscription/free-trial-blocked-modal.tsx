"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Lock, AlertCircle } from "lucide-react"
import { BusinessType } from "@/lib/types"
import { useAuth } from "@/lib/hooks/useAuth"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface FreeTrialBlockedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessType?: BusinessType
  onOpenSubscription?: () => void
}

export function FreeTrialBlockedModal({ open, onOpenChange, businessType = 'freelancer', onOpenSubscription }: FreeTrialBlockedModalProps) {
  const { logout } = useAuth()
  const router = useRouter()

  // Prevent closing the modal - user must subscribe
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // If onOpenSubscription is provided, open subscription modal instead of redirecting
      if (onOpenSubscription) {
        onOpenSubscription()
      } else {
        // Fallback: redirect to pricing
        window.location.href = '/pricing'
      }
    }
  }

  const handleSubscribe = () => {
    if (onOpenSubscription) {
      onOpenSubscription()
      // Close the blocked modal when opening subscription modal
      onOpenChange(false)
    } else {
      // Fallback: redirect to pricing
      window.location.href = '/pricing'
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
              <Lock className="h-6 w-6 text-red-600 dark:text-red-500" />
            </div>
            <DialogTitle className="text-xl">Free Trial Expired</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Your free trial has ended. Please subscribe to continue using OTax and access your tax data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  To continue managing your taxes, invoices, and reports, you need an active subscription.
                </p>
                <p>
                  Your data is safe and will be available once you subscribe.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button className="w-full" size="lg" onClick={handleSubscribe}>
              Subscribe Now
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={async () => {
                try {
                  const result = await logout()
                  if (result.success) {
                    toast.success('Signed out successfully')
                    router.push('/login')
                  } else {
                    toast.error(result.error || 'Failed to sign out')
                  }
                } catch (error) {
                  toast.error('An error occurred during sign out')
                  // Force redirect even if logout fails
                  router.push('/login')
                }
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

