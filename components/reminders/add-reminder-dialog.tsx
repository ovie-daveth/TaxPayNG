"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
  
  // Track if any Select dropdown is open to prevent dialog from closing on mobile
  const [isAnySelectOpen, setIsAnySelectOpen] = useState(false)
  const selectOpenTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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

  // Monitor for Select dropdowns opening/closing to prevent dialog from closing on mobile
  useEffect(() => {
    if (!open) {
      setIsAnySelectOpen(false)
      if (selectOpenTimeoutRef.current) {
        clearTimeout(selectOpenTimeoutRef.current)
      }
      return
    }

    const checkSelectState = () => {
      const openSelect = document.querySelector('[data-radix-select-content][data-state="open"]')
      const isOpen = !!openSelect
      setIsAnySelectOpen(isOpen)
    }

    checkSelectState()

    const observer = new MutationObserver((mutations) => {
      const hasSelectMutation = mutations.some(mutation => {
        const target = mutation.target as HTMLElement
        return target.hasAttribute?.('data-radix-select-content') ||
               target.closest?.('[data-radix-select-content]') !== null ||
               mutation.attributeName === 'data-state'
      })
      
      if (hasSelectMutation) {
        checkSelectState()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state']
    })

    const interval = setInterval(checkSelectState, 200)

    return () => {
      clearInterval(interval)
      observer.disconnect()
      if (selectOpenTimeoutRef.current) {
        clearTimeout(selectOpenTimeoutRef.current)
      }
    }
  }, [open])

  // Handle escape key
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onOpenChange])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      const target = e.target as HTMLElement
      const isSelectContent = target.closest('[data-radix-select-content]') !== null
      const openSelectContent = document.querySelector('[data-radix-select-content][data-state="open"]')
      const selectViewport = document.querySelector('[data-radix-select-viewport]')
      const selectContent = document.querySelector('[data-radix-select-content]')
      
      const shouldPrevent = isSelectContent || 
                            isAnySelectOpen || 
                            openSelectContent || 
                            (selectContent && selectViewport)
      
      if (!shouldPrevent) {
        onOpenChange(false)
      }
    }
  }

  if (!open) return null

  // Render modal content using portal
  const modalContent = (
    <>
      {/* Custom Modal Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 dark:bg-black/50 animate-in fade-in-0"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Custom Modal Content */}
      <div className="fixed left-[50%] top-[50%] z-50 w-[calc(100vw-2rem)] sm:w-full max-w-2xl max-h-[90vh] sm:max-h-[95vh] translate-x-[-50%] translate-y-[-50%] border bg-background rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%] duration-200">
        <div className="flex flex-col h-full max-h-[90vh] sm:max-h-[95vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 border-b">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold leading-none tracking-tight">
              {isEditMode ? 'Edit Reminder' : 'Add Reminder'}
            </h2>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto p-3 sm:p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-2 sm:mt-4 overflow-x-hidden">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="reminder-title" className="text-xs sm:text-sm">Title *</Label>
            <Input 
              id="reminder-title" 
              placeholder="e.g., Q1 Tax Payment Due" 
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required 
              className="h-9 sm:h-10 text-xs sm:text-sm"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="reminder-description" className="text-xs sm:text-sm">Description (Optional)</Label>
            <Textarea 
              id="reminder-description" 
              placeholder="Add details about this reminder..." 
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="text-xs sm:text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="reminder-date" className="text-xs sm:text-sm">Due Date *</Label>
              <Input 
                id="reminder-date" 
                type="date" 
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                required 
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="reminder-time" className="text-xs sm:text-sm">Due Time *</Label>
              <Input 
                id="reminder-time" 
                type="time" 
                value={formData.dueTime}
                onChange={(e) => setFormData(prev => ({ ...prev, dueTime: e.target.value }))}
                required 
                className="h-9 sm:h-10 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="reminder-type" className="text-xs sm:text-sm">Type</Label>
              <Select 
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as Reminder['type'] }))}
              >
                <SelectTrigger id="reminder-type" className="h-9 sm:h-10 text-xs sm:text-sm">
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
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="reminder-priority" className="text-xs sm:text-sm">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as Reminder['priority'] }))}
              >
                <SelectTrigger id="reminder-priority" className="h-9 sm:h-10 text-xs sm:text-sm">
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

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-transparent h-9 sm:h-10 text-xs sm:text-sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
              disabled={!formData.title || !formData.dueDate || !formData.dueTime || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Reminder' : 'Add Reminder'
              )}
            </Button>
          </div>
        </form>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {typeof window !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  )
}
