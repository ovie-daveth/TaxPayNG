# Firestore Indexes Setup

This document explains how to set up the necessary Firestore composite indexes for the TaxPayNG application.

## Why Indexes Are Needed

Firestore requires composite indexes when queries:
- Filter by multiple fields
- Combine equality (==) with range (>=, <=) or orderBy operations
- Use multiple orderBy clauses

## Indexes Created

The `firestore.indexes.json` file includes indexes for:

### Documents Collection
1. **userId + uploadedAt** - Basic document listing
2. **userId + type + uploadedAt** - Filter by document type
3. **userId + fileType + uploadedAt** - Filter by file type
4. **userId + type + fileType + uploadedAt** - Combined filters
5. **userId + linkedTransaction + uploadedAt** - Filter linked documents

### Transactions Collection
1. **userId + date** - Basic transaction listing
2. **userId + type + date** - Filter by income/expense
3. **userId + category + date** - Filter by category
4. **userId + type + category + date** - Combined filters

### Reminders Collection
1. **userId + dueDate** - Basic reminder listing
2. **userId + isCompleted + dueDate** - Filter completed reminders

## How to Deploy Indexes

### Method 1: Using Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firestore** (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your Firebase project
   - Use default rules file or specify your own
   - Use `firestore.indexes.json` for indexes

4. **Deploy the indexes**:
   ```bash
   firebase deploy --only firestore:indexes
   ```

5. **Wait for deployment**: This may take several minutes. You'll see a success message when complete.

### Method 2: Using Firebase Console

If you get an error when running queries, Firebase will provide a direct link to create the index:

1. **Trigger the error**: Try to use a filtered query in your app
2. **Click the link**: Firebase will show an error with a link like:
   ```
   https://console.firebase.google.com/project/your-project/firestore/indexes?create_composite=...
   ```
3. **Create the index**: Click the link and confirm

### Method 3: Manual Creation in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Add Index**
5. Add fields according to `firestore.indexes.json`
6. Click **Create**

## Verifying Indexes

1. Go to Firebase Console → Firestore Database → Indexes
2. You should see all indexes listed with status:
   - 🟡 **Building** - Index is being created
   - 🟢 **Enabled** - Index is ready to use
   - 🔴 **Error** - Something went wrong

## Common Issues

### Issue: "Index creation failed"
**Solution**: Check that field names match exactly (case-sensitive)

### Issue: "The query requires an index"
**Solution**: 
1. Copy the error message
2. Click the provided link to auto-create the index
3. Wait for it to build (can take 5-10 minutes)

### Issue: Indexes take too long to build
**Solution**: This is normal for large collections. For empty or small collections, it should be quick.

## Testing

After deploying indexes:

1. ✅ Test document filtering by type
2. ✅ Test document filtering by file type
3. ✅ Test transaction filtering by category
4. ✅ Test combined filters
5. ✅ Test pagination with filters

All queries should work without errors.

## Maintenance

- **Add new indexes** when you add new query combinations
- **Remove unused indexes** to optimize performance
- **Monitor index usage** in Firebase Console

## Need Help?

If you encounter issues:
1. Check the Firebase Console for index status
2. Look at browser console for specific error messages
3. Check that `firestore.indexes.json` is in your project root
4. Verify you're deploying to the correct Firebase project

---

**Last Updated**: October 2025

