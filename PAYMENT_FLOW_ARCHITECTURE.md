# Payment Portal Selection - Data Flow & Architecture

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Payment Add Page                              │
│                 /dashboard/payment/add                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    User fills payment form
                             │
                             ▼
                ┌────────────────────────┐
                │  System Checks Pass?   │
                └────────────┬───────────┘
                             │
                             ▼
                 "Proceed to Pay" Button Enabled
                             │
                    User clicks button
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  PaymentPortalSelectorModal            │
        │  - Shows NRC option                    │
        │  - Shows State IRS option (if avail.)  │
        │  - User selects preference             │
        └────────┬──────────────────────┬────────┘
                 │                      │
         NRC Selected        State IRS Selected
                 │                      │
                 ▼                      ▼
        ┌─────────────────┐   ┌──────────────────────┐
        │ NRS Pay Modal   │   │ Open State Portal    │
        │ (iframe)        │   │ in new tab           │
        │                 │   │                      │
        │ User pays on    │   │ User pays on state   │
        │ NRS portal      │   │ IRS portal           │
        └────────┬────────┘   └──────────┬───────────┘
                 │                       │
                 └───────────┬───────────┘
                             │
                             ▼
        ┌──────────────────────────────────────┐
        │  Receipt Upload Modal                 │
        │  - User uploads payment receipt       │
        │  - Receipt validated                  │
        │  - Receipt uploaded to ImageKit       │
        │  - Payment recorded in Firestore      │
        └──────────────┬───────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │  Payment Recorded Successfully        │
        │  - Transaction saved                  │
        │  - Receipt linked                     │
        │  - User redirected to payment list    │
        └──────────────────────────────────────┘
```

## State Management Flow

```
Component: PaymentAddPage
├── State
│   ├── showPortalSelector: boolean
│   ├── showNrsPayModal: boolean
│   ├── showReceiptUploadModal: boolean
│   ├── paymentFormData: PaymentFormData
│   ├── receiptFile: File | null
│   └── uploadingReceipt: boolean
│
├── Handlers
│   ├── handleProceedToPay()
│   │   └─► setShowPortalSelector(true)
│   │
│   ├── handleSelectNRC()
│   │   ├─► setShowPortalSelector(false)
│   │   └─► setShowNrsPayModal(true)
│   │
│   ├── handleSelectStateIRS(irsUrl)
│   │   ├─► setShowPortalSelector(false)
│   │   ├─► window.open(irsUrl, "_blank")
│   │   └─► setTimeout(() => setShowReceiptUploadModal(true))
│   │
│   └── uploadReceiptAndRecordNrsPayment()
│       ├─► uploadToImageKit()
│       ├─► documentService.uploadDocument()
│       ├─► taxPaymentService.createPayment()
│       └─► router.push(`${basePath}/payment`)
│
└── Components Rendered
    ├── <PaymentPortalSelectorModal />
    ├── <Dialog open={showNrsPayModal} /> (NRS Payment)
    ├── <Dialog open={showReceiptUploadModal} /> (Receipt Upload)
    └── <PaymentReceipt /> (Receipt Display)
```

## Data Flow for NRC Path

```
User selects NRC
    ↓
handleSelectNRC() called
    ↓
setShowPortalSelector(false)
setShowNrsPayModal(true)
    ↓
NRS Modal opens with iframe
paymentFormData available for display
    ↓
User completes payment on NRS
    ↓
User clicks "Payment made" button
    ↓
openReceiptUploadForNrsPayment() called
    ↓
setShowNrsPayModal(false)
setShowReceiptUploadModal(true)
    ↓
Receipt Upload Modal appears
    ↓
User selects and uploads receipt file
    ↓
uploadReceiptAndRecordNrsPayment() called
    ├─► Check for duplicate payment
    ├─► uploadToImageKit(receiptFile)
    ├─► documentService.uploadDocument()
    │   {
    │     file: receiptFile
    │     name: `Payment Receipt - ${paymentFormData.taxDuration}`
    │     type: "receipt"
    │     imageKitUrl: uploadResult.url
    │     imageKitFileId: uploadResult.fileId
    │   }
    ├─► taxPaymentService.createPayment()
    │   {
    │     transactionId: "NRS-{timestamp}"
    │     amount: paymentFormData.amount
    │     period: paymentFormData.period
    │     taxDuration: paymentFormData.taxDuration
    │     paymentMethod: "firs"
    │     status: "completed"
    │     receiptUrl: docRes.data.url
    │   }
    └─► router.push(`${basePath}/payment`)
    ↓
User redirected to payment list
```

## Data Flow for State IRS Path

```
User selects State IRS
    ↓
handleSelectStateIRS(statePortalUrl) called
    ↓
setShowPortalSelector(false)
    ↓
window.open(statePortalUrl, "_blank")
State portal opens in new tab/window
    ↓
setTimeout(..., 500ms)
    ├─► setShowReceiptUploadModal(true)
    ↓
Receipt Upload Modal appears
(User can see modal while completing payment in other tab)
    ↓
User completes payment on state portal
User returns to OTax window
    ↓
User selects and uploads receipt file
    ↓
uploadReceiptAndRecordNrsPayment() called
(Same as NRC path from here)
    ├─► Check for duplicate payment
    ├─► uploadToImageKit(receiptFile)
    ├─► documentService.uploadDocument()
    ├─► taxPaymentService.createPayment()
    │   {
    │     paymentMethod: "firs" (or could be "state-irs")
    │     notes: "Manual confirmation: Paid on State IRS portal"
    │   }
    └─► router.push(`${basePath}/payment`)
    ↓
