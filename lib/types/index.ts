export type BusinessType = 'freelancer' | 'creator' | 'sme'  | 'agent'

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
  kycDocuments?: {
    id?: string // National ID, Voter's Card, etc.
    passport?: string
    driverLicense?: string
  }
  role?: 'user' | 'admin' | 'editor' // User role - defaults to 'user'
  lastLogin?: string // Last login timestamp
  createdAt: string
  updatedAt: string
  preferences?: {
    currency: string
    notifications: boolean // Legacy field - kept for backward compatibility
    theme: 'light' | 'dark' | 'system'
    emailNotifications?: boolean // Email notifications for reminders
    smsNotifications?: boolean // SMS notifications for reminders
  }
  // Subscription fields
  isSubscribe?: boolean
  subscriptionType?: SubscriptionType
  subscriptionExpiryDate?: string // ISO string - when subscription expires (31 days from payment)
  subscriptionStartDate?: string // ISO string - when user first subscribed (for tracking loyal customers)
  lastSubscriptionDate?: string // ISO string - when user last renewed subscription
  renewalCount?: number // Number of times user has renewed (for tracking loyal customers)
  transactionCount?: number // Current month's transaction count
  transactionCountResetDate?: string // Date when transaction count was last reset
  storageLimit?: number // Storage limit in bytes (e.g., 500MB = 500 * 1024 * 1024)
  storageUsed?: number // Current storage used in bytes
  // Agent-specific fields
  agentStates?: string[] // States the agent can handle
  agentCertification?: string // URL to certification document
  agentKycCompleted?: boolean // Whether agent has completed KYC
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
  fileSize?: number // Optional: size from ImageKit upload result (in bytes)
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
  emailSent?: boolean // Whether reminder email has been sent
  emailSentAt?: string // Timestamp when email was sent
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
  rrr?: string // Remita Retrieval Reference
  transactionRef?: string // Payment transaction reference
  paymentDate?: string // Date when payment was completed
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
export type InvoiceType = 'outgoing' | 'incoming' // outgoing = sales invoice (client owes you), incoming = purchase invoice/bill (you owe supplier)

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  currency?: string // Currency code for this item (if different from invoice currency)
  vatable?: boolean // Whether this item is subject to VAT (default: false)
  amount: number // quantity * unitPrice (converted to invoice currency if needed)
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
  vatRegistrationNumber?: string // VAT registration number for VAT-registered businesses
}

export interface Invoice {
  id: string
  userId: string // Owner of the invoice (who created it)
  invoiceNumber: string // Auto-generated (e.g., INV-2024-001)
  invoiceType: InvoiceType // 'outgoing' = you send to clients, 'incoming' = received from another OTax user
  status: InvoiceStatus
  template: InvoiceTemplateType
  
  // Supplier/Business information (from user profile for outgoing, or supplier info for incoming)
  supplier: InvoiceSupplier
  
  // Client information (for outgoing) or Your information (for incoming from OTax user)
  client: InvoiceClient
  
  // For invoices sent to/received from other OTax users
  recipientUserId?: string // OTax user ID who received this invoice (if sent to another OTax user)
  senderUserId?: string // OTax user ID who sent this invoice (if received from another OTax user)
  senderInvoiceNumber?: string // Original invoice number from sender (for duplicate detection)
  recipientEmail?: string // Email of recipient (if not an OTax user)
  sentAt?: string // When invoice was sent
  receivedAt?: string // When invoice was received (for incoming)
  
  // Invoice details
  issueDate: string
  dueDate: string
  currency: string
  
  // Items
  items: InvoiceItem[]
  
  // Totals
  subtotal: number
  
  // VAT (Value Added Tax) - 7.5% in Nigeria
  vatRate?: number // Default: 7.5%
  vatAmount: number // Calculated: subtotal * vatRate / 100
  
  // Legacy tax field (deprecated - use vatAmount)
  taxAmount: number // Kept for backward compatibility, should equal vatAmount
  
  discount?: number
  
  // Invoice Total (Subtotal + VAT)
  invoiceTotal: number // Subtotal + VAT - Discount
  
  // Withholding Tax (WHT) - deducted by client/buyer, not issuer
  // These fields are set by the client when they deduct WHT
  whtDeducted?: boolean // Whether client has deducted WHT
  whtRate?: number // WHT rate applied by client (e.g., 5% or 10%)
  whtAmount?: number // WHT amount deducted by client: invoiceTotal * whtRate / 100
  whtDeductionDate?: string // Date WHT was deducted by client
  whtDeductedBy?: string // User ID of client who deducted WHT
  whtCertificateNumber?: string // WHT certificate/reference number provided by client
  
