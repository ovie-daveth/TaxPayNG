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
  reauthenticateWithCredential,
  fetchSignInMethodsForEmail
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
  consultantStates?: string[]
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
      // Free trial will be initialized via API endpoint after profile creation
      const profileData: any = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        businessType: data.businessType,
        phone: data.phone || null,
        phoneNumber: data.phone || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Add consultant-specific fields if businessType is consultant
      if (data.businessType === 'consultant') {
        profileData.consultantStates = data.consultantStates || []
        profileData.consultantKycCompleted = false
        profileData.role = 'consultant' // Set role to consultant
      }

      const profileResult = await userService.upsertProfile(user.uid, profileData)

      console.log("Profile result:", profileResult)

      if (profileResult && profileResult.success) {
        console.log("Profile updated successfully")
        
        // Initialize free trial (if profile was just created, not updated)
        // Get ID token before signing out
        try {
          const idToken = await user.getIdToken()
          const initTrialResponse = await fetch('/api/user/init-free-trial', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (initTrialResponse.ok) {
            const trialData = await initTrialResponse.json()
            console.log("Free trial initialized:", trialData)
          } else {
            console.warn('Failed to initialize free trial, but signup succeeded')
          }
        } catch (trialError) {
          console.error('Error initializing free trial:', trialError)
          // Don't fail signup if free trial initialization fails
        }
        
        // Create default reminders for the user
        try {
          const { createDefaultReminders } = await import('@/lib/utils/defaultReminders')
          await createDefaultReminders(user.uid, data.businessType)
        } catch (reminderError) {
          console.error('Error creating default reminders:', reminderError)
          // Don't fail signup if reminders fail
        }

        // Send welcome email (best-effort, idempotent on server)
        try {
          const idToken = await user.getIdToken()
          await fetch('/api/user/send-welcome-email', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          })
        } catch (welcomeError) {
          console.error('Error sending welcome email:', welcomeError)
          // Don't fail signup if welcome email fails
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
      // Recovery path: Auth account already exists but profile may be missing.
      if (error instanceof FirebaseError && error.code === 'auth/email-already-in-use') {
        try {
          // If the email is Google-only (no password), we cannot complete password signup.
          const methods = await fetchSignInMethodsForEmail(auth, data.email)
          const hasPassword = methods.includes('password')
          const hasGoogle = methods.includes('google.com')

          if (!hasPassword && hasGoogle) {
            // Recoverable: if Auth exists but profile is missing, we can create the profile server-side
            // (email ownership is proven via the signup token verification step).
            const ensureRes = await fetch('/api/auth/ensure-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                businessType: data.businessType,
                phone: data.phone,
                consultantStates: data.consultantStates
              })
            })

            if (ensureRes.ok) {
              const ensureData = await ensureRes.json()
              setAuthState(prev => ({ ...prev, loading: false, error: null }))
              // Note: user still has no password provider; they must log in with Google.
              return { success: true, userId: ensureData.userId, recoveredGoogleOnly: true }
            }

            const ensureErr = await ensureRes.json().catch(() => ({} as any))
            const msg = ensureErr?.error === 'ACCOUNT_EXISTS'
              ? 'This email already has an account. Please log in instead.'
              : 'This email is registered with Google. Please use "Continue with Google" to sign up/sign in.'
            setAuthState(prev => ({ ...prev, loading: false, error: msg }))
            return { success: false, error: ensureErr?.error || 'GOOGLE_ONLY_USER' }
          }

          if (!hasPassword) {
            const msg = 'This email is already registered. Please log in instead.'
            setAuthState(prev => ({ ...prev, loading: false, error: msg }))
            return { success: false, error: msg }
          }

          // Sign in with the provided password to prove ownership, then check/create profile.
          const existingCred = await signInWithEmailAndPassword(auth, data.email, data.password)
          const user = existingCred.user

          const existingProfile = await userService.getProfile(user.uid)
          if (existingProfile) {
            // Real duplicate: profile exists → this is not a signup.
            await signOut(auth)
            setAuthState({ user: null, loading: false, error: null })
            return { success: false, error: 'ACCOUNT_EXISTS' }
          }

          // Profile is missing → create it and proceed like a normal signup.
          await updateProfile(user, { displayName: `${data.firstName} ${data.lastName}` })

          const profileData: any = {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            businessType: data.businessType,
            phone: data.phone || null,
            phoneNumber: data.phone || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          if (data.businessType === 'consultant') {
            profileData.consultantStates = data.consultantStates || []
            profileData.consultantKycCompleted = false
            profileData.role = 'consultant'
          }

          const profileResult = await userService.upsertProfile(user.uid, profileData)
          if (!profileResult?.success) {
            await signOut(auth)
            setAuthState({ user: null, loading: false, error: null })
            return { success: false, error: profileResult?.error || 'Failed to create profile' }
          }

          // Free trial + reminders + welcome email (best-effort)
          try {
            const idToken = await user.getIdToken()
            await fetch('/api/user/init-free-trial', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
              }
            })
          } catch (trialError) {
            console.error('Error initializing free trial (recovered signup):', trialError)
          }

          try {
            const { createDefaultReminders } = await import('@/lib/utils/defaultReminders')
            await createDefaultReminders(user.uid, data.businessType)
          } catch (reminderError) {
            console.error('Error creating default reminders (recovered signup):', reminderError)
          }

          try {
            const idToken = await user.getIdToken()
            await fetch('/api/user/send-welcome-email', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
              }
            })
          } catch (welcomeError) {
            console.error('Error sending welcome email (recovered signup):', welcomeError)
          }

          const userId = user.uid
          await signOut(auth)
          setAuthState({ user: null, loading: false, error: null })
          return { success: true, userId, recovered: true }
        } catch (recoveryError: any) {
          const msg = mapFirebaseAuthError(recoveryError?.code || 'auth/email-already-in-use', recoveryError?.message)
          setAuthState(prev => ({ ...prev, loading: false, error: msg }))
          return { success: false, error: msg }
        }
      }

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
      let isGoogleOnlyUser = false
      
      if (error instanceof FirebaseError) {
        console.log('Firebase error code:', error.code)
        // Check if account might exist with Google provider
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          // Check if the email has Google as a sign-in method
          try {
            const signInMethods = await fetchSignInMethodsForEmail(auth, data.email)
            console.log('Sign-in methods for email:', signInMethods)
            console.log('Sign-in methods type:', typeof signInMethods, Array.isArray(signInMethods))
            console.log('Has google.com:', signInMethods.includes('google.com'))
            console.log('Has password:', signInMethods.includes('password'))
            
            // Check if user has Google provider but no password provider
            const hasGoogle = signInMethods.includes('google.com')
            const hasPassword = signInMethods.includes('password')
            
            if (hasGoogle && !hasPassword) {
              // User signed up with Google only, no password set
              console.log('Detected Google-only user')
              isGoogleOnlyUser = true
              errorMessage = 'GOOGLE_ONLY_USER' // Special error code for Google-only users
            } else if (hasGoogle && hasPassword) {
              // User has both, so password might be wrong
              console.log('User has both Google and password, password might be incorrect')
              errorMessage = 'Email or password is incorrect. Please try again.'
            } else {
              console.log('Not Google-only, regular password error')
              errorMessage = 'Email or password is incorrect. Please try again.'
            }
          } catch (fetchError) {
            console.error('Error fetching sign-in methods:', fetchError)
            // If we can't fetch sign-in methods, try to check if it's a known Google account
            // For now, use generic error
            errorMessage = 'Email or password is incorrect. If you signed up with Google, please use "Continue with Google" to sign in.'
          }
        } else {
          errorMessage = mapFirebaseAuthError(error.code, error.message)
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as { message?: unknown }).message) || errorMessage
      }
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }))
      console.log('Returning from signIn:', { success: false, error: errorMessage, isGoogleOnlyUser })
      return { success: false, error: errorMessage, isGoogleOnlyUser }
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

  // Google is SIGN-IN ONLY.
  // If the user has no existing profile, we treat them as not registered and ask them to sign up.
  const signInWithGoogle = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const provider = new GoogleAuthProvider()
      let result
      let googleCredential = null
      
      try {
        result = await signInWithPopup(auth, provider)
        googleCredential = GoogleAuthProvider.credentialFromResult(result)
      } catch (popupError: any) {
        // If account exists with different credential, extract the credential from error
        if (popupError.code === 'auth/account-exists-with-different-credential') {
          googleCredential = GoogleAuthProvider.credentialFromError(popupError)
          // Re-throw to handle in outer catch block
          throw popupError
        }
        throw popupError
      }
      
      const user = result.user

      if (!user) {
        return { success: false, error: 'Failed to sign in with Google' }
      }

      // Check if user profile exists in Firestore
      const existingProfile = await userService.getProfile(user.uid)

      // If there's no profile, the user signed in with Google but onboarding wasn't completed.
      // Keep them signed in and let the UI complete profile creation (business type selection).
      if (!existingProfile) {
        setAuthState({
          user,
          loading: false,
          error: null
        })
        return {
          success: false,
          error: 'MISSING_PROFILE',
          userId: user.uid
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
        isNewUser: false,
      }
    } catch (error: unknown) {
      let errorMessage = 'An error occurred during Google sign in'
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/popup-closed-by-user') {
          errorMessage = 'Sign in cancelled'
        } else if (error.code === 'auth/account-exists-with-different-credential') {
          // Account exists with different provider - try to link accounts
          // Extract email and credential from error
          const email = (error as any).customData?.email || (error as any).email
          const credential = GoogleAuthProvider.credentialFromError(error) || (error as any).credential
          
          console.log('Account exists with different credential:', { email, hasCredential: !!credential })
          
          if (email) {
            // Check what sign-in methods exist for this email
            try {
              const signInMethods = await fetchSignInMethodsForEmail(auth, email)
              console.log('Sign-in methods for existing account:', signInMethods)
              
              // If password provider exists, we need password to link
              if (signInMethods.includes('password')) {
                // If we have the credential, return special response indicating linking is needed
                if (credential) {
                  setAuthState(prev => ({ ...prev, loading: false, error: null }))
                  return { 
                    success: false, 
                    error: 'ACCOUNT_LINKING_REQUIRED',
                    needsPassword: true,
                    email: email,
                    credential: credential
                  }
                } else {
                  // Credential not available - show message
                  errorMessage = 'An account with this email already exists. Please enter your password to link your Google account.'
                }
              } else {
                // Other providers exist but not password - can't auto-link
                errorMessage = 'An account with this email already exists with a different sign-in method.'
              }
            } catch (fetchError) {
              console.error('Error fetching sign-in methods:', fetchError)
              errorMessage = 'An account with this email already exists. Please sign in with your email and password.'
            }
          } else {
            errorMessage = 'An account with this email already exists. Please sign in with your email and password.'
          }
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

  // Google SIGN-UP (no business-type page/dialog).
  // Called from the signup page after the user has selected businessType on the form.
  const signUpWithGoogle = async (businessType: BusinessType) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      if (!user) {
        return { success: false, error: 'Failed to sign up with Google' }
      }

      // If profile already exists, this is NOT a signup. Block it.
      const existingProfile = await userService.getProfile(user.uid)
      if (existingProfile) {
        await signOut(auth)
        setAuthState(prev => ({ ...prev, loading: false, error: null }))
        return { success: false, error: 'ACCOUNT_EXISTS' }
      }

      const displayName = user.displayName || ''
      const nameParts = displayName.split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const profileData: any = {
        email: (user.email || '').toLowerCase(),
        firstName,
        lastName,
        businessType,
        phone: null,
        phoneNumber: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      if (businessType === 'consultant') {
        profileData.consultantKycCompleted = false
        profileData.role = 'consultant'
      }

      const profileResult = await userService.upsertProfile(user.uid, profileData)
      if (!profileResult?.success) {
        await signOut(auth)
        setAuthState(prev => ({ ...prev, loading: false, error: null }))
        return { success: false, error: profileResult?.error || 'Failed to create profile' }
      }

      try {
        const idToken = await user.getIdToken()
        await fetch('/api/user/init-free-trial', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        })
      } catch (trialError) {
        console.error('Error initializing free trial (Google signup):', trialError)
      }

      try {
        const { createDefaultReminders } = await import('@/lib/utils/defaultReminders')
        await createDefaultReminders(user.uid, businessType)
      } catch (reminderError) {
        console.error('Error creating default reminders (Google signup):', reminderError)
      }

      try {
        const idToken = await user.getIdToken()
        await fetch('/api/user/send-welcome-email', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        })
      } catch (welcomeError) {
        console.error('Error sending welcome email (Google signup):', welcomeError)
      }

      setAuthState({ user, loading: false, error: null })
      return { success: true, userId: user.uid, isNewUser: true }
    } catch (error: unknown) {
      let errorMessage = 'An error occurred during Google sign up'
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/popup-closed-by-user') {
          errorMessage = 'Sign up cancelled'
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

  // Complete profile creation for an already authenticated Google user (when Auth user exists but userProfile doesn't).
  const completeGoogleProfile = async (businessType: BusinessType) => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        return { success: false, error: 'User not authenticated' }
      }

      const existingProfile = await userService.getProfile(currentUser.uid)
      if (existingProfile) {
        return { success: true, userId: currentUser.uid, alreadyExisted: true }
      }

      const displayName = currentUser.displayName || ''
      const nameParts = displayName.split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const profileData: any = {
        email: (currentUser.email || '').toLowerCase(),
        firstName,
        lastName,
        businessType,
        phone: null,
        phoneNumber: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      if (businessType === 'consultant') {
        profileData.consultantKycCompleted = false
        profileData.role = 'consultant'
      }

      const profileResult = await userService.upsertProfile(currentUser.uid, profileData)
      if (!profileResult?.success) {
        return { success: false, error: profileResult?.error || 'Failed to create profile' }
      }

      // Initialize free trial + reminders + welcome email (best-effort)
      try {
        const idToken = await currentUser.getIdToken()
        await fetch('/api/user/init-free-trial', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        })
      } catch (trialError) {
        console.error('Error initializing free trial (Google profile completion):', trialError)
      }

      try {
        const { createDefaultReminders } = await import('@/lib/utils/defaultReminders')
        await createDefaultReminders(currentUser.uid, businessType)
      } catch (reminderError) {
        console.error('Error creating default reminders (Google profile completion):', reminderError)
      }

      try {
        const idToken = await currentUser.getIdToken()
        await fetch('/api/user/send-welcome-email', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        })
      } catch (welcomeError) {
        console.error('Error sending welcome email (Google profile completion):', welcomeError)
      }

      return { success: true, userId: currentUser.uid, alreadyExisted: false }
    } catch (error: any) {
      console.error('Error completing Google profile:', error)
      return { success: false, error: error?.message || 'Failed to complete profile' }
    }
  }

  /**
   * Link Google credential to existing email/password account
   * This is called when a user tries to sign in with Google but has an email/password account
   */
  const linkGoogleToEmailAccount = async (email: string, password: string, googleCredential: any) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))

      // First, sign in with email/password
      const emailCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = emailCredential.user

      if (!user) {
        return { success: false, error: 'Failed to sign in with email and password' }
      }

      // Now link the Google credential to this account
      await linkWithCredential(user, googleCredential)

      // Refresh user data to get updated providers
      await user.reload()

      setAuthState({
        user: auth.currentUser,
        loading: false,
        error: null
      })

      return { 
        success: true, 
        message: 'Accounts linked successfully! You can now sign in with either method.',
        userId: user.uid
      }
    } catch (error: unknown) {
      let errorMessage = 'Failed to link accounts'
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errorMessage = 'Incorrect password. Please try again.'
        } else if (error.code === 'auth/credential-already-in-use') {
          errorMessage = 'This Google account is already linked to another account.'
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
    signUpWithGoogle,
    completeGoogleProfile,
    logout,
    resetPassword,
    setPasswordForGoogleUser,
    linkGoogleToEmailAccount,
    clearError,
    isAuthenticated: !!authState.user
  }
}
