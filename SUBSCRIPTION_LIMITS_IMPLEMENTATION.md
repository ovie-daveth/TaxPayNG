# Subscription & Limits Implementation

This document describes the implementation of transaction limits and storage limits with subscription management for the TaxPayNG application.

## Overview

The system implements:
- **Transaction Limits**: Monthly limits based on subscription type (100-5000 transactions/month, or unlimited)
- **Storage Limits**: Plan-based storage limits (500MB to 50GB)
- **Subscription Management**: UI and backend support for managing user subscriptions

## Database Schema Changes

### UserProfile Type Updates

Added the following fields to the `UserProfile` interface:

```typescript
// Subscription Types
export type SubscriptionType = 'PRO' | 'GOLD' | 'PLATINUM' | 'Small Business' | 'Big Business' | null

// New fields in UserProfile
{
  isSubscribe?: boolean                    // Whether user has an active subscription
  subscriptionType?: SubscriptionType      // Current subscription plan
  transactionCount?: number                // Current month's transaction count
  transactionCountResetDate?: string       // Date when transaction count was last reset (ISO string)
  storageLimit?: number                    // Storage limit in bytes
  storageUsed?: number                     // Current storage used in bytes
}
```

## Subscription Plans & Limits

### Transaction Limits (per month)

| Plan | Transaction Limit |
|------|-------------------|
| PRO | 100 transactions/month |
| GOLD | 500 transactions/month |
| PLATINUM | 1,000 transactions/month |
| Small Business | 5,000 transactions/month |
| Big Business | Unlimited (∞) |
| No Subscription | 100 transactions/month (default) |

### Storage Limits

| Plan | Storage Limit |
|------|---------------|
| PRO | 500 MB |
| GOLD | 2 GB |
| PLATINUM | 10 GB |
| Small Business | 15 GB |
| Big Business | 50 GB |
| No Subscription | 500 MB (default) |

## Implementation Details

### 1. User Service (`lib/services/userService.ts`)

#### Methods Added

**`getStorageLimit(subscriptionType: SubscriptionType): number`**
- Returns the storage limit in bytes based on subscription type
- Defaults to 500MB if no subscription type is provided

**`getTransactionLimit(subscriptionType: SubscriptionType): number`**
- Returns the transaction limit per month based on subscription type
- Returns `Infinity` for unlimited plans
- Defaults to 100 if no subscription type is provided

**`initializeSubscriptionFields(profileData: Partial<UserProfile>): Partial<UserProfile>`**
- Initializes subscription-related fields with default values
- Sets `transactionCountResetDate` to the first of the current month
- Automatically sets `storageLimit` based on subscription type

**`resetTransactionCountIfNeeded(userId: string, profile: UserProfile): Promise<void>`**
- Checks if the current month is different from the reset date
- Resets `transactionCount` to 0 if it's a new month
- Updates `transactionCountResetDate` to the first of the current month

**`incrementTransactionCount(userId: string): Promise<ApiResponse<UserProfile>>`**
- Resets count if it's a new month
- Increments `transactionCount` by 1
- Updates the user profile

**`updateStorageUsed(userId: string, additionalBytes: number): Promise<ApiResponse<UserProfile>>`**
- Updates `storageUsed` by adding/subtracting bytes
- Supports negative values for reducing storage (e.g., when deleting documents)
- Ensures storage used never goes below 0

#### Updated Methods

**`upsertProfile(userId: string, profileData: Partial<UserProfile>): Promise<ApiResponse<UserProfile>>`**
- Automatically initializes subscription fields for new users
- Updates `storageLimit` when subscription type changes
- Resets transaction count if needed after profile updates

### 2. Transaction Service (`lib/services/transactionService.ts`)

#### Transaction Limit Enforcement

The `createTransaction` method now includes:

1. **Pre-creation Check**:
   - Fetches user profile
   - Gets transaction limit based on subscription type
   - Resets count if it's a new month
   - Checks if current count + 1 would exceed limit

2. **Error Handling**:
   - Returns error if limit is already reached
   - Returns error if adding transaction would exceed limit
   - Provides clear error messages with current usage

3. **Post-creation Update**:
   - Increments transaction count after successful creation
   - Updates user profile with new count

**Example Error Messages**:
```
"Transaction limit reached. You have used 100 of 100 transactions this month. Please upgrade your plan to add more transactions."
"This transaction would exceed your monthly limit of 100 transactions. You have 99 transactions remaining."
```

### 3. Document Service (`lib/services/documentService.ts`)

#### Storage Limit Enforcement

The `uploadDocument` method now includes:

