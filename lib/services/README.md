# Firebase Backend Services

This directory contains the Firebase backend services for the TaxPayNG application. All services are built on top of Firebase Firestore and Storage, providing a comprehensive backend solution.

## 📁 Structure

```
lib/services/
├── base.ts                 # Base service class with common CRUD operations
├── userService.ts          # User profile management
├── transactionService.ts   # Transaction management
├── documentService.ts      # Document management with Firebase Storage
├── reminderService.ts      # Reminder and deadline management
├── taxCalculationService.ts # Tax calculation storage and management
├── index.ts               # Service exports
└── README.md              # This file
```

## 🔧 Services Overview

### BaseService
The foundation class that all other services extend. Provides common CRUD operations and utility methods.

**Features:**
- Generic CRUD operations (Create, Read, Update, Delete)
- Pagination support
- Firestore timestamp handling
- Error handling and logging
- Document conversion utilities

### UserService
Manages user profiles and preferences.

**Methods:**
- `getProfile(userId)` - Get user profile
- `upsertProfile(userId, profileData)` - Create or update profile
- `updatePreferences(userId, preferences)` - Update user preferences
- `updateBusinessType(userId, businessType)` - Update business type
- `deleteProfile(userId)` - Delete user profile

### TransactionService
Handles financial transactions (income and expenses).

**Methods:**
- `getUserTransactions(userId, filters, page, pageSize)` - Get paginated transactions
- `createTransaction(userId, transactionData)` - Create new transaction
- `updateTransaction(transactionId, userId, updateData)` - Update transaction
- `deleteTransaction(transactionId, userId)` - Delete transaction
- `getTransactionSummary(userId, startDate, endDate)` - Get transaction summary
- `getRecentTransactions(userId, limit)` - Get recent transactions

### DocumentService
Manages document uploads, storage, and retrieval using Firebase Storage.

**Methods:**
- `getUserDocuments(userId, filters, page, pageSize)` - Get paginated documents
- `uploadDocument(userId, uploadData)` - Upload document to Firebase Storage
- `updateDocument(documentId, userId, updateData)` - Update document metadata
- `deleteDocument(documentId, userId)` - Delete document and file
- `getDownloadURL(documentId, userId)` - Get secure download URL
- `getUserStorageUsage(userId)` - Get storage usage statistics

### ReminderService
Manages tax deadlines and reminders.

**Methods:**
- `getUserReminders(userId, page, pageSize, showCompleted)` - Get paginated reminders
- `createReminder(userId, reminderData)` - Create new reminder
- `updateReminder(reminderId, userId, updateData)` - Update reminder
- `markCompleted(reminderId, userId)` - Mark reminder as completed
- `markIncomplete(reminderId, userId)` - Mark reminder as incomplete
- `deleteReminder(reminderId, userId)` - Delete reminder
- `getUpcomingReminders(userId, daysAhead)` - Get upcoming reminders
- `getOverdueReminders(userId)` - Get overdue reminders
- `createRecurringReminder(userId, baseReminder, recurring)` - Create recurring reminders

### TaxCalculationService
Stores and manages tax calculations.

**Methods:**
- `getUserCalculations(userId, page, pageSize)` - Get paginated calculations
- `createCalculation(userId, calculationData)` - Create new calculation
- `updateCalculation(calculationId, userId, updateData)` - Update calculation
- `deleteCalculation(calculationId, userId)` - Delete calculation
- `getLatestCalculation(userId)` - Get most recent calculation
- `getCalculationStats(userId)` - Get calculation statistics
- `compareCalculations(calculationId1, calculationId2, userId)` - Compare calculations

## 🔐 Security

All services include built-in security measures:

- **User Ownership Verification**: Users can only access their own data
- **Firebase Security Rules**: Firestore rules enforce user-level access control
- **Input Validation**: All inputs are validated before processing
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 📊 Data Models

### User Profile
```typescript
interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  address?: Address
455  businessType: 'freelancer' | 'creator' | 'sme' | 'individual'
  taxId?: string
  createdAt: string
  updatedAt: string
  preferences?: UserPreferences
}
```

### Transaction
```typescript
interface Transaction {
  id: string
  userId: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  date: string
  tags?: string[]
  receiptUrl?: string
  documentId?: string
  createdAt: string
  updatedAt: string
}
```

### Document
```typescript
interface Document {
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
```

## 🚀 Usage Examples

### Basic Service Usage
```typescript
import { userService, transactionService } from '@/lib/services'

// Get user profile
const profile = await userService.getProfile(userId)

// Create transaction
const transaction = await transactionService.createTransaction(userId, {
  type: 'income',
  category: 'salary',
  amount: 50000,
  description: 'Monthly salary',
  date: new Date().toISOString()
})
```

### Using Custom Hooks
```typescript
import { useTransactions } from '@/lib/hooks/useTransactions'

function TransactionsPage() {
  const { transactions, loading, createTransaction } = useTransactions(userId)
  
  const handleCreateTransaction = async (data) => {
    const result = await createTransaction(data)
    if (result.success) {
      // Handle success
    }
  }
  
  return (
    // Your component JSX
  )
}
```

## 🔧 Firebase Setup

### 1. Environment Variables
Add these to your `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 2. Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles
    match /userProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Transactions
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Documents
    match /documents/{documentId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Reminders
    match /reminders/{reminderId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Tax calculations
    match /taxCalculations/{calculationId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

### 3. Storage Security Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /documents/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 📈 Performance Considerations

- **Pagination**: All list operations support pagination to handle large datasets
- **Indexing**: Firestore indexes are automatically created for common queries
- **Caching**: Firebase SDK includes built-in caching for improved performance
- **Batch Operations**: Use batch writes for multiple operations
- **Offline Support**: Firebase provides offline persistence out of the box

## 🧪 Testing

Each service includes comprehensive error handling and logging. For testing:

1. Use Firebase Emulator Suite for local development
2. Mock services for unit tests
3. Integration tests with test Firebase project

## 🔄 Migration from localStorage

The services are designed to work alongside the existing localStorage implementation. To migrate:

1. Keep existing localStorage hooks as fallback
2. Use Firebase services when user is authenticated
3. Gradually migrate components to use Firebase services
4. Remove localStorage dependencies once migration is complete

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Storage Security](https://firebase.google.com/docs/storage/security/get-started)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
