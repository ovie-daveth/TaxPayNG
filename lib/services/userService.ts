import { BaseService } from './base'
import { UserProfile, SubscriptionType } from '@/lib/types'
import { ApiResponse } from '@/lib/types'

export class UserService extends BaseService {
  constructor() {
    super('userProfiles')
  }

  // Get user profile by user ID (from auth)
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profiles = await this.getAll([
        { field: 'userId', operator: '==', value: userId }
      ])
      
      return profiles.length > 0 ? profiles[0] : null
    } catch (error) {
      console.error('Error getting user profile:', error)
      return null
    }
  }

  // Check if a TIN is already registered to another user
  async isTinTaken(taxId: string, currentUserId: string): Promise<boolean> {
    try {
      const profiles = await this.getAll([
        { field: 'taxId', operator: '==', value: taxId }
      ])
      
      // Return true if TIN is found and belongs to a different user
      return profiles.some(profile => profile.userId !== currentUserId)
    } catch (error) {
      console.error('Error checking if TIN is taken:', error)
      return false
    }
  }

  // Get storage limit based on subscription type (in bytes)
  getStorageLimit(subscriptionType: SubscriptionType): number {
    switch (subscriptionType) {
      case 'PRO':
        return 500 * 1024 * 1024 // 500MB
      case 'GOLD':
        return 2 * 1024 * 1024 * 1024 // 2GB
      case 'PLATINUM':
        return 10 * 1024 * 1024 * 1024 // 10GB
      case 'Small Business':
        return 15 * 1024 * 1024 * 1024 // 15GB
      case 'Big Business':
        return 50 * 1024 * 1024 * 1024 // 50GB
      default:
        return 500 * 1024 * 1024 // Default to 500MB (PRO plan)
    }
  }

  // Get transaction limit based on subscription type (per month)
  getTransactionLimit(subscriptionType: SubscriptionType): number {
    switch (subscriptionType) {
      case 'PRO':
        return 100 // 100 transactions/month
      case 'GOLD':
        return 500 // 500 transactions/month
      case 'PLATINUM':
        return 1000 // 1000 transactions/month
      case 'Small Business':
        return 5000 // 5000 transactions/month
      case 'Big Business':
        return Infinity // Unlimited
      default:
        return 100 // Default to 100 (PRO plan)
    }
  }

  // Initialize subscription fields with defaults
  private initializeSubscriptionFields(profileData: Partial<UserProfile>): Partial<UserProfile> {
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    
    return {
      isSubscribe: profileData.isSubscribe ?? false,
      subscriptionType: profileData.subscriptionType ?? null,
      transactionCount: profileData.transactionCount ?? 0,
      transactionCountResetDate: profileData.transactionCountResetDate ?? firstOfMonth,
      storageLimit: profileData.storageLimit ?? (profileData.subscriptionType ? this.getStorageLimit(profileData.subscriptionType) : 500 * 1024 * 1024),
      storageUsed: profileData.storageUsed ?? 0,
    }
  }

  // Reset transaction count if it's a new month (public for use in transaction service)
  async resetTransactionCountIfNeeded(userId: string, profile: UserProfile): Promise<void> {
    const now = new Date()
    const resetDate = profile.transactionCountResetDate ? new Date(profile.transactionCountResetDate) : null
    
    if (!resetDate || resetDate.getMonth() !== now.getMonth() || resetDate.getFullYear() !== now.getFullYear()) {
      // New month - reset count
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      await this.update(profile.id, {
        transactionCount: 0,
        transactionCountResetDate: firstOfMonth
      })
    }
  }

  // Create or update user profile
  async upsertProfile(userId: string, profileData: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      const existingProfile = await this.getProfile(userId)
      
      if (existingProfile) {
        // Initialize subscription fields if not present
        const subscriptionFields = this.initializeSubscriptionFields(profileData)
        
        // If subscription type changed, update storage limit
        if (profileData.subscriptionType && profileData.subscriptionType !== existingProfile.subscriptionType) {
          subscriptionFields.storageLimit = this.getStorageLimit(profileData.subscriptionType)
        }
        
        // Update existing profile
        await this.update(existingProfile.id, {
          ...profileData,
          ...subscriptionFields,
          userId,
          updatedAt: new Date().toISOString()
        })
        
        const updatedProfile = await this.getById(existingProfile.id)
        
        // Reset transaction count if needed
        await this.resetTransactionCountIfNeeded(userId, updatedProfile)
        
        return {
          success: true,
          data: updatedProfile,
          message: 'Profile updated successfully'
        }
      } else {
        // Create new profile with subscription defaults
        const subscriptionFields = this.initializeSubscriptionFields(profileData)
        const newProfileData = {
          ...profileData,
          ...subscriptionFields,
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        const profileId = await this.create(newProfileData)
        const newProfile = await this.getById(profileId)
        
        return {
          success: true,
          data: newProfile,
          message: 'Profile created successfully'
        }
      }
    } catch (error) {
      console.error('Error upserting user profile:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Increment transaction count
  async incrementTransactionCount(userId: string): Promise<ApiResponse<UserProfile>> {
    try {
      const profile = await this.getProfile(userId)
      if (!profile) {
        return {
          success: false,
          error: 'User profile not found'
        }
      }

      // Reset count if new month
      await this.resetTransactionCountIfNeeded(userId, profile)
      
      // Get fresh profile after potential reset
      const currentProfile = await this.getProfile(userId)
      if (!currentProfile) {
        return {
          success: false,
          error: 'User profile not found'
        }
      }

      const newCount = (currentProfile.transactionCount || 0) + 1
      await this.update(currentProfile.id, {
        transactionCount: newCount,
        updatedAt: new Date().toISOString()
      })

      const updatedProfile = await this.getById(currentProfile.id)
      return {
        success: true,
        data: updatedProfile,
        message: 'Transaction count updated'
      }
    } catch (error) {
      console.error('Error incrementing transaction count:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Update storage used (can be positive for adding, negative for removing)
  async updateStorageUsed(userId: string, additionalBytes: number): Promise<ApiResponse<UserProfile>> {
    try {
      const profile = await this.getProfile(userId)
      if (!profile) {
        return {
          success: false,
          error: 'User profile not found'
        }
      }

      const newStorageUsed = Math.max(0, (profile.storageUsed || 0) + additionalBytes) // Ensure it doesn't go below 0
      await this.update(profile.id, {
        storageUsed: newStorageUsed,
        updatedAt: new Date().toISOString()
      })

      const updatedProfile = await this.getById(profile.id)
      return {
        success: true,
        data: updatedProfile,
        message: 'Storage usage updated'
      }
    } catch (error) {
      console.error('Error updating storage used:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Sync storage used by calculating from all existing documents
  // This is useful for users who had documents before the subscription system was implemented
  async syncStorageUsed(userId: string): Promise<ApiResponse<UserProfile>> {
    try {
      const profile = await this.getProfile(userId)
      if (!profile) {
        return {
          success: false,
          error: 'User profile not found'
        }
      }

      // Import documentService dynamically to avoid circular dependency
      const { documentService } = await import('./documentService')
      
      // Calculate actual storage from all documents
      const usage = await documentService.getUserStorageUsage(userId)
      const actualStorageUsed = usage.totalSize

      // Update profile with actual storage used
      await this.update(profile.id, {
        storageUsed: actualStorageUsed,
        updatedAt: new Date().toISOString()
      })

      const updatedProfile = await this.getById(profile.id)
      return {
        success: true,
        data: updatedProfile,
        message: `Storage usage synced: ${(actualStorageUsed / (1024 * 1024)).toFixed(2)} MB`
      }
    } catch (error) {
      console.error('Error syncing storage used:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Update user preferences
  async updatePreferences(userId: string, preferences: UserProfile['preferences']): Promise<ApiResponse<UserProfile>> {
    try {
      const profile = await this.getProfile(userId)
      
      if (!profile) {
        return {
          success: false,
          error: 'User profile not found'
        }
      }

      await this.update(profile.id, {
        preferences: {
          ...profile.preferences,
          ...preferences,
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      })

      const updatedProfile = await this.getById(profile.id)
      
      return {
        success: true,
        data: updatedProfile,
        message: 'Preferences updated successfully'
      }
    } catch (error) {
      console.error('Error updating user preferences:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Update business type
  async updateBusinessType(userId: string, businessType: UserProfile['businessType']): Promise<ApiResponse<UserProfile>> {
    try {
      const profile = await this.getProfile(userId)
      
      if (!profile) {
        return {
          success: false,
          error: 'User profile not found'
        }
      }

      await this.update(profile.id, {
        businessType
      })

      const updatedProfile = await this.getById(profile.id)
      
      return {
        success: true,
        data: updatedProfile,
        message: 'Business type updated successfully'
      }
    } catch (error) {
      console.error('Error updating business type:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Delete user profile (for account deletion)
  async deleteProfile(userId: string): Promise<ApiResponse<void>> {
    try {
      const profile = await this.getProfile(userId)
      
      if (!profile) {
        return {
          success: false,
          error: 'User profile not found'
        }
      }

      await this.delete(profile.id)
      
      return {
        success: true,
        message: 'Profile deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting user profile:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Find user by email (for sending invoices)
  async findUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const profiles = await this.getAll([
        { field: 'email', operator: '==', value: email.toLowerCase() }
      ])
      
      return profiles.length > 0 ? profiles[0] : null
    } catch (error) {
      console.error('Error finding user by email:', error)
      return null
    }
  }
}

// Export a singleton instance
export const userService = new UserService()
