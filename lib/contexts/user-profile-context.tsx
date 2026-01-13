"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { userService } from '@/lib/services'
import type { UserProfile, BusinessType } from '@/lib/types'
import { normalizeBusinessType } from '@/lib/utils/businessTypeHelpers'

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
      
      // Normalize legacy 'agent' to 'consultant' for backward compatibility
      if (userProfile && userProfile.businessType === 'agent') {
        // Normalize businessType and legacy fields
        const normalizedProfile: UserProfile = {
          ...userProfile,
          businessType: 'consultant' as BusinessType,
          // Map legacy agentKycCompleted to consultantKycCompleted
          consultantKycCompleted: (userProfile as any).agentKycCompleted ?? userProfile.consultantKycCompleted,
          // Map legacy agentStates to consultantStates
          consultantStates: (userProfile as any).agentStates ?? userProfile.consultantStates,
        }
        setProfile(normalizedProfile)
        
        // Optionally update the profile in the database (async, don't wait)
        // This migrates the data for future loads
        userService.upsertProfile(user.uid, {
          businessType: 'consultant',
          consultantKycCompleted: normalizedProfile.consultantKycCompleted,
          consultantStates: normalizedProfile.consultantStates,
        }).catch(err => {
          console.error('Error migrating agent to consultant:', err)
          // Don't block the UI if migration fails
        })
      } else {
        setProfile(userProfile)
      }
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

