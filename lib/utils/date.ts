/**
 * Utility functions for handling dates and Firestore timestamps
 */

/**
 * Convert a Firestore timestamp or date string to a JavaScript Date object
 */
export function toDate(dateInput: any): Date {
  // Handle Firestore Timestamp object with toDate method
  if (dateInput && typeof dateInput === 'object' && typeof dateInput.toDate === 'function') {
    return dateInput.toDate()
  }
  // Handle Firestore Timestamp object with seconds property
  if (dateInput && typeof dateInput === 'object' && dateInput.seconds !== undefined) {
    return new Date(dateInput.seconds * 1000 + (dateInput.nanoseconds || 0) / 1000000)
  }
  // Handle ISO string or regular date string
  if (typeof dateInput === 'string') {
    return new Date(dateInput)
  }
  // Handle Date object
  if (dateInput instanceof Date) {
    return dateInput
  }
  // Fallback to current date
  return new Date()
}

/**
 * Format a date to a readable string
 */
export function formatDate(dateInput: any, locale: string = 'en-NG'): string {
  const date = toDate(dateInput)
  
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format a date to ISO string for form inputs (YYYY-MM-DD)
 * Uses local date components to avoid timezone issues
 */
export function formatDateForInput(dateInput: any): string {
  const date = toDate(dateInput)
  // Use local date components to avoid timezone conversion issues
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Calculate tax period (year, quarter, month) from a date
 * Used for time-based tax calculations and reporting
 */
export function calculateTaxPeriod(dateInput: any): { year: number; quarter: number; month: number } {
  const date = toDate(dateInput)
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-12
  
  // Calculate quarter (1-4)
  const quarter = Math.ceil(month / 3)
  
  return {
    year,
    quarter,
    month
  }
}