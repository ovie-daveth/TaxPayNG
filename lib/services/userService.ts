import { BaseService } from './base'
import { UserProfile } from '@/lib/types'
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

  // Create or update user profile
  async upsertProfile(userId: string, profileData: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      const existingProfile = await this.getProfile(userId)
      
      if (existingProfile) {
        // Update existing profile
        await this.update(existingProfile.id, {
          ...profileData,
          userId,
          updatedAt: new Date().toISOString()
        })
        
        const updatedProfile = await this.getById(existingProfile.id)
        return {
          success: true,
          data: updatedProfile,
          message: 'Profile updated successfully'
        }
      } else {
        // Create new profile
        const newProfileData = {
          ...profileData,
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
          ...preferences
        }
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
}

// Export a singleton instance
export const userService = new UserService()
