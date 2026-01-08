"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, DollarSign, FileText, Bell, MoreVertical, Pencil, Trash2, Loader2, ArrowRight } from "lucide-react"
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
  const router = useRouter()
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
      <Card className="p-3 sm:p-4 md:p-6">
        <div className="mb-4 sm:mb-5 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">Upcoming Reminders</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Your scheduled reminders and deadlines</p>
            </div>
            {upcomingReminders.length > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {selectedUpcomingCount > 0 ? (
                  <>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {selectedUpcomingCount} selected
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={deselectAll}
                      className="h-7 sm:h-8 text-xs sm:text-sm"
                    >
                      Clear
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleBulkComplete}
                      disabled={isCompletingBatch}
                      className="h-7 sm:h-8 text-xs sm:text-sm"
                    >
                      {isCompletingBatch ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                          <span className="hidden sm:inline">Completing...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Complete {selectedUpcomingCount}</span>
                          <span className="sm:hidden">Complete</span>
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => selectAll(upcomingReminders)}
                    className="h-7 sm:h-8 text-xs sm:text-sm"
                  >
                    Select All
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {upcomingReminders.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-muted-foreground" />
              <p className="text-xs sm:text-sm text-muted-foreground">No upcoming reminders</p>
            </div>
          ) : (
            upcomingReminders.map((reminder) => {
              const Icon = getReminderIcon(reminder.type)
              const daysUntil = calculateDaysUntil(reminder.dueDate)
              const dateStatus = getDateStatus(daysUntil, reminder.isCompleted)
              return (
                <div
                  key={reminder.id}
                  className={`flex items-start gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors ${
                    selectedReminders.has(reminder.id) ? 'bg-muted/50 border-primary' : ''
                  }`}
                >
                  <Checkbox 
                    id={`reminder-${reminder.id}`} 
                    className="mt-1 flex-shrink-0" 
                    checked={selectedReminders.has(reminder.id)}
                    onCheckedChange={() => toggleSelection(reminder.id)}
                  />
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getPriorityColor(reminder.priority)}`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-xs sm:text-sm truncate">{reminder.title}</h3>
                      <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                        {reminder.priority}
                      </Badge>
                    </div>
                    {reminder.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1.5 sm:mb-2 line-clamp-2">{reminder.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 text-xs flex-wrap">
                      <span className="text-muted-foreground">{new Date(reminder.dueDate).toLocaleDateString()}</span>
                      <span className="text-muted-foreground hidden sm:inline">•</span>
                      <span className={dateStatus.color}>{dateStatus.text}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {reminder.actionUrl && reminder.actionLabel && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => router.push(reminder.actionUrl!)}
                        className="h-7 sm:h-8 text-xs sm:text-sm whitespace-nowrap"
                      >
                        <span className="hidden sm:inline">{reminder.actionLabel}</span>
                        <span className="sm:hidden">Action</span>
                        <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1 sm:ml-1.5" />
                      </Button>
                    )}
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8">
                        <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Completed Reminders */}
      <Card className="p-3 sm:p-4 md:p-6">
        <div className="mb-4 sm:mb-5 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">Completed Reminders</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Your completed tasks and deadlines</p>
            </div>
            {completedReminders.length > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {selectedCompletedCount > 0 ? (
                  <>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {selectedCompletedCount} selected
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={deselectAll}
                      className="h-7 sm:h-8 text-xs sm:text-sm"
                    >
                      Clear
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={handleBulkMarkIncomplete}
                      disabled={isCompletingBatch}
                      className="h-7 sm:h-8 text-xs sm:text-sm"
                    >
                      {isCompletingBatch ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                          <span className="hidden sm:inline">Updating...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Reopen {selectedCompletedCount}</span>
                          <span className="sm:hidden">Reopen</span>
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => selectAll(completedReminders)}
                    className="h-7 sm:h-8 text-xs sm:text-sm"
                  >
                    Select All
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {completedReminders.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-muted-foreground" />
              <p className="text-xs sm:text-sm text-muted-foreground">No completed reminders</p>
            </div>
          ) : (
            completedReminders.map((reminder) => {
              const Icon = getReminderIcon(reminder.type)
              return (
                <div 
                  key={reminder.id} 
                  className={`flex items-start gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 border border-border rounded-lg opacity-60 ${
                    selectedReminders.has(reminder.id) ? 'bg-muted/50 border-primary opacity-100' : ''
                  }`}
                >
                  <Checkbox 
                    id={`reminder-${reminder.id}`} 
                    checked={selectedReminders.has(reminder.id)}
                    className="mt-1 flex-shrink-0"
                    onCheckedChange={() => toggleSelection(reminder.id)}
                  />
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-xs sm:text-sm line-through truncate">{reminder.title}</h3>
                    {reminder.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1.5 sm:mb-2 line-clamp-2">{reminder.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 text-xs flex-wrap">
                      <span className="text-muted-foreground">{new Date(reminder.dueDate).toLocaleDateString()}</span>
                      <span className="text-muted-foreground hidden sm:inline">•</span>
                      <span className="text-green-600 dark:text-green-400">Completed</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8">
                        <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
