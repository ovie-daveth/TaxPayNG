import { useState, useCallback } from "react"

/**
 * Hook for formatting currency inputs as user types
 * Displays formatted value (₦1,000,000) but stores raw numeric value
 */
export function useCurrencyInput(initialValue: string = "") {
  const [displayValue, setDisplayValue] = useState<string>(initialValue)
  const [rawValue, setRawValue] = useState<string>(initialValue)

  /**
   * Format a numeric string to currency format (add commas)
   */
  const formatCurrency = useCallback((value: string): string => {
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
  }, [])

  /**
   * Parse formatted currency string to raw numeric string
   */
  const parseCurrency = useCallback((value: string): string => {
    // Remove commas and keep only digits and decimal point
    return value.replace(/,/g, "")
  }, [])

  /**
   * Handle input change - format display but store raw value
   */
  const handleChange = useCallback((value: string) => {
    // Allow empty string
    if (value === "") {
      setDisplayValue("")
      setRawValue("")
      return
    }

    // Remove all non-digit characters except decimal point
    const cleaned = value.replace(/[^\d.]/g, "")
    
    // Prevent multiple decimal points
    const parts = cleaned.split(".")
    if (parts.length > 2) {
      return // Invalid input, ignore
    }

    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      return // Too many decimal places, ignore
    }

    // Store raw value (without commas)
    setRawValue(cleaned)
    
    // Format for display (with commas)
    const formatted = formatCurrency(cleaned)
    setDisplayValue(formatted)
  }, [formatCurrency])

  /**
   * Set value programmatically (useful for initialization or reset)
   */
  const setValue = useCallback((value: string) => {
    const parsed = parseCurrency(value)
    setRawValue(parsed)
    setDisplayValue(formatCurrency(parsed))
  }, [formatCurrency, parseCurrency])

  /**
   * Get numeric value for calculations
   */
  const getNumericValue = useCallback((): number => {
    const num = parseFloat(rawValue || "0")
    return isNaN(num) ? 0 : num
  }, [rawValue])

  return {
    displayValue,
    rawValue,
    handleChange,
    setValue,
    getNumericValue,
  }
}

