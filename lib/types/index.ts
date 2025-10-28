// User Profile Types
export interface UserProfile {
  id: string
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
  businessType: 'freelancer' | 'sme' | 'individual'
  taxId?: string
  createdAt: string
  updatedAt: string
  preferences?: {
    currency: string
    notifications: boolean
    theme: 'light' | 'dark' | 'system'
  }
}

// Transaction Types
export interface Transaction {
  id: string
  userId: string
  type: 'income' | 'expense'
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
  type?: 'income' | 'expense'
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
