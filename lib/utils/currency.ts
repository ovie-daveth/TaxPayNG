// Currency conversion utility for tax calculator
// Supports conversion from major currencies to NGN (Nigerian Naira)
// Exchange rates are stored in Firestore and managed through admin dashboard

import { exchangeRateService } from "@/lib/services/exchangeRateService"

// Common currencies for creators (often receive income in these)
export const SUPPORTED_CURRENCIES = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
] as const

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]["code"]

// Fallback exchange rates (updated periodically, user should verify for accuracy)
// These are approximate rates - in production, fetch from API
const FALLBACK_RATES: Record<string, number> = {
  USD: 1500, // 1 USD = ~1500 NGN (approximate, varies)
  EUR: 1650, // 1 EUR = ~1650 NGN
  GBP: 1900, // 1 GBP = ~1900 NGN
  CAD: 1100, // 1 CAD = ~1100 NGN
  AUD: 1000, // 1 AUD = ~1000 NGN
  KES: 10, // 1 KES = ~10 NGN
  GHS: 100, // 1 GHS = ~100 NGN
  ZAR: 80, // 1 ZAR = ~80 NGN
  NGN: 1, // 1 NGN = 1 NGN
}

// Cache for exchange rates
let exchangeRateCache: Map<string, { rate: number; timestamp: number }> = new Map()
const CACHE_DURATION = 3600000 // 1 hour cache

/**
 * Fetch exchange rate from Firestore (admin-managed) or API fallback
 * Priority: Firestore > API > Fallback rates
 */
export async function fetchExchangeRate(from: CurrencyCode, to: CurrencyCode = "NGN"): Promise<number> {
  // If same currency, return 1
  if (from === to) return 1

  // Check cache first
  const cacheKey = `${from}_${to}`
  const cached = exchangeRateCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rate
  }

  try {
    // First, try to fetch from Firestore (admin-managed rates)
    const dbRate = await exchangeRateService.getRate(from)
    if (dbRate && dbRate.rate > 0) {
      const rate = dbRate.rate
      // Cache the rate
      exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() })
      return rate
    }
  } catch (error) {
    console.warn("Failed to fetch exchange rate from Firestore, trying API:", error)
  }

  try {
    // Fallback: Try to fetch from exchangerate-api.com (free tier)
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })
    
    if (response.ok) {
      const data = await response.json()
      const rate = data.rates?.[to] || data.rates?.NGN || FALLBACK_RATES[from] || 1

      // Cache the rate
      exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() })
      return rate
    }
  } catch (error) {
    console.warn("Failed to fetch exchange rate from API, using fallback:", error)
  }
  
  // Final fallback: Use hardcoded rates
  const fallbackRate = FALLBACK_RATES[from] || 1
  exchangeRateCache.set(cacheKey, { rate: fallbackRate, timestamp: Date.now() })
  return fallbackRate
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode = "NGN"
): Promise<number> {
  if (from === to) return amount

  const rate = await fetchExchangeRate(from, to)
  return amount * rate
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(code: CurrencyCode): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === code)
  return currency?.symbol || code
}

/**
 * Format amount with currency symbol
 */
export function formatCurrencyAmount(amount: number, currency: CurrencyCode): string {
  const symbol = getCurrencySymbol(currency)
  return `${symbol}${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Batch convert multiple amounts (optimized for multiple conversions)
 */
export async function batchConvertCurrency(
  conversions: Array<{ amount: number; from: CurrencyCode; to?: CurrencyCode }>
): Promise<number[]> {
  const rates = new Map<string, number>()
  const results: number[] = []

  for (const { amount, from, to = "NGN" } of conversions) {
    if (from === to) {
      results.push(amount)
      continue
    }

    const cacheKey = `${from}_${to}`
    if (!rates.has(cacheKey)) {
      rates.set(cacheKey, await fetchExchangeRate(from, to))
    }

    const rate = rates.get(cacheKey)!
    results.push(amount * rate)
  }

  return results
}

/**
 * Format currency input as user types (adds commas for thousands)
 * Returns formatted display value
 */
export function formatCurrencyInput(value: string): string {
  if (!value || value === "") return ""
  
  // Remove all non-digit characters except decimal point
  const numericValue = value.replace(/[^\d.]/g, "")
  
  // Split by decimal point
  const parts = numericValue.split(".")
  const integerPart = parts[0] || ""
  const decimalPart = parts[1] || ""
  
  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  
  // Combine with decimal part if exists
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger
}

/**
 * Parse formatted currency string to raw numeric string (removes commas)
 */
export function parseCurrencyInput(value: string): string {
  // Remove commas and keep only digits and decimal point
  return value.replace(/,/g, "")
}

/**
 * Handle currency input change - validates and formats
 * Returns { isValid: boolean, rawValue: string, displayValue: string }
 */
export function handleCurrencyInputChange(value: string): {
  isValid: boolean
  rawValue: string
  displayValue: string
} {
  // Allow empty string
  if (value === "") {
    return { isValid: true, rawValue: "", displayValue: "" }
  }

  // Remove all non-digit characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, "")
  
  // Prevent multiple decimal points
  const parts = cleaned.split(".")
  if (parts.length > 2) {
    return { isValid: false, rawValue: "", displayValue: "" }
  }

  // Limit decimal places to 2
  if (parts[1] && parts[1].length > 2) {
    return { isValid: false, rawValue: "", displayValue: "" }
  }

  // Format for display (with commas)
  const displayValue = formatCurrencyInput(cleaned)
  
  return {
    isValid: true,
    rawValue: cleaned,
    displayValue,
  }
}