1. **Pre-upload Check**:
   - Fetches user profile
   - Gets storage limit and current usage
   - Calculates if file size would exceed limit

2. **Error Handling**:
   - Returns error if upload would exceed storage limit
   - Provides remaining storage in MB
   - Suggests deleting documents or upgrading plan

3. **Post-upload Update**:
   - Updates `storageUsed` with file size after successful upload

**Example Error Message**:
```
"Storage limit exceeded. You have 50.25MB remaining of 500MB total storage. Please delete some documents or upgrade your plan."
```

#### Storage Reduction on Delete

The `deleteDocument` method now:
- Reduces `storageUsed` by the document's file size
- Ensures storage never goes below 0

### 4. Settings Page UI (`app/dashboard/settings/page.tsx`)

#### Subscription & Limits Section

A new card section displays:

1. **Subscription Status**:
   - Badge showing "Subscribed" or "Not Subscribed"
   - Visual indicator of subscription state

2. **Subscription Management**:
   - Dropdown to select subscription type
   - Toggle switch for subscription status
   - Save button to update subscription

3. **Transaction Usage**:
   - Current count vs. limit (e.g., "45 / 100")
   - Progress bar showing usage percentage
   - Note about monthly reset date

4. **Storage Usage**:
   - Current usage vs. limit (e.g., "125.50 MB / 500 MB")
   - Progress bar showing usage percentage
   - Remaining storage display

#### Features

- Real-time updates after saving subscription changes
- Visual progress indicators for both limits
- Toast notifications for success/error states
- Loading states during save operations

### 5. Progress Component (`components/ui/progress.tsx`)

A new UI component for displaying progress bars:
- Built with Radix UI Progress primitive
- Accessible and styled with Tailwind CSS
- Used for transaction and storage usage visualization

## Usage Examples

### Checking Transaction Limit

```typescript
import { userService } from '@/lib/services'

const profile = await userService.getProfile(userId)
const limit = userService.getTransactionLimit(profile?.subscriptionType || null)
const currentCount = profile?.transactionCount || 0

if (currentCount >= limit && limit !== Infinity) {
  // Show upgrade message
}
```

### Checking Storage Limit

```typescript
import { userService } from '@/lib/services'

const profile = await userService.getProfile(userId)
const limit = profile?.storageLimit || 500 * 1024 * 1024
const used = profile?.storageUsed || 0
const remaining = limit - used

if (remaining < fileSize) {
  // Show error or upgrade message
}
```

### Updating Subscription

```typescript
import { userService } from '@/lib/services'

const result = await userService.upsertProfile(userId, {
  isSubscribe: true,
  subscriptionType: 'PRO'
})

if (result.success) {
  // Subscription updated
  // Storage limit automatically updated
}
```

## Automatic Behaviors

### New User Signup
- Subscription fields are automatically initialized with defaults
- Default: Not subscribed, 100 transaction limit, 500MB storage limit
- Transaction count starts at 0
- Reset date set to first of current month

### Monthly Reset
- Transaction count automatically resets on the 1st of each month
- Reset happens when:
  - User profile is accessed
  - Transaction is created
  - Subscription is updated

### Subscription Type Change
- Storage limit automatically updates when subscription type changes
- Transaction limit is checked against new limit
- Existing usage remains unchanged

## Error Handling

### Transaction Limit Errors
- Checked before transaction creation
- Prevents creation if limit would be exceeded
- Returns user-friendly error messages

### Storage Limit Errors
- Checked before document upload
- Prevents upload if limit would be exceeded
- Returns remaining storage information

## Future Enhancements

Potential improvements:
1. **Usage Alerts**: Email notifications when approaching limits
2. **Grace Period**: Allow slight overage with warnings
3. **Usage Analytics**: Historical usage charts and trends
4. **Auto-upgrade Prompts**: Suggest upgrades when limits are reached
5. **Bulk Operations**: Handle multiple transactions/documents efficiently
6. **Usage Reports**: Monthly usage summaries

## Testing Checklist

- [ ] New user gets default subscription fields
- [ ] Transaction limit enforced correctly
- [ ] Storage limit enforced correctly
- [ ] Monthly reset works correctly
- [ ] Subscription type change updates limits
- [ ] Storage updates on document upload
- [ ] Storage updates on document delete
- [ ] Settings page displays correct information
- [ ] Progress bars show accurate percentages
- [ ] Error messages are clear and helpful

## Notes

- All limits are enforced at the service level
- Storage is tracked in bytes but displayed in MB/GB
- Transaction count resets automatically on the 1st of each month
- Storage limits update automatically when subscription changes
- Default limits apply to users without subscriptions (PRO plan limits)

