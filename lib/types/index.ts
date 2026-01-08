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
  /**
   * Multi-Entity Business Management (PLATINUM):
   * The currently active business entity context for this user.
   */
  activeEntityId?: string
  /**
   * The default/initial entity created for this user (used for one-time migrations).
   */
  defaultEntityId?: string
  /**
   * Multi-Entity migration flag/version. Increment when changing migration logic.
   */
  entityMigrationVersion?: number
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
  // Creator-specific fields
  platformConnections?: PlatformConnection[] // Saved platform connections for creators
}

// Business Entity (Multi-Entity Business Management)
export interface BusinessEntity {
  id: string
  userId: string
  name: string
  /**
   * Optional notes/description shown in UI.
   */
  description?: string
  /**
   * If set, used as default currency for this business context.
   */
  currency?: string
  /**
   * Helps with UX; does not change access rules.
   */
  isDefault?: boolean
  createdAt: string
  updatedAt: string
}

// Platform connection for creators
export interface PlatformConnection {
  id: string // Unique ID for this connection
  name: string // Platform name (e.g., "YouTube", "TikTok", "Instagram")
  platformType: 'social' | 'subscription' | 'marketplace' | 'streaming' | 'other'
  accountId?: string // Creator's account ID/username on the platform
  accountUrl?: string // URL to creator's profile/page on platform
  createdAt: string
  updatedAt: string
}

// Transaction Types
export type TransactionType = 'income' | 'expense' | 'relief' | 'transfer' | 'adjustment'

// Transaction Nature - for personal vs business separation
export type TransactionNature = 'business' | 'personal' | 'mixed'

// Tax Classification - comprehensive tax tagging
export interface TaxClassification {
  // For income transactions
  incomeType?: 'taxable' | 'non-taxable' | 'exempt'
  
  // For expense transactions
  expenseType?: 'allowable' | 'disallowable' | 'capital'
  
  // Capital asset tracking (for capital allowances)
  isCapitalAsset?: boolean
  capitalAllowanceRate?: number // e.g., 25% for annual allowance
  initialAllowanceRate?: number // optional initial allowance rate for first year (tax version of depreciation)
  capitalAssetType?: 'it_equipment' | 'motor_vehicle' | 'plant_machinery' | 'furniture_fittings' | 'building' | 'intangible_software'
  assetId?: string // Link to asset record if this transaction created/improved an asset
  
  // VAT handling (comprehensive for SMEs)
  vatApplicable?: boolean
  vatRate?: number // Default 7.5% for Nigeria
  vatAmount?: number // Calculated VAT amount
  vatType?: 'output' | 'input' // Output VAT for sales, Input VAT for purchases
  vatExemptionReason?: string // Reason if VAT = 0 (exempt, zero-rated, etc.)
  
  // Withholding Tax (WHT) credits (comprehensive for SMEs)
  whtCreditable?: boolean
  whtRate?: number // 5%, 10%, 2.5%, 2%, etc.
  whtAmount?: number // Calculated WHT amount
  whtCategory?: 'rent' | 'professional_service' | 'contract' | 'interest' | 'dividends' | 'royalties' | 'commissions' | 'directors_fees' | 'construction' | 'goods_supply' | 'other'
  whtCreditClaimable?: boolean // Whether WHT credit can be claimed for CIT offset
  whtCreditNoteUrl?: string // URL to uploaded WHT credit note (proof of WHT deduction for income transactions)
  whtCreditNoteFileId?: string // ImageKit fileId for WHT credit note
  
  // Related tax head
  relatedTaxHead?: 'CIT' | 'VAT' | 'PAYE' | 'WHT' | 'EDT' | 'none'
  
  // SME-specific intelligence
  vatEligibilityStatus?: 'eligible' | 'exempt' | 'below_threshold' // Auto-locked if turnover < ₦100m
  citImpact?: boolean // Does this affect profit for CIT?
  isOperatingExpense?: boolean // Operating vs capital expense
}

// Tax Period - for time-based tax calculations
export interface TaxPeriod {
  year: number
  quarter?: number // 1-4
  month?: number // 1-12
}

export interface Transaction {
  id: string
  userId: string
  /**
   * Multi-Entity Business Management:
   * All transactions belong to a business entity.
   */
  entityId?: string
  type: TransactionType
  category: string
  amount: number
  description: string
  date: string // Legacy field - kept for backward compatibility
  
