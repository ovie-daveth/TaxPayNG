import { BaseService } from './base'
import { Timestamp } from 'firebase/firestore'
import { Reminder, ApiResponse, PaginatedResponse } from '@/lib/types'

export class ReminderService extends BaseService {
  constructor() {
    super('reminders')
  }

  // Get all reminders for a user
  async getUserReminders(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
    showCompleted: boolean = false
  ): Promise<PaginatedResponse<Reminder>> {
    try {
      const queryFilters: any[] = [{ field: 'userId', operator: '==', value: userId }]
      
      if (!showCompleted) {
        queryFilters.push({ field: 'isCompleted', operator: '==', value: false })
      }

      const { data, total } = await this.getPaginated(
        page,
        pageSize,
        queryFilters,
        'dueDate',
        'asc'
      )

      const totalPages = Math.ceil(total / pageSize)

      return {
        data,
        pagination: {
          page,
          limit: pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      console.error('Error getting user reminders:', error)
      throw error
    }
  }

  // Create a new reminder
  async createReminder(userId: string, reminderData: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Reminder>> {
    try {
      const newReminder = {
        ...reminderData,
        userId,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const reminderId = await this.create(newReminder)
      const createdReminder = await this.getById(reminderId)

      return {
        success: true,
        data: createdReminder,
        message: 'Reminder created successfully'
      }
    } catch (error) {
      console.error('Error creating reminder:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Update an existing reminder
  async updateReminder(reminderId: string, userId: string, updateData: Partial<Reminder>): Promise<ApiResponse<Reminder>> {
    try {
      // Verify ownership
      const existingReminder = await this.getById(reminderId)
      if (existingReminder.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only update your own reminders'
        }
      }

      await this.update(reminderId, updateData)
      const updatedReminder = await this.getById(reminderId)

      return {
        success: true,
        data: updatedReminder,
        message: 'Reminder updated successfully'
      }
    } catch (error) {
      console.error('Error updating reminder:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Mark reminder as completed
  async markCompleted(reminderId: string, userId: string): Promise<ApiResponse<Reminder>> {
    try {
      // Verify ownership
      const existingReminder = await this.getById(reminderId)
      if (existingReminder.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only update your own reminders'
        }
      }

      await this.update(reminderId, {
        isCompleted: true,
        completedAt: new Date().toISOString()
      })

      const updatedReminder = await this.getById(reminderId)

      return {
        success: true,
        data: updatedReminder,
        message: 'Reminder marked as completed'
      }
    } catch (error) {
      console.error('Error marking reminder as completed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Mark reminder as incomplete
  async markIncomplete(reminderId: string, userId: string): Promise<ApiResponse<Reminder>> {
    try {
      // Verify ownership
      const existingReminder = await this.getById(reminderId)
      if (existingReminder.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only update your own reminders'
        }
      }

      await this.update(reminderId, {
        isCompleted: false,
        completedAt: null
      })

      const updatedReminder = await this.getById(reminderId)

      return {
        success: true,
        data: updatedReminder,
        message: 'Reminder marked as incomplete'
      }
    } catch (error) {
      console.error('Error marking reminder as incomplete:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Delete a reminder
  async deleteReminder(reminderId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      // Verify ownership
      const existingReminder = await this.getById(reminderId)
      if (existingReminder.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized: You can only delete your own reminders'
        }
      }

      await this.delete(reminderId)

      return {
        success: true,
        message: 'Reminder deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting reminder:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Get upcoming reminders (due within specified days)
  async getUpcomingReminders(userId: string, daysAhead: number = 30): Promise<Reminder[]> {
    try {
      const now = new Date()
      const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000))

      return await this.getAll([
        { field: 'userId', operator: '==', value: userId },
        { field: 'isCompleted', operator: '==', value: false },
        { field: 'dueDate', operator: '>=', value: Timestamp.fromDate(now) },
        { field: 'dueDate', operator: '<=', value: Timestamp.fromDate(futureDate) }
      ], 'dueDate', 'asc')
    } catch (error) {
      console.error('Error getting upcoming reminders:', error)
      throw error
    }
  }

  // Get overdue reminders
  async getOverdueReminders(userId: string): Promise<Reminder[]> {
    try {
      const now = new Date()

      return await this.getAll([
        { field: 'userId', operator: '==', value: userId },
        { field: 'isCompleted', operator: '==', value: false },
        { field: 'dueDate', operator: '<', value: Timestamp.fromDate(now) }
      ], 'dueDate', 'asc')
    } catch (error) {
      console.error('Error getting overdue reminders:', error)
      throw error
    }
  }

  // Get reminders by type
  async getRemindersByType(userId: string, type: Reminder['type']): Promise<Reminder[]> {
    try {
      return await this.getAll([
        { field: 'userId', operator: '==', value: userId },
        { field: 'type', operator: '==', value: type }
      ], 'dueDate', 'asc')
    } catch (error) {
      console.error('Error getting reminders by type:', error)
      throw error
    }
  }

  // Get reminders by priority
  async getRemindersByPriority(userId: string, priority: Reminder['priority']): Promise<Reminder[]> {
    try {
      return await this.getAll([
        { field: 'userId', operator: '==', value: userId },
        { field: 'priority', operator: '==', value: priority },
        { field: 'isCompleted', operator: '==', value: false }
      ], 'dueDate', 'asc')
    } catch (error) {
      console.error('Error getting reminders by priority:', error)
      throw error
    }
  }

  // Get reminder statistics
  async getReminderStats(userId: string): Promise<{
    total: number
    completed: number
    pending: number
    overdue: number
    upcoming: number
    byType: { [key: string]: number }
    byPriority: { [key: string]: number }
  }> {
    try {
      const allReminders = await this.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])

      const now = new Date()
      const stats = {
        total: allReminders.length,
        completed: 0,
        pending: 0,
        overdue: 0,
        upcoming: 0,
        byType: {} as { [key: string]: number },
        byPriority: {} as { [key: string]: number }
      }

      allReminders.forEach(reminder => {
        if (reminder.isCompleted) {
          stats.completed++
        } else {
          stats.pending++
          
          const dueDate = new Date(reminder.dueDate)
          if (dueDate < now) {
            stats.overdue++
          } else {
            stats.upcoming++
          }
        }

        // Count by type
        if (!stats.byType[reminder.type]) {
          stats.byType[reminder.type] = 0
        }
        stats.byType[reminder.type]++

        // Count by priority
        if (!stats.byPriority[reminder.priority]) {
          stats.byPriority[reminder.priority] = 0
        }
        stats.byPriority[reminder.priority]++
      })

      return stats
    } catch (error) {
      console.error('Error getting reminder stats:', error)
      throw error
    }
  }

  // Create recurring reminders
  async createRecurringReminder(
    userId: string, 
    baseReminder: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    recurring: Reminder['recurring']
  ): Promise<ApiResponse<Reminder[]>> {
    try {
      if (!recurring) {
        return {
          success: false,
          error: 'Recurring configuration is required'
        }
      }

      const createdReminders: Reminder[] = []
      const startDate = new Date(baseReminder.dueDate)
      const endDate = recurring.endDate ? new Date(recurring.endDate) : new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)) // Default 1 year
      
      let currentDate = new Date(startDate)
      let count = 0

      while (currentDate <= endDate && count < 100) { // Limit to 100 reminders
        const reminderData = {
          ...baseReminder,
          dueDate: currentDate.toISOString()
        }

        const result = await this.createReminder(userId, reminderData)
        if (result.success && result.data) {
          createdReminders.push(result.data)
        }

        // Calculate next occurrence
        currentDate = this.getNextRecurringDate(currentDate, recurring.frequency, recurring.interval)
        count++
      }

      return {
        success: true,
        data: createdReminders,
        message: `Created ${createdReminders.length} recurring reminders`
      }
    } catch (error) {
      console.error('Error creating recurring reminders:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Helper method to calculate next recurring date
  private getNextRecurringDate(currentDate: Date, frequency: string, interval: number): Date {
    const nextDate = new Date(currentDate)
    
    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval)
        break
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (interval * 7))
        break
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + interval)
        break
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + interval)
        break
    }
    
    return nextDate
  }
}

// Export a singleton instance
export const reminderService = new ReminderService()
