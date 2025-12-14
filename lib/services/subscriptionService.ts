import { BaseService } from './base'
import { UserProfile, SubscriptionType } from '@/lib/types'
import { ApiResponse } from '@/lib/types'
import { userService } from './userService'

export interface SubscriptionPlan {
  id: SubscriptionType
  name: string
  price: number // in kobo (Nigerian currency smallest unit)
  priceDisplay: string // Display price with currency
  interval: 'monthly' | 'yearly'
  features: string[]
}

export const SUBSCRIPTION_PLANS: Record<Exclude<SubscriptionType, null>, SubscriptionPlan> = {
  'PRO': {
    id: 'PRO',
    name: 'PRO - Freelancers',
    price: 250000, // ₦2,500 in kobo
    priceDisplay: '₦2,500',
    interval: 'monthly',
    features: [
      'Track up to 100 transactions/month',
      'Income & expense tracking',
      'Tax calculator with reliefs',
      'Basic reports generation',
      'Document storage (500MB)',
      'Email reminders',
      'Email support'
    ]
  },
  'GOLD': {
    id: 'GOLD',
    name: 'GOLD - Creators',
    price: 600000, // ₦6,000 in kobo
    priceDisplay: '₦6,000',
    interval: 'monthly',
    features: [
      'Unlimited transactions',
      'All PRO features',
      'Multi-platform income tracking',
      'Sponsorship & brand deal management',
      'Advanced tax calculations',
      'Document storage (2GB)',
      'Receipt scanning & OCR',
      'SMS & email reminders',
      'Priority support'
    ]
  },
  'PLATINUM': {
    id: 'PLATINUM',
    name: 'PLATINUM - Advanced Creators',
    price: 1250000, // ₦12,500 in kobo
    priceDisplay: '₦12,500',
    interval: 'monthly',
    features: [
      'Everything in GOLD',
      'Multi-entity business management',
      'Advanced analytics & insights',
      'IRS/NRS filing reports',
      'Document storage (10GB)',
      'Custom report templates',
      'Team collaboration (up to 3 users)',
      'Dedicated tax advisor consultation',
      'Quarterly tax planning sessions',
      '24/7 priority support'
    ]
  },
  'Small Business': {
    id: 'Small Business',
    name: 'Small Business',
    price: 1250000, // ₦12,500 in kobo
    priceDisplay: '₦12,500',
    interval: 'monthly',
    features: [
      'Unlimited transactions',
      'Advanced tax calculations',
      'Small business tax exemption tracking',
      'IRS/NRS filing reports',
      'Document storage (5GB)',
      'Receipt scanning & OCR',
      'SMS & email reminders',
      'Multi-user access (up to 3 users)',
      'Basic analytics & insights',
      'Priority support'
    ]
  },
  'Big Business': {
    id: 'Big Business',
    name: 'Big Business',
    price: 3750000, // ₦37,500 in kobo
    priceDisplay: '₦37,500',
    interval: 'monthly',
    features: [
      'Everything in Small Business',
      'Full corporate tax compliance',
      'Multi-user access (up to 10 users)',
      'Advanced analytics & insights',
      'Custom report templates',
      'Document storage (50GB)',
      'API access',
      'Dedicated account manager',
      '24/7 priority support'
    ]
  }
}

export interface SubscriptionPayment {
  id: string
  userId: string
  subscriptionType: SubscriptionType
  amount: number // in kobo
  paystackReference: string
  status: 'pending' | 'success' | 'failed' | 'cancelled'
  createdAt: string
  updatedAt: string
  expiresAt?: string // Subscription expiry date
}

export class SubscriptionService extends BaseService {
  constructor() {
    super('subscriptions')
  }

  // Get plan details
  getPlan(subscriptionType: SubscriptionType): SubscriptionPlan | null {
    if (!subscriptionType) return null
    return SUBSCRIPTION_PLANS[subscriptionType] || null
  }

  // Get all available plans
  getAllPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS)
  }

  // Create a subscription payment record
  async createSubscriptionPayment(
    userId: string,
    subscriptionType: SubscriptionType,
    paystackReference: string,
    amount: number
  ): Promise<ApiResponse<SubscriptionPayment>> {
    try {
      const plan = this.getPlan(subscriptionType)
      if (!plan) {
        return {
          success: false,
          error: 'Invalid subscription plan'
        }
      }

      // Calculate expiry date (30 days from now for monthly subscriptions)
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 1)

      const subscriptionData: Omit<SubscriptionPayment, 'id'> = {
        userId,
        subscriptionType,
        amount,
        paystackReference,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      }

      const subscriptionId = await this.create(subscriptionData)
      const subscription = await this.getById(subscriptionId)

      return {
        success: true,
        data: subscription as SubscriptionPayment,
        message: 'Subscription payment created'
      }
    } catch (error) {
      console.error('Error creating subscription payment:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Update subscription payment status
  async updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionPayment['status']
  ): Promise<ApiResponse<SubscriptionPayment>> {
    try {
      await this.update(subscriptionId, {
        status,
        updatedAt: new Date().toISOString()
      })

      const subscription = await this.getById(subscriptionId)
      return {
        success: true,
        data: subscription as SubscriptionPayment,
        message: 'Subscription status updated'
      }
    } catch (error) {
      console.error('Error updating subscription status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Activate user subscription after successful payment
  async activateSubscription(
    userId: string,
    subscriptionType: SubscriptionType
  ): Promise<ApiResponse<UserProfile>> {
    try {
      const result = await userService.upsertProfile(userId, {
        isSubscribe: true,
        subscriptionType,
        // Storage limit will be set automatically by userService
      })

      return result
    } catch (error) {
      console.error('Error activating subscription:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // Get user's active subscription
  async getUserSubscription(userId: string): Promise<SubscriptionPayment | null> {
    try {
      const subscriptions = await this.getAll([
        { field: 'userId', operator: '==', value: userId },
        { field: 'status', operator: '==', value: 'success' }
      ])

      // Get the most recent active subscription
      const activeSubscriptions = subscriptions
        .filter(sub => {
          const subData = sub as SubscriptionPayment
          if (!subData.expiresAt) return true
          return new Date(subData.expiresAt) > new Date()
        })
        .sort((a, b) => {
          const aData = a as SubscriptionPayment
          const bData = b as SubscriptionPayment
          return new Date(bData.createdAt).getTime() - new Date(aData.createdAt).getTime()
        })

      return activeSubscriptions.length > 0 ? (activeSubscriptions[0] as SubscriptionPayment) : null
    } catch (error) {
      console.error('Error getting user subscription:', error)
      return null
    }
  }

  // Check if user has active subscription
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId)
    return subscription !== null
  }
}

// Export a singleton instance
export const subscriptionService = new SubscriptionService()

