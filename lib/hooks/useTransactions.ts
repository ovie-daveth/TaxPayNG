"use client"

import { useState, useEffect, useCallback } from 'react'
import { transactionService } from '@/lib/services'
import { Transaction, TransactionFilters, PaginatedResponse } from '@/lib/types'
import { useBusiness } from '@/lib/contexts/business-context'

export function useTransactions(userId: string | null) {
  const { activeEntityId } = useBusiness()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginatedResponse<Transaction>['pagination'] | null>(null)

  const loadTransactions = useCallback(async (
    page: number = 1,
    pageSize: number = 20,
    filters?: TransactionFilters
  ) => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const effectiveFilters: TransactionFilters | undefined = {
        ...(filters || {}),
        entityId: activeEntityId || undefined,
      }
      const result = await transactionService.getUserTransactions(userId, effectiveFilters, page, pageSize)
      console.log("result from loadTransactions:", result)
      setTransactions(result.data)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [userId, activeEntityId])

  const createTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) {
      const errorResult = { success: false, error: 'User not authenticated' }
      console.log('createTransaction (hook) returning error (no userId):', errorResult)
      return errorResult
    }

    console.log("createTransaction (hook) creating:", transactionData)
    setLoading(true)
    setError(null)

    try {
      const payload = {
        ...transactionData,
        entityId: (transactionData as any).entityId ?? activeEntityId ?? undefined,
      } as any
      const result = await transactionService.createTransaction(userId, payload)
      console.log('createTransaction (hook) service result:', result)
      if (result.success && result.data) {
        // Add new transaction to the beginning of the list
        setTransactions(prev => {
          console.log('Adding transaction to state:', result.data)
          console.log('Previous transactions:', prev)
          return [result.data!, ...prev]
        })
        // Update pagination total count
        setPagination(prev => prev ? {
          ...prev,
          total: prev.total + 1,
          totalPages: Math.ceil((prev.total + 1) / prev.limit)
        } : null)
      }
      console.log('createTransaction (hook) returning:', result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create transaction'
      setError(errorMessage)
      const errorResult = { success: false, error: errorMessage }
      console.log('createTransaction (hook) returning error:', errorResult)
      return errorResult
    } finally {
      setLoading(false)
    }
  }, [userId, activeEntityId])

  const updateTransaction = useCallback(async (transactionId: string, updateData: Partial<Transaction>) => {
    console.log("updateData from updateTransaction:", updateData)
    if (!userId) return { success: false, error: 'User not authenticated' }

    setLoading(true)
    setError(null)

    try {
      const result = await transactionService.updateTransaction(transactionId, userId, updateData)
      if (result.success && result.data) {
        setTransactions(prev => 
          prev.map(t => t.id === transactionId ? result.data! : t)
        )
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update transaction'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [userId])

  const deleteTransaction = useCallback(async (transactionId: string) => {
    if (!userId) return { success: false, error: 'User not authenticated' }

    setLoading(true)
    setError(null)

    try {
      const result = await transactionService.deleteTransaction(transactionId, userId)
      if (result.success) {
        setTransactions(prev => prev.filter(t => t.id !== transactionId))
        // Update pagination total count
        setPagination(prev => prev ? {
          ...prev,
          total: Math.max(0, prev.total - 1),
          totalPages: Math.ceil(Math.max(0, prev.total - 1) / prev.limit)
        } : null)
      }
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete transaction'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [userId])

  const getTransactionSummary = useCallback(async (startDate?: string, endDate?: string) => {
    if (!userId) return null

    try {
      return await transactionService.getTransactionSummary(userId, startDate, endDate, activeEntityId || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get transaction summary')
      return null
    }
  }, [userId, activeEntityId])

  const getRecentTransactions = useCallback(async (limit: number = 10) => {
    if (!userId) return []

    try {
      return await transactionService.getRecentTransactions(userId, limit, activeEntityId || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recent transactions')
      return []
    }
  }, [userId, activeEntityId])

  useEffect(() => {
    if (userId) {
      loadTransactions()
    }
  }, [userId, loadTransactions])

  return {
    transactions,
    loading,
    error,
    pagination,
    loadTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionSummary,
    getRecentTransactions,
    setError
  }
}
