"use client"

import { useState, useEffect } from 'react'
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithCredential,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth } from '@/firebase/firebase'
import { userService } from '@/lib/services'
import type { BusinessType } from '@/lib/types'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

const mapFirebaseAuthError = (code: string, fallback?: string) => {
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect password. Please try again.'
    case 'auth/user-not-found':
      return 'Email not found. Please create an account first.'
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please log in instead.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later or reset your password.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    default:
      return fallback || 'An authentication error occurred. Please try again.'
  }
}

interface SignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
  businessType: BusinessType
  phone?: string
  agentStates?: string[]
}

interface SignInData {
  email: string
  password: string
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthState({
        user,
        loading: false,
        error: null
      })
    })

    return unsubscribe
  }, [])

  const signUp = async (data: SignUpData) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password)
      if (!userCredential.user) {
        return { success: false, error: 'Failed to create user' }
      }
      const user = userCredential.user
      
      // Update user profile
      await updateProfile(user, {
        displayName: `${data.firstName} ${data.lastName}`
      })

      // Create user profile in Firestore
      // Set up free trial (7 days from signup)
      const now = new Date()
      const freeTrialEndDate = new Date(now)
      freeTrialEndDate.setDate(freeTrialEndDate.getDate() + 7)
      
      const profileData: any = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        businessType: data.businessType,
        freeTrialStartDate: now.toISOString(),
        freeTrialEndDate: freeTrialEndDate.toISOString(),
        freeTrialUsed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Add agent-specific fields if businessType is agent
      if (data.businessType === 'agent') {
        profileData.phone = data.phone
        profileData.agentStates = data.agentStates || []
        profileData.agentKycCompleted = false
        profileData.role = 'agent' // Set role to agent
      }

      const profileResult = await userService.upsertProfile(user.uid, profileData)

      console.log("Profile result:", profileResult)

      if (profileResult && profileResult.success) {
        console.log("Profile updated successfully")
        
        // Create default reminders for the user
        try {
          const { createDefaultReminders } = await import('@/lib/utils/defaultReminders')
          await createDefaultReminders(user.uid, data.businessType)
        } catch (reminderError) {
          console.error('Error creating default reminders:', reminderError)
          // Don't fail signup if reminders fail
        }
        
        // Sign out the user immediately after signup (no auto-login)
        const userId = user.uid
        await signOut(auth)
        setAuthState({
          user: null,
          loading: false,
          error: null
        })
        return { success: true, userId }
      } else {
        const errorMessage = profileResult?.error || 'An error occurred during sign up'
        console.log("Profile update failed:", errorMessage)
        // Sign out on failure as well
        await signOut(auth)
        setAuthState({ user: null, loading: false, error: errorMessage })
        return { success: false, error: errorMessage }
      }
      
    } catch (error: unknown) {
      let errorMessage = 'An error occurred during sign up'
      if (error instanceof FirebaseError) {
        errorMessage = mapFirebaseAuthError(error.code, error.message)
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as { message?: unknown }).message) || errorMessage
      }
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }

  const signIn = async (data: SignInData) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password)
      const user = userCredential.user

      setAuthState({
        user,
        loading: false,
        error: null
      })

      return { success: true }
    } catch (error: unknown) {
      let errorMessage = 'An error occurred during sign in'
      if (error instanceof FirebaseError) {
        // Check if account might exist with Google provider
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          // Try to provide a helpful message - we can't definitively know if it's a Google account
          // without trying to fetch the account, but we can suggest both options
          errorMessage = 'Email or password is incorrect. If you signed up with Google, please use "Continue with Google" to sign in.'
        } else {
          errorMessage = mapFirebaseAuthError(error.code, error.message)
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as { message?: unknown }).message) || errorMessage
      }
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      await signOut(auth)
      setAuthState({
        user: null,
        loading: false,
        error: null
      })
      return { success: true }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during logout'
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true, message: 'Password reset email sent' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to send password reset email' }
    }
  }

  const signInWithGoogle = async (businessType?: BusinessType) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      if (!user) {
        return { success: false, error: 'Failed to sign in with Google' }
      }

      // Check if this is a new Firebase auth account or existing one
      // Compare creationTime with lastSignInTime - if they're the same (or very close), it's a new account
      const creationTime = user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : 0
      const lastSignInTime = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).getTime() : 0
      const timeDifference = Math.abs(lastSignInTime - creationTime)
      const isNewFirebaseAccount = timeDifference < 5000 // 5 seconds threshold - if creation and last sign in are within 5 seconds, it's new

      // Check if user profile exists in Firestore
      const existingProfile = await userService.getProfile(user.uid)

      // If account is not new (created more than 5 seconds before last sign in) and we're on signup page, it's an existing user
      // businessType is only passed when called from signup page
      if (!isNewFirebaseAccount && businessType !== undefined) {
        // User is trying to sign up but account already exists
        // Sign them out and return error
        await signOut(auth)
        setAuthState(prev => ({ ...prev, loading: false, error: null }))
        return { 
          success: false, 
          error: 'An account with this email already exists. Please sign in instead.' 
        }
      }

      if (!existingProfile) {
        // New user - create profile
        // Extract name from Google profile
        const displayName = user.displayName || ''
        const nameParts = displayName.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        // Set up free trial (7 days from signup)
        const now = new Date()
        const freeTrialEndDate = new Date(now)
        freeTrialEndDate.setDate(freeTrialEndDate.getDate() + 7)

        const profileData: any = {
          email: user.email || '',
          firstName: firstName,
          lastName: lastName,
          businessType: businessType || 'freelancer', // Default to freelancer if not provided
          freeTrialStartDate: now.toISOString(),
          freeTrialEndDate: freeTrialEndDate.toISOString(),
          freeTrialUsed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Add agent-specific fields if businessType is agent
        if (businessType === 'agent') {
          profileData.agentKycCompleted = false
          profileData.role = 'agent' // Set role to agent
          // Note: phone and agentStates will need to be added later via profile completion
        }

        const profileResult = await userService.upsertProfile(user.uid, profileData)

        if (profileResult && profileResult.success) {
          // Create default reminders for the user
          try {
            const { createDefaultReminders } = await import('@/lib/utils/defaultReminders')
            await createDefaultReminders(user.uid, businessType || 'freelancer')
          } catch (reminderError) {
            console.error('Error creating default reminders:', reminderError)
            // Don't fail signup if reminders fail
          }
        }
      }

      setAuthState({
        user,
        loading: false,
        error: null
      })

      return { 
        success: true, 
        userId: user.uid, 
        isNewUser: !existingProfile,
        needsBusinessTypeSelection: !existingProfile && !businessType // New user without business type
      }
    } catch (error: unknown) {
      let errorMessage = 'An error occurred during Google sign in'
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/popup-closed-by-user') {
          errorMessage = 'Sign in cancelled'
        } else if (error.code === 'auth/account-exists-with-different-credential') {
          errorMessage = 'An account with this email already exists. Please sign in with your email and password.'
        } else {
          errorMessage = mapFirebaseAuthError(error.code, error.message)
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as { message?: unknown }).message) || errorMessage
      }
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }

  const setPasswordForGoogleUser = async (password: string) => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser || !currentUser.email) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if user has Google provider (no password provider)
      const hasPasswordProvider = currentUser.providerData.some(
        provider => provider.providerId === 'password'
      )
      
      if (hasPasswordProvider) {
        return { success: false, error: 'Password already set. Use "Update Password" to change it.' }
      }

      // Check if user has Google provider
      const hasGoogleProvider = currentUser.providerData.some(
        provider => provider.providerId === 'google.com'
      )

      if (!hasGoogleProvider) {
        return { success: false, error: 'This account is not a Google account' }
      }

      // Create email/password credential and link it to the account
      const credential = EmailAuthProvider.credential(currentUser.email, password)
      
      // For linking, we need to reauthenticate first with Google
      // But actually, we can't link a password without reauthentication
      // Instead, we'll use updatePassword which requires recent authentication
      // But that won't work for Google-only accounts...
      
      // Actually, we need to use linkWithCredential, but it requires the user to be recently authenticated
      // Since they're logged in with Google, we can link the password provider
      await linkWithCredential(currentUser, credential)

      return { success: true, message: 'Password set successfully! You can now sign in with email and password.' }
    } catch (error: unknown) {
      let errorMessage = 'Failed to set password'
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/weak-password') {
          errorMessage = 'Password is too weak. Please choose a stronger password (at least 6 characters).'
        } else if (error.code === 'auth/credential-already-in-use') {
          errorMessage = 'This email is already associated with another account.'
        } else if (error.code === 'auth/requires-recent-login') {
          errorMessage = 'Please sign out and sign in again with Google, then try setting your password.'
        } else {
          errorMessage = error.message || errorMessage
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as { message?: unknown }).message) || errorMessage
      }
      return { success: false, error: errorMessage }
    }
  }

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }))
  }

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    resetPassword,
    setPasswordForGoogleUser,
    clearError,
    isAuthenticated: !!authState.user
  }
}
