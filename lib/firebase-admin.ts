import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getAuth, Auth } from 'firebase-admin/auth'

let adminApp: App | null = null
export let adminDb: Firestore | null = null

/**
 * Initialize Firebase Admin SDK
 * This bypasses Firestore security rules for server-side operations
 */
function initializeAdminApp(): App {
  if (adminApp) {
    return adminApp
  }

  // Check if already initialized
  if (getApps().length === 0) {
    try {
      // Initialize with service account or application default credentials
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      
      if (process.env.FIREBASE_PROJECT_ID && privateKey && process.env.FIREBASE_CLIENT_EMAIL) {
        // Validate private key format
        if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
          throw new Error(
            'Invalid FIREBASE_PRIVATE_KEY format. The private key must include "-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----". ' +
            'Make sure you copied the entire key from the JSON file and wrapped it in quotes in your .env.local file.'
          )
        }

        // Use service account credentials
        try {
          adminApp = initializeApp({
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: privateKey,
            }),
          })
          console.log('✅ Firebase Admin SDK initialized successfully with service account credentials')
        } catch (certError: any) {
          const errorMessage = certError.message || 'Unknown error'
          if (errorMessage.includes('invalid_grant') || errorMessage.includes('Invalid JWT')) {
            throw new Error(
              'Firebase Admin SDK authentication failed: Invalid JWT Signature. ' +
              'This usually means:\n' +
              '1. Your private key has been revoked - Generate a new key at: https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk\n' +
              '2. Your server time is out of sync - Sync your system time\n' +
              '3. The private key is incorrect - Verify FIREBASE_PRIVATE_KEY in .env.local matches the key from Firebase Console\n\n' +
              'To fix: Go to Firebase Console → Project Settings → Service Accounts → Generate New Private Key'
            )
          }
          throw certError
        }
      } else if (process.env.FIREBASE_PROJECT_ID) {
        // Use application default credentials (for local development with Firebase CLI)
        try {
          adminApp = initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID,
          })
          console.log('✅ Firebase Admin SDK initialized with application default credentials')
        } catch (adcError: any) {
          throw new Error(
            'Firebase Admin SDK failed to initialize with application default credentials. ' +
            'Make sure you have run "firebase login" or set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID in .env.local'
          )
        }
      } else {
        const missingVars = []
        if (!process.env.FIREBASE_PROJECT_ID) missingVars.push('FIREBASE_PROJECT_ID')
        if (!process.env.FIREBASE_PRIVATE_KEY) missingVars.push('FIREBASE_PRIVATE_KEY')
        if (!process.env.FIREBASE_CLIENT_EMAIL) missingVars.push('FIREBASE_CLIENT_EMAIL')
        
        throw new Error(
          `Firebase Admin SDK not configured. Missing environment variables: ${missingVars.join(', ')}. ` +
          'Please set these in your .env.local file. See FIREBASE_ADMIN_SETUP.md for instructions.'
        )
      }
    } catch (error: any) {
      console.error('❌ Firebase Admin SDK initialization error:', error.message)
      throw error
    }
  } else {
    adminApp = getApps()[0]
  }

  return adminApp
}

/**
 * Get Firestore instance (Admin SDK)
 * This bypasses Firestore security rules for server-side operations
 */
export function getAdminDb(): Firestore {
  if (adminDb) {
    return adminDb
  }

  const app = initializeAdminApp()
  adminDb = getFirestore(app)
  return adminDb
}

/**
 * Get Auth instance (Admin SDK)
 * Used for creating users, managing authentication, etc.
 */
export function getAdminAuth(): Auth {
  const app = initializeAdminApp()
  return getAuth(app)
}

