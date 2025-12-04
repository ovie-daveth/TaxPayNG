# ImageKit Folder Structure

## Overview

All files uploaded to ImageKit are automatically organized into user-specific folders. Each user gets their own folder structure based on their `userId`.

## Folder Structure

### User Files

All user uploads (except blog files) are organized as:

```
users/
  └── {userId}/
      ├── transactions/      # Transaction receipts and attachments
      ├── documents/         # General documents
      ├── receipts/          # Payment receipts
      ├── invoices/          # Invoice attachments
      │   └── receipts/      # Invoice payment receipts
      ├── signatures/        # Digital signatures
      ├── business-documents/# Business verification documents (CAC, Tax Cert, etc.)
      ├── audits/            # Audit-related files
      └── ...                # Other folders as needed
```

### Blog Files (Exempted)

Blog uploads are stored in a shared folder structure:

```
blog/
  ├── featured/              # Featured blog images
  └── videos/                # Blog video content
```

**Note:** Blog files are exempted from user-specific folders and are stored globally.

## How It Works

1. **Automatic User Detection**: When a file is uploaded, the API route automatically:
   - Gets the authenticated user's ID from the session/authorization header
   - Creates a user-specific folder path: `users/{userId}/{folder}`

2. **First Upload**: The user's folder is automatically created on their first upload - no manual setup needed!

3. **Blog Exception**: If the folder path starts with `blog`, it bypasses the user folder structure and goes directly to the blog folder.

## Examples

### User Upload Examples

```typescript
// Transaction receipt
uploadToImageKit(file, 'transactions')
// → users/abc123/transactions/file.jpg

// Document upload
uploadToImageKit(file, 'documents')
// → users/abc123/documents/file.pdf

// Invoice receipt
uploadToImageKit(file, 'invoices/receipts')
// → users/abc123/invoices/receipts/file.jpg
```

### Blog Upload Examples

```typescript
// Blog featured image
uploadToImageKit(file, 'blog/featured')
// → blog/featured/file.jpg (NOT user-specific)

// Blog video
uploadToImageKit(file, 'blog/videos')
// → blog/videos/file.mp4 (NOT user-specific)
```

## Benefits

✅ **Privacy**: Each user's files are isolated in their own folder  
✅ **Organization**: Easy to find and manage user files  
✅ **Security**: Users can only access their own folder structure  
✅ **Scalability**: Easy to archive or delete user data  
✅ **Automatic**: No manual folder creation needed

## Migration Notes

- Existing files uploaded before this change will remain in their original locations
- New uploads will automatically use the new user-specific folder structure
- No code changes needed in existing upload calls - it works automatically!

