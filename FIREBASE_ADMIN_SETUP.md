# Firebase Admin SDK Setup Guide

## Overview

API routes now use Firebase Admin SDK instead of the client SDK. This bypasses Firestore security rules and provides better security for server-side operations.

## Why Admin SDK?

- ✅ **Bypasses Security Rules**: Admin SDK has full access (proper for server-side)
- ✅ **Better Security**: Credentials stay on server, never exposed to client
- ✅ **More Reliable**: Designed for server-side operations
- ✅ **No Permission Errors**: Works without authentication context

## Setup Instructions

### Option 1: Service Account (Recommended for Production)

1. **Go to Firebase Console**
   - Open [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to **Project Settings** → **Service Accounts**

2. **Generate Private Key**
   - Click **Generate New Private Key**
   - Confirm and download the JSON file
   - **⚠️ Keep this file secure - never commit to git!**

3. **Extract Credentials**
   - Open the downloaded JSON file
   - Copy these values:
     - `project_id` → `FIREBASE_PROJECT_ID`
     - `client_email` → `FIREBASE_CLIENT_EMAIL`
     - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters)

4. **Add to Environment Variables**
   
   Add to `.env.local`:
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

   **Important:** The private key must be in quotes and include the `\n` characters!

### Option 2: Application Default Credentials (Local Development)

For local development, you can use Firebase CLI:

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Set Application Default Credentials**
   ```bash
   firebase login:ci
   ```

4. **Set Environment Variable**
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   ```

   The Admin SDK will automatically use your logged-in credentials.

### Option 3: Environment Variables in Production

For production (Vercel, etc.):

1. Add the same environment variables to your hosting platform
2. Make sure `FIREBASE_PRIVATE_KEY` includes the full key with `\n` characters
3. Use the platform's secure environment variable storage

## Environment Variables

**Required:**
```env
FIREBASE_PROJECT_ID=your-project-id
```

**For Service Account (Option 1):**
```env
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

**Note:** The private key must:
- Be wrapped in quotes
- Include `\n` characters (they will be converted to actual newlines)
- Be the complete key from the JSON file

## Testing

1. **Restart your development server**
   ```bash
   npm run dev
   ```

2. **Test the waitlist signup**
   - Submit the form
   - Check for errors in console
   - Verify the verification code is sent

3. **Check Firestore Console**
   - Go to Firestore Database
   - Verify `waitlistVerifications` collection is created
   - Check that documents are being added

## Troubleshooting

### "Firebase Admin SDK not configured"

**Solution:**
- Check that `FIREBASE_PROJECT_ID` is set
- If using service account, verify all three variables are set
- Restart your development server

### "Invalid private key"

**Solution:**
- Make sure the private key is wrapped in quotes
- Include the `\n` characters (they're needed)
- Copy the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

### "Permission denied" errors

**Solution:**
- Make sure you're using Admin SDK (not client SDK) in API routes
- Check that credentials are correct
- Verify the service account has proper permissions in Firebase Console

### Local Development Issues

**Solution:**
- Use Option 2 (Application Default Credentials) for easier local setup
- Run `firebase login` to authenticate
- Set only `FIREBASE_PROJECT_ID` in `.env.local`

## Security Notes

- ✅ **Never commit** `.env.local` or service account JSON to git
- ✅ **Add to `.gitignore`**:
  ```
  .env.local
  *-service-account.json
  ```
- ✅ **Use environment variables** in production (never hardcode)
- ✅ **Rotate credentials** periodically
- ✅ **Limit service account permissions** if possible

## Benefits

✅ **No more permission errors** - Admin SDK bypasses rules  
✅ **Better security** - Credentials never exposed to client  
✅ **More reliable** - Designed for server operations  
✅ **Production ready** - Industry standard approach  

---

**Note:** After setting up Admin SDK, you can tighten Firestore security rules since Admin SDK bypasses them anyway.
