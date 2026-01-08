import { reminderService } from "@/lib/services"
import { BusinessType } from "@/lib/types"

/**
 * Create default reminders for a new user
 * - 31st March: Annual tax filing deadline
 * - 30th of each month: Monthly tax payment deadline (recurring)
 */
export async function createDefaultReminders(
  userId: string,
  businessType: BusinessType
): Promise<void> {
  try {
    const now = new Date()
    const currentYear = now.getFullYear()
    
    // Determine base path based on business type
    const basePath = 
      businessType === 'sme' ? '/dashboard-sme' :
      businessType === 'creator' ? '/dashboard-creator' :
      '/dashboard'

    // 1. Annual Tax Filing Deadline - March 31st
    const filingDeadline = new Date(currentYear, 2, 31) // March 31st (month is 0-indexed)
    
    // If March 31st has passed this year, set it for next year
    if (filingDeadline < now) {
      filingDeadline.setFullYear(currentYear + 1)
    }

    await reminderService.createReminder(userId, {
      title: "Annual Tax Filing Deadline",
      description: "Deadline for filing your annual tax return with LIRS/FIRS. Make sure all your transactions and documents are up to date.",
      type: 'tax_deadline',
      dueDate: filingDeadline.toISOString(),
      priority: 'high',
      actionUrl: `${basePath}/reports/generate/self-assessment`,
      actionLabel: "File Tax Return",
      recurring: {
        frequency: 'yearly',
        interval: 1
      }
    })

    // 2. Monthly Tax Payment Deadline - 30th of each month (recurring)
    const paymentDeadline = new Date(currentYear, now.getMonth(), 30)
    
    // If 30th has passed this month, set it for next month
    if (paymentDeadline < now) {
      paymentDeadline.setMonth(now.getMonth() + 1)
    }

    await reminderService.createReminder(userId, {
      title: "Monthly Tax Payment Deadline",
      description: "Deadline for making your monthly tax payment. Ensure all outstanding tax obligations are settled.",
      type: 'payment_due',
      dueDate: paymentDeadline.toISOString(),
      priority: 'high',
      actionUrl: `${basePath}/payment`,
      actionLabel: "Make Payment",
      recurring: {
        frequency: 'monthly',
        interval: 1
      }
    })

    console.log('Default reminders created successfully for user:', userId)
  } catch (error) {
    console.error('Error creating default reminders:', error)
    // Don't throw - we don't want to fail signup if reminders fail
  }
}

