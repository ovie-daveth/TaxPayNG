"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FilingRequestStatus } from "@/lib/types"
import { Loader2 } from "lucide-react"

interface StatusUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentStatus: FilingRequestStatus
  onUpdate: (status: FilingRequestStatus, notes?: string) => Promise<void>
}

export function StatusUpdateDialog({ open, onOpenChange, currentStatus, onUpdate }: StatusUpdateDialogProps) {
  const [status, setStatus] = useState<FilingRequestStatus>(currentStatus)
  const [notes, setNotes] = useState("")
  const [updating, setUpdating] = useState(false)

  const handleSubmit = async () => {
    if (status === currentStatus) {
      onOpenChange(false)
      return
    }

    setUpdating(true)
    try {
      await onUpdate(status, notes.trim() || undefined)
      setNotes("")
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setUpdating(false)
    }
  }

  const getNextStatuses = (current: FilingRequestStatus): FilingRequestStatus[] => {
    const statusFlow: Record<FilingRequestStatus, FilingRequestStatus[]> = {
      pending: ['assigned'],
      assigned: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    }
    return statusFlow[current] || []
  }

  const availableStatuses = getNextStatuses(currentStatus)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Request Status</DialogTitle>
          <DialogDescription>
            Change the status of this filing request. The client will be notified of the update.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Status</Label>
            <div className="text-sm text-muted-foreground capitalize">
              {currentStatus.replace('_', ' ')}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as FilingRequestStatus)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace('_', ' ').split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableStatuses.length === 0 && (
              <p className="text-xs text-muted-foreground">
                This request is already {currentStatus === 'completed' ? 'completed' : 'cancelled'} and cannot be changed.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this status change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updating || availableStatuses.length === 0}>
            {updating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Status"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