  // Final Amount Payable (Invoice Total - WHT if deducted)
  total: number // invoiceTotal - (whtAmount || 0)
  
  // Additional information
  notes?: string
  terms?: string
  paymentTerms?: string // e.g., "Net 30", "Due on receipt"
  paymentInstructions?: string // Payment instructions or payment link
  
  // Payment tracking - separate statuses for client and supplier
  // Client payment status - updated by client when they pay
  clientPaymentStatus?: 'pending' | 'paid' // Client marks as paid (default: 'pending')
  clientPaidAt?: string // When client marked as paid
  clientPaymentMethod?: string // Payment method used by client
  clientPaymentReference?: string // Payment reference from client
  clientReceiptUrl?: string // Receipt uploaded by client
  
  // Supplier payment status - updated by supplier when they confirm payment received
  supplierPaymentStatus?: 'pending' | 'paid' // Supplier confirms payment received (default: 'pending')
  supplierPaidAt?: string // When supplier confirmed payment
  supplierPaymentMethod?: string // Payment method confirmed by supplier
  supplierPaymentReference?: string // Payment reference confirmed by supplier
  
  // Linked transaction (if invoice was paid and recorded)
  linkedTransactionId?: string
  
  // WHT Credit Note (created when client deducts WHT)
  whtCreditNote?: WHTCreditNote
  
  // Attachments
  pdfUrl?: string
  
  createdAt: string
  updatedAt: string
}

// WHT Credit Note - issued when client/buyer deducts withholding tax
export interface WHTCreditNote {
  id: string // Unique credit note ID
  invoiceId: string // Reference to the invoice
  creditNoteNumber: string // Auto-generated (e.g., CN-2025-001)
  issuedDate: string // Date credit note was created
  issuedBy: string // User ID of client who deducted WHT
  invoiceNumber: string // Original invoice number
  invoiceTotal: number // Invoice total before WHT deduction
  whtRate: number // WHT rate applied (e.g., 5%)
  whtAmount: number // WHT amount deducted
  netAmountPaid: number // Amount actually paid (invoiceTotal - whtAmount)
  certificateNumber?: string // WHT certificate/reference number
  notes?: string // Additional notes
  createdAt: string
  updatedAt: string
}

export interface InvoiceFilters {
  status?: InvoiceStatus
  invoiceType?: InvoiceType
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

// Report Types
export type ReportType = 'Self-Assessment' | 'Income Statement' | 'Expense Report' | 'Tax Summary'
export type ReportStatus = 'draft' | 'completed' | 'submitted'
export type FilingStatus = 'not_filed' | 'filed' | 'submitted' | 'acknowledged'
export type FilingMethod = 'direct' | 'agent' | 'email' | null

export interface SavedReport {
  id: string
  userId: string
  title: string
  type: ReportType
  reportData: any // ReportData from reportService
  period: {
    startDate: string
    endDate: string
    year: number
    quarter?: number
    periodType: 'annual' | 'quarterly' | 'monthly' | 'custom'
  }
  status: ReportStatus
  generatedAt: string
  createdAt: string
  updatedAt: string
  rrr?: string // Remita Retrieval Reference
  paymentStatus?: 'unpaid' | 'paid' // Payment status
  transactionRef?: string // Payment transaction reference
  paymentDate?: string // Date when payment was made
  // Filing fields
  filingStatus?: FilingStatus // Status of filing
  filingMethod?: FilingMethod // Method used to file (direct/agent/email)
  filingDate?: string // Date when return was filed
  acknowledgmentNumber?: string // IRS acknowledgment number
  ticketId?: string // Filing agent ticket ID
  balanceDue?: number // Balance due after reconciliation (positive = owe, negative = credit, 0 = balanced)
  taxesAlreadyPaid?: number // Total taxes already paid during the year
  completedDocumentUrl?: string // URL of the completed/stamped document from agent filing
  completedDocumentName?: string // Name of the completed document
  completedDocumentId?: string // Document ID of the completed document
}

// Filing Request Types
export type FilingRequestStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'

export interface FilingRequest {
  id: string
  userId: string
  reportId: string
  state: string
  rrr: string
  status: FilingRequestStatus
  supportingDocuments: string[] // Array of document IDs or URLs
  assignedAgentId?: string
  assignedAgentName?: string
  assignedAt?: string
  completedAt?: string
  completedDocumentUrl?: string // URL of the completed/stamped document uploaded by agent
  completedDocumentName?: string // Name of the completed document
  completedDocumentId?: string // Document ID in the documents collection
  notes?: string
  createdAt: string
  updatedAt: string
}
