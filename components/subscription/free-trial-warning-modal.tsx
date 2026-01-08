"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

interface FreeTrialWarningModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  daysRemaining: number
}

export function FreeTrialWarningModal({ open, onOpenChange, daysRemaining }: FreeTrialWarningModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center gap-1 mb-2">
            <DialogTitle className="text-xl">Free Trial Ending Soon</DialogTitle>
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </div>
          </div>
          <DialogDescription className="text-base pt-2">
            Your free trial ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. 
            Subscribe now to continue using OTax without interruption.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Don't lose access to your tax data and reports. Subscribe today to keep managing your taxes seamlessly.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/pricing" className="flex-1">
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                View Plans & Subscribe
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Remind Me Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

