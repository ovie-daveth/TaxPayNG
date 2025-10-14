"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface AddReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<any>
}

export function AddReminderDialog({ open, onOpenChange, onSubmit }: AddReminderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Reminder</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="reminder-title">Title</Label>
            <Input id="reminder-title" placeholder="e.g., Q1 Tax Payment Due" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-description">Description</Label>
            <Textarea id="reminder-description" placeholder="Add details about this reminder..." rows={3} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-date">Date</Label>
              <Input id="reminder-date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-time">Time (Optional)</Label>
              <Input id="reminder-time" type="time" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-type">Type</Label>
              <Select>
                <SelectTrigger id="reminder-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tax_deadline">Tax Deadline</SelectItem>
                  <SelectItem value="quarterly_payment">Quarterly Payment</SelectItem>
                  <SelectItem value="document_submission">Document Submission</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-priority">Priority</Label>
              <Select>
                <SelectTrigger id="reminder-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-notify">Notify Me</Label>
            <Select>
              <SelectTrigger id="reminder-notify">
                <SelectValue placeholder="Select notification time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on-day">On the day</SelectItem>
                <SelectItem value="1-day">1 day before</SelectItem>
                <SelectItem value="3-days">3 days before</SelectItem>
                <SelectItem value="1-week">1 week before</SelectItem>
                <SelectItem value="2-weeks">2 weeks before</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add Reminder
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
