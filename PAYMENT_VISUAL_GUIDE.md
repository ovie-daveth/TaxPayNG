# Payment Portal Selection - Quick Visual Guide

## 🎯 Feature Overview

Users now choose their payment portal before proceeding with tax payment:

```
                    Payment Flow
                         │
        ┌────────────────┴────────────────┐
        │                                 │
    Fill Form                        System Checks
        │                                 │
        └────────────────┬────────────────┘
                         │
                  "Proceed to Pay"
                         │
                 ▼▼▼ MODAL APPEARS ▼▼▼
        ┌──────────────────────────────┐
        │  Choose Payment Portal        │
        ├──────────────────────────────┤
        │  ○ NRC                        │
        │  ○ Lagos State IRS            │
        │   [Cancel] [Continue]         │
        └──────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
      NRC Path                      State IRS Path
        │                                 │
   NRC Modal ◄──────┐            ┌──► State Portal
   (iframe)         │            │     (new tab)
        │           │            │        │
   Pay on NRC       │            │   Pay on State
        │           │            │        │
        └──────────┬┘            └───┬───┘
                   │                 │
            Receipt Upload Modal
                   │
              Upload receipt
                   │
           Record in OTax
                   │
          Redirect to Payment List
```

## 📱 Modal Screenshots

### Option 1: NRC Selected (Default)
```
┌────────────────────────────────────────┐
│         Choose Payment Portal           │
├────────────────────────────────────────┤
│                                         │
│ ◉ 🏢 National Revenue Center (NRC)    │
│   Pay through the centralized portal   │
│   selfservice.nrs.gov.ng               │
│                                         │
│ ○ 📍 Lagos State IRS                   │
│   Pay directly through your state      │
│   etax.lirs.net/login/                 │
│                                         │
│        [Cancel]  [Continue to Portal]   │
└────────────────────────────────────────┘
```

### Option 2: State IRS Selected
```
┌────────────────────────────────────────┐
│         Choose Payment Portal           │
├────────────────────────────────────────┤
│                                         │
│ ○ 🏢 National Revenue Center (NRC)    │
│   Pay through the centralized portal   │
│   selfservice.nrs.gov.ng               │
│                                         │
│ ◉ 📍 Lagos State IRS                   │
│   Pay directly through your state      │
│   etax.lirs.net/login/                 │
│                                         │
│        [Cancel]  [Continue to Portal]   │
└────────────────────────────────────────┘
```

### Option 3: State Not Available
```
┌────────────────────────────────────────┐
│         Choose Payment Portal           │
├────────────────────────────────────────┤
│                                         │
│ ◉ 🏢 National Revenue Center (NRC)    │
│   Pay through the centralized portal   │
│   selfservice.nrs.gov.ng               │
│                                         │
│ ⚠ State IRS portal for Unknown State   │
│   is not currently available.           │
│   Please use the NRC portal.            │
│                                         │
│        [Cancel]  [Continue to Portal]   │
└────────────────────────────────────────┘
```

## 🎨 Component Hierarchy

```
PaymentAddPage
├── PaymentPortalSelectorModal
│   ├── Dialog
│   │   ├── DialogHeader
│   │   │   ├── DialogTitle
│   │   │   └── DialogDescription
│   │   ├── DialogContent
│   │   │   └── RadioGroup
│   │   │       ├── NRC Option
│   │   │       │   ├── RadioGroupItem
│   │   │       │   ├── Label
│   │   │       │   ├── Icon (Building2)
│   │   │       │   └── ExternalLink
│   │   │       └── State IRS Option
│   │   │           ├── RadioGroupItem
│   │   │           ├── Label
│   │   │           ├── Icon (MapPin)
│   │   │           └── ExternalLink
│   │   └── DialogFooter
│   │       ├── Cancel Button
│   │       └── Continue Button
│   └── State: selectedOption, processing
│
├── NRS Pay Modal
│   └── (existing component)
│
├── Receipt Upload Modal
│   └── (existing component)
│
└── Other Payment Components
```

## 🔄 State Transitions

```
Initial State:
- showPortalSelector = false
- showNrsPayModal = false
- showReceiptUploadModal = false
- selectedOption = "nrc"

User clicks "Proceed to Pay":
1️⃣ showPortalSelector = true
2️⃣ Modal displays with options

User selects NRC and clicks Continue:
3️⃣ showPortalSelector = false
4️⃣ showNrsPayModal = true
5️⃣ NRC Modal displays

User selects State IRS and clicks Continue:
3️⃣ showPortalSelector = false
4️⃣ window.open(stateUrl, "_blank")
5️⃣ setTimeout(500ms) → showReceiptUploadModal = true

Receipt upload (both paths):
6️⃣ showReceiptUploadModal = true
7️⃣ uploadingReceipt = true
8️⃣ File uploaded
9️⃣ Payment recorded
🔟 router.push(paymentPage)
```

## 📊 State Detection Logic

```
Get User Profile
    │
    ├─ Has state?  NO  ──► Show only NRC
    │
    └─ YES
       │
       ├─ State in STATE_IRS_PORTALS?  NO  ──► Show only NRC
       │
       └─ YES
          │
          └─► Show both NRC and State IRS options
```

## 🎯 Handler Functions

