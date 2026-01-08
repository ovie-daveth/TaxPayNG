"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BusinessType } from "@/lib/types"

interface GoogleBusinessTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (businessType: BusinessType) => void
}

export function GoogleBusinessTypeDialog({ open, onOpenChange, onSelect }: GoogleBusinessTypeDialogProps) {
  const handleSelect = (businessType: BusinessType) => {
    onSelect(businessType)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Your Business Type</DialogTitle>
          <DialogDescription>
            Please select your business type to complete your Google sign up.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 pt-4">
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={() => handleSelect('freelancer')}
          >
            <div className="text-left">
              <div className="font-semibold">Freelancer</div>
              <div className="text-sm text-muted-foreground">Individual contractor or consultant</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={() => handleSelect('creator')}
          >
            <div className="text-left">
              <div className="font-semibold">Content Creator</div>
              <div className="text-sm text-muted-foreground">YouTuber, influencer, or content creator</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={() => handleSelect('sme')}
          >
            <div className="text-left">
              <div className="font-semibold">Small/Medium Business</div>
              <div className="text-sm text-muted-foreground">Small or medium-sized enterprise</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={() => handleSelect('agent')}
          >
            <div className="text-left">
              <div className="font-semibold">Tax Filing Agent</div>
              <div className="text-sm text-muted-foreground">Help others file their taxes</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

