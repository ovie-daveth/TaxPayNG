"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Reminder } from "@/lib/types"

interface AddReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<any>
  editingReminder?: Reminder | null
  onUpdate?: (id: string, data: Partial<Reminder>) => Promise<any>
}

export function AddReminderDialog({ open, onOpenChange, onSubmit, editingReminder, onUpdate }: AddReminderDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    type: 'other' as Reminder['type'],
    priority: 'medium' as Reminder['priority'],
    isCompleted: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const isEditMode = !!editingReminder

  // Populate form when editing
  useEffect(() => {
    if (editingReminder) {
      // Parse ISO datetime string to separate date and time
      let dateValue = ''
      let timeValue = ''
      
      if (editingReminder.dueDate.includes('T')) {
        const [date, time] = editingReminder.dueDate.split('T')
        dateValue = date
        // Extract time part (HH:MM) from ISO string (might have timezone)
        timeValue = time.split('.')[0].substring(0, 5) // Get HH:MM from HH:MM:SS or HH:MM:SS.sss
      } else {
        dateValue = editingReminder.dueDate
        timeValue = '09:00' // Default to 9 AM if no time specified
      }
      
      setFormData({
        title: editingReminder.title,
        description: editingReminder.description || '',
        dueDate: dateValue,
        dueTime: timeValue,
        type: editingReminder.type,
        priority: editingReminder.priority,
        isCompleted: editingReminder.isCompleted
      })
    } else {
      // Reset form when not editing - default to current date and 9 AM
      const now = new Date()
      const defaultDate = now.toISOString().split('T')[0]
      const defaultTime = '09:00'
      
      setFormData({
        title: '',
        description: '',
        dueDate: defaultDate,
        dueTime: defaultTime,
        type: 'other',
        priority: 'medium',
        isCompleted: false
      })
    }
  }, [editingReminder, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.dueDate || !formData.dueTime) {
      toast.error('Please fill all required fields')
      return
    }

    // Combine date and time into ISO datetime string
    const combinedDateTime = `${formData.dueDate}T${formData.dueTime}:00`

    setIsSubmitting(true)
    try {
      if (isEditMode && editingReminder && onUpdate) {
        // Update existing reminder
        await onUpdate(editingReminder.id, {
          title: formData.title,
          description: formData.description || undefined,
          dueDate: combinedDateTime,
          type: formData.type,
          priority: formData.priority
        })
        toast.success('Reminder updated successfully!')
      } else {
        // Create new reminder
        await onSubmit({
          title: formData.title,
          description: formData.description || undefined,
          dueDate: combinedDateTime,
          type: formData.type,
          priority: formData.priority,
          isCompleted: false
        })
        toast.success('Reminder created successfully!')
      }
      
      // Reset form
      const now = new Date()
      const defaultDate = now.toISOString().split('T')[0]
      const defaultTime = '09:00'
      
      setFormData({
        title: '',
        description: '',
        dueDate: defaultDate,
        dueTime: defaultTime,
        type: 'other',
        priority: 'medium',
        isCompleted: false
      })
      
      onOpenChange(false)
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} reminder:`, error)
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} reminder`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Reminder' : 'Add Reminder'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="reminder-title">Title *</Label>
            <Input 
              id="reminder-title" 
              placeholder="e.g., Q1 Tax Payment Due" 
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-description">Description (Optional)</Label>
            <Textarea 
              id="reminder-description" 
              placeholder="Add details about this reminder..." 
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-date">Due Date *</Label>
              <Input 
                id="reminder-date" 
                type="date" 
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-time">Due Time *</Label>
              <Input 
                id="reminder-time" 
                type="time" 
                value={formData.dueTime}
                onChange={(e) => setFormData(prev => ({ ...prev, dueTime: e.target.value }))}
                required 
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reminder-type">Type</Label>
              <Select 
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as Reminder['type'] }))}
              >
                <SelectTrigger id="reminder-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tax_deadline">Tax Deadline</SelectItem>
                  <SelectItem value="payment_due">Payment Due</SelectItem>
                  <SelectItem value="document_submission">Document Submission</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as Reminder['priority'] }))}
              >
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

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!formData.title || !formData.dueDate || !formData.dueTime || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Reminder' : 'Add Reminder'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
