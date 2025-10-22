"use client"

import { useState, useEffect, useCallback } from 'react'
import { transactionService } from '@/lib/services'
import { Transaction, TransactionFilters, PaginatedResponse } from '@/lib/types'

export function useTransactions(userId: string | null) {
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
      const result = await transactionService.getUserTransactions(userId, filters, page, pageSize)
      setTransactions(result.data)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const createTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) return { success: false, error: 'User not authenticated' }

    console.log("creating ", transactionData)
    setLoading(true)
    setError(null)

    try {
      const result = await transactionService.createTransaction(userId, transactionData)
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
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create transaction'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [userId])

  const updateTransaction = useCallback(async (transactionId: string, updateData: Partial<Transaction>) => {
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
      return await transactionService.getTransactionSummary(userId, startDate, endDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get transaction summary')
      return null
    }
  }, [userId])

  const getRecentTransactions = useCallback(async (limit: number = 10) => {
    if (!userId) return []

    try {
      return await transactionService.getRecentTransactions(userId, limit)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recent transactions')
      return []
    }
  }, [userId])

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