User redirected to payment list
```

## Data Structures

### PaymentPortalSelectorModal Props
```typescript
interface PaymentPortalSelectorModalProps {
  open: boolean                              // Modal visibility
  onOpenChange: (open: boolean) => void     // Close handler
  userState?: string                         // e.g., "Lagos"
  onSelectNRC: () => void                   // NRC selected
  onSelectStateIRS: (url: string) => void   // State IRS selected
}
```

### State IRS Portals Data
```typescript
const STATE_IRS_PORTALS: Record<string, string> = {
  "Abia": "https://abia.tax/",
  "Adamawa": "https://ad-irs.adamawastate.gov.ng/",
  // ... 34 more states
}
```

### Payment Form Data
```typescript
interface PaymentFormData {
  period: 'monthly' | 'quarterly' | 'yearly'
  amount: number
  taxDuration: string                       // e.g., "January 2024"
  calculatedAmount?: number
  pendingPeriods?: Array<{
    period: string
    amount: number
    taxDuration: string
  }>
  isManual: boolean
}
```

### Receipt File Metadata
```typescript
{
  name: `Payment Receipt - ${paymentFormData.taxDuration}`
  type: "receipt"
  imageKitUrl: string                       // From ImageKit upload
  imageKitFileId: string                    // For future reference
  fileSize: number
  linkedTransaction: string                 // Reference to payment
  notes: string                             // Payment method notes
}
```

### Payment Record in Firestore
```typescript
{
  transactionId: "NRS-{timestamp}"
  amount: number
  period: 'monthly' | 'quarterly' | 'yearly'
  taxDuration: string                       // e.g., "January 2024"
  paymentMethod: "firs" | "state-irs"
  status: "completed"
  receiptUrl: string                        // Link to uploaded receipt
  notes: string                             // Payment method info
  createdAt: timestamp                      // Auto-set by service
  linkedDocuments: [documentId]             // Receipt document
}
```

## User Profile Requirements

### Minimum Profile Data
```typescript
{
  address?: {
    state: string                           // Must match STATE_IRS_PORTALS keys
  }
}
```

### State Names Supported
```
Abia, Adamawa, Anambra, Akwa Ibom, Bauchi, Bayelsa, Benue, Borno,
Cross River, Delta, Ebonyi, Edo, Enugu, Ekiti, FCT, Gombe, Imo,
Jigawa, Kaduna, Kano, Kastina, Kebbi, Kogi, Kwara, Lagos, Nasarawa,
Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Yobe, Zamfara
```

## API Calls Made

### 1. Document Upload
```javascript
await documentService.uploadDocument(user.uid, {
  file: receiptFile,
  name: string,
  type: "receipt",
  imageKitUrl: string,
  imageKitFileId: string,
  fileSize: number,
  linkedTransaction: string,
  notes: string
})
```

### 2. Payment Recording
```javascript
await taxPaymentService.createPayment(user.uid, {
  transactionId: string,
  amount: number,
  period: 'monthly' | 'quarterly' | 'yearly',
  taxDuration: string,
  paymentMethod: "firs",
  status: "completed",
  receiptUrl: string,
  notes?: string
})
```

### 3. Duplicate Check
```javascript
const payments = await taxPaymentService.getUserPaymentsSimple(user.uid)
const isDuplicate = payments.some(p => 
  p.period === period && 
  p.taxDuration === taxDuration &&
  p.status === 'completed'
)
```

### 4. ImageKit Upload
```javascript
const uploadResult = await uploadToImageKit(
  receiptFile,
  "payment-receipts",
  user.uid
)
// Returns: { url, fileId, size }
```

## Error Handling

### Validation Errors
```
// Missing user
toast.error("Not signed in")

// Missing payment data
toast.error("Payment details not found")

// Missing receipt file
toast.error("Please upload your payment receipt")

// Duplicate payment
toast.message("This payment already exists")
```

### Upload Errors
```
// Document save failed
toast.error("Failed to save receipt document")

// Payment record failed
toast.error("Failed to record payment")

// General upload error
toast.error("Failed to upload receipt / record payment")
```

## Success Flow

```
User uploads receipt
    ↓
✓ Duplicate check passed
    ↓
✓ Receipt uploaded to ImageKit
    ↓
✓ Document saved to Firestore
    ↓
✓ Payment record created
    ↓
✓ localStorage cleared
    ↓
Modal closes
    ↓
toast.success("Payment recorded")
    ↓
router.push(`${basePath}/payment`)
    ↓
User sees payment in payment list
```

## Integration Points Summary

| Component | Purpose | Dependencies |
|-----------|---------|--------------|
| PaymentPortalSelectorModal | Portal selection UI | Dialog, RadioGroup, Button |
| PaymentAddPage | Payment flow orchestration | Modal, NRS Modal, Receipt Upload Modal |
| imagekit upload util | File upload service | ImageKit API |
| documentService | Document storage | Firestore |
| taxPaymentService | Payment recording | Firestore |

## Key Decisions

1. **Modal over Page Navigation**: User can quickly switch portals without page reload
2. **New Tab for State Portal**: Keeps receipt upload modal visible while user is on portal
3. **Receipt Required**: Ensures payment is properly documented in OTax
4. **Hardcoded URLs**: Prevents typos and ensures accuracy
5. **Duplicate Check**: Prevents double-recording of same payment
