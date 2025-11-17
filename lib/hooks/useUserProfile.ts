"use client"

import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { userService } from '@/lib/services'
import type { UserProfile, BusinessType } from '@/lib/types'

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const userProfile = await userService.getProfile(user.uid)
        setProfile(userProfile)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user])

  const refetchProfile = async () => {
    if (!user) return
    try {
      setLoading(true)
      const userProfile = await userService.getProfile(user.uid)
      setProfile(userProfile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  return {
    profile,
    loading,
    error,
    refetchProfile,
    businessType: (profile?.businessType ?? 'freelancer') as BusinessType,
    isFreelancer: profile?.businessType === 'freelancer',
    isCreator: profile?.businessType === 'creator',
    isSME: profile?.businessType === 'sme',
  }
}

