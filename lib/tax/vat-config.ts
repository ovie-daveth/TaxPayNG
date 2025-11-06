/**
 * VAT Configuration for Nigeria
 * Based on new tax regime regulations
 */

export const VAT_RATE = 7.5 // Current rate (2024)
export const FUTURE_VAT_RATES = {
  2025: 10,
  2026: 12.5,
  2027: 12.5,
  2028: 12.5,
  2029: 12.5,
  2030: 15,
}

// Small company exemption threshold
export const VAT_EXEMPTION_THRESHOLD = 100000000 // ₦100M

/**
 * VAT Supply Types
 */
export type VATSupplyStatus = "taxable" | "exempt" | "zero-rated"

/**
 * VAT Exempt Goods and Services
 */
export const VAT_EXEMPT_SUPPLIES = [
  { category: "Food & Beverages", items: ["Bread", "Milk", "Basic food items", "Rice", "Garri", "Yam flour"] },
  { category: "Medical", items: ["Medical services", "Pharmaceutical products", "Health services", "Medical equipment"] },
  { category: "Education", items: ["Books", "Educational materials", "Educational services"] },
  { category: "Agriculture", items: ["Agricultural products", "Farm inputs", "Agricultural machinery"] },
  { category: "Financial Services", items: ["Banking services", "Insurance", "Financial services"] },
  { category: "Real Estate", items: ["Residential rent"] },
  { category: "Transportation", items: ["Public transportation"] },
] as const

/**
 * Zero-Rated Supplies (VAT is charged at 0%)
 */
export const VAT_ZERO_RATED_SUPPLIES = [
  "Export of goods",
  "Export of services",
  "Goods and services supplied to ECOWAS member states",
] as const

/**
 * Get VAT exemption status for a supply
 */
export function getVATSupplyStatus(supplyDescription: string): VATSupplyStatus {
  const lowerDesc = supplyDescription.toLowerCase().trim()
  
  // Check if exempt - use word boundaries for more accurate matching
  for (const category of VAT_EXEMPT_SUPPLIES) {
    for (const item of category.items) {
      const itemLower = item.toLowerCase()
      // Check for exact word match or phrase match (case-insensitive)
      // Use word boundaries to avoid partial matches
      const itemWords = itemLower.split(/\s+/)
      // If single word, check if it's a complete word (not part of another word)
      if (itemWords.length === 1) {
        const word = itemWords[0]
        // Use regex to match word boundaries
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        if (regex.test(lowerDesc)) {
          return "exempt"
        }
      } else {
        // For multi-word phrases, check if the full phrase appears
        if (lowerDesc.includes(itemLower)) {
          return "exempt"
        }
      }
    }
  }
  
  // Check if zero-rated
  for (const item of VAT_ZERO_RATED_SUPPLIES) {
    const itemLower = item.toLowerCase()
    if (lowerDesc.includes(itemLower)) {
      return "zero-rated"
    }
  }
  
  // Default to taxable (most services like software, consulting, etc.)
  return "taxable"
}

/**
 * Calculate VAT for a single supply
 */
export function calculateSupplyVAT(
  amount: number,
  status: VATSupplyStatus,
  rate: number = VAT_RATE
): { baseAmount: number; vatAmount: number; totalAmount: number } {
  if (status === "exempt" || status === "zero-rated") {
    return {
      baseAmount: amount,
      vatAmount: 0,
      totalAmount: amount,
    }
  }
  
  // For taxable supplies
  const vatAmount = (amount * rate) / 100
  const totalAmount = amount + vatAmount
  
  return {
    baseAmount: amount,
    vatAmount,
    totalAmount,
  }
}

/**
 * Check if company is VAT-exempt (small company)
 */
export function isVATExempt(annualTurnover: number): boolean {
  return annualTurnover < VAT_EXEMPTION_THRESHOLD
}

