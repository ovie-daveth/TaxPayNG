import { BaseService } from './base'
import { UserProfile, SubscriptionType } from '@/lib/types'
import { ApiResponse } from '@/lib/types'
import { userService } from './userService'

export interface SubscriptionPlan {
  id: SubscriptionType
  name: string
  monthlyPrice: number // in kobo (Nigerian currency smallest unit)
  yearlyPrice: number // in kobo (25% discount applied)
  monthlyPriceDisplay: string // Display price with currency
  yearlyPriceDisplay: string // Display price with currency
  features: string[]
}

// Helper function to get price based on interval
export const getPlanPrice = (plan: SubscriptionPlan, interval: 'monthly' | 'yearly'): number => {
  return interval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
}

// Helper function to get price display based on interval
export const getPlanPriceDisplay = (plan: SubscriptionPlan, interval: 'monthly' | 'yearly'): string => {
  return interval === 'yearly' ? plan.yearlyPriceDisplay : plan.monthlyPriceDisplay
}

// Helper function to calculate yearly price with 25% discount
const calculateYearlyPrice = (monthlyPrice: number): number => {
  // Yearly = 12 months * monthly price * 0.75 (25% discount)
  return Math.round(12 * monthlyPrice * 0.75)
}

// Helper function to format price display
const formatPriceDisplay = (priceInKobo: number): string => {
  const priceInNaira = priceInKobo / 100 // 1 Naira = 100 kobo
  return `₦${priceInNaira.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export const SUBSCRIPTION_PLANS: Record<Exclude<SubscriptionType, null>, SubscriptionPlan> = {
  'PRO': {
    id: 'PRO',
    name: 'PRO - Freelancers',
    monthlyPrice: 250000, // ₦2,500 in kobo
    yearlyPrice: calculateYearlyPrice(250000), // ₦22,500 (25% off from ₦30,000)
    monthlyPriceDisplay: '₦2,500',
    yearlyPriceDisplay: formatPriceDisplay(calculateYearlyPrice(250000)),
    features: [
      'Track up to 100 transactions/month',
      'Income & expense tracking',
      'Tax calculator with reliefs',
      'Basic reports generation',
      'Document storage (500MB total)',
      'Email reminders',
      'Email support'
    ]
  },
  'GOLD': {
    id: 'GOLD',
    name: 'GOLD - Creators',
    monthlyPrice: 600000, // ₦6,000 in kobo
    yearlyPrice: calculateYearlyPrice(600000), // ₦54,000 (25% off from ₦72,000)
    monthlyPriceDisplay: '₦6,000',
    yearlyPriceDisplay: formatPriceDisplay(calculateYearlyPrice(600000)),
    features: [
      'Track up to 500 transactions/month',
      'All PRO features',
      'Multi-platform income tracking',
      'Sponsorship & brand deal management',
      'Advanced tax calculations',
      'Document storage (2GB total)',
      'Receipt scanning & OCR',
      'SMS & email reminders',
      'Priority support'
    ]
  },
  'PLATINUM': {
    id: 'PLATINUM',
    name: 'PLATINUM - Advanced Creators',
    monthlyPrice: 1250000, // ₦12,500 in kobo
    yearlyPrice: calculateYearlyPrice(1250000), // ₦120,000 (20% off from ₦150,000)
    monthlyPriceDisplay: '₦12,500',
    yearlyPriceDisplay: formatPriceDisplay(calculateYearlyPrice(1250000)),
    features: [
      'Everything in GOLD',
      'Multi-entity business management',
      'Advanced analytics & insights',
      'IRS/NRS filing reports',
      'Document storage (10GB total)',
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
    monthlyPrice: 1250000, // ₦12,500 in kobo
    yearlyPrice: calculateYearlyPrice(1250000), // ₦112,500 (25% off from ₦150,000)
    monthlyPriceDisplay: '₦12,500',
    yearlyPriceDisplay: formatPriceDisplay(calculateYearlyPrice(1250000)),
    features: [
      'Track up to 5,000 transactions/month',
      'Advanced tax calculations',
      'Small business tax exemption tracking',
      'IRS/NRS filing reports',
      'Document storage (15GB total)',
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
    monthlyPrice: 3750000, // ₦37,500 in kobo
    yearlyPrice: calculateYearlyPrice(3750000), // ₦337,500 (25% off from ₦450,000)
    monthlyPriceDisplay: '₦37,500',
    yearlyPriceDisplay: formatPriceDisplay(calculateYearlyPrice(3750000)),
    features: [
      'Everything in Small Business',
      'Full corporate tax compliance',
      'Multi-user access (up to 10 users)',
      'Advanced analytics & insights',
      'Custom report templates',
      'Document storage (50GB total)',
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
  interval?: 'monthly' | 'yearly' // Billing interval (defaults to 'monthly' for backward compatibility)
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

  // Get plan price for a specific interval
  getPlanPrice(subscriptionType: SubscriptionType, interval: 'monthly' | 'yearly'): number | null {
    const plan = this.getPlan(subscriptionType)
    if (!plan) return null
    return getPlanPrice(plan, interval)
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

      // Calculate expiry date based on interval (not used here, but kept for compatibility)
      // Actual expiry is calculated in the verify route based on interval
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

