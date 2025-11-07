import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let adminApp: App | null = null
let adminDb: Firestore | null = null

/**
 * Initialize Firebase Admin SDK
 * This bypasses Firestore security rules for server-side operations
 */
export function getAdminDb(): Firestore {
  if (adminDb) {
    return adminDb
  }

  // Check if already initialized
  if (getApps().length === 0) {
    // Initialize with service account or application default credentials
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    
    if (process.env.FIREBASE_PROJECT_ID && privateKey && process.env.FIREBASE_CLIENT_EMAIL) {
      // Use service account credentials
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      })
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Use application default credentials (for local development with Firebase CLI)
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      })
    } else {
      throw new Error('Firebase Admin SDK not configured. Please set FIREBASE_PROJECT_ID and credentials.')
    }
  } else {
    adminApp = getApps()[0]
  }

  adminDb = getFirestore(adminApp)
  return adminDb
}

