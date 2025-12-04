"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { userService } from '@/lib/services'
import type { UserProfile, BusinessType } from '@/lib/types'

interface UserProfileContextType {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  refetchProfile: () => Promise<void>
  businessType: BusinessType
  isFreelancer: boolean
  isCreator: boolean
  isSME: boolean
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined)

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
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
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const refetchProfile = async () => {
    await loadProfile()
  }

  const value: UserProfileContextType = {
    profile,
    loading,
    error,
    refetchProfile,
    businessType: (profile?.businessType ?? 'freelancer') as BusinessType,
    isFreelancer: profile?.businessType === 'freelancer',
    isCreator: profile?.businessType === 'creator',
    isSME: profile?.businessType === 'sme',
  }

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  const context = useContext(UserProfileContext)
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider')
  }
  return context
}

