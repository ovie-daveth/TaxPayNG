import type { CacRegistrationType } from "@/lib/types"

export type CacRegistrationSlug = "business-name" | "llc" | "trustees"

export const CAC_REGISTRATION_TYPES: Array<{
  type: CacRegistrationType
  slug: CacRegistrationSlug
  title: string
  shortDescription: string
  priceFromNaira: number
}> = [
  {
    type: "BUSINESS_NAME",
    slug: "business-name",
    title: "Business Name",
    shortDescription: "Register a Business Name with CAC (includes TIN).",
    priceFromNaira: 40_000,
  },
  {
    type: "LLC",
    slug: "llc",
    title: "Limited Liability Company (LLC)",
    shortDescription: "Incorporate a Limited Liability Company with CAC.",
    priceFromNaira: 60_000,
  },
  {
    type: "INCORPORATED_TRUSTEES",
    slug: "trustees",
    title: "Incorporated Trustees",
    shortDescription: "Register NGOs, churches, mosques, clubs, foundations, associations.",
    priceFromNaira: 150_000,
  },
]

export const CAC_FEES_NAIRA = {
  BUSINESS_NAME: 40_000,
  INCORPORATED_TRUSTEES: 150_000,
  LLC_SHARE_CAPITAL: {
    UP_TO_1M: 60_000,
    UP_TO_5M: 250_000,
    UP_TO_10M: 500_000,
    UP_TO_100M: 4_000_000,
  },
} as const

export type LlcShareCapitalBand = keyof typeof CAC_FEES_NAIRA.LLC_SHARE_CAPITAL

export const CAC_EXPLANATIONS: Record<
  CacRegistrationType,
  {
    whatItIs: string
    requirements: string[]
    documents: string[]
    pricingNote?: string
  }
> = {
  BUSINESS_NAME: {
    whatItIs:
      "A Business Name is a simple business registration suitable for sole proprietors (and small partnerships) who want to operate under a registered name.",
    requirements: [
      "Proposed business name",
      "Business address (including Local Government Area)",
      "Nature of business / objectives (brief description)",
      "Proprietor’s full name (as on official ID)",
      "Proprietor’s residential address (including LGA)",
      "Date of birth",
      "Phone number",
      "Valid email address",
    ],
    documents: ["NIN slip", "Clear photograph of proprietor’s signature", "Recent passport-size photograph"],
    pricingNote: "₦40,000 (inclusive of TIN).",
  },
  LLC: {
    whatItIs:
      "An LLC is a registered company structure that offers limited liability and is suitable for scalable businesses, startups, and companies with multiple owners.",
    requirements: [
      "Two proposed company names (preferred)",
      "Official email address (we can help create one if needed)",
      "Phone number",
      "Company address (including LGA)",
      "Business objectives / nature of business",
      "Witness details (full name, phone, email, occupation, address + LGA)",
      "Director(s) details (18+): name, phone, email, occupation, address + LGA, DOB",
      "Shareholder(s) details and shares allotted per shareholder",
    ],
    documents: ["NIN slips for witness + all directors + all shareholders", "Clear photographs of signatures of directors + shareholders"],
    pricingNote:
      "Fees depend on share capital band. Regulated/specific objectives (e.g., banking, travel, shipping) may require higher minimum share capital.",
  },
  INCORPORATED_TRUSTEES: {
    whatItIs:
      "Incorporated Trustees is a registration category for NGOs, foundations, churches, mosques, clubs, associations, and similar bodies.",
    requirements: [
      "Proposed names of the Association / Club / Church / NGO",
      "Official email address (we can help create one if needed)",
      "Registered address (including LGA)",
      "Aims and objectives",
      "Trustees (minimum 2): name, DOB, phone, email, occupation, residential address + LGA",
      "Executive members (e.g., Chairman, Secretary) selected from trustees",
    ],
    documents: ["Means of identification (NIN slips) for trustees", "Clear photographs of signatures of trustees", "Passport-size photograph (if applicable)"],
    pricingNote: "₦150,000.",
  },
}

export function getCacTypeBySlug(slug: string): CacRegistrationType | null {
  const found = CAC_REGISTRATION_TYPES.find((x) => x.slug === slug)
  return found?.type ?? null
}

export function formatNaira(amount: number): string {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `₦${Math.round(amount).toLocaleString()}`
  }
}


