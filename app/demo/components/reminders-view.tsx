"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Bell, Clock, CheckCircle2, AlertCircle, MoreVertical, Plus } from "lucide-react"

interface RemindersViewProps {
  onAddReminder: () => void
}

export function RemindersView({ onAddReminder }: RemindersViewProps) {
  const [selectedReminders, setSelectedReminders] = useState<Set<string>>(new Set())
  
  // Demo reminder data matching the image
  const upcomingReminders = [
    {
      id: "1",
      title: "Ask for salary",
      description: "Yes for salary",
      date: "10/31/2025",
      priority: "medium",
      status: "overdue",
      isCompleted: false
    },
    {
      id: "2",
      title: "Tax Me",
      description: "no no",
      date: "10/31/2025",
      priority: "medium",
      status: "overdue",
      isCompleted: false
    }
  ]

  const completedReminders: typeof upcomingReminders = [
    {
      id: "3",
      title: "Annual Tax Filing",
      description: "Submit annual tax return for 2024",
      date: "01/15/2025",
      priority: "high",
      status: "completed",
      isCompleted: true
    }
  ]

  const stats = {
    total: 3,
    upcoming: 0,
    completed: 1,
    overdue: 2
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

  const selectAll = (reminderList: typeof upcomingReminders) => {
    setSelectedReminders(prev => {
      const newSet = new Set(prev)
      reminderList.forEach(r => newSet.add(r.id))
      return newSet
    })
  }

  const deselectAll = () => {
    setSelectedReminders(new Set())
  }

  return (
    <div className="space-y-6 mb-10">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reminders</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your tax deadlines and important dates</p>
        </div>
        <Button onClick={onAddReminder}>
          <Plus className="w-4 h-4 mr-2" />
          Add Reminder
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Reminders</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 bg-blue-100 dark:bg-blue-900/30">
              <Bell className="w-6 h-6" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Upcoming</p>
              <p className="text-3xl font-bold">{stats.upcoming}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-orange-600 bg-orange-100 dark:bg-orange-900/30">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Completed</p>
              <p className="text-3xl font-bold">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-green-600 bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Overdue</p>
              <p className="text-3xl font-bold">{stats.overdue}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-red-600 bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Reminders */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Upcoming Reminders</h2>
              <p className="text-sm text-muted-foreground mt-1">Your scheduled reminders and deadlines</p>
            </div>
            {upcomingReminders.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => selectedReminders.size === upcomingReminders.length ? deselectAll() : selectAll(upcomingReminders)}
              >
                {selectedReminders.size === upcomingReminders.length ? "Clear" : "Select All"}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {upcomingReminders.map((reminder) => {
            const priorityColors = {
              high: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
              medium: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
              low: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
            }
            
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
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${priorityColors[reminder.priority as keyof typeof priorityColors]}`}>
                  <Bell className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-medium text-sm">{reminder.title}</h3>
                    <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                      {reminder.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">{reminder.date}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-red-600 dark:text-red-400">{reminder.status === "overdue" ? "Overdue" : ""}</span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
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
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => selectedReminders.size === completedReminders.length ? deselectAll() : selectAll(completedReminders as any)}
              >
                {selectedReminders.size === completedReminders.length ? "Clear" : "Select All"}
              </Button>
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
                    <Bell className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-through">{reminder.title}</h3>
                    {reminder.description && (
                      <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{reminder.date}</span>
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
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}

