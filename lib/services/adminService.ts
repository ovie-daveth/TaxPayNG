import { db } from "@/firebase/firebase"
import { collection, doc, getDoc, query, where, getDocs, updateDoc, setDoc } from "firebase/firestore"

// Admin emails - You can manage this list or check userProfile role
const ADMIN_EMAILS = [
  // Add your admin emails here
  "oviedavid77@gmail.com",
]

export const adminService = {
  /**
   * Check if a user is an admin by checking userProfile
   */
  async isAdmin(email: string, uid?: string): Promise<boolean> {
    // Check hardcoded list
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      return true
    }
    
    try {
      // Check userProfile collection by UID
      if (uid) {
        const userProfileQuery = query(
          collection(db, "userProfiles"),
          where("userId", "==", uid)
        )
        const userProfileSnapshot = await getDocs(userProfileQuery)
        
        if (!userProfileSnapshot.empty) {
          const profile = userProfileSnapshot.docs[0].data()
          if (profile.role === "admin") {
            return true
          }
        }
      }
      
      // Also check by email as fallback
      const userProfileQueryByEmail = query(
        collection(db, "userProfiles"),
        where("email", "==", email.toLowerCase())
      )
      const userProfileSnapshotByEmail = await getDocs(userProfileQueryByEmail)
      
      if (!userProfileSnapshotByEmail.empty) {
        const profile = userProfileSnapshotByEmail.docs[0].data()
        if (profile.role === "admin") {
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error("Error checking admin status:", error)
      return false
    }
  },

  /**
   * Set user as admin by updating their userProfile
   * Uses API route with Admin SDK to bypass Firestore rules
   */
  async setAdmin(email: string, uid: string): Promise<void> {
    try {
      // Get current user's auth token
      const { auth } = await import("@/firebase/firebase")
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error("User not authenticated")
      }

      const token = await currentUser.getIdToken()

      // Call API route that uses Admin SDK
      const response = await fetch("/api/admin/set-admin-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email,
          uid
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to set admin role")
      }

      console.log("✅ Admin role set successfully:", data.message)
    } catch (error) {
      console.error("Error setting admin role:", error)
      throw error
    }
  },

  /**
   * Update admin last login time in userProfile
   */
  async updateLastLogin(email: string, uid: string): Promise<void> {
    try {
      const userProfileQuery = query(
        collection(db, "userProfiles"),
        where("userId", "==", uid)
      )
      const userProfileSnapshot = await getDocs(userProfileQuery)
      
      if (!userProfileSnapshot.empty) {
        const profileDoc = userProfileSnapshot.docs[0]
        await updateDoc(profileDoc.ref, {
          lastLogin: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error("Error updating last login:", error)
    }
  },

  /**
   * Check if a user is an editor (blogger) by checking userProfile
   */
  async isEditor(email: string, uid?: string): Promise<boolean> {
    try {
      // Check userProfile collection by UID
      if (uid) {
        const userProfileQuery = query(
          collection(db, "userProfiles"),
          where("userId", "==", uid)
        )
        const userProfileSnapshot = await getDocs(userProfileQuery)
        
        if (!userProfileSnapshot.empty) {
          const profile = userProfileSnapshot.docs[0].data()
          if (profile.role === "editor" || profile.role === "admin") {
            return true
          }
        }
      }
      
      // Also check by email as fallback
      const userProfileQueryByEmail = query(
        collection(db, "userProfiles"),
        where("email", "==", email.toLowerCase())
      )
      const userProfileSnapshotByEmail = await getDocs(userProfileQueryByEmail)
      
      if (!userProfileSnapshotByEmail.empty) {
        const profile = userProfileSnapshotByEmail.docs[0].data()
        if (profile.role === "editor" || profile.role === "admin") {
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error("Error checking editor status:", error)
      return false
    }
  },

  /**
   * Set user as editor by updating their userProfile
   */
  async setEditor(email: string, uid: string): Promise<void> {
    try {
      // Find userProfile by userId
      const userProfileQuery = query(
        collection(db, "userProfiles"),
        where("userId", "==", uid)
      )
      const userProfileSnapshot = await getDocs(userProfileQuery)
      
      if (!userProfileSnapshot.empty) {
        const profileDoc = userProfileSnapshot.docs[0]
        await updateDoc(profileDoc.ref, {
          role: "editor",
          updatedAt: new Date().toISOString()
        })
      } else {
        console.warn("User profile not found for UID:", uid)
      }
    } catch (error) {
      console.error("Error setting editor role:", error)
      throw error
    }
  }
}
