"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaxSummary } from "./tax-summary"

interface TaxSummaryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessType?: "freelancer" | "creator" | "small-business"
}

export function TaxSummaryModal({ open, onOpenChange, businessType = "freelancer" }: TaxSummaryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>Tax Summary</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <TaxSummary businessType={businessType} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

