"use client"

import { useState, useEffect } from 'react'
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth'
import { auth } from '@/firebase/firebase'
import { userService } from '@/lib/services'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

interface SignUpData {
  email: string
  password: string
  firstName: string
  lastName: string
  businessType: 'freelancer' | 'sme' | 'individual'
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
      await userService.upsertProfile(user.uid, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        businessType: data.businessType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).then(() => {

        console.log("Profile updated")
        setAuthState({
          user,
          loading: false,
          error: null
        })
  
        return { success: true }
      }).catch((error: any) => {
        const errorMessage = error.message || 'An error occurred during sign up'
        setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }))
        return { success: false, error: errorMessage }
      })
      
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during sign up'
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
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during sign in'
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

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }))
  }

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    signUp,
    signIn,
    logout,
    resetPassword,
    clearError,
    isAuthenticated: !!authState.user
  }
}
