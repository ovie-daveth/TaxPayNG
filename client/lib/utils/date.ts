/**
 * Utility functions for handling dates and Firestore timestamps
 */

/**
 * Convert a Firestore timestamp or date string to a JavaScript Date object
 */
export function toDate(dateInput: any): Date {
  // Handle Firestore Timestamp object
  if (dateInput && typeof dateInput === 'object' && dateInput.seconds) {
    return new Date(dateInput.seconds * 1000)
  } 
  // Handle ISO string or regular date string
  else if (typeof dateInput === 'string') {
    return new Date(dateInput)
  }
  // Handle Date object
  else if (dateInput instanceof Date) {
    return dateInput
  }
  // Fallback to current date
  else {
    return new Date()
  }
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
 * Format a date to ISO string for form inputs
 */
export function formatDateForInput(dateInput: any): string {
  const date = toDate(dateInput)
  return date.toISOString().split('T')[0]
}