  // Phase 1: Date separation for tax compliance
  transactionDate?: string // When transaction occurred (invoice date, service date)
  valueDate?: string // When money actually moved (payment date, receipt date)
  taxPeriod?: TaxPeriod // Calculated tax period (year, quarter, month)
  
  // Phase 1: Personal vs Business separation
  transactionNature?: TransactionNature // 'business' | 'personal' | 'mixed'
  businessPercentage?: number // For mixed transactions (0-100)
  
  // Phase 1: Locked exchange rates
  currency?: string // Original currency code (e.g., 'USD', 'NGN')
  exchangeRate?: number // Exchange rate used at transaction date (locked)
  exchangeRateDate?: string // Date when exchange rate was locked
  ngnEquivalent?: number // Locked NGN equivalent amount
  
  paymentMethod: string
  taxDeductible: boolean // Legacy field - kept for backward compatibility
  
  // Phase 1: Comprehensive tax classification
  taxClassification?: TaxClassification
  
  // Invoice linking - bidirectional connection
  linkedInvoiceId?: string // Reference to the invoice that created this transaction
  invoiceStatus?: 'pending' | 'completed' // Status if transaction is from an invoice
  isFromInvoice?: boolean // Quick flag to identify invoice-generated transactions
  
  // Phase 2: Platform fees tracking (for income transactions)
  grossAmount?: number // Gross amount before platform fees
  platformFees?: number // Platform commission/fees deducted
  netAmount?: number // Net amount after platform fees (grossAmount - platformFees)
  
  // Phase 2: Platform-specific tracking
  platform?: {
    name: string // "YouTube", "TikTok", "Instagram", "Patreon", "OnlyFans", etc.
    platformType: 'social' | 'subscription' | 'marketplace' | 'streaming' | 'other'
    accountId?: string // Creator's account ID/username on the platform
    accountUrl?: string // URL to creator's profile/page on platform
  }
  
  notes?: string
  tags?: string[]
  attachments?: string[] // Array of attachment URLs
  attachmentFileIds?: string[] // Array of ImageKit fileIds corresponding to attachments (same order)
  receiptUrl?: string
  documentId?: string
  
  // SME-specific fields
  transactionId?: string // System-generated transaction ID (immutable)
  postingDate?: string // When transaction was recorded (defaults to transactionDate if not set)
  
  // Supplier/Customer information (for compliance)
  supplierName?: string
  supplierTin?: string // Supplier TIN or RC number
  customerName?: string
  customerTin?: string // Customer TIN or RC number
  
  // Document type classification
  documentType?: 'invoice' | 'receipt' | 'contract' | 'bank_alert' | 'other'
  
  // Payment status and settlement
  paymentStatus?: 'unpaid' | 'paid' | 'part_paid'
  paymentDate?: string
  referenceNumber?: string // Bank ref, RRR, gateway ref, etc.
  
  // Source tracking
  source?: 'manual_entry' | 'invoice' | 'bank_sync' | 'whatsapp_bot' | 'api'
  createdBy?: string // User ID or 'agent' if created by agent
  
  createdAt: string
  updatedAt: string
}

export interface TransactionFilters {
  entityId?: string
  type?: TransactionType
  category?: string
  paymentMethod?: string
  platform?: string // Platform name filter (for creators)
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
  search?: string // Search term to filter by description, category, notes, tags
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
  imageKitFileId?: string // ImageKit file ID for deletion
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
  imageKitFileId?: string // ImageKit file ID for deletion
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
  // Platform fees breakdown (for creator income items)
  grossAmount?: number // Gross amount before platform fees
  platformFees?: number // Platform commission/fees deducted
  netAmount?: number // Net amount after platform fees (grossAmount - platformFees)
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
  /**
   * Multi-Entity Business Management:
   * All invoices belong to a business entity.
   */
  entityId?: string
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
  recipientEntityId?: string // Business entity ID assigned by recipient (for organizing received invoices)
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
  