```
handleProceedToPay()
├─ Check: allChecksPassed?
├─ YES: setShowPortalSelector(true)
└─ NO: toast.error("Complete checks")

handleSelectNRC()
├─ setShowPortalSelector(false)
└─ setShowNrsPayModal(true)

handleSelectStateIRS(irsUrl)
├─ setShowPortalSelector(false)
├─ window.open(irsUrl, "_blank")
└─ setTimeout(500) → setShowReceiptUploadModal(true)

uploadReceiptAndRecordNrsPayment()
├─ checkDuplicatePayment()
├─ uploadToImageKit(file)
├─ documentService.uploadDocument()
├─ taxPaymentService.createPayment()
└─ router.push(paymentPage)
```

## 📝 Data Passed Through Flow

```
paymentFormData = {
  period: 'monthly'|'quarterly'|'yearly'
  amount: 5000000
  taxDuration: "January 2024"
  calculatedAmount: 5000000
  isManual: false
}

When NRC selected:
├─ paymentMethod: "firs"
└─ notes: "NRS Portal payment"

When State IRS selected:
├─ paymentMethod: "firs"
├─ notes: "State IRS portal payment"
└─ portal: userState
```

## 🌍 State Portal Mapping

```
User State from Profile
    ↓
Look up in STATE_IRS_PORTALS
    ↓
Display Portal URL
    ↓
User clicks "Continue"
    ↓
Open URL in new tab
    ↓
Receipt Upload Modal
    ↓
Upload receipt
    ↓
Record with portal info
```

## ✅ Validation Checkpoints

```
Before Portal Selector:
□ allChecksPassed = true
□ System checks completed
□ Payment form data exists

In Portal Selector:
□ userState matches profile.address.state
□ STATE_IRS_PORTALS has entry (if showing)
□ Portal URL is valid HTTPS

Before Receipt Upload:
□ user.uid exists
□ paymentFormData exists
□ Payment method selected

During Receipt Upload:
□ receiptFile selected
□ File size reasonable
□ File format valid (PDF/image)
□ Not duplicate payment

After Upload:
□ ImageKit upload successful
□ Document saved to Firestore
□ Payment record created
□ Receipt linked to payment
```

## 🎯 Success Indicators

```
Payment Process Success When:

✅ User can see portal selector
✅ Both options (or available option) display
✅ Portal URLs are correct
✅ User can switch between options
✅ Selected portal opens correctly
✅ Receipt upload modal appears
✅ Receipt file can be selected
✅ Upload completes successfully
✅ Payment appears in payment list
✅ Receipt is linked to payment
```

## 🔧 Troubleshooting Quick Reference

```
Problem                    Solution
────────────────────────────────────────────
Modal doesn't appear  → Check allChecksPassed
                      → Verify handleProceedToPay called

State option missing  → Check user has profile.address.state
                      → Check state name matches exactly
                      → Verify STATE_IRS_PORTALS entry

Portal doesn't open   → Check URL is valid
                      → Verify browser allows pop-ups
                      → Check internet connection

Receipt won't upload  → Check file is selected
                      → Verify file format (PDF/image)
                      → Check file size

Payment not recorded  → Check for duplicate
                      → Verify Firestore permissions
                      → Check console for errors
```

## 📱 Responsive Breakpoints

```
Mobile (< 640px)
┌──────────────────┐
│ Choose Payment   │
├──────────────────┤
│ ◉ National       │
│   Revenue Center │
│   More text...   │
│                  │
│ ○ State IRS      │
│   More text...   │
│                  │
│   [Cancel][Cont] │
└──────────────────┘

Tablet (640px - 1024px)
┌────────────────────────────┐
│    Choose Payment Portal    │
├────────────────────────────┤
│ ◉ National Revenue Center  │
│   Portal description       │
│                            │
│ ○ State IRS Portal         │
│   Portal description       │
│                            │
│  [Cancel] [Continue]       │
└────────────────────────────┘

Desktop (> 1024px)
┌──────────────────────────────────┐
│     Choose Payment Portal         │
├──────────────────────────────────┤
│ ◉ National Revenue Center         │
│   Pay through centralized portal  │
│   selfservice.nrs.gov.ng          │
│                                   │
│ ○ State IRS                       │
│   Pay directly through your state │
│   etax.lirs.net/login/            │
│                                   │
│  [Cancel]  [Continue to Portal]   │
└──────────────────────────────────┘
```

## 🎓 Implementation Locations

```
1. Modal Component
   └─ components/payment/payment-portal-selector-modal.tsx

2. Radio Group Component
   └─ components/ui/radio-group.tsx

3. Integration
   └─ app/dashboard/payment/add/page.tsx
      ├─ Import modal
      ├─ Add state
      ├─ Add handlers
      └─ Render modal

4. Documentation
   ├─ PAYMENT_PORTAL_SELECTION.md
   ├─ PAYMENT_FLOW_UPDATE.md
   ├─ PAYMENT_PORTAL_IMPLEMENTATION.md
   ├─ PAYMENT_FLOW_ARCHITECTURE.md
   └─ PAYMENT_FEATURE_SUMMARY.md
```

---

**This visual guide should help understand how the payment portal selection feature works at a glance!**
