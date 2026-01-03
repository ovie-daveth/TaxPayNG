# Implementation Guide: Payment Portal Selection

## How It Works

### Step 1: User Initiates Payment
When a user navigates to `/dashboard/payment/add` and fills in the payment form, they'll eventually see a "Proceed to Pay" button after system checks pass.

### Step 2: Portal Selection Modal Appears
When they click "Proceed to Pay", instead of going directly to NRC, a modal appears with two options:

```
┌─────────────────────────────────────────┐
│         Choose Payment Portal             │
├─────────────────────────────────────────┤
│                                           │
│  ◉ National Revenue Center (NRC)         │
│    Pay through the centralized portal    │
│    selfservice.nrs.gov.ng                │
│                                           │
│  ○ Lagos State IRS                       │
│    Pay directly through your state       │
│    etax.lirs.net/login/                  │
│                                           │
│      [Cancel]  [Continue to Portal]      │
└─────────────────────────────────────────┘
```

### Step 3a: User Selects NRC
- Modal closes
- NRC payment modal appears
- User completes payment on NRC portal
- Returns to upload receipt

### Step 3b: User Selects State IRS
- Modal closes  
- State IRS portal opens in new tab/window
- Receipt upload modal appears in background
- User completes payment on state portal
- Returns to upload receipt and confirm

### Step 4: Receipt Upload & Recording
User uploads payment receipt which is saved to OTax and the payment is recorded in the system.

## Configuration

### Adding/Updating State IRS Portals

Edit the `STATE_IRS_PORTALS` object in `components/payment/payment-portal-selector-modal.tsx`:

```typescript
const STATE_IRS_PORTALS: Record<string, string> = {
  "State Name": "https://portal.url/",
  // Add more states here
}
```

**Important**: The state name must match exactly what's stored in the user's profile (`profile.address.state`).

### User State Detection

The modal automatically gets the user's state from their profile:
```typescript
<PaymentPortalSelectorModal
  userState={profile?.address?.state}
  // ... other props
/>
```

If the user's state is not in the `STATE_IRS_PORTALS` list, only the NRC option will be shown.

## Component Props

```typescript
interface PaymentPortalSelectorModalProps {
  // Whether the modal is open
  open: boolean
  
  // Callback to control modal visibility
  onOpenChange: (open: boolean) => void
  
  // User's state (from profile.address.state)
  userState?: string
  
  // Called when user selects NRC
  onSelectNRC: () => void
  
  // Called when user selects State IRS
  // Receives the state IRS portal URL
  onSelectStateIRS: (stateIrsUrl: string) => void
}
```

## State Name Mapping

Current state name mappings used in portals object:

```
Abia, Adamawa, Anambra, Akwa Ibom, Bauchi, Bayelsa, Benue, Borno,
Cross River, Delta, Ebonyi, Edo, Enugu, Ekiti, FCT, Gombe, Imo,
Jigawa, Kaduna, Kano, Kastina, Kebbi, Kogi, Kwara, Lagos, Nasarawa,
Niger, Ogun, Ondo, Osun, Oyo, Plateau, Rivers, Sokoto, Yobe, Zamfara
```

Make sure your user profile uses these exact state names.

## Payment Flow Variables

The payment form data is stored and passed through the flow:

```typescript
interface PaymentFormData {
  period: 'monthly' | 'quarterly' | 'yearly'
  amount: number
  taxDuration: string
  calculatedAmount?: number
  isManual: boolean
  // ... other fields
}
```

This data is used when recording the payment:

```typescript
await taxPaymentService.createPayment(user.uid, {
  transactionId,
  amount: paymentFormData.amount,
  period: paymentFormData.period,
  taxDuration: paymentFormData.taxDuration,
  paymentMethod: "state-irs" | "firs", // Depends on selection
  status: "completed",
  receiptUrl: docRes.data.url,
  // ... other fields
})
```

## Error Handling

### Missing User State
If `profile?.address?.state` is undefined:
- Only NRC option is shown
- State IRS option is hidden

### State Not in Portal List
If the user's state is not in `STATE_IRS_PORTALS`:
- State IRS option shows a "not available" message
- Only NRC option is selectable

### Portal URL Errors
If a portal URL is invalid:
- It still opens in a new tab
- User sees the browser error
- They can use the back button in the modal

## Testing Scenarios

### Test Case 1: User from Supported State
1. Create user with `profile.address.state = "Lagos"`
2. Go to payment page
3. Pass system checks
4. Click "Proceed to Pay"
5. Modal should show both NRC and Lagos State IRS options
6. Both should be clickable

### Test Case 2: User from Unsupported State
1. Create user with `profile.address.state = "Unknown State"`
2. Go to payment page
3. Pass system checks
4. Click "Proceed to Pay"
5. Modal should show only NRC option
6. State IRS should show "not available" message

### Test Case 3: NRC Selection
1. Click "Proceed to Pay"
2. Modal appears
3. Select NRC option (default)
4. Click "Continue to Portal"
5. Modal closes
6. NRC payment modal should appear

### Test Case 4: State IRS Selection
1. Click "Proceed to Pay"
2. Modal appears
3. Select State IRS option
4. Click "Continue to Portal"
5. State portal opens in new tab
6. Receipt upload modal appears
7. User can upload receipt

## Customization

### Change Default Selection
In `PaymentPortalSelectorModal`:
```typescript
const [selectedOption, setSelectedOption] = useState<"nrc" | "state">("nrc")
// Change "nrc" to "state" for state as default
```

### Customize Modal Title/Description
Edit the `DialogTitle` and `DialogDescription` in the modal:
```tsx
<DialogTitle>Your Custom Title</DialogTitle>
<DialogDescription>
  Your custom description
</DialogDescription>
```

### Customize Portal Names
Edit the option labels:
```tsx
<Label>
  <Building2 className="w-4 h-4" />
  Custom NRC Label
</Label>
```

## Troubleshooting

### Modal doesn't appear
- Check: `showPortalSelector` state is being set to `true`
- Check: `handleProceedToPay()` is calling `setShowPortalSelector(true)`
- Check: All system checks pass before button is enabled

### State IRS option doesn't show
- Check: User's state exists in profile
- Check: State name matches exactly in `STATE_IRS_PORTALS` (case-sensitive)
- Check: Portal URL is valid

### Portal doesn't open
- Check: URL is valid and starts with `https://`
- Check: Browser allows pop-ups
- Check: User has internet connection

### Receipt upload doesn't appear
- Check: `handleSelectStateIRS()` is calling `setShowReceiptUploadModal(true)`
- Check: Timeout delay is sufficient
- Check: Modal state isn't being overridden elsewhere

## Performance Notes

- Modal is lightweight (~2KB gzipped)
- No external API calls during modal display
- Portal URLs are hardcoded (no data fetching)
- Opening portal in new tab doesn't block UI

## Security Notes

- Portal URLs are hardcoded and validated from our list
- No user data is passed in URLs
- External links open with `target="_blank" rel="noopener noreferrer"`
- Receipt upload still requires file validation

## Future Improvements

1. **Live Portal Status**: Check if portal is online before showing
2. **Payment Confirmation**: Webhook from portals to auto-confirm payments
3. **Payment History**: Track which portal user used for each payment
4. **Portal Analytics**: See which portals are most used
5. **Automatic Fallback**: If state portal is down, suggest NRC