  // Phase 2: Platform-specific tracking (for creators - especially for income invoices)
  platform?: {
    name: string // "YouTube", "TikTok", "Instagram", "Patreon", "OnlyFans", etc.
    platformType: 'social' | 'subscription' | 'marketplace' | 'streaming' | 'other'
    accountId?: string // Creator's account ID/username on the platform
    accountUrl?: string // URL to creator's profile/page on platform
  }
  
  // Phase 2: Platform fees breakdown (for creator income invoices)
  grossAmount?: number // Gross amount before platform fees
  platformFees?: number // Platform commission/fees deducted
  netAmount?: number // Net amount after platform fees (grossAmount - platformFees)
  
  // Phase 2: Transaction nature (for creators - business/personal/mixed)
  transactionNature?: TransactionNature // 'business' | 'personal' | 'mixed'
  businessPercentage?: number // For mixed transactions (0-100)
  
  // Phase 2: Tax period tracking
  taxPeriod?: TaxPeriod // Calculated tax period (year, quarter, month)
  
  // Phase 2: Exchange rate locking (for foreign currency invoices)
  exchangeRate?: number // Exchange rate used at invoice date (locked)
  exchangeRateDate?: string // Date when exchange rate was locked
  ngnEquivalent?: number // Locked NGN equivalent amount
  
  // Phase 2: Payment method tracking
  paymentMethod?: string // Expected or actual payment method
  
  // Phase 2: Tags for organization
  tags?: string[] // Tags for categorizing and searching invoices
  
  // Phase 2: Additional attachments (beyond PDF)
  attachments?: string[] // Array of attachment URLs
  attachmentFileIds?: string[] // Array of ImageKit fileIds corresponding to attachments
  
  // Phase 2: Value date (when payment is actually received/made)
  valueDate?: string // When money actually moved (payment date, receipt date)
  
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
  entityId?: string
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

  /**
   * Manual filing evidence (for NRS / external portals):
   * Stored on the report for easy retrieval when viewing filed assessments.
   */
  filingEvidence?: {
    paymentReceipt?: { documentId: string; name: string; url: string; uploadedAt: string }
    filingProof?: { documentId: string; name: string; url: string; uploadedAt: string }
    additional?: Array<{ documentId: string; name: string; url: string; uploadedAt: string }>
  }
}

// Filing Request Types
export type FilingRequestStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'

// Brand Deal Types
export type BrandDealStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type BrandDealType = 'sponsorship' | 'collaboration' | 'endorsement' | 'affiliate' | 'other'

export interface BrandDeal {
  id: string
  userId: string
  /**
   * Multi-Entity Business Management:
   * All brand deals belong to a business entity.
   */
  entityId?: string
  brandName: string
  brandContact?: {
    name?: string
    email?: string
    phone?: string
    company?: string
  }
  dealType: BrandDealType
  status: BrandDealStatus
  title: string
  description?: string
  
  // Financial details
  amount: number
  currency: string
  exchangeRate?: number // Exchange rate used to convert to NGN (locked at deal creation)
  ngnEquivalent?: number // NGN equivalent amount (locked at deal creation)
  paymentTerms?: string // e.g., "Net 30", "50% upfront, 50% on completion"
  paymentSchedule?: {
    type: 'single' | 'milestone' | 'recurring'
    milestones?: Array<{
      label: string
      amount: number
      dueDate: string
      paid: boolean
      paidDate?: string
    }>
  }
  
  // Dates
  startDate: string
  endDate?: string
  deliveryDate?: string // When content needs to be delivered
  paymentDate?: string // When payment was received
  
  // Content/Service details
  deliverables?: string[] // List of deliverables (e.g., "3 Instagram posts", "1 YouTube video")
  contentRequirements?: string // Requirements or guidelines for content
  platform?: string[] // Platforms where content will be published (e.g., ["Instagram", "YouTube"])
  
  // Contract & documents
  contractUrl?: string // Link to contract document
  contractSigned?: boolean
  contractSignedDate?: string
  
  // Linked transaction (if deal payment was recorded as income)
  linkedTransactionId?: string
  
  // Additional information
  notes?: string
  tags?: string[]
  
  // Tracking
  createdAt: string
  updatedAt: string
}

export interface BrandDealFilters {
  entityId?: string
  status?: BrandDealStatus
  dealType?: BrandDealType
  brandName?: string
  startDate?: string
  endDate?: string
}

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
