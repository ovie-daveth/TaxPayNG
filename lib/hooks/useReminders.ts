"use client"

import { useState, useEffect, useCallback } from 'react'
import { reminderService } from '@/lib/services'
import { Reminder, ReminderFilters, PaginatedResponse } from '@/lib/types'

export function useReminders(userId: string | null) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginatedResponse<Reminder>['pagination'] | null>(null)

  const loadReminders = useCallback(async (
    page: number = 1,
    pageSize: number = 20,
    filters?: ReminderFilters
  ) => {
    if (!userId) return

    setLoading(true)
    setError(null)
    try {
      const result = await reminderService.getUserReminders(userId, page, pageSize, filters)
      setReminders(result.data)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const createReminder = useCallback(async (data: Omit<Reminder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) return

    setError(null)
    try {
      const result = await reminderService.createReminder({
        ...data,
        userId
      })
      setReminders(prev => [result.data, ...prev])
      return result.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reminder')
      throw err
    }
  }, [userId])

  const updateReminder = useCallback(async (id: string, data: Partial<Reminder>) => {
    setError(null)
    try {
      const result = await reminderService.updateReminder(id, data)
      setReminders(prev => prev.map(reminder => 
        reminder.id === id ? { ...reminder, ...result.data } : reminder
      ))
      return result.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reminder')
      throw err
    }
  }, [])

  const deleteReminder = useCallback(async (id: string) => {
    setError(null)
    try {
      await reminderService.deleteReminder(id)
      setReminders(prev => prev.filter(reminder => reminder.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete reminder')
      throw err
    }
  }, [])

  const markCompleted = useCallback(async (id: string) => {
    setError(null)
    try {
      const result = await reminderService.markCompleted(id)
      setReminders(prev => prev.map(reminder => 
        reminder.id === id ? { ...reminder, ...result.data } : reminder
      ))
      return result.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark reminder as completed')
      throw err
    }
  }, [])

  const markIncomplete = useCallback(async (id: string) => {
    setError(null)
    try {
      const result = await reminderService.markIncomplete(id)
      setReminders(prev => prev.map(reminder => 
        reminder.id === id ? { ...reminder, ...result.data } : reminder
      ))
      return result.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark reminder as incomplete')
      throw err
    }
  }, [])

  const getUpcomingReminders = useCallback(async (days: number = 7) => {
    if (!userId) return []

    setError(null)
    try {
      const result = await reminderService.getUpcomingReminders(userId, days)
      return result.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get upcoming reminders')
      return []
    }
  }, [userId])

  const getOverdueReminders = useCallback(async () => {
    if (!userId) return []

    setError(null)
    try {
      const result = await reminderService.getOverdueReminders(userId)
      return result.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get overdue reminders')
      return []
    }
  }, [userId])

  const getReminderStats = useCallback(async () => {
    if (!userId) return null

    setError(null)
    try {
      const result = await reminderService.getReminderStats(userId)
      return result.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get reminder stats')
      return null
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      loadReminders()
    }
  }, [userId, loadReminders])

  return {
    reminders,
    loading,
    error,
    pagination,
    loadReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    markCompleted,
    markIncomplete,
    getUpcomingReminders,
    getOverdueReminders,
    getReminderStats
  }
}
