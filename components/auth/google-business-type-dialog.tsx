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
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md overflow-x-hidden max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Your Business Type</DialogTitle>
          <DialogDescription>
            Please select your business type to complete your Google sign up.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 pt-4">
          <Button
            variant="outline"
            className="w-full justify-start items-start h-auto py-4 whitespace-normal text-left"
            onClick={() => handleSelect('freelancer')}
          >
            <div className="text-left min-w-0 w-full">
              <div className="font-semibold">Self Employed</div>
              <div className="text-sm text-muted-foreground wrap-break-word">
                Independent Professional (Freelancer / Self-Employed)
              </div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start items-start h-auto py-4 whitespace-normal text-left"
            onClick={() => handleSelect('creator')}
          >
            <div className="text-left min-w-0 w-full">
              <div className="font-semibold">Content Creator</div>
              <div className="text-sm text-muted-foreground wrap-break-word">
                YouTuber, influencer, or content creator
              </div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start items-start h-auto py-4 whitespace-normal text-left"
            onClick={() => handleSelect('sme')}
          >
            <div className="text-left min-w-0 w-full">
              <div className="font-semibold">Small/Medium Business</div>
              <div className="text-sm text-muted-foreground wrap-break-word">
                Registered Business (Small / Medium Enterprise)
              </div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="w-full justify-start items-start h-auto py-4 whitespace-normal text-left"
            onClick={() => handleSelect('consultant')}
          >
            <div className="text-left min-w-0 w-full">
              <div className="font-semibold">Tax Consultant</div>
              <div className="text-sm text-muted-foreground wrap-break-word">
                Professional tax consultant managing multiple businesses and individuals
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

