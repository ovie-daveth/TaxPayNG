/**
 * Server-Side Time Validation Utilities
 * 
 * Prevents client-side time manipulation attacks by validating
 * client time against server time and detecting suspicious patterns.
 */

export interface TimeValidationResult {
  isValid: boolean;
  timeDifference: number; // Difference in milliseconds
  timeDifferenceSeconds: number;
  warning?: string;
  isSuspicious: boolean;
}

/**
 * Validate client time against server time
 * @param clientTime - Client-provided timestamp (ISO string or Date)
 * @param serverTime - Server timestamp (Date object)
 * @param maxAllowedDifference - Maximum allowed difference in milliseconds (default: 5 minutes)
 * @returns Validation result
 */
export function validateClientTime(
  clientTime: string | Date,
  serverTime: Date = new Date(),
  maxAllowedDifference: number = 5 * 60 * 1000 // 5 minutes
): TimeValidationResult {
  const clientDate = typeof clientTime === 'string' ? new Date(clientTime) : clientTime;
  const timeDifference = Math.abs(serverTime.getTime() - clientDate.getTime());
  const timeDifferenceSeconds = Math.floor(timeDifference / 1000);

  // Check if time difference is suspicious (more than max allowed)
  const isSuspicious = timeDifference > maxAllowedDifference;

  // Determine if client time is significantly behind (potential clock manipulation)
  const isBehind = clientDate.getTime() < serverTime.getTime() - maxAllowedDifference;

  let warning: string | undefined;
  if (isBehind && timeDifference > 60 * 1000) { // More than 1 minute behind
    warning = `Client time is ${timeDifferenceSeconds} seconds behind server time. This may indicate system clock manipulation.`;
  } else if (timeDifference > 60 * 1000) { // More than 1 minute ahead
    warning = `Client time is ${timeDifferenceSeconds} seconds ahead of server time.`;
  }

  return {
    isValid: !isSuspicious,
    timeDifference,
    timeDifferenceSeconds,
    warning,
    isSuspicious
  };
}

/**
 * Get server time as ISO string
 * Use this instead of new Date() for critical operations
 */
export function getServerTime(): Date {
  return new Date();
}

/**
 * Get server time as ISO string
 */
export function getServerTimeISO(): string {
  return new Date().toISOString();
}

/**
 * Check if a date is in the past (using server time)
 */
export function isPast(date: string | Date, serverTime: Date = new Date()): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  return checkDate.getTime() < serverTime.getTime();
}

/**
 * Check if a date is in the future (using server time)
 */
export function isFuture(date: string | Date, serverTime: Date = new Date()): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  return checkDate.getTime() > serverTime.getTime();
}

