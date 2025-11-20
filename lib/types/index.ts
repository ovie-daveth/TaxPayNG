export type BusinessType = 'freelancer' | 'creator' | 'sme' | 'individual'

// Subscription Types
export type SubscriptionType = 'PRO' | 'GOLD' | 'PLATINUM' | 'Small Business' | 'Big Business' | null

// User Profile Types
export interface UserProfile {
  id: string
  userId: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  address?: {
    street: string
    city: string
    state: string
    country: string
    postalCode: string
  }
  businessType: BusinessType
  taxId?: string
  businessDocuments?: {
    cac?: string
    taxCertificate?: string
    businessLicense?: string
  }
  role?: 'user' | 'admin' | 'editor' // User role - defaults to 'user'
  lastLogin?: string // Last login timestamp
  createdAt: string
  updatedAt: string
  preferences?: {
    currency: string
    notifications: boolean
    theme: 'light' | 'dark' | 'system'
  }
  // Subscription fields
  isSubscribe?: boolean
  subscriptionType?: SubscriptionType
  transactionCount?: number // Current month's transaction count
  transactionCountResetDate?: string // Date when transaction count was last reset
  storageLimit?: number // Storage limit in bytes (e.g., 500MB = 500 * 1024 * 1024)
  storageUsed?: number // Current storage used in bytes
}

// Transaction Types
export type TransactionType = 'income' | 'expense' | 'relief'

export interface Transaction {
  id: string
  userId: string
  type: TransactionType
  category: string
  amount: number
  description: string
  date: string
  paymentMethod: string
  taxDeductible: boolean
  notes?: string
  tags?: string[]
  attachments?: string[]
  receiptUrl?: string
  documentId?: string
  createdAt: string
  updatedAt: string
}

export interface TransactionFilters {
  type?: TransactionType
  category?: string
  paymentMethod?: string
  startDate?: string
  endDate?: string
  dateRange?: {
    start: string
    end: string
  }
  amountRange?: {
    min: number
    max: number
  }
  tags?: string[]
}

// Document Types
export interface Document {
  id: string
  userId: string
  name: string
  originalName: string
  type: 'receipt' | 'invoice' | 'proof' | 'other'
  fileType: 'pdf' | 'image' | 'document'
  mimeType: string
  size: number
  url: string
  thumbnailUrl?: string
  uploadedAt: string
  linkedTransaction?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface UploadDocumentData {
  file: File
  name: string
  type: 'receipt' | 'invoice' | 'proof' | 'other'
  date?: string
  linkedTransaction?: string
  notes?: string
  imageKitUrl?: string
}

export interface DocumentFilters {
  search?: string
  type?: 'receipt' | 'invoice' | 'proof' | 'other'
  fileType?: 'pdf' | 'image' | 'document'
  linkedTransaction?: boolean
  dateRange?: {
    start: string
    end: string
  }
}

// Reminder Types
export interface Reminder {
  id: string
  userId: string
  title: string
  description?: string
  type: 'tax_deadline' | 'payment_due' | 'document_submission' | 'other'
  dueDate: string
  priority: 'low' | 'medium' | 'high'
  isCompleted: boolean
  completedAt?: string
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    endDate?: string
  }
  createdAt: string
  updatedAt: string
}

// Tax Calculation Types
export interface TaxCalculation {
  id: string
  userId: string
  businessType: string
  period: 'monthly' | 'quarterly' | 'yearly'
  income: number
  rentPaid: number
  pensionContribution: number
  healthInsurance: number
  lifeInsurance: number
  charitableDonations: number
  businessExpenses: number
  dependents: number
  result: {
    grossIncome: number
    businessExpenses: number
    adjustedGrossIncome: number
    reliefs: {
      rentRelief: number
      pension: number
      healthInsurance: number
      lifeInsurance: number
      charitable: number
    }
    totalReliefs: number
    taxableIncome: number
    taxBrackets: Array<{
      amount: number
      rate: number
      tax: number
    }>
    totalTax: number
    monthlySetAside: number
    quarterlyPayments: Array<{
      quarter: string
      amount: number
    }>
    effectiveRate: string
  }
  createdAt: string
  updatedAt: string
}

// Tax Payment Types
export interface TaxPayment {
  id: string
  userId: string
  transactionId: string
  amount: number
  period: 'monthly' | 'quarterly' | 'yearly'
  taxDuration: string // e.g., "October 2024", "Jan-Mar 2024", "2024"
  paymentMethod: 'remitta' | 'interswitch' | 'paystack' | 'firs'
  status: 'pending' | 'completed' | 'failed'
  taxCalculation?: {
    businessType: string
    income: number
    rentPaid: number
    pensionContribution: number
    healthInsurance: number
    lifeInsurance: number
    charitableDonations: number
    businessExpenses: number
    dependents: number
    result: TaxCalculation['result']
  }
  receiptUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Invoice Types
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type InvoiceTemplateType = 'standard' | 'detailed' | 'minimal' | 'professional'

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  tax?: number // Tax percentage (e.g., 7.5 for 7.5%)
  amount: number // quantity * unitPrice * (1 + tax/100)
}

export interface InvoiceClient {
  id?: string // If saved client, use ID
  name: string
  email?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
  }
  taxId?: string
  businessName?: string // Customer's business name (if applicable)
}

export interface InvoiceSupplier {
  businessName?: string
  name: string // Contact person name (firstName + lastName from profile)
  email: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
  }
  taxId?: string // TIN from user profile
}

export interface Invoice {
  id: string
  userId: string
  invoiceNumber: string // Auto-generated (e.g., INV-2024-001)
  status: InvoiceStatus
  template: InvoiceTemplateType
  
  // Supplier/Business information (from user profile)
  supplier: InvoiceSupplier
  
  // Client information
  client: InvoiceClient
  
  // Invoice details
  issueDate: string
  dueDate: string
  currency: string
  
  // Items
  items: InvoiceItem[]
  
  // Totals
  subtotal: number
  taxAmount: number
  discount?: number
  total: number
  
  // Additional information
  notes?: string
  terms?: string
  paymentTerms?: string // e.g., "Net 30", "Due on receipt"
  paymentInstructions?: string // Payment instructions or payment link
  
  // Tracking
  sentAt?: string
  paidAt?: string
  paymentMethod?: string
  paymentReference?: string
  
  // Linked transaction (if invoice was paid and recorded)
  linkedTransactionId?: string
  
  // Attachments
  pdfUrl?: string
  
  createdAt: string
  updatedAt: string
}

export interface InvoiceFilters {
  status?: InvoiceStatus
  clientId?: string
  startDate?: string
  endDate?: string
  dateRange?: {
    start: string
    end: string
  }
  amountRange?: {
    min: number
    max: number
  }
  search?: string
}

export interface InvoiceTemplate {
  id: string
  name: string
  type: InvoiceTemplateType
  description: string
  preview?: string
  isDefault?: boolean
}

export interface SavedClient {
  id: string
  userId: string
  name: string
  email?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
  }
  taxId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}
