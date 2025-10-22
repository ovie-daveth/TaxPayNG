"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, DollarSign, FileText, Bell, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal"
import { Reminder } from "@/lib/types"
import { toast } from "sonner"

interface RemindersListProps {
  reminders: Reminder[]
  loading: boolean
  onUpdate: (id: string, data: Partial<Reminder>) => Promise<any>
  onDelete: (id: string) => Promise<any>
  onMarkCompleted: (id: string) => Promise<any>
  onMarkIncomplete: (id: string) => Promise<any>
  onEdit: (reminder: Reminder) => void
}

function getReminderIcon(type: string) {
  switch (type) {
    case "tax_deadline":
      return DollarSign
    case "document_submission":
      return FileText
    case "quarterly_payment":
      return Calendar
    default:
      return Bell
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700"
    case "medium":
      return "bg-orange-100 text-orange-700"
    case "low":
      return "bg-blue-100 text-blue-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

function getDateStatus(daysUntil: number, isCompleted: boolean) {
  if (isCompleted) return { text: "Completed", color: "text-green-600" }
  if (daysUntil < 0) return { text: "Overdue", color: "text-red-600" }
  if (daysUntil <= 7) return { text: `${daysUntil} days left`, color: "text-red-600" }
  if (daysUntil <= 30) return { text: `${daysUntil} days left`, color: "text-orange-600" }
  return { text: `${daysUntil} days left`, color: "text-muted-foreground" }
}

function calculateDaysUntil(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffTime = due.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function RemindersList({ 
  reminders, 
  loading, 
  onUpdate, 
  onDelete, 
  onMarkCompleted, 
  onMarkIncomplete,
  onEdit
}: RemindersListProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedReminders, setSelectedReminders] = useState<Set<string>>(new Set())
  const [isCompletingBatch, setIsCompletingBatch] = useState(false)

  const upcomingReminders = reminders.filter((r) => !r.isCompleted)
  const completedReminders = reminders.filter((r) => r.isCompleted)
  
  const selectedUpcomingCount = Array.from(selectedReminders).filter(id => 
    upcomingReminders.some(r => r.id === id)
  ).length
  
  const selectedCompletedCount = Array.from(selectedReminders).filter(id => 
    completedReminders.some(r => r.id === id)
  ).length

  const openDeleteModal = (reminder: Reminder) => {
    setReminderToDelete(reminder)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false)
      setReminderToDelete(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!reminderToDelete) return
    
    setIsDeleting(true)
    try {
      await onDelete(reminderToDelete.id)
      closeDeleteModal()
    } catch (error) {
      console.error('Failed to delete reminder:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleSelection = (reminderId: string) => {
    setSelectedReminders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reminderId)) {
        newSet.delete(reminderId)
      } else {
        newSet.add(reminderId)
      }
      return newSet
    })
  }

  const selectAll = (reminderList: Reminder[]) => {
    setSelectedReminders(prev => {
      const newSet = new Set(prev)
      reminderList.forEach(r => newSet.add(r.id))
      return newSet
    })
  }

  const deselectAll = () => {
    setSelectedReminders(new Set())
  }

  const handleBulkComplete = async () => {
    const upcomingIds = Array.from(selectedReminders).filter(id => 
      upcomingReminders.some(r => r.id === id)
    )
    
    if (upcomingIds.length === 0) return

    setIsCompletingBatch(true)
    try {
      await Promise.all(upcomingIds.map(id => onMarkCompleted(id)))
      setSelectedReminders(new Set())
      toast.success(`${upcomingIds.length} reminder${upcomingIds.length > 1 ? 's' : ''} completed successfully!`)
    } catch (error) {
      console.error('Failed to complete reminders:', error)
      toast.error('Failed to complete reminders')
    } finally {
      setIsCompletingBatch(false)
    }
  }

  const handleBulkMarkIncomplete = async () => {
    const completedIds = Array.from(selectedReminders).filter(id => 
      completedReminders.some(r => r.id === id)
    )
    
    if (completedIds.length === 0) return

    setIsCompletingBatch(true)
    try {
      await Promise.all(completedIds.map(id => onMarkIncomplete(id)))
      setSelectedReminders(new Set())
      toast.success(`${completedIds.length} reminder${completedIds.length > 1 ? 's' : ''} reopened successfully!`)
    } catch (error) {
      console.error('Failed to mark reminders as incomplete:', error)
      toast.error('Failed to reopen reminders')
    } finally {
      setIsCompletingBatch(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Reminders */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Upcoming Reminders</h2>
              <p className="text-sm text-muted-foreground mt-1">Your scheduled reminders and deadlines</p>
            </div>
            {upcomingReminders.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {selectedUpcomingCount > 0 ? (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {selectedUpcomingCount} selected
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={deselectAll}
                    >
                      Clear
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleBulkComplete}
                      disabled={isCompletingBatch}
                    >
                      {isCompletingBatch ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        `Complete ${selectedUpcomingCount}`
                      )}
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => selectAll(upcomingReminders)}
                  >
                    Select All
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {upcomingReminders.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No upcoming reminders</p>
            </div>
          ) : (
            upcomingReminders.map((reminder) => {
              const Icon = getReminderIcon(reminder.type)
              const daysUntil = calculateDaysUntil(reminder.dueDate)
              const dateStatus = getDateStatus(daysUntil, reminder.isCompleted)
              return (
                <div
                  key={reminder.id}
                  className={`flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors ${
                    selectedReminders.has(reminder.id) ? 'bg-muted/50 border-primary' : ''
                  }`}
                >
                  <Checkbox 
                    id={`reminder-${reminder.id}`} 
                    className="mt-1" 
                    checked={selectedReminders.has(reminder.id)}
                    onCheckedChange={() => toggleSelection(reminder.id)}
                  />
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getPriorityColor(reminder.priority)}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-sm">{reminder.title}</h3>
                      <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                        {reminder.priority}
                      </Badge>
                    </div>
                    {reminder.description && (
                      <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{new Date(reminder.dueDate).toLocaleDateString()}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className={dateStatus.color}>{dateStatus.text}</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(reminder)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => openDeleteModal(reminder)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Completed Reminders */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Completed Reminders</h2>
              <p className="text-sm text-muted-foreground mt-1">Your completed tasks and deadlines</p>
            </div>
            {completedReminders.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {selectedCompletedCount > 0 ? (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {selectedCompletedCount} selected
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={deselectAll}
                    >
                      Clear
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={handleBulkMarkIncomplete}
                      disabled={isCompletingBatch}
                    >
                      {isCompletingBatch ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        `Reopen ${selectedCompletedCount}`
                      )}
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => selectAll(completedReminders)}
                  >
                    Select All
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {completedReminders.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No completed reminders</p>
            </div>
          ) : (
            completedReminders.map((reminder) => {
              const Icon = getReminderIcon(reminder.type)
              return (
                <div 
                  key={reminder.id} 
                  className={`flex items-start gap-4 p-4 border border-border rounded-lg opacity-60 ${
                    selectedReminders.has(reminder.id) ? 'bg-muted/50 border-primary opacity-100' : ''
                  }`}
                >
                  <Checkbox 
                    id={`reminder-${reminder.id}`} 
                    checked={selectedReminders.has(reminder.id)}
                    className="mt-1"
                    onCheckedChange={() => toggleSelection(reminder.id)}
                  />
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-through">{reminder.title}</h3>
                    {reminder.description && (
                      <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{new Date(reminder.dueDate).toLocaleDateString()}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-green-600 dark:text-green-400">Completed</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(reminder)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => openDeleteModal(reminder)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title="Delete Reminder"
        description={`Are you sure you want to delete "${reminderToDelete?.title}"? This action cannot be undone.`}
      />
    </div>
  )
}
